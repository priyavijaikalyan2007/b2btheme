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
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const EDITABLECOMBOBOX_MANIFEST: CapabilityManifest =
{
    name: "editablecombobox",
    factory: "createEditableComboBox",
    label: "Editable Combo Box",
    icon: "bi-menu-button-wide",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 14221, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 34 },
    defaultOptions: { items: [] },

    conformance: "display",
    priority: 50,
};
