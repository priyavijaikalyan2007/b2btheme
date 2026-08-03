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
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const CODEEDITOR_MANIFEST: CapabilityManifest =
{
    name: "codeeditor",
    factory: "createCodeEditor",
    label: "Code Editor",
    icon: "bi-code-square",
    category: "content",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 14790, mountCost: "light", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
