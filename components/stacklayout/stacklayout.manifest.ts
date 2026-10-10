/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 185a21ad-d5dd-4c6f-b1c5-931397e00232
 * Created: 2026-10-10
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Stack Layout / CapabilityManifest
 * PURPOSE: Declares what Stack Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Stack Layout]], [[SplitLayout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker stacklayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down. Promotion to `field` or `surface` is a change to the
 * component's own public API, not to this file, and the conformance suite
 * proves the level rather than taking its word for it.
 *
 * `containerAs: "element"` because `StackLayoutOptions.container` is an
 * HTMLElement. The fleet varies on this and guessing wrong renders nothing.
 */
export const STACKLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "stacklayout",
    factory: "createStackLayout",
    factoryStyle: "options-only",
    containerOption: "container",
    containerAs: "element",
    label: "Stack Layout",
    icon: "bi-layout-three-columns",
    category: "layout",

    // A layout affords no data shape of its own: it holds whatever panels the
    // host puts in it. Declaring a shape here would make the resolver offer a
    // container in answer to a question about content.
    affords: [],

    emits: [
        { name: "resize", payload: "collection", multi: false, legacyOption: "onResize" },
        { name: "collapse", payload: "record", multi: false, legacyOption: "onCollapse" },
    ],

    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6158, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 360, h: 480 },
    defaultOptions: { panels: [] },

    conformance: "display",
    priority: 50,
};
