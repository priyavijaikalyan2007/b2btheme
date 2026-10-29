/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: PersonChip / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    These are test fixtures and deliberately do NOT live in the manifest's
 *    defaultOptions: that field is shipped to consumers via
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A fixture there would put placeholder content in front
 *    of real users.
 *
 *    The trigger clicks a clickable chip (readiness step 2 B4).
 * RELATES: [[PersonChip]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker personchip-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface PersonChipLike
{
    getElement(): HTMLElement | null;
}

export const CONFORMANCE_GLUE =
{
    options: { name: "Conformance Fixture", clickable: true },

    // Only a clickable chip listens for clicks; an agent sets this too.
    eventProps: { clickable: true },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const root = (handle as unknown as PersonChipLike).getElement();

        if (channel !== "click" || !root) { return false; }

        root.click();

        return true;
    },
};
