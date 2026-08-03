/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c18fb943-4a18-4c1f-a35c-a7bd2d7cf775
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Period Picker / CapabilityManifest
 * PURPOSE: Declares what Period Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Period Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker periodpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const PERIODPICKER_MANIFEST: CapabilityManifest =
{
    name: "periodpicker",
    factory: "createPeriodPicker",
    label: "Period Picker",
    icon: "bi-calendar-week",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 13466, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 40 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
