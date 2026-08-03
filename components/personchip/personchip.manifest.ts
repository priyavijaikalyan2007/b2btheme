/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f103eb54-01ce-4ff5-83d9-c25b4fb2a012
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Person Chip / CapabilityManifest
 * PURPOSE: Declares what Person Chip can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Person Chip]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker personchip-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const PERSONCHIP_MANIFEST: CapabilityManifest =
{
    name: "personchip",
    factory: "createPersonChip",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Person Chip",
    icon: "bi-person-badge",
    category: "social",

    affords: [
        {
            shape: "record",
            intents: ["summarize"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 120, h: 32 },
        },
    ],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6628, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 180, h: 32 },
    defaultOptions: { name: "" },

    conformance: "display",
    priority: 50,
};
