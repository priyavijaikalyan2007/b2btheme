/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 73006221-afec-4acc-bac3-33f375ff2b34
 * Created: 2026-10-10
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Timeline / CapabilityManifest
 * PURPOSE: Declares what Timeline can render, so the Dynamic UI canvas can resolve,
 *    mount, and budget it. See ADR-142.
 * RELATES: [[Timeline]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker timeline-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down. Promotion to `field` or `surface` is a change to the
 * component's own public API, not to this file, and the conformance suite
 * proves the level rather than taking its word for it.
 *
 * `containerAs: "id"` is load-bearing: `TimelineOptions.containerId` takes the
 * host's id STRING, not the element. Declaring the element form here produces a
 * component that constructs cleanly and renders nothing, which is the failure
 * the renders-content check exists to catch (it caught exactly this on
 * TreeView).
 */
export const TIMELINE_MANIFEST: CapabilityManifest =
{
    name: "timeline",
    factory: "createTimeline",
    factoryStyle: "options-only",
    containerOption: "containerId",
    containerAs: "id",
    label: "Timeline",
    icon: "bi-bar-chart-steps",
    category: "data",

    affords: [
        {
            shape: "timeseries",
            intents: ["browse", "inspect", "compare"],
            // Every item becomes DOM; nothing here virtualizes, so the
            // ceiling is a real one rather than a formality.
            cardinality: { min: 0, max: 5000 },
            minViewport: { w: 320, h: 160 },
        },
    ],

    emits: [
        { name: "select", payload: "record", multi: false, legacyOption: "onItemClick" },
    ],

    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    // holdsResources: it retains both an IntersectionObserver (lazy row
    // rendering) and a ResizeObserver, so the canvas must count it against
    // the observer budget rather than treating it as inert DOM.
    weight: { js: 27023, mountCost: "moderate", holdsResources: true },

    defaultSize: { w: 720, h: 260 },
    defaultOptions: { items: [] },

    conformance: "display",
    priority: 50,
};
