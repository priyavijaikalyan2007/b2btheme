/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2a9cc065-dc1d-4fcc-b426-843014246dbb
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Tenant Switcher / CapabilityManifest
 * PURPOSE: Declares what Tenant Switcher can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Tenant Switcher]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker tenantswitcher-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B8): picking a tenant
 * and clicking Create emit through an additive on(), the active tenant is its
 * state, and its search can be answered by the agent.
 */
export const TENANTSWITCHER_MANIFEST: CapabilityManifest =
{
    name: "tenantswitcher",
    factory: "createTenantSwitcher",
    factoryStyle: "options-first",
    label: "Tenant Switcher",
    icon: "bi-building",
    category: "social",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user switch between the organisations or workspaces they belong to, shown as a trigger "
            + "with the active one's name and a searchable list.",
        avoidWhen: "For choosing an option in a form use ChoicePicker; for choosing people use PeoplePicker.",
    },

    affords: [],
    emits: [
        { name: "switch", payload: "record", multi: false, legacyOption: "onSwitch" },
        { name: "create", payload: "scalar", multi: false, legacyOption: "onCreate" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["activeTenantId"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-225, readiness step 2 B8).
    protocol: {
        providers: {
            // Searches beyond the given tenants; a newer query replaces an unanswered one.
            onSearch: { request: "search" },
        },
        hostOnly: {
            onOpen: "Fires when the list opens; that is view state, not information for an agent.",
            onClose: "Fires when the list closes; that is view state, not information for an agent.",
            "tenants[].data": "An arbitrary payload for host callbacks; it has no schema an agent could follow.",
        },
    },

    regions: ["tenantswitcher:list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12700, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 300 },
    defaultOptions: { tenants: [], activeTenantId: "" },

    conformance: "surface",
    priority: 50,
};
