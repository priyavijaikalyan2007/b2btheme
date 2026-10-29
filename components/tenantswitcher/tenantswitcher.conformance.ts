/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: TenantSwitcher / ConformanceGlue
 * 📜 PURPOSE: The mount fixture, channel triggers and search request for the
 *    conformance gate and A2UI G3 (readiness step 2 B8). The list opens in a
 *    popup on document.body, so the triggers open it and look there.
 * 🔗 RELATES: [[TenantSwitcher]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker tenantswitcher-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface TenantSwitcherLike
{
    open(): void;
}

const TENANTS = [
    { id: "t1", name: "Alpha Corp" },
    { id: "t2", name: "Beta LLC" },
];

/** Opens the popup and returns the element `selector` names in it. */
function inPopup(handle: Record<string, unknown>, selector: string): HTMLElement | null
{
    (handle as unknown as TenantSwitcherLike).open();

    return document.querySelector<HTMLElement>(`.tenantswitcher-dropdown ${selector}, `
        + `.tenantswitcher-modal ${selector}`);
}

export const CONFORMANCE_GLUE =
{
    options: { tenants: TENANTS, activeTenantId: "t1", showSearch: true },

    // The tenants to pick from; an agent sets these too.
    eventProps: { tenants: TENANTS, activeTenantId: "t1" },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const target = channel === "switch" ? inPopup(handle, ".tenantswitcher-item:not(.tenantswitcher-item-active)")
            : channel === "create" ? inPopup(handle, ".tenantswitcher-create")
                : null;

        target?.click();

        return target != null;
    },

    /** Create-time props a search request needs: the search box. */
    requestProps: { showSearch: true },

    /** Makes the component ask its provider (ADR-225): type a search; it is sent after the debounce. */
    request: (
        request: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (request !== "search") { return false; }

        const input = inPopup(handle, "input") as HTMLInputElement | null;

        if (!input) { return false; }

        input.value = "be";
        input.dispatchEvent(new Event("input", { bubbles: true }));

        return true;
    },
};
