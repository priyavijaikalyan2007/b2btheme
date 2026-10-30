/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MarketingHero / CapabilityManifest
 * 📜 PURPOSE: Declares what MarketingHero can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it. See ADR-142 and ADR-146.
 * 🔗 RELATES: [[MarketingHero]], [[DynamicUIRuntime]], [[Resolver]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker marketinghero-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/** A call to action as an agent writes it: its text only (B8). */
const ACTION_SCHEMA = {
    type: "object",
    description: "A call-to-action button. Clicking it sends its event with this text.",
    properties: {
        text: { type: "string", description: "Visible label. Rendered as text." },
    },
    required: ["text"],
    additionalProperties: false,
};

/**
 * Declared at `surface` conformance (readiness step 2 B8): its two actions'
 * clicks emit through an additive on(). It carries no value: it is excluded
 * from the ADR-134 field convention for the reason Sidebar and Toolbar are,
 * as chrome, and it has no view state to restore (ADR-229).
 */
export const MARKETINGHERO_MANIFEST: CapabilityManifest =
{
    name: "marketinghero",
    factory: "createMarketingHero",
    label: "Marketing Hero",
    icon: "bi-megaphone",
    category: "content",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Open a page with a large heading, a short supporting paragraph and up to two call-to-action "
            + "buttons, such as Get started and Read the docs.",
        avoidWhen: "For an empty view inside an app use EmptyState; for a single headline figure use MetricCard.",
    },

    affords: [
        {
            shape: "document",
            intents: ["browse"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 360, h: 200 },
        },
    ],

    // No legacyOption: each action's onClick is nested in it, and over A2UI it does not cross (InlineToolbar's
    // precedent). The buttons emit with or without it.
    emits: [
        { name: "primary", payload: "scalar", multi: false },
        { name: "secondary", payload: "scalar", multi: false },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-229, readiness step 2 B8).
    protocol: {
        hostOnly: {
            aside: "An element; over A2UI the hero shows its text and buttons until layouts take A2UI children "
                + "(step 4).",
            "primaryAction.onClick": "Host code run on the click; over A2UI the primary event carries the click.",
            "secondaryAction.onClick": "Host code run on the click; over A2UI the secondary event carries the "
                + "click.",
        },
        schemas: {
            // The link rule (ADR-229): href is left out, so an agent's link is rejected and the action renders as a
            // button. onClick is host code. Over A2UI, listen for the primary or secondary event and answer with
            // openUrl.
            primaryAction: ACTION_SCHEMA,
            secondaryAction: ACTION_SCHEMA,
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 4_000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 720, h: 320 },
    defaultOptions: { title: "Ship enterprise UI faster" },

    factoryStyle: "container-first",
    conformance: "surface",
    priority: 30,
};
