/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: McpView in a browser (#19 M2, spec §10). The real renderer.html
 *    bytes run in a sandboxed srcdoc iframe under the SDK's AppBridge, with
 *    https://static.outcrop.us served from the local dist/, with the CDN's
 *    CORS header. Covers
 *    the lifecycle, theming, both routes, every error code and auto-resize.
 *    The routes run against the example MCP server (M3), the one the
 *    integration guide shows: the page is its ui:// resource, and the
 *    host forwards the view's tool calls to it.
 */

import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { expect, test } from "@playwright/test";
import type { FrameLocator, Page } from "@playwright/test";
import { build } from "esbuild";

import { Client, InMemoryTransport } from "@modelcontextprotocol/client";

import { createServer, RENDERER_URI } from "../mcp/examples/typescript/server";
import type { StartOptions } from "./mcp-host/host";

const CDN = "https://static.outcrop.us";
const HOST = "https://host.test";
const PAGE = "dist/mcp/renderer.html";
const CATALOG = `${CDN}/a2ui/catalog/v1.json`;
const TYPES: Record<string, string> = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
    ".woff2": "font/woff2", ".woff": "font/woff", ".svg": "image/svg+xml", ".png": "image/png" };
const HOST_HTML = "<!doctype html><html><body style=\"margin:0\">"
    + "<iframe id=\"view\" sandbox=\"allow-scripts\" style=\"width:640px;height:80px;border:0\"></iframe>"
    + "<script src=\"/host.js\"></script></body></html>";

let rendererHtml = "";
let hostJs = "";

/** A surface with a line of text and an Approve button whose action is "approve". */
function deal(text: string): unknown[]
{
    return [
        { version: "v0.9.1", createSurface: { surfaceId: "deal", catalogId: CATALOG } },
        { version: "v0.9.1", updateComponents: { surfaceId: "deal", components: [
            { id: "root", component: "Column", children: ["status", "approve"] },
            { id: "status", component: "Text", text },
            { id: "approve", component: "Button", child: "approveLabel",
                action: { event: { name: "approve", context: { id: 7 } } } },
            { id: "approveLabel", component: "Text", text: "Approve" },
        ] } },
    ];
}

/** A tool result carrying A2UI messages (spec §5.1). */
function outcrop(messages: unknown[], routes?: unknown): StartOptions["result"]
{
    return { content: [{ type: "text", text: "A deal awaiting approval." }],
        structuredContent: { outcrop: { version: 1, messages, ...(routes === undefined ? {} : { routes }) } } };
}

async function open(page: Page, opts: Partial<StartOptions>): Promise<FrameLocator>
{
    await page.evaluate((o) => (window as never as { mcpHost: { start(x: unknown): Promise<void> } }).mcpHost.start(o),
        { mode: "bridge", html: rendererHtml, ...opts });

    return page.frameLocator("#view");
}

function record(page: Page): Promise<{ initialized: boolean; initializeSeen: boolean; calls: unknown[];
    messages: Array<{ content: Array<{ text: string }> }>; logs: Array<{ data: { code: string } }>;
    sizes: Array<{ height?: number }> }>
{
    return page.evaluate(() => (window as never as { mcpHost: { record: never } }).mcpHost.record);
}

test.beforeAll(async () =>
{
    if (!existsSync(PAGE)) { throw new Error(`${PAGE} is absent. Run npm run build.`); }

    rendererHtml = readFileSync(PAGE, "utf8");
    hostJs = (await build({ entryPoints: ["tests/mcp-host/host.ts"], bundle: true, format: "iife", write: false,
        platform: "browser", target: "es2022", logLevel: "warning" })).outputFiles[0].text;
});

test.beforeEach(async ({ page }) =>
{
    await page.route(`${HOST}/**`, (route) =>
    {
        const path = new URL(route.request().url()).pathname;

        return path === "/host.js" ? route.fulfill({ body: hostJs, contentType: "text/javascript" })
            : route.fulfill({ body: HOST_HTML, contentType: "text/html" });
    });
    // The CDN, from the local build.
    await page.route(`${CDN}/**`, (route) =>
    {
        const path = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
        const file = join("dist", path);

        if (!existsSync(file)) { return route.fulfill({ status: 404, body: `${file} not built` }); }

        return route.fulfill({ path: file, contentType: TYPES[extname(file)] ?? "application/octet-stream",
            headers: { "access-control-allow-origin": "*" } });
    });
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
    await page.goto(`${HOST}/`);
});

