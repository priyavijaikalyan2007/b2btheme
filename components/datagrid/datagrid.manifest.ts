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
 */
export const DATAGRID_MANIFEST: CapabilityManifest =
{
    name: "datagrid",
    factory: "createDataGrid",
    label: "Data Grid",
    icon: "bi-table",
    category: "data",

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
    ],

    accepts: [
        { name: "rows", payload: "collection", required: true },
    ],

    actions: [
        { id: "export", label: "Export CSV", icon: "bi-download", destructive: false, requires: [] },
    ],

    stateKeys: ["sort", "page", "pageSize", "selection"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 33_889, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 250 },

    // `columns` is required by the constructor, so the defaults must carry a
    // usable pair for the grid to mount at all with no host-supplied options.
    defaultOptions: {
        columns: [
            { id: "id", label: "ID" },
            { id: "name", label: "Name" },
        ],
        rows: [
            { id: "r1", data: { id: "r1", name: "One" } },
            { id: "r2", data: { id: "r2", name: "Two" } },
        ],
    },

    conformance: "surface",
    priority: 70,
};
