/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiCatalog. The A2UI v0.9.1 catalog file built from manifests,
 *    surfaces and schemas: identity, basic re-exports, component entries,
 *    guidance text and violations. Spec §5, #17.
 */

import { describe, expect, test } from "vitest";

import basic from "./vendor/a2ui-v0_9_1/catalogs/basic/catalog.json";
import {
    BASIC_CATALOG_ID, COMMON_TYPES_ID, buildCatalog, catalogId, catalogName, describeComponent, relocateDefs,
} from "./catalog.mjs";
import { VIOLATION } from "./resolve.mjs";

const MANIFEST = {
    name: "widget", factory: "createWidget", label: "Widget",
    affords: [{ shape: "collection", intents: ["browse", "compare"], cardinality: { min: 2, max: 500 } }],
    emits: [], accepts: [], actions: [{ id: "export", label: "Export CSV" }], conformance: "surface",
};
const SCHEMA = {
    $schema: "https://json-schema.org/draft/2020-12/schema", type: "object", additionalProperties: false,
    properties: {
        pageSize: { type: "number", description: "Rows per page." },
        columns: { type: "array", items: { $ref: "#/$defs/Col" } },
        searchResults: { type: "array", items: { type: "string" } },
    },
    required: ["columns"],
    $defs: { Col: { type: "object", properties: { id: { type: "string" } }, additionalProperties: false } },
};
const SURFACE = {
    name: "widget",
    dataProps: [{ name: "pageSize", jsdoc: "Rows per page." }, { name: "columns", jsdoc: "Columns." }],
    twoWayValue: false,
    events: [{ channel: "selection", option: "onSelect", bindProp: "selection", actionProp: "onSelection", payload: "collection" }],
    providers: [{ option: "onSearch", request: "search", params: "searchQuery", response: "searchResults", actionProp: "onSearch" }],
    actions: [{ id: "export", label: "Export CSV", actionProp: "onExport" }],
    hostOnly: {}, violations: [],
};

function build(components = [{ manifest: MANIFEST, surface: SURFACE, schema: SCHEMA }])
{
    return buildCatalog({ basic, components, major: 1 });
}

function ownProps(catalog: any, name: string): Record<string, any>
{
    return catalog.components[name].allOf[2].properties;
}

describe("catalog — identity and layout", () =>
{
    test("the ID lives on static.outcrop.us at the dist root", () =>
    {
        expect(catalogId(1)).toBe("https://static.outcrop.us/a2ui/catalog/v1.json");
    });
    test("$id equals catalogId", () => { expect(build().catalog.$id).toBe(build().catalog.catalogId); });
    test("top-level keys mirror the basic catalog file", () =>
    {
        expect(Object.keys(build().catalog).sort()).toEqual(Object.keys(basic).sort());
    });
    test("the name drops create", () => { expect(catalogName(MANIFEST)).toBe("Widget"); });
    test("protocol.name overrides", () => { expect(catalogName({ ...MANIFEST, protocol: { name: "Grid" } })).toBe("Grid"); });
});

describe("catalog — basic re-exports", () =>
{
    test("re-exports every basic component", () =>
    {
        expect(Object.keys(basic.components).every((n) => n in build().catalog.components)).toBe(true);
    });
    test("re-exports through allOf, never a bare $ref", () =>
    {
        expect(build().catalog.components.Text).toEqual(
            { type: "object", allOf: [{ $ref: `${BASIC_CATALOG_ID}#/components/Text` }] });
    });
    test("re-exports every basic function", () =>
    {
        expect(Object.keys(build().catalog.functions)).toEqual(Object.keys(basic.functions).sort());
    });
    test("anyComponent lists every component", () =>
    {
        const { catalog } = build();
        expect(catalog.$defs.anyComponent.oneOf.length).toBe(Object.keys(catalog.components).length);
    });
});

describe("catalog — component entry", () =>
{
    test("starts with ComponentCommon", () =>
    {
        expect(build().catalog.components.Widget.allOf[0]).toEqual({ $ref: `${COMMON_TYPES_ID}#/$defs/ComponentCommon` });
    });
    test("a data prop accepts a literal or a binding", () =>
    {
        expect(ownProps(build().catalog, "Widget").pageSize.oneOf[1]).toEqual({ $ref: `${COMMON_TYPES_ID}#/$defs/DataBinding` });
    });
    test("a channel's bind prop is binding-only", () =>
    {
        expect(ownProps(build().catalog, "Widget").selection.$ref).toBe(`${COMMON_TYPES_ID}#/$defs/DataBinding`);
    });
    test("a channel has an on<Channel> Action", () =>
    {
        expect(ownProps(build().catalog, "Widget").onSelection.$ref).toBe(`${COMMON_TYPES_ID}#/$defs/Action`);
    });
    test("a provider gets params, action and response", () =>
    {
        expect(["searchQuery", "onSearch", "searchResults"].every((p) => p in ownProps(build().catalog, "Widget"))).toBe(true);
    });
    test("a manifest action gets an on<Id> Action", () => { expect("onExport" in ownProps(build().catalog, "Widget")).toBe(true); });
    test("required carries component and required data props", () =>
    {
        expect(build().catalog.components.Widget.allOf[2].required).toEqual(["component", "columns"]);
    });
    test("component-local defs are relocated under a prefix", () =>
    {
        expect(Object.keys(build().catalog.$defs)).toContain("Widget__Col");
    });
    test("relocateDefs rewrites refs to the prefix", () =>
    {
        expect(relocateDefs(SCHEMA, "Widget").root.properties.columns.items.$ref).toBe("#/$defs/Widget__Col");
    });
});

describe("catalog — guidance", () =>
{
    test("describes affordances in words", () =>
    {
        expect(describeComponent(MANIFEST)).toBe("Widget. Use it to browse, compare a collection of 2 to 500 items. Actions: Export CSV.");
    });
    test("the catalog description lists the component", () => { expect(build().catalog.description).toContain("- Widget: Widget."); });
});

describe("catalog — violations", () =>
{
    test("a name colliding with the basic catalog fails", () =>
    {
        const m = { ...MANIFEST, protocol: { name: "Text" } };
        expect(build([{ manifest: m, surface: SURFACE, schema: SCHEMA }]).violations[0].code).toBe(VIOLATION.NAME_COLLISION);
    });
    test("a non-UAX31 name fails", () =>
    {
        const m = { ...MANIFEST, protocol: { name: "my-widget" } };
        expect(build([{ manifest: m, surface: SURFACE, schema: SCHEMA }]).violations[0].code).toBe(VIOLATION.NAME_INVALID);
    });
    test("a generated prop colliding with a data prop fails", () =>
    {
        const s = { ...SURFACE, events: [{ ...SURFACE.events[0], bindProp: "pageSize" }] };
        expect(build([{ manifest: MANIFEST, surface: s, schema: SCHEMA }]).violations[0].code).toBe(VIOLATION.PROP_COLLISION);
    });
});
