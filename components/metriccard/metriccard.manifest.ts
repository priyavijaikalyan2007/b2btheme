/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: caf67199-8038-47ed-ace3-712b733f3d68
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Metriccard / CapabilityManifest
 * PURPOSE: Declares what Metriccard can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Metriccard]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker metriccard-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const METRICCARD_MANIFEST: CapabilityManifest =
{
    name: "metriccard",
    factory: "createMetricCard",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Metriccard",
    icon: "bi-square",
    category: "misc",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 7019, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 320, h: 240 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
