/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiGenerator. The orchestrator classifies, resolves, emits,
 *    checks and builds the catalog for a fixture component, collects every
 *    problem before failing, polices PENDING_CLASSIFICATION, and writes dist
 *    atomically. Spec §8, #17.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

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
        protocol: {
            providers: { onSearch: { request: "search", params: "searchQuery", response: "searchResults" } },
            hostOnly: {
                "columns[].renderer": REASON, title: REASON, container: "Needs a DOM node, which JSON cannot carry.",
                slot: "A live component instance with methods.", onLookup: "Two-parameter lookup with no single-object form.",
            },
            schemas: { extra: { type: "object", additionalProperties: { type: "string" } } },
            ...protocolOver,
        },
    };
}

function run(manifests: unknown[], pending: string[] = [])
{
    return runPipeline({
        manifests, componentFile: (n: string) => path.join(FIXTURES, `${n}.ts`),
        tsconfigPath: path.join(FIXTURES, "tsconfig.json"), cacheDir: CACHE,
        pending: new Set(pending), belowRequired: new Set(), basic, baselines: new Map(), major: 1, writeBaseline: true,
    });
}

describe("runPipeline — fixture widget", () =>
{
    test("a fully declared component produces no errors", () => { expect(run([widget()]).errors).toEqual([]); }, 60_000);
    test("it emits its options schema", () => { expect(run([widget()]).outputs.has("schemas/widget.options.json")).toBe(true); }, 60_000);
    test("it appears in the catalog", () => { expect("Widget" in run([widget()]).catalog.components).toBe(true); }, 60_000);
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
            ["missing-jsdoc", "too-broad", "unclassified", "undeclared-hazard", "undeclared-mixed"]);
    });
});

describe("writeOutputs", () =>
{
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
