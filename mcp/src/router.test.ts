/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: McpViewRouter. Which route an action takes (spec §5.2), and
 *    what the action becomes for a tool and for the model.
 */

import { describe, expect, test } from "vitest";

import { messageText, resolveRoute, toolArguments } from "./router";

const action = { name: "approve", surfaceId: "deal", sourceComponentId: "ok", timestamp: "2026-11-05T00:00:00Z",
    context: { id: 7 } };

describe("resolveRoute", () =>
{
    test("a route by name wins over the default", () =>
    {
        expect(resolveRoute({ default: { tool: "crm" }, byName: { approve: "message" } }, "approve")).toBe("message");
    });

    test("the default takes every other name", () =>
    {
        expect(resolveRoute({ default: { tool: "crm" }, byName: { explain: "message" } }, "approve"))
            .toEqual({ tool: "crm" });
    });

    test("no route is OUTCROP_MCP_NO_ROUTE naming the action", () =>
    {
        expect(() => resolveRoute({ byName: { explain: "message" } }, "approve"))
            .toThrow(expect.objectContaining({ code: "OUTCROP_MCP_NO_ROUTE",
                message: "No route for action \"approve\": the tool result's routes have no byName.approve and no default (spec §5.2)." }));
        expect(() => resolveRoute(undefined, "approve")).toThrow(expect.objectContaining({ code: "OUTCROP_MCP_NO_ROUTE" }));
    });
});

describe("what an action becomes", () =>
{
    test("a tool route's arguments carry the surface and the A2UI action message", () =>
    {
        expect(toolArguments(action)).toEqual({ outcrop: { version: 1, surfaceId: "deal",
            action: { version: "v0.9.1", action } } });
    });

    test("a message route's text is one descriptive line, then the action as JSON", () =>
    {
        expect(messageText(action)).toBe("The user chose \"approve\" on \"ok\" in surface \"deal\".\n"
            + JSON.stringify({ version: "v0.9.1", action }));
    });
});
