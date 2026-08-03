/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e4333706-d296-45ed-be94-c6107304f316
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Sprint Picker / CapabilityManifest
 * PURPOSE: Declares what Sprint Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Sprint Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sprintpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const SPRINTPICKER_MANIFEST: CapabilityManifest =
{
    name: "sprintpicker",
    factory: "createSprintPicker",
    label: "Sprint Picker",
    icon: "bi-kanban",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 17662, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 40 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
