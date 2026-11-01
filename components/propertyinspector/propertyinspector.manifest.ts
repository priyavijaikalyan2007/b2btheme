/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: bb76c028-56a5-480d-9d1f-0006051c287c
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Property Inspector / CapabilityManifest
 * PURPOSE: Declares what Property Inspector can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Property Inspector]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker propertyinspector-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * What the drawer shows over A2UI (readiness step 4, ADR-242). Closed, so the
 * generator can place ComponentId at `content`, `footer` and `tabs[].content`.
 */
const OPEN_WITH_SCHEMA = {
    type: "object",
    description: "What the drawer shows. It opens with these, and opens again whenever the agent changes them.",
    properties: {
        title: { type: "string", description: "Header title." },
        subtitle: { type: "string", description: "Header subtitle, under the title." },
        icon: { type: "string", description: "Bootstrap Icons class for the header, such as \"bi-gear\"." },
        actions: {
            type: "array",
            description: "Header action buttons. A click reports the action's id.",
            items: {
                type: "object",
                description: "A header action button.",
                properties: {
                    id: { type: "string", description: "Unique action id, reported when it is clicked." },
                    label: { type: "string", description: "Tooltip, also the button's accessible name." },
                    icon: { type: "string", description: "Bootstrap Icons class, such as \"bi-pin\"." },
                    disabled: { type: "boolean", description: "Whether the button is disabled. Default: false." },
                },
                required: ["id", "label", "icon"],
                additionalProperties: false,
            },
        },
        tabs: {
            type: "array",
            description: "Tabbed sections, each holding one component. When given, content is not shown.",
            items: {
                type: "object",
                description: "A tab holding one component.",
                properties: {
                    id: { type: "string", description: "Unique tab id, which activeTab names." },
                    label: { type: "string", description: "Tab label." },
                    icon: { type: "string", description: "Bootstrap Icons class for the tab." },
                },
                required: ["id", "label", "content"],
                additionalProperties: false,
            },
        },
        activeTab: { type: "string", description: "The tab shown first. Default: the first tab." },
    },
    required: ["title"],
    additionalProperties: false,
};

/**
 * Declared at `surface` conformance (readiness step 4, ADR-242): openWith
 * opens the drawer with A2UI components as its content, tabs and footer, and
 * any change to it opens the drawer again, as a fresh open() does. A header
 * action and closing the drawer reach the agent; the width is its state.
 * Escape closes it only while focus is inside it (keyScope, protocol.fixed).
 */
export const PROPERTYINSPECTOR_MANIFEST: CapabilityManifest =
{
    name: "propertyinspector",
    factory: "createPropertyInspector",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Property Inspector",
    icon: "bi-card-list",
    category: "data",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show the properties of one selected item in a drawer that slides in from the right of its area, "
            + "with optional tabs, header actions and a footer; give the content as component ids.",
        avoidWhen: "For content always in view use Card or a layout such as SplitLayout; for a blocking question "
            + "use Modal.",
    },

    affords: [
        {
            shape: "record",
            intents: ["inspect", "edit"],
            cardinality: { min: 1, max: 1 },
            minViewport: { w: 260, h: 200 },
        },
    ],
    emits: [
        { name: "action", payload: "record", multi: false, legacyOption: "onAction" },
        { name: "close", payload: "record", multi: false, legacyOption: "onClose" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["width"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-242).
    protocol: {
        children: { "openWith.content": "one", "openWith.footer": "one", "openWith.tabs[].content": "one" },
        schemas: { openWith: OPEN_WITH_SCHEMA },
        fixed: { keyScope: "inspector" },
        box: "drawer",
        hostOnly: {
            onTabChange: "Fires as the shown tab changes; that is view state, and a changed openWith starts at its "
                + "activeTab, as a fresh open() does.",
            onResize: "Fires as the user resizes the drawer; that is view state, which width restores.",
            "openWith.data": "An arbitrary payload for host callbacks; it has no schema an agent could follow.",
        },
    },

    regions: ["propertyinspector:tabs", "propertyinspector:body"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 7665, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 300, h: 400 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
