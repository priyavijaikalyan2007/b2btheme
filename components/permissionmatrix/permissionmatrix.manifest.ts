/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b68789a7-0442-4e9a-b709-20d9bc1ac3a5
 * Created: 2026-10-10
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Permission Matrix / CapabilityManifest
 * PURPOSE: Declares what Permission Matrix can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Permission Matrix]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker permissionmatrix-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 3, #23): its edits, bulk
 * edits, export and reset emit through an additive on(), the agent can
 * replace the roles, groups or cells in place, and the user's unsaved edits,
 * the expanded groups and the filter are its state, restored silently.
 */
export const PERMISSIONMATRIX_MANIFEST: CapabilityManifest =
{
    name: "permissionmatrix",
    factory: "createPermissionMatrix",
    factoryStyle: "options-first",
    label: "Permission Matrix",
    icon: "bi-grid-3x3-gap",
    category: "governance",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user review and edit which roles hold which permissions, as a grid of roles by grouped "
            + "permissions; you hear each edit, and Reset discards the unsaved edits.",
        avoidWhen: "For a table of arbitrary records use DataGrid; for one yes-or-no setting use ChoicePicker; "
            + "rewriting cells drops the user's unsaved edits, so include the ones you accepted.",
    },

    affords: [
        {
            shape: "collection",
            intents: ["edit", "compare", "inspect"],
            cardinality: { min: 0, max: 5000 },
            minViewport: { w: 420, h: 240 },
        },
    ],

    emits: [
        { name: "change", payload: "record", multi: false, legacyOption: "onChange" },
        { name: "bulkchange", payload: "record", multi: false, legacyOption: "onBulkChange" },
        { name: "export", payload: "record", multi: false, legacyOption: "onExport" },
        { name: "reset", payload: "scalar", multi: false, legacyOption: "onReset" },
    ],

    // The data an agent rewrites, replaced in place (ADR-234): a new cells is a new baseline.
    accepts: [
        { name: "roles", payload: "collection", required: true },
        { name: "groups", payload: "collection", required: true },
        { name: "cells", payload: "collection", required: true },
    ],
    actions: [],
    stateKeys: ["changes", "expandedGroups", "filter"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 3).
    protocol: {
        hostOnly: {
            cellRenderer: "Returns DOM elements for each cell; an agent cannot supply host code.",
            "roles[].data": "Arbitrary host data for callbacks; it has no schema an agent could follow.",
            "groups[].permissions[].data": "Arbitrary host data for callbacks; it has no schema an agent could "
                + "follow.",
        },
    },

    regions: ["permissionmatrix:grid"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 17605, mountCost: "light", holdsResources: false },

    defaultSize: { w: 820, h: 420 },
    defaultOptions: { roles: [], groups: [], cells: [] },

    conformance: "surface",
    priority: 50,
};
