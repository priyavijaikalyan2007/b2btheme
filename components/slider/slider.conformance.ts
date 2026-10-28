/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Slider / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: moves the thumb with the keyboard (readiness step 2 B3).
 * 🔗 RELATES: [[Slider]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker slider-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface SliderLike
{
    getElement(): HTMLElement;
}

export const CONFORMANCE_GLUE =
{
    options: {},

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel !== "change") { return false; }

        const thumb = (handle as unknown as SliderLike).getElement().querySelector<HTMLElement>("[role=slider]");
        thumb?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

        return thumb !== null;
    },
};
