/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 9ef02c67-69f7-48df-9213-26bc46425c3e
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Ribbon / CapabilityManifest
 * PURPOSE: Declares what Ribbon can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Ribbon]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker ribbon-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/** A hex colour, the one colour form agents write across the catalog (B7, B8). */
const COLOR = { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" };

/** What every control carries. */
const BASE = {
    id: { type: "string", description: "Stable id; controlClick reports it." },
    label: { type: "string", description: "Visible label." },
    icon: { type: "string", description: "Bootstrap Icons class(es), such as \"bi bi-save\"." },
    tooltip: { type: "string", description: "Tooltip text." },
    size: { description: "Button size. Default: \"small\".",
        oneOf: [{ const: "large" }, { const: "small" }, { const: "mini" }] },
    disabled: { type: "boolean", description: "Shown dimmed; it cannot be used." },
    hidden: { type: "boolean", description: "Not shown." },
    keyTip: { type: "string", description: "Letter to press after Alt to use it." },
    cssClass: { type: "string", description: "Additional CSS class(es) on the control." },
};

/** One control type: its type constant, the shared fields and its own (B8). */
function control(type: string, description: string, own: Record<string, unknown> = {}, required: string[] = [])
{
    return {
        type: "object",
        description,
        properties: { type: { const: type }, ...BASE, ...own },
        required: ["type", "id", ...required],
        additionalProperties: false,
    };
}

/** A control as an agent writes it: no callbacks and no custom element, which are host code (B8). */
const CONTROL = {
    oneOf: [
        control("button", "A button; with toggle it stays pressed until clicked again.", {
            toggle: { type: "boolean", description: "Stays pressed until clicked again." },
            active: { type: "boolean", description: "Pressed, for a toggle." },
        }),
        control("split-button", "A button with a menu of alternatives beside it.", {
            toggle: { type: "boolean", description: "Stays pressed until clicked again." },
            active: { type: "boolean", description: "Pressed, for a toggle." },
            menuItems: { type: "array", description: "The menu's items; picking one reports its id as value.",
                items: { type: "object", properties: {
                    id: { type: "string", description: "Stable id, reported as controlClick's value." },
                    label: { type: "string", description: "Visible label." },
                    icon: { type: "string", description: "Bootstrap Icons class(es)." },
                    disabled: { type: "boolean", description: "Shown dimmed; it cannot be picked." },
                }, required: ["id", "label"], additionalProperties: false } },
        }, ["menuItems"]),
        control("gallery", "A grid of options, such as styles; picking one reports its id as value.", {
            options: { type: "array", description: "The options.", items: { type: "object", properties: {
                id: { type: "string", description: "Stable id, reported as controlClick's value." },
                label: { type: "string", description: "Visible label." },
                icon: { type: "string", description: "Bootstrap Icons class(es)." },
                tooltip: { type: "string", description: "Tooltip text." },
                color: { ...COLOR, description: "A colour swatch shown for the option." },
                disabled: { type: "boolean", description: "Shown dimmed; it cannot be picked." },
            }, required: ["id", "label"], additionalProperties: false } },
            selectedId: { type: "string", description: "Id of the option shown as selected." },
            columns: { type: "number", description: "Options per row in the popup. Default: 3." },
            layout: { description: "Grid or list. Default: \"grid\".", oneOf: [{ const: "grid" }, { const: "list" }] },
            inlineCount: { type: "number", description: "Options shown in the ribbon before the More button." },
        }, ["options"]),
        control("dropdown", "A drop-down list; a change reports the new value.", {
            options: { type: "array", description: "The choices.", items: { type: "object", properties: {
                value: { type: "string", description: "Reported as controlClick's value." },
                label: { type: "string", description: "Visible label." },
            }, required: ["value", "label"], additionalProperties: false } },
            value: { type: "string", description: "The selected value." },
            width: { type: "string", description: "CSS width, such as \"120px\"." },
        }, ["options"]),
        control("input", "A text box; Enter reports its text as value.", {
            placeholder: { type: "string", description: "Placeholder text." },
            width: { type: "string", description: "CSS width, such as \"160px\"." },
            value: { type: "string", description: "The text." },
        }),
        control("color", "A colour picker; a change reports the new colour.", {
            value: { ...COLOR, description: "The colour." },
            showLabel: { type: "boolean", description: "Shows the label beside the swatch." },
        }),
        control("number", "A number spinner; a change reports the new number.", {
            value: { type: "number", description: "The number." },
            min: { type: "number", description: "Lowest value." },
            max: { type: "number", description: "Highest value." },
            step: { type: "number", description: "Step for the arrows." },
            suffix: { type: "string", description: "Unit shown after the number, such as \"pt\"." },
            width: { type: "string", description: "CSS width, such as \"64px\"." },
        }),
        control("checkbox", "A checkbox; a change reports checked as value.", {
            checked: { type: "boolean", description: "Checked." },
        }),
        control("toggle", "A toggle switch; a change reports checked as value.", {
            checked: { type: "boolean", description: "On." },
        }),
        control("separator", "A vertical line between controls."),
        control("row-break", "Starts a new stack of small controls."),
        control("label", "A text label.", {
            text: { type: "string", description: "The text." },
            color: { ...COLOR, description: "Text colour." },
        }),
    ],
};

/** The fields of a menu-bar entry (B8). */
const MENU_FIELDS = {
    id: { type: "string", description: "Stable id; controlClick reports it." },
    label: { type: "string", description: "Visible label." },
    icon: { type: "string", description: "Bootstrap Icons class(es)." },
    shortcut: { type: "string", description: "Shortcut text shown beside it, such as \"Ctrl+S\"; display only." },
    disabled: { type: "boolean", description: "Shown dimmed; it cannot be used." },
    type: { description: "An item, a separator line or a header. Default: \"item\".",
        oneOf: [{ const: "item" }, { const: "separator" }, { const: "header" }] },
};

/**
 * A menu-bar entry with at most one level of submenu, which is as deep as an
 * override can describe without a recursive reference; a leaf's click
 * reports its id with value null (B8).
 */
const MENU_ITEM = {
    type: "object",
    description: "A menu entry. Clicking a leaf sends controlClick with its id.",
    properties: {
        ...MENU_FIELDS,
        children: { type: "array", description: "A submenu of plain entries.", items: {
            type: "object", properties: MENU_FIELDS, required: ["id", "label"], additionalProperties: false } },
    },
    required: ["id", "label"],
    additionalProperties: false,
};

/**
 * Declared at `surface` conformance (readiness step 2 B8): every control
 * interaction emits controlClick through an additive on(), and the existing
 * getState() is its state, restored silently by an additive setState(). Its
 * keys are confined to the ribbon over A2UI (protocol.fixed).
 */
export const RIBBON_MANIFEST: CapabilityManifest =
{
    name: "ribbon",
    factory: "createRibbon",
    factoryStyle: "options-first",
    label: "Ribbon",
    icon: "bi-layout-text-window",
    category: "navigation",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Give an editor or tool an Office-style command bar: tabs of labelled groups of buttons, menus, "
            + "galleries and fields; you hear each use with the control's id and value.",
        avoidWhen: "For a single row of formatting buttons use InlineToolbar; for switching views use Tabs.",
    },

    affords: [],
    emits: [
        { name: "controlClick", payload: "record", multi: false, legacyOption: "onControlClick" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["activeTabId", "collapsed", "contextualTabs", "controlValues", "autoCollapseDelay"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-229, ADR-235, readiness step 2 B8).
    protocol: {
        // The user's decision B8-3: with "document", the default, an agent's ribbon would take the host page's
        // Alt key, collapse combo and Escape.
        fixed: { keyScope: "ribbon" },
        hostOnly: {
            onTabChange: "Fires as the active tab changes; that is view state, which activeTabId restores.",
            onCollapse: "Fires as the panel collapses or expands; that is view state, which collapsed restores.",
            onQATCustomize: "The component never calls this option.",
            statusBar: "An element or a function returning one; it waits for layouts with A2UI children (step 4).",
            "tabs[].groups[].controls[].onClick": "Host code run on the click; controlClick carries it.",
            "tabs[].groups[].controls[].menuItems[].onClick": "Host code run on the pick; controlClick carries it.",
            "tabs[].groups[].controls[].onSelect": "Host code run on a gallery pick; controlClick carries it.",
            "tabs[].groups[].controls[].onGallerySelect": "Host code run on a gallery pick; controlClick carries it.",
            "tabs[].groups[].controls[].onChange": "Host code run on a field change; controlClick carries it.",
            "tabs[].groups[].controls[].onInput": "Host code run on each keystroke; an agent hears the submit.",
            "tabs[].groups[].controls[].onSubmit": "Host code run on Enter; controlClick carries it.",
            "tabs[].groups[].controls[].element": "A custom control's element; the schema leaves the custom type out.",
            "tabs[].backstageContent": "An element; the schema leaves the backstage out until step 4.",
            "tabs[].backstageSidebar": "Backstage pages carry elements; the schema leaves the backstage out.",
            "menuBar[].items[].onClick": "Host code run on the click; controlClick carries it.",
            "qat[].onClick": "Host code run on the click; controlClick carries it.",
        },
        schemas: {
            // Closed (B7, B8): callbacks, custom controls, gallery previews (HTML) and the backstage (elements) are
            // left out, so an agent's ribbon carrying them is rejected.
            tabs: {
                type: "array",
                description: "The tabs, each a row of labelled groups of controls.",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Stable id, used by activeTabId." },
                        label: { type: "string", description: "Tab label." },
                        groups: { type: "array", description: "Labelled groups of controls.", items: {
                            type: "object",
                            properties: {
                                id: { type: "string", description: "Stable id." },
                                label: { type: "string", description: "Group label, shown under its controls." },
                                controls: { type: "array", description: "The group's controls, in order.",
                                    items: CONTROL },
                                collapsePriority: { type: "number",
                                    description: "Lower collapses first as the ribbon narrows." },
                            },
                            required: ["id", "label", "controls"],
                            additionalProperties: false,
                        } },
                        contextual: { type: "boolean",
                            description: "Hidden until shown for a selection, like a Table Tools tab." },
                        accentColor: { ...COLOR, description: "A contextual tab's accent colour." },
                        keyTip: { type: "string", description: "Letter to press after Alt to open the tab." },
                    },
                    required: ["id", "label", "groups"],
                    additionalProperties: false,
                },
            },
            menuBar: {
                type: "array",
                description: "A classic menu bar (File, Edit, ...) above the tabs.",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Stable id." },
                        label: { type: "string", description: "Menu title." },
                        keyTip: { type: "string", description: "Letter to press after Alt to open the menu." },
                        items: { type: "array", description: "The menu's entries.", items: MENU_ITEM },
                    },
                    required: ["id", "label", "items"],
                    additionalProperties: false,
                },
            },
            qat: {
                type: "array",
                description: "Quick access toolbar: small icon buttons beside the tabs. A click sends controlClick "
                    + "with the item's id.",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Stable id; controlClick reports it." },
                        icon: { type: "string", description: "Bootstrap Icons class(es)." },
                        tooltip: { type: "string", description: "Tooltip, also its accessible name." },
                        keyTip: { type: "string", description: "Letter to press after Alt to use it." },
                        disabled: { type: "boolean", description: "Shown dimmed; it cannot be used." },
                    },
                    required: ["id", "icon", "tooltip"],
                    additionalProperties: false,
                },
            },
        },
    },

    regions: [
        "ribbon:tabbar",
        "ribbon:gallery-popup",
        "ribbon:backstage-sidebar",
        "ribbon:backstage-content",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 41931, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 600, h: 120 },
    defaultOptions: { tabs: [] },

    conformance: "surface",
    priority: 50,
};
