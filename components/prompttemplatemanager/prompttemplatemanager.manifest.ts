/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 8ff9486b-2aef-4542-8df3-88cca5e7ca1d
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Prompt Template Manager / CapabilityManifest
 * PURPOSE: Declares what Prompt Template Manager can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Prompt Template Manager]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker prompttemplatemanager-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const PROMPTTEMPLATEMANAGER_MANIFEST: CapabilityManifest =
{
    name: "prompttemplatemanager",
    factory: "createPromptTemplateManager",
    factoryStyle: "options-first",
    label: "Prompt Template Manager",
    icon: "bi-file-earmark-code",
    category: "ai",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 26795, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 600, h: 450 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
