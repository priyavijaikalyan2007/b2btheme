/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: fef69c85-a69b-4f86-a94e-36f98c011979
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Border Layout / CapabilityManifest
 * PURPOSE: Declares what Border Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Border Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker borderlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance (readiness step 4 L1, ADR-239): each
 * region holds an A2UI component. No gesture collapses a region (only the
 * host's `collapseRegion()` does), so the layout has no channel, and a rebuild
 * carries its collapsed regions through its own getState/setState.
 */
export const BORDERLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "borderlayout",
    factory: "createBorderLayout",
    factoryStyle: "options-first",
    label: "Border Layout",
    icon: "bi-border-outer",
    category: "layout",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Arrange components around a main area: a header above, a footer below, sidebars left and right, "
            + "and the main content in the center; give each region's content as a component id.",
        avoidWhen: "For panels the user resizes use SplitLayout; for one column or row of components use Column or "
            + "Row.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-239).
    protocol: {
        children: { north: "one", south: "one", east: "one", west: "one", center: "one" },
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            collapsible: "Regions collapse only through the host's collapseRegion(); no gesture collapses one, so an "
                + "agent's setting would do nothing.",
            onLayoutChange: "Fires when the host sets or collapses a region, which an agent's surface never does.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6030, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
