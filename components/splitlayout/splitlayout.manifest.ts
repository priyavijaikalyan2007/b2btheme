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
 * A pane over A2UI (readiness step 4 L1, ADR-239). Closed, so the generator
 * can place ComponentId at `content`; a pane's content is a component id.
 */
const PANES_SCHEMA = {
    type: "array",
    description: "The panes, in order. Give at least two.",
    items: {
        type: "object",
        description: "A pane holding one component.",
        properties: {
            id: { type: "string", description: "Unique pane id." },
            initialSize: {
                anyOf: [{ type: "number" }, { type: "string" }],
                description: "Initial size: pixels as a number, or a string such as \"30%\" or \"1fr\".",
            },
            minSize: { type: "number", description: "Minimum pane size in pixels." },
            maxSize: { type: "number", description: "Maximum pane size in pixels." },
            collapsible: { type: "boolean", description: "Whether the user can collapse the pane." },
            collapsed: { type: "boolean", description: "Whether the pane starts collapsed." },
        },
        required: ["id"],
        additionalProperties: false,
    },
};

/**
 * Declared at `surface` conformance (readiness step 4 L1, ADR-239): each pane
 * holds an A2UI component, dragging a divider and collapsing a pane emit
 * through an additive on(), and the orientation, sizes and collapsed panes
 * are its state. setState keeps firing onResize for hosts; only the channels
 * are silenced.
 */
export const SPLITLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "splitlayout",
    factoryStyle: "options-first",
    factory: "createSplitLayout",
    label: "Split Layout",
    icon: "bi-layout-split",
    category: "layout",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show components side by side or one above another in panes the user resizes by dragging the "
            + "dividers and can collapse; give each pane's content as a component id.",
        avoidWhen: "For titled panels in a stack use StackLayout; for a header, footer and sidebars around a main "
            + "area use BorderLayout.",
    },

    affords: [],

    emits: [
        { name: "resize", payload: "record", multi: false, legacyOption: "onResize" },
        { name: "collapse", payload: "record", multi: false, legacyOption: "onCollapse" },
    ],

    accepts: [],
    actions: [],
    stateKeys: ["orientation", "sizes", "collapsed"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-239).
    protocol: {
        children: { "panes[].content": "one" },
        schemas: { panes: PANES_SCHEMA },
        hostOnly: {
            persistKey: "A localStorage key on the host's origin, which the component reads and overwrites; an agent "
                + "must not choose which of the host's stored entries that is.",
            onDividerDblClick: "A double-click on a divider collapses the pane, which the collapse event already "
                + "reports.",
        },
    },

    regions: ["splitlayout:pane"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 13299, mountCost: "light", holdsResources: false },

    defaultSize: { w: 480, h: 320 },
    defaultOptions: { panes: [], orientation: "horizontal" },

    conformance: "surface",
    priority: 50,
};
