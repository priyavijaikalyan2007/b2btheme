/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: FileExplorer / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    These are test fixtures and deliberately do NOT live in the manifest's
 *    defaultOptions: that field is shipped to consumers via
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A fixture there would put placeholder content in front
 *    of real users.
 *
 *    Every option is optional. MEASURED 2026-10-10: the gate passes with `{}`
 *    too, because the explorer's toolbar and panes are chrome and
 *    renders-content is satisfied by chrome. So this fixture is not what
 *    makes the check pass — it is what makes the check exercise the node
 *    tree instead of an empty shell. Deleting it would not turn the gate
 *    red, which is the reason to say so here.
 *
 * RELATES: [[FileExplorer]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker fileexplorer-conformance-glue

export const CONFORMANCE_GLUE =
{
    options:
    {
        roots:
        [
            { id: "root", name: "Conformance", type: "folder", children: [] },
        ],
    },
};
