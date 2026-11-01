/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 83cc8e02-4726-4e1b-9a1d-10f3db563116
 * Created: 2026-11-01
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Graph Toolbar / CapabilityManifest
 * PURPOSE: Declares what Graph Toolbar can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it, and the A2UI catalog can publish it.
 *    See ADR-142, ADR-245.
 * RELATES: [[Graph Toolbar]], [[Toolbar]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker graphtoolbar-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/** Why each per-tool callback is out of an agent's reach. */
const CARRIED = "Host code run on the tool; toolClick reports the tool's id instead.";

/**
 * Declared at `surface` conformance (readiness step 5, ADR-245): a preset
 * Toolbar for graph editors. Every tool emits the inner Toolbar's toolClick
 * { toolId, value } (gt-undo, gt-zoom-in, gt-layout-select, ...) through an
 * additive on(). The adapter passes a container, so it is contained; its
 * page-wide keyboard shortcuts are off over A2UI (protocol.fixed).
 */
export const GRAPHTOOLBAR_MANIFEST: CapabilityManifest =
{
    name: "graphtoolbar",
    factory: "createGraphToolbar",
    factoryStyle: "options-first",
    label: "Graph Toolbar",
    icon: "bi-diagram-3",
    category: "navigation",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show the standard tools above a graph or diagram: undo, redo, delete, layout, zoom, grid snap, "
            + "minimap, export and search; each use reports the tool's id, such as gt-zoom-in.",
        avoidWhen: "For your own set of tools use Toolbar; GraphCanvas already has zoom and minimap controls of its "
            + "own.",
    },

    affords: [],
    emits: [
        { name: "toolClick", payload: "record", multi: false },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-245).
    protocol: {
        dependencies: { libraries: ["bootstrap"], components: ["toolbar"] },
        fixed: { enableKeyboardShortcuts: false },
        hostOnly: {
            toolbarOptions: "Toolbar's options, passed through unchecked; for your own tools use Toolbar.",
            onUndo: CARRIED,
            onRedo: CARRIED,
            onDelete: CARRIED,
            onLayoutChange: CARRIED,
            onApplyLayout: CARRIED,
            onZoomIn: CARRIED,
            onZoomOut: CARRIED,
            onZoomToFit: CARRIED,
            onZoomChange: "Fires when the host sets the zoom label, which an agent does through initialZoom.",
            onGridSnapToggle: CARRIED,
            onMinimapToggle: CARRIED,
            onExport: CARRIED,
            onSearch: "Host code run on each keystroke; an agent hears the submit.",
            onSearchSubmit: CARRIED,
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12000, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 600, h: 40 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
