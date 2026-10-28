/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: PeoplePicker / ConformanceGlue
 * 📜 PURPOSE: Provider trigger for A2UI G3: types a name, which asks the agent to search (readiness step 2 B3).
 * 🔗 RELATES: [[PeoplePicker]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker peoplepicker-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface PeopleLike
{
    getElement(): HTMLElement;
}

export const CONFORMANCE_GLUE =
{
    options: {},

    /** Create-time props a search request needs: no debounce wait. */
    requestProps: { debounceMs: 0 },

    trigger: (_channel: string, _handle: Record<string, unknown>): boolean => false,

    /** Makes the component ask its provider (ADR-225): type enough characters to search. */
    request: (
        request: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (request !== "search") { return false; }

        const input = (handle as unknown as PeopleLike).getElement().querySelector<HTMLInputElement>("input");

        if (!input) { return false; }

        input.value = "al";
        input.dispatchEvent(new Event("input", { bubbles: true }));

        return true;
    },
};
