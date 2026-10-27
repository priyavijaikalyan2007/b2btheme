/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground
 * 📜 PURPOSE: Wires the playground (#30): the adapter's catalog with Lit's
 *    basic components, the Host, and the checker's schema layer.
 * 🔗 RELATES: [[A2uiPlaygroundHost]], [[A2uiAdapter]], [[AgentUiMessageChecker]]
 * ⚡ FLOW: [adapter + web_core + Lit] -> [catalog] -> [Host]
 * ----------------------------------------------------------------------------
 */

import { Catalog } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS } from "@a2ui/web_core/v0_9/basic_catalog";
import { A2uiSurface, basicCatalog } from "@a2ui/lit/v0_9";
import { messageValidators } from "virtual:a2ui-message-validator";

import { checkSchema } from "../../scripts/agentui/a2ui-check.mjs";
import type { OutcropCatalogOptions, OutcropWebCore } from "../../a2ui/src/public";
import { Host } from "./host";
import { logError, logInfo } from "./log";

/** Loaded at run time from dist/, exactly as a third-party host loads it; never bundled. */
const ADAPTER_URL = "/a2ui/adapter/v1.js";

interface AdapterModule
{
    catalogJson: Readonly<Record<string, unknown>>;
    createOutcropCatalog(webCore: OutcropWebCore, options: OutcropCatalogOptions): unknown;
}

/** The pieces later modules build on. */
export interface Playground
{
    readonly host: Host;
    readonly adapter: AdapterModule;
}

async function start(): Promise<Playground>
{
    if (customElements.get("a2ui-surface") !== A2uiSurface)
    {
        throw new Error("<a2ui-surface> is not defined by @a2ui/lit; the playground bundle is incomplete.");
    }

    const adapter = await import(/* @vite-ignore */ ADAPTER_URL) as AdapterModule;
    const catalog = adapter.createOutcropCatalog({ Catalog, basicCatalog, BASIC_FUNCTIONS },
        { assetBaseUrl: location.origin, injectBaseTheme: false });
    const surfacesEl = document.createElement("div");

    surfacesEl.className = "a2ui-surfaces";
    document.getElementById("app")?.append(surfacesEl);

    const host = new Host({ surfacesEl, catalog, checkSchema: (m) => checkSchema(m, messageValidators) });

    logInfo("playground ready", { adapter: ADAPTER_URL });

    return { host, adapter };
}

start().catch((err: unknown) => logError("the playground failed to start", err));
