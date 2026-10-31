/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 0ea2f8c8-70b8-4f9e-aea5-5347db4a80b9
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Flow Layout / CapabilityManifest
 * PURPOSE: Declares what Flow Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Flow Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker flowlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance (readiness step 4 L3, ADR-241): its
 * children are A2UI components, in order, wrapping onto new lines. No gesture
 * changes it, so it has no channel and no state.
 */
export const FLOWLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "flowlayout",
    factory: "createFlowLayout",
    factoryStyle: "options-first",
    label: "Flow Layout",
    icon: "bi-text-wrap",
    category: "layout",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Lay out many components in order that wrap onto new lines as space runs out, such as a set of "
            + "cards or chips, with gaps and alignment; give the children as a list of component ids.",
        avoidWhen: "For one row or column that never wraps use Row, Column or BoxLayout; for equal cells in fixed "
            + "columns use GridLayout.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-241).
    protocol: {
        children: { children: "many" },
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            onLayoutChange: "Fires when the host adds or removes a child or changes the direction, which an agent's "
                + "surface never does.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 5826, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 500, h: 300 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
