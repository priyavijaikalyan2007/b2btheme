/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: bd279eb6-5de8-49a7-b147-12b2f864130d
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Presence Indicator / CapabilityManifest
 * PURPOSE: Declares what Presence Indicator can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Presence Indicator]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker presenceindicator-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance (readiness step 2 B4): per-person clicks
 * render through PersonChip, which the A2UI adapter does not load, so over
 * agent protocols onClick is host-only and nothing is emitted.
 */
export const PRESENCEINDICATOR_MANIFEST: CapabilityManifest =
{
    name: "presenceindicator",
    factory: "createPresenceIndicator",
    label: "Presence Indicator",
    icon: "bi-people-fill",
    category: "social",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show who is here as a stack of avatars with a count of the rest, which the user can expand into a "
            + "list.",
        avoidWhen: "For one person with their name use PersonChip; to let the user pick people use PeoplePicker.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B4).
    protocol: {
        hostOnly: {
            onClick: "Per-person clicks render through PersonChip, which the A2UI adapter does not load yet.",
            onExpand: "Fires when the list opens; that is view state, not information for an agent.",
            onCollapse: "Fires when the list closes; that is view state, not information for an agent.",
        },
        schemas: {
            // people[].metadata is left out: PersonChip writes it as data-* attributes that host scripts read
            // (Bootstrap's data-bs-* act on click), so an agent's metadata is rejected.
            people: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Unique identifier." },
                        name: { type: "string", description: "Display name; the initials come from it." },
                        email: { type: "string", description: "Email address, shown in the tooltip." },
                        avatarUrl: { type: "string", description: "Avatar image URL; without one, coloured initials." },
                        role: { type: "string", description: "Role or job title." },
                        status: { enum: ["online", "offline", "busy", "away"], description: "Presence dot." },
                    },
                    required: ["id", "name"],
                    additionalProperties: false,
                },
            },
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 7208, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 120, h: 32 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
