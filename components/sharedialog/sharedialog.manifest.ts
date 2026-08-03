/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: fda3181d-1967-4ca5-a0ba-a575f80b5971
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Share Dialog / CapabilityManifest
 * PURPOSE: Declares what Share Dialog can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Share Dialog]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sharedialog-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const SHAREDIALOG_MANIFEST: CapabilityManifest =
{
    name: "sharedialog",
    factory: "createShareDialog",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Share Dialog",
    icon: "bi-share-fill",
    category: "social",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 14061, mountCost: "light", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
