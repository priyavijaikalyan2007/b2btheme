/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiAdapter / Values. Pure helpers: reading a binding's path, the
 *    same-component guard the Lit and Angular renderers make necessary, and
 *    the Date <-> ISO 8601 conversion at the data-model boundary.
 */

import { describe, expect, test } from "vitest";

import { bindingPath, datePathsFor, fromWire, isDynamic, sameComponent, sameValue, toWire } from "./values";
import type { ComponentContextLike } from "./types";

describe("bindingPath and isDynamic", () =>
{
    test("a {path} object yields its path and is dynamic", () =>
    {
        expect(bindingPath({ path: "/a" })).toBe("/a");
        expect(isDynamic({ path: "/a" })).toBe(true);
    });

    test("a {call} object is dynamic but has no path", () =>
    {
        expect(bindingPath({ call: "formatString", args: {} })).toBeUndefined();
        expect(isDynamic({ call: "formatString", args: {} })).toBe(true);
    });

    test("literals are not dynamic", () =>
    {
        for (const v of ["s", 1, true, null, undefined, [1], { kind: "canvas" }, { path: 3 }])
        {
            expect(isDynamic(v)).toBe(false);
            expect(bindingPath(v)).toBeUndefined();
        }
    });
});

describe("sameComponent", () =>
{
    const model = {};
    const surface = {};
    const dataModel = {};

    function ctx(over: Record<string, unknown> = {}, dc: Record<string, unknown> = {}): ComponentContextLike
    {
        return { componentModel: model, surfaceComponents: "sc", theme: "t", dispatchAction: async () => undefined,
            dataContext: { surface, dataModel, path: "/", explicitIndex: undefined, parent: undefined, ...dc },
            ...over } as unknown as ComponentContextLike;
    }

    test("a fresh context object for the same component is the same component", () =>
    {
        expect(sameComponent(ctx(), ctx())).toBe(true);
    });

    test("any differing identity field makes it a different component", () =>
    {
        expect(sameComponent(ctx(), ctx({ componentModel: {} }))).toBe(false);
        expect(sameComponent(ctx(), ctx({ theme: "other" }))).toBe(false);
        expect(sameComponent(ctx(), ctx({}, { path: "/items/0" }))).toBe(false);
        expect(sameComponent(ctx(), ctx({}, { explicitIndex: 2 }))).toBe(false);
        expect(sameComponent(ctx(), ctx({}, { dataModel: {} }))).toBe(false);
    });
});

describe("fromWire and toWire", () =>
{
    test("a date prop turns an ISO string into a Date", () =>
    {
        const r = fromWire("2026-10-26T10:00:00.000Z", [""]);

        expect(r.ok).toBe(true);
        expect(r.ok && (r.value as Date).toISOString()).toBe("2026-10-26T10:00:00.000Z");
    });

    test("a date prop rejects a non-date value with a reason", () =>
    {
        expect(fromWire("not a date", [""])).toEqual({ ok: false, reason: 'expected an ISO 8601 date-time string, got "not a date"' });
        expect(fromWire(5, [""])).toEqual({ ok: false, reason: "expected an ISO 8601 date-time string, got 5" });
    });

    test("a non-date prop passes through unchanged", () =>
    {
        const v = { a: 1 };

        expect(fromWire(v, [])).toEqual({ ok: true, value: v });
    });

    test("nested dates revive along their paths: object fields and array items (B2)", () =>
    {
        const wire = { name: "S1", start: "2026-01-05T00:00:00.000Z", days: ["2026-01-06T00:00:00.000Z"] };
        const r = fromWire(wire, [".start", ".days[]"]);

        expect(r.ok).toBe(true);
        const v = (r as { value: { name: string; start: Date; days: Date[] } }).value;
        expect(v.name).toBe("S1");
        expect(v.start).toBeInstanceOf(Date);
        expect(v.days[0]).toBeInstanceOf(Date);
        expect(wire.start).toBe("2026-01-05T00:00:00.000Z");
    });

    test("a bad nested date names where it is; an absent optional field is left alone", () =>
    {
        expect(fromWire({ start: "soon" }, [".start"]))
            .toEqual({ ok: false, reason: 'start: expected an ISO 8601 date-time string, got "soon"' });
        expect(fromWire({ name: "S1" }, [".start"])).toEqual({ ok: true, value: { name: "S1" } });
    });

    test("datePathsFor gives a prop's paths relative to it", () =>
    {
        const dates = ["due", "value.start", "value.days[]", "values", "list[]"];

        expect(datePathsFor(dates, "due")).toEqual([""]);
        expect(datePathsFor(dates, "value")).toEqual([".start", ".days[]"]);
        expect(datePathsFor(dates, "list")).toEqual(["[]"]);
        expect(datePathsFor(dates, "title")).toEqual([]);
    });

    test("toWire turns Dates into ISO strings through arrays and plain objects", () =>
    {
        const d = new Date("2026-10-26T10:00:00.000Z");

        expect(toWire({ when: d, list: [d, 1], nested: { d } })).toEqual(
            { when: d.toISOString(), list: [d.toISOString(), 1], nested: { d: d.toISOString() } });
        expect(toWire("x")).toBe("x");
    });

    test("sameValue compares wire forms", () =>
    {
        expect(sameValue(new Date("2026-10-26T10:00:00.000Z"), "2026-10-26T10:00:00.000Z")).toBe(true);
        expect(sameValue({ a: 1 }, { a: 2 })).toBe(false);
        expect(sameValue(undefined, undefined)).toBe(true);
    });
});
