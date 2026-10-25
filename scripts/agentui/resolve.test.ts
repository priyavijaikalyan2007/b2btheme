/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiResolver. Every classified option is checked against the
 *    manifest to produce the protocol surface (spec §3.2-3.3). Violations are
 *    literate — they name the manifest file to edit.
 */

import { describe, expect, test } from "vitest";

import { MIN_REASON_LENGTH, VIOLATION, pascal, resolveSurface } from "./resolve.mjs";

type M = Record<string, unknown>;

function member(name: string, cls: string, over: M = {}): M
{
    return { name, cls, optional: true, arity: cls === "function" ? 1 : null,
        mixedArms: [], hazards: [], jsdoc: `${name} docs.`, ...over };
}

function manifest(over: M = {}): M
{
    return { name: "widget", factory: "createWidget", emits: [], accepts: [], actions: [],
        conformance: "surface", ...over };
}

const REASON = "Needs a DOM node, which JSON cannot carry.";

function codes(m: M, members: M[]): string[]
{
    return resolveSurface(m, members).violations.map((v: { code: string }) => v.code);
}

describe("resolve — classes", () =>
{
    test("a documented data member is a data prop", () =>
    {
        expect(resolveSurface(manifest(), [member("pageSize", "data")]).dataProps.map((d: M) => d.name))
            .toEqual(["pageSize"]);
    });
    test("an undeclared function is unclassified", () =>
    {
        expect(codes(manifest(), [member("onX", "function")])).toEqual([VIOLATION.UNCLASSIFIED]);
    });
    test("a legacyOption callback is an event", () =>
    {
        const m = manifest({ emits: [{ name: "selection", payload: "collection", multi: true, legacyOption: "onSelect" }] });
        expect(codes(m, [member("onSelect", "function")])).toEqual([]);
    });
    test("a data member named as legacyOption fails", () =>
    {
        const m = manifest({ emits: [{ name: "selection", payload: "collection", legacyOption: "onSelect" }] });
        expect(codes(m, [member("onSelect", "data")])).toEqual([VIOLATION.DOUBLE_CLASSIFIED]);
    });
    test("an element member named as legacyOption fails", () =>
    {
        const m = manifest({ emits: [{ name: "selection", payload: "collection", legacyOption: "onSelect" }] });
        expect(codes(m, [member("onSelect", "element")])).toEqual([VIOLATION.DOUBLE_CLASSIFIED]);
    });
    test("an event gets a bind prop and an action prop", () =>
    {
        const m = manifest({ emits: [{ name: "selection", payload: "collection", multi: true, legacyOption: "onSelect" }] });
        expect(resolveSurface(m, [member("onSelect", "function")]).events[0])
            .toMatchObject({ bindProp: "selection", actionProp: "onSelection" });
    });
    test("bindAs renames the bind prop", () =>
    {
        const m = manifest({ emits: [{ name: "selection", payload: "collection", multi: true }],
            protocol: { bindAs: { selection: "selectedRows" } } });
        expect(resolveSurface(m, []).events[0].bindProp).toBe("selectedRows");
    });
    test("onChange beside value is the two-way write-back", () =>
    {
        expect(resolveSurface(manifest(), [member("value", "data"), member("onChange", "function")]).twoWayValue)
            .toBe(true);
    });
    test("an element declared host-only is excluded", () =>
    {
        const m = manifest({ protocol: { hostOnly: { container: REASON } } });
        expect(resolveSurface(m, [member("container", "element")]).dataProps).toEqual([]);
    });
    test("the options-only container key is implicitly host-only", () =>
    {
        const m = manifest({ factoryStyle: "options-only" });
        expect(codes(m, [member("container", "element")])).toEqual([]);
    });
    test("a too-broad member with a schema override is data", () =>
    {
        const m = manifest({ protocol: { schemas: { extra: { type: "object" } } } });
        expect(resolveSurface(m, [member("extra", "too-broad")]).dataProps.map((d: M) => d.name)).toEqual(["extra"]);
    });
    test("a too-broad member without an override fails", () =>
    {
        expect(codes(manifest(), [member("extra", "too-broad")])).toEqual([VIOLATION.TOO_BROAD]);
    });
});

describe("resolve — mixed members and hazards", () =>
{
    test("an undeclared mixed member fails", () =>
    {
        expect(codes(manifest(), [member("title", "data", { mixedArms: ["function"] })]))
            .toEqual([VIOLATION.UNDECLARED_MIXED]);
    });
    test("a declared mixed member stays data", () =>
    {
        const m = manifest({ protocol: { hostOnly: { title: REASON } } });
        expect(resolveSurface(m, [member("title", "data", { mixedArms: ["function"] })]).dataProps.length).toBe(1);
    });
    test("an undeclared hazard fails", () =>
    {
        const c = member("columns", "data", { hazards: [{ path: "columns[].renderer", cls: "function" }] });
        expect(codes(manifest(), [c])).toEqual([VIOLATION.UNDECLARED_HAZARD]);
    });
    test("a parent path covers the hazards below it", () =>
    {
        const c = member("columns", "data", { hazards: [{ path: "columns[].renderer", cls: "function" }] });
        const m = manifest({ protocol: { hostOnly: { "columns[]": REASON } } });
        expect(codes(m, [c])).toEqual([]);
    });
});

