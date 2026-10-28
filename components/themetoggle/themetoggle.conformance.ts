/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ThemeToggle / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: switches
 *    to the other mode through setTheme(), the path a button press takes
 *    (readiness step 2 B4).
 * 🔗 RELATES: [[ThemeToggle]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker themetoggle-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface ThemeToggleLike
{
    getMode(): "light" | "dark" | "auto";
    setTheme(mode: "light" | "dark" | "auto"): void;
}

export const CONFORMANCE_GLUE =
{
    options: {},

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel !== "change") { return false; }

        const toggle = handle as unknown as ThemeToggleLike;
        toggle.setTheme(toggle.getMode() === "dark" ? "light" : "dark");

        return true;
    },
};
