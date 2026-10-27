// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiMessageChecker. Three layers judge agent-written A2UI
 *    (#30 spec §3): the precompiled schemas, a headless web_core dry run fed
 *    one message at a time, and a reference check derived from the catalog
 *    schemas. A list is valid only if every layer accepts it.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { Catalog, MessageProcessor } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS, basicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";

import basic from "./vendor/a2ui-v0_9_1/catalogs/basic/catalog.json";
import commonTypes from "./vendor/a2ui-v0_9_1/common_types.json";
import envelope from "./vendor/a2ui-v0_9_1/server_to_client.json";
import catalog from "../../specs/agentui/published/catalog-v1.json";
import { bundleMessageValidator, compileMessageValidator } from "./message-validator.mjs";
import { check, checkReferences, checkSchema, dryRun, formatFindings, referenceProps } from "./a2ui-check.mjs";

const V = "v0.9.1";
const ID = "https://static.outcrop.us/a2ui/catalog/v1.json";
const webCore = { Catalog, MessageProcessor, basicCatalog, BASIC_FUNCTIONS };
const catalogs = { ours: catalog, basic, commonTypes };

const surface = (surfaceId = "s") => ({ version: V, createSurface: { surfaceId, catalogId: ID } });
const components = (list: unknown[], surfaceId = "s") =>
    ({ version: V, updateComponents: { surfaceId, components: list } });
const data = (value: unknown, surfaceId = "s") => ({ version: V, updateDataModel: { surfaceId, path: "/", value } });

let validators: unknown;
let deps: { validators: unknown; webCore: typeof webCore; catalogJson: unknown; catalogs: typeof catalogs };

beforeAll(async () =>
{
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "a2ui-check-")), "v.mjs");

    const source = compileMessageValidator({ catalog, basic, commonTypes, envelope });

    fs.writeFileSync(file, await bundleMessageValidator(source));
    validators = (await import(pathToFileURL(file).href)).messageValidators;
    deps = { validators, webCore, catalogJson: catalog, catalogs };
}, 60_000);

describe("check", () =>
{
    test("a valid sticky-note sequence has no findings", () =>
    {
        const result = check([surface(), components([{ id: "root", component: "StickyNote", value: { path: "/n" } }]),
            data({ n: "Draft" })], deps);

        expect(result).toEqual({ ok: true, findings: [] });
    });

    test("an invalid list is not ok", () =>
    {
        expect(check([{ version: V }], deps).ok).toBe(false);
    });
});

