/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e33d126d-aca3-4662-bebc-9cc6c52e7846
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: People Picker / CapabilityManifest
 * PURPOSE: Declares what People Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[People Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker peoplepicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const PEOPLEPICKER_MANIFEST: CapabilityManifest =
{
    name: "peoplepicker",
    factory: "createPeoplePicker",
    label: "People Picker",
    icon: "bi-people",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 18910, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 40 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
