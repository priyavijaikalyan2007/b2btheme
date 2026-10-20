/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a027095c-caab-4535-a66f-f1bd1ad66365
 * Created: 2026-10-20
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine / CapabilityManifest
 * PURPOSE: Declares what DiagramEngine can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it. See ADR-142.
 * RELATES: [[DiagramEngine]], [[DynamicUIRuntime]], [[GraphCanvas]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker diagramengine-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * EXEMPT UNTIL 2026-10-20, AND BOTH HALVES OF THE BLOCKER WERE WRONG.
 *
 * The exemption read: "Requires a live GraphCanvas handle, and the blocker
 * holds. Measured 25k-line engine with its own embed registry; migrate after
 * phase 10 extracts that registry."
 *
 * DiagramEngine requires no GraphCanvas handle. `createDiagramEngine(
 * container, options = {})` takes no required option at all, and the
 * sentence is a copy of GraphMinimap's blocker — which was itself wrong
 * (ADR-206).
 *
 * And phase 10 completed on 2026-08-03 doing something else. It was the
 * runtime bundle and DynamicCanvas phase, recorded in specs/dynamicui.plan.md;
 * it never touched the embed registry. The registry is orthogonal to the
 * canvas in any case: it lets a DIAGRAM embed other components inside its own
 * objects, and `registerEnterpriseThemeEmbeds` is reached only from the
 * consumer-called `loadEmbedPack("enterprise-theme")`, never from the
 * constructor. Nothing about it bears on whether a canvas can mount the
 * engine.
 *
 * Its own suites have constructed it under jsdom the whole time —
 * `diagramengine-core.test.ts:28` is `createDiagramEngine(container.id, {})`.
 * Size was the real deterrent, and size is not a blocker.
 *
 * ADR-160 re-measured these blockers once and eleven of sixteen did not
 * survive. This one survived because nobody opened the file.
 */
export const DIAGRAMENGINE_MANIFEST: CapabilityManifest =
{
    name: "diagramengine",
    factory: "createDiagramEngine",
    factoryStyle: "container-first",
    label: "Diagram Engine",
    icon: "bi-diagram-3",
    category: "visualization",

    affords: [
        {
            shape: "graph",
            intents: ["author", "edit", "relate"],
            // `min: 0` because an empty canvas is this component's opening
            // state: a diagram EDITOR is asked for before there is anything
            // to draw, unlike a graph VIEW which needs something to relate.
            //
            // The component states no object ceiling, and this number is
            // therefore not a measured one. 5000 matches GraphCanvas, which
            // has the same one-SVG-element-per-object architecture. Said
            // plainly rather than left to read as a limit somebody tested.
            cardinality: { min: 0, max: 5000 },
            minViewport: { w: 360, h: 260 },
        },
    ],

    // Declared empty at `display`, the level the conformance suite proves for
    // this component today. The engine's EventBus carries selection and
    // object-change events, and wiring them as channels is the promotion to
    // `surface` — a change to the component's public API rather than to this
    // file.
    emits: [],

    accepts: [],
    actions: [],
    stateKeys: [],

    // `diagramengine.scss` sets `overflow: hidden` and declares no scrolling
    // region. The engine pans and zooms its own SVG viewBox instead, so there
    // is nothing for a durable anchor to name (DEBT-DUI-5).
    regions: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    // `heavy` and `holdsResources` are both measured: the built bundle is
    // 266 KB, and the constructor installs a MutationObserver to follow
    // `data-bs-theme`.
    weight: { js: 0, mountCost: "heavy", holdsResources: true },

    defaultSize: { w: 800, h: 600 },

    // Every option is optional. An engine with no options is a blank diagram
    // surface, which is exactly what a host that supplies nothing wants.
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
