/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 616f7206-f0a8-4fb7-a57a-c2beafe3feae
 * Created: 2026-11-05
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: McpViewRouter
 * 📜 PURPOSE: Picks an action's route from the server's routes (spec §5.2,
 *    decision M4) and shapes the action for a tool or for the model.
 * 🔗 RELATES: [[McpView]], [[McpViewResult]]
 * ⚡ FLOW: [A2UI action] -> [resolveRoute] -> [toolArguments | messageText]
 * ----------------------------------------------------------------------------
 */

import type { ActionPayload } from "@a2ui/web_core/v0_9";

import { McpViewError } from "./errors";
import { OUTCROP_VERSION } from "./result";
import type { Route, Routes } from "./result";

/** The A2UI protocol version of the action messages the view sends. */
const A2UI_VERSION = "v0.9.1";

/**
 * The route for an action: byName first, then the default.
 *
 * @throws McpViewError OUTCROP_MCP_NO_ROUTE when neither names one.
 */
export function resolveRoute(routes: Routes | undefined, name: string): Route
{
    const route = routes?.byName?.[name] ?? routes?.default;

    if (route === undefined)
    {
        throw new McpViewError("OUTCROP_MCP_NO_ROUTE", `No route for action ${JSON.stringify(name)}: `
            + `the tool result's routes have no byName.${name} and no default (spec §5.2).`);
    }

    return route;
}

/** A tool route's arguments: the surface and the A2UI action message. */
export function toolArguments(action: ActionPayload): Record<string, unknown>
{
    return { outcrop: { version: OUTCROP_VERSION, surfaceId: action.surfaceId,
        action: { version: A2UI_VERSION, action } } };
}

/** A message route's user turn: one line the model can read, then the A2UI action message as JSON. */
export function messageText(action: ActionPayload): string
{
    return `The user chose ${JSON.stringify(action.name)} on ${JSON.stringify(action.sourceComponentId)} `
        + `in surface ${JSON.stringify(action.surfaceId)}.\n`
        + JSON.stringify({ version: A2UI_VERSION, action });
}
