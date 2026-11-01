/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: TypeBadge / ConformanceGlue
 * 📜 PURPOSE: Mount and event fixture. typeKey is required and has no
 *    production default, and only a clickable badge emits "click". A fixture
 *    type lives here rather than in the manifest because defaultOptions is
 *    shipped data.
 * 🔗 RELATES: [[TypeBadge]], [[Conformance]]
 */

// @semantic-marker typebadge-conformance-glue

/** The slice of the handle the trigger drives. */
interface TypeBadgeLike
{
    getElement(): HTMLElement;
}

export const CONFORMANCE_GLUE =
{
    options: { typeKey: "fixture.type" },

    // A clickable badge, as an agent writes it (ADR-243).
    eventProps: { typeKey: "fixture.type", clickable: true },

    /** Clicks the badge (readiness step 5, ADR-243). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel !== "click") { return false; }

        (handle as unknown as TypeBadgeLike).getElement().click();

        return true;
    },
};
