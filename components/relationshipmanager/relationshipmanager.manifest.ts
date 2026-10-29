/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: dd17887e-df3e-4d8d-baf0-c2f2b625505e
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Relationship Manager / CapabilityManifest
 * PURPOSE: Declares what Relationship Manager can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Relationship Manager]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker relationshipmanager-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B7): creating, deleting,
 * confirming, dismissing and opening a relationship emit through an additive
 * on(); the agent answers the Add flow's target search (onSearchTargets) and
 * rewrites the list through the "relationships" slot, which keeps an open Add
 * panel, collapsed groups, the sort and the scroll (B7-1); the sort and the
 * collapsed groups restore through getState().
 */
export const RELATIONSHIPMANAGER_MANIFEST: CapabilityManifest =
{
    name: "relationshipmanager",
    factory: "createRelationshipManager",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Relationship Manager",
    icon: "bi-diagram-2",
    category: "social",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show the typed links between one resource and others, grouped by type, so the user can add, "
            + "remove, confirm and open them; the agent answers each target search and rewrites the list.",
        avoidWhen: "For a hierarchy of parent and child items use TreeView; for tabular records use DataGrid; no "
            + "event is acknowledged, so answer each one by writing the new relationships.",
    },

    affords: [],
    emits: [
        { name: "createRelationship", payload: "record", multi: false, legacyOption: "onCreateRelationship" },
        { name: "deleteRelationship", payload: "scalar", multi: false, legacyOption: "onDeleteRelationship" },
        { name: "navigate", payload: "scalar", multi: false, legacyOption: "onNavigate" },
        { name: "confirmInferred", payload: "scalar", multi: false, legacyOption: "onConfirmInferred" },
        { name: "dismissInferred", payload: "scalar", multi: false, legacyOption: "onDismissInferred" },
    ],
    accepts: [
        { name: "relationships", payload: "collection", required: true },
    ],
    actions: [],
    stateKeys: ["sortMode", "collapsed"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-225, ADR-230, readiness step 2 B7).
    protocol: {
        providers: {
            // The Add flow's target search; a newer query replaces an unanswered one.
            onSearchTargets: { request: "search" },
        },
        hostOnly: {
            "relationshipDefinitions[].propertiesSchema": "A map of form-field definitions, typed as an open "
                + "record, so no schema checks the entries; each entry is read as { title?, type? } with type "
                + "string, number or boolean.",
            "relationships[].properties": "Extra values shown as text after the date, typed as an open record, so "
                + "no schema checks the values; an agent sends {} or scalar values.",
            showConfidence: "Nothing reads this option; the confidence badge always shows for AI-inferred "
                + "relationships.",
            onEditProperties: "The component never calls this option.",
            onSearchResources: "Takes two parameters, which a provider cannot carry; over A2UI the single-object "
                + "onSearchTargets asks the agent instead.",
            onSortModeChange: "Fires as the user sorts the groups; that is view state, restored through sortMode.",
            onCollapseStateChange: "Fires as the user expands or collapses all groups; that is view state, restored "
                + "through collapsed.",
        },
        // Loaded before this script (ADR-230): showInlineToolbar throws without InlineToolbar; the delete
        // confirmation and the type badges come from ConfirmDialog and TypeBadge when present.
        dependencies: { components: ["inlinetoolbar", "confirmdialog", "typebadge"] },
    },

    regions: [
        "relationshipmanager:list",
        "relationshipmanager:search-results",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 14990, mountCost: "light", holdsResources: false },

    defaultSize: { w: 500, h: 350 },
    // entities was never a RelationshipManager option (readiness step 2 B7).
    defaultOptions: { relationships: [] },

    conformance: "surface",
    priority: 50,
};
