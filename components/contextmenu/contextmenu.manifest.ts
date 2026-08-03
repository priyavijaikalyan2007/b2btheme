/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 50eb615d-3cd1-44d4-87bb-7a8bb7d02bc6
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Context Menu / CapabilityManifest
 * PURPOSE: Declares what Context Menu can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Context Menu]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker contextmenu-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const CONTEXTMENU_MANIFEST: CapabilityManifest =
{
    name: "contextmenu",
    factory: "createContextMenu",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Context Menu",
    icon: "bi-menu-button",
    category: "other",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6986, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 220, h: 200 },
    defaultOptions: { items: [] },

    conformance: "display",
    priority: 50,
};
