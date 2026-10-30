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

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user draw or edit a diagram (flowchart, network, UML, wireframe) on a canvas of shapes "
            + "and connectors; write the document to draw it, and hear each edit as the whole document.",
        avoidWhen: "To show nodes and relationships without drawing use GraphCanvas; for a roadmap use SpineMap.",
    },

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

    // Surface (readiness step 2 B9, the user's decision B9-1). change has no legacy callback: onChange is
    // declared but never called, so the channel is new; it carries the whole document once per edit.
    emits: [
        { name: "selection", payload: "record", multi: false, legacyOption: "onSelectionChange" },
        { name: "objectDoubleClick", payload: "record", multi: false, legacyOption: "onObjectDoubleClick" },
        { name: "change", payload: "record", multi: false },
    ],

    // B7-1: the agent rewrites the diagram in place, keeping zoom and pan.
    accepts: [
        { name: "document", payload: "record", required: false },
    ],
    actions: [],
    stateKeys: ["viewport"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B9).
    protocol: {
        hostOnly: {
            data: "Template data the document's {{expressions}} read; an open record no schema can check. Over "
                + "A2UI write the text itself.",
            contentRenderer: "A render hook that draws into an object's element; the default rendering applies.",
            renderObjectHoverCard: "A render hook; the built-in hover card applies instead.",
            renderConnectorHoverCard: "A render hook; the built-in hover card applies instead.",
            onObjectClick: "The component never calls this option.",
            onConnectorClick: "The component never calls this option.",
            onTextEditRequest: "The component never calls this option.",
            onChange: "The component never calls this option.",
            onViewportChange: "Fires as the user zooms or pans; that is view state, which the viewport state key "
                + "restores.",
            "document.data": "Template data the document's {{expressions}} read; an open record no schema can check.",
            "document.objects[].semantic.data": "An open record of domain data; it has no schema an agent could "
                + "follow.",
            "document.connectors[].semantic.data": "An open record of domain data; it has no schema an agent could "
                + "follow.",
            "document.objects[].presentation.embed": "Mounts any registered component with any options inside the "
                + "object, which would let an agent set options the catalog keeps from it.",
            "document.objects[].presentation.image.headers": "Request headers that make the component fetch the "
                + "image from the user's browser with XMLHttpRequest; an agent must not choose such a request.",
        },
    },

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

    conformance: "surface",
    priority: 50,
};
