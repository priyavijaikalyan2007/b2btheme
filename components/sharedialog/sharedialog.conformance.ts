/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: ShareDialog / ConformanceGlue
 * 📜 PURPOSE: Mount and event fixture. title and accessLevels are required
 *    and have no production default, and the adapter mounts the dialog
 *    contained. An answered dialog closes, so the trigger reopens it to
 *    drive the next channel on the same mount.
 * 🔗 RELATES: [[ShareDialog]], [[Conformance]]
 */

// @semantic-marker sharedialog-conformance-glue

/** The slice of the handle the trigger drives. */
interface ShareDialogLike
{
    getElement(): HTMLElement | null;
    show(): Promise<unknown>;
}

const OPTIONS = {
    title: "Share the fixture",
    accessLevels: [{ id: "viewer", label: "Viewer" }, { id: "editor", label: "Editor" }],
};

export const CONFORMANCE_GLUE =
{
    options: { ...OPTIONS, contained: true },

    eventProps: OPTIONS,

    /** Clicks Done or Cancel (readiness step 5, ADR-246). Done settles after a promise, hence "async". */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean | "async" =>
    {
        const selector = channel === "share" ? ".sharedialog-done-btn"
            : channel === "cancel" ? ".sharedialog-cancel-btn" : null;
        const dialog = handle as unknown as ShareDialogLike;

        if (selector && !dialog.getElement()) { void dialog.show(); }

        const button = selector ? dialog.getElement()?.querySelector<HTMLElement>(selector) : null;

        if (!button) { return false; }

        button.click();

        return channel === "share" ? "async" : true;
    },

    /** Makes the inner PeoplePicker ask the provider (ADR-225): type enough characters to search. */
    request: (
        request: string,
        handle: Record<string, unknown>): boolean =>
    {
        const input = request === "search"
            ? (handle as unknown as ShareDialogLike).getElement()?.querySelector<HTMLInputElement>("input")
            : null;

        if (!input) { return false; }

        input.value = "al";
        input.dispatchEvent(new Event("input", { bubbles: true }));

        return true;
    },
};
