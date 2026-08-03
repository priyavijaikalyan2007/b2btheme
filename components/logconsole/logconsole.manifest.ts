/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 3b9cd2a5-a261-44c8-af25-cc82fda0fa78
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Log Console / CapabilityManifest
 * PURPOSE: Declares what Log Console can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Log Console]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker logconsole-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const LOGCONSOLE_MANIFEST: CapabilityManifest =
{
    name: "logconsole",
    factory: "createLogConsole",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Log Console",
    icon: "bi-terminal-fill",
    category: "other",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 10565, mountCost: "light", holdsResources: false },

    defaultSize: { w: 500, h: 250 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
