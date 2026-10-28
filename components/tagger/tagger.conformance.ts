/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Tagger / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: adds a tag (readiness step 2 B3).
 * 🔗 RELATES: [[Tagger]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker tagger-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface TaggerLike
{
    addTag(tag: { value: string }): boolean;
}

export const CONFORMANCE_GLUE =
{
    options: {},

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel !== "change") { return false; }

        return (handle as unknown as TaggerLike).addTag({ value: `fixture-${Date.now()}` });
    },
};
