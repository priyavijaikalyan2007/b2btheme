/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 4e8b1c63-7a2f-4d09-9c5e-0b6d3f8a2e71
 * Created: 2026-11-02
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Progress Modal / CapabilityManifest
 * 📜 PURPOSE: Declares what Progress Modal can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it, and the A2UI catalog can publish it.
 *    See ADR-142, ADR-246.
 * 🔗 RELATES: [[ProgressModal]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker progressmodal-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 5, ADR-246) through
 * createProgressModal, a surface that wraps ProgressModal, whose own
 * getState() already reports the run's state as a string. The agent rewrites
 * the "progress" slot as the work goes on; the user's Cancel, Retry and
 * Close are events. Over A2UI it is contained (protocol.fixed), so it renders
 * in its surface and blocks nothing outside it.
 */
export const PROGRESSMODAL_MANIFEST: CapabilityManifest =
{
    name: "progressmodal",
    factory: "createProgressModal",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Progress Modal",
    icon: "bi-hourglass-split",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show the progress of work the agent is doing, such as an import, with a spinner or a bar, a "
            + "status line, a step count and a detail log, and let the user cancel it or retry after a failure.",
        avoidWhen: "For a finished figure use MetricCard; for a one-word status use StatusBadge.",
    },

    affords: [],
    emits: [
        { name: "cancel", payload: "record", multi: false, legacyOption: "onCancel" },
        { name: "retry", payload: "record", multi: false, legacyOption: "onRetry" },
        { name: "close", payload: "record", multi: false, legacyOption: "onClose" },
    ],
    accepts: [
        { name: "progress", payload: "record", required: false },
    ],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-246).
    protocol: {
        fixed: { contained: true },
        hostOnly: {
            keyBindings: "Over A2UI the modal's keys work only inside its box, where the default Escape suffices.",
            allowBackdropClose: "A contained modal has no backdrop to click.",
        },
    },

    regions: ["progressmodal:log"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 500, h: 360 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
