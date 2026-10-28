/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiGenerator. The orchestrator classifies, resolves, emits,
 *    checks and builds the catalog for a fixture component, collects every
 *    problem before failing, polices PENDING_CLASSIFICATION, checks the
 *    committed baseline, and writes dist, rolled back on failure (not atomic
 *    under SIGKILL). Spec §5.3, §8, #17.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import basic from "./vendor/a2ui-v0_9_1/catalogs/basic/catalog.json";
import { PENDING_EXCUSABLE_CODES, runPipeline, writeOutputs } from "./generate.mjs";

const FIXTURES = path.join(__dirname, "fixtures");
const CACHE = path.join(__dirname, "..", "..", "node_modules", ".cache", "agentui-test-pipeline");
const REASON = "Takes a function, which JSON cannot carry.";

function widget(protocolOver: Record<string, unknown> = {})
{
    return {
        name: "widget", factory: "createWidget", factoryStyle: "container-first", label: "Widget",
        affords: [], emits: [{ name: "selection", payload: "collection", multi: true, legacyOption: "onSelect" }],
        accepts: [], actions: [], conformance: "surface", defaultOptions: { pageSize: 25 },
        agent: { useWhen: "Show rows of records the user can select and compare.",
            avoidWhen: "For a single record use Card; for a short list of labels use List." },
        protocol: {
            hostOnly: {
                "columns[].renderer": REASON, title: REASON, container: "Needs a DOM node, which JSON cannot carry.",
                slot: "A live component instance with methods.", onLookup: "Two-parameter lookup with no single-object form.",
                onSearch: REASON,
            },
            schemas: { extra: { type: "object", additionalProperties: { type: "string" } } },
            ...protocolOver,
        },
    };
}

/** The widget with onSearch declared as a provider instead of host-only. */
function withProvider()
{
    const m = widget({ providers: { onSearch: { request: "search" } } });
    const { onSearch: _omitted, ...hostOnly } = m.protocol.hostOnly as Record<string, string>;

    return { ...m, protocol: { ...m.protocol, hostOnly } };
}

type Version = { baselines?: Map<number, unknown>; major?: number; writeBaseline?: boolean; belowRequired?: string[] };

function run(manifests: unknown[], pending: string[] = [], version: Version = {})
{
    return runPipeline({
        manifests, componentFile: (n: string) => path.join(FIXTURES, `${n}.ts`),
        tsconfigPath: path.join(FIXTURES, "tsconfig.json"), cacheDir: CACHE,
        pending: new Set(pending), belowRequired: new Set(version.belowRequired ?? []), basic,
        baselines: version.baselines ?? new Map(), major: version.major ?? 1, writeBaseline: version.writeBaseline ?? true,
        assetExists: () => true,
    });
}

