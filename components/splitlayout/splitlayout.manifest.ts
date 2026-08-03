/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b9b7011b-d9f2-4897-9e7f-dc6914a7d98b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: SplitLayout / CapabilityManifest
 * PURPOSE: Declares what SplitLayout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[SplitLayout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker splitlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance. A layout container organises children
 * rather than carrying a value, so it is excluded from field semantics by
 * ADR-134 but still needs to mount and tear down cleanly (ADR-141).
 */
export const SPLITLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "splitlayout",
    factoryStyle: "options-first",
    factory: "createSplitLayout",
    label: "Split Layout",
    icon: "bi-layout-split",
    category: "layout",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 13299, mountCost: "light", holdsResources: false },

    defaultSize: { w: 480, h: 320 },
    defaultOptions: { panes: [], orientation: "horizontal" },

    conformance: "display",
    priority: 50,
};
