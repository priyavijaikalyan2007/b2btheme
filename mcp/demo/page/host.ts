/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 8a41c6e2-5d07-4b93-9e2f-61c0b7d4a385
 * Created: 2026-11-06
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: McpDemoHost
 * 📜 PURPOSE: The demo's MCP Apps host (agentui-unblock §6). It does what a
 *    chat host does with a tool that has a UI: calls the tool over
 *    Streamable HTTP, reads the ui:// resource the tool names, renders it
 *    in a sandboxed srcdoc iframe under the SDK's AppBridge, forwards the
 *    view's tool calls to the server (only tools visible to apps), and
 *    shows the view's ui/message turns. Buttons stand in for the model.
 *    Every JSON-RPC message on both legs goes to the log.
 * 🔗 RELATES: [[McpDemoServer]], [[McpDemoLoggedTransport]], [[McpView]]
 * ⚡ FLOW: [tool button] -> [tools/call] -> [resources/read] -> [iframe + AppBridge]
 *          [view tools/call] -> [visibility check] -> [server]
 * ----------------------------------------------------------------------------
 */

import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { CallToolResult, JSONRPCMessage, Tool } from "@modelcontextprotocol/client";
import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps/app-bridge";

import { LoggedTransport } from "./logged-transport";
import type { Direction } from "./logged-transport";

const LOG_PREFIX = "[mcp-demo-host]";
const HOST_INFO = { name: "outcrop-demo-host", version: "1.0.0" };

type Theme = "light" | "dark";
type UiMeta = { resourceUri?: string; visibility?: string[] };

const conversation = byId("conversation");
const logList = byId("log-entries");
const toolBar = byId("tools");
const bridges = new Set<AppBridge>();
const resources = new Map<string, Promise<string>>();
let theme: Theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
let tools: Tool[] = [];

function byId(id: string): HTMLElement
{
    const element = document.getElementById(id);

    if (!element) { throw new Error(`${LOG_PREFIX} the page has no #${id}`); }

    return element;
}

function uiMeta(tool: Tool | undefined): UiMeta
{
    return ((tool?._meta as { ui?: UiMeta } | undefined)?.ui) ?? {};
}

/** A tool is visible to apps unless its visibility leaves "app" out (MCP Apps, tool visibility). */
function appVisible(tool: Tool | undefined): boolean
{
    const visibility = uiMeta(tool).visibility;

    return tool !== undefined && (visibility === undefined || visibility.includes("app"));
}

function modelVisible(tool: Tool): boolean
{
    const visibility = uiMeta(tool).visibility;

    return visibility === undefined || visibility.includes("model");
}

/** One log line, with the whole message folded under it. */
function record(leg: string, direction: Direction, message: JSONRPCMessage): void
{
    const m = message as { id?: unknown; method?: string; error?: { message?: string } };
    const kind = m.method ?? (m.error ? `error: ${m.error.message ?? ""}` : "result");
    const entry = document.createElement("details");
    const summary = document.createElement("summary");
    const body = document.createElement("pre");

    entry.className = `demo-log-entry demo-log-${direction}`;
    entry.dataset.leg = leg;
    entry.dataset.kind = kind;
    const id = m.id === undefined ? "" : `  #${String(m.id)}`;

    summary.textContent = `${direction === "out" ? "→" : "←"} ${leg}  ${kind}${id}`;
    body.textContent = JSON.stringify(message, null, 2);
    entry.append(summary, body);
    logList.append(entry);
    logList.scrollTop = logList.scrollHeight;
}

function turn(role: "assistant" | "user", text: string): HTMLElement
{
    const element = document.createElement("article");
    const label = document.createElement("div");
    const para = document.createElement("p");

    element.className = `demo-turn demo-turn-${role}`;
    element.dataset.role = role;
    label.className = "demo-turn-role";
    label.textContent = role === "assistant" ? "Assistant (tool call)" : "User (sent by the view)";
    para.textContent = text;
    element.append(label, para);
    conversation.append(element);
    element.scrollIntoView({ block: "end" });

    return element;
}

