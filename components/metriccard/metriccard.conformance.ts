/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MetricCard / ConformanceGlue
 * 📜 PURPOSE: The mount fixture the conformance gate needs. ERR-2 made
 *    label and value required, and the gate had been mounting
 *    this component with no options at all. The fixture lives here rather
 *    than in the manifest, because manifest defaultOptions ship to
 *    consumers and this is placeholder content.
 *    The trigger clicks a clickable card (readiness step 2 B4).
 * 🔗 RELATES: [[MetricCard]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker metriccard-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface MetricCardLike
{
    getRootElement(): HTMLElement | null;
}

export const CONFORMANCE_GLUE =
{
    options: { label: "FIXTURE METRIC", value: 0, clickable: true },

    // Only a clickable card listens for clicks; an agent sets this too.
    eventProps: { clickable: true },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const root = (handle as unknown as MetricCardLike).getRootElement();

        if (channel !== "click" || !root) { return false; }

        root.click();

        return true;
    },
};
