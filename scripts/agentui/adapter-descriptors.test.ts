/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiAdapterDescriptors. One descriptor per catalog component,
 *    derived from the manifest and the resolved surface with one route rule
 *    and no exceptions; gate G1 (actions, providers) and tag collisions are
 *    literate problems. Spec §3, §9.
 */

import { describe, expect, test } from "vitest";

import { TAG_PREFIX, buildDescriptors, routesFor, tagFor } from "./adapter-descriptors.mjs";

type M = Record<string, unknown>;

function manifest(over: M = {}): M
{
    return { name: "widget", factory: "createWidget", emits: [], accepts: [], actions: [], stateKeys: [],
        conformance: "surface", ...over };
}

function surface(over: M = {}): M
{
    const { dataProps = [], ...rest } = over as { dataProps?: string[] };

    return { name: "widget", dataProps: dataProps.map((name) => ({ name })), twoWayValue: false,
        events: [], providers: [], actions: [], ...rest };
}

/** A catalog holding one entry per [name, {prop: literalArm}] pair. */
function catalog(entries: [string, Record<string, unknown>][] = []): M
{
    const components = Object.fromEntries(entries.map(([name, props]) => [name, { allOf: [{}, {}, {
        properties: Object.fromEntries(Object.entries(props).map(([p, arm]) => [p, { anyOf: [arm, {}, {}] }])),
    }] }]));

    return { components };
}

function entry(name: string, dir: string, over: M = {}): M
{
    return { manifest: manifest({ name: dir, factory: `create${name}`, ...over }), surface: surface({ name: dir }) };
}

describe("tagFor", () =>
{
    test("kebab-cases the catalog name behind the outcrop- prefix, including acronym runs", () =>
    {
        expect(TAG_PREFIX).toBe("outcrop-");
        expect(tagFor("StickyNote")).toBe("outcrop-sticky-note");
        expect(tagFor("ToolColorPicker")).toBe("outcrop-tool-color-picker");
        expect(tagFor("HTMLViewer")).toBe("outcrop-html-viewer");
        expect(tagFor("Chart3D")).toBe("outcrop-chart3-d");
        expect(tagFor("Ruler")).toBe("outcrop-ruler");
    });
});

describe("routesFor", () =>
{
    test("applies accepts, then stateKeys, then value, then create, in that order", () =>
    {
        const m = manifest({ accepts: [{ name: "text" }, { name: "rows", setter: "setRows" }], stateKeys: ["text", "color"] });
        const s = surface({ dataProps: ["text", "rows", "color", "value", "readOnly"], twoWayValue: true });

        expect(routesFor(m, s)).toEqual({
            text: { route: "slot", slot: "text" },
            rows: { route: "slot", slot: "rows", setter: "setRows" },
            color: { route: "state", key: "color" },
            value: { route: "value" },
            readOnly: { route: "create" },
        });
    });

    test("value on a one-way component is create-time", () =>
    {
        expect(routesFor(manifest(), surface({ dataProps: ["value"] })).value).toEqual({ route: "create" });
    });

    test("a manifest without stateKeys routes by accepts and value only", () =>
    {
        const m = manifest({ stateKeys: undefined });

        expect(routesFor(m, surface({ dataProps: ["mode"] }))).toEqual({ mode: { route: "create" } });
    });
});

