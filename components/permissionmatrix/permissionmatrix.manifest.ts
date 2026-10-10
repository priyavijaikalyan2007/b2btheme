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
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down. Promotion to `field` or `surface` is a change to the
 * component's own public API, not to this file, and the conformance suite
 * proves the level rather than taking its word for it.
 *
 * Three required options — `roles`, `groups`, `cells` — which is why the seed
 * called the shape undetermined. They are empty in defaultOptions and real only
 * in the conformance fixture: an access-control grid is the last place to ship
 * placeholder rows.
 */
export const PERMISSIONMATRIX_MANIFEST: CapabilityManifest =
{
    name: "permissionmatrix",
    factory: "createPermissionMatrix",
    factoryStyle: "options-first",
    label: "Permission Matrix",
    icon: "bi-grid-3x3-gap",
    category: "governance",

    affords: [
        {
            shape: "collection",
            intents: ["edit", "compare", "inspect"],
            // Cells, not roles: a 50x100 grid is already at the ceiling.
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

    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 17605, mountCost: "light", holdsResources: false },

    defaultSize: { w: 820, h: 420 },
    defaultOptions: { roles: [], groups: [], cells: [] },

    conformance: "display",
    priority: 50,
};
