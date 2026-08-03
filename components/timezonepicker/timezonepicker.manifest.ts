/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e64bc80e-8251-45e1-ad42-2b29fefeb2d7
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Timezone Picker / CapabilityManifest
 * PURPOSE: Declares what Timezone Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Timezone Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker timezonepicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const TIMEZONEPICKER_MANIFEST: CapabilityManifest =
{
    name: "timezonepicker",
    factory: "createTimezonePicker",
    label: "Timezone Picker",
    icon: "bi-globe",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 14353, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 40 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
