/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: RibbonBuilder / ConformanceGlue
 * 📜 PURPOSE: Channel triggers for the conformance gate and A2UI G3: clicks
 *    the toolbar's Add Tab (change) and Export MD (export) (readiness step 2
 *    B8).
 * 🔗 RELATES: [[RibbonBuilder]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker ribbonbuilder-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface RibbonBuilderLike
{
    getElement(): HTMLElement;
}

/** The toolbar button each channel's gesture comes from. */
const BUTTONS: Record<string, string> = { change: "Add Tab", export: "Export MD" };

export const CONFORMANCE_GLUE =
{
    options: {},

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const title = BUTTONS[channel];
        const button = title === undefined ? null : (handle as unknown as RibbonBuilderLike).getElement()
            .querySelector<HTMLElement>(`.ribbonbuilder-toolbar-btn[title="${title}"]`);

        button?.click();

        return button != null;
    },
};
