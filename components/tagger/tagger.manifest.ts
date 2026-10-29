/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2488d575-0634-4a88-af21-9b518b7178a4
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Tagger / CapabilityManifest
 * PURPOSE: Declares what Tagger can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Tagger]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker tagger-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B3): it emits "change"
 * with the tag list through an additive on(), and restores its tags through
 * getState()/setState(), so an agent's tags update in place.
 */
export const TAGGER_MANIFEST: CapabilityManifest =
{
    name: "tagger",
    factory: "createTagger",
    label: "Tagger",
    icon: "bi-tags",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user add and remove tags, free-form or from a categorised taxonomy, as chips.",
        avoidWhen: "To pick people use PeoplePicker; to choose one option from a list use ChoicePicker.",
    },

    affords: [],
    emits: [
        { name: "change", payload: "record", multi: true, legacyOption: "onChange" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["tags"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B3).
    protocol: {
        hostOnly: {
            onAdd: "Fires per added tag; the change event already carries the whole tag list.",
            onRemove: "Fires per removed tag; the change event already carries the whole tag list.",
            validator: "Returns an accept-or-reject decision as the user types; an agent round trip cannot.",
            onValidationError: "Reports a rejected entry to the user in place; nothing reaches the tag list.",
            "tags[].data": "Arbitrary consumer data for host callbacks; it has no schema an agent could fill.",
        },
    },

    regions: ["tagger:dropdown"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 16407, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 34 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
