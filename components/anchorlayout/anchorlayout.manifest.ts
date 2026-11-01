/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b2ab034d-7086-44fe-8e7e-a668bdedafa9
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Anchor Layout / CapabilityManifest
 * PURPOSE: Declares what Anchor Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Anchor Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker anchorlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * A child over A2UI (readiness step 4 L2, ADR-240). Closed, so the generator
 * can place ComponentId at `child`; the anchor fields are ordinary data.
 */
/** A pixel number or a CSS length. */
const LENGTH = { anyOf: [{ type: "number" }, { type: "string" }] };

const CHILDREN_SCHEMA = {
    type: "array",
    description: "The children, each pinned to the container's edges or centre.",
    items: {
        type: "object",
        description: "A child component with its anchor constraints. Offsets are pixels or a CSS length.",
        properties: {
            anchorTop: { ...LENGTH, description: "Offset from the top edge." },
            anchorBottom: { ...LENGTH, description: "Offset from the bottom edge." },
            anchorLeft: { ...LENGTH, description: "Offset from the left edge." },
            anchorRight: { ...LENGTH, description: "Offset from the right edge." },
            anchorCenterH: { ...LENGTH, description: "Centre horizontally, offset from the centre by this much." },
            anchorCenterV: { ...LENGTH, description: "Centre vertically, offset from the centre by this much." },
            minWidth: { ...LENGTH, description: "Minimum width." },
            maxWidth: { ...LENGTH, description: "Maximum width." },
            minHeight: { ...LENGTH, description: "Minimum height." },
            maxHeight: { ...LENGTH, description: "Maximum height." },
        },
        required: ["child"],
        additionalProperties: false,
    },
};

/**
 * Declared at `display` conformance (readiness step 4 L2, ADR-240): each child
 * is an A2UI component pinned by its anchors. No gesture changes the layout,
 * so it has no channel and no state.
 */
export const ANCHORLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "anchorlayout",
    factory: "createAnchorLayout",
    factoryStyle: "options-first",
    label: "Anchor Layout",
    icon: "bi-pin-angle",
    category: "layout",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Pin components to the edges or centre of an area, such as a badge in a corner over a chart or a "
            + "button bottom-right; give each child as a component id with its anchors.",
        avoidWhen: "For components in a row or column use Row, Column or BoxLayout; for a grid use FlexGridLayout.",
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
            onLayoutChange: "Fires when the host adds, removes or re-anchors a child, which an agent's surface never "
                + "does.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6733, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
