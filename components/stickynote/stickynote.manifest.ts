/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: fde9a4f9-0012-4bf0-950a-5cbf09a4c977
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: StickyNote / CapabilityManifest
 * 📜 PURPOSE: Declares what StickyNote can render, emit, and accept. See
 *    ADR-142.
 * 🔗 RELATES: [[StickyNote]], [[DynamicCanvas]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker stickynote-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * StickyNote was written AFTER the Surface contract and only against its
 * public API, so it is `surface` from its first commit rather than by
 * retrofit — the dogfooding proof that the contract is sufficient.
 *
 * `mountCost` is trivial and `holdsResources` false by design: a note must
 * cost a textarea and nothing more, so that fifty of them stay affordable
 * under the canvas mount budget.
 */
export const STICKYNOTE_MANIFEST: CapabilityManifest =
{
    name: "stickynote",
    factory: "createStickyNote",
    factoryStyle: "container-first",
    label: "Sticky Note",
    icon: "bi-sticky",
    category: "annotation",

    affords: [
        {
            shape: "document",
            intents: ["author", "summarize"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 120, h: 80 },
        },
    ],

    emits: [
        { name: "change", payload: "scalar", multi: false, legacyOption: "onChange" },
        { name: "anchor", payload: "record", multi: false, legacyOption: "onAnchorChange" },
    ],

    accepts: [
        { name: "text", payload: "scalar", required: false },
    ],

    actions: [],

    stateKeys: ["text", "color", "collapsed"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 6_000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 220, h: 180 },
    defaultOptions: {},

    conformance: "surface",
    priority: 30,
};
