/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: bf182f22-7593-4cf5-a72d-8a847f403b2e
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: EmptyState / CapabilityManifest
 * 📜 PURPOSE: Declares what EmptyState can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it. See ADR-142.
 * 🔗 RELATES: [[EmptyState]], [[DynamicUIRuntime]], [[Resolver]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker emptystate-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * EmptyState is a `display` component: it mounts, renders, and tears down,
 * but carries no value and emits nothing the canvas wires.
 *
 * Its affordance is deliberately narrow — a collection of exactly zero items.
 * That is what lets the resolver reach for it automatically when a query comes
 * back empty, instead of mounting a grid with no rows in it.
 */
export const EMPTYSTATE_MANIFEST: CapabilityManifest =
{
    name: "emptystate",
    factory: "createEmptyState",
    label: "Empty State",
    icon: "bi-inbox",
    category: "feedback",

    affords: [
        {
            shape: "collection",
            intents: ["browse"],
            cardinality: { min: 0, max: 0 },
            minViewport: { w: 200, h: 120 },
        },
    ],

    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 4_611, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 320, h: 200 },
    defaultOptions: { heading: "Nothing here yet" },

    conformance: "display",
    priority: 40,
};
