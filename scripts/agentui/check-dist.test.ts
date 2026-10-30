/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiDistCheck. Structure check [29] against a minimal fake
 *    repository: baseline twin, layout, $ref resolution, coverage, emitted
 *    text, CSP and stranded staging directories. Spec §10, #17.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { checkDist } from "./check-dist.mjs";

const VENDOR = path.join(__dirname, "vendor", "a2ui-v0_9_1");
const ID = "https://static.outcrop.us/a2ui/catalog/v1.json";

/** A stand-in adapter bundle embedding `catalog`, as the generator would. */
function bundleFor(catalog: unknown): string
{
    return `export const catalogJson = ${JSON.stringify(catalog)};\nexport function createOutcropCatalog() { return null; }\n`;
}

function fakeRepo(mutate: (files: Record<string, unknown>) => void = () => undefined): string
{
    const basic = JSON.parse(fs.readFileSync(path.join(VENDOR, "catalogs", "basic", "catalog.json"), "utf8"));
    const catalog = {
        $schema: "https://json-schema.org/draft/2020-12/schema", $id: ID, title: "T", description: "D", catalogId: ID,
        components: { Text: { type: "object", allOf: [{ $ref: `${basic.catalogId}#/components/Text` }] },
            Widget: { type: "object", allOf: [{ type: "object", properties: { component: { const: "Widget" } } }] } },
        functions: {}, $defs: { anyComponent: { oneOf: [{ $ref: "#/components/Text" }, { $ref: "#/components/Widget" }] },
            anyFunction: { oneOf: [{ type: "object" }] }, CatalogComponentCommon: { type: "object" }, theme: { type: "object" } },
    };
    const files: Record<string, unknown> = {
        "dist/capability-manifest.json": { schemaVersion: 1, components: [{ name: "widget", factory: "createWidget" }, { name: "panel", factory: "createPanel" }] },
        "dist/a2ui/catalog/v1.json": catalog,
        "dist/a2ui/catalog/v1.agent.json": { catalogId: ID, reexports: { components: ["Text"] },
            components: { Widget: { properties: {} } } },
        "specs/agentui/published/catalog-v1.json": structuredClone(catalog),
        "dist/mcp/renderer.meta.json": { csp: { resourceDomains: ["https://static.outcrop.us", "https://fonts.googleapis.com", "https://fonts.gstatic.com"] } },
        "dist/agentui-report.json": { catalogId: ID, excluded: [{ name: "panel", violations: ["x"] }], hostOnly: {} },
    };
    files["dist/a2ui/adapter/v1.d.ts"] = "export {};\n";
    files["dist/agentui-report.json"] = { ...(files["dist/agentui-report.json"] as object), adapter: { packages: [],
        descriptors: [{ name: "Widget", tagName: "outcrop-widget", props: {} }] } };
    mutate(files);
    files["dist/a2ui/adapter/v1.js"] ??= bundleFor(files["dist/a2ui/catalog/v1.json"]);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "agentui-checkdist-"));
    for (const [rel, value] of Object.entries(files))
    {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        fs.writeFileSync(path.join(root, rel), typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`);
    }
    fs.cpSync(VENDOR, path.join(root, "scripts", "agentui", "vendor", "a2ui-v0_9_1"), { recursive: true });
    return root;
}

describe("checkDist ([29])", () =>
{
    test("a consistent dist passes", async () => { expect(await checkDist(fakeRepo())).toEqual([]); });
    test("a catalog differing from the committed baseline fails", async () =>
    {
        expect((await checkDist(fakeRepo((f) => { (f["dist/a2ui/catalog/v1.json"] as any).title = "X"; }))).join()).toMatch(/baseline/);
    });
    test("a gap in the committed majors fails, so an older major cannot be unpublished by deleting it (#28)", async () =>
    {
        // v2 is built and committed, and v1's baseline was deleted.
        const problems = await checkDist(fakeRepo((f) =>
        {
            for (const ext of ["json", "agent.json"]) { f[`dist/a2ui/catalog/v2.${ext}`] = f[`dist/a2ui/catalog/v1.${ext}`]; }
            f["dist/a2ui/adapter/v2.d.ts"] = "export {};\n";
            f["dist/a2ui/adapter/v2.js"] = bundleFor(f["dist/a2ui/catalog/v2.json"]);
            f["specs/agentui/published/catalog-v2.json"] = f["specs/agentui/published/catalog-v1.json"];
            delete f["specs/agentui/published/catalog-v1.json"];
        }));

        expect(problems).toContain("specs/agentui/published/ has no baseline for catalog v1 below v2. Every published "
            + "major stays served (CDN_CONTRACT §2c); restore it from git.");
    });
    test("a built major with no committed baseline fails", async () =>
    {
        expect((await checkDist(fakeRepo((f) => { f["dist/a2ui/catalog/v2.json"] = f["dist/a2ui/catalog/v1.json"]; }))).join())
            .toMatch(/v2/);
    });
    test("a lean agent catalog that drops a component, a re-export or a prop fails (#49)", async () =>
    {
        const lean = (f: Record<string, unknown>) => f["dist/a2ui/catalog/v1.agent.json"] as any;

        expect(await checkDist(fakeRepo((f) => { delete lean(f).components.Widget; })))
            .toEqual(["dist/a2ui/catalog/v1.agent.json does not render Widget."]);
        expect(await checkDist(fakeRepo((f) => { lean(f).reexports.components = []; })))
            .toEqual(["dist/a2ui/catalog/v1.agent.json does not list the re-exported Text."]);
        expect((await checkDist(fakeRepo((f) => { lean(f).components.Widget.properties.extra = {}; }))).join())
            .toMatch(/renders Widget with props \[extra\]/);
    });
    test("a missing component entry fails", async () =>
    {
        const root = fakeRepo((f) => { (f["dist/agentui-report.json"] as any).excluded = []; });
        expect((await checkDist(root)).join()).toMatch(/Panel/);
    });
    test("knobby in an emitted file fails", async () =>
    {
        expect((await checkDist(fakeRepo((f) => { (f["dist/mcp/renderer.meta.json"] as any).csp.resourceDomains[0] = "https://static.knobby.io"; }))).join())
            .toMatch(/knobby/);
    });
    test("a layout that drifts from the basic catalog fails", async () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            for (const k of ["dist/a2ui/catalog/v1.json", "specs/agentui/published/catalog-v1.json"]) { (f[k] as any).instructions = "x"; }
        };
        expect((await checkDist(fakeRepo(mutate))).join()).toMatch(/layout/);
    });
    test("an unresolvable $ref fails", async () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            for (const k of ["dist/a2ui/catalog/v1.json", "specs/agentui/published/catalog-v1.json"])
            {
                (f[k] as any).components.Widget.allOf.push({ $ref: "#/$defs/Nope" });
            }
        };
        expect((await checkDist(fakeRepo(mutate))).join()).toMatch(/can.t resolve reference .*Nope/);
    });
    test("a prop named placeholder, described as one, passes", async () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            (f["dist/schemas/widget.options.json"] as any) = { type: "object", properties: { placeholder: { type: "string", description: "Input placeholder." } } };
            (f["dist/agentui-report.json"] as any).excluded[0].violations = ["placeholder is a sample"];
        };
        expect(await checkDist(fakeRepo(mutate))).toEqual([]);
    });
    test("a fixture literal in a default fails", async () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            f["dist/schemas/widget.options.json"] = { properties: { owner: { type: "string", default: "John Doe" } } };
        };
        expect((await checkDist(fakeRepo(mutate))).join()).toMatch(/john doe/);
    });
    test("a fixture literal in an examples item fails", async () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            f["dist/schemas/widget.options.json"] = { properties: { url: { type: "string", examples: ["https://example.com/x"] } } };
        };
        expect((await checkDist(fakeRepo(mutate))).join()).toMatch(/example\.com/);
    });
    test("a dangling $ref inside functions fails", async () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            for (const k of ["dist/a2ui/catalog/v1.json", "specs/agentui/published/catalog-v1.json"])
            {
                (f[k] as any).functions.Bogus = { allOf: [{ $ref: "#/$defs/Nope" }] };
            }
        };
        expect((await checkDist(fakeRepo(mutate))).join()).toMatch(/can.t resolve reference .*Nope/);
    });
    test("a dangling $ref inside an unreferenced $defs entry fails", async () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            for (const k of ["dist/a2ui/catalog/v1.json", "specs/agentui/published/catalog-v1.json"])
            {
                (f[k] as any).$defs.Orphan = { allOf: [{ $ref: "#/$defs/Nope" }] };
            }
        };
        expect((await checkDist(fakeRepo(mutate))).join()).toMatch(/can.t resolve reference .*Nope/);
    });
    test("a stranded generator staging directory fails", async () =>
    {
        const root = fakeRepo();
        fs.mkdirSync(path.join(root, "dist", ".agentui-staging-abc"), { recursive: true });
        expect((await checkDist(root)).join()).toMatch(/agentui-staging/);
    });
});

describe("checkDist ([29]) — the A2UI adapter (G2)", () =>
{
    test("a missing bundle fails", async () =>
    {
        const root = fakeRepo();
        fs.rmSync(path.join(root, "dist", "a2ui", "adapter", "v1.js"));

        expect((await checkDist(root)).join()).toMatch(/adapter\/v1\.js is missing/);
    });

    test("a bundle embedding a different catalog fails", async () =>
    {
        const mutate = (f: Record<string, unknown>) => { f["dist/a2ui/adapter/v1.js"] = bundleFor({ other: true }); };

        expect((await checkDist(fakeRepo(mutate))).join()).toMatch(/embeds a catalog that differs/);
    });

    test("a bundle without createOutcropCatalog fails", async () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            f["dist/a2ui/adapter/v1.js"] = `export const catalogJson = ${JSON.stringify(f["dist/a2ui/catalog/v1.json"])};\n`;
        };

        expect((await checkDist(fakeRepo(mutate))).join()).toMatch(/does not export createOutcropCatalog/);
    });

    test("a served package outside the allowed set fails", async () =>
    {
        const mutate = (f: Record<string, unknown>) => { (f["dist/agentui-report.json"] as any).adapter.packages = ["zod"]; };

        expect((await checkDist(fakeRepo(mutate))).join()).toMatch(/serves zod/);
    });

    test("a data prop without a route fails, whatever its name", async () =>
    {
        const binding = { $ref: "https://a2ui.org/specification/v0_9/common_types.json#/$defs/DataBinding" };
        const mutate = (f: Record<string, unknown>) =>
        {
            for (const k of ["dist/a2ui/catalog/v1.json", "specs/agentui/published/catalog-v1.json"])
            {
                (f[k] as any).components.Widget.allOf[0].properties.online = { anyOf: [{ type: "boolean" }, binding] };
            }
        };

        expect((await checkDist(fakeRepo(mutate))).join()).toMatch(/Widget\.online is a data prop with no adapter route/);
    });

    test("a JavaScript file under dist/a2ui is scanned for host names but not parsed as JSON", async () =>
    {
        expect(await checkDist(fakeRepo())).toEqual([]);
        expect((await checkDist(fakeRepo((f) => { f["dist/a2ui/adapter/v1.js"] = `${bundleFor(f["dist/a2ui/catalog/v1.json"])}// knobby\n`; }))).join())
            .toMatch(/knobby/);
    });
});
