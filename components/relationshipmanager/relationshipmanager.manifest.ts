/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: dd17887e-df3e-4d8d-baf0-c2f2b625505e
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Relationship Manager / CapabilityManifest
 * PURPOSE: Declares what Relationship Manager can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Relationship Manager]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker relationshipmanager-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const RELATIONSHIPMANAGER_MANIFEST: CapabilityManifest =
{
    name: "relationshipmanager",
    factory: "createRelationshipManager",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Relationship Manager",
    icon: "bi-diagram-2",
    category: "social",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 14990, mountCost: "light", holdsResources: false },

    defaultSize: { w: 500, h: 350 },
    defaultOptions: { relationships: [], entities: [] },

    conformance: "display",
    priority: 50,
};
