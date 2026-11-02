/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 34617640-1b15-475b-9994-f03b66b19ab0
 * Created: 2026-11-01
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Sidebar / CapabilityManifest
 * 📜 PURPOSE: Declares what Sidebar can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it, and the A2UI catalog can publish it.
 *    See ADR-142, ADR-244.
 * 🔗 RELATES: [[Sidebar]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sidebar-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/** Why each floating option is out of an agent's reach. */
const CONTAINED = "Over A2UI the sidebar is contained and docked in its surface (protocol.fixed), where this option "
    + "does nothing.";

/**
 * Declared at `surface` conformance (readiness step 5, ADR-244): its content
 * is an A2UI component (a child slot, through the additive content option),
 * resizing and collapsing emit through an additive on(), and the width and
 * collapsed state are its state. Over A2UI it is contained, docked, not
 * draggable and not closable, so it never pins itself to the viewport or
 * joins the page's SidebarManager.
 */
export const SIDEBAR_MANIFEST: CapabilityManifest =
{
    name: "sidebar",
    factory: "createSidebar",
    factoryStyle: "options-first",
    label: "Sidebar",
    icon: "bi-layout-sidebar",
    category: "layout",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Hold one component in a titled side panel the user can resize and collapse to an icon strip, "
            + "such as filters or an outline beside main content; give the content as a component id.",
        avoidWhen: "For two panes side by side without a title bar use SplitLayout; for a drawer that slides over "
            + "content use PropertyInspector.",
    },

    affords: [],
    emits: [
        { name: "resize", payload: "record", multi: false, legacyOption: "onResize" },
        { name: "collapse", payload: "record", multi: false, legacyOption: "onCollapseToggle" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["width", "collapsed"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-244).
    protocol: {
        children: { content: "one" },
        fixed: { contained: true, mode: "docked", draggable: false, closable: false },
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            floatX: CONTAINED,
            floatY: CONTAINED,
            height: CONTAINED,
            minHeight: CONTAINED,
            maxHeight: CONTAINED,
            zIndex: CONTAINED,
            onModeChange: "The sidebar cannot float over A2UI; collapsing, its only mode change, sends "
                + "onCollapseToggle.",
            onBeforeClose: "Over A2UI the sidebar has no close button; only the adapter destroys it.",
            onClose: "Over A2UI the sidebar has no close button; only the adapter destroys it.",
        },
    },

    regions: ["sidebar:content", "sidebar:tab-bar"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 30000, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 280, h: 400 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
