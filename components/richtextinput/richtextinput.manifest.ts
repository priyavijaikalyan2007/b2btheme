/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a137adb6-9a81-44ca-b704-84e79068fa0b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Rich Text Input / CapabilityManifest
 * PURPOSE: Declares what Rich Text Input can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Rich Text Input]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker richtextinput-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B5): it emits "submit"
 * through an additive on(), and restores its value through getState().
 */
export const RICHTEXTINPUT_MANIFEST: CapabilityManifest =
{
    name: "richtextinput",
    factory: "createRichTextInput",
    mountMethod: "show",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Rich Text Input",
    icon: "bi-text-paragraph",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user write formatted text with bold, italics, lists and links; with submitOnCtrlEnter, "
            + "Ctrl+Enter sends it.",
        avoidWhen: "For plain single-line text use TextField; for long markdown documents use MarkdownEditor.",
    },

    affords: [],
    emits: [
        { name: "submit", payload: "scalar", multi: false, legacyOption: "onSubmit" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["value"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B5).
    protocol: {
        hostOnly: {
            triggers: "Each trigger loads its items and renders its tokens through functions, so mentions and tags "
                + "need host code.",
            stieOptions: "Configures the SmartTextInput engine behind triggers, which are host-only.",
            outputFormat: "getValue() returns markdown in that format but setValue() reads HTML, so a value "
                + "round-tripped through the agent would be corrupted; over A2UI the value is HTML.",
            onFocus: "Fires as the editor gains focus; transient, not information for an agent.",
            onBlur: "Fires as the editor loses focus; transient, not information for an agent.",
        },
    },

    regions: ["richtextinput:editable"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 18900, mountCost: "light", holdsResources: false },

    defaultSize: { w: 300, h: 100 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
