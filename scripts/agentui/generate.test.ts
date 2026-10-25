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
import { runPipeline, writeOutputs } from "./generate.mjs";

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
});
