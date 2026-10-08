/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2a9cc065-dc1d-4fcc-b426-843014246dbb
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Tenant Switcher / CapabilityManifest
 * PURPOSE: Declares what Tenant Switcher can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Tenant Switcher]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker tenantswitcher-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const TENANTSWITCHER_MANIFEST: CapabilityManifest =
{
    name: "tenantswitcher",
    factory: "createTenantSwitcher",
    factoryStyle: "options-first",
    label: "Tenant Switcher",
    icon: "bi-building",
    category: "social",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12700, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 300 },
    defaultOptions: { tenants: [], activeTenantId: "" },

    conformance: "display",
    priority: 50,
};
