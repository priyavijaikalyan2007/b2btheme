/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2b2fe619-886e-4378-8339-379e342eda70
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: File Upload / CapabilityManifest
 * PURPOSE: Declares what File Upload can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[File Upload]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker fileupload-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const FILEUPLOAD_MANIFEST: CapabilityManifest =
{
    name: "fileupload",
    factory: "createFileUpload",
    label: "File Upload",
    icon: "bi-cloud-upload",
    category: "input",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 15414, mountCost: "light", holdsResources: false },

    defaultSize: { w: 300, h: 200 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
