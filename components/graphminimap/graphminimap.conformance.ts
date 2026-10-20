/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: GraphMinimap / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    `graphCanvas` is required and has no honest default, so it cannot live
 *    in the manifest's defaultOptions: that field ships to consumers in
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A stub there would put a minimap of nothing in front
 *    of real users.
 *
 *    THE STUB IS THE POINT, NOT A SHORTCUT. `GraphCanvasHandle` is declared
 *    in graphminimap.ts as a six-method structural interface, so the minimap
 *    never depended on GraphCanvas the component. The exemption that kept
 *    this out of the fleet gate for ten weeks said otherwise.
 *
 *    MEASURED 2026-10-20: the gate also passes with an EMPTY node list,
 *    because the minimap renders its frame, header and SVG either way and
 *    renders-content accepts that. What the stub is actually required for
 *    is the mount itself — `createGraphMinimap` throws without a
 *    `graphCanvas`. The two nodes and one edge are here so the run walks a
 *    populated graph rather than an empty frame, and that is a choice
 *    rather than a requirement. Said plainly because the first draft of
 *    this comment claimed the nodes were load-bearing and a mutation
 *    showed they were not.
 * RELATES: [[GraphMinimap]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker graphminimap-conformance-glue

export const CONFORMANCE_GLUE =
{
    options:
    {
        graphCanvas:
        {
            getNodes: () => [
                { id: "node-a", x: 40, y: 40, color: "#3b82f6" },
                { id: "node-b", x: 160, y: 120, color: "#ef4444" },
            ],
            getEdges: () => [{ source: "node-a", target: "node-b" }],
            getViewport: () => (
                { x: 0, y: 0, zoom: 1, width: 400, height: 300 }),
            panTo: () => { /* the gate mounts and tears down, never pans */ },
            on: () => { /* no layout events are emitted during the run */ },
            off: () => { /* paired with `on`, and equally unused */ },
        },
    },
};
