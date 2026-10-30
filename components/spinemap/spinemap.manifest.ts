/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c03c3cb3-ecf9-4cf9-bd81-084e644715ac
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Spine Map / CapabilityManifest
 * PURPOSE: Declares what Spine Map can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Spine Map]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker spinemap-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B9): clicks and every
 * edit emit through an additive on(), the map is a slot updated in place,
 * and layout, zoom and selection are its state.
 */
export const SPINEMAP_MANIFEST: CapabilityManifest =
{
    name: "spinemap",
    factory: "createSpineMap",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Spine Map",
    icon: "bi-bezier2",
    category: "data",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a roadmap or capability map: hubs along a spine, each with branches and statuses, and "
            + "connections between them; rewrite data to change it in place.",
        avoidWhen: "For a general network of nodes use GraphCanvas; for a dated schedule use GanttChart.",
    },

    affords: [
        {
            shape: "graph",
            intents: ["relate", "browse"],
            cardinality: { min: 2, max: 5000 },
            minViewport: { w: 360, h: 260 },
        },
    ],
    emits: [
        { name: "nodeClick", payload: "record", multi: false, legacyOption: "onNodeClick" },
        { name: "nodeDoubleClick", payload: "record", multi: false, legacyOption: "onNodeDoubleClick" },
        { name: "nodeAdd", payload: "record", multi: false, legacyOption: "onNodeAdd" },
        { name: "nodeChange", payload: "record", multi: false, legacyOption: "onNodeChange" },
        { name: "nodeRemove", payload: "scalar", multi: false, legacyOption: "onNodeRemove" },
        { name: "nodeReparent", payload: "record", multi: false, legacyOption: "onNodeReparent" },
        { name: "connectionAdd", payload: "record", multi: false, legacyOption: "onConnectionAdd" },
        { name: "connectionRemove", payload: "scalar", multi: false, legacyOption: "onConnectionRemove" },
    ],
    // B7-1: the agent rewrites the map in place, keeping zoom and selection.
    accepts: [
        { name: "data", payload: "record", required: false },
    ],
    actions: [],
    stateKeys: ["layout", "zoom", "selectedNode"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-229, ADR-230, readiness step 2 B9).
    protocol: {
        hostOnly: {
            onNodeHover: "Fires as the pointer enters and leaves a node; hover is not information for an agent.",
            onLayoutChange: "Fires as the layout changes; that is view state, which the layout state key restores.",
            onZoomChange: "Fires as the zoom changes; that is view state, which the zoom state key restores.",
            onConfirmRemove: "A decision the component awaits before a removal; the default confirmation dialog "
                + "applies.",
            popoverFields: "Field configurations that mount other components' pickers and run host code to "
                + "serialise and render values; the default popover fields apply.",
            "data.hubs[].link": "A link the user follows from the host's page; an agent must not choose it. Over A2UI, "
                + "listen for nodeClick and answer with openUrl.",
            "data.hubs[].branches[].link": "A link the user follows from the host's page; an agent must not choose "
                + "it. Over A2UI, listen for nodeClick and answer with openUrl.",
        },
        schemas: {
            // Hex colours only, the one colour form agents write across the catalog (B7, B8, B9).
            statusColors: {
                type: "object",
                description: "A colour per status, overriding the defaults.",
                properties: Object.fromEntries(["available", "in-progress", "planned", "not-supported", "deprecated",
                    "custom"].map((k) => [k, { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" }])),
                additionalProperties: false,
            },
        },
        // Removing a node or connection asks through ConfirmDialog's showDangerConfirmDialog.
        dependencies: { components: ["confirmdialog"] },
    },

    regions: ["spinemap:popover", "spinemap:sidebar-tree"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 56035, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 500, h: 350 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
