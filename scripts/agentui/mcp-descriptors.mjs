/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiMcpDescriptors
 * 📜 PURPOSE: The MCP renderer CSP metadata: origins only (host-neutral
 *    static.outcrop.us + Google Fonts for web fonts), no connect domains
 *    (components fetch through tools/call, not fetch()), no paths. Spec §6.
 * 🔗 RELATES: [[AgentUiCatalog]], #19 (view and server helper)
 * ⚡ FLOW: [CATALOG_ORIGIN + FONT_ORIGINS] -> [rendererMeta] -> [_meta.ui]
 */

import { CATALOG_ORIGIN } from "./catalog.mjs";

/** Google Fonts serves CSS from one origin and font files from another. */
export const FONT_ORIGINS = Object.freeze(["https://fonts.googleapis.com", "https://fonts.gstatic.com"]);

/**
 * `_meta.ui` for the MCP renderer resource. CSP names ORIGINS; the pinned
 * path belongs in the view's own tags (#19). No connectDomains: a component
 * that fetches routes the call through tools/call (spec §6).
 *
 * @returns The `_meta.ui` object.
 */
export function rendererMeta()
{
    return { csp: { resourceDomains: [CATALOG_ORIGIN, ...FONT_ORIGINS] } };
}
