/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: cc1dad2a-4323-4a5b-8c25-0d465a2c1b4a
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Sidebar / CapabilityManifest
 * PURPOSE: Declares what Sidebar can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Sidebar]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sidebar-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const SIDEBAR_MANIFEST: CapabilityManifest =
{
    name: "sidebar",
    factory: "createSidebar",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Sidebar",
    icon: "bi-layout-sidebar",
    category: "navigation",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 21985, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 260, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
