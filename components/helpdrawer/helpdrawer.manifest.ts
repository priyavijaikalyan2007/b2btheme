/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 1a0d6993-5bef-4015-911b-b8712139114f
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Help Drawer / CapabilityManifest
 * PURPOSE: Declares what Help Drawer can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Help Drawer]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker helpdrawer-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const HELPDRAWER_MANIFEST: CapabilityManifest =
{
    name: "helpdrawer",
    factory: "createHelpDrawer",
    mountMethod: "getElement",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Help Drawer",
    icon: "bi-question-circle",
    category: "content",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6694, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 320, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
