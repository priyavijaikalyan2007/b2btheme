/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: McpDemoServer
 * 📜 PURPOSE: The demo's MCP server (#19, agentui-unblock §6): one
 *    model-visible tool per domain, each linked to the renderer page, and
 *    one app-only tool, demo_action, that answers the actions the view
 *    routes to it by surface. The guide's example server stays minimal;
 *    this one shows the range.
 * 🔗 RELATES: [[McpDemoServe]], [[McpRendererPage]], [[ExampleServer]]
 * ⚡ FLOW: [tools/call show_*] -> [domain.show] -> [view]
 *          -> [demo_action] -> [domain.act] -> [view]
 */

import { RESOURCE_MIME_TYPE, registerAppResource, registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";

import { rendererHtml } from "../renderer.mjs";
import { toolError } from "./domains/a2ui.mjs";
import * as branding from "./domains/branding.mjs";
import * as health from "./domains/health.mjs";
import * as orders from "./domains/orders.mjs";
import * as scheduling from "./domains/scheduling.mjs";

export const RENDERER_URI = "ui://outcrop-demo/renderer";

/** The runtime the renderer loads, in order (as mcp/build.mjs). */
const RUNTIME = ["mcp-ext-apps", "a2ui-runtime"];
const FONT_ORIGINS = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

/** Each model-visible tool, its description, and the domain behind it. */
export const DOMAINS = [
    { tool: "show_service_health", description: "Show the checkout service's health: status, metrics, charts and deploys.",
        domain: health },
    { tool: "show_orders", description: "Show open orders and warehouse stock.", domain: orders },
    { tool: "plan_meeting", description: "Open a form to plan the design review meeting.", domain: scheduling },
    { tool: "edit_brand", description: "Open the brand editor for the spring campaign.", domain: branding },
];

/**
 * The renderer page and its _meta.ui for a CDN at `origin`: the bytes
 * mcp/build.mjs writes for production, with the local origin in place of
 * https://static.outcrop.us, so the view and every component load from
 * the local dist/.
 *
 * @param {string} origin No trailing slash.
 * @param {{assets: Record<string, {url: string, integrity: string}>}} manifest dist/lib-manifest.json.
 */
export function demoRenderer(origin, manifest)
{
    const libs = RUNTIME.map((name) =>
    {
        const asset = manifest.assets[name];

        if (!asset) { throw new Error(`dist/lib-manifest.json has no ${name}. Run npm run build.`); }

        return { url: asset.url, integrity: asset.integrity };
    });

    return { html: rendererHtml(origin, libs), meta: { csp: { resourceDomains: [origin, ...FONT_ORIGINS] } } };
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

/** Answers a routed action with the domain that owns its surface. */
export function demoAction(args)
{
    const { surfaceId, action } = args.outcrop;
    const owner = DOMAINS.find(({ domain }) => domain.SURFACE === surfaceId);

    if (!owner) { return toolError(`No demo surface ${JSON.stringify(surfaceId)}.`); }

    return owner.domain.act(action.action.name, action.action.context);
}

/**
 * A server for one request: the demo runs Streamable HTTP statelessly.
 *
 * @param {{html: string, meta: Record<string, unknown>}} renderer
 */
export function createDemoServer(renderer)
{
    const server = new McpServer({ name: "outcrop-demo", version: "1.0.0" });

    registerAppResource(server, "Outcrop renderer", RENDERER_URI, { _meta: { ui: renderer.meta } },
        async () => ({ contents: [{ uri: RENDERER_URI, mimeType: RESOURCE_MIME_TYPE, text: renderer.html,
            _meta: { ui: renderer.meta } }] }));

    for (const { tool, description, domain } of DOMAINS)
    {
        registerAppTool(server, tool, { description, _meta: { ui: { resourceUri: RENDERER_URI } } },
            async () => domain.show());
    }

    registerAppTool(server, "demo_action", {
        description: "Apply an action from a demo view.",
        inputSchema: outcropArgs,
        _meta: { ui: { resourceUri: RENDERER_URI, visibility: ["app"] } },
    }, async (args) => demoAction(args));

    return server;
}
