/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SiteFooter / CapabilityManifest
 * 📜 PURPOSE: Declares what SiteFooter can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it. See ADR-142 and ADR-146.
 * 🔗 RELATES: [[SiteFooter]], [[DynamicUIRuntime]], [[Resolver]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sitefooter-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * SiteFooter is a `display` component: it mounts, renders, and tears down,
 * but carries no value and emits nothing the canvas wires.
 *
 * Excluded from the ADR-134 field convention for the reason Sidebar and
 * Toolbar are — it is navigation chrome, not a field control.
 */
export const SITEFOOTER_MANIFEST: CapabilityManifest =
{
    name: "sitefooter",
    factory: "createSiteFooter",
    label: "Site Footer",
    icon: "bi-layout-text-window-reverse",
    category: "navigation",

    affords: [
        {
            shape: "collection",
            intents: ["browse"],
            // A comfort estimate for total links, not a limit the component
            // enforces — nothing rejects a longer list.
            cardinality: { min: 1, max: 24 },
            minViewport: { w: 320, h: 160 },
        },
    ],

    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 4_000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 720, h: 240 },
    defaultOptions: { organization: { name: "Your organization" } },

    factoryStyle: "container-first",
    conformance: "display",
    priority: 20,
};
