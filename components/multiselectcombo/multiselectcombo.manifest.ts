/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: bd363f33-4b45-49bb-aba8-68de1b73c1d6
 * Created: 2026-10-10
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Multiselect Combo / CapabilityManifest
 * PURPOSE: Declares what Multiselect Combo can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Multiselect Combo]], [[DynamicFormSwitcher]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker multiselectcombo-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 3, #22): its selection is
 * a two-way value (ADR-134) whose changes also emit through an additive on(),
 * the agent can replace the items in place, and the selection is its state,
 * restored silently.
 */
export const MULTISELECTCOMBO_MANIFEST: CapabilityManifest =
{
    name: "multiselectcombo",
    factory: "createMultiselectCombo",
    factoryStyle: "options-first",
    label: "Multiselect Combo",
    icon: "bi-ui-checks",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user pick several options from a long, filterable, optionally grouped list, shown as "
            + "chips in a compact dropdown field.",
        avoidWhen: "For one choice or a short list of checkboxes use ChoicePicker; for free-form tags use Tagger.",
    },

    affords: [
        {
            shape: "collection",
            intents: ["edit", "browse"],
            cardinality: { min: 0, max: 2000 },
            minViewport: { w: 200, h: 40 },
        },
    ],

    emits: [
        { name: "change", payload: "collection", multi: false, legacyOption: "onChange" },
    ],

    // The options an agent rewrites, replaced in place (ADR-234).
    accepts: [
        { name: "items", payload: "collection", required: true },
    ],
    actions: [],
    stateKeys: ["value"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 3).
    protocol: {
        hostOnly: {
            selected: "The older name for the initial selection, kept for existing callers; over A2UI the two-way "
                + "value carries it.",
            onSelect: "Fires per picked option; the two-way value already carries the selection.",
            onDeselect: "Fires per removed option; the two-way value already carries the selection.",
            onFilterChange: "Fires per keystroke in the filter box, which filters the list locally.",
            onOpen: "Fires when the dropdown opens; that is view state, not information for an agent.",
            onClose: "Fires when the dropdown closes; that is view state, not information for an agent.",
            "items[].data": "Arbitrary consumer data for host callbacks; it has no schema an agent could follow.",
        },
    },

    regions: ["multiselectcombo:listbox"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 22123, mountCost: "light", holdsResources: false },

    defaultSize: { w: 320, h: 40 },
    defaultOptions: { items: [] },

    conformance: "surface",
    priority: 50,
};
