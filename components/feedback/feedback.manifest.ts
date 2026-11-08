/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Created: 2026-11-08
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Feedback / CapabilityManifest
 * 📜 PURPOSE: Declares what Feedback can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it, and the A2UI catalog can publish it.
 *    See ADR-142, specs/feedback.prd.md §5.
 * 🔗 RELATES: [[Feedback]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker feedback-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/** A single class, or a Font Awesome pair: an icon must not add arbitrary classes to the host page. */
const ICON = { type: "string", pattern: "^(?:[A-Za-z0-9_-]+|fa-(?:solid|regular|brands) fa-[a-z0-9-]+)$" };

const ICON_KEYS = ["positive", "positiveActive", "negative", "negativeActive", "star", "starActive", "comment",
    "report", "copy", "copied"];

/**
 * Declared at `surface` conformance. Each save is an ack provider: over
 * A2UI the agent hears onFeedback with { targetId, feedback } and answers
 * feedbackResult true once it has stored it, and only then does the control
 * show it saved (specs/feedback.prd.md, honest saving). Copy is an event.
 * The saved rating and the Reported state are view state, so a rebuilt
 * control stays locked rather than taking a second rating.
 */
export const FEEDBACK_MANIFEST: CapabilityManifest =
{
    name: "feedback",
    factory: "createFeedback",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Feedback",
    icon: "bi-hand-thumbs-up",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Ask the user to rate a result, such as an answer, a document or a generated diagram, with thumbs "
            + "or stars, an optional comment and a way to report a problem; each rating reaches the agent once.",
        avoidWhen: "To ask a question with set answers use ChoicePicker; for a form of several fields use FormDialog.",
    },

    affords: [],
    emits: [
        { name: "copy", payload: "record", multi: false, legacyOption: "onCopy" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["saved", "reported"],

    // How this component appears to agent protocols (ADR-219).
    protocol: {
        // The Report button opens a FormDialog.
        dependencies: { components: ["formdialog"] },
        providers: {
            // required (ADR-234): a Feedback with no save would take ratings it can never deliver.
            onSave: { request: "feedback", ack: true, required: true },
        },
        hostOnly: {
            onFeedback: "Takes two parameters, which a provider cannot carry; over A2UI onSave is the same save, "
                + "and the agent answers it.",
            cssClass: "Adds classes to the host page's markup, which an agent must not choose.",
        },
        schemas: {
            icons: {
                type: "object",
                properties: Object.fromEntries(ICON_KEYS.map((k) => [k, ICON])),
                additionalProperties: false,
                description: "Icon overrides: each a Bootstrap Icons name such as \"flag\", a Font Awesome pair "
                    + "such as \"fa-solid fa-flag\", or an icon-pack class.",
            },
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 9000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 240, h: 32 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
