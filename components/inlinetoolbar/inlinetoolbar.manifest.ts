/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2e2ffee8-da86-4869-9d96-8d30a8fb01ae
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Inline Toolbar / CapabilityManifest
 * PURPOSE: Declares what Inline Toolbar can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Inline Toolbar]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker inlinetoolbar-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B5): a click emits
 * "itemClick" through an additive on(). Nothing to restore (ADR-229).
 */
export const INLINETOOLBAR_MANIFEST: CapabilityManifest =
{
    name: "inlinetoolbar",
    factory: "createInlineToolbar",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Inline Toolbar",
    icon: "bi-wrench",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a compact row of icon buttons and toggles, such as text formatting; the agent hears which one "
            + "the user pressed.",
        avoidWhen: "For a single action use Button; for a choice among options use ChoicePicker.",
    },

    affords: [],
    emits: [
        { name: "itemClick", payload: "record", multi: false },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B5).
    protocol: {
        hostOnly: {
            "items[].onClick": "A per-item callback; over A2UI the itemClick event carries the item's id and active "
                + "state.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 2507, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 300, h: 32 },
    defaultOptions: { items: [] },

    conformance: "surface",
    priority: 50,
};
