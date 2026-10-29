/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Breadcrumb / ConformanceGlue
 * 📜 PURPOSE: Channel triggers for the conformance gate and A2UI G3: clicks
 *    the first segment, and an action in the terminal segment's menu
 *    (readiness step 2 B4).
 * 🔗 RELATES: [[Breadcrumb]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker breadcrumb-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface BreadcrumbLike
{
    getElement(): HTMLElement | null;
}

/** Two segments, so the first is a link, and one terminal action. */
const TRAIL = { items: [{ label: "Home" }, { label: "Reports" }], actions: [{ id: "share", label: "Share" }] };

export const CONFORMANCE_GLUE =
{
    options: TRAIL,

    eventProps: TRAIL,

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const root = (handle as unknown as BreadcrumbLike).getElement();

        if (!root) { return false; }

        if (channel === "itemClick")
        {
            const link = root.querySelector<HTMLElement>(".breadcrumb-nav-link");
            link?.click();
            return link !== null;
        }

        if (channel !== "actionClick") { return false; }

        root.querySelector<HTMLElement>(".breadcrumb-nav-actions-caret")?.click();
        const item = root.ownerDocument.querySelector<HTMLElement>(".breadcrumb-nav-dropdown-item");
        item?.click();

        return item !== null;
    },
};
