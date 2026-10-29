/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e039a169-5c15-453e-a45c-8a7d18d1d504
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DataGrid / CapabilityManifest
 * 📜 PURPOSE: Declares what DataGrid can render, emit, and accept, so the
 *    Dynamic UI canvas can resolve, mount, wire, and budget it. See ADR-142.
 * 🔗 RELATES: [[DataGrid]], [[DynamicUIRuntime]], [[Resolver]], [[Wiring]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker datagrid-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * DataGrid is the canonical `surface` component — the thing a canvas reaches
 * for when the user wants to look at a collection of records.
 *
 * Channel payloads deliberately differ from their legacy callbacks:
 * `onRowSelect` keeps its historical contract of row IDs, while the
 * `selection` channel carries whole records, because a binding into an
 * inspector wants the record and the `toIds` transform covers the other
 * direction. Existing consumers see no change, which is the point.
 *
 * Over agent protocols (readiness step 2 B6): an applied cell edit also emits
 * "cellEdit"; export, column layout and filtering stay with the host.
 */
export const DATAGRID_MANIFEST: CapabilityManifest =
{
    name: "datagrid",
    factory: "createDataGrid",
    factoryStyle: "options-first",
    label: "Data Grid",
    icon: "bi-table",
    category: "data",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show rows of records in sortable, pageable columns the user can select, open and edit; the agent "
            + "hears each.",
        avoidWhen: "For a hierarchy of rows use TreeGrid; for a short list of items use List.",
    },

    affords: [
        {
            shape: "collection",
            intents: ["browse", "compare", "edit"],
            cardinality: { min: 2, max: 100_000 },
            density: { min: 2, max: 60 },
            minViewport: { w: 320, h: 200 },
        },
    ],

    emits: [
        { name: "selection", payload: "record", multi: true, legacyOption: "onRowSelect" },
        { name: "sort", payload: "record", multi: false, legacyOption: "onSort" },
        { name: "page", payload: "record", multi: false, legacyOption: "onPageChange" },
        { name: "activate", payload: "record", multi: false, legacyOption: "onRowDoubleClick" },
        { name: "cellEdit", payload: "record", multi: false, legacyOption: "onCellEdit" },
    ],

    accepts: [
        { name: "rows", payload: "collection", required: true },
    ],

    actions: [
        { id: "export", label: "Export CSV", icon: "bi-download", destructive: false, requires: [] },
    ],

    stateKeys: ["sort", "page", "pageSize", "selection"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B6).
    protocol: {
        hostOnly: {
            "columns[].renderer": "A render function; the default cell rendering applies over A2UI.",
            "columns[].comparator": "A sort function; the default comparison applies over A2UI.",
            "columns[].aggregate": "An aggregate function; over A2UI the footer shows no aggregate for the column.",
            "rows[].data": "An arbitrary payload for host code; it has no schema an agent could follow.",
            emptyStateOptions: "Typed as an open record, so it has no schema an agent could follow. The default empty "
                + "message applies.",
            onFilter: "Fires as the user filters the visible rows; that is view state, not information for an agent.",
            onRowClick: "Fires on a single click, which selects; the selection event carries the row.",
            onColumnResize: "Fires as the user resizes a column; that is view state, not information for an agent.",
            onColumnReorder: "Fires as the user reorders columns; that is view state, not information for an agent.",
            onExport: "Writes a file in the user's browser; an agent cannot receive it.",
        },
        hostOnlyActions: {
            export: "Writes a file in the user's browser; an agent cannot receive it.",
        },
    },

    regions: ["datagrid:scroll-container"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 33_889, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 250 },

    // Genuinely shipped defaults: a host supplying nothing gets an empty
    // grid, never placeholder rows. Mount fixtures live in the glue file.
    defaultOptions: { columns: [] },

    conformance: "surface",
    priority: 70,
};
