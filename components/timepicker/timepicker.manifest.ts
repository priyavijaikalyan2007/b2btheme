/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 090c9d9a-1019-4889-9aed-5c14551c00df
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Time Picker / CapabilityManifest
 * PURPOSE: Declares what Time Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Time Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker timepicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B2): it emits "timezone"
 * through an additive on() whenever the zone changes, and restores the zone
 * through getState()/setState(). The time itself is the two-way value.
 */
export const TIMEPICKER_MANIFEST: CapabilityManifest =
{
    name: "timepicker",
    factory: "createTimePicker",
    label: "Time Picker",
    icon: "bi-clock",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user pick a time of day, in a 12- or 24-hour clock, optionally with a timezone.",
        avoidWhen: "For a date and time together use DateTimeInput; for a length of time use DurationPicker.",
    },

    affords: [],
    emits: [
        // The zone changes what the time means, and TimeValue does not carry it (readiness step 2 B2).
        { name: "timezone", payload: "scalar", multi: false, legacyOption: "onTimezoneChange" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["timezone"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B2).
    protocol: {
        // Cleared is an absent path: clearing deletes the bound value (readiness spec §3.4).
        change: { cleared: null },
        hostOnly: {
            onSelect: "Fires when the user commits a pick; the two-way value already carries it to the agent.",
            onOpen: "Fires when the dropdown opens; that is view state, not information for an agent.",
            onClose: "Fires when the dropdown closes; that is view state, not information for an agent.",
        },
    },

    regions: ["timepicker:tz-list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 30548, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 200, h: 40 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
