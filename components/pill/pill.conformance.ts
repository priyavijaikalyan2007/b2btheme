/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Pill / ConformanceGlue
 * 📜 PURPOSE: The mount fixture the conformance gate needs. ERR-2 made
 *    label required, and the gate had been mounting
 *    this component with no options at all. The fixture lives here rather
 *    than in the manifest, because manifest defaultOptions ship to
 *    consumers and this is placeholder content.
 *    The triggers click a clickable pill and its dismiss button (readiness
 *    step 2 B4).
 * 🔗 RELATES: [[Pill]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker pill-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface PillLike
{
    getElement(): HTMLElement | null;
}

/** The element each channel's click comes from; dismissing also destroys the pill. */
const TARGETS: Record<string, (root: HTMLElement) => HTMLElement | null> = {
    click: (root) => root,
    dismiss: (root) => root.querySelector<HTMLElement>(".pill-dismiss"),
};

export const CONFORMANCE_GLUE =
{
    options: { label: "Fixture", clickable: true, dismissible: true },

    // A pill listens for clicks and shows its dismiss button only when asked; an agent sets these too.
    eventProps: { clickable: true, dismissible: true },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const root = (handle as unknown as PillLike).getElement();
        const target = root && TARGETS[channel] ? TARGETS[channel](root) : null;

        target?.click();

        return target != null;
    },
};
