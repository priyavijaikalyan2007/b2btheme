/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 958ae449-8941-4cdc-81ec-ab20d33cb6a6
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Tree Grid / CapabilityManifest
 * PURPOSE: Declares what Tree Grid can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Tree Grid]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker treegrid-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B6): selection,
 * activation, cell edits, context-menu actions and drops emit through an
 * additive on(), expanded and selected rows restore through getState(), and
 * lazy children are a provider the agent answers (ADR-225).
 */
export const TREEGRID_MANIFEST: CapabilityManifest =
{
    name: "treegrid",
    factory: "createTreeGrid",
    containerOption: "containerId",
    containerAs: "id",
    factoryStyle: "options-only",
    label: "Tree Grid",
    icon: "bi-diagram-3",
    category: "data",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a hierarchy of rows with data columns that the user can expand, select, edit, act on and "
            + "rearrange; the agent can load children on demand.",
        avoidWhen: "For a flat table use DataGrid; for a hierarchy of labels without columns use TreeView.",
    },

    affords: [
        {
            shape: "hierarchy",
            intents: ["browse", "compare"],
            cardinality: { min: 2, max: 50000 },
            minViewport: { w: 320, h: 200 },
        },
    ],
    emits: [
        { name: "selection", payload: "collection", multi: true, legacyOption: "onSelectionChange" },
        { name: "activate", payload: "record", multi: false, legacyOption: "onRowActivate" },
        { name: "editCommit", payload: "record", multi: false, legacyOption: "onEditCommit" },
        { name: "contextMenuAction", payload: "record", multi: false, legacyOption: "onContextMenuAction" },
        { name: "drop", payload: "record", multi: false, legacyOption: "onDrop" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["expanded", "selection"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-225, readiness step 2 B6).
    protocol: {
        providers: {
            // A node's children, one node at a time, in order.
            onLoadChildren: { request: "loadChildren", concurrency: "queue" },
        },
        hostOnly: {
            "nodes[].data": "Column values keyed by column id, shown as text; typed as an open record, so no schema "
                + "checks the values.",
            "columns[].comparator": "A sort function; the default comparison applies over A2UI.",
            "columns[].valueAccessor": "A function that reads a cell's value; over A2UI cells read nodes[].data.",
            "columns[].renderer": "A render function; the default cell rendering applies over A2UI.",
            "columns[].aggregate": "An aggregate function; over A2UI the column shows no aggregate.",
            onRowSelect: "Fires per row; the selection event carries the whole selection.",
            onRowToggle: "Fires as the user expands or collapses a row; that is view state, restored through expanded.",
            onColumnResize: "Fires as the user resizes a column; that is view state, not information for an agent.",
            onColumnReorder: "Fires as the user reorders columns; that is view state, not information for an agent.",
            onColumnSort: "Fires as the user sorts a column; that is view state, not information for an agent.",
            onEditStart: "Decides whether an edit may start, which an agent round trip cannot answer in time; every "
                + "editable cell may be edited.",
            onEditCancel: "Fires when the user abandons an edit; nothing changed, so nothing for an agent.",
            onDragValidate: "Decides whether a drop is allowed, which an agent round trip cannot answer in time; every "
                + "drop is allowed.",
            onExternalDrop: "Receives a browser DataTransfer from outside the grid, which JSON cannot carry.",
            onRefreshComplete: "Fires when a refresh finishes; a lifecycle signal, not information for an agent.",
        },
    },

    regions: ["treegrid:body"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 48200, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 350, h: 300 },
    // rows was never a TreeGrid option; the schema check caught it (readiness step 2 B6).
    defaultOptions: { columns: [], nodes: [] },

    conformance: "surface",
    priority: 50,
};
