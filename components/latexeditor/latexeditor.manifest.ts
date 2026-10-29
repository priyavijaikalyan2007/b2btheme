/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 34281f1f-ebbd-4ce2-be90-5ef017e5c337
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: LaTeX Editor / CapabilityManifest
 * PURPOSE: Declares what LaTeX Editor can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[LaTeX Editor]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker latexeditor-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B5): Ctrl+Enter emits
 * "confirm" through an additive on(). The adapter loads KaTeX first (ADR-230).
 */
export const LATEXEDITOR_MANIFEST: CapabilityManifest =
{
    name: "latexeditor",
    factory: "createLatexEditor",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "LaTeX Editor",
    icon: "bi-subscript",
    category: "content",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user write a LaTeX math expression with a live rendered preview and a symbol palette; "
            + "Ctrl+Enter confirms.",
        avoidWhen: "For prose use RichTextInput; for code use CodeEditor.",
    },

    affords: [],
    emits: [
        { name: "confirm", payload: "record", multi: false, legacyOption: "onConfirm" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["value"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B5).
    protocol: {
        // KaTeX renders the preview; without it the preview shows the raw expression (ADR-230).
        dependencies: { libraries: ["katex", "katex-css"] },
    },

    regions: [
        "latexeditor:preview",
        "latexeditor:palette-tabs",
        "latexeditor:palette-grid",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 20737, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
