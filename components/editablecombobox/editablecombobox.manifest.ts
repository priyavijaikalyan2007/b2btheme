/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 19487915-a81c-44af-902c-367123498008
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Editable Combo Box / CapabilityManifest
 * PURPOSE: Declares what Editable Combo Box can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Editable Combo Box]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker editablecombobox-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const EDITABLECOMBOBOX_MANIFEST: CapabilityManifest =
{
    name: "editablecombobox",
    factory: "createEditableComboBox",
    label: "Editable Combo Box",
    icon: "bi-menu-button-wide",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user type freely or pick from a filtered list of suggestions in one field.",
        avoidWhen: "To choose only from a fixed list use ChoicePicker; for a search query use SearchBox.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B3).
    protocol: {
        hostOnly: {
            onOpen: "Fires when the popup opens; that is view state, not information for an agent.",
            onClose: "Fires when the popup closes; that is view state, not information for an agent.",
            onSelect: "Fires when the user picks an item; the two-way value already carries it.",
            filterFn: "A matching function; the default filter applies over A2UI.",
        },
    },

    regions: ["editablecombobox:combobox-listbox"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 14221, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 34 },
    defaultOptions: { items: [] },

    conformance: "field",
    priority: 50,
};
