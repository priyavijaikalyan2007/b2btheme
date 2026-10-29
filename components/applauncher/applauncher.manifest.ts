/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a2848bdd-3342-415d-be49-05a7ec2f10c6
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: App Launcher / CapabilityManifest
 * PURPOSE: Declares what App Launcher can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[App Launcher]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker applauncher-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B8): opening an app and
 * starring one emit through an additive on(), and its search can be answered
 * by the agent. It has no view state to restore (ADR-229).
 */
export const APPLAUNCHER_MANIFEST: CapabilityManifest =
{
    name: "applauncher",
    factory: "createAppLauncher",
    factoryStyle: "options-first",
    label: "App Launcher",
    icon: "bi-grid-3x3-gap",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Offer a grid of applications or tools the user can open, with search, favourites and recent "
            + "apps, from a trigger button or in place.",
        avoidWhen: "For switching between organisations use TenantSwitcher; for choosing an option in a form use "
            + "ChoicePicker.",
    },

    affords: [],
    emits: [
        { name: "select", payload: "record", multi: false, legacyOption: "onSelect" },
        { name: "favoriteToggle", payload: "record", multi: false, legacyOption: "onFavoriteToggle" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-225, readiness step 2 B8).
    protocol: {
        providers: {
            // Searches beyond the given apps; a newer query replaces an unanswered one.
            onSearch: { request: "search" },
        },
        hostOnly: {
            onOpen: "Fires when the launcher opens; that is view state, not information for an agent.",
            onClose: "Fires when the launcher closes; that is view state, not information for an agent.",
            favoritesKey: "A localStorage key on the host's origin, which the component reads and overwrites; an "
                + "agent must not choose which of the host's stored entries that is.",
            recentKey: "A localStorage key on the host's origin, which the component reads and overwrites; an agent "
                + "must not choose which of the host's stored entries that is.",
            "apps[].url": "Nothing reads this option.",
            "apps[].data": "An arbitrary payload for host callbacks; it has no schema an agent could follow.",
        },
    },

    regions: [
        "applauncher:fullpage-content",
        "applauncher:sidebar",
        "applauncher:tabs",
        "applauncher:sections",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 22217, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 300, h: 300 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
