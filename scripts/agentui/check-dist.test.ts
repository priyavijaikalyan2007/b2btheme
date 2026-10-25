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
        "specs/agentui/published/catalog-v1.json": structuredClone(catalog),
        "dist/mcp/renderer.meta.json": { csp: { resourceDomains: ["https://static.outcrop.us", "https://fonts.googleapis.com", "https://fonts.gstatic.com"] } },
        "dist/agentui-report.json": { catalogId: ID, excluded: [{ name: "panel", violations: ["x"] }], hostOnly: {} },
    };
    mutate(files);
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
    test("a consistent dist passes", () => { expect(checkDist(fakeRepo())).toEqual([]); });
    test("a catalog differing from the committed baseline fails", () =>
    {
        expect(checkDist(fakeRepo((f) => { (f["dist/a2ui/catalog/v1.json"] as any).title = "X"; })).join()).toMatch(/baseline/);
    });
    test("a built major with no committed baseline fails", () =>
    {
        expect(checkDist(fakeRepo((f) => { f["dist/a2ui/catalog/v2.json"] = f["dist/a2ui/catalog/v1.json"]; })).join())
            .toMatch(/v2/);
    });
    test("a missing component entry fails", () =>
    {
        const root = fakeRepo((f) => { (f["dist/agentui-report.json"] as any).excluded = []; });
        expect(checkDist(root).join()).toMatch(/Panel/);
    });
    test("knobby in an emitted file fails", () =>
    {
        expect(checkDist(fakeRepo((f) => { (f["dist/mcp/renderer.meta.json"] as any).csp.resourceDomains[0] = "https://static.knobby.io"; })).join())
            .toMatch(/knobby/);
    });
    test("a layout that drifts from the basic catalog fails", () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            for (const k of ["dist/a2ui/catalog/v1.json", "specs/agentui/published/catalog-v1.json"]) { (f[k] as any).instructions = "x"; }
        };
        expect(checkDist(fakeRepo(mutate)).join()).toMatch(/layout/);
    });
    test("an unresolvable $ref fails", () =>
    {
        const mutate = (f: Record<string, unknown>) =>
        {
            for (const k of ["dist/a2ui/catalog/v1.json", "specs/agentui/published/catalog-v1.json"])
            {
                (f[k] as any).components.Widget.allOf.push({ $ref: "#/$defs/Nope" });
            }
        };
        expect(checkDist(fakeRepo(mutate)).join()).toMatch(/can.t resolve reference .*Nope/);
    });
    test("fixture vocabulary in an emitted file fails", () =>
    {
        expect(checkDist(fakeRepo((f) => { (f["dist/agentui-report.json"] as any).note = "lorem ipsum"; })).join()).toMatch(/fixture/);
    });
    test("a stranded generator staging directory fails", () =>
    {
        const root = fakeRepo();
        fs.mkdirSync(path.join(root, "dist", ".agentui-staging-abc"), { recursive: true });
        expect(checkDist(root).join()).toMatch(/agentui-staging/);
    });
});
