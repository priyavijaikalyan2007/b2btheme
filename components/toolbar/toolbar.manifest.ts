/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 2c24cc60-3fe8-4796-8841-63237d16ca69
 * Created: 2026-11-01
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Toolbar / CapabilityManifest
 * PURPOSE: Declares what Toolbar can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it, and the A2UI catalog can publish it.
 *    See ADR-142, ADR-245.
 * RELATES: [[Toolbar]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker toolbar-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/** A hex colour. */
const COLOR = { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" };

/** How a tool shows itself. */
const STYLE = { description: "Icon, icon and label, or label. Default: the region's or toolbar's style.",
    oneOf: [{ const: "icon" }, { const: "icon-label" }, { const: "label" }] };

/** Which tools leave for the overflow menu first as the toolbar narrows. */
const OVERFLOW = { description: "When the tool moves to the overflow menu. Default: \"low\".",
    oneOf: [{ const: "never" }, { const: "high" }, { const: "low" }, { const: "always" }] };

/** Fields every interactive tool shares. */
const COMMON = {
    id: { type: "string", description: "Stable id, reported as toolClick's toolId." },
    disabled: { type: "boolean", description: "Shown dimmed; it cannot be used." },
    hidden: { type: "boolean", description: "Not shown." },
    overflowPriority: OVERFLOW,
};

/** A tool of the given type (absent for a button). Closed, so callbacks and data are rejected. */
function tool(type: string | null, description: string, own: Record<string, unknown>, required: string[] = [])
{
    return {
        type: "object",
        description,
        properties: { ...(type === null ? {} : { type: { const: type } }), ...COMMON, ...own },
        required: [...(type === null ? [] : ["type"]), "id", ...required],
        additionalProperties: false,
    };
}

/** A button's own fields, shared by the split button. */
const BUTTON = {
    icon: { type: "string", description: "Bootstrap Icons class, such as \"bi-type-bold\"." },
    label: { type: "string", description: "Visible label." },
    tooltip: { type: "string", description: "Tooltip, also the accessible name." },
    style: STYLE,
    toggle: { type: "boolean", description: "Stays pressed until clicked again; toolClick reports its state." },
    active: { type: "boolean", description: "Pressed, for a toggle." },
    keyTip: { type: "string", description: "Letter shown in the key tip badge." },
};

/** Every kind of toolbar item. */
const ITEM = {
    oneOf: [
        tool(null, "A button; toolClick reports null, or a toggle's new state.", BUTTON, ["tooltip"]),
        tool("split-button", "A button with a menu of alternatives beside it; picking one reports its id.", {
            ...BUTTON,
            menuItems: { type: "array", description: "The menu's items.", items: { type: "object", properties: {
                id: { type: "string", description: "Stable id, reported as toolClick's value." },
                label: { type: "string", description: "Visible label." },
                icon: { type: "string", description: "Bootstrap Icons class." },
                disabled: { type: "boolean", description: "Shown dimmed; it cannot be picked." },
            }, required: ["id", "label"], additionalProperties: false } },
        }, ["tooltip", "menuItems"]),
        tool("gallery", "A popup of options, such as styles; picking one reports its id.", {
            icon: { type: "string", description: "Bootstrap Icons class." },
            label: { type: "string", description: "Visible label." },
            tooltip: { type: "string", description: "Tooltip, also the accessible name." },
            style: STYLE,
            layout: { description: "Grid or list. Default: \"grid\".", oneOf: [{ const: "grid" }, { const: "list" }] },
            columns: { type: "number", description: "Options per row in the grid." },
            options: { type: "array", description: "The options.", items: { type: "object", properties: {
                id: { type: "string", description: "Stable id, reported as toolClick's value." },
                label: { type: "string", description: "Visible label." },
                icon: { type: "string", description: "Bootstrap Icons class." },
                color: { ...COLOR, description: "A colour swatch shown for the option." },
                disabled: { type: "boolean", description: "Shown dimmed; it cannot be picked." },
            }, required: ["id", "label"], additionalProperties: false } },
            selectedId: { type: "string", description: "Id of the option shown as selected." },
            keyTip: { type: "string", description: "Letter shown in the key tip badge." },
        }, ["tooltip", "options"]),
        tool("input", "A text box; Enter reports its text.", {
            placeholder: { type: "string", description: "Placeholder text." },
            width: { type: "string", description: "CSS width, such as \"160px\"." },
            icon: { type: "string", description: "Bootstrap Icons class shown inside the box." },
        }),
        tool("dropdown", "A drop-down list; a change reports the new value.", {
            tooltip: { type: "string", description: "Tooltip, also the accessible name." },
            options: { type: "array", description: "The choices.", items: { type: "object", properties: {
                value: { type: "string", description: "Reported as toolClick's value." },
                label: { type: "string", description: "Visible label." },
            }, required: ["value", "label"], additionalProperties: false } },
            value: { type: "string", description: "The selected value." },
            width: { type: "string", description: "CSS width, such as \"120px\"." },
        }, ["options"]),
        tool("checkbox", "A checkbox; a change reports checked.", {
            label: { type: "string", description: "Visible label." },
            tooltip: { type: "string", description: "Tooltip." },
            checked: { type: "boolean", description: "Checked." },
        }, ["label"]),
        tool("switch", "A toggle switch; a change reports checked.", {
            label: { type: "string", description: "Visible label." },
            tooltip: { type: "string", description: "Tooltip." },
            checked: { type: "boolean", description: "On." },
        }, ["label"]),
        tool("number", "A number spinner; a change reports the new number.", {
            tooltip: { type: "string", description: "Tooltip, also the accessible name." },
            value: { type: "number", description: "The number." },
            min: { type: "number", description: "Lowest value." },
            max: { type: "number", description: "Highest value." },
            step: { type: "number", description: "Step for the arrows. Default: 1." },
            width: { type: "string", description: "CSS width, such as \"64px\"." },
            suffix: { type: "string", description: "Unit shown after the number, such as \"px\"." },
        }),
        tool("color", "A colour picker; a change reports the new colour.", {
            tooltip: { type: "string", description: "Tooltip, also the accessible name." },
            value: { ...COLOR, description: "The colour." },
            showLabel: { type: "boolean", description: "Shows the colour's hex value beside the swatch." },
        }),
        {
            type: "object",
            description: "Static text, such as a status or a count.",
            properties: {
                type: { const: "label" },
                id: { type: "string", description: "Stable id." },
                text: { type: "string", description: "The text." },
                icon: { type: "string", description: "Bootstrap Icons class." },
                color: { type: "string", description: "CSS colour of the text." },
                hidden: { type: "boolean", description: "Not shown." },
                overflowPriority: OVERFLOW,
            },
            required: ["type", "id", "text"],
            additionalProperties: false,
        },
        {
            type: "object",
            description: "A divider between tools.",
            properties: { type: { const: "separator" } },
            required: ["type"],
            additionalProperties: false,
        },
    ],
};

/** The regions over A2UI (ADR-245). Closed: callbacks, data and HTML previews are rejected. */
const REGIONS_SCHEMA = {
    type: "array",
    description: "Labelled groups of tools, in order.",
    items: {
        type: "object",
        description: "A labelled group of tools.",
        properties: {
            id: { type: "string", description: "Stable id." },
            title: { type: "string", description: "The region's label." },
            showTitle: { type: "boolean", description: "Shows the label. Default: false." },
            items: { type: "array", description: "The region's tools, in order.", items: ITEM },
            style: STYLE,
            hidden: { type: "boolean", description: "Not shown." },
            align: { description: "Which end of the toolbar the region sits at. Default: \"left\".",
                oneOf: [{ const: "left" }, { const: "right" }] },
        },
        required: ["id", "items"],
        additionalProperties: false,
    },
};

/** Why each floating or persisting option is out of an agent's reach. */
const CONTAINED = "Over A2UI the toolbar is contained and docked in its surface (protocol.fixed), where this option "
    + "does nothing.";

/**
 * Declared at `surface` conformance (readiness step 5, ADR-245): every tool
 * interaction emits toolClick { toolId, value } through an additive on(),
 * after the tool's callbacks, even where none was passed. Tool states are the
 * options the agent writes, so it has no view state. Over A2UI it is
 * contained and docked, cannot be dragged, keeps no layout in storage and
 * shows no key tips, so it never takes the page's Alt key; rightContent is
 * an A2UI component.
 */
export const TOOLBAR_MANIFEST: CapabilityManifest =
{
    name: "toolbar",
    factory: "createToolbar",
    factoryStyle: "options-first",
    label: "Toolbar",
    icon: "bi-tools",
    category: "navigation",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a single strip of tools in labelled groups, such as formatting buttons, a zoom spinner and a "
            + "search box above an editor; each use reports the tool's id and value.",
        avoidWhen: "For tabs of grouped commands like Office use Ribbon; for one or two actions use Button.",
    },

    affords: [],
    emits: [
        { name: "toolClick", payload: "record", multi: false, legacyOption: "onToolClick" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-245).
    protocol: {
        // Bootstrap's JS shows the tools' tooltips; the adapter uses the page's copy when it has one.
        dependencies: { libraries: ["bootstrap"] },
        children: { rightContent: "one" },
        schemas: { regions: REGIONS_SCHEMA },
        fixed: { contained: true, mode: "docked", draggable: false, dragToDock: false, persistLayout: false,
            keyTips: false },
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            floatX: CONTAINED,
            floatY: CONTAINED,
            zIndex: CONTAINED,
            persistKey: CONTAINED,
            dragToDockThreshold: CONTAINED,
            onResize: "Fires as the user resizes a floating toolbar, which it cannot be over A2UI.",
            onModeChange: "The toolbar cannot float over A2UI, so its mode never changes.",
            onOrientationChange: "Fires when the host docks the toolbar at another edge, which an agent never does.",
            "regions[].items[].onClick": "Host code run on the click; toolClick carries it.",
            "regions[].items[].menuItems[].onClick": "Host code run on the pick; toolClick carries it.",
            "regions[].items[].onSelect": "Host code run on a gallery pick; toolClick carries it.",
            "regions[].items[].onChange": "Host code run on a field change; toolClick carries it.",
            "regions[].items[].onInput": "Host code run on each keystroke; an agent hears the submit.",
            "regions[].items[].onSubmit": "Host code run on Enter; toolClick carries it.",
            "regions[].items[].data": "An arbitrary payload for host callbacks; it has no schema an agent could "
                + "follow.",
        },
    },

    regions: ["toolbar:gallery-popup"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 60000, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 600, h: 40 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
