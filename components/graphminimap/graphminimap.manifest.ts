/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 645b799d-0dfe-41e9-8a8c-ac6ce797adfb
 * Created: 2026-10-20
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: GraphMinimap / CapabilityManifest
 * PURPOSE: Declares what GraphMinimap can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[GraphMinimap]], [[DynamicUIRuntime]], [[GraphCanvas]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker graphminimap-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * EXEMPT UNTIL 2026-10-20, AND THE BLOCKER WAS WRONG ON BOTH HALVES.
 *
 * The exemption read: "`options.graphCanvas` is required and the minimap
 * paints through a 2D context, which jsdom does not implement — glue that
 * stands up a real GraphCanvas is the prerequisite, not the manifest."
 *
 * The minimap paints no 2D context. It renders SVG, and
 * `graphminimap.ts` contains no `getContext` call at all. And
 * `graphCanvas` is not typed as GraphCanvas: it is `GraphCanvasHandle`,
 * a six-method structural interface the file documents as "minimal
 * interface that a graph canvas must implement". A plain object
 * satisfies it, which is what the conformance glue supplies.
 *
 * ADR-160 re-measured these blockers once and eleven of sixteen did not
 * survive. This one did, because nobody opened the file. A blocker is a
 * claim about the code and ages like any other.
 */
export const GRAPHMINIMAP_MANIFEST: CapabilityManifest =
{
    name: "graphminimap",
    factory: "createGraphMinimap",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Graph Minimap",
    icon: "bi-map",
    category: "visualization",

    affords: [
        {
            shape: "graph",
            intents: ["navigate", "inspect"],
            // Edges auto-disable above 500 nodes, which is the component's
            // own stated ceiling rather than a number invented here.
            cardinality: { min: 0, max: 500 },
            minViewport: { w: 200, h: 150 },
        },
    ],

    // The minimap reports nothing outward. It PANS the canvas it mirrors,
    // through the handle it was given, so navigation leaves by that route
    // and not as an event.
    emits: [],

    accepts: [],
    actions: [],
    stateKeys: [],

    regions: ["graphminimap:svg"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 0, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 150 },

    // `graphCanvas` is deliberately absent. It has no honest default: a
    // minimap with a stub canvas would render an empty frame and claim to
    // be mirroring something. The host supplies the real handle, and the
    // factory throws without it.
    defaultOptions: { width: 200, height: 150 },

    conformance: "display",
    priority: 50,
};
