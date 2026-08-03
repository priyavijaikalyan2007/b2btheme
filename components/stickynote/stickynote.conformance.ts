/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: StickyNote / ConformanceGlue
 * 📜 PURPOSE: Channel triggers for the conformance gate. StickyNote needs no
 *    mount fixture — it renders happily with no options at all, which is the
 *    point of a note.
 * 🔗 RELATES: [[StickyNote]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker stickynote-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface NoteLike
{
    setValue(text: string): void;
    setAnchor(anchor: { kind: string; entityId?: string }): void;
}

export const CONFORMANCE_GLUE =
{
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const note = handle as unknown as NoteLike;

        if (channel === "change")
        {
            note.setValue("triggered");
            return true;
        }

        if (channel === "anchor")
        {
            note.setAnchor({ kind: "entity", entityId: "fixture:entity" });
            return true;
        }

        return false;
    },
};
