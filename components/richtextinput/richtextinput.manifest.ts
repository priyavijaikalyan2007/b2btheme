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
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
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

    regions: ["richtextinput:editable"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 18900, mountCost: "light", holdsResources: false },

    defaultSize: { w: 300, h: 100 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
