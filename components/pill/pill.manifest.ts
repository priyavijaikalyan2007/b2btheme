/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7bc88a1e-30f8-4238-acd4-3c5b66bcf091
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Pill / CapabilityManifest
 * PURPOSE: Declares what Pill can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Pill]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker pill-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B4): it emits "click"
 * and "dismiss" with its label through an additive on(). It has no view
 * state, so stateKeys is empty (ADR-229).
 */
export const PILL_MANIFEST: CapabilityManifest =
{
    name: "pill",
    factory: "createPill",
    mountMethod: "getElement",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Pill",
    icon: "bi-capsule",
    category: "social",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a compact tag, filter or mention that the user can click, or dismiss to remove it.",
        avoidWhen: "For a status with a colour meaning use StatusBadge; for a person with an avatar use PersonChip.",
    },

    affords: [],
    emits: [
        { name: "click", payload: "scalar", multi: false, legacyOption: "onClick" },
        { name: "dismiss", payload: "scalar", multi: false, legacyOption: "onDismiss" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B4).
    protocol: {
        hostOnly: {
            // The link rule (readiness step 2 B4, ADR-229).
            href: "A link the user follows from the host's page; an agent must not choose it. Over A2UI, listen for "
                + "the click event and answer with openUrl.",
            metadata: "Written as data-* attributes that host scripts read (Bootstrap's data-bs-* act on click); an "
                + "agent must not set them.",
            onHover: "Fires as the pointer enters; transient, not information for an agent.",
            onHoverOut: "Fires as the pointer leaves; transient, not information for an agent.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 4484, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 100, h: 24 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
