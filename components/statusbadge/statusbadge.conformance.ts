/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: StatusBadge / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: clicks a
 *    clickable badge (readiness step 2 B4).
 * 🔗 RELATES: [[StatusBadge]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker statusbadge-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface StatusBadgeLike
{
    getElement(): HTMLElement | null;
}

export const CONFORMANCE_GLUE =
{
    options: { label: "Fixture status", clickable: true },

    // Only a clickable badge listens for clicks; an agent sets this too.
    eventProps: { clickable: true },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const root = (handle as unknown as StatusBadgeLike).getElement();

        if (channel !== "click" || !root) { return false; }

        root.click();

        return true;
    },
};
