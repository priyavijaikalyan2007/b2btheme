/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: StackLayout / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    These are test fixtures and deliberately do NOT live in the manifest's
 *    defaultOptions: that field is shipped to consumers via
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A fixture there would put placeholder content in front
 *    of real users.
 *
 *    `content` is an HTMLElement, so the fixture has to build one. It cannot be
 *    expressed in defaultOptions at all — JSON carries no elements.
 *
 *    MEASURED 2026-10-10: the gate passes with no panels too, because the
 *    stacklayout root div is itself content as far as renders-content is
 *    concerned. One panel is what makes the check build a divider and a header.
 * RELATES: [[StackLayout]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker stacklayout-conformance-glue

export const CONFORMANCE_GLUE =
{
    options:
    {
        panels:
        [
            {
                id: "conformance-panel",
                title: "Conformance",
                content: document.createElement("div"),
            },
        ],
    },
};