test.describe("MCP Apps view", () =>
{
    test("renders the tool result after initialize, in the host's theme", async ({ page }) =>
    {
        const view = await open(page, { context: { theme: "dark" }, result: outcrop(deal("Awaiting approval")) });

        await expect(view.getByText("Awaiting approval")).toBeVisible();
        await expect(view.locator("html")).toHaveAttribute("data-bs-theme", "dark");
        expect((await record(page)).initialized).toBe(true);
    });

    test("nothing renders before ui/initialize returns", async ({ page }) =>
    {
        const view = await open(page, { mode: "silent", result: outcrop(deal("Too early")) });

        await expect.poll(async () => (await record(page)).initializeSeen).toBe(true);
        // The result was delivered with initialize unanswered; give it time to (wrongly) render.
        await page.waitForTimeout(500);
        await expect(view.locator(".outcrop-mcp-surface")).toHaveCount(0);
        await expect(view.locator("html")).not.toHaveAttribute("data-bs-theme", /./);
    });

    test("host variables override tokens, and a live theme switch applies", async ({ page }) =>
    {
        const view = await open(page, { result: outcrop(deal("Themed")),
            context: { theme: "light", styles: { variables: { "--color-text-primary": "rgb(1, 2, 3)" } as never } } });

        await expect(view.getByText("Themed")).toBeVisible();
        await expect(view.locator("body")).toHaveCSS("color", "rgb(1, 2, 3)");
        await expect(view.locator("html")).toHaveAttribute("data-bs-theme", "light");

        await page.evaluate(() => (window as never as { mcpHost: { setContext(c: unknown): void } }).mcpHost
            .setContext({ theme: "dark", styles: { variables: { "--color-text-primary": "rgb(1, 2, 3)" } } }));

        await expect(view.locator("html")).toHaveAttribute("data-bs-theme", "dark");
        await expect(view.locator("body")).toHaveCSS("color", "rgb(1, 2, 3)");
    });

    test("the view reports its size to the host", async ({ page }) =>
    {
        const view = await open(page, { result: outcrop(deal("Sized")) });

        await expect(view.getByText("Sized")).toBeVisible();
        await expect.poll(async () => (await record(page)).sizes.at(-1)?.height ?? 0).toBeGreaterThan(80);
    });
});

test.describe("MCP Apps view errors (spec §8)", () =>
{
    /** The codes the host log received. */
    async function loggedCodes(page: Page): Promise<string[]>
    {
        return (await record(page)).logs.map((l) => l.data.code);
    }

    test("OUTCROP_MCP_BAD_RESULT: a result without structuredContent.outcrop", async ({ page }) =>
    {
        const view = await open(page, { result: { content: [{ type: "text", text: "plain" }] } });

        await expect(view.locator(".outcrop-mcp-status")).toHaveText(/^OUTCROP_MCP_BAD_RESULT: /);
        await expect.poll(() => loggedCodes(page)).toEqual(["OUTCROP_MCP_BAD_RESULT"]);
    });

    test("OUTCROP_MCP_NO_ROUTE: an action the routes do not cover", async ({ page }) =>
    {
        const view = await open(page, { result: outcrop(deal("No routes")) });

        await view.getByRole("button", { name: "Approve" }).click();

        await expect(view.locator("[data-surface=deal] .outcrop-mcp-surface-error"))
            .toHaveText(/^OUTCROP_MCP_NO_ROUTE: No route for action "approve"/);
        await expect.poll(() => loggedCodes(page)).toEqual(["OUTCROP_MCP_NO_ROUTE"]);
    });

    test("OUTCROP_MCP_TOOL_ERROR: the routed tool returns isError", async ({ page }) =>
    {
        const view = await open(page, { result: outcrop(deal("Locked"), { default: { tool: "crm_action" } }),
            tools: { crm_action: { isError: true, content: [{ type: "text", text: "Deal is locked" }] } } });

        await view.getByRole("button", { name: "Approve" }).click();

        await expect(view.locator("[data-surface=deal] .outcrop-mcp-surface-error"))
            .toHaveText("OUTCROP_MCP_TOOL_ERROR: Deal is locked");
    });

    test("OUTCROP_MCP_TOOL_ERROR: the routed tool call fails", async ({ page }) =>
    {
        const view = await open(page, { result: outcrop(deal("Failing"), { default: { tool: "crm_action" } }),
            tools: { crm_action: "throw" } });

        await view.getByRole("button", { name: "Approve" }).click();

        await expect(view.locator("[data-surface=deal] .outcrop-mcp-surface-error"))
            .toHaveText(/^OUTCROP_MCP_TOOL_ERROR: crm_action: /);
    });

    test("OUTCROP_MCP_MESSAGE_FAILED: the host rejects the message", async ({ page }) =>
    {
        const view = await open(page, { result: outcrop(deal("Refused"), { default: "message" }), messageError: true });

        await view.getByRole("button", { name: "Approve" }).click();

        await expect(view.locator("[data-surface=deal] .outcrop-mcp-surface-error"))
            .toHaveText("OUTCROP_MCP_MESSAGE_FAILED: The host did not accept the message.");
    });

    test("OUTCROP_MCP_NOT_CONNECTED: the host refuses ui/initialize", async ({ page }) =>
    {
        const view = await open(page, { mode: "reject" });

        await expect(view.locator("#outcrop-mcp")).toHaveText("This view couldn't connect to its host.");
    });
});

