/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: cef0dae5-6ce8-4734-94fc-49b929ab349d
 * Created: 2026-11-05
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ExampleServer
 * 📜 PURPOSE: An MCP server that shows Outcrop components in an MCP Apps
 *    host (#19 M3). It serves the renderer page as its ui:// resource,
 *    links show_deal to it, and lets the view call deal_action. The
 *    integration guide shows this file; CI tests it.
 * 🔗 RELATES: [[ExampleDeals]], [[McpView]], docs/MCP_APPS_INTEGRATION_GUIDE.md
 * ⚡ FLOW: [main.ts] -> [loadRenderer] -> [createServer] -> [stdio]
 * ----------------------------------------------------------------------------
 */

import { RESOURCE_MIME_TYPE, registerAppResource, registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";

import { dealAction, showDeal } from "./deals";

const CDN = "https://static.outcrop.us/mcp";

/** The ui:// URI the tools link to. Any URI under your server's name works. */
export const RENDERER_URI = "ui://outcrop-example/renderer";

/** The renderer page and its _meta.ui (CSP), both from the CDN. */
export interface Renderer
{
    html: string;
    meta: Record<string, unknown>;
}

/** Fetches the renderer once, at startup. A CDN error stops the server. */
export async function loadRenderer(): Promise<Renderer>
{
    const get = async (file: string): Promise<Response> =>
    {
        const response = await fetch(`${CDN}/${file}`);

        if (!response.ok) { throw new Error(`${CDN}/${file} answered ${response.status}`); }

        return response;
    };

    const [html, meta] = await Promise.all([get("renderer.html"), get("renderer.meta.json")]);

    return { html: await html.text(), meta: await meta.json() as Record<string, unknown> };
}

/** The view's tool arguments for a routed action (spec §5.2). */
const outcropArgs = z.object({
    outcrop: z.object({
        version: z.literal(1),
        surfaceId: z.string(),
        action: z.object({ version: z.string(),
            action: z.object({ name: z.string(), sourceComponentId: z.string(), context: z.record(z.string(), z.unknown()) }) }),
    }),
});

export function createServer(renderer: Renderer): McpServer
{
    const server = new McpServer({ name: "outcrop-example", version: "1.0.0" });

    registerAppResource(server, "Outcrop renderer", RENDERER_URI, { _meta: { ui: renderer.meta } },
        async () => ({ contents: [{ uri: RENDERER_URI, mimeType: RESOURCE_MIME_TYPE, text: renderer.html,
            _meta: { ui: renderer.meta } }] }));

    registerAppTool(server, "show_deal", {
        description: "Show deal 7 for approval, with its documents.",
        _meta: { ui: { resourceUri: RENDERER_URI } },
    }, async () => showDeal());

    // Called by the view, not the model: approvals and folder loads.
    registerAppTool(server, "deal_action", {
        description: "Apply an action from the deal view.",
        inputSchema: outcropArgs,
        _meta: { ui: { resourceUri: RENDERER_URI, visibility: ["app"] } },
    }, async (args) => dealAction(args));

    return server;
}
