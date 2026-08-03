/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 00076198-7b45-4746-a7b0-8dee684d7520
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Tabbed Panel / CapabilityManifest
 * PURPOSE: Declares what Tabbed Panel can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Tabbed Panel]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker tabbedpanel-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const TABBEDPANEL_MANIFEST: CapabilityManifest =
{
    name: "tabbedpanel",
    factory: "createTabbedPanel",
    factoryStyle: "options-first",
    label: "Tabbed Panel",
    icon: "bi-window-stack",
    category: "navigation",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 29054, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
