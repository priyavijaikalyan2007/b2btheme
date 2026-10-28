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

    // Date | string: every date string matches both arms, and oneOf demands
    // exactly one, so web_core rejected every value (SprintPicker.anchorDate, B2).
    test("drops a format arm that a plain arm of the same type already covers, and unwraps one arm", () =>
    {
        const unit = { version: "3.1", components: { schemas: {} }, schema: { type: "object", properties: {
            when: { oneOf: [{ type: "string", format: "date-time" }, { type: "string" }] },
            either: { oneOf: [{ type: "string", format: "date-time" }, { type: "string" }, { type: "number" }] },
            dateOnly: { oneOf: [{ type: "string", format: "date-time" }, { type: "null" }] } } } };
        const props = normaliseTypiaUnit(unit).properties;

        expect(props.when).toEqual({ type: "string" });
        expect(props.either).toEqual({ oneOf: [{ type: "string" }, { type: "number" }] });
        expect(props.dateOnly).toEqual({ oneOf: [{ type: "string", format: "date-time" }, { const: null }] });
    });

    // web_core converts a type it does not know, "null" included, to z.unknown(),
    // which matches everything: oneOf [null, X] then rejected every literal X
    // (PeriodPicker.value, TreeView's TreeNode.children). { const: null } means
    // the same in JSON Schema and web_core reads it as z.literal(null) (B2).
    test("a null type is emitted as { const: null }, keeping its description", () =>
    {
        const unit = { version: "3.1", components: { schemas: {} }, schema: { type: "object", properties: {
            kids: { oneOf: [{ type: "null", description: "Lazy." }, { type: "array", items: { type: "string" } }] } } } };

        expect(normaliseTypiaUnit(unit).properties.kids.oneOf)
            .toEqual([{ const: null, description: "Lazy." }, { type: "array", items: { type: "string" } }]);
    });

    // TypeScript's readonly means "not reassigned", but JSON Schema's readOnly tells an agent the value is
    // owned elsewhere and not its to set. DocViewer's options are readonly (readiness step 2 P1).
    test("the readOnly keyword is dropped, and a property named readOnly is kept", () =>
    {
        const unit = { version: "3.1", components: { schemas: { Page: { type: "object", readOnly: true,
            properties: { id: { type: "string", readOnly: true } } } } }, schema: { type: "object", properties: {
            pages: { type: "array", readOnly: true, items: { $ref: "#/components/schemas/Page" } },
            readOnly: { type: "boolean", description: "Locks the editor." } } } };
        const out = normaliseTypiaUnit(unit);

        expect(JSON.stringify(out)).not.toMatch(/"readOnly":true/);
        expect(out.properties.readOnly).toEqual({ type: "boolean", description: "Locks the editor." });
    });
});