test.describe("MCP Apps view with the example server", () =>
{
    let client: Client;

    test.beforeEach(async ({ page }) =>
    {
        const meta = JSON.parse(readFileSync("dist/mcp/renderer.meta.json", "utf8")) as Record<string, unknown>;
        const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();

        client = new Client({ name: "outcrop-test-host", version: "1.0.0" });
        await createServer({ html: rendererHtml, meta }).connect(serverSide);
        await client.connect(clientSide);
        await page.exposeFunction("mcpServerCall",
            (name: string, args: Record<string, unknown>) => client.callTool({ name, arguments: args }));
    });

    test.afterEach(async () => { await client.close(); });

    /** As a host does it: the page from the tool's ui:// resource, then the tool's result. */
    async function showDeal(page: Page): Promise<FrameLocator>
    {
        const [resource] = (await client.readResource({ uri: RENDERER_URI })).contents as Array<{ text: string }>;
        const result = await client.callTool({ name: "show_deal" }) as StartOptions["result"];

        return open(page, { html: resource.text, result, delegate: true });
    }

    test("a tool-routed action calls the tool and applies its result; a result without routes keeps them", async ({ page }) =>
    {
        const view = await showDeal(page);

        await view.getByRole("button", { name: "Approve" }).click();

        await expect(view.getByText("Deal 7: approved")).toBeVisible();
        // That result had no routes, so the surface keeps show_deal's: a second click is routed too.
        await view.getByRole("button", { name: "Approve" }).click();
        await expect.poll(async () => (await record(page)).calls.length).toBe(2);
        await expect(view.locator("[data-surface=deal] .outcrop-mcp-surface-error")).toBeHidden();
        expect((await record(page)).calls[0]).toEqual({ name: "deal_action", arguments: { outcrop: { version: 1,
            surfaceId: "deal", action: { version: "v0.9.1", action: expect.objectContaining({ name: "approve",
                surfaceId: "deal", sourceComponentId: "approve", context: { deal: 7 } }) } } } });
    });

    test("a message-routed action becomes a user turn", async ({ page }) =>
    {
        const view = await showDeal(page);

        await view.getByRole("button", { name: "Explain" }).click();

        await expect.poll(async () => (await record(page)).messages.length).toBe(1);
        expect((await record(page)).messages[0].content[0].text)
            .toMatch(/^The user chose "explain" on "explain" in surface "deal"\.\n\{/);
        expect((await record(page)).calls).toEqual([]);
    });

    test("a provider request routes like any action, and the tool's updateDataModel answers it", async ({ page }) =>
    {
        const view = await showDeal(page);

        await view.locator("outcrop-tree-view li[data-node-id=\"contracts\"] > .treeview-node-row .treeview-node-toggle")
            .click();

        await expect(view.locator("outcrop-tree-view").getByText("Master services agreement.pdf")).toBeVisible();
        expect((await record(page)).calls).toEqual([expect.objectContaining({ name: "deal_action" })]);
    });
});
