/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Ribbon / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: clicks a
 *    button on the first tab (readiness step 2 B8).
 * 🔗 RELATES: [[Ribbon]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker ribbon-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface RibbonLike
{
    getElement(): HTMLElement;
}

/** One tab with one group holding one button, as an agent writes it. */
const TABS = [{ id: "home", label: "Home", groups: [{ id: "file", label: "File",
    controls: [{ type: "button", id: "save", label: "Save", icon: "bi bi-save" }] }] }];

export const CONFORMANCE_GLUE =
{
    options: { tabs: TABS },

    // The button a click comes from, on the tab shown; an agent sets these too.
    eventProps: { tabs: TABS, activeTabId: "home" },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const button = channel === "controlClick" ? (handle as unknown as RibbonLike).getElement()
            .querySelector<HTMLElement>("[data-control-id='save']") : null;

        button?.click();

        return button != null;
    },
};
