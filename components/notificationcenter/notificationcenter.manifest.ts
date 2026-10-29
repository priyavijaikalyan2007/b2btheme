/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 23246b86-a8fb-4d92-876a-1f39b2092fde
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Notification Center / CapabilityManifest
 * PURPOSE: Declares what Notification Center can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Notification Center]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker notificationcenter-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B6): clicking,
 * dismissing and marking all read emit through an additive on(). Nothing to
 * restore (ADR-229).
 */
export const NOTIFICATIONCENTER_MANIFEST: CapabilityManifest =
{
    name: "notificationcenter",
    factory: "createNotificationCenter",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Notification Center",
    icon: "bi-bell-fill",
    category: "social",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a bell with a list of notifications the user can open, dismiss or mark read; the agent hears "
            + "each.",
        avoidWhen: "For a passive timeline use ActivityFeed; for one message use Text or a Modal.",
    },

    affords: [],
    emits: [
        { name: "notificationClick", payload: "record", multi: false, legacyOption: "onNotificationClick" },
        { name: "dismiss", payload: "scalar", multi: false, legacyOption: "onDismiss" },
        { name: "markAllRead", payload: "collection", multi: false, legacyOption: "onMarkAllRead" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B6).
    protocol: {
        hostOnly: {
            "notifications[].data": "An arbitrary payload for host code; it has no schema an agent could follow.",
            onUnreadCountChange: "Follows from the notifications and the user's reads, which the other events already "
                + "report.",
        },
    },

    regions: ["notificationcenter:tabs", "notificationcenter:list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 10704, mountCost: "light", holdsResources: false },

    defaultSize: { w: 350, h: 400 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
