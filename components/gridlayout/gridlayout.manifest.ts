/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 9f57756a-9253-4f0a-954f-660403409569
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Grid Layout / CapabilityManifest
 * PURPOSE: Declares what Grid Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Grid Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker gridlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance (readiness step 4 L3, ADR-241): its
 * children are A2UI components, one per cell, in order. No gesture changes
 * it, so it has no channel and no state.
 */
export const GRIDLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "gridlayout",
    factory: "createGridLayout",
    factoryStyle: "options-first",
    label: "Grid Layout",
    icon: "bi-grid-3x3",
    category: "layout",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show components in equal cells, a set number of columns or as many as fit (columns \"auto\"), "
            + "optionally square, such as a gallery; give the children as a list of component ids.",
        avoidWhen: "For cells of different sizes or spans use FlexGridLayout; for items that wrap at their own width "
            + "use FlowLayout.",
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
            onLayoutChange: "Fires when the columns are recalculated or the host adds or removes a child; none of "
                + "that is information for an agent.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6464, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 500, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
