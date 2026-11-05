/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 333976a5-9c81-4bdd-ab6e-1291a9fc6583
 * Created: 2026-11-05
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: McpView / Errors
 * 📜 PURPOSE: The MCP Apps view's error codes (spec §8). They are public
 *    names: a server developer looks them up in the guides.
 * 🔗 RELATES: [[McpView]], [[McpViewResult]], [[McpViewRouter]]
 * ⚡ FLOW: [result | router | view] -> [McpViewError] -> [shown + logged]
 * ----------------------------------------------------------------------------
 */

/** Every view log line starts with this, in the console and in the host log. */
export const LOG_PREFIX = "[outcrop-mcp]";

export type McpViewCode =
    | "OUTCROP_MCP_BAD_RESULT"
    | "OUTCROP_MCP_NO_ROUTE"
    | "OUTCROP_MCP_TOOL_ERROR"
    | "OUTCROP_MCP_NOT_CONNECTED";

/** An error the view shows and logs, with its public code. */
export class McpViewError extends Error
{
    constructor(readonly code: McpViewCode, message: string)
    {
        super(message);
        this.name = "McpViewError";
    }
}
