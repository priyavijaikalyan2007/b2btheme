/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: TimePicker / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: changes
 *    the timezone, which emits "timezone" (readiness step 2 B2).
 * 🔗 RELATES: [[TimePicker]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker timepicker-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface TimeLike
{
    getTimezone(): string;
    setTimezone(tz: string): void;
}

export const CONFORMANCE_GLUE =
{
    options: {},

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel !== "timezone") { return false; }

        const time = handle as unknown as TimeLike;
        time.setTimezone(time.getTimezone() === "Asia/Tokyo" ? "Europe/Paris" : "Asia/Tokyo");

        return true;
    },
};
