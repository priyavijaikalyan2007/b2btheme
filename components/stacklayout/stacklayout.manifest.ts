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
 * A panel as an agent writes it (readiness step 4): content is the id of the
 * component it holds, which the generator puts at panels[].content as A2UI's
 * ComponentId (protocol.children, ADR-238).
 */
const PANELS_SCHEMA = {
    type: "array",
    description: "The panels, in order.",
    items: {
        type: "object",
        description: "A titled panel holding one component.",
        properties: {
            id: { type: "string", description: "Unique panel id." },
            title: { type: "string", description: "Title shown in the panel header." },
            icon: { type: "string", description: "Bootstrap Icons class for the header, such as \"bi-list\"." },
            collapsed: { type: "boolean", description: "Whether the panel starts collapsed. Default: false." },
            collapsible: { type: "boolean", description: "Whether the panel can be collapsed. Default: true." },
            minHeight: { type: "number", description: "Minimum panel height in pixels. Default: 50." },
        },
        required: ["id", "title", "content"],
        additionalProperties: false,
    },
};

/**
 * Declared at `surface` conformance (readiness step 4 L0, #24, ADR-238): each
 * panel holds an A2UI component, its resizes and collapses emit through an
 * additive on(), and its sizes and collapsed panels are its state, restored
 * silently. `containerAs: "element"` because `StackLayoutOptions.container`
 * is an HTMLElement.
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

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Stack other components in titled panels the user can collapse and resize, one above another or "
            + "side by side; give each panel's content as a component id.",
        avoidWhen: "For panels the user switches between use Tabs; for one framed component use Card.",
    },

    affords: [],

    emits: [
        { name: "resize", payload: "collection", multi: false, legacyOption: "onResize" },
        { name: "collapse", payload: "record", multi: false, legacyOption: "onCollapse" },
    ],

    accepts: [],
    actions: [],
    stateKeys: ["sizes", "collapsed"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-238).
    protocol: {
        children: { "panels[].content": "one" },
        schemas: { panels: PANELS_SCHEMA },
    },

    regions: ["stacklayout:content"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6158, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 360, h: 480 },
    defaultOptions: { panels: [] },

    conformance: "surface",
    priority: 50,
};
