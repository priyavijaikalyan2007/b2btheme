/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 44edf0ea-5d9f-49e0-8599-2c8d792e28ee
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Skeleton Loader / CapabilityManifest
 * PURPOSE: Declares what Skeleton Loader can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Skeleton Loader]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker skeletonloader-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const SKELETONLOADER_MANIFEST: CapabilityManifest =
{
    name: "skeletonloader",
    factory: "createSkeletonLoader",
    factoryStyle: "options-first",
    label: "Skeleton Loader",
    icon: "bi-placeholder",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222, #37).
    agent: {
        useWhen: "Hold the place of content that is still loading, shaped like text, a card, an avatar or a table.",
        avoidWhen: "For a status the user should read use Text; replace the loader as soon as the content arrives.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 3806, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 300, h: 100 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
