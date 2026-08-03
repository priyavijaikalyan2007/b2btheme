/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 34b2494f-ad43-40eb-8de4-f482052be875
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Stepper / CapabilityManifest
 * PURPOSE: Declares what Stepper can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Stepper]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker stepper-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const STEPPER_MANIFEST: CapabilityManifest =
{
    name: "stepper",
    factory: "createStepper",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Stepper",
    icon: "bi-list-ol",
    category: "feedback",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6764, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 500, h: 60 },
    defaultOptions: { steps: [{ id: "s1", label: "Step 1" }] },

    conformance: "display",
    priority: 50,
};
