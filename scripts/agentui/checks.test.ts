/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiPostChecks. A schema tool's silent drops are caught
 *    before the catalog is written (spec §4).
 */

import { describe, expect, test } from "vitest";

import { defaultOptionsErrors, missingDataMembers, missingDescriptions } from "./checks.mjs";

const SCHEMA = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: { pageSize: { type: "number", description: "Rows." }, columns: { type: "array" } },
    required: ["columns"],
    additionalProperties: false,
};

describe("post-checks", () =>
{
    test("reports a data member the schema lacks", () =>
    {
        expect(missingDataMembers(SCHEMA, ["pageSize", "height"])).toEqual(["height"]);
    });
    test("reports a JSDoc'd member without a description", () =>
    {
        expect(missingDescriptions(SCHEMA, [{ name: "columns", jsdoc: "Columns." }])).toEqual(["columns"]);
    });
    test("ignores a member that had no JSDoc", () =>
    {
        expect(missingDescriptions(SCHEMA, [{ name: "columns", jsdoc: "" }])).toEqual([]);
    });
    test("partial defaults validate (required is not enforced on defaults)", () =>
    {
        expect(defaultOptionsErrors(SCHEMA, { pageSize: 25 })).toEqual([]);
    });
    test("a wrongly typed default is reported", () =>
    {
        expect(defaultOptionsErrors(SCHEMA, { pageSize: "25" }).length).toBe(1);
    });
    test("a default for a non-data key is reported", () =>
    {
        expect(defaultOptionsErrors(SCHEMA, { container: "x" }).length).toBe(1);
    });
});
