/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: EmptyState / ConformanceGlue
 * 📜 PURPOSE: Channel triggers for the conformance gate and A2UI G3: clicks
 *    the action and secondary buttons (readiness step 2 B4).
 * 🔗 RELATES: [[EmptyState]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker emptystate-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface EmptyStateLike
{
    getElement(): HTMLElement | null;
}

/** The button each channel's click comes from. */
const BUTTONS: Record<string, string> = { action: ".emptystate-action", secondary: ".emptystate-secondary" };

export const CONFORMANCE_GLUE =
{
    options: { heading: "Fixture", actionLabel: "Create", secondaryLabel: "Learn more" },

    // A button shows only with its label; an agent sets these too.
    eventProps: { actionLabel: "Create", secondaryLabel: "Learn more" },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const selector = BUTTONS[channel];
        const button = selector ? (handle as unknown as EmptyStateLike).getElement()
            ?.querySelector<HTMLElement>(selector) : null;

        button?.click();

        return button != null;
    },
};
