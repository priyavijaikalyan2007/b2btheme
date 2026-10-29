/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: InlineToolbar / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: clicks the
 *    first button (readiness step 2 B5).
 * 🔗 RELATES: [[InlineToolbar]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker inlinetoolbar-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface InlineToolbarLike
{
    getElement(): HTMLElement;
}

export const CONFORMANCE_GLUE =
{
    options: { items: [{ id: "bold", icon: "type-bold", tooltip: "Bold" }] },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const button = (handle as unknown as InlineToolbarLike).getElement()
            .querySelector<HTMLElement>(".inlinetoolbar-btn");

        if (channel !== "itemClick" || !button) { return false; }

        button.click();

        return true;
    },
};