describe("resolve — declarations", () =>
{
    test("a stale hostOnly key fails", () =>
    {
        expect(codes(manifest({ protocol: { hostOnly: { gone: REASON } } }), [])).toEqual([VIOLATION.STALE_DECLARATION]);
    });
    test("a short reason fails", () =>
    {
        const m = manifest({ protocol: { hostOnly: { container: "n/a" } } });
        expect(codes(m, [member("container", "element")])).toEqual([VIOLATION.SHORT_REASON]);
    });
    test("the reason floor is 20 characters", () => { expect(MIN_REASON_LENGTH).toBe(20); });
    test("an event option also declared host-only is double-classified", () =>
    {
        const m = manifest({ emits: [{ name: "selection", payload: "record", multi: false, legacyOption: "onSelect" }],
            protocol: { hostOnly: { onSelect: REASON } } });
        expect(codes(m, [member("onSelect", "function")])).toEqual([VIOLATION.DOUBLE_CLASSIFIED]);
    });
    test("a stale bindAs key fails", () =>
    {
        expect(codes(manifest({ protocol: { bindAs: { nope: "x" } } }), [])).toEqual([VIOLATION.STALE_DECLARATION]);
    });
    test("a data member without JSDoc fails", () =>
    {
        expect(codes(manifest(), [member("label", "data", { jsdoc: "" })])).toEqual([VIOLATION.MISSING_JSDOC]);
    });
    test("a two-way value (value beside the ADR-134 onChange) on a display component fails", () =>
    {
        expect(codes(manifest({ conformance: "display" }), [member("value", "data"), member("onChange", "function")]))
            .toEqual([VIOLATION.VALUE_BELOW_FIELD]);
    });
    test("a read-only value with no onChange write-back is ordinary data at display", () =>
    {
        expect(codes(manifest({ conformance: "display" }), [member("value", "data")])).toEqual([]);
    });
});

describe("resolve — providers", () =>
{
    const spec = { onSearch: { request: "search", params: "searchQuery", response: "searchResults" } };

    test("a one-parameter provider resolves", () =>
    {
        expect(resolveSurface(manifest({ protocol: { providers: spec } }), [member("onSearch", "function")]).providers[0])
            .toMatchObject({ actionProp: "onSearch", params: "searchQuery", response: "searchResults" });
    });
    test("a two-parameter provider fails", () =>
    {
        expect(codes(manifest({ protocol: { providers: spec } }), [member("onSearch", "function", { arity: 2 })]))
            .toEqual([VIOLATION.PROVIDER_ARITY]);
    });
    test("pascal capitalises each word", () => { expect(pascal("row-activate")).toBe("RowActivate"); });
});

describe("resolve — messages", () =>
{
    test("a violation names the manifest file to edit", () =>
    {
        const [v] = resolveSurface(manifest(), [member("onX", "function")]).violations;
        expect(v.message).toContain("components/widget/widget.manifest.ts");
    });
});

describe("resolve — multiple claims", () =>
{
    test("an event and a provider claim the same function", () =>
    {
        const m = manifest({
            emits: [{ name: "selection", payload: "collection", legacyOption: "onSelect" }],
            protocol: { providers: { onSelect: { request: "search", params: "q", response: "results" } } }
        });
        expect(codes(m, [member("onSelect", "function")])).toEqual([VIOLATION.DOUBLE_CLASSIFIED]);
    });
    test("two channels share the same legacyOption", () =>
    {
        const m = manifest({
            emits: [
                { name: "selection", payload: "collection", legacyOption: "onSelect" },
                { name: "activate", payload: "record", legacyOption: "onSelect" }
            ]
        });
        expect(codes(m, [member("onSelect", "function")])).toEqual([VIOLATION.DOUBLE_CLASSIFIED]);
    });
    test("onChange as a channel's legacyOption beside value is one callback in two roles, not a double claim", () =>
    {
        const m = manifest({
            emits: [{ name: "selection", payload: "collection", legacyOption: "onChange" }]
        });
        const surface = resolveSurface(m, [member("value", "data"), member("onChange", "function")]);

        expect(surface.violations).toEqual([]);
        expect(surface.twoWayValue).toBe(true);
        expect(surface.events.map((e: M) => e.actionProp)).toEqual(["onSelection"]);
    });
});
