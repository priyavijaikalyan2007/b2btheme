/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 876d4944-2af0-41ff-acdf-51b6876ecbdc
 * Created: 2026-08-04
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: WorkspaceShell / CapabilityManifest
 * 📜 PURPOSE: Declares what WorkspaceShell can render, emit, and accept. See ADR-142.
 * 🔗 RELATES: [[WorkspaceShell]], [[DynamicCanvas]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker workspaceshell-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Chrome rather than content: `affords` is empty because a workspace surface
 * is never something the resolver reaches for to display data. It is placed by
 * the application, not resolved from an intent. It is still `surface` because
 * the canvas must be able to feed it, subscribe to it, and restore it.
 */
export const WORKSPACESHELL_MANIFEST: CapabilityManifest =
{
    name: "workspaceshell",
    factory: "createWorkspaceShell",
    factoryStyle: "container-first",
    label: "WorkspaceShell",
    icon: "bi-window-stack",
    category: "navigation",

    affords: [],

    emits: [
        { name: "selectCanvas", payload: "record", multi: false, legacyOption: "onSelectCanvas" },
        { name: "pinCanvas", payload: "record", multi: false, legacyOption: "onPinCanvas" },
        { name: "closeCanvas", payload: "record", multi: false, legacyOption: "onCloseCanvas" },
        { name: "newCanvas", payload: "scalar", multi: false, legacyOption: "onNewCanvas" },
        { name: "scrub", payload: "scalar", multi: false, legacyOption: "onScrub" }
    ],

    accepts: [
        { name: "canvases", payload: "collection", required: false }
    ],

    actions: [],

    stateKeys: ["activeCanvasId", "revision"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 9_000, mountCost: "light", holdsResources: false },

    defaultSize: { w: 800, h: 560 },
    defaultOptions: {},

    conformance: "surface",
    priority: 20,
};
