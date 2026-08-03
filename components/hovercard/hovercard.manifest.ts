/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 0913b3d7-930b-4457-8b77-f5dadc7d7a01
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Hovercard / CapabilityManifest
 * PURPOSE: Declares what Hovercard can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Hovercard]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker hovercard-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const HOVERCARD_MANIFEST: CapabilityManifest =
{
    name: "hovercard",
    factory: "createHoverCard",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Hovercard",
    icon: "bi-square",
    category: "misc",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 9262, mountCost: "light", holdsResources: false },

    defaultSize: { w: 320, h: 240 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
