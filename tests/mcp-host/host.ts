/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 9c63ffee-dadb-4551-88e7-438a41218235
 * Created: 2026-11-05
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: McpTestHost
 * 📜 PURPOSE: An MCP Apps host for the view's browser tests (#19 M2): the
 *    SDK's own AppBridge, the renderer page in a sandboxed srcdoc iframe as
 *    hosts load it, tool calls answered from fixtures, and a record of what
 *    the view sent. "reject" and "silent" modes answer ui/initialize with
 *    an error, or not at all, to test the view's lifecycle.
 * 🔗 RELATES: [[McpView]], tests/mcp-view.spec.ts
 * ⚡ FLOW: [spec] -> [window.mcpHost.start] -> [AppBridge <-> iframe]
 *          -> [window.mcpHost.record]
 * ----------------------------------------------------------------------------
 */

import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps/app-bridge";

type ToolResult = { content: unknown[]; structuredContent?: unknown; isError?: boolean };

export interface StartOptions
{
    html: string;
    mode: "bridge" | "reject" | "silent";
    context?: McpUiHostContext;
    /** The result the view is opened with, sent after it initializes. */
    result?: ToolResult;
    /** Tool name → result; "throw" makes the call fail at the protocol level. */
    tools?: Record<string, ToolResult | "throw">;
    messageError?: boolean;
}

const record = {
    initialized: false,
    /** "reject" and "silent" modes: the view sent ui/initialize. */
    initializeSeen: false,
    calls: [] as Array<{ name: string; arguments?: unknown }>,
    messages: [] as unknown[],
    logs: [] as unknown[],
    sizes: [] as Array<{ width?: number; height?: number }>,
};
let bridge: AppBridge | null = null;

/** Opens the view: listens first, then loads the page. */
async function start(opts: StartOptions): Promise<void>
{
    const iframe = document.getElementById("view") as HTMLIFrameElement;
    const win = iframe.contentWindow as Window;

    if (opts.mode === "bridge") { await connectBridge(iframe, win, opts); }
    else { rawResponder(win, opts); }

    iframe.srcdoc = opts.html;
}

async function connectBridge(iframe: HTMLIFrameElement, win: Window, opts: StartOptions): Promise<void>
{
    bridge = new AppBridge(null, { name: "outcrop-test-host", version: "1.0.0" },
        { serverTools: {}, logging: {}, message: { text: {} } });
    bridge.setHostContext(opts.context ?? {});
    bridge.oncalltool = async (params) =>
    {
        record.calls.push({ name: params.name, arguments: params.arguments });
        const result = opts.tools?.[params.name];

        if (result === undefined || result === "throw") { throw new Error(`tool ${params.name} failed in transport`); }

        return result as never;
    };
    bridge.onmessage = async (params) =>
    {
        record.messages.push(params);

        return opts.messageError ? { isError: true } : {};
    };
    bridge.onloggingmessage = (params) => { record.logs.push(params); };
    bridge.onsizechange = (params) =>
    {
        record.sizes.push(params);
        if (params.height !== undefined) { iframe.style.height = `${params.height}px`; }
    };
    bridge.oninitialized = () =>
    {
        record.initialized = true;
        if (opts.result) { void bridge?.sendToolResult(opts.result as never); }
    };
    await bridge.connect(new PostMessageTransport(win, win));
}

/** Answers ui/initialize with an error ("reject") or never ("silent", which sends a tool result anyway). */
function rawResponder(win: Window, opts: StartOptions): void
{
    window.addEventListener("message", (event) =>
    {
        const data = event.data as { id?: number; method?: string };

        if (event.source !== win || data.method !== "ui/initialize") { return; }

        record.initializeSeen = true;

        if (opts.mode === "reject")
        {
            win.postMessage({ jsonrpc: "2.0", id: data.id, error: { code: -32603, message: "host refused" } }, "*");
            return;
        }

        win.postMessage({ jsonrpc: "2.0", method: "ui/notifications/tool-result", params: opts.result }, "*");
    });
}

/** A host context change, as a host sends one when its theme or layout changes. */
function setContext(context: McpUiHostContext): void
{
    bridge?.setHostContext(context);
}

Object.assign(window, { mcpHost: { start, setContext, record } });
