/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 3303c27b-324a-4c53-a05f-ba1cf86df9f4
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Symbol Picker / CapabilityManifest
 * PURPOSE: Declares what Symbol Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Symbol Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker symbolpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const SYMBOLPICKER_MANIFEST: CapabilityManifest =
{
    name: "symbolpicker",
    factory: "createSymbolPicker",
    label: "Symbol Picker",
    icon: "bi-emoji-smile",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 46327, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 320, h: 300 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
