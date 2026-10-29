/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: af3a8621-b6c8-43ed-9ab5-8c128e4e285c
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: CRON Picker / CapabilityManifest
 * PURPOSE: Declares what CRON Picker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[CRON Picker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker cronpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const CRONPICKER_MANIFEST: CapabilityManifest =
{
    name: "cronpicker",
    factory: "createCronPicker",
    label: "CRON Picker",
    icon: "bi-calendar-range",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user build a recurring schedule as a CRON expression, with presets and a readable summary.",
        avoidWhen: "For a single date use DatePicker; for a length of time use DurationPicker.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B2).
    protocol: {
        hostOnly: {
            onPresetSelect:
                "Fires when a preset is chosen; the two-way value already carries the resulting expression.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 18743, mountCost: "light", holdsResources: false },

    defaultSize: { w: 360, h: 280 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
