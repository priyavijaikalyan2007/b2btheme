/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiNormalise. A typia 3.1 unit becomes a standalone JSON
 *    Schema 2020-12 document (spec §4).
 *
 * The input is typia 12.2.1's real output shape, observed 2026-10-25.
 */

import { describe, expect, test } from "vitest";

import { DRAFT_2020_12, mapRefs, normaliseTypiaUnit } from "./normalise.mjs";

const UNIT = {
    version: "3.1",
    components: { schemas: {
        Opts: { type: "object", properties: {
            pageSize: { type: "number", description: "Rows per page." },
            columns: { type: "array", items: { $ref: "#/components/schemas/Col" } },
        }, required: ["columns"] },
        Col: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    } },
    schema: { $ref: "#/components/schemas/Opts" },
};

describe("normaliseTypiaUnit", () =>
{
    test("declares draft 2020-12", () => { expect(normaliseTypiaUnit(UNIT).$schema).toBe(DRAFT_2020_12); });
    test("inlines the root", () =>
    {
        expect(Object.keys(normaliseTypiaUnit(UNIT).properties)).toEqual(["pageSize", "columns"]);
    });
    test("rewrites refs to $defs", () =>
    {
        expect(normaliseTypiaUnit(UNIT).properties.columns.items.$ref).toBe("#/$defs/Col");
    });
    test("drops an unreferenced root definition", () =>
    {
        expect(Object.keys(normaliseTypiaUnit(UNIT).$defs)).toEqual(["Col"]);
    });
    test("closes open objects", () =>
    {
        expect(normaliseTypiaUnit(UNIT).additionalProperties).toBe(false);
    });
    test("closes nested definitions", () =>
    {
        expect(normaliseTypiaUnit(UNIT).$defs.Col.additionalProperties).toBe(false);
    });
    test("keeps a self-referenced root definition", () =>
    {
        const tree = { version: "3.1", schema: { $ref: "#/components/schemas/T" }, components: { schemas: {
            T: { type: "object", properties: { kids: { type: "array", items: { $ref: "#/components/schemas/T" } } } },
        } } };
        expect(Object.keys(normaliseTypiaUnit(tree).$defs)).toEqual(["T"]);
    });
    test("refuses a shape it does not recognise", () =>
    {
        expect(() => normaliseTypiaUnit({ version: "3.0" })).toThrow(/typia output shape changed/);
    });
    test("mapRefs rewrites every $ref", () =>
    {
        expect(mapRefs({ a: [{ $ref: "x" }] }, () => "y")).toEqual({ a: [{ $ref: "y" }] });
    });

    test("sorts a union of consts into a stable order, whatever order TypeScript gave", () =>
    {
        const unit = { version: "3.1", components: { schemas: {} }, schema: { type: "object",
            properties: { layout: { oneOf: [{ const: "row" }, { const: "grid" }, { const: 2 }, { const: 10 }] } } } };

        expect(normaliseTypiaUnit(unit).properties.layout.oneOf)
            .toEqual([{ const: 2 }, { const: 10 }, { const: "grid" }, { const: "row" }]);
    });

    test("leaves a union that is not all consts in its order", () =>
    {
        const unit = { version: "3.1", components: { schemas: {} }, schema: { type: "object",
            properties: { v: { oneOf: [{ type: "string" }, { const: "a" }] } } } };

        expect(normaliseTypiaUnit(unit).properties.v.oneOf).toEqual([{ type: "string" }, { const: "a" }]);
    });
});
