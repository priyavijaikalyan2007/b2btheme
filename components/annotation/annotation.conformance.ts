/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Annotation / ConformanceGlue
 * 📜 PURPOSE: Channel triggers for the conformance gate. No mount fixture is
 *    needed — an annotation renders with no options at all.
 * 🔗 RELATES: [[Annotation]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker annotation-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface AnnotationLike
{
    setValue(label: string): void;
    setAnchor(anchor: { kind: string; entityId?: string }): void;
}

export const CONFORMANCE_GLUE =
{
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const annotation = handle as unknown as AnnotationLike;

        if (channel === "change")
        {
            annotation.setValue("triggered");
            return true;
        }

        if (channel === "anchor")
        {
            annotation.setAnchor({ kind: "entity", entityId: "fixture:entity" });
            return true;
        }

        return false;
    },
};
