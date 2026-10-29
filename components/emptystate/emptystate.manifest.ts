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

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Fill an empty view with an icon, a heading, a short explanation and up to two buttons, such as "
            + "Create project.",
        avoidWhen: "For a loading placeholder use SkeletonLoader; for a single call to action without the empty "
            + "message use Button.",
    },

    affords: [
        {
            shape: "collection",
            intents: ["browse"],
            cardinality: { min: 0, max: 0 },
            minViewport: { w: 200, h: 120 },
        },
    ],

    emits: [
        { name: "action", payload: "scalar", multi: false, legacyOption: "onAction" },
        { name: "secondary", payload: "scalar", multi: false, legacyOption: "onSecondary" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B4).
    protocol: {
        hostOnly: {
            illustration: "An element; over A2UI the icon option stands in until layouts take A2UI children (step 4).",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 4_611, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 320, h: 200 },
    defaultOptions: { heading: "Nothing here yet" },

    conformance: "surface",
    priority: 40,
};
