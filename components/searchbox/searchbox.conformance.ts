/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SearchBox / ConformanceGlue
 * 📜 PURPOSE: Channel triggers for the conformance gate and A2UI G3: clears
 *    the box, and presses Enter (readiness step 2 B3).
 * 🔗 RELATES: [[SearchBox]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker searchbox-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface SearchLike
{
    getElement(): HTMLElement | null;
    clearValue(): void;
}

export const CONFORMANCE_GLUE =
{
    options: {},

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const search = handle as unknown as SearchLike;

        // Typing searches after a debounce, which a synchronous check cannot see;
        // clearing the box searches for "" at once, and is a real user path.
        if (channel === "search") { search.clearValue(); return true; }

        if (channel !== "submit") { return false; }

        const input = search.getElement()?.querySelector<HTMLInputElement>("input");
        input?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        return input !== null && input !== undefined;
    },
};