function hostContext(): McpUiHostContext
{
    return { theme, displayMode: "inline", availableDisplayModes: ["inline"], platform: "web" };
}

function textOf(result: CallToolResult): string
{
    return result.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join(" ");
}

/** The ui:// resource's HTML, read once per URI. */
function resourceHtml(client: Client, uri: string): Promise<string>
{
    let html = resources.get(uri);

    if (!html)
    {
        html = client.readResource({ uri }).then(({ contents }) =>
        {
            const page = contents[0];

            if (!page || !("text" in page)) { throw new Error(`${uri} has no text content`); }

            return page.text;
        });
        resources.set(uri, html);
    }

    return html;
}

/** What a host does for a model's tool call: run it, and render its UI if it has one. */
async function callTool(client: Client, tool: Tool): Promise<void>
{
    const result = await client.callTool({ name: tool.name, arguments: {} }) as CallToolResult;
    const card = turn("assistant", `${tool.name}: ${textOf(result)}`);
    const uri = uiMeta(tool).resourceUri;

    if (uri === undefined) { return; }

    const iframe = document.createElement("iframe");

    iframe.className = "demo-view";
    iframe.dataset.tool = tool.name;
    iframe.title = `${tool.name} view`;
    // Scripts only: the page gets an opaque origin, so it can reach nothing of the host's.
    iframe.setAttribute("sandbox", "allow-scripts");
    card.append(iframe);

    const bridge = new AppBridge(null, HOST_INFO, { serverTools: {}, logging: {}, message: { text: {} } });

    bridge.setHostContext(hostContext());
    bridge.oncalltool = async (params) =>
    {
        const target = tools.find((t) => t.name === params.name);

        if (!appVisible(target)) { throw new Error(`${params.name} is not a tool this view may call`); }

        return await client.callTool(params) as CallToolResult;
    };
    bridge.onmessage = async (params) =>
    {
        turn("user", params.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join(" "));

        return {};
    };
    bridge.onloggingmessage = (params) => { console.info(`${LOG_PREFIX} ${tool.name} view:`, params.data); };
    bridge.onsizechange = ({ height }) => { if (height !== undefined) { iframe.style.height = `${height}px`; } };
    bridge.oninitialized = () => { void bridge.sendToolResult(result as never); };

    const win = iframe.contentWindow;

    if (!win) { throw new Error(`${LOG_PREFIX} the iframe has no window`); }

    await bridge.connect(new LoggedTransport(new PostMessageTransport(win, win), `view ${tool.name}`, record));
    bridges.add(bridge);
    iframe.srcdoc = await resourceHtml(client, uri);
}

function setTheme(next: Theme): void
{
    theme = next;
    document.documentElement.setAttribute("data-bs-theme", next);
    byId("theme").textContent = next === "dark" ? "Light theme" : "Dark theme";
    bridges.forEach((bridge) => bridge.setHostContext(hostContext()));
}

function fail(error: unknown): void
{
    console.error(LOG_PREFIX, error);

    const line = document.createElement("p");

    line.className = "demo-error";
    line.setAttribute("role", "alert");
    line.textContent = error instanceof Error ? error.message : String(error);
    conversation.append(line);
}

async function main(): Promise<void>
{
    setTheme(theme);
    byId("theme").addEventListener("click", () => setTheme(theme === "dark" ? "light" : "dark"));

    const client = new Client(HOST_INFO);

    await client.connect(new LoggedTransport(new StreamableHTTPClientTransport(new URL("/rpc", location.origin)),
        "server", record));
    tools = (await client.listTools()).tools;

    for (const tool of tools.filter(modelVisible))
    {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "btn btn-outline-primary btn-sm";
        button.dataset.tool = tool.name;
        button.textContent = tool.name;
        button.title = tool.description ?? "";
        button.addEventListener("click", () => { callTool(client, tool).catch(fail); });
        toolBar.append(button);
    }

    console.info(`${LOG_PREFIX} ready`, { tools: tools.map((t) => t.name) });
}

main().catch(fail);
