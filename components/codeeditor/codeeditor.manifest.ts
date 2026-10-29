/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 3913cd37-3088-4235-9090-29f69332caae
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Code Editor / CapabilityManifest
 * PURPOSE: Declares what Code Editor can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Code Editor]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker codeeditor-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B5): Ctrl+S and the Save
 * button emit "save" through an additive on(). The adapter loads CodeMirror 6
 * first (ADR-230).
 */
export const CODEEDITOR_MANIFEST: CapabilityManifest =
{
    name: "codeeditor",
    factory: "createCodeEditor",
    label: "Code Editor",
    icon: "bi-code-square",
    category: "content",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user read or edit code with syntax highlighting, line numbers and a toolbar; Ctrl+S saves.",
        avoidWhen: "For prose use RichTextInput; for a LaTeX expression use LatexEditor.",
    },

    affords: [
        {
            shape: "document",
            intents: ["edit", "author"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 320, h: 200 },
        },
    ],
    emits: [
        { name: "save", payload: "scalar", multi: false, legacyOption: "onSave" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["value"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B5).
    protocol: {
        hostOnly: {
            onLanguageChange: "Fires as the user picks another highlighting language; that is view state, not "
                + "information for an agent.",
            onFocus: "Fires as the editor gains focus; transient, not information for an agent.",
            onBlur: "Fires as the editor loses focus; transient, not information for an agent.",
        },
        // CodeMirror 6 is the editor; without it the component shows an error notice (ADR-230).
        dependencies: { libraries: ["codemirror6"] },
    },

    regions: ["codeeditor:editor", "codeeditor:cm-scroller"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 14790, mountCost: "light", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
