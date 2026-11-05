/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: McpViewResult. A tool result's outcrop payload (spec §5.1):
 *    accepted shapes, and the error code each bad shape becomes.
 */

import { describe, expect, test } from "vitest";

import { parseResult } from "./result";

const create = { version: "v0.9", createSurface: { surfaceId: "s1", catalogId: "c" } };
const update = { version: "v0.9", updateComponents: { surfaceId: "s2", components: [] } };

/** The error a call throws, as { code, message }; null when it does not throw. */
function failure(run: () => unknown): { code: string; message: string } | null
{
    try { run(); return null; }
    catch (err) { return { code: (err as { code: string }).code, message: (err as Error).message }; }
}

describe("parseResult", () =>
{
    test("returns the messages, the routes and the surfaces the messages touch, once each", () =>
    {
        const routes = { default: { tool: "crm_action" }, byName: { explain: "message" } };
        const parsed = parseResult({ structuredContent: { outcrop: { version: 1, messages: [create, update, create],
            routes } } });

        expect(parsed).toEqual({ messages: [create, update, create], routes, surfaceIds: ["s1", "s2"] });
    });

    test("routes are optional", () =>
    {
        expect(parseResult({ structuredContent: { outcrop: { version: 1, messages: [] } } }).routes).toBeUndefined();
    });

    test("a missing outcrop payload is OUTCROP_MCP_BAD_RESULT", () =>
    {
        expect(failure(() => parseResult({ content: [] }))).toEqual({ code: "OUTCROP_MCP_BAD_RESULT",
            message: "The tool result has no structuredContent.outcrop object (spec §5.1)." });
    });

    test("an unknown version is OUTCROP_MCP_BAD_RESULT naming the version", () =>
    {
        expect(failure(() => parseResult({ structuredContent: { outcrop: { version: 2, messages: [] } } }))?.message)
            .toBe("structuredContent.outcrop.version is 2; this view reads version 1.");
    });

    test("messages that are not an array are OUTCROP_MCP_BAD_RESULT", () =>
    {
        expect(failure(() => parseResult({ structuredContent: { outcrop: { version: 1, messages: {} } } }))?.code)
            .toBe("OUTCROP_MCP_BAD_RESULT");
    });

    test.each([
        [{ default: "model" }, "routes.default"],
        [{ default: { tool: "" } }, "routes.default"],
        [{ byName: { go: { tool: 3 } } }, "routes.byName.go"],
        [{ byName: [] }, "routes.byName"],
        ["message", "routes"],
    ])("a malformed route %j is OUTCROP_MCP_BAD_RESULT naming %s", (routes, path) =>
    {
        expect(failure(() => parseResult({ structuredContent: { outcrop: { version: 1, messages: [], routes } } })))
            .toEqual({ code: "OUTCROP_MCP_BAD_RESULT", message: expect.stringContaining(`${path} `) });
    });

    test("an isError result is OUTCROP_MCP_TOOL_ERROR carrying the tool's text", () =>
    {
        expect(failure(() => parseResult({ isError: true, content: [{ type: "text", text: "Deal not found" },
            { type: "text", text: "id 7" }] }))).toEqual({ code: "OUTCROP_MCP_TOOL_ERROR", message: "Deal not found\nid 7" });
    });
});
