/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 536f580d-7ec1-447a-ab29-2b3d11afd16c
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Dock Layout / CapabilityManifest
 * PURPOSE: Declares what Dock Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Dock Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker docklayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance (readiness step 4 L3, ADR-241, user
 * decision): its five slots and centre hold A2UI components, as elements that
 * size to their content. Over A2UI it fills the adapter's box (protocol.fixed),
 * not the window. A slot's collapse and resize integration needs a docked
 * component's handle, so it stays the host's, and no gesture reaches an agent.
 */
export const DOCKLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "docklayout",
    factory: "createDockLayout",
    factoryStyle: "options-only",
    containerOption: "container",
    containerAs: "element",
    label: "Dock Layout",
    icon: "bi-grid-1x2",
    category: "layout",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Arrange an application-style area: a toolbar on top, sidebars left and right, a bottom panel and a "
            + "status bar around the main content; give each slot's content as a component id.",
        avoidWhen: "For a header, footer and sidebars without the extra rows use BorderLayout; for panels the user "
            + "resizes use SplitLayout.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-241).
    protocol: {
        children: { toolbar: "one", leftSidebar: "one", rightSidebar: "one", bottomPanel: "one", statusBar: "one",
            content: "one" },
        fixed: { height: "100%", width: "100%" },
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            onLayoutChange: "Fires as a docked component resizes or collapses; an agent's children are elements that "
                + "do neither.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 10061, mountCost: "light", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
