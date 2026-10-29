/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 8ff9486b-2aef-4542-8df3-88cca5e7ca1d
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Prompt Template Manager / CapabilityManifest
 * PURPOSE: Declares what Prompt Template Manager can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Prompt Template Manager]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker prompttemplatemanager-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B7): selecting, saving,
 * deleting and duplicating a template emit through an additive on(); the
 * agent rewrites the list through the "templates" slot, which keeps the
 * user's selection (B7-1); the selection, filled variables and preview
 * restore through getState().
 */
export const PROMPTTEMPLATEMANAGER_MANIFEST: CapabilityManifest =
{
    name: "prompttemplatemanager",
    factory: "createPromptTemplateManager",
    factoryStyle: "options-first",
    label: "Prompt Template Manager",
    icon: "bi-file-earmark-code",
    category: "ai",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a library of prompt templates with {{variable}} placeholders that the user can browse, edit, "
            + "fill in, duplicate and delete; the agent supplies the templates and hears each select, save, delete "
            + "and duplicate.",
        avoidWhen: "For a single free-text prompt use RichTextInput; for code use CodeEditor; set showImportExport "
            + "to false when the agent must see every template, since imports and exports stay in the browser.",
    },

    affords: [],
    emits: [
        { name: "select", payload: "scalar", multi: false, legacyOption: "onSelect" },
        { name: "save", payload: "record", multi: false, legacyOption: "onSave" },
        { name: "delete", payload: "scalar", multi: false, legacyOption: "onDelete" },
        { name: "duplicate", payload: "record", multi: false, legacyOption: "onDuplicate" },
    ],
    accepts: [
        { name: "templates", payload: "collection", required: false },
    ],
    actions: [],
    stateKeys: ["selected", "variables", "preview"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B7).
    protocol: {
        hostOnly: {
            "templates[].metadata": "Host data attached to a template, typed as an open record, so no schema "
                + "checks it; an agent supplies none.",
            onPreview: "Takes two parameters and renders the preview text on the host; over A2UI the built-in "
                + "{{variable}} substitution applies.",
            onLoadTemplates: "Takes no parameter, and a provider needs one to carry its request; over A2UI the "
                + "agent supplies the templates.",
            onChange: "Fires on every keystroke in the editor; over A2UI the save event carries the finished "
                + "template.",
        },
    },

    regions: [
        "prompttemplatemanager:list",
        "prompttemplatemanager:detail",
        "prompttemplatemanager:preview-panel",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 26795, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 600, h: 450 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
