/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: UserMenu / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    These are test fixtures and deliberately do NOT live in the manifest's
 *    defaultOptions: that field is shipped to consumers via
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A fixture there would put placeholder content in front
 *    of real users.
 *
 *    MEASURED 2026-10-10: the gate passes with `{}` as well — the avatar and
 *    trigger button are chrome, and renders-content is satisfied by chrome. The
 *    fixture is what makes the check exercise the menu items. The trigger
 *    opens the menu and clicks an item (readiness step 3).
 * RELATES: [[UserMenu]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker usermenu-conformance-glue

/** The slice of the handle the trigger drives. */
interface UserMenuLike
{
    open(): void;
}

const ITEMS = [
    { id: "profile", label: "Profile" },
    { id: "sign-out", label: "Sign out" },
];

export const CONFORMANCE_GLUE =
{
    options:
    {
        userName: "Conformance Fixture",
        menuItems: ITEMS,
    },

    // The items to click; an agent sets these too.
    eventProps: { userName: "Conformance Fixture", menuItems: ITEMS },

    slotSamples: { menuItems: [{ id: "help", label: "Help" }] },

    /** Opens the menu and clicks Profile (select) or Sign out (signout). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const id = channel === "select" ? "profile" : channel === "signout" ? "sign-out" : null;

        if (id === null) { return false; }

        (handle as unknown as UserMenuLike).open();
        const item = document.querySelector<HTMLElement>(`.usermenu [data-item-id="${id}"]`);

        item?.click();

        return item != null;
    },
};
