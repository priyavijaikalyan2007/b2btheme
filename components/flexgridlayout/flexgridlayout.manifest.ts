/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 73cd9e18-aeac-4109-bad1-867496be246d
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Flex Grid Layout / CapabilityManifest
 * PURPOSE: Declares what Flex Grid Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Flex Grid Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker flexgridlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * A cell over A2UI (readiness step 4 L2, ADR-240). Closed, so the generator
 * can place ComponentId at `child`; the placement fields are ordinary data.
 */
const CELLS_SCHEMA = {
    type: "array",
    description: "The cells, each placing one component in the grid.",
    items: {
        type: "object",
        description: "A child component and where it sits in the grid.",
        properties: {
            column: { type: "number", description: "0-based column index." },
            row: { type: "number", description: "0-based row index." },
            columnSpan: { type: "number", description: "Number of columns to span. Default: 1." },
            rowSpan: { type: "number", description: "Number of rows to span. Default: 1." },
            alignSelf: { enum: ["start", "center", "end", "stretch"],
                description: "Block-axis alignment in the cell." },
            justifySelf: { enum: ["start", "center", "end", "stretch"],
                description: "Inline-axis alignment in the cell." },
        },
        required: ["child", "column", "row"],
        additionalProperties: false,
    },
};

/**
 * Declared at `display` conformance (readiness step 4 L2, ADR-240): each cell
 * holds an A2UI component. No gesture changes the grid, so it has no channel
 * and no state; a rebuild no longer carries its tracks back (ADR-240).
 */
export const FLEXGRIDLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "flexgridlayout",
    factory: "createFlexGridLayout",
    factoryStyle: "options-first",
    label: "Flex Grid Layout",
    icon: "bi-grid",
    category: "layout",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Place components on a grid of CSS column and row tracks, with spans, such as a dashboard of tiles; "
            + "give each cell's content as a component id with its column and row.",
        avoidWhen: "For one row or column use Row, Column or BoxLayout; for components that wrap onto new lines use "
            + "Row.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-240).
    protocol: {
        children: { "cells[].child": "one" },
        schemas: { cells: CELLS_SCHEMA },
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            onLayoutChange: "Fires when the host changes the cells or tracks, or the grid is resized; none of that is "
                + "information for an agent.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 5870, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: { areas: [], columns: [], rows: [] },

    conformance: "display",
    priority: 50,
};
