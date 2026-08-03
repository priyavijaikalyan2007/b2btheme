/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 81532e74-230a-430b-87d5-86e6729159a9
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Toolbar / CapabilityManifest
 * PURPOSE: Declares what Toolbar can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Toolbar]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker toolbar-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const TOOLBAR_MANIFEST: CapabilityManifest =
{
    name: "toolbar",
    factory: "createToolbar",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Toolbar",
    icon: "bi-wrench",
    category: "navigation",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 48517, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 500, h: 40 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
