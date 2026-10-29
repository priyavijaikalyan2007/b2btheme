/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 6d4b227e-6c7c-44a2-b211-5738b16cda47
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Action Items / CapabilityManifest
 * PURPOSE: Declares what Action Items can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Action Items]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker actionitems-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B7): creating, editing,
 * deleting, reordering, assigning and selecting items, status changes and the
 * bulk actions emit through an additive on(); the agent rewrites the list
 * through the "items" slot, which keeps the user's selection, collapsed
 * sections, sort, filter and any item being edited (B7-1); that view state
 * restores through getState().
 */
export const ACTIONITEMS_MANIFEST: CapabilityManifest =
{
    name: "actionitems",
    factory: "createActionItems",
    label: "Action Items",
    icon: "bi-check2-square",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show action items the user adds, edits, nests, reorders, assigns and moves through statuses; a "
            + "new item first comes as itemCreate with empty content, then itemUpdate carries its text.",
        avoidWhen: "For a table of typed records use DataGrid, and for a read-only list of events ActivityFeed; "
            + "when rewriting items, include every item you heard about, or the user's unfinished new item is "
            + "dropped.",
    },

    affords: [],
    emits: [
        { name: "itemCreate", payload: "record", multi: false, legacyOption: "onItemCreate" },
        { name: "itemUpdate", payload: "record", multi: false, legacyOption: "onItemUpdate" },
        { name: "statusChange", payload: "record", multi: false, legacyOption: "onStatusChange" },
        { name: "itemReorder", payload: "record", multi: false, legacyOption: "onItemReorder" },
        { name: "assignmentRequest", payload: "record", multi: false, legacyOption: "onAssignmentRequest" },
        { name: "itemDelete", payload: "scalar", multi: false, legacyOption: "onItemDelete" },
        { name: "bulkDelete", payload: "collection", multi: true, legacyOption: "onBulkDelete" },
        { name: "bulkAssign", payload: "collection", multi: true, legacyOption: "onBulkAssign" },
        { name: "selection", payload: "collection", multi: true, legacyOption: "onSelectionChange" },
    ],
    accepts: [
        { name: "items", payload: "collection", required: false },
    ],
    actions: [],
    stateKeys: ["selection", "collapsed", "sort", "filter", "showArchived"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-230, readiness step 2 B7).
    protocol: {
        hostOnly: {
            renderItemHoverCard: "A render function that may return a DOM element; the built-in hover card "
                + "applies over A2UI.",
            onContentEdit: "Fires with onItemUpdate on the same edit; the itemUpdate event carries the new "
                + "content.",
            onCommentToggle: "Opens the comment slot, which the host fills with DOM through onRenderCommentSlot; "
                + "that waits for A2UI children (step 4).",
            onRenderCommentSlot: "Receives a DOM element to fill with comments, which an agent cannot do; that "
                + "waits for A2UI children (step 4).",
            onPriorityChange: "The component never calls this option.",
            onDueDateChange: "The component never calls this option.",
            onTagChange: "The component never calls this option.",
            onExport: "The component never calls this option.",
            onBulkStatusChange: "Fires after one onStatusChange per item; the statusChange event already reports "
                + "each item's change.",
            onCollapseStateChange: "Fires only for expandAll() and collapseAll(), never for the user's section "
                + "click; collapsed sections are view state, restored through collapsed.",
        },
        // Loaded before this script (ADR-230): showInlineToolbar throws without InlineToolbar, and the item
        // hover card, assignee chips and tag pills come from HoverCard, PersonChip and Pill when present.
        dependencies: { components: ["inlinetoolbar", "hovercard", "personchip", "pill"] },
    },

    regions: ["actionitems:body", "actionitems:filter-panel"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 45986, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
