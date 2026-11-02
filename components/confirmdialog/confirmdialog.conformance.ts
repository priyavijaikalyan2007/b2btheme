/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: ConfirmDialog / ConformanceGlue
 * 📜 PURPOSE: Mount and event fixture. message is required and has no
 *    production default, and the adapter mounts the dialog contained. An
 *    answered dialog closes, so the trigger reopens it to drive the next
 *    channel on the same mount.
 * 🔗 RELATES: [[ConfirmDialog]], [[Conformance]]
 */

// @semantic-marker confirmdialog-conformance-glue

/** The slice of the handle the trigger drives. */
interface ConfirmDialogLike
{
    getElement(): HTMLElement | null;
    show(): Promise<boolean>;
}

export const CONFORMANCE_GLUE =
{
    options: { message: "Delete the fixture?", contained: true },

    eventProps: { message: "Delete the fixture?" },

    /** Clicks the confirm or cancel button (readiness step 5, ADR-246). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const selector = channel === "confirm" ? ".confirmdialog-confirm"
            : channel === "cancel" ? ".confirmdialog-cancel" : null;
        const dialog = handle as unknown as ConfirmDialogLike;

        if (selector && !dialog.getElement()) { void dialog.show(); }

        const button = selector ? dialog.getElement()?.querySelector<HTMLElement>(selector) : null;

        if (!button) { return false; }

        button.click();

        return true;
    },
};
