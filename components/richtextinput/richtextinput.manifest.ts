/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a137adb6-9a81-44ca-b704-84e79068fa0b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Rich Text Input / CapabilityManifest
 * PURPOSE: Declares what Rich Text Input can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Rich Text Input]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker richtextinput-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const RICHTEXTINPUT_MANIFEST: CapabilityManifest =
{
    name: "richtextinput",
    factory: "createRichTextInput",
    mountMethod: "show",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Rich Text Input",
    icon: "bi-text-paragraph",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 18900, mountCost: "light", holdsResources: false },

    defaultSize: { w: 300, h: 100 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
