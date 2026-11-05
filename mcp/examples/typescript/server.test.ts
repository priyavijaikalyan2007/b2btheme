/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * @vitest-environment node
 *
 * ⚓ TESTS: the example MCP server (#19 M3), the file the integration guide
 *    shows. A real Client over InMemoryTransport: the ui:// resource carries
 *    the renderer bytes and _meta.ui it was given, show_deal links to it,
 *    and every result the view would receive passes the view's own parser.
 */

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, test, vi } from "vitest";

import { parseResult } from "../../src/result";
import { createServer, loadRenderer, RENDERER_URI } from "./server";

const RENDERER = { html: "<!doctype html><title>renderer</title>",
    meta: { csp: { resourceDomains: ["https://static.outcrop.us"] } } };

async function connect(): Promise<Client>
{
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "1.0.0" });

    await createServer(RENDERER).connect(serverSide);
    await client.connect(clientSide);

    return client;
}

/** The arguments the view sends for an action (router.toolArguments). */
function actionArgs(name: string, context: Record<string, unknown>): Record<string, unknown>
{
    return { outcrop: { version: 1, surfaceId: "deal", action: { version: "v0.9.1", action: {
        name, surfaceId: "deal", sourceComponentId: name, timestamp: "2026-11-05T00:00:00Z", context } } } };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("example server", () =>
{
    test("the ui:// resource is the renderer page with its _meta.ui", async () =>
    {
        const client = await connect();
        const read = await client.readResource({ uri: RENDERER_URI });
        const [content] = read.contents as Array<{ uri: string; mimeType: string; text: string; _meta: unknown }>;

        expect(content).toEqual({ uri: RENDERER_URI, mimeType: "text/html;profile=mcp-app", text: RENDERER.html,
            _meta: { ui: RENDERER.meta } });
    });

    test("show_deal links to the renderer; deal_action is for the view only", async () =>
    {
        const { tools } = await (await connect()).listTools();
        const meta = Object.fromEntries(tools.map((t) => [t.name, t._meta?.ui]));

        expect(meta).toEqual({ show_deal: { resourceUri: RENDERER_URI },
            deal_action: { resourceUri: RENDERER_URI, visibility: ["app"] } });
    });

    test("show_deal returns a surface the view accepts, routing explain to the model", async () =>
    {
        const result = await (await connect()).callTool({ name: "show_deal" });
        const parsed = parseResult(result);

        expect(parsed.surfaceIds).toEqual(["deal"]);
        expect(parsed.routes).toEqual({ default: { tool: "deal_action" }, byName: { explain: "message" } });
        expect((result.content as Array<{ text: string }>)[0].text).toMatch(/awaiting approval/);
    });

    test("approve updates the status line", async () =>
    {
        const result = await (await connect()).callTool({ name: "deal_action", arguments: actionArgs("approve", { deal: 7 }) });

        expect(JSON.stringify(parseResult(result).messages)).toContain("Deal 7: approved");
    });

    test("load answers the provider request at its result path", async () =>
    {
        const result = await (await connect()).callTool({ name: "deal_action",
            arguments: actionArgs("load", { node: { id: "contracts" } }) });
        const [message] = parseResult(result).messages as Array<{ updateDataModel: { path: string; value: unknown[] } }>;

        expect(message.updateDataModel.path).toBe("/answers/children");
        expect(message.updateDataModel.value).toHaveLength(2);
    });

    test("an action it does not handle is a tool error naming the action", async () =>
    {
        const result = await (await connect()).callTool({ name: "deal_action", arguments: actionArgs("archive", {}) });

        expect(result.isError).toBe(true);
        expect(JSON.stringify(result.content)).toContain("archive");
    });

    test("loadRenderer fails on a CDN error instead of serving something else", async () =>
    {
        vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));

        await expect(loadRenderer()).rejects.toThrow(/renderer\.html.*404/);
    });
});
