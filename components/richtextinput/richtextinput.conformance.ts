/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: RichTextInput / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: presses
 *    Ctrl+Enter in the editable area (readiness step 2 B5).
 * 🔗 RELATES: [[RichTextInput]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker richtextinput-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface RichTextInputLike
{
    getElement(): HTMLElement;
}

export const CONFORMANCE_GLUE =
{
    options: { value: "Fixture text", submitOnCtrlEnter: true },

    // Ctrl+Enter submits only when asked; an agent sets this too.
    eventProps: { submitOnCtrlEnter: true },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const editable = (handle as unknown as RichTextInputLike).getElement()
            .querySelector<HTMLElement>(".richtextinput-editable");

        if (channel !== "submit" || !editable) { return false; }

        editable.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));

        return true;
    },
};
