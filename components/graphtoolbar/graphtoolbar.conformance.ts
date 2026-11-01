/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: GraphToolbar / ConformanceGlue
 * 📜 PURPOSE: Event fixture: clicks the Undo tool, which every default
 *    GraphToolbar shows.
 * 🔗 RELATES: [[GraphToolbar]], [[Conformance]]
 */

// @semantic-marker graphtoolbar-conformance-glue

/** The slice of the handle the trigger drives. */
interface GraphToolbarLike
{
    toolbar: { getElement(): HTMLElement | null };
}

export const CONFORMANCE_GLUE =
{
    /** Clicks Undo (readiness step 5, ADR-245). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const button = channel === "toolClick"
            ? (handle as unknown as GraphToolbarLike).toolbar.getElement()?.querySelector<HTMLElement>(
                "[data-tool-id='gt-undo']")
            : null;

        button?.click();

        return button != null;
    },
};
