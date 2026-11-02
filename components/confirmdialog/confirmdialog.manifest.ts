/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7d1f3a52-9b0e-4c6a-8f21-5e4b2c9d0a17
 * Created: 2026-11-02
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Confirm Dialog / CapabilityManifest
 * 📜 PURPOSE: Declares what Confirm Dialog can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it, and the A2UI catalog can publish it.
 *    See ADR-142, ADR-246.
 * 🔗 RELATES: [[ConfirmDialog]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker confirmdialog-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 5, ADR-246): the user's
 * answer is a "confirm" or "cancel" event through createConfirmDialog's
 * handle. Over A2UI it is contained (protocol.fixed), so it renders in its
 * surface, blocks nothing outside it, and shows as soon as it mounts. It has
 * no view state, so stateKeys is empty (ADR-229).
 */
export const CONFIRMDIALOG_MANIFEST: CapabilityManifest =
{
    name: "confirmdialog",
    factory: "createConfirmDialog",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Confirm Dialog",
    icon: "bi-question-circle",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Ask the user one yes-or-no question before acting, such as Delete these 3 files?, with a confirm "
            + "and a cancel button.",
        avoidWhen: "To collect values use FormDialog; to report a failure use ErrorDialog; for a notice with no "
            + "answer use Text or EmptyState.",
    },

    affords: [],
    emits: [
        { name: "confirm", payload: "record", multi: false, legacyOption: "onConfirm" },
        { name: "cancel", payload: "record", multi: false, legacyOption: "onCancel" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-246).
    protocol: {
        fixed: { contained: true },
        // The icon becomes part of a class attribute.
        schemas: {
            icon: { type: "string", pattern: "^[A-Za-z0-9 _-]+$",
                description: "Bootstrap icon class for the header, such as \"bi-trash\". Default: the "
                    + "variant's icon." },
        },
        hostOnly: {
            keyBindings: "Over A2UI the dialog's keys work only inside its box, where the defaults Escape and "
                + "Enter suffice.",
            closeOnBackdrop: "A contained dialog has no backdrop to click.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 440, h: 200 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
