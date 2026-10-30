/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 827e2b25-2265-48e2-bdf4-168f2e0213b4
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Ribbon Builder / CapabilityManifest
 * PURPOSE: Declares what Ribbon Builder can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Ribbon Builder]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker ribbonbuilder-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B8): each edit and each
 * Markdown export emit through an additive on(). It has no view state to
 * restore (ADR-229).
 */
export const RIBBONBUILDER_MANIFEST: CapabilityManifest =
{
    name: "ribbonbuilder",
    factory: "createRibbonBuilder",
    // options-only (B8): the adapter passes the host as options.container, which keeps that element-typed option
    // out of the catalog, and mounts it with show(host).
    factoryStyle: "options-only",
    containerOption: "container",
    mountMethod: "show",
    label: "Ribbon Builder",
    icon: "bi-tools",
    category: "navigation",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user design a Ribbon's tabs, groups and controls visually; you receive the whole "
            + "configuration after each edit and can render it with Ribbon.",
        avoidWhen: "To show a finished command bar use Ribbon; for a single row of buttons use InlineToolbar.",
    },

    affords: [],
    emits: [
        { name: "change", payload: "record", multi: false, legacyOption: "onChange" },
        { name: "export", payload: "scalar", multi: false, legacyOption: "onExport" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-230, readiness step 2 B8).
    protocol: {
        hostOnly: {
            initialConfig: "A whole Ribbon configuration, whose agent-safe schema is Ribbon's closed one, and a "
                + "manifest loads standalone so this one cannot share it; over A2UI the builder starts from its "
                + "default ribbon.",
        },
        // The live preview is a Ribbon, and the icon picker is a SymbolPicker.
        dependencies: { components: ["ribbon", "symbolpicker"] },
    },

    regions: [
        "ribbonbuilder:tree-body",
        "ribbonbuilder:props",
        "ribbonbuilder:symbolpicker-host",
        "ribbonbuilder:control-menu",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 44126, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 600, h: 400 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
