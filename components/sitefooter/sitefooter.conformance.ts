/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SiteFooter / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: clicks
 *    the first group link (readiness step 2 B8).
 * 🔗 RELATES: [[SiteFooter]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sitefooter-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface SiteFooterLike
{
    getElement(): HTMLElement | null;
}

/** One group with one link, written as an agent writes it: no href. */
const GROUPS = [{ title: "Product", links: [{ text: "Overview" }] }];

export const CONFORMANCE_GLUE =
{
    options: { groups: GROUPS },

    // The link a click comes from; an agent sets it too.
    eventProps: { groups: GROUPS },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const link = channel === "linkClick" ? (handle as unknown as SiteFooterLike).getElement()
            ?.querySelector<HTMLElement>(".sitefooter-links button") : null;

        link?.click();

        return link != null;
    },
};
