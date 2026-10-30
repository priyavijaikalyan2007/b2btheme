/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: db786edc-63e9-406a-9d4e-0d1a0312319b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Annotation / CapabilityManifest
 * 📜 PURPOSE: Declares what Annotation can render, emit, and accept. See
 *    ADR-142.
 * 🔗 RELATES: [[Annotation]], [[DynamicCanvas]], [[StickyNote]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker annotation-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Like StickyNote, written after the Surface contract and only against its
 * public API, so it is `surface` from its first commit rather than by
 * retrofit.
 *
 * Inline SVG keeps `mountCost` trivial and `holdsResources` false: a canvas
 * full of annotations must not consume the mount budget that its actual
 * content needs.
 */
export const ANNOTATION_MANIFEST: CapabilityManifest =
{
    name: "annotation",
    factory: "createAnnotation",
    factoryStyle: "container-first",
    presentation: "overlay",
    label: "Annotation",
    icon: "bi-pencil",
    category: "annotation",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Mark something with a short note the user can expand and edit: a callout, an arrow or a "
            + "highlight, collapsed to a marker until opened.",
        avoidWhen: "For a free-standing note use StickyNote; for a status label use StatusBadge.",
    },

    affords: [
        {
            shape: "document",
            intents: ["author"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 80, h: 60 },
        },
    ],

    emits: [
        { name: "change", payload: "record", multi: false, legacyOption: "onChange" },
        { name: "anchor", payload: "record", multi: false, legacyOption: "onAnchorChange" },
    ],

    accepts: [
        { name: "label", payload: "scalar", required: false },
    ],

    actions: [],

    stateKeys: ["kind", "label", "color"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B9).
    protocol: {
        // onChange passes { kind, label, color }, not the value alias, so it is the change event (ADR-222).
        change: "event",
        hostOnly: {
            onToggle: "Fires as the annotation expands or collapses; that is view state, not information for an "
                + "agent.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 7_000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 200, h: 140 },
    defaultOptions: {},

    conformance: "surface",
    priority: 25,
};
