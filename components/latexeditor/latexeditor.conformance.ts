/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LatexEditor / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: presses
 *    Ctrl+Enter in the source textarea (readiness step 2 B5).
 * 🔗 RELATES: [[LatexEditor]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker latexeditor-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface LatexEditorLike
{
    getElement(): HTMLElement;
}

export const CONFORMANCE_GLUE =
{
    options: { value: "x^2" },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const source = (handle as unknown as LatexEditorLike).getElement().querySelector<HTMLElement>(".le-source");

        if (channel !== "confirm" || !source) { return false; }

        source.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));

        return true;
    },
};
