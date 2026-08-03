/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2a9cc065-dc1d-4fcc-b426-843014246dbb
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Workspace Switcher / CapabilityManifest
 * PURPOSE: Declares what Workspace Switcher can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Workspace Switcher]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker workspaceswitcher-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const WORKSPACESWITCHER_MANIFEST: CapabilityManifest =
{
    name: "workspaceswitcher",
    factory: "createWorkspaceSwitcher",
    factoryStyle: "options-first",
    label: "Workspace Switcher",
    icon: "bi-building",
    category: "social",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12700, mountCost: "light", holdsResources: false },

    defaultSize: { w: 250, h: 300 },
    defaultOptions: { workspaces: [], activeWorkspaceId: "" },

    conformance: "display",
    priority: 50,
};
