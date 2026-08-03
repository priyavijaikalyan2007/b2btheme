/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a2848bdd-3342-415d-be49-05a7ec2f10c6
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: App Launcher / CapabilityManifest
 * PURPOSE: Declares what App Launcher can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[App Launcher]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker applauncher-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const APPLAUNCHER_MANIFEST: CapabilityManifest =
{
    name: "applauncher",
    factory: "createAppLauncher",
    factoryStyle: "options-first",
    label: "App Launcher",
    icon: "bi-grid-3x3-gap",
    category: "other",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 22217, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 300, h: 300 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
