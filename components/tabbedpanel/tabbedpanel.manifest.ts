/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 00076198-7b45-4746-a7b0-8dee684d7520
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Tabbed Panel / CapabilityManifest
 * PURPOSE: Declares what Tabbed Panel can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Tabbed Panel]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker tabbedpanel-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * A tab over A2UI (readiness step 4 L1, ADR-239). Closed, so the generator can
 * place ComponentId at `content`: over A2UI a tab's content is a component id
 * only, since a string could be text or an id. Hosts keep the string arm.
 */
const TABS_SCHEMA = {
    type: "array",
    description: "The tabs, in order. The first is selected.",
    items: {
        type: "object",
        description: "A tab holding one component. For text, give a Text component's id.",
        properties: {
            id: { type: "string", description: "Unique tab id." },
            title: { type: "string", description: "Tab title, also its accessible name." },
            icon: { type: "string", description: "Bootstrap Icons class for the tab, such as \"bi-terminal\"." },
            closable: { type: "boolean", description: "Whether the tab shows a close button. Default: false." },
            cssClass: { type: "string", description: "Additional CSS class(es) for the tab's panel." },
            disabled: { type: "boolean", description: "Whether the tab starts disabled. Default: false." },
        },
        required: ["id", "title"],
        additionalProperties: false,
    },
};

/** Why each floating or docking option is out of an agent's reach. */
const CONTAINED = "Over A2UI the panel is contained in its surface (protocol.fixed), where this option does nothing.";

/**
 * Declared at `surface` conformance (readiness step 4 L1, ADR-239): each tab
 * holds an A2UI component, closing a tab, collapsing and resizing emit through
 * an additive on(), and the active tab, collapsed and height are its state.
 * Over A2UI it is contained, docked and without its title bar, so it has no
 * float or close button and never pins itself to the viewport.
 */
export const TABBEDPANEL_MANIFEST: CapabilityManifest =
{
    name: "tabbedpanel",
    factory: "createTabbedPanel",
    factoryStyle: "options-first",
    label: "Tabbed Panel",
    icon: "bi-window-stack",
    category: "navigation",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show components in tabs inside a panel the user can collapse to its tab bar, resize and close tabs "
            + "of, such as a tool or output panel; give each tab's content as a component id.",
        avoidWhen: "For plain tabs without collapsing, resizing or closing use Tabs; for panels shown together use "
            + "StackLayout or SplitLayout.",
    },

    affords: [],

    emits: [
        { name: "tabClose", payload: "record", multi: false, legacyOption: "onTabClose" },
        { name: "collapse", payload: "record", multi: false, legacyOption: "onCollapse" },
        { name: "resize", payload: "record", multi: false, legacyOption: "onResize" },
    ],

    accepts: [],
    actions: [],
    stateKeys: ["activeTabId", "collapsed", "height"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-239).
    protocol: {
        children: { "tabs[].content": "one" },
        schemas: { tabs: TABS_SCHEMA },
        fixed: { contained: true, mode: "docked", showTitleBar: false },
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            dockPosition: CONTAINED,
            draggable: CONTAINED,
            floatX: CONTAINED,
            floatY: CONTAINED,
            width: CONTAINED,
            minWidth: CONTAINED,
            maxWidth: CONTAINED,
            zIndex: CONTAINED,
            onTabSelect: "Fires as the active tab changes; that is view state, which activeTabId restores.",
            onTabDeselect: "Fires as the active tab changes; that is view state, which activeTabId restores.",
            onModeChange: "The panel cannot float or dock over A2UI, so its mode never changes.",
            onBeforeClose: "Over A2UI the panel has no close button; only the adapter destroys it.",
            onClose: "Over A2UI the panel has no close button; only the adapter destroys it.",
            "tabs[].data": "An arbitrary payload for host callbacks; it has no schema an agent could follow.",
        },
    },

    regions: ["tabbedpanel:tabbar", "tabbedpanel:panel"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 29054, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
