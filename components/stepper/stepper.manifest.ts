/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 34b2494f-ad43-40eb-8de4-f482052be875
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Stepper / CapabilityManifest
 * PURPOSE: Declares what Stepper can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Stepper]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker stepper-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B5): it emits
 * "stepChange", "finish" and "saveDraft" through an additive on(), and
 * restores its active step through getState().
 */
export const STEPPER_MANIFEST: CapabilityManifest =
{
    name: "stepper",
    factory: "createStepper",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Stepper",
    icon: "bi-list-ol",
    category: "feedback",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show the steps of a multi-step task with progress and Back, Next and Finish; the agent hears each "
            + "step change and shows that step's content.",
        avoidWhen: "For switching freely between views use Tabs; for a single progress value use Gauge.",
    },

    affords: [],
    emits: [
        { name: "stepChange", payload: "record", multi: false, legacyOption: "onStepChange" },
        { name: "finish", payload: "scalar", multi: false, legacyOption: "onFinish" },
        { name: "saveDraft", payload: "scalar", multi: false, legacyOption: "onSaveAsDraft" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["activeStep"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B5).
    protocol: {
        hostOnly: {
            "steps[].content": "An element; over A2UI the agent shows each step's content beside the stepper until "
                + "layouts take A2UI children (step 4).",
            "steps[].validate": "A check that must answer synchronously, which an agent round trip cannot; steps "
                + "advance without it.",
        },
        schemas: {
            // typia cannot describe content (an element) or validate (a function); the agent's steps carry the rest.
            steps: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        label: { type: "string", description: "The step's name." },
                        description: { type: "string", description: "Shown below the label." },
                        icon: { type: "string", description: "Bootstrap Icons class for the indicator." },
                        summary: { type: "string", description: "Shown below the step once it is complete." },
                        optional: { type: "boolean", description: "The user may skip the step." },
                    },
                    required: ["label"],
                    additionalProperties: false,
                },
            },
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6764, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 500, h: 60 },
    defaultOptions: { steps: [] },

    conformance: "surface",
    priority: 50,
};
