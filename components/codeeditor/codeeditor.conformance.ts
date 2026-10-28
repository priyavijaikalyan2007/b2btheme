/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: CodeEditor / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: clicks the
 *    toolbar's Save button, which a "save" subscriber enables (readiness step
 *    2 B5).
 * 🔗 RELATES: [[CodeEditor]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker codeeditor-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface CodeEditorLike
{
    getElement(): HTMLElement;
}

export const CONFORMANCE_GLUE =
{
    options: { value: "const answer = 42;" },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const save = (handle as unknown as CodeEditorLike).getElement()
            .querySelector<HTMLButtonElement>('[data-action="save"]');

        if (channel !== "save" || !save || save.disabled) { return false; }

        save.click();

        return true;
    },
};
