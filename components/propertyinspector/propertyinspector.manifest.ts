/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: bb76c028-56a5-480d-9d1f-0006051c287c
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Property Inspector / CapabilityManifest
 * PURPOSE: Declares what Property Inspector can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Property Inspector]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker propertyinspector-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const PROPERTYINSPECTOR_MANIFEST: CapabilityManifest =
{
    name: "propertyinspector",
    factory: "createPropertyInspector",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Property Inspector",
    icon: "bi-card-list",
    category: "data",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 7665, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 300, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
