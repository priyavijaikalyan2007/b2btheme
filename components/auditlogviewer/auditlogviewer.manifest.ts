/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a0a5b4d6-7762-4bfe-b365-4579bb8fefa0
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Audit Log Viewer / CapabilityManifest
 * PURPOSE: Declares what Audit Log Viewer can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Audit Log Viewer]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker auditlogviewer-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 2 B6): a row click emits
 * "rowClick" through an additive on(). Paging and filtering run over the
 * entries the agent supplies; server-side loading stays with the host.
 */
export const AUDITLOGVIEWER_MANIFEST: CapabilityManifest =
{
    name: "auditlogviewer",
    factory: "createAuditLogViewer",
    factoryStyle: "options-first",
    label: "Audit Log Viewer",
    icon: "bi-journal-text",
    category: "governance",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show an audit trail of who changed what, with severity, filters and paging; the agent hears which "
            + "entry the user opens.",
        avoidWhen: "For a running log of messages use LogConsole; for a social timeline use ActivityFeed.",
    },

    affords: [
        {
            shape: "collection",
            intents: ["browse", "inspect"],
            cardinality: { min: 1, max: 50000 },
            minViewport: { w: 320, h: 200 },
        },
    ],
    emits: [
        { name: "rowClick", payload: "record", multi: false, legacyOption: "onRowClick" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B6).
    protocol: {
        hostOnly: {
            "entries[].detail": "Typed as an open record, so it has no schema an agent could follow.",
            "entries[].metadata": "An arbitrary payload for host code; it has no schema an agent could follow.",
            serverSide: "Hands filtering and paging to onLoadPage, which is host-only; over A2UI the agent supplies "
                + "the entries.",
            autoRefresh: "Reloads the page through onLoadPage, which is host-only.",
            onFilter: "Fires as the user filters the visible entries; that is view state, not information for an "
                + "agent.",
            onPageChange: "Fires as the user pages; that is view state, not information for an agent.",
            onLoadPage: "Takes a page and filters, and a provider takes one parameter; over A2UI the agent supplies "
                + "the entries.",
            onExport: "Writes a file in the user's browser; an agent cannot receive it.",
        },
    },

    regions: [
        "auditlogviewer:table",
        "auditlogviewer:detail-json",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 18321, mountCost: "light", holdsResources: false },

    defaultSize: { w: 600, h: 350 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
