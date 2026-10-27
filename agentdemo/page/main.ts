/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground
 * 📜 PURPOSE: Wires the playground (#30): the adapter's catalog with Lit's
 *    basic components, the Host, the checker, the chrome and the scenarios.
 * 🔗 RELATES: [[A2uiPlaygroundHost]], [[A2uiAdapter]], [[AgentUiMessageChecker]]
 * ⚡ FLOW: [adapter + web_core + Lit] -> [catalog] -> [Host] -> [Playground]
 *          -> [toolbar | messages | surfaces | inspect | chat]
 * ----------------------------------------------------------------------------
 */

import { Catalog, MessageProcessor } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS, basicCatalog as coreBasicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";
import { A2uiSurface, basicCatalog } from "@a2ui/lit/v0_9";
import { messageValidators } from "virtual:a2ui-message-validator";

import basicJson from "../../scripts/agentui/vendor/a2ui-v0_9_1/catalogs/basic/catalog.json";
import commonTypes from "../../scripts/agentui/vendor/a2ui-v0_9_1/common_types.json";
import { check, checkSchema, formatFindings } from "../../scripts/agentui/a2ui-check.mjs";
import type { CheckDeps } from "../../scripts/agentui/a2ui-check.mjs";
import type { OutcropCatalogOptions, OutcropWebCore } from "../../a2ui/src/public";
import { exposeAutomation } from "./automation";
import { Host } from "./host";
import { logError, logInfo } from "./log";
import { LogModel } from "./log-model";
import { Playground } from "./playground";
import { buildChat } from "./ui/chat";
import { buildInspect } from "./ui/inspect";
import type { Inspect } from "./ui/inspect";
import { buildLayout } from "./ui/layout";
import { buildMessagesView } from "./ui/messages";
import { buildToolbar } from "./ui/toolbar";
import type { ScenarioEntry, ToolbarActions } from "./ui/toolbar";
import type { ToolbarHandle } from "./ui/factory";

/** Loaded at run time from dist/, exactly as a third-party host loads it; never bundled. */
const ADAPTER_URL = "/a2ui/adapter/v1.js";
const PLAY_INTERVAL_MS = 900;

interface AdapterModule
{
    catalogJson: Readonly<Record<string, unknown>>;
    createOutcropCatalog(webCore: OutcropWebCore, options: OutcropCatalogOptions): unknown;
}

async function start(): Promise<void>
{
    if (customElements.get("a2ui-surface") !== A2uiSurface)
    {
        throw new Error("<a2ui-surface> is not defined by @a2ui/lit; the playground bundle is incomplete.");
    }

    const adapter = await import(/* @vite-ignore */ ADAPTER_URL) as AdapterModule;
    const app = document.getElementById("app");

    if (!app) { throw new Error("The playground page has no #app element."); }

    const regions = buildLayout(app);
    const deps = checkDeps(adapter);
    const log = new LogModel();
    const host = new Host({ surfacesEl: regions.surfacesEl, checkSchema: (m) => checkSchema(m, messageValidators),
        catalog: adapter.createOutcropCatalog({ Catalog, basicCatalog, BASIC_FUNCTIONS },
            { assetBaseUrl: location.origin, injectBaseTheme: false }) });
    const inspect = buildInspect(regions.inspectEl, pasteHandlers(() => playground, deps, () => inspect));
    const chat = buildChat(regions.agentEl, () => undefined);
    const playground = new Playground({ host, log, inspect, chat, formatFindings });

    chat.enable(false);
    buildMessagesView(regions.messagesEl, log);
    const controls = { toolbar: null as ToolbarHandle | null };
    const actions = toolbarActions(playground, inspect, deps, () => syncControls(controls.toolbar, playground));

    controls.toolbar = buildToolbar(regions.toolbarEl, await scenarioIndex(), actions);
    syncControls(controls.toolbar, playground);
    exposeAutomation(playground, log);
    logInfo("playground ready", { adapter: ADAPTER_URL });
}

/** The checker's dependencies in the page: the adapter's own catalog and the vendored spec schemas. */
function checkDeps(adapter: AdapterModule): CheckDeps
{
    return { validators: messageValidators, catalogJson: adapter.catalogJson,
        webCore: { Catalog, MessageProcessor, basicCatalog: coreBasicCatalog, BASIC_FUNCTIONS },
        catalogs: { ours: adapter.catalogJson, basic: basicJson, commonTypes } };
}

function pasteHandlers(playground: () => Playground, deps: CheckDeps, inspect: () => Inspect)
{
    return {
        check: (text: string) => runCheck(text, deps, inspect(), false),
        apply: (text: string) =>
        {
            const messages = parseMessages(text, inspect());

            if (messages) { playground().applyBatch("file", messages); }
        },
    };
}

/** Runs all three checker layers; the Check tab is selected only when asked (not from the paste box). */
function runCheck(text: string, deps: CheckDeps, inspect: Inspect, showTab: boolean): void
{
    const messages = parseMessages(text, inspect);

    if (!messages) { return; }

    const result = check(messages, deps);

    const summary = `OK: ${messages.length} message(s), no findings`;

    inspect.showFindings(result.ok ? summary : formatFindings(result.findings));
    if (showTab) { inspect.select("check"); }
}

/** A JSON array of messages, or JSON Lines; a parse error is shown in the Check tab. */
function parseMessages(text: string, inspect: Inspect): unknown[] | null
{
    try
    {
        const trimmed = text.trim();
        const value: unknown = trimmed.startsWith("[") ? JSON.parse(trimmed)
            : trimmed.split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l));

        if (!Array.isArray(value)) { throw new Error("expected a JSON array of messages"); }

        return value;
    }
    catch (err)
    {
        inspect.showFindings(`Not valid JSON or JSON Lines: ${err instanceof Error ? err.message : String(err)}`);
        return null;
    }
}

