/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 5c3a9e17-6d2b-4f80-a1c4-8e7b0d2f6a95
 * Created: 2026-11-02
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Share Dialog / CapabilityManifest
 * 📜 PURPOSE: Declares what Share Dialog can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it, and the A2UI catalog can publish it.
 *    See ADR-142, ADR-246.
 * 🔗 RELATES: [[ShareDialog]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sharedialog-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 5, ADR-246): Done is a
 * "share" event carrying who was added, changed and removed, and cancelling
 * is a "cancel" event, through createShareDialog's handle. Over A2UI it is
 * contained (protocol.fixed), so it renders in its surface, blocks nothing
 * outside it, and shows as soon as it mounts. People are found with
 * PeoplePicker, whose search the agent answers, and shown with PersonChip.
 */
export const SHAREDIALOG_MANIFEST: CapabilityManifest =
{
    name: "sharedialog",
    factory: "createShareDialog",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Share Dialog",
    icon: "bi-person-plus",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user grant, change or remove people's access to one item, such as a document, choosing "
            + "an access level like Viewer or Editor for each person.",
        avoidWhen: "To pick people for anything other than access use PeoplePicker; for a yes-or-no question use "
            + "ConfirmDialog.",
    },

    affords: [],
    emits: [
        { name: "share", payload: "record", multi: false, legacyOption: "onShare" },
        { name: "cancel", payload: "record", multi: false, legacyOption: "onCancel" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-246).
    protocol: {
        dependencies: { components: ["peoplepicker", "personchip"] },
        // The same search PeoplePicker asks its agent for, passed through to it (ADR-225).
        providers: {
            onSearch: { request: "search" },
        },
        fixed: { contained: true },
        hostOnly: {
            // The URL-fetch rule (readiness step 2 §4).
            searchUrl: "PeoplePicker fetches this URL from the user's browser with the host's credentials; an agent "
                + "must not choose it.",
            onRemoveConfirm: "Over A2UI a removal applies in the dialog at once, and reaches the agent only in the "
                + "share event's removed list, so nothing is lost before Done.",
            keyBindings: "Over A2UI the dialog's keys work only inside its box, where the default Escape suffices.",
            closeOnBackdrop: "A contained dialog has no backdrop to click.",
        },
    },

    regions: ["sharedialog:body", "sharedialog:access-list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12000, mountCost: "light", holdsResources: false },

    defaultSize: { w: 520, h: 480 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
