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
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const TAGGER_MANIFEST: CapabilityManifest =
{
    name: "tagger",
    factory: "createTagger",
    label: "Tagger",
    icon: "bi-tags",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 16407, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 34 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
