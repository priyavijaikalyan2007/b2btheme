/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 3913cd37-3088-4235-9090-29f69332caae
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Code Editor / CapabilityManifest
 * PURPOSE: Declares what Code Editor can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Code Editor]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker codeeditor-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `field` conformance: the handle exposes getValue and setValue
 * (ADR-134), so the canvas can read and set its value, and the conformance
 * suite verifies that contract. `field` is also the level the suite computes
 * this component requires (ADR-219). Promoted from `display` on 2026-10-25,
 * when the suite showed it already met that level.
 */
export const CODEEDITOR_MANIFEST: CapabilityManifest =
{
    name: "codeeditor",
    factory: "createCodeEditor",
    label: "Code Editor",
    icon: "bi-code-square",
    category: "content",

    affords: [
        {
            shape: "document",
            intents: ["edit", "author"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 320, h: 200 },
        },
    ],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    regions: ["codeeditor:editor", "codeeditor:cm-scroller"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 14790, mountCost: "light", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "field",
    priority: 50,
};
