/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 982edff5-189b-440e-a0f9-bafba0c8e27c
 * Created: 2026-11-05
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: McpViewResult
 * 📜 PURPOSE: Reads a tool result's structuredContent.outcrop (spec §5.1):
 *    the A2UI messages, the routes, and the surfaces the messages touch.
 *    It checks the envelope only; web_core checks each A2UI message.
 * 🔗 RELATES: [[McpView]], [[McpViewRouter]]
 * ⚡ FLOW: [CallToolResult] -> [parseResult] -> [messages, routes, surfaceIds]
 * ----------------------------------------------------------------------------
 */

import { McpViewError } from "./errors";

/** A route: a server tool, or the conversation (spec §5.2). */
export type Route = "message" | { tool: string };

export interface Routes
{
    default?: Route;
    byName?: Record<string, Route>;
}

export interface OutcropResult
{
    messages: unknown[];
    routes: Routes | undefined;
    /** The surfaces the messages name, once each, in first-seen order. */
    surfaceIds: string[];
}

/** The parts of an MCP CallToolResult the view reads. */
export interface ToolResultLike
{
    content?: unknown[];
    structuredContent?: unknown;
    isError?: boolean;
}

/** The only payload version this view reads. */
export const OUTCROP_VERSION = 1;

/**
 * Reads a tool result.
 *
 * @throws McpViewError OUTCROP_MCP_TOOL_ERROR for an isError result, with the tool's text;
 *         OUTCROP_MCP_BAD_RESULT for a missing or malformed payload.
 */
export function parseResult(result: ToolResultLike): OutcropResult
{
    if (result.isError === true) { throw new McpViewError("OUTCROP_MCP_TOOL_ERROR", toolText(result)); }

    const outcrop = (result.structuredContent as { outcrop?: unknown } | undefined)?.outcrop;

    if (!isRecord(outcrop))
    {
        throw bad("The tool result has no structuredContent.outcrop object (spec §5.1).");
    }

    if (outcrop.version !== OUTCROP_VERSION)
    {
        throw bad(`structuredContent.outcrop.version is ${JSON.stringify(outcrop.version)}; `
            + `this view reads version ${OUTCROP_VERSION}.`);
    }

    if (!Array.isArray(outcrop.messages)) { throw bad("structuredContent.outcrop.messages must be an array."); }

    return { messages: outcrop.messages, routes: checkRoutes(outcrop.routes), surfaceIds: surfaceIds(outcrop.messages) };
}

/** The routes, checked; undefined when the result has none. */
function checkRoutes(routes: unknown): Routes | undefined
{
    if (routes === undefined) { return undefined; }

    if (!isRecord(routes)) { throw bad("routes must be an object with default and/or byName (spec §5.2)."); }

    if (routes.default !== undefined) { checkRoute(routes.default, "routes.default"); }

    if (routes.byName !== undefined)
    {
        if (!isRecord(routes.byName)) { throw bad("routes.byName must be an object of action name to route."); }

        for (const [name, route] of Object.entries(routes.byName)) { checkRoute(route, `routes.byName.${name}`); }
    }

    return routes as Routes;
}

/** Throws unless `route` is "message" or { tool: "<name>" }. */
function checkRoute(route: unknown, path: string): void
{
    const ok = route === "message"
        || (isRecord(route) && typeof route.tool === "string" && route.tool !== "");

    if (!ok)
    {
        throw bad(`${path} is ${JSON.stringify(route)}; a route is "message" or { "tool": "<tool name>" }.`);
    }
}

/** The surfaceId of each message's one operation, once each. */
function surfaceIds(messages: unknown[]): string[]
{
    const ids = new Set<string>();

    for (const message of messages)
    {
        if (!isRecord(message)) { continue; }

        for (const value of Object.values(message))
        {
            if (isRecord(value) && typeof value.surfaceId === "string") { ids.add(value.surfaceId); }
        }
    }

    return [...ids];
}

/** A tool result's text blocks, one per line. */
function toolText(result: ToolResultLike): string
{
    return (result.content ?? [])
        .filter((b): b is { type: "text"; text: string } => isRecord(b) && b.type === "text" && typeof b.text === "string")
        .map((b) => b.text)
        .join("\n");
}

function bad(message: string): McpViewError
{
    return new McpViewError("OUTCROP_MCP_BAD_RESULT", message);
}

function isRecord(value: unknown): value is Record<string, unknown>
{
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
