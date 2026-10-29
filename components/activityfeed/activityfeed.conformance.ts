/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ActivityFeed / ConformanceGlue
 * 📜 PURPOSE: The mount fixture and channel triggers for the conformance gate
 *    and A2UI G3: clicks the event card, its actor and its target (readiness
 *    step 2 B6).
 * 🔗 RELATES: [[ActivityFeed]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker activityfeed-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface ActivityFeedLike
{
    getElement(): HTMLElement;
}

/** One event with an actor and a target, so all three clicks have something to land on. */
const EVENTS = [{ id: "e1", actor: { id: "u1", name: "Ada Lovelace" }, action: "edited",
    target: "Quarterly report", timestamp: "2026-10-29T10:00:00.000Z" }];

/** The element each channel's click comes from. */
const TARGETS: Record<string, string> = {
    eventClick: ".activityfeed-event",
    actorClick: ".activityfeed-actor",
    targetClick: ".activityfeed-target",
};

export const CONFORMANCE_GLUE =
{
    // The gate passes options as they are, so timestamps are Dates; over A2UI the adapter revives the strings.
    options: { events: EVENTS.map((x) => ({ ...x, timestamp: new Date(x.timestamp) })) },

    eventProps: { events: EVENTS },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const selector = TARGETS[channel];
        const el = selector ? (handle as unknown as ActivityFeedLike).getElement().querySelector<HTMLElement>(selector)
            : null;

        el?.click();

        return el != null;
    },
};
