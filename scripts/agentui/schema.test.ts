/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiSchemaEmitter. typia 12.2.1 emits JSON Schema for the
 *    approved data members of the fixture widget (spec §4).
 */

import path from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import { emitSchemas, entrySource } from "./schema.mjs";
import { normaliseTypiaUnit } from "./normalise.mjs";

const FIXTURES = path.join(__dirname, "fixtures");
const CACHE = path.join(__dirname, "..", "..", "node_modules", ".cache", "agentui-test");
const ENTRY = {
    id: "widget", alias: "AgentUiWidget", file: path.join(FIXTURES, "widget.ts"), factory: "createWidget",
    paramIndex: 1, pick: ["pageSize", "columns", "value", "title"],
    providers: [{ option: "onSearch", params: "searchQuery", response: "searchResults" }],
};

let schema: Record<string, any>;

beforeAll(() =>
{
    const result: any = emitSchemas([ENTRY], { tsconfigPath: path.join(FIXTURES, "tsconfig.json"), cacheDir: CACHE })
        .get("widget");
    schema = normaliseTypiaUnit(result.unit);
}, 60_000);

describe("emitSchemas — typia 12.2.1 on the fixture widget", () =>
{
    test("emits exactly the picked members and provider props", () =>
    {
        expect(Object.keys(schema.properties).sort())
            .toEqual(["columns", "pageSize", "searchQuery", "searchResults", "title", "value"]);
    });
    test("drops the declared nested callback", () =>
    {
        const col = schema.$defs[schema.properties.columns.items.$ref.slice("#/$defs/".length)];
        expect(Object.keys(col.properties)).toEqual(["id"]);
    });
    test("narrows the mixed member to its data arm", () => { expect(schema.properties.title.type).toBe("string"); });
    test("emits Date as a date-time string", () => { expect(schema.properties.value.format).toBe("date-time"); });
    test("carries JSDoc written on its own line", () =>
    {
        expect(schema.properties.pageSize.description).toBe("Rows per page.");
    });
    test("derives provider params from the parameter", () => { expect(schema.properties.searchQuery.type).toBe("string"); });
    test("derives provider response from the awaited return", () =>
    {
        expect(schema.properties.searchResults.type).toBe("array");
    });
});

describe("entrySource", () =>
{
    test("imports the factory as a type, never by interface name", () =>
    {
        expect(entrySource(ENTRY, CACHE)).toContain("import type { createWidget } from");
    });
    test("an empty pick picks never", () =>
    {
        expect(entrySource({ ...ENTRY, pick: [], providers: [] }, CACHE)).toContain("Pick<Options, never>");
    });
});
