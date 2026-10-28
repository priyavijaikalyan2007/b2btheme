/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiClassifier. Every factory option is data, function,
 *    element or too-broad, decided by the TypeScript checker (spec §3).
 *
 * The fixtures under ./fixtures are a synthetic widget and panel, so each
 * classifier branch is pinned without depending on a real component.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import {
    MEMBER_CLASS, classifyMembers, createClassifier, factoryOptionsType, optionsParameterIndex,
} from "./classify.mjs";

const FIXTURES = path.join(__dirname, "fixtures");

type ValueFit = { param: string; direct: boolean; withoutNull: boolean; fromProperty: string[];
    setValueAcceptsNull: boolean };
type Member = { name: string; cls: string; arity: number | null; mixedArms: string[];
    hazards: { path: string; cls: string }[]; jsdoc: string; valueFit?: ValueFit };

let widget: Map<string, Member>;
let panel: Map<string, Member>;
let swatch: Map<string, Member>;
let clearable: Map<string, Member>;

beforeAll(() =>
{
    const cache = fs.mkdtempSync(path.join(os.tmpdir(), "agentui-classify-"));
    const ctx = createClassifier(path.join(FIXTURES, "tsconfig.json"), cache);
    const read = (file: string, factory: string, index: number) =>
    {
        const { type, location, handleType } = factoryOptionsType(ctx, path.join(FIXTURES, file), factory, index);
        return new Map((classifyMembers(ctx, type, location, handleType) as Member[]).map((m) => [m.name, m]));
    };

    widget = read("widget.ts", "createWidget", 1);
    panel = read("panel.ts", "createPanel", 0);
    swatch = read("pickers.ts", "createSwatchPicker", 0);
    clearable = read("pickers.ts", "createClearable", 0);
});

describe("classify — member classes", () =>
{
    test("a number is data", () => { expect(widget.get("pageSize")!.cls).toBe(MEMBER_CLASS.DATA); });
    test("a Date is data", () => { expect(widget.get("value")!.cls).toBe(MEMBER_CLASS.DATA); });
    test("a callback is a function", () => { expect(widget.get("onSelect")!.cls).toBe(MEMBER_CLASS.FUNCTION); });
    test("an HTMLElement is an element", () => { expect(widget.get("container")!.cls).toBe(MEMBER_CLASS.ELEMENT); });
    test("Record<string, unknown> is too broad", () => { expect(widget.get("extra")!.cls).toBe(MEMBER_CLASS.TOO_BROAD); });
    test("an all-method instance is a function", () => { expect(widget.get("slot")!.cls).toBe(MEMBER_CLASS.FUNCTION); });
});

describe("classify — mixed members and hazards", () =>
{
    test("a data|function union is data", () => { expect(widget.get("title")!.cls).toBe(MEMBER_CLASS.DATA); });
    test("its function arm is recorded", () => { expect(widget.get("title")!.mixedArms).toEqual([MEMBER_CLASS.FUNCTION]); });
    test("a nested callback is a hazard at its path", () =>
    {
        expect(widget.get("columns")!.hazards).toEqual([{ path: "columns[].renderer", cls: MEMBER_CLASS.FUNCTION }]);
    });
    test("a Date is not walked into", () => { expect(widget.get("value")!.hazards).toEqual([]); });
});

describe("classify — arity and JSDoc", () =>
{
    test("a one-parameter provider has arity 1", () => { expect(widget.get("onSearch")!.arity).toBe(1); });
    test("a two-parameter provider has arity 2", () => { expect(widget.get("onLookup")!.arity).toBe(2); });
    test("data members carry arity null", () => { expect(widget.get("pageSize")!.arity).toBeNull(); });
    test("JSDoc text is read", () => { expect(widget.get("pageSize")!.jsdoc).toBe("Rows per page."); });
    test("a member without JSDoc reads as empty", () => { expect(panel.get("heading")!.jsdoc).toBe(""); });
});

describe("classify — value fit of onChange (ADR-222)", () =>
{
    test("an onChange that passes the value fits directly", () =>
    {
        expect(widget.get("onChange")!.valueFit).toMatchObject({ direct: true, withoutNull: true });
    });
    // Types only: label is a string too, so it fits as well as hex. Which one is
    // the value is the manifest author's declaration, not something to infer.
    test("an item payload fits through every property whose type matches the value", () =>
    {
        expect(swatch.get("onChange")!.valueFit).toMatchObject(
            { direct: false, withoutNull: false, fromProperty: ["hex", "label"], setValueAcceptsNull: false });
        expect(swatch.get("onChange")!.valueFit!.param).toContain("Swatch");
    });
    test("a nullable payload fits without null, and the handle's setValue accepts null", () =>
    {
        expect(clearable.get("onChange")!.valueFit).toEqual({ param: "Date | null", direct: false, withoutNull: true,
            fromProperty: [], setValueAcceptsNull: true });
    });
    test("only onChange carries a value fit", () => { expect(widget.get("onSelect")!.valueFit).toBeUndefined(); });
});

describe("classify — factory resolution", () =>
{
    test("container-first options are parameter 1", () =>
    {
        expect(optionsParameterIndex({ factoryStyle: "container-first" })).toBe(1);
    });
    test("an absent factoryStyle means container-first", () => { expect(optionsParameterIndex({})).toBe(1); });
    test("options-only options are parameter 0", () =>
    {
        expect(optionsParameterIndex({ factoryStyle: "options-only" })).toBe(0);
    });
    test("an unexported factory is a literate error", () =>
    {
        const cache = fs.mkdtempSync(path.join(os.tmpdir(), "agentui-classify-"));
        const ctx = createClassifier(path.join(FIXTURES, "tsconfig.json"), cache);

        expect(() => factoryOptionsType(ctx, path.join(FIXTURES, "widget.ts"), "createNothing", 1))
            .toThrow(/does not export createNothing/);
    });
});
