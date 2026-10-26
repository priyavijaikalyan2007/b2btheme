/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiAdapter / SampleValues. Two distinct valid values for a
 *    catalog literal arm, so the fleet gate (G3) can mount every component and
 *    change every prop. A keyword it does not understand is an error, never a
 *    guess.
 */

import { describe, expect, test } from "vitest";

import { sampleValue } from "./sample-values";

const ROOT = { $defs: { Item: { type: "object", properties: { id: { type: "string" }, n: { type: "number" } },
    required: ["id"], additionalProperties: false } } };

describe("sampleValue", () =>
{
    test.each([
        [{ type: "string" }, "a", "b"],
        [{ type: "number" }, 1, 2],
        [{ type: "integer" }, 1, 2],
        [{ type: "boolean" }, false, true],
        [{ const: "canvas" }, "canvas", "canvas"],
    ])("%j gives its two variants", (schema, v0, v1) =>
    {
        expect(sampleValue(schema, 0, ROOT)).toEqual(v0);
        expect(sampleValue(schema, 1, ROOT)).toEqual(v1);
    });

    test("oneOf uses the first arm, then the second", () =>
    {
        const schema = { oneOf: [{ const: "horizontal" }, { const: "vertical" }] };

        expect(sampleValue(schema, 0, ROOT)).toBe("horizontal");
        expect(sampleValue(schema, 1, ROOT)).toBe("vertical");
    });

    test("a one-armed oneOf varies within its arm", () =>
    {
        expect(sampleValue({ oneOf: [{ type: "string" }] }, 1, ROOT)).toBe("b");
    });

    test("an object gets its required properties only; a $ref resolves against the root", () =>
    {
        expect(sampleValue({ $ref: "#/$defs/Item" }, 0, ROOT)).toEqual({ id: "a" });
        expect(sampleValue({ $ref: "#/$defs/Item" }, 1, ROOT)).toEqual({ id: "b" });
    });

    test("an array holds one sampled item", () =>
    {
        expect(sampleValue({ type: "array", items: { $ref: "#/$defs/Item" } }, 1, ROOT)).toEqual([{ id: "b" }]);
    });

    test("descriptions are ignored", () =>
    {
        expect(sampleValue({ type: "string", description: "Label." }, 0, ROOT)).toBe("a");
    });

    test("an unsupported keyword is a literate error naming it and the pointer", () =>
    {
        expect(() => sampleValue({ type: "string", pattern: "^#" }, 0, ROOT, "#/x"))
            .toThrow(/unsupported keyword "pattern" at #\/x.*extend a2ui\/sample-values\.ts/);
    });

    test("an unresolvable $ref is a literate error", () =>
    {
        expect(() => sampleValue({ $ref: "#/$defs/Nope" }, 0, ROOT)).toThrow(/cannot resolve \$ref #\/\$defs\/Nope/);
    });
});
