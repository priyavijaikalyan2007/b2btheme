/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: PermissionMatrix / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    These are test fixtures and deliberately do NOT live in the manifest's
 *    defaultOptions: that field is shipped to consumers via
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A fixture there would put placeholder content in front
 *    of real users.
 *
 *    The three collections have to agree with each other — a cell names a role
 *    and a permission that must exist — so this is one coherent 1x1 grid
 *    rather than three independent lists.
 *
 *    MEASURED 2026-10-10: the gate also passes with `{}`, because an empty
 *    matrix still renders `emptyMessage` and renders-content accepts it. The
 *    fixture is here so the check walks the grid rather than the empty state.
 * RELATES: [[PermissionMatrix]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker permissionmatrix-conformance-glue

export const CONFORMANCE_GLUE =
{
    options:
    {
        roles: [{ id: "role-a", name: "Role A" }],
        groups:
        [
            {
                id: "group-a",
                name: "Group A",
                permissions: [{ id: "perm-a", name: "Permission A" }],
            },
        ],
        cells: [{ roleId: "role-a", permissionId: "perm-a", state: "granted" }],
    },
};
