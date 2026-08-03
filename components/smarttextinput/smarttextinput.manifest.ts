/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 3d9f2bc4-35e8-4b19-a732-e41bb515e82a
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Smarttextinput / CapabilityManifest
 * PURPOSE: Declares what Smarttextinput can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Smarttextinput]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker smarttextinput-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const SMARTTEXTINPUT_MANIFEST: CapabilityManifest =
{
    name: "smarttextinput",
    factory: "createSmartTextInput",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Smarttextinput",
    icon: "bi-square",
    category: "misc",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 19411, mountCost: "light", holdsResources: false },

    defaultSize: { w: 320, h: 240 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
