/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Timeline / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    These are test fixtures and deliberately do NOT live in the manifest's
 *    defaultOptions: that field is shipped to consumers via
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A fixture there would put placeholder content in front
 *    of real users.
 *
 *    `start` and `end` are required and have no defensible production default —
 *    a viewport window belongs to the data the host supplies, not to the
 *    component — so they appear here and nowhere else.
 * RELATES: [[Timeline]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker timeline-conformance-glue

const ITEMS = [
    {
        id: "conformance-item",
        type: "point",
        start: new Date("2026-01-02T00:00:00.000Z"),
        label: "Conformance",
    },
];

export const CONFORMANCE_GLUE =
{
    options:
    {
        start: new Date("2026-01-01T00:00:00.000Z"),
        end: new Date("2026-01-08T00:00:00.000Z"),
        items: ITEMS,
    },

    // The items to click on a flat timeline and a range that shows them, as an agent writes them: dates are ISO
    // strings the adapter revives.
    eventProps: {
        groups: [],
        start: "2026-01-01T00:00:00.000Z",
        end: "2026-01-08T00:00:00.000Z",
        items: [{ id: "conformance-item", type: "point", start: "2026-01-02T00:00:00.000Z", label: "Conformance" }],
    },

    // A rewrite that keeps the item, as an agent's does, plus a span and a group (readiness step 3).
    slotSamples: {
        items: [...ITEMS, { id: "conformance-span", type: "span", group: "g", label: "Span",
            start: new Date("2026-01-03T00:00:00.000Z"), end: new Date("2026-01-05T00:00:00.000Z") }],
        groups: [{ id: "g", label: "Group", collapsed: true }],
    },

    /** Clicks the rendered item (readiness step 3). */
    trigger: (channel: string): boolean =>
    {
        if (channel !== "select") { return false; }

        const item = document.querySelector<HTMLElement>(".timeline [data-item-id='conformance-item']");

        item?.click();

        return item != null;
    },
};
