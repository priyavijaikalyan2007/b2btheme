/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f449934c-adb0-4d2a-961d-3af19820747d
 * Created: 2026-10-10
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: File Explorer / CapabilityManifest
 * PURPOSE: Declares what File Explorer can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[File Explorer]], [[TreeView]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker fileexplorer-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/** How deep an agent's folder tree may nest (readiness step 3); deepening it later only adds. */
const TREE_DEPTH = 4;

/** A node's fields as an agent writes them: data is the host's, and children are added per level. */
const NODE_FIELDS = {
    id: { type: "string", description: "Unique id." },
    name: { type: "string", description: "Display name. Rendered as text." },
    type: { oneOf: [{ const: "file" }, { const: "folder" }], description: "A file, or a folder that holds children." },
    icon: { type: "string", description: "Bootstrap Icons class; derived from the name or type when omitted." },
    size: { type: "number", description: "Size in bytes." },
    modified: { type: "string", format: "date-time", description: "When it was last modified." },
    mimeType: { type: "string", description: "MIME type, such as \"application/pdf\"." },
    parentId: { type: "string", description: "The parent folder's id, for a flat listing." },
    iconColor: { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        description: "Icon colour, as a hex colour." },
    typeLabel: { type: "string", description: "Type shown in the detail view, such as \"Diagram\"." },
    owner: { type: "string", description: "Display name of the owner." },
    readOnly: { type: "boolean", description: "Shown as read-only." },
    isSystem: { type: "boolean", description: "A system item." },
};

/** A node whose folders nest `depth` levels; the deepest level has no children. */
function nodeSchema(depth: number): Record<string, unknown>
{
    const children = depth > 1
        ? { children: { type: "array", items: nodeSchema(depth - 1), description: "A folder's contents." } }
        : {};

    return {
        type: "object",
        description: "A file or a folder.",
        properties: { ...NODE_FIELDS, ...children },
        required: ["id", "name", "type"],
        additionalProperties: false,
    };
}


/**
 * Declared at `surface` conformance (readiness step 3, #21): selecting,
 * opening and navigating emit through an additive on(), the agent can replace
 * the folder tree or the flat listing in place, and the current folder,
 * selection, view mode and sort are its state, restored silently. Since #68 the
 * agent can approve renames, deletes and new folders, and load a folder's
 * contents, as providers. Each is offered only when the agent binds it.
 */
export const FILEEXPLORER_MANIFEST: CapabilityManifest =
{
    name: "fileexplorer",
    factory: "createFileExplorer",
    factoryStyle: "container-first",
    label: "File Explorer",
    icon: "bi-folder2-open",
    category: "data",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user browse files you supply, as a tree, as a flat listing you replace per folder, or "
            + "loaded per folder; you hear selections, opens and navigation, and approve renames, deletes and new "
            + "folders.",
        avoidWhen: "For a hierarchy that is not files use TreeView; to pick items to attach use ExplorerPicker; "
            + "moving items and uploads are not available here.",
    },

    affords: [
        {
            shape: "hierarchy",
            intents: ["browse", "navigate", "inspect"],
            cardinality: { min: 0, max: 5000 },
            minViewport: { w: 320, h: 240 },
        },
    ],

    emits: [
        { name: "select", payload: "collection", multi: false, legacyOption: "onSelectionChange" },
        { name: "open", payload: "record", multi: false, legacyOption: "onOpen" },
        // #68: the folder the user opened. In a flat listing, answer with new items.
        { name: "navigate", payload: "record", multi: false, legacyOption: "onNavigate" },
        // #68: the breadcrumb segment clicked in a flat listing (null is the root). Answer with new items.
        { name: "breadcrumb", payload: "scalar", multi: false, legacyOption: "onBreadcrumbNavigate" },
    ],

    // The data an agent rewrites, replaced in place (ADR-234).
    accepts: [
        { name: "roots", payload: "collection", required: false },
        { name: "items", payload: "collection", required: false },
    ],
    actions: [],
    stateKeys: ["currentFolderId", "selectedIds", "viewMode", "sortField", "sortDirection"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 3).
    protocol: {
        // #68. Each edit is offered only when its callback is given, so over A2UI only when the agent binds it.
        // The agent approves with true (rename, delete) or answers the new folder (create), in order.
        providers: {
            onRename: { request: "rename", concurrency: "queue", params: ["file", "newName"] },
            onDelete: { request: "delete", concurrency: "queue" },
            onCreateFolder: { request: "createFolder", concurrency: "queue", params: ["parent", "name"] },
            // A folder given with no children is loaded when opened; answer with its contents.
            onLoadChildren: { request: "loadChildren", concurrency: "queue" },
        },
        hostOnly: {
            contextMenuItems: "Each item runs host code on the selected files; an agent cannot supply it.",
            onMove: "Declared but never called by the explorer: a drag ends in onDrop, which moves items in host "
                + "code.",
            onUpload: "Receives the files the user picks, which cannot reach an agent; without it there is no "
                + "Upload.",
            onSelect: "Fires with the selection, as onSelectionChange does; the select event carries it.",
            onSort: "Fires when the user sorts; the sortField and sortDirection state carry it.",
            onViewModeChange: "Fires when the user switches view; the viewMode state carries it.",
            onContextMenuAction: "Reports a host-defined context menu item; contextMenuItems is host-only.",
            onDragStart: "Starts a drag whose drop moves items in host code.",
            onDrop: "Moves the dragged items in host code.",
            onExternalDrop: "Carries the browser's DataTransfer, which cannot reach an agent.",
            groupBy: "Its function arm groups the listing in host code; only the named groupings cross the "
                + "protocol.",
            "roots[].data": "Arbitrary host data for callbacks; it has no schema an agent could follow.",
            "items[].data": "Arbitrary host data for callbacks; it has no schema an agent could follow.",
            "columns[].render": "A function that renders a cell in host code; over A2UI each column shows its field.",
        },
        schemas: {
            roots: {
                type: "array",
                description: `The folder tree; folders nest up to ${TREE_DEPTH} levels.`,
                items: nodeSchema(TREE_DEPTH),
            },
            items: {
                type: "array",
                description: "A flat listing shown in place of the tree's folder.",
                items: nodeSchema(1),
            },
            columns: {
                type: "array",
                description: "Column definitions for the detail view.",
                items: {
                    type: "object",
                    description: "A detail-view column.",
                    properties: {
                        id: { type: "string", description: "The field shown: name, modified, size, type or owner." },
                        label: { type: "string", description: "Column heading." },
                        width: { type: "string", description: "CSS width, such as \"120px\"." },
                        sortable: { type: "boolean", description: "Whether clicking the heading sorts." },
                    },
                    required: ["id", "label"],
                    additionalProperties: false,
                },
            },
        },
    },

    regions: [
        "fileexplorer:tree-pane",
        "fileexplorer:breadcrumbs",
        "fileexplorer:listing",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 37407, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 720, h: 480 },
    defaultOptions: { roots: [] },

    conformance: "surface",
    priority: 50,
};
