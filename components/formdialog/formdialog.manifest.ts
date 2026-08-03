/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 96d416a9-2eb0-473d-983f-3668105bb07b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Form Dialog / CapabilityManifest
 * PURPOSE: Declares what Form Dialog can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Form Dialog]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker formdialog-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const FORMDIALOG_MANIFEST: CapabilityManifest =
{
    name: "formdialog",
    factory: "createFormDialog",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Form Dialog",
    icon: "bi-input-cursor-text",
    category: "feedback",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 27863, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
