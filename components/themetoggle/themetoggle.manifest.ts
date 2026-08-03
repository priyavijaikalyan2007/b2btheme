/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: fd58a389-ec70-42a4-b253-428c79d0558d
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Theme Toggle / CapabilityManifest
 * PURPOSE: Declares what Theme Toggle can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Theme Toggle]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker themetoggle-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const THEMETOGGLE_MANIFEST: CapabilityManifest =
{
    name: "themetoggle",
    factory: "createThemeToggle",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Theme Toggle",
    icon: "bi-circle-half",
    category: "other",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 2978, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 100, h: 32 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
