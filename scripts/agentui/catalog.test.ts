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
import { DATA_SHAPES } from "../../runtime/src/constants";
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
        searchResult: { type: "array", items: { type: "string" } },
    },
    required: ["columns"],
    $defs: { Col: { type: "object", properties: { id: { type: "string" } }, additionalProperties: false } },
};
const SURFACE = {
    name: "widget",
    dataProps: [{ name: "pageSize", jsdoc: "Rows per page." }, { name: "columns", jsdoc: "Columns." }],
    twoWayValue: false,
    events: [{ channel: "selection", option: "onSelect", actionProp: "onSelection", payload: "collection", multi: true,
        payloadInValue: false }],
    providers: [{ option: "onSearch", request: "search", actionProp: "onSearch", response: "searchResult" }],
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
    test("a data prop accepts a literal, a binding or a function call, with its description outside", () =>
    {
        expect(ownProps(build().catalog, "Widget").pageSize).toEqual({
            description: "Rows per page.",
            anyOf: [{ type: "number" }, { $ref: `${COMMON_TYPES_ID}#/$defs/DataBinding` },
                { $ref: `${COMMON_TYPES_ID}#/$defs/FunctionCall` }],
        });
    });
    test("a data prop whose schema is an open object still accepts a binding (anyOf, not oneOf)", () =>
    {
        const schema = { ...SCHEMA, properties: { ...SCHEMA.properties, pageSize: { type: "object" } } };
        const { pageSize } = ownProps(build([{ manifest: MANIFEST, surface: SURFACE, schema }]).catalog, "Widget");

        expect("oneOf" in pageSize).toBe(false);
        expect(pageSize.anyOf).toHaveLength(3);
    });
    test("one binding-only eventData prop carries every payload", () =>
    {
        const { eventData } = ownProps(build().catalog, "Widget");

        expect(eventData.$ref).toBe(`${COMMON_TYPES_ID}#/$defs/DataBinding`);
        expect("anyOf" in eventData || "oneOf" in eventData).toBe(false);
        expect(eventData.description).toContain("<path>/<channel>");
        expect(eventData.description).toContain("<path>/<request>");
    });
    test("no channel-named or params props remain", () =>
    {
        const props = ownProps(build().catalog, "Widget");
        expect(["selection", "searchQuery", "searchResults"].filter((p) => p in props)).toEqual([]);
    });
    test("a channel has an on<Channel> Action that says where its payload is", () =>
    {
        const { onSelection } = ownProps(build().catalog, "Widget");

        expect(onSelection.$ref).toBe(`${COMMON_TYPES_ID}#/$defs/Action`);
        expect(onSelection.description)
            .toBe("Sent when \"selection\" emits. Its payload (one or more collections) is at <eventData path>/selection.");
    });
    test("a single-item channel's description names one payload of its shape", () =>
    {
        const s = { ...SURFACE, events: [{ ...SURFACE.events[0], channel: "anchor", actionProp: "onAnchor",
            payload: "record", multi: false }] };
        expect(ownProps(build([{ manifest: MANIFEST, surface: s, schema: SCHEMA }]).catalog, "Widget").onAnchor.description)
            .toBe("Sent when \"anchor\" emits. Its payload (a record) is at <eventData path>/anchor.");
    });
    test("a multi-item channel uses the shape's English plural", () =>
    {
        const s = { ...SURFACE, events: [{ ...SURFACE.events[0], payload: "hierarchy" }] };
        expect(ownProps(build([{ manifest: MANIFEST, surface: s, schema: SCHEMA }]).catalog, "Widget").onSelection.description)
            .toContain("(one or more hierarchies)");
    });
    test("every DataShape has a payload phrase, so the closed set and the plurals cannot drift", () =>
    {
        const phrase = (payload: string) => ownProps(build([{ manifest: MANIFEST, schema: SCHEMA,
            surface: { ...SURFACE, events: [{ ...SURFACE.events[0], payload }] } }]).catalog, "Widget").onSelection.description;

        expect(DATA_SHAPES.filter((shape) => !/\(one or more \w+\)/.test(phrase(shape)))).toEqual([]);
    });
    test("a payload shape outside the closed DataShape set throws a literate error", () =>
    {
        const s = { ...SURFACE, events: [{ ...SURFACE.events[0], payload: "blob" }] };
        expect(() => build([{ manifest: MANIFEST, surface: s, schema: SCHEMA }]))
            .toThrow(/widget: channel "selection" has payload shape "blob", which is not a DataShape/);
    });
    test("a provider gets on<Request> and <request>Result", () =>
    {
        const props = ownProps(build().catalog, "Widget");

        expect(props.onSearch.$ref).toBe(`${COMMON_TYPES_ID}#/$defs/Action`);
        expect(props.onSearch.description).toContain("<eventData path>/search");
        expect(props.searchResult.anyOf).toEqual([{ type: "array", items: { type: "string" } },
            { $ref: `${COMMON_TYPES_ID}#/$defs/DataBinding` }, { $ref: `${COMMON_TYPES_ID}#/$defs/FunctionCall` }]);
    });
    test("eventData is absent when no event or provider carries a payload", () =>
    {
        const s = { ...SURFACE, twoWayValue: true, providers: [],
            events: [{ channel: "change", option: "onChange", actionProp: "onChange", payload: "scalar", multi: false,
                payloadInValue: true }] };
        const props = ownProps(build([{ manifest: MANIFEST, surface: s, schema: SCHEMA }]).catalog, "Widget");

        expect("eventData" in props).toBe(false);
        expect(props.onChange.description)
            .toBe("Sent when the value changes. Read the new value through the path bound to `value`.");
    });
    test("cleared: null keeps value's literal arm and says that cleared is an absent path (ADR-222)", () =>
    {
        const schema = { ...SCHEMA, properties: { ...SCHEMA.properties, value: { type: "string", description: "Day." } } };
        const s = { ...SURFACE, twoWayValue: true, change: { cleared: null },
            dataProps: [...SURFACE.dataProps, { name: "value", jsdoc: "Day." }] };
        const props = ownProps(build([{ manifest: MANIFEST, surface: s, schema }]).catalog, "Widget");

        expect(props.value.anyOf[0]).toEqual({ type: "string" });
        expect(props.value.description).toContain("the path is deleted; delete the path to clear it.");
    });
    test("valueFrom leaves value's literal arm as generated", () =>
    {
        const schema = { ...SCHEMA, properties: { ...SCHEMA.properties, value: { type: "string", description: "Hex." } } };
        const s = { ...SURFACE, twoWayValue: true, change: { valueFrom: "hex" },
            dataProps: [...SURFACE.dataProps, { name: "value", jsdoc: "Hex." }] };
        const props = ownProps(build([{ manifest: MANIFEST, surface: s, schema }]).catalog, "Widget");

        expect(props.value.anyOf[0]).toEqual({ type: "string" });
    });
    test("eventData is absent for a component with no events or providers", () =>
    {
        const s = { ...SURFACE, events: [], providers: [] };
        expect("eventData" in ownProps(build([{ manifest: MANIFEST, surface: s, schema: SCHEMA }]).catalog, "Widget")).toBe(false);
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
    test("a host-only action is left out of the Actions sentence (ADR-222)", () =>
    {
        const m = { ...MANIFEST, protocol: { hostOnlyActions: { export: "Writes a file in the browser." } } };
        expect(describeComponent(m)).toBe("Widget. Use it to browse, compare a collection of 2 to 500 items.");
    });
    test("a cardinality whose min equals its max reads exactly 1 item", () =>
    {
        const m = { ...MANIFEST, actions: [], affords: [{ shape: "document", intents: ["author"], cardinality: { min: 1, max: 1 } }] };
        expect(describeComponent(m)).toBe("Widget. Use it to author a document of exactly 1 item.");
    });
    test("exactly N items is plural above 1", () =>
    {
        const m = { ...MANIFEST, actions: [], affords: [{ shape: "collection", intents: ["compare"], cardinality: { min: 2, max: 2 } }] };
        expect(describeComponent(m)).toBe("Widget. Use it to compare a collection of exactly 2 items.");
    });
    test("the preamble describes the single eventData pattern", () =>
    {
        expect(build().catalog.description).toContain("eventData");
    });
    test("the preamble says a data property takes a literal, a binding or a function call", () =>
    {
        expect(build().catalog.description).toContain("a literal, a {\"path\": …} binding or a {\"call\": …} function call");
    });
    test("the preamble never promises an onChange action, which some two-way components lack", () =>
    {
        expect(build().catalog.description).not.toMatch(/onChange/);
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
    test("eventData colliding with a data prop fails", () =>
    {
        const s = { ...SURFACE, dataProps: [...SURFACE.dataProps, { name: "eventData", jsdoc: "Data." }] };
        const schema = { ...SCHEMA, properties: { ...SCHEMA.properties, eventData: { type: "string" } } };
        const { violations } = build([{ manifest: MANIFEST, surface: s, schema }]);

        expect(violations.map((v: any) => [v.code, v.member])).toEqual([[VIOLATION.PROP_COLLISION, "eventData"]]);
    });
    test("a <request>Result colliding with a data prop fails", () =>
    {
        const s = { ...SURFACE, dataProps: [...SURFACE.dataProps, { name: "searchResult", jsdoc: "Data." }] };
        const { violations } = build([{ manifest: MANIFEST, surface: s, schema: SCHEMA }]);

        expect(violations.map((v: any) => [v.code, v.member])).toEqual([[VIOLATION.PROP_COLLISION, "searchResult"]]);
    });
    test("two events deriving the same action prop fail instead of collapsing into one", () =>
    {
        const s = { ...SURFACE, events: [SURFACE.events[0], { ...SURFACE.events[0], channel: "Selection" }] };
        const { violations } = build([{ manifest: MANIFEST, surface: s, schema: SCHEMA }]);

        expect(violations.map((v: any) => [v.code, v.member])).toEqual([[VIOLATION.PROP_COLLISION, "onSelection"]]);
    });
});

describe("catalog — fix round 1", () =>
{
    const withDef = (name: string, def: string) => ({
        manifest: { ...MANIFEST, name: name.toLowerCase(), factory: `create${name}` },
        surface: { ...SURFACE, name: name.toLowerCase() },
        schema: { ...SCHEMA, $defs: { [def]: SCHEMA.$defs.Col }, properties: { ...SCHEMA.properties, columns: { type: "array", items: { $ref: `#/$defs/${def}` } } } },
    });

    test("two components relocating to the same def key fail instead of overwriting", () =>
    {
        const { violations } = build([withDef("A", "B__C"), withDef("A__B", "C")]);
        expect(violations.map((v: any) => v.code)).toEqual([VIOLATION.NAME_COLLISION]);
        expect(violations[0].message).toContain("A__B__C");
    });
    test("a surface data prop missing from the schema throws a literate error", () =>
    {
        const schema = { ...SCHEMA, properties: { searchResult: SCHEMA.properties.searchResult } };
        expect(() => build([{ manifest: MANIFEST, surface: SURFACE, schema }]))
            .toThrow(/widget: the surface lists data prop "pageSize" but the generated schema has no such property/);
    });
    test("a schema with no properties at all throws the same literate error", () =>
    {
        const { properties, ...schema } = SCHEMA;
        void properties;
        expect(() => build([{ manifest: MANIFEST, surface: SURFACE, schema }])).toThrow(/post-check in generate\.mjs/);
    });
    test("a provider response missing from the schema throws a literate error", () =>
    {
        const { searchResult, ...properties } = SCHEMA.properties;
        void searchResult;
        expect(() => build([{ manifest: MANIFEST, surface: SURFACE, schema: { ...SCHEMA, properties } }]))
            .toThrow(/widget: the surface lists provider response "searchResult"/);
    });
});
