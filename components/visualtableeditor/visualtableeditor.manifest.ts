/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2ac37150-93fb-4b14-b3b7-c63f3edd6ae0
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Table Editor / CapabilityManifest
 * PURPOSE: Declares what Table Editor can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Table Editor]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker visualtableeditor-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the table is the two-way value (readiness
 * step 2 B6). Its finer-grained callbacks stay with the host, since the value
 * carries every edit.
 */
export const VISUALTABLEEDITOR_MANIFEST: CapabilityManifest =
{
    name: "visualtableeditor",
    factory: "createVisualTableEditor",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Table Editor",
    icon: "bi-table",
    category: "data",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user edit a table of text cells, with rows, columns, merges and styling; the edited table "
            + "comes back as the value.",
        avoidWhen: "For rows of typed records use DataGrid; for a form use DynamicFormSwitcher.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B6).
    protocol: {
        hostOnly: {
            onCellChange: "Fires per cell; the two-way value already carries the table.",
            onStyleChange: "Fires per style change; the two-way value already carries the table.",
            onStructureChange: "Fires per row or column change; the two-way value already carries the table.",
            onModeChange: "Fires as the user switches between editing and viewing; that is view state, not "
                + "information for an agent.",
            onHeaderClick: "Fires on a header click with the mouse event; the editor handles the gesture itself.",
            onHeaderContextMenu: "Fires on a header right-click with the mouse event; the editor shows its own menu.",
            onSelectionChange: "Fires as the user selects cells; that is view state, not information for an agent.",
            onAggregateChange: "Follows from the table, which the two-way value already carries.",
        },
    },

    regions: ["visualtableeditor:table-container"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 40341, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 300, h: 150 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
