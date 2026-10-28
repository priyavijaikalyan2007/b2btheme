/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e33d126d-aca3-4662-bebc-9cc6c52e7846
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: People Picker / CapabilityManifest
 * PURPOSE: Declares what People Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[People Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker peoplepicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B3): its onSearch is a
 * provider an A2UI agent answers (ADR-225). It emits no channels; it restores
 * its selection through getState()/setState().
 */
export const PEOPLEPICKER_MANIFEST: CapabilityManifest =
{
    name: "peoplepicker",
    factory: "createPeoplePicker",
    label: "People Picker",
    icon: "bi-people",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user find and pick one or more people by name, with each search answered by the agent.",
        avoidWhen: "For free-form tags use Tagger; for a fixed list of options use ChoicePicker.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: ["value"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B3).
    protocol: {
        providers: {
            onSearch: { request: "search" },
        },
        hostOnly: {
            onOpen: "Fires when the popup opens; that is view state, not information for an agent.",
            onClose: "Fires when the popup closes; that is view state, not information for an agent.",
            // The URL-fetch rule (readiness step 2 §4).
            searchUrl: "The component fetches this URL from the user's browser with the host's credentials; "
                + "an agent must not choose it.",
            onSelect: "Fires per picked person; the two-way value already carries the selection.",
            onDeselect: "Fires per removed person; the two-way value already carries the selection.",
            onSearchError: "A failed search already reaches the agent as OUTCROP_PROVIDER_TIMEOUT.",
        },
    },

    regions: ["peoplepicker:dropdown"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 18910, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 40 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
