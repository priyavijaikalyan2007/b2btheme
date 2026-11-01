/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 5219fa9d-dce6-4852-afff-5d3b7721095e
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Box Layout / CapabilityManifest
 * PURPOSE: Declares what Box Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Box Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker boxlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * A child over A2UI (readiness step 4 L2, ADR-240). Closed, so the generator
 * can place ComponentId at `child`; the flex fields are ordinary data.
 */
const CHILDREN_SCHEMA = {
    type: "array",
    description: "The children, in order along the main axis.",
    items: {
        type: "object",
        description: "A child component with how it sizes along the main axis.",
        properties: {
            flex: { type: "number", description: "Flex grow factor; 0, the default, keeps the natural size." },
            minSize: { type: "number", description: "Minimum size in pixels along the main axis." },
            maxSize: { type: "number", description: "Maximum size in pixels along the main axis." },
            alignSelf: { enum: ["start", "center", "end", "stretch", "baseline"],
                description: "Cross-axis alignment for this child." },
        },
        required: ["child"],
        additionalProperties: false,
    },
};

/**
 * Declared at `display` conformance (readiness step 4 L2, ADR-240): each child
 * is an A2UI component. No gesture changes the layout, so it has no channel
 * and no state; a rebuild no longer carries its direction back (ADR-240).
 */
export const BOXLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "boxlayout",
    factory: "createBoxLayout",
    factoryStyle: "options-first",
    label: "Box Layout",
    icon: "bi-distribute-horizontal",
    category: "layout",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Lay components out in a row or column where some grow to fill the space and others keep their size, "
            + "with limits; give each child as a component id with its flex.",
        avoidWhen: "For a plain row or column use Row or Column; for panels the user resizes use SplitLayout.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-240).
    protocol: {
        children: { "children[].child": "one" },
        schemas: { children: CHILDREN_SCHEMA },
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            onLayoutChange: "Fires when the host adds or removes a child or changes the direction, which an agent's "
                + "surface never does.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 5576, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 400, h: 200 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
