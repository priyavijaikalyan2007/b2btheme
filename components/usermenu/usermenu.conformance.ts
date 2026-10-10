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
 *    fixture is what makes the check exercise the menu items.
 * RELATES: [[UserMenu]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker usermenu-conformance-glue

export const CONFORMANCE_GLUE =
{
    options:
    {
        userName: "Conformance Fixture",
        menuItems: [{ id: "signout", label: "Sign out" }],
    },
};
