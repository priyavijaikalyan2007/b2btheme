/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 02de3faf-5a84-48dc-abea-501611bba3cf
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Masked Entry / CapabilityManifest
 * PURPOSE: Declares what Masked Entry can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Masked Entry]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker maskedentry-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const MASKEDENTRY_MANIFEST: CapabilityManifest =
{
    name: "maskedentry",
    factory: "createMaskedEntry",
    label: "Masked Entry",
    icon: "bi-shield-lock",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user enter a secret such as a password or API key, masked, with reveal and copy.",
        avoidWhen: "For ordinary text that need not be hidden use TextField.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B3).
    protocol: {
        hostOnly: {
            onCopy: "Copying the secret is a local action; an agent must not be told about it.",
            onReveal: "Revealing the secret is a local view action, not information for an agent.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 8279, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 34 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