describe("runPipeline — fixture widget", () =>
{
    test("a fully declared component produces no errors", () => { expect(run([widget()]).errors).toEqual([]); }, 60_000);
    test("it emits its options schema", () => { expect(run([widget()]).outputs.has("schemas/widget.options.json")).toBe(true); }, 60_000);
    test("it appears in the catalog", () => { expect("Widget" in run([widget()]).catalog.components).toBe(true); }, 60_000);
    test("its catalog entry follows the naming rule: eventData, on<Channel>, on<Request> and <request>Result", () =>
    {
        const result = run([withProvider()]);
        const props = (result.catalog.components as any).Widget.allOf[2].properties;

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toMatch(/Widget declares providers \[search\].*#31/);
        const derived = Object.keys(props).filter((k) => ["eventData", "selection", "searchQuery"].includes(k)
            || k.startsWith("on") || k.endsWith("Result") || k.endsWith("Results"));

        expect(derived.sort()).toEqual(["eventData", "onSearch", "onSelection", "searchResult"]);
        expect(props.searchResult.anyOf[0]).toMatchObject({ type: "array", items: { type: "string" } });
    }, 60_000);
    test("the override replaces the too-broad schema", () =>
    {
        const schema = run([widget()]).outputs.get("schemas/widget.options.json") as any;
        expect(schema.properties.extra.additionalProperties).toEqual({ type: "string" });
    }, 60_000);
    test("an undeclared hazard is an error", () =>
    {
        const m = widget({ hostOnly: { title: REASON, container: REASON, slot: REASON, onLookup: REASON } });
        expect(run([m]).errors.some((e: string) => e.includes("columns[].renderer"))).toBe(true);
    }, 60_000);
    test("a pending component with violations is excluded, not an error", () =>
    {
        const m = widget({ hostOnly: {} });
        expect(run([m], ["widget"]).errors).toEqual([]);
    }, 60_000);
    test("an excluded component is reported", () =>
    {
        expect(run([widget({ hostOnly: {} })], ["widget"]).excluded[0].name).toBe("widget");
    }, 60_000);
    test("a pending component with no violations is a stale-list error", () =>
    {
        expect(run([widget()], ["widget"]).errors[0]).toMatch(/PENDING_CLASSIFICATION/);
    }, 60_000);
    test("it gets an adapter descriptor", () =>
    {
        expect(run([widget()]).descriptors).toMatchObject([{ name: "Widget", tagName: "outcrop-widget", factory: "createWidget" }]);
    }, 60_000);
    test("G1: a catalog component with a manifest action fails the pipeline", () =>
    {
        const errors = run([{ ...widget(), actions: [{ id: "export", label: "Export", destructive: false, requires: [] }] }]).errors;

        expect(errors.join("\n")).toMatch(/Widget declares actions \[export\].*#31/);
    }, 60_000);
    test("G1: a host-only action passes, and its reason is in the report", () =>
    {
        const action = { id: "export", label: "Export", destructive: false, requires: [] };
        const result = run([{ ...widget({ hostOnlyActions: { export: "Writes a file the agent cannot receive." } }),
            actions: [action] }]);

        expect(result.errors).toEqual([]);
        expect("onExport" in result.catalog.components.Widget.allOf[2].properties).toBe(false);
    }, 60_000);
    test("a catalog component without agent sentences fails the pipeline (ADR-222)", () =>
    {
        const { agent, ...bare } = widget();
        void agent;

        expect(run([bare]).errors.join("\n")).toContain("widget: agent.useWhen is missing");
    }, 60_000);
});

describe("runPipeline — what PENDING_CLASSIFICATION excuses", () =>
{
    // Everything declared except onLookup, so the only backlog violation is one unclassified callback.
    const PARTIAL = { "columns[].renderer": REASON, title: REASON, container: REASON, slot: REASON };

    test("a pending component with only an unclassified callback is still excluded, not an error", () =>
    {
        const result = run([widget({ hostOnly: PARTIAL })], ["widget"]);

        expect(result.errors).toEqual([]);
        expect(result.excluded.map((e: { name: string }) => e.name)).toEqual(["widget"]);
    }, 60_000);
    test("a pending component with a stale hostOnly key fails the pipeline", () =>
    {
        const errors = run([widget({ hostOnly: { ...PARTIAL, nothing: REASON } })], ["widget"]).errors;

        expect(errors.some((e: string) => e.includes("widget.nothing") && /Stale/.test(e))).toBe(true);
    }, 60_000);
    test("a pending component with a short hostOnly reason fails the pipeline", () =>
    {
        const errors = run([widget({ hostOnly: { ...PARTIAL, title: "n/a" } })], ["widget"]).errors;

        expect(errors.some((e: string) => e.includes("widget.title"))).toBe(true);
    }, 60_000);
    test("the excusable set is exactly the backlog codes [20] ratchets", () =>
    {
        expect([...PENDING_EXCUSABLE_CODES].sort()).toEqual(
            ["change-mismatch", "missing-jsdoc", "too-broad", "unclassified", "undeclared-hazard", "undeclared-mixed"]);
    });
});

describe("runPipeline — the committed baseline (spec §5.3)", () =>
{
    // One typia run builds the v1 catalog; each case edits a copy of it into the baseline it needs.
    let base: any;

    beforeAll(() => { base = run([widget()]).catalog; }, 60_000);

    const edited = (edit: (b: any) => void) =>
    {
        const copy = structuredClone(base);
        edit(copy);
        return new Map([[1, copy]]);
    };
    const widgetProps = (b: any) => b.components.Widget.allOf[2].properties;

    test("an unchanged catalog against its baseline is clean without --write-baseline", () =>
    {
        expect(run([widget()], [], { baselines: edited(() => {}), writeBaseline: false }).errors).toEqual([]);
    }, 60_000);
    test("a breaking change under the same major is an error naming the change", () =>
    {
        const baselines = edited((b) => { widgetProps(b).gone = { type: "string" }; });
        const errors = run([widget()], [], { baselines, writeBaseline: true }).errors;

        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatch(/Widget\.gone removed[\s\S]*Increment CATALOG_MAJOR/);
    }, 60_000);
    test("a flipped unevaluatedProperties under the same major is breaking, --write-baseline or not", () =>
    {
        const baselines = edited((b) => { b.components.Widget.unevaluatedProperties = true; });
        const errors = run([widget()], [], { baselines, writeBaseline: true }).errors;

        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatch(/Widget changed[\s\S]*Increment CATALOG_MAJOR/);
    }, 60_000);
    test("an additive change without --write-baseline asks for the baseline to be rewritten, listing only what changed", () =>
    {
        const baselines = edited((b) => { delete widgetProps(b).onSelection; });

        expect(run([widget()], [], { baselines, writeBaseline: false }).errors).toEqual([
            "The catalog changed (Widget.onSelection added). Run `npm run build:agentui -- --write-baseline` and commit "
            + "specs/agentui/published/catalog-v1.json in the same change."]);
    }, 60_000);
    test("a description-only change without --write-baseline says description text", () =>
    {
        const baselines = edited((b) => { widgetProps(b).pageSize.description = "Old wording."; });

        expect(run([widget()], [], { baselines, writeBaseline: false }).errors[0])
            .toMatch(/^The catalog changed \(description text\)\. Run/);
    }, 60_000);
    test("an additive change with --write-baseline is accepted", () =>
    {
        const baselines = edited((b) => { delete widgetProps(b).onSelection; });

        expect(run([widget()], [], { baselines, writeBaseline: true }).errors).toEqual([]);
    }, 60_000);
    test("a major bump without its baseline committed is an error", () =>
    {
        const errors = run([widget()], [], { baselines: edited(() => {}), major: 2, writeBaseline: false }).errors;

        expect(errors).toEqual([expect.stringMatching(/^CATALOG_MAJOR is now 2\. Commit its baseline/)]);
    }, 60_000);
    test("a major bump keeps serving the older baseline byte for byte", () =>
    {
        const baselines = edited(() => {});
        const result = run([widget()], [], { baselines, major: 2, writeBaseline: true });

        expect(result.errors).toEqual([]);
        expect(result.outputs.get("a2ui/catalog/v1.json")).toBe(baselines.get(1));
        expect((result.outputs.get("a2ui/catalog/v2.json") as any).$id).toBe("https://static.outcrop.us/a2ui/catalog/v2.json");
    }, 60_000);
});

describe("runPipeline — build summary counts", () =>
{
    test("the counts carry the BELOW_REQUIRED size spec §9 lists", () =>
    {
        expect(run([widget()], [], { belowRequired: ["a", "b"] }).counts.belowRequired).toBe(2);
    }, 60_000);
});

describe("writeOutputs", () =>
{
    test("a string value is written verbatim; anything else as pretty JSON", () =>
    {
        const dist = fs.mkdtempSync(path.join(os.tmpdir(), "agentui-dist-"));

        writeOutputs(new Map<string, unknown>([["a2ui/adapter/v1.js", "export{};"], ["a2ui/catalog/v1.json", { a: 1 }]]), dist);

        expect(fs.readFileSync(path.join(dist, "a2ui", "adapter", "v1.js"), "utf8")).toBe("export{};");
        expect(fs.readFileSync(path.join(dist, "a2ui", "catalog", "v1.json"), "utf8")).toBe('{\n  "a": 1\n}\n');
    });

    test("a failure before writing leaves dist byte-identical", () =>
    {
        const dist = fs.mkdtempSync(path.join(os.tmpdir(), "agentui-dist-"));
        fs.mkdirSync(path.join(dist, "mcp"));
        fs.writeFileSync(path.join(dist, "mcp", "renderer.meta.json"), "OLD");

        expect(() => writeOutputs(new Map<string, unknown>([["mcp/renderer.meta.json", { n: 1n }]]), dist)).toThrow();
        expect(fs.readFileSync(path.join(dist, "mcp", "renderer.meta.json"), "utf8")).toBe("OLD");
    });

    test("success replaces generated roots wholesale and touches nothing else", () =>
    {
        const dist = populatedDist();
        const outputs = new Map<string, unknown>([["schemas/new.options.json", { n: 2 }], ["mcp/renderer.meta.json", { n: 3 }]]);

        writeOutputs(outputs, dist);

        expect(JSON.parse(fs.readFileSync(path.join(dist, "schemas", "new.options.json"), "utf8"))).toEqual({ n: 2 });
        expect(JSON.parse(fs.readFileSync(path.join(dist, "mcp", "renderer.meta.json"), "utf8"))).toEqual({ n: 3 });
        expect(fs.existsSync(path.join(dist, "schemas", "stale.options.json"))).toBe(false);
        expect(fs.readFileSync(path.join(dist, "css", "x.css"), "utf8")).toBe("KEEP");
        expect(fs.readdirSync(dist).filter((f) => f.startsWith(".agentui-staging-"))).toEqual([]);
    });

    test("a failed swap rolls back and leaves dist byte-identical", () =>
    {
        const dist = populatedDist();
        const before = snapshot(dist);
        const failing = renameFailing(path.join(dist, "mcp"), 1);
        const outputs = new Map<string, unknown>([["schemas/new.options.json", { n: 2 }], ["mcp/renderer.meta.json", { n: 3 }]]);

        expect(() => writeOutputs(outputs, dist, failing)).toThrow(/Could not replace dist\/mcp.*EPERM injected/);
        expect(snapshot(dist)).toEqual(before);
    });

    test("a rollback that also fails keeps the parked roots and says where they are", () =>
    {
        const dist = populatedDist();
        const outputs = new Map<string, unknown>([["schemas/new.options.json", { n: 2 }], ["mcp/renderer.meta.json", { n: 3 }]]);

        expect(() => writeOutputs(outputs, dist, renameFailing(path.join(dist, "mcp"), Infinity))).toThrow(/Rollback of dist\/ failed.*\.old/);

        const staging = fs.readdirSync(dist).find((f) => f.startsWith(".agentui-staging-")) as string;
        expect(fs.readFileSync(path.join(dist, staging, ".old", "mcp", "renderer.meta.json"), "utf8")).toBe("OLD");
    });
});

function populatedDist(): string
{
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), "agentui-dist-"));

    for (const [rel, text] of [["schemas/stale.options.json", "STALE"], ["mcp/renderer.meta.json", "OLD"], ["css/x.css", "KEEP"]])
    {
        fs.mkdirSync(path.dirname(path.join(dist, rel)), { recursive: true });
        fs.writeFileSync(path.join(dist, rel), text);
    }

    return dist;
}

function snapshot(dir: string, prefix = ""): Record<string, string>
{
    return Object.assign({}, ...fs.readdirSync(dir, { withFileTypes: true }).map((e) => e.isDirectory()
        ? snapshot(path.join(dir, e.name), `${prefix}${e.name}/`)
        : { [`${prefix}${e.name}`]: fs.readFileSync(path.join(dir, e.name), "utf8") }));
}

/** A file system whose rename into `target` throws the first `times` times. */
function renameFailing(target: string, times: number): typeof fs
{
    let left = times;

    return { ...fs, renameSync: (from: string, to: string) =>
    {
        if (to === target && left-- > 0) { throw new Error("EPERM injected"); }
        fs.renameSync(from, to);
    } } as unknown as typeof fs;
}
