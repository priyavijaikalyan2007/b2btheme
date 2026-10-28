/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 4b9e0066-7728-4e71-87c8-f65e064e450b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Tree View / CapabilityManifest
 * PURPOSE: Declares what Tree View can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Tree View]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker treeview-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance: it emits selection and activate, accepts
 * roots, and restores expanded and selection. Its lazy loader and server-side
 * search are providers an A2UI agent answers (ADR-225).
 */
export const TREEVIEW_MANIFEST: CapabilityManifest =
{
    name: "treeview",
    factory: "createTreeView",
    containerOption: "containerId",
    containerAs: "id",
    factoryStyle: "options-only",
    label: "Tree View",
    icon: "bi-list-nested",
    category: "data",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a hierarchy the user browses, expands and selects from, such as folders or categories.",
        avoidWhen: "For a flat list without nesting use List; to pick one or more options use ChoicePicker.",
    },

    affords: [
        {
            shape: "hierarchy",
            intents: ["browse", "navigate", "inspect"],
            cardinality: { min: 1, max: 20_000 },
            minViewport: { w: 220, h: 200 },
        },
    ],

    emits: [
        { name: "selection", payload: "record", multi: true, legacyOption: "onSelectionChange" },
        { name: "activate", payload: "record", multi: false, legacyOption: "onActivate" },
    ],

    accepts: [
        { name: "roots", payload: "hierarchy", required: true },
    ],

    actions: [],
    stateKeys: ["expanded", "selection"],

    // How TreeView appears to agent protocols (ADR-219, ADR-225).
    protocol: {
        providers: {
            onLoadChildren: { request: "loadChildren", concurrency: "queue" },
            onSearchAsync: { request: "search" },
        },
        hostOnly: {
            onSelect: "Per-node selection changes; the selection channel already reports the selected nodes.",
            onToggle: "Expand and collapse are view state, restored through the expanded state key.",
            onRename: "Returns an accept-or-reject decision synchronously with the edit; an agent round trip cannot.",
            onStarToggle: "Takes two parameters and has no channel; starring stays a host feature for now.",
            onDragValidate: "Returns a drop decision while the pointer moves; an agent round trip cannot sit there.",
            onDrop: "Drag-and-drop restructuring takes three parameters and is a host editing feature.",
            onExternalDrop: "Receives a browser DataTransfer, which JSON cannot carry.",
            onContextMenuAction: "Takes two parameters and has no channel; context menus stay a host feature for now.",
            onRefreshComplete: "Fires after the host's own programmatic refresh; it tells an agent nothing.",
            onSortModeChange: "Sort mode is view state the user sets in the toolbar.",
            onCollapseStateChange: "Aggregate expand and collapse is view state, not information for an agent.",
            sortComparator: "A comparison function; the default label sort applies over A2UI.",
            nodeRenderer: "Returns a DOM element; the default row rendering applies over A2UI.",
            filterPredicate: "A matching function; the default label match applies over A2UI.",
            "roots[].data": "Arbitrary consumer data for host callbacks; it has no schema an agent could fill.",
            toolbarActions: "Toolbar buttons run host click handlers, which an agent cannot supply.",
        },
    },

    regions: ["treeview:list-container"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 46857, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 280, h: 350 },
    defaultOptions: { roots: [] },

    conformance: "surface",
    priority: 70,
};
