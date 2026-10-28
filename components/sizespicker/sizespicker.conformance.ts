/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SizesPicker / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: opens the
 *    dropdown and chooses its "Custom…" link (readiness step 2 B1-1).
 * 🔗 RELATES: [[SizesPicker]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sizespicker-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface PickerLike
{
    show(): void;
}

export const CONFORMANCE_GLUE =
{
    options: {},

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel !== "custom") { return false; }

        (handle as unknown as PickerLike).show();
        const link = document.querySelector<HTMLElement>(".sizespicker-custom");
        link?.click();

        return link !== null;
    },
};
