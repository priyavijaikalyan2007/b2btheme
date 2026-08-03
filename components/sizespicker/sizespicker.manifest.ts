/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2a3b0d69-9a94-422b-b70d-baba7855f73b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Sizes Picker / CapabilityManifest
 * PURPOSE: Declares what Sizes Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Sizes Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sizespicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const SIZESPICKER_MANIFEST: CapabilityManifest =
{
    name: "sizespicker",
    factory: "createSizesPicker",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Sizes Picker",
    icon: "bi-rulers",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 8994, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 40 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
