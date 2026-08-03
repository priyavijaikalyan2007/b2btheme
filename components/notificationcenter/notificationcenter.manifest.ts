/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 23246b86-a8fb-4d92-876a-1f39b2092fde
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Notification Center / CapabilityManifest
 * PURPOSE: Declares what Notification Center can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Notification Center]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker notificationcenter-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const NOTIFICATIONCENTER_MANIFEST: CapabilityManifest =
{
    name: "notificationcenter",
    factory: "createNotificationCenter",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Notification Center",
    icon: "bi-bell-fill",
    category: "social",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 10704, mountCost: "light", holdsResources: false },

    defaultSize: { w: 350, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
