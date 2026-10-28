/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: fd58a389-ec70-42a4-b253-428c79d0558d
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Theme Toggle / CapabilityManifest
 * PURPOSE: Declares what Theme Toggle can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Theme Toggle]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker themetoggle-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B4): it emits "change"
 * with { theme, mode } through an additive on(), and restores its mode
 * through getState()/setState() (stateKeys: mode).
 */
export const THEMETOGGLE_MANIFEST: CapabilityManifest =
{
    name: "themetoggle",
    factory: "createThemeToggle",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Theme Toggle",
    icon: "bi-circle-half",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user switch the whole page between light, dark and automatic themes; it restyles the host "
            + "page, not just the surface.",
        avoidWhen: "For a choice that affects only your own content use ChoicePicker.",
    },

    affords: [],
    emits: [
        { name: "change", payload: "record", multi: false, legacyOption: "onChange" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["mode"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 2978, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 100, h: 32 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
