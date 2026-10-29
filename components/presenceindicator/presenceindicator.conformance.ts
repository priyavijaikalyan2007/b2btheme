/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: PresenceIndicator / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: expands
 *    the list and clicks the first person, an avatar PersonChip renders
 *    (readiness step 2 P1, ADR-230).
 * 🔗 RELATES: [[PresenceIndicator]], [[PersonChip]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker presenceindicator-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface PresenceIndicatorLike
{
    getElement(): HTMLElement | null;
    expand(): void;
}

/** Two people, so the stack has something to expand into. */
const PEOPLE = [{ id: "1", name: "Ada Lovelace" }, { id: "2", name: "Alan Turing" }];

export const CONFORMANCE_GLUE =
{
    options: { people: PEOPLE, clickable: true },

    // Avatars are clickable only when asked; an agent sets this too.
    eventProps: { people: PEOPLE, clickable: true },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const indicator = handle as unknown as PresenceIndicatorLike;

        if (channel !== "click") { return false; }

        indicator.expand();
        const avatar = indicator.getElement()?.querySelector<HTMLElement>(".personchip");
        avatar?.click();

        return avatar != null;
    },
};
