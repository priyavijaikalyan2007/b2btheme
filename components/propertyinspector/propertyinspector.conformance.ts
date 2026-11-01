/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: PropertyInspector / ConformanceGlue
 * 📜 PURPOSE: Event fixture. The drawer shows its header action and close
 *    button only once it is open, which the shipped defaultOptions (closed)
 *    never are. An open drawer with one action lives here rather than in the
 *    manifest because defaultOptions is shipped data.
 * 🔗 RELATES: [[PropertyInspector]], [[Conformance]]
 */

// @semantic-marker propertyinspector-conformance-glue

/** The slice of the handle the trigger drives. */
interface PropertyInspectorLike
{
    getElement(): HTMLElement;
}

/** Clicks the first element matching `selector` inside the drawer. */
function clickInDrawer(handle: Record<string, unknown>, selector: string): boolean
{
    const button = (handle as unknown as PropertyInspectorLike).getElement().querySelector<HTMLElement>(selector);

    button?.click();

    return button != null;
}

export const CONFORMANCE_GLUE =
{
    // An open drawer with one header action, as an agent writes it (ADR-242).
    eventProps: { openWith: { title: "Fixture", actions: [{ id: "fixture-action", label: "Act", icon: "bi-pin" }] } },

    /** Clicks the header action, or the close button (readiness step 4, ADR-242). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel === "action") { return clickInDrawer(handle, ".propertyinspector-action-btn"); }

        return channel === "close" && clickInDrawer(handle, ".propertyinspector-close-btn");
    },
};
