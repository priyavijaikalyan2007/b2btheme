/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a0a5b4d6-7762-4bfe-b365-4579bb8fefa0
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Audit Log Viewer / CapabilityManifest
 * PURPOSE: Declares what Audit Log Viewer can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Audit Log Viewer]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker auditlogviewer-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const AUDITLOGVIEWER_MANIFEST: CapabilityManifest =
{
    name: "auditlogviewer",
    factory: "createAuditLogViewer",
    factoryStyle: "options-first",
    label: "Audit Log Viewer",
    icon: "bi-journal-text",
    category: "governance",

    affords: [
        {
            shape: "collection",
            intents: ["browse", "inspect"],
            cardinality: { min: 1, max: 50000 },
            minViewport: { w: 320, h: 200 },
        },
    ],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 18321, mountCost: "light", holdsResources: false },

    defaultSize: { w: 600, h: 350 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
