/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 666c2b91-c6d2-4fe7-b977-fd1d532fe78b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Graph Canvas / CapabilityManifest
 * PURPOSE: Declares what Graph Canvas can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Graph Canvas]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker graphcanvas-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B9): clicks, selection,
 * edge creation and expand requests emit through an additive on(); nodes and
 * edges are slots updated in place through the overloaded setData (B9-2), and
 * the selection is its state.
 */
export const GRAPHCANVAS_MANIFEST: CapabilityManifest =
{
    name: "graphcanvas",
    factory: "createGraphCanvas",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Graph Canvas",
    icon: "bi-share",
    category: "data",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show nodes and the relationships between them as an interactive graph the user can zoom, select "
            + "and expand; rewrite nodes and edges to change it in place.",
        avoidWhen: "For a hierarchy of items use TreeView; for a flowchart the user draws use DiagramEngine.",
    },

    affords: [
        {
            shape: "graph",
            intents: ["relate", "browse", "author"],
            cardinality: { min: 2, max: 5000 },
            minViewport: { w: 360, h: 260 },
        },
    ],
    emits: [
        { name: "nodeClick", payload: "record", multi: false, legacyOption: "onNodeClick" },
        { name: "nodeDoubleClick", payload: "record", multi: false, legacyOption: "onNodeDoubleClick" },
        { name: "edgeClick", payload: "record", multi: false, legacyOption: "onEdgeClick" },
        { name: "selection", payload: "record", multi: false, legacyOption: "onSelectionChange" },
        { name: "edgeCreated", payload: "record", multi: false, legacyOption: "onEdgeCreated" },
        { name: "expandRequest", payload: "scalar", multi: false, legacyOption: "onExpandRequest" },
    ],
    // The user's decision B9-2: the agent rewrites the graph in place, keeping zoom, pan and selection.
    accepts: [
        { name: "nodes", payload: "collection", required: false },
        { name: "edges", payload: "collection", required: false },
    ],
    actions: [],
    stateKeys: ["selection"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B9).
    protocol: {
        hostOnly: {
            onNodeHover: "Fires as the pointer enters and leaves a node; hover is not information for an agent.",
            onEdgeHover: "Fires as the pointer enters and leaves an edge; hover is not information for an agent.",
            onLayoutComplete: "Fires when a layout settles; a lifecycle signal, not information for an agent.",
            renderNodeTooltip: "A render hook; the built-in hover card applies instead.",
            renderEdgeTooltip: "A render hook; the built-in hover card applies instead.",
            "nodes[].properties": "An open record of extra fields; it has no schema an agent could follow.",
            "edges[].properties": "An open record of extra fields; it has no schema an agent could follow.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 33075, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 500, h: 400 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
