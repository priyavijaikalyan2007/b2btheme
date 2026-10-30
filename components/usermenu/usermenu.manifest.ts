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
 * Declared at `surface` conformance (readiness step 3, #26): clicking an item
 * and signing out emit through an additive on(), and the agent can replace the
 * menu items in place. It has no view state to restore (ADR-229): the menu
 * closes when the canvas scrolls it away.
 */
export const USERMENU_MANIFEST: CapabilityManifest =
{
    name: "usermenu",
    factory: "createUserMenu",
    factoryStyle: "container-first",
    label: "User Menu",
    icon: "bi-person-circle",
    category: "social",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show the signed-in user's avatar, name and presence as a trigger that opens a menu of account "
            + "actions such as Profile, Settings and Sign out.",
        avoidWhen: "To show a person inline without a menu use PersonChip; to switch organisations use "
            + "TenantSwitcher.",
    },

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

    // The items an agent rewrites, replaced in place (ADR-234).
    accepts: [
        { name: "menuItems", payload: "collection", required: true },
    ],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 11866, mountCost: "light", holdsResources: false },

    defaultSize: { w: 220, h: 36 },
    defaultOptions: { userName: "", menuItems: [] },

    conformance: "surface",
    priority: 50,
};
