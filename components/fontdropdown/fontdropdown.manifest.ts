/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 0451b62a-7eda-46b6-8536-c88fd2c977e9
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Font Dropdown / CapabilityManifest
 * PURPOSE: Declares what Font Dropdown can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Font Dropdown]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker fontdropdown-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const FONTDROPDOWN_MANIFEST: CapabilityManifest =
{
    name: "fontdropdown",
    factory: "createFontDropdown",
    label: "Font Dropdown",
    icon: "bi-fonts",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 15765, mountCost: "light", holdsResources: false },

    defaultSize: { w: 200, h: 34 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
