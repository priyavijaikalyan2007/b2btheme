/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: FacetSearch / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: types a
 *    query and presses Enter (readiness step 2 B6).
 * 🔗 RELATES: [[FacetSearch]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker facetsearch-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface FacetSearchLike
{
    getElement(): HTMLElement;
}

export const CONFORMANCE_GLUE =
{
    // A value with a facet renders a chip at once, so the fixture reaches the DOM.
    options: { facets: [{ key: "status", label: "Status", valueType: "enum", values: ["open", "closed"] }],
        value: "status:open" },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const input = (handle as unknown as FacetSearchLike).getElement()
            .querySelector<HTMLInputElement>(".facetsearch-input");

        if (channel !== "search" || !input) { return false; }

        input.value = "quarterly";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        return true;
    },
};