describe("checkSchema", () =>
{
    test("a message with two update keys is one finding naming the four types", () =>
    {
        const findings = checkSchema([{ version: V, createSurface: {}, deleteSurface: {} }], validators);

        expect(findings).toEqual([{ index: 0, path: "", layer: "schema",
            message: "a message must contain exactly one of createSurface, updateComponents, updateDataModel, "
                + "deleteSurface; found createSurface and deleteSurface" }]);
    });

    test("an unknown component is one finding at its component field", () =>
    {
        const findings = checkSchema([surface(), components([{ id: "root", component: "Nope" }])], validators);

        expect(findings).toHaveLength(1);
        expect(findings[0]).toMatchObject({ index: 1, path: "updateComponents.components[0].component",
            layer: "schema" });
        expect(findings[0].message).toMatch(/^unknown component "Nope"/);
    });

    test("a wrongly typed prop is one finding at its path", () =>
    {
        const findings = checkSchema([surface(), components([{ id: "root", component: "Ruler", length: "long" }])],
            validators);

        expect(findings).toHaveLength(1);
        expect(findings[0]).toMatchObject({ index: 1, path: "updateComponents.components[0].length", layer: "schema" });
        expect(findings[0].message).toBe('expected a literal number, a data binding {"path": "/…"}, or a function '
            + 'call {"call": "<name>", "args": {…}}; got "long"');
    });

    test("a literal outside an enum lists the allowed values", () =>
    {
        const findings = checkSchema([surface(), components([{ id: "root", component: "Ruler",
            orientation: "diagonal" }])], validators);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toMatch(/^expected a literal one of "horizontal", "vertical", a data binding/);
    });

    test("an unknown function names the functions the catalog has", () =>
    {
        const findings = checkSchema([surface(), components([{ id: "root", component: "Text",
            text: { call: "nope", args: {} } }])], validators);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toMatch(/^unknown function "nope"; this catalog's functions are and, email, /);
    });

    test("a known function with bad arguments reports that function's own errors", () =>
    {
        const findings = checkSchema([surface(), components([{ id: "root", component: "Text",
            text: { call: "formatDate", args: {} } }])], validators);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toMatch(/^function "formatDate": args must have required property/);
    });

    test("a malformed binding reports the binding's own errors", () =>
    {
        const findings = checkSchema([surface(), components([{ id: "root", component: "Ruler",
            length: { path: 5 } }])], validators);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toBe("as a data binding: path must be string");
    });

    test("a malformed envelope is reported at its path", () =>
    {
        const findings = checkSchema([{ version: V, createSurface: { catalogId: ID } }], validators);

        expect(findings).toHaveLength(1);
        expect(findings[0]).toMatchObject({ index: 0, layer: "schema" });
        expect(findings[0].message).toMatch(/surfaceId/);
    });
});

describe("dryRun", () =>
{
    test("updateComponents before createSurface is a finding on that index, and later messages are still checked", () =>
    {
        const findings = dryRun([components([{ id: "root", component: "Ruler" }]), surface(),
            components([{ id: "root", component: "Ruler", length: "long" }])], webCore, catalog);

        expect(findings.map((f: { index: number }) => f.index)).toEqual([0, 2]);
        expect(findings.every((f: { layer: string }) => f.layer === "web_core")).toBe(true);
        expect(findings[0].message).toMatch(/Surface not found/);
    });

    test("an unknown catalog is a finding", () =>
    {
        const findings = dryRun([{ version: V, createSurface: { surfaceId: "s", catalogId: "x" } }], webCore, catalog);

        expect(findings).toEqual([expect.objectContaining({ index: 0, layer: "web_core" })]);
    });
});

describe("disagreements", () =>
{
    test("web_core accepts an unknown function name that the schema rejects, and the finding says so", () =>
    {
        const result = check([surface(), components([{ id: "root", component: "Text",
            text: { call: "noSuchFunction", args: {} } }])], deps);
        const schema = result.findings.filter((f: { layer: string }) => f.layer === "schema");

        expect(result.findings.some((f: { layer: string }) => f.layer === "web_core")).toBe(false);
        expect(schema.length).toBeGreaterThan(0);
        expect(schema[0].disagreement).toBe("schema rejects, web_core accepts: it would render but breaks the catalog "
            + "contract");
    });
});

describe("referenceProps", () =>
{
    test("derives every basic-catalog reference site from the schemas", () =>
    {
        const sites = referenceProps(catalogs);
        const show = (name: string) => (sites.get(name) ?? []).map((s: { path: string[]; kind: string }) =>
            `${s.path.join(".")}:${s.kind}`);

        expect(show("Row")).toEqual(["children:childList"]);
        expect(show("Column")).toEqual(["children:childList"]);
        expect(show("List")).toEqual(["children:childList"]);
        expect(show("Card")).toEqual(["child:id"]);
        expect(show("Button")).toEqual(["child:id"]);
        expect(show("Tabs")).toEqual(["tabs.*.child:id"]);
        expect(show("Modal").sort()).toEqual(["content:id", "trigger:id"]);
        expect(sites.has("StickyNote")).toBe(false);
    });
});

describe("checkReferences", () =>
{
    test("a dangling Column child names the missing id and the surface", () =>
    {
        const findings = checkReferences([surface(), components([{ id: "root", component: "Column",
            children: ["a", "b"] }, { id: "a", component: "Text", text: "hi" }])], catalogs);

        expect(findings).toEqual([{ index: null, path: "", layer: "references",
            message: 'component "root" references "b", which surface "s" never defines' }]);
    });

    test("a template ChildList componentId that does not exist is a finding", () =>
    {
        const findings = checkReferences([surface(), components([{ id: "root", component: "List",
            children: { componentId: "row", path: "/items" } }])], catalogs);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toMatch(/references "row"/);
    });

    test("a surface with components but no root is a finding", () =>
    {
        const findings = checkReferences([surface(), components([{ id: "a", component: "Text", text: "hi" }])],
            catalogs);

        expect(findings).toEqual([{ index: null, path: "", layer: "references",
            message: 'surface "s" has components but none with id "root"' }]);
    });

    test("re-sending a component id is an update, not a finding", () =>
    {
        const findings = checkReferences([surface(), components([{ id: "root", component: "Text", text: "a" }]),
            components([{ id: "root", component: "Text", text: "b" }])], catalogs);

        expect(findings).toEqual([]);
    });

    test("a deleted surface is forgotten", () =>
    {
        const findings = checkReferences([surface(), components([{ id: "a", component: "Text", text: "hi" }]),
            { version: V, deleteSurface: { surfaceId: "s" } }], catalogs);

        expect(findings).toEqual([]);
    });
});

describe("formatFindings", () =>
{
    test("prints one line per finding: index, dotted path, message, layer, and any disagreement", () =>
    {
        const text = formatFindings([
            { index: 2, path: "updateComponents.components[0].value", layer: "schema", message: "bad",
                disagreement: "d" },
            { index: 3, path: "", layer: "web_core", message: "Surface not found" },
            { index: null, path: "", layer: "references", message: "dangling" },
        ]);

        expect(text).toBe([
            "#2 updateComponents.components[0].value: bad [schema] (d)",
            "#3: Surface not found [web_core]",
            "end of list: dangling [references]",
        ].join("\n"));
    });
});
