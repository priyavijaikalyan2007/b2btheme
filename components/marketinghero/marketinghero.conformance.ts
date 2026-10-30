/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MarketingHero / ConformanceGlue
 * 📜 PURPOSE: Channel triggers for the conformance gate and A2UI G3: clicks
 *    the primary and secondary buttons (readiness step 2 B8).
 * 🔗 RELATES: [[MarketingHero]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker marketinghero-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface MarketingHeroLike
{
    getElement(): HTMLElement | null;
}

/** Each channel's button, in render order: primary first, then secondary. */
const INDEX: Record<string, number> = { primary: 0, secondary: 1 };

export const CONFORMANCE_GLUE =
{
    options: {
        title: "Fixture",
        primaryAction: { text: "Get started" },
        secondaryAction: { text: "Read the docs" },
    },

    // A button shows only with its action; an agent sets these too.
    eventProps: { primaryAction: { text: "Get started" }, secondaryAction: { text: "Read the docs" } },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const index = INDEX[channel];
        const button = index === undefined ? null : (handle as unknown as MarketingHeroLike).getElement()
            ?.querySelectorAll<HTMLElement>(".marketinghero-actions .btn")[index];

        button?.click();

        return button != null;
    },
};
