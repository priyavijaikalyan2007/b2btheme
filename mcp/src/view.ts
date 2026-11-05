/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: ab8213d4-1896-45c9-a1a1-e12ca281087e
 * Created: 2026-11-05
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: McpView
 * 📜 PURPOSE: The MCP Apps renderer view (#19, spec §4): connects to the
 *    host, takes its theme, renders the A2UI messages in each tool result
 *    with catalog v1 beside the A2UI basic catalog, and routes component
 *    actions to a server tool or to the conversation, as the server said.
 * 🔗 RELATES: [[McpViewResult]], [[McpViewRouter]], [[McpViewTheme]],
 *    [[A2uiAdapter]], [[A2uiPlaygroundHost]]
 * ⚡ FLOW: [renderer.html] -> [McpExtApps.App.connect] -> [applyHostContext]
 *          -> [tool result] -> [parseResult] -> [MessageProcessor]
 *          -> [a2ui-surface per surface] -> [action] -> [resolveRoute]
 *          -> [tools/call -> next result | ui/message]
 * 🔒 SECURITY: Loads code only from the origin it was served from; fetches
 *    nothing (renderer.meta.json has no connectDomains). No analytics: it
 *    runs inside someone else's app (spec §8).
 * ----------------------------------------------------------------------------
 */

import type { A2uiErrorPayload, ActionPayload, Catalog, MessageProcessor, SurfaceModel } from "@a2ui/web_core/v0_9";
import type { App } from "@modelcontextprotocol/ext-apps";

import type { OutcropCatalogOptions, OutcropWebCore } from "../../a2ui/src/public";
import { LOG_PREFIX, McpViewError } from "./errors";
import type { McpViewCode } from "./errors";
import { parseResult } from "./result";
import type { Routes, ToolResultLike } from "./result";
import { messageText, resolveRoute, toolArguments } from "./router";
import { applyHostContext } from "./theme";

/** The pinned runtime renderer.html loads before this module (spec §7). */
interface A2uiRuntimeGlobal
{
    Catalog: typeof Catalog;
    MessageProcessor: typeof MessageProcessor;
    basicCatalog: OutcropWebCore["basicCatalog"];
    BASIC_FUNCTIONS: OutcropWebCore["BASIC_FUNCTIONS"];
    A2uiSurface: CustomElementConstructor;
}

interface McpExtAppsGlobal
{
    App: typeof App;
}

interface AdapterModule
{
    createOutcropCatalog(webCore: OutcropWebCore, options: OutcropCatalogOptions): unknown;
}

/** The adapter's always-latest path, resolved against this module's own URL. */
const ADAPTER_PATH = "/a2ui/adapter/v1.js";
const APP_INFO = { name: "outcrop-mcp-view", version: "1.0.0" };
const ROOT_ID = "outcrop-mcp";
const NOT_CONNECTED_TEXT = "This view couldn't connect to its host.";

/** One rendered surface: its frame, its error line and its <a2ui-surface>. */
interface Frame
{
    frame: HTMLElement;
    error: HTMLElement;
}

/** Errors go to the console and, once connected, to the host log (spec §8). */
class Reporter
{
    constructor(private readonly app: App) {}

    error(code: string, message: string, surfaceId: string | null): void
    {
        const data = { code, message, ...(surfaceId === null ? {} : { surfaceId }) };

        console.error(`${LOG_PREFIX} ${code}: ${message}`, data);
        this.app.sendLog({ level: "error", logger: "outcrop-mcp", data })
            .catch((err: unknown) => console.error(`${LOG_PREFIX} the host log rejected an entry`, err));
    }
}

/** The rendering half: surfaces, routes per surface, and the error display. */
class View
{
    readonly #app: App;
    readonly #root: HTMLElement;
    readonly #status: HTMLElement;
    readonly #reporter: Reporter;
    readonly #processor: MessageProcessor;
    readonly #frames = new Map<string, Frame>();
    /** Routes from the latest result that touched each surface (spec §5.1). */
    readonly #routes = new Map<string, Routes | undefined>();

    constructor(app: App, root: HTMLElement, runtime: A2uiRuntimeGlobal, catalog: unknown, reporter: Reporter)
    {
        this.#app = app;
        this.#root = root;
        this.#reporter = reporter;
        this.#status = root.appendChild(errorLine("outcrop-mcp-status"));
        // The adapter builds a web_core Catalog; its type is not visible across the CDN boundary.
        this.#processor = new runtime.MessageProcessor([catalog as never], (a: ActionPayload) => this.#action(a));
        this.#processor.onSurfaceCreated((s) => this.#mount(s));
        this.#processor.onSurfaceDeleted((id) => this.#unmount(id));
    }

    /**
     * Renders one tool result. Errors from a routed tool's result show on the
     * surface whose action called it; the first result's show above every surface.
     */
    show(result: ToolResultLike, from: string | null): void
    {
        let parsed;

        try { parsed = parseResult(result); }
        catch (err) { this.#fail(err, from); return; }

        this.#clear(from);
        this.#status.hidden = true;
        parsed.surfaceIds.forEach((id) => this.#routes.set(id, parsed.routes));

        for (const message of parsed.messages)
        {
            try { this.#processor.processMessages([message] as never); }
            catch (err) { this.#show("MESSAGE_REJECTED", errorText(err), surfaceOf(message, this.#frames)); }
        }
    }

    /** Routes an action; every failure is shown on its surface and logged. */
    async #action(action: ActionPayload): Promise<void>
    {
        try
        {
            const route = resolveRoute(this.#routes.get(action.surfaceId), action.name);

            this.#clear(action.surfaceId);

            if (route === "message") { await this.#message(action); return; }

            this.show(await this.#callTool(route.tool, action), action.surfaceId);
        }
        catch (err)
        {
            this.#fail(err, action.surfaceId);
        }
    }

    /** A tool route: tools/call; a transport or protocol failure is the tool's error. */
    async #callTool(tool: string, action: ActionPayload): Promise<ToolResultLike>
    {
        try
        {
            return await this.#app.callServerTool({ name: tool, arguments: toolArguments(action) });
        }
        catch (err)
        {
            throw new McpViewError("OUTCROP_MCP_TOOL_ERROR", `${tool}: ${errorText(err)}`);
        }
    }

    /** A message route: a user turn the model reads (spec §5.2). */
    async #message(action: ActionPayload): Promise<void>
    {
        let result: { isError?: boolean };

        try
        {
            result = await this.#app.sendMessage({ role: "user",
                content: [{ type: "text", text: messageText(action) }] });
        }
        catch (err)
        {
            throw new McpViewError("OUTCROP_MCP_MESSAGE_FAILED", errorText(err));
        }

        if (result.isError === true)
        {
            throw new McpViewError("OUTCROP_MCP_MESSAGE_FAILED", "The host did not accept the message.");
        }
    }

    /** Shows a new surface in a frame with an error line above it. */
    #mount(surface: SurfaceModel): void
    {
        const frame = document.createElement("section");
        const error = errorLine("outcrop-mcp-surface-error");
        const view = document.createElement("a2ui-surface") as HTMLElement & { surface?: unknown };

        frame.className = "outcrop-mcp-surface";
        frame.dataset.surface = surface.id;
        view.surface = surface;
        frame.append(error, view);
        this.#root.append(frame);
        this.#frames.set(surface.id, { frame, error });
        surface.onError.subscribe((e: A2uiErrorPayload) => this.#show(e.code, e.message, surface.id));
    }

    #unmount(surfaceId: string): void
    {
        this.#frames.get(surfaceId)?.frame.remove();
        this.#frames.delete(surfaceId);
        this.#routes.delete(surfaceId);
    }

    #fail(err: unknown, surfaceId: string | null): void
    {
        const code: McpViewCode | "VIEW_FAILED" = err instanceof McpViewError ? err.code : "VIEW_FAILED";

        this.#show(code, errorText(err), surfaceId);
    }

    /** Shows an error on its surface, or above every surface when it has none (or it is gone). */
    #show(code: string, message: string, surfaceId: string | null): void
    {
        const line = (surfaceId === null ? undefined : this.#frames.get(surfaceId)?.error) ?? this.#status;

        line.textContent = `${code}: ${message}`;
        line.hidden = false;
        this.#reporter.error(code, message, surfaceId);
    }

    #clear(surfaceId: string | null): void
    {
        const frame = surfaceId === null ? undefined : this.#frames.get(surfaceId);

        if (frame) { frame.error.hidden = true; }
    }
}

/**
 * Starts the view. Nothing renders before ui/initialize returns (spec §6):
 * tool results that arrive first wait until the host theme is applied.
 */
async function start(): Promise<void>
{
    const runtime = pageGlobal<A2uiRuntimeGlobal>("A2uiRuntime", "/lib/a2ui-runtime-<version>.js");
    const extApps = pageGlobal<McpExtAppsGlobal>("McpExtApps", "/lib/mcp-ext-apps-<version>.js");
    const root = document.getElementById(ROOT_ID);

    if (!root) { throw new Error(`renderer.html has no #${ROOT_ID} element.`); }

    if (customElements.get("a2ui-surface") !== runtime.A2uiSurface)
    {
        throw new Error("<a2ui-surface> is not the A2UI runtime's; another script defined it first.");
    }

    const app = new extApps.App(APP_INFO, {}, { autoResize: true, strict: true });
    const reporter = new Reporter(app);
    const pending: ToolResultLike[] = [];
    let view: View | null = null;

    app.ontoolresult = (result) => { if (view) { view.show(result, null); } else { pending.push(result); } };
    app.onhostcontextchanged = () => applyHostContext(document.documentElement, app.getHostContext() ?? {});

    const adapter = import(/* @vite-ignore */ new URL(ADAPTER_PATH, import.meta.url).href) as Promise<AdapterModule>;

    try
    {
        await app.connect();
    }
    catch (err)
    {
        root.textContent = NOT_CONNECTED_TEXT;
        console.error(`${LOG_PREFIX} OUTCROP_MCP_NOT_CONNECTED: ${errorText(err)}`, err);
        return;
    }

    applyHostContext(document.documentElement, app.getHostContext() ?? {});

    const catalog = (await adapter).createOutcropCatalog(
        { Catalog: runtime.Catalog, basicCatalog: runtime.basicCatalog, BASIC_FUNCTIONS: runtime.BASIC_FUNCTIONS },
        { assetBaseUrl: new URL(import.meta.url).origin, injectBaseTheme: false });

    view = new View(app, root, runtime, catalog, reporter);
    pending.splice(0).forEach((result) => view?.show(result, null));
    console.info(`${LOG_PREFIX} ready`, { host: app.getHostVersion()?.name });
}

/** A global the page's pinned <script> defines; its absence is a broken page, not something to work around. */
function pageGlobal<T>(name: string, path: string): T
{
    const value = (globalThis as Record<string, unknown>)[name];

    if (value === undefined) { throw new Error(`${name} is not defined: renderer.html must load ${path} first.`); }

    return value as T;
}

/** A hidden alert line. */
function errorLine(className: string): HTMLElement
{
    const line = document.createElement("p");

    line.className = `${className} alert alert-danger`;
    line.setAttribute("role", "alert");
    line.hidden = true;

    return line;
}

/** The surface a rejected message names, when it is already shown. */
function surfaceOf(message: unknown, frames: ReadonlyMap<string, Frame>): string | null
{
    const op = Object.values((message ?? {}) as Record<string, unknown>)
        .find((v): v is { surfaceId: string } => typeof (v as { surfaceId?: unknown })?.surfaceId === "string");

    return op && frames.has(op.surfaceId) ? op.surfaceId : null;
}

function errorText(err: unknown): string
{
    return err instanceof Error ? err.message : String(err);
}

start().catch((err: unknown) => console.error(`${LOG_PREFIX} the view failed to start`, err));
