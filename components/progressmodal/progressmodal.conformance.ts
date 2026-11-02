/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: ProgressModal / ConformanceGlue
 * 📜 PURPOSE: Mount and event fixture. showCancel and showRetry put up the
 *    buttons an agent offers. Retry shows only after a failure and Done only
 *    when the run is over, so the trigger reports the outcome first, as the
 *    agent would.
 * 🔗 RELATES: [[ProgressModal]], [[Conformance]]
 */

// @semantic-marker progressmodal-conformance-glue

/** The slice of the surface the trigger drives. */
interface ProgressSurfaceLike
{
    getElement(): HTMLElement | null;
    setData(slot: string, value: unknown): void;
}

const OPTIONS = { title: "Importing the fixture", showCancel: true, showRetry: true };

export const CONFORMANCE_GLUE =
{
    options: { ...OPTIONS, contained: true },

    eventProps: OPTIONS,

    /** Clicks Cancel, or fails the run and clicks Retry, or completes it and clicks Done (ADR-246). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const surface = handle as unknown as ProgressSurfaceLike;
        const outcome = channel === "retry" ? "failed" : channel === "close" ? "completed" : null;
        const selector = channel === "cancel" ? ".progressmodal-cancel-btn"
            : channel === "retry" ? ".progressmodal-retry-btn"
                : channel === "close" ? ".progressmodal-done-btn" : null;

        if (outcome) { surface.setData("progress", { outcome }); }

        const button = selector ? surface.getElement()?.querySelector<HTMLElement>(selector) : null;

        if (!button) { return false; }

        button.click();

        return true;
    },
};
