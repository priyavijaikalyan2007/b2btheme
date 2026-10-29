/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 10e2af24-757e-4178-8d21-13a0fc1d4a4b
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Explorerpicker / CapabilityManifest
 * PURPOSE: Declares what Explorerpicker can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Explorerpicker]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker explorerpicker-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/** Null or a string, as typia writes a nullable string. */
const NULLABLE_STRING = { oneOf: [{ const: null }, { type: "string" }] };

/** A Bootstrap Icons class; it is written as a class token, so it is one word. */
const ICON = { type: "string", pattern: "^[A-Za-z0-9_-]+$" };

/** One node of staticNodes, closed: an agent's node that carries any other field is rejected. */
const NODE_SCHEMA = {
    type: "object",
    properties: {
        id: { type: "string", description: "Unique node id; selections, expansion and parentId refer to it." },
        name: { type: "string", description: "Label shown on the row." },
        nodeType: { description: "ORG_UNIT and FOLDER are containers; ASSET_REF and LINK are resources.",
            oneOf: [{ const: "ASSET_REF" }, { const: "FOLDER" }, { const: "LINK" }, { const: "ORG_UNIT" }] },
        resourceId: { ...NULLABLE_STRING, description: "The resource this node points at, returned in the selection." },
        resourceType: { ...NULLABLE_STRING, description: "The resource's type key: shown as a badge, and matched by "
            + "resourceTypeFilter and ontologyTypes." },
        sourceId: { ...NULLABLE_STRING, description: "The resource's source system id, returned in the selection." },
        url: { ...NULLABLE_STRING, description: "The resource's URL, returned in the selection; never rendered as a "
            + "link." },
        linkType: { ...NULLABLE_STRING, description: "A LINK's kind (google_docs, sharepoint, confluence, github), "
            + "which picks its default icon." },
        hasChildren: { type: "boolean", description: "True when the node has children, so it shows an expand "
            + "toggle. Without its children in staticNodes, expanding it sends onLoadChildren." },
        icon: { ...ICON, description: "Bootstrap Icons class for a resource (e.g. \"bi-file-earmark-code\"); "
            + "containers keep their folder icons." },
        parentId: { ...NULLABLE_STRING, description: "The id of the node's parent, or null for a root." },
        breadcrumb: { type: "string", description: "A path shown under a search result." },
    },
    required: ["id", "name", "nodeType", "resourceId", "resourceType", "sourceId", "url", "linkType", "hasChildren",
        "parentId"],
    additionalProperties: false,
};

/** One resource type of ontologyTypes, closed. */
const TYPE_SCHEMA = {
    type: "object",
    properties: {
        key: { type: "string", description: "The resource type key nodes name in resourceType." },
        icon: { ...ICON, description: "Bootstrap Icons class for resources of this type." },
        color: { type: "string", description: "CSS colour of the icon, such as \"#2E7D32\"." },
        parentTypeKey: { ...NULLABLE_STRING, description: "The parent type's key; resourceTypeFilter matches a "
            + "type through its parents." },
        isExternal: { type: "boolean", description: "True for a resource held outside, which shows an external "
            + "badge." },
    },
    required: ["key", "icon"],
    additionalProperties: false,
};

/**
 * Declared at `surface` conformance (readiness step 2 B7): changing the
 * selection, confirming it and cancelling emit through an additive on();
 * the agent answers a folder's children (onLoadChildren) and searches
 * (onSearch), and with onLoadChildren nothing is requested from the host's
 * Explorer API; the expanded folders and the selection restore through
 * getState().
 */
export const EXPLORERPICKER_MANIFEST: CapabilityManifest =
{
    name: "explorerpicker",
    factory: "createExplorerPicker",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Explorer Picker",
    icon: "bi-square",
    category: "misc",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Let the user browse and search a folder tree and pick items to link or attach; give the top of "
            + "the tree as staticNodes, and bind onLoadChildren and onSearch, which you answer.",
        avoidWhen: "To pick from a short flat list use ChoicePicker; for a tree the user only browses or edits use "
            + "TreeView or TreeGrid.",
    },

    affords: [],
    emits: [
        { name: "selection", payload: "collection", multi: true, legacyOption: "onSelectionChange" },
        { name: "confirm", payload: "collection", multi: true, legacyOption: "onConfirm" },
        { name: "cancel", payload: "collection", multi: true, legacyOption: "onCancel" },
    ],
    accepts: [],
    actions: [],
    stateKeys: ["expanded", "selection"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-225, ADR-229, readiness step 2 B7).
    protocol: {
        providers: {
            // A folder's children, or the roots when nodeId is null; one node at a time, in order.
            onLoadChildren: { request: "loadChildren", concurrency: "queue" },
            // A search page; a newer query replaces an unanswered one.
            onSearch: { request: "search" },
        },
        hostOnly: {
            apiBase: "The component fetches this URL from the user's browser with the host's credentials; an agent "
                + "must not choose it.",
            ontologyApiBase: "The component fetches this URL from the user's browser with the host's credentials; an "
                + "agent must not choose it.",
            fetchFn: "A replacement for fetch, called from the user's browser with the host's credentials for every "
                + "apiBase request; it returns a Response, which an agent cannot supply.",
            ontologyFetchFn: "A replacement for fetch, called from the user's browser with the host's credentials for "
                + "the ontologyApiBase request; it returns a Response, which an agent cannot supply.",
            showRecentItems: "Recent items load from the host's apiBase, which an agent cannot reach; with "
                + "onLoadChildren the section is not shown.",
            showStarredItems: "Starred items load from the host's apiBase, which an agent cannot reach; with "
                + "onLoadChildren the section is not shown.",
            quickAccessLimit: "Limits the Recent and Starred sections, which load from the host's apiBase; with "
                + "onLoadChildren they are not shown.",
            initialExpandedNodeId: "Only a tree loaded from the host's apiBase reads it; the staticNodes and "
                + "onLoadChildren paths ignore it, and the expanded state key opens folders instead.",
            hideSystemFolders: "Nothing reads this option.",
            onError: "Reports a failed initial load to host code with two parameters; the component shows its own "
                + "banner, and a provider that fails or times out is reported by the adapter.",
            iconResolver: "A render hook that returns an icon class; the default rules apply instead: the node's own "
                + "icon, then ontologyTypes, then the link type.",
            confirmButtonText: "Its function arm formats the label from the selection count in host code; only the "
                + "string arm crosses the protocol.",
        },
        schemas: {
            // Closed at every level (B4's link rule, readiness step 2 B7): icon is written as a class token, so it
            // must be one word, and a node or type carrying any field not listed is rejected. The provider
            // answers carry the same icon pattern through ExplorerNode's @pattern tag.
            staticNodes: { type: "array", items: NODE_SCHEMA },
            ontologyTypes: { type: "array", items: TYPE_SCHEMA },
        },
    },

    regions: ["explorerpicker:body"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 36839, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 320, h: 240 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
