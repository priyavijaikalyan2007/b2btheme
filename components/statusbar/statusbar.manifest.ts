/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e4e22c79-20f2-4e9e-b846-1ddb4c277d50
 * Created: 2026-11-01
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Status Bar / CapabilityManifest
 * PURPOSE: Declares what Status Bar can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it, and the A2UI catalog can publish it.
 *    See ADR-142, ADR-244.
 * RELATES: [[Status Bar]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker statusbar-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance (readiness step 5, ADR-244): label and
 * value regions an agent rewrites, with no gesture to report. Over A2UI it is
 * contained (protocol.fixed), so it sits in its surface instead of pinning
 * itself to the bottom of the viewport, and it is shown in the adapter's
 * container through the additive container option.
 */
export const STATUSBAR_MANIFEST: CapabilityManifest =
{
    name: "statusbar",
    factory: "createStatusBar",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Status Bar",
    icon: "bi-segmented-nav",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a strip of short label and value pairs separated by dividers, such as Ln 12 | UTF-8 | Saved, "
            + "under an editor or a panel.",
        avoidWhen: "For one headline number use MetricCard; for a status word use StatusBadge.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-244).
    protocol: {
        fixed: { contained: true },
        hostOnly: {
            zIndex: "Over A2UI the bar is contained in its surface (protocol.fixed), where a stacking order above the "
                + "page means nothing.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 600, h: 28 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
