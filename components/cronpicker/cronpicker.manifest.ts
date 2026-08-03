/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: af3a8621-b6c8-43ed-9ab5-8c128e4e285c
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: CRON Picker / CapabilityManifest
 * PURPOSE: Declares what CRON Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[CRON Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker cronpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const CRONPICKER_MANIFEST: CapabilityManifest =
{
    name: "cronpicker",
    factory: "createCronPicker",
    label: "CRON Picker",
    icon: "bi-calendar-range",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 18743, mountCost: "light", holdsResources: false },

    defaultSize: { w: 360, h: 280 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