describe("buildDescriptors — gate G1", () =>
{
    test("a catalog component with actions is a problem naming #31", () =>
    {
        const ready = [{ manifest: manifest({ actions: [{ id: "export", label: "Export" }] }),
            surface: surface({ actions: [{ id: "export", label: "Export", actionProp: "onExport" }] }) }];

        expect(buildDescriptors(ready, catalog([["Widget", {}]]), () => true).problems[0])
            .toMatch(/Widget declares actions \[export\].*#31/);
    });

    test("the G1 problem points at protocol.hostOnlyActions (ADR-222)", () =>
    {
        const ready = [{ manifest: manifest({ actions: [{ id: "export", label: "Export" }] }),
            surface: surface({ actions: [{ id: "export", label: "Export", actionProp: "onExport" }] }) }];

        expect(buildDescriptors(ready, catalog([["Widget", {}]]), () => true).problems[0]).toContain("protocol.hostOnlyActions");
    });

    test("a catalog component with providers is a problem naming #31", () =>
    {
        const ready = [{ manifest: manifest(), surface: surface({
            providers: [{ option: "onSearch", request: "search", actionProp: "onSearch", response: "searchResult" }] }) }];

        expect(buildDescriptors(ready, catalog([["Widget", {}]]), () => true).problems[0])
            .toMatch(/Widget declares providers \[search\].*#31/);
    });
});

describe("buildDescriptors — tags", () =>
{
    test("two catalog names mapping to one tag are a problem naming both", () =>
    {
        const r = buildDescriptors([entry("AB", "ab"), entry("Ab", "ab2")], catalog([["AB", {}], ["Ab", {}]]), () => true);

        expect(r.problems).toHaveLength(1);
        expect(r.problems[0]).toMatch(/outcrop-ab/);
        expect(r.problems[0]).toMatch(/"AB"/);
        expect(r.problems[0]).toMatch(/"Ab"/);
    });
});

describe("buildDescriptors — fields", () =>
{
    const sticky = {
        manifest: manifest({ name: "stickynote", factory: "createStickyNote", accepts: [{ name: "text" }],
            stateKeys: ["text", "color"], emits: [{ name: "change", legacyOption: "onChange" }] }),
        surface: surface({ name: "stickynote", dataProps: ["text", "value", "color", "due"], twoWayValue: true,
            events: [{ channel: "change", option: "onChange", actionProp: "onChange", payload: "value", multi: false, payloadInValue: true }] }),
    };
    const picker = {
        manifest: manifest({ name: "orientationpicker", factory: "createOrientationPicker", factoryStyle: "options-only",
            containerOption: "container", conformance: "field" }),
        surface: surface({ name: "orientationpicker", dataProps: ["value"], twoWayValue: true }),
    };
    const cat = catalog([["StickyNote", { text: { type: "string" }, due: { type: "string", format: "date-time" } }],
        ["OrientationPicker", { value: { type: "string" } }]]);
    const css = (rel: string) => rel.startsWith("components/stickynote/");
    const [s, p] = buildDescriptors([sticky, picker], cat, css).descriptors;

    test("a surface component: defaults, assets with css, events, no changeOption, dates", () =>
    {
        expect(s).toEqual({
            name: "StickyNote", tagName: "outcrop-sticky-note", factory: "createStickyNote",
            factoryStyle: "container-first", mountMethod: "auto", conformance: "surface",
            assets: { js: "components/stickynote/stickynote.js", css: "components/stickynote/stickynote.css" },
            props: { text: { route: "slot", slot: "text" }, value: { route: "value" },
                color: { route: "state", key: "color" }, due: { route: "create" } },
            twoWay: true,
            events: [{ channel: "change", option: "onChange", actionProp: "onChange", payloadInValue: true }],
            dates: ["due"],
        });
    });

    test("a field component: options-only container, no css, changeOption onChange", () =>
    {
        expect(p).toMatchObject({ name: "OrientationPicker", factoryStyle: "options-only", containerOption: "container",
            assets: { js: "components/orientationpicker/orientationpicker.js" }, twoWay: true, changeOption: "onChange",
            events: [], dates: [] });
        expect(p.assets).not.toHaveProperty("css");
    });

    test("a clean fleet has no problems", () =>
    {
        expect(buildDescriptors([sticky, picker], cat, css).problems).toEqual([]);
    });

    test("a declared change mapping is carried; an undeclared one adds no key (ADR-222)", () =>
    {
        const mapped = { ...picker, surface: { ...picker.surface, change: { valueFrom: "hex" } } };
        const [d] = buildDescriptors([mapped], cat, css).descriptors;

        expect(d.change).toEqual({ valueFrom: "hex" });
        expect(p).not.toHaveProperty("change");
    });
});
