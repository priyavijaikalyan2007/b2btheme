/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b992c318-330b-4aec-8ef8-dd15130e08aa
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DatePicker / CapabilityManifest
 * 📜 PURPOSE: Declares what DatePicker can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it. See ADR-142.
 * 🔗 RELATES: [[DatePicker]], [[DynamicUIRuntime]], [[DynamicFormSwitcher]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker datepicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * DatePicker is a `field` component: it carries a single value and already
 * satisfies the ADR-134 contract (`getValue` / `setValue` / `destroy` with a
 * canonical `createDatePicker(containerId, options)` factory), so it needed no
 * code change to become canvas-capable.
 *
 * `emits` is deliberately empty. The component does have `onChange` and
 * `onSelect` constructor callbacks, but declaring channels here would claim a
 * subscribable `on()` surface it does not yet have — and at `field` level the
 * conformance suite does not exercise channels, so the claim would go
 * unverified. Channels are declared when it is promoted to `surface`.
 */
export const DATEPICKER_MANIFEST: CapabilityManifest =
{
    name: "datepicker",
    factory: "createDatePicker",
    label: "Date Picker",
    icon: "bi-calendar-date",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user pick one calendar date from a popup calendar, with optional limits.",
        avoidWhen: "For a date and a time use DateTimeInput; for a fiscal month or quarter use PeriodPicker.",
    },

    affords: [
        {
            shape: "scalar",
            intents: ["edit", "schedule"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 220, h: 40 },
        },
    ],

    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B2).
    protocol: {
        // Cleared is an absent path: clearing deletes the bound value (readiness spec §3.4).
        change: { cleared: null },
        hostOnly: {
            onSelect: "Fires when the user commits a pick; the two-way value already carries it to the agent.",
            onOpen: "Fires when the dropdown opens; that is view state, not information for an agent.",
            onClose: "Fires when the dropdown closes; that is view state, not information for an agent.",
            isDateDisabled:
                "Returns a per-day decision while the calendar renders; an agent round trip cannot sit there.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 25_441, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 40 },
    defaultOptions: {},

    conformance: "field",
    priority: 60,
};
