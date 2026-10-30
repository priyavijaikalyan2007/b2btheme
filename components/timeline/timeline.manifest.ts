/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 73006221-afec-4acc-bac3-33f375ff2b34
 * Created: 2026-10-10
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Timeline / CapabilityManifest
 * PURPOSE: Declares what Timeline can render, so the Dynamic UI canvas can resolve,
 *    mount, and budget it. See ADR-142.
 * RELATES: [[Timeline]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker timeline-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

const HEX = "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$";

/** The members a point and a span share, as an agent writes them: data is host-only. */
const ITEM_COMMON = {
    id: { type: "string", description: "Unique identifier for this item." },
    start: { type: "string", format: "date-time", description: "Start time for the event." },
    label: { type: "string", description: "Display label for the event." },
    tooltip: { type: "string", description: "Tooltip text shown on hover." },
    color: { type: "string", pattern: HEX, description: "Colour of the event, as a hex colour." },
    cssClass: { type: "string", description: "Additional CSS class on the item element." },
    group: { type: "string", description: "Group ID this item belongs to." },
};

/**
 * An item is a point or a span, and a span needs its end: Timeline throws on
 * a span without one (ADR-200), so the schema says so (readiness step 3).
 */
const ITEMS_SCHEMA = {
    type: "array",
    description: "The events on the timeline: points at one instant and spans with a start and an end.",
    items: {
        oneOf: [
            {
                type: "object",
                description: "An event at one instant.",
                properties: { ...ITEM_COMMON, type: { const: "point", description: "A single instant." } },
                required: ["id", "type", "start", "label"],
                additionalProperties: false,
            },
            {
                type: "object",
                description: "An event that lasts from start to end.",
                properties: {
                    ...ITEM_COMMON,
                    type: { const: "span", description: "A period from start to end." },
                    end: { type: "string", format: "date-time", description: "End time of the span." },
                },
                required: ["id", "type", "start", "end", "label"],
                additionalProperties: false,
            },
        ],
    },
};

/**
 * Declared at `surface` conformance (readiness step 3, #25): clicking an item
 * emits through an additive on(), the agent can replace the items and groups
 * in place, and the selection, visible range, timezone, group order and
 * collapsed groups are its state, restored silently.
 */
export const TIMELINE_MANIFEST: CapabilityManifest =
{
    name: "timeline",
    factory: "createTimeline",
    factoryStyle: "options-only",
    containerOption: "containerId",
    containerAs: "id",
    label: "Timeline",
    icon: "bi-bar-chart-steps",
    category: "data",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show dated events and spans along a horizontal time axis, in collapsible groups, so the user can "
            + "pan, change timezone and click an event; you hear each click.",
        avoidWhen: "For a feed of who did what use ActivityFeed; for an audit trail use AuditLogViewer; for a "
            + "roadmap of hubs and branches use SpineMap.",
    },

    affords: [
        {
            shape: "timeseries",
            intents: ["browse", "inspect", "compare"],
            cardinality: { min: 0, max: 5000 },
            minViewport: { w: 320, h: 160 },
        },
    ],

    emits: [
        { name: "select", payload: "record", multi: false, legacyOption: "onItemClick" },
    ],

    // The data an agent rewrites, replaced in place (ADR-234).
    accepts: [
        { name: "items", payload: "collection", required: false },
        { name: "groups", payload: "collection", required: false },
    ],
    actions: [],
    stateKeys: ["selectedItemId", "start", "end", "timezone", "sortMode", "collapsedGroups"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 3).
    protocol: {
        hostOnly: {
            onItemSelect: "Fires as the selection changes; the select event and the selectedItemId state carry it.",
            onItemVisible: "Fires as items scroll into view; that is view state, not information for an agent.",
            onViewportChange: "Fires as the user pans; the start and end state carry the visible range.",
            onGroupToggle: "Fires per collapsed or expanded group; the collapsedGroups state carries it.",
            onTimezoneChange: "Fires when the user picks a timezone; the timezone state carries it.",
            onSortModeChange: "Fires when the user reorders the groups; the sortMode state carries it.",
            onCollapseStateChange: "Fires when groups collapse or expand; the collapsedGroups state carries it.",
            "items[].data": "Arbitrary user data for host callbacks; it has no schema an agent could follow.",
        },
        schemas: {
            items: ITEMS_SCHEMA,
        },
    },

    regions: ["timeline:body", "timeline:tz-list"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 27023, mountCost: "moderate", holdsResources: true },

    defaultSize: { w: 720, h: 260 },
    defaultOptions: { items: [] },

    conformance: "surface",
    priority: 50,
};
