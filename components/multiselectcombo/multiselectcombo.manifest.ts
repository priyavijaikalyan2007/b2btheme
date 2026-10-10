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
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down. Promotion to `field` or `surface` is a change to the
 * component's own public API, not to this file, and the conformance suite
 * proves the level rather than taking its word for it.
 *
 * `display` understates it — the component already carries the field-capable
 * `value` alias for DynamicFormSwitcher — but conformance is proven, not
 * claimed, and promoting it to `field` is a separate commit that runs the
 * field checks against getValue/setValue.
 */
export const MULTISELECTCOMBO_MANIFEST: CapabilityManifest =
{
    name: "multiselectcombo",
    factory: "createMultiselectCombo",
    factoryStyle: "options-first",
    label: "Multiselect Combo",
    icon: "bi-ui-checks",
    category: "input",

    affords: [
        {
            shape: "collection",
            intents: ["edit", "browse"],
            // The dropdown renders and filters every item in the DOM.
            cardinality: { min: 0, max: 2000 },
            minViewport: { w: 200, h: 40 },
        },
    ],

    emits: [
        { name: "change", payload: "collection", multi: false, legacyOption: "onChange" },
    ],

    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 22123, mountCost: "light", holdsResources: false },

    defaultSize: { w: 320, h: 40 },
    defaultOptions: { items: [] },

    conformance: "display",
    priority: 50,
};
