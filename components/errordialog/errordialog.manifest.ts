/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2b8e6c41-0f7d-4a93-b5e2-9c1d4f7a8e30
 * Created: 2026-11-02
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Error Dialog / CapabilityManifest
 * PURPOSE: Declares what Error Dialog can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it, and the A2UI catalog can publish it.
 *    See ADR-142, ADR-246.
 * RELATES: [[ErrorDialog]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker errordialog-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 5, ADR-246): a literate
 * error whose Close and Retry are "close" and "retry" events through
 * createErrorDialog's handle. Over A2UI it is contained (protocol.fixed), so
 * it renders in its surface with no Bootstrap Modal or page backdrop. Its
 * technical-details accordion is Bootstrap's Collapse, hence the library.
 */
export const ERRORDIALOG_MANIFEST: CapabilityManifest =
{
    name: "errordialog",
    factory: "createErrorDialog",
    factoryStyle: "container-first",
    label: "Error Dialog",
    icon: "bi-exclamation-octagon",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Report a failure the user must read: what went wrong, what to do next, an error code and "
            + "correlation id, and technical details behind a toggle, optionally with a Retry button.",
        avoidWhen: "For a yes-or-no question use ConfirmDialog; for a passing status use StatusBadge or Text.",
    },

    affords: [],
    emits: [
        { name: "retry", payload: "record", multi: false, legacyOption: "onRetry" },
        { name: "close", payload: "record", multi: false },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-246).
    protocol: {
        // Bootstrap's Collapse opens the technical details; the adapter uses the page's copy when it has one.
        dependencies: { libraries: ["bootstrap"] },
        fixed: { contained: true },
        schemas: {
            context: { type: "object", additionalProperties: { type: "string" },
                description: "Key-value pairs of relevant system state, shown with the technical details, such as "
                    + "{ \"documentId\": \"d-42\" }." },
        },
    },

    regions: ["errordialog:technical"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 500, h: 320 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
