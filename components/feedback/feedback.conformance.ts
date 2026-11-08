/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: Feedback / ConformanceGlue
 * 📜 PURPOSE: Mount and event fixture. targetId and a save callback are
 *    required and have no production default; only a control showing Copy
 *    emits "copy". The fixture lives here because defaultOptions is shipped
 *    data. showReport is off so the fixture needs no FormDialog. request
 *    drives the one save: a pick, then Submit.
 * 🔗 RELATES: [[Feedback]], [[Conformance]]
 */

// @semantic-marker feedback-conformance-glue

/** The slice of the handle the trigger drives. */
interface FeedbackLike
{
    getElement(): HTMLElement;
}

export const CONFORMANCE_GLUE =
{
    options: { targetId: "fixture.target", onFeedback: () => Promise.resolve(), showReport: false, showCopy: true },

    // A control with Copy, as an agent writes it.
    eventProps: { targetId: "fixture.target", showCopy: true, showReport: false },

    // A summary has the scale's shape, so the two are held together; Report needs FormDialog.
    heldProps: { scale: "thumbs", summary: { positive: 3, negative: 1 }, showReport: false },

    /** Rates helpful and presses Submit, which sends the one save. */
    request: (
        name: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (name !== "feedback") { return false; }

        const el = (handle as unknown as FeedbackLike).getElement();
        el.querySelector<HTMLButtonElement>(".feedback-positive")?.click();
        el.querySelector<HTMLButtonElement>(".feedback-submit")?.click();

        return true;
    },

    /** Presses Copy. */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel !== "copy") { return false; }

        (handle as unknown as FeedbackLike).getElement().querySelector<HTMLButtonElement>(".feedback-copy")?.click();

        return true;
    },
};
