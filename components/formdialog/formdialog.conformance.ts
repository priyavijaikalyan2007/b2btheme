/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: FormDialog / ConformanceGlue
 * 📜 PURPOSE: Mount and event fixture. title is required and has no
 *    production default, and the adapter mounts the dialog contained. An
 *    answered dialog closes, so the trigger reopens it to drive the next
 *    channel on the same mount.
 * 🔗 RELATES: [[FormDialog]], [[Conformance]]
 */

// @semantic-marker formdialog-conformance-glue

/** The slice of the handle the trigger drives. */
interface FormDialogLike
{
    getElement(): HTMLElement | null;
    show(): void;
}

const OPTIONS = {
    title: "Invite the fixture",
    fields: [{ name: "email", label: "Email", type: "email", value: "a@example.com" }],
};

export const CONFORMANCE_GLUE =
{
    options: { ...OPTIONS, contained: true },

    eventProps: OPTIONS,

    /** Clicks Submit or Cancel (readiness step 5, ADR-246). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const selector = channel === "submit" ? ".formdialog-btn-submit"
            : channel === "cancel" ? ".formdialog-btn-cancel" : null;
        const dialog = handle as unknown as FormDialogLike;

        if (selector && !dialog.getElement()) { dialog.show(); }

        const button = selector ? dialog.getElement()?.querySelector<HTMLElement>(selector) : null;

        if (!button) { return false; }

        button.click();

        return true;
    },
};
