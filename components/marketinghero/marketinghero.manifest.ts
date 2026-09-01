/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MarketingHero / CapabilityManifest
 * 📜 PURPOSE: Declares what MarketingHero can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it. See ADR-142 and ADR-146.
 * 🔗 RELATES: [[MarketingHero]], [[DynamicUIRuntime]], [[Resolver]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker marketinghero-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * MarketingHero is a `display` component: it mounts, renders, and tears down,
 * but carries no value and emits nothing the canvas wires.
 *
 * It is excluded from the ADR-134 field convention for the reason Sidebar and
 * Toolbar are — it is chrome, and nothing in it round-trips as a JSON value.
 */
export const MARKETINGHERO_MANIFEST: CapabilityManifest =
{
    name: "marketinghero",
    factory: "createMarketingHero",
    label: "Marketing Hero",
    icon: "bi-megaphone",
    category: "content",

    affords: [
        {
            shape: "document",
            intents: ["browse"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 360, h: 200 },
        },
    ],

    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 4_000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 720, h: 320 },
    defaultOptions: { title: "Ship enterprise UI faster" },

    factoryStyle: "container-first",
    conformance: "display",
    priority: 30,
};
