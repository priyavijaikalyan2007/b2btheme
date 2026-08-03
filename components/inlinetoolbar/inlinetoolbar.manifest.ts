/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2e2ffee8-da86-4869-9d96-8d30a8fb01ae
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Inline Toolbar / CapabilityManifest
 * PURPOSE: Declares what Inline Toolbar can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Inline Toolbar]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker inlinetoolbar-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const INLINETOOLBAR_MANIFEST: CapabilityManifest =
{
    name: "inlinetoolbar",
    factory: "createInlineToolbar",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Inline Toolbar",
    icon: "bi-wrench",
    category: "other",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 2507, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 300, h: 32 },
    defaultOptions: { items: [] },

    conformance: "display",
    priority: 50,
};
