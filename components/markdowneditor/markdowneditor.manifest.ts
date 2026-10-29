/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b6529624-ef96-42c6-85d3-539770a90cf6
 * Created: 2026-10-20
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: MarkdownEditor / CapabilityManifest
 * PURPOSE: Declares what MarkdownEditor can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it. See ADR-142.
 * RELATES: [[MarkdownEditor]], [[DynamicUIRuntime]], [[CodeEditor]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker markdowneditor-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * EXEMPT UNTIL 2026-10-20, AND THE BLOCKER WAS ABOUT THE WRONG SURFACE.
 *
 * The exemption read: "Class-only entry point, and the blocker holds:
 * `MarkdownEditor` is exported but no `create*` factory is. Migration means
 * ADDING one to the public surface."
 *
 * There was nothing to add. `createMarkdownEditor(containerId, options)`
 * already existed, already sat on `window`, and is already the documented
 * entry point — COMPONENT_INDEX.md and COMPONENTS.md name it, seven demo
 * pages call it, and CDN_CONTRACT.md argues from it. What it lacked was the
 * `export` KEYWORD, which the IIFE bundle strips anyway and which no
 * consumer can observe. The gate reads `mod[manifest.factory]`, so the
 * missing keyword made an existing public function invisible to it.
 *
 * "No create* factory is exported" and "migration adds to the public
 * surface" are two different claims, and the second does not follow from the
 * first. The surface in question is `window`, and it was never short of one.
 *
 * ADR-160 re-measured these blockers once and eleven of sixteen did not
 * survive. This one survived because nobody opened the file (ADR-214).
 *
 * Declared at `surface` conformance (readiness step 2 B5): Ctrl+Enter emits
 * "save" through an additive on(). Over agent protocols the adapter loads
 * Vditor, its stylesheet and DOMPurify first (ADR-230).
 */
export const MARKDOWNEDITOR_MANIFEST: CapabilityManifest =
{
    name: "markdowneditor",
    factory: "createMarkdownEditor",
    factoryStyle: "container-first",
    label: "Markdown Editor",
    icon: "bi-markdown",
    category: "content",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user write and preview a markdown document, with a formatting toolbar; Ctrl+Enter saves.",
        avoidWhen: "For a short formatted note use RichTextInput; to show markdown read-only use DocViewer.",
    },

    affords: [
        {
            shape: "document",
            intents: ["author", "edit"],
            // One document at a time: the editor holds a single markdown
            // body, and there is no multi-document mode.
            cardinality: { min: 1, max: 1 },
            // Below this the Vditor toolbar wraps onto a third row and the
            // split preview stops being readable.
            minViewport: { w: 360, h: 240 },
        },
    ],

    // Declared empty at `display`. `onChange`, `onSave` and `onModeChange`
    // are live constructor callbacks; turning them into channels is the
    // promotion to `surface` and belongs with the editor's own arc.
    emits: [
        { name: "save", payload: "scalar", multi: false, legacyOption: "onSave" },
    ],

    accepts: [],
    actions: [],
    stateKeys: ["value"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B5).
    protocol: {
        hostOnly: {
            vditorOptions: "Raw options for the Vditor engine underneath; their shape is Vditor's, not a schema an "
                + "agent could follow.",
            onReady: "Fires when the editor has loaded; a lifecycle signal, not information for an agent.",
            onModeChange: "Fires as the user switches between editing and preview layouts; that is view state, not "
                + "information for an agent.",
        },
        // Vditor is the editor; DOMPurify sanitises its preview of agent-written markdown (ADR-230).
        dependencies: { libraries: ["vditor", "vditor-css", "dompurify"] },
    },

    // Every scrolling region this component names (DEBT-DUI-5).
    // `markdowneditor:modal-dialog` belongs to `showMarkdownEditorModal`
    // rather than to a canvas-mounted instance, and the first draft of this
    // manifest left it out for that reason. Check [18] rejected the
    // omission, and it is right to: the manifest is what a HOST reads, the
    // modal is part of this component's published surface, and a region a
    // host is not told about is one it cannot anchor to.
    // `markdowneditor:pre` is content-created and is recorded as unnameable
    // in check-region-names.mjs.
    regions: [
        "markdowneditor:display",
        "markdowneditor:preview-area",
        "markdowneditor:modal-dialog",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    // `holdsResources` is true: the editor installs a MutationObserver for
    // theme changes and Vditor holds its own editing surface.
    weight: { js: 0, mountCost: "moderate", holdsResources: true },

    defaultSize: { w: 640, h: 420 },

    // Every option is optional and `mode` defaults to "tabs". Deliberately
    // empty rather than seeding `value`: a canvas that supplies no content
    // wants an empty editor, not placeholder prose.
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
