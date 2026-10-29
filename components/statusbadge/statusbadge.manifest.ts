/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 969b761c-4e82-46a5-b3c9-cc82b6d85c96
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Status Badge / CapabilityManifest
 * PURPOSE: Declares what Status Badge can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Status Badge]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker statusbadge-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B4): a clickable badge
 * emits "click" with its label through an additive on(). It has no view
 * state, so stateKeys is empty (ADR-229).
 */
export const STATUSBADGE_MANIFEST: CapabilityManifest =
{
    name: "statusbadge",
    factory: "createStatusBadge",
    label: "Status Badge",
    icon: "bi-circle-fill",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a short status, such as Operational or Degraded, as a coloured badge, optionally clickable "
            + "for details.",
        avoidWhen: "For a removable tag or filter use Pill; for a number with a trend use MetricCard.",
    },

    affords: [],
    emits: [
        { name: "click", payload: "scalar", multi: false, legacyOption: "onClick" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 5051, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 80, h: 24 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
