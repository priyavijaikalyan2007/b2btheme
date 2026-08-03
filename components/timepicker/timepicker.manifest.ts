/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 090c9d9a-1019-4889-9aed-5c14551c00df
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Time Picker / CapabilityManifest
 * PURPOSE: Declares what Time Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Time Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker timepicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const TIMEPICKER_MANIFEST: CapabilityManifest =
{
    name: "timepicker",
    factory: "createTimePicker",
    label: "Time Picker",
    icon: "bi-clock",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 30548, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 200, h: 40 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
