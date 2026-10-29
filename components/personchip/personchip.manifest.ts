/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f103eb54-01ce-4ff5-83d9-c25b4fb2a012
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Person Chip / CapabilityManifest
 * PURPOSE: Declares what Person Chip can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Person Chip]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker personchip-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B4): a clickable chip
 * emits "click" with { name, email } through an additive on(). It has no view
 * state, so stateKeys is empty (ADR-229).
 */
export const PERSONCHIP_MANIFEST: CapabilityManifest =
{
    name: "personchip",
    factory: "createPersonChip",
    mountMethod: "getElement",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Person Chip",
    icon: "bi-person-badge",
    category: "social",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show one person compactly with an avatar or initials, a name and a presence dot; the user can click "
            + "it.",
        avoidWhen: "For several people at once use PresenceIndicator; to let the user pick people use PeoplePicker.",
    },

    affords: [
        {
            shape: "record",
            intents: ["summarize"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 120, h: 32 },
        },
    ],
    emits: [
        { name: "click", payload: "record", multi: false, legacyOption: "onClick" },
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
    weight: { js: 6628, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 180, h: 32 },
    defaultOptions: { name: "" },

    conformance: "surface",
    priority: 50,
};