function toolbarActions(playground: Playground, inspect: Inspect, deps: CheckDeps, sync: () => void): ToolbarActions
{
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const then = (act: () => void) => () => { stop(); act(); sync(); };

    return {
        scenario: async (name) =>
        {
            stop();
            playground.loadScenario(await fetchText(`scenarios/${name}.jsonl`));
            sync();
        },
        back: then(() => playground.back()),
        step: then(() => playground.step()),
        play: () =>
        {
            if (timer) { stop(); return; }
            timer = setInterval(() => { if (!playground.step()) { stop(); } sync(); }, PLAY_INTERVAL_MS);
        },
        reset: then(() => playground.reset()),
        loadFile: (text) => { loadFile(text, playground, inspect); sync(); },
        paste: () => inspect.select("paste"),
        check: () => runCheck(inspect.pasteText(), deps, inspect, true),
    };
}

/** Step controls are enabled only while a scenario has lines left (back and reset: while one is loaded). */
function syncControls(toolbar: ToolbarHandle | null, playground: Playground): void
{
    if (!toolbar) { return; }

    const canStep = playground.canStep();
    const loaded = playground.hasScenario();

    toolbar.setToolState("step", { disabled: !canStep });
    toolbar.setToolState("play", { disabled: !canStep });
    toolbar.setToolState("back", { disabled: !loaded });
    toolbar.setToolState("reset", { disabled: !loaded });
}

/** A scenario file (header line first) loads as a scenario; anything else goes into the paste box. */
function loadFile(text: string, playground: Playground, inspect: Inspect): void
{
    if (/^\s*\{\s*"kind"\s*:\s*"header"/.test(text)) { playground.loadScenario(text); return; }

    inspect.setPasteText(text);
    inspect.select("paste");
}

async function scenarioIndex(): Promise<ScenarioEntry[]>
{
    return JSON.parse(await fetchText("scenarios/index.json")) as ScenarioEntry[];
}

async function fetchText(url: string): Promise<string>
{
    const res = await fetch(url);

    if (!res.ok)
    {
        throw new Error(`Could not load ${url}: HTTP ${res.status}. Rebuild with npm run build:demo:a2ui.`);
    }

    return res.text();
}

start().catch((err: unknown) => logError("the playground failed to start", err));
