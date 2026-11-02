/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: ErrorDialog / ConformanceGlue
 * 📜 PURPOSE: Mount and event fixture. A title and message have no
 *    production default, and only showRetry puts up the Retry button.
 *    Closing removes the dialog, so the fixture triggers Retry first.
 * 🔗 RELATES: [[ErrorDialog]], [[Conformance]]
 */

// @semantic-marker errordialog-conformance-glue

/** The slice of the handle the trigger drives. */
interface ErrorDialogLike
{
    getElement(): HTMLElement | null;
}

export const CONFORMANCE_GLUE =
{
    options: { title: "Sync failed", message: "The fixture could not sync.", showRetry: true, contained: true },

    eventProps: { title: "Sync failed", message: "The fixture could not sync.", showRetry: true },

    /** Clicks Retry or the footer's Close (readiness step 5, ADR-246). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const root = (handle as unknown as ErrorDialogLike).getElement();
        const button = channel === "retry" ? root?.querySelector<HTMLElement>(".errordialog-retry")
            : channel === "close" ? root?.querySelector<HTMLElement>(".modal-footer .btn-secondary") : null;

        if (!button) { return false; }

        button.click();

        return true;
    },
};
