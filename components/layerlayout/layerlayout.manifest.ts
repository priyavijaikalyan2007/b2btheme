/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 64ce6274-4f25-4d7b-b8ce-949e81a50bbe
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Layer Layout / CapabilityManifest
 * PURPOSE: Declares what Layer Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Layer Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker layerlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * A layer over A2UI (readiness step 4 L2, ADR-240). Closed, so the generator
 * can place ComponentId at `child`; the placement fields are ordinary data.
 */
const LAYERS_SCHEMA = {
    type: "array",
    description: "The layers, bottom to top.",
    items: {
        type: "object",
        description: "A child component stacked over the ones before it.",
        properties: {
            key: { type: "string", description: "Optional layer key." },
            anchor: {
                type: "object",
                description: "Offsets from the container's edges, as CSS lengths.",
                properties: {
                    top: { type: "string", description: "Offset from the top edge." },
                    right: { type: "string", description: "Offset from the right edge." },
                    bottom: { type: "string", description: "Offset from the bottom edge." },
                    left: { type: "string", description: "Offset from the left edge." },
                },
                additionalProperties: false,
            },
            align: {
                enum: ["top-left", "top-center", "top-right", "center-left", "center", "center-right",
                    "bottom-left", "bottom-center", "bottom-right"],
                description: "Where the layer sits in the container.",
            },
            zIndex: { type: "number", description: "Stacking order within the layout." },
            fill: { type: "boolean", description: "Whether the layer fills the whole container." },
        },
        required: ["child"],
        additionalProperties: false,
    },
};

/**
 * Declared at `display` conformance (readiness step 4 L2, ADR-240): each layer
 * holds an A2UI component, clipped to the layout's box. No gesture changes
 * it, so it has no channel and no state; a rebuild no longer carries its
 * sizing back (ADR-240).
 */
export const LAYERLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "layerlayout",
    factory: "createLayerLayout",
    factoryStyle: "options-first",
    label: "Layer Layout",
    icon: "bi-layers",
    category: "layout",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Stack components on top of each other in the same area, such as a caption or legend over an image "
            + "or chart; give each layer's content as a component id with its alignment.",
        avoidWhen: "To pin small items to edges without stacking use AnchorLayout; to show one at a time use "
            + "CardLayout.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-240).
    protocol: {
        children: { "layers[].child": "one" },
        schemas: { layers: LAYERS_SCHEMA },
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            onLayoutChange: "Fires when the host adds or removes a layer, which an agent's surface never does.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 5390, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
