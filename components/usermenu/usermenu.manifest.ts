/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 5b282f5f-5943-41e8-b9c4-6180793b07f1
 * Created: 2026-10-10
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: User Menu / CapabilityManifest
 * PURPOSE: Declares what User Menu can render, so the Dynamic UI canvas can resolve,
 *    mount, and budget it. See ADR-142.
 * RELATES: [[User Menu]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker usermenu-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down. Promotion to `field` or `surface` is a change to the
 * component's own public API, not to this file, and the conformance suite
 * proves the level rather than taking its word for it.
 *
 * The 2026-08-03 seed recorded this as blocked on an undetermined option
 * shape. `createUserMenu(containerId, options)` was already the canonical
 * container-first form and the two required options are `userName` and
 * `menuItems` — the blocker was that nobody had looked (ADR-160).
 */
export const USERMENU_MANIFEST: CapabilityManifest =
{
    name: "usermenu",
    factory: "createUserMenu",
    factoryStyle: "container-first",
    label: "User Menu",
    icon: "bi-person-circle",
    category: "social",

    affords: [
        {
            shape: "record",
            intents: ["summarize", "navigate"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 160, h: 36 },
        },
    ],

    emits: [
        { name: "select", payload: "scalar", multi: false, legacyOption: "onItemClick" },
        { name: "signout", payload: "scalar", multi: false, legacyOption: "onSignOut" },
    ],

    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 11866, mountCost: "light", holdsResources: false },

    defaultSize: { w: 220, h: 36 },
    defaultOptions: { userName: "", menuItems: [] },

    conformance: "display",
    priority: 50,
};
