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

/** The slice of the handle the trigger drives. */
interface PermissionMatrixLike
{
    getElement(): HTMLElement | null;
}

const ROLES = [{ id: "role-a", name: "Role A" }];
const GROUPS = [{ id: "group-a", name: "Group A", permissions: [{ id: "perm-a", name: "Permission A" }] }];
const CELLS = [{ roleId: "role-a", permissionId: "perm-a", state: "granted" }];

/** Clicks the element `selector` names inside the matrix. */
function click(handle: Record<string, unknown>, selector: string): boolean
{
    const el = (handle as unknown as PermissionMatrixLike).getElement()?.querySelector<HTMLElement>(selector);

    el?.click();

    return el != null;
}

export const CONFORMANCE_GLUE =
{
    options: { roles: ROLES, groups: GROUPS, cells: CELLS },

    // The grid to edit, with every control the triggers press; an agent sets these too.
    eventProps: { roles: ROLES, groups: GROUPS, cells: CELLS, readOnly: false, showExport: true, showReset: true,
        enableGroupBulk: true },

    // A second role and group, and a new baseline that grants it (readiness step 3). Role A's cell keeps its
    // state: an edit that equals the new baseline is no longer unsaved, so it cannot be restored as one.
    slotSamples: {
        roles: [...ROLES, { id: "role-b", name: "Role B" }],
        groups: [...GROUPS, { id: "group-b", name: "Group B", permissions: [{ id: "perm-b", name: "Permission B" }] }],
        cells: [...CELLS, { roleId: "role-b", permissionId: "perm-b", state: "granted" }],
    },

    /** Edits a cell, toggles the group, exports, or edits a cell and resets (readiness step 3). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const cell = ".permissionmatrix-cell[data-role-id='role-a'][data-perm-id='perm-a']";

        switch (channel)
        {
            case "change": return click(handle, cell);
            case "bulkchange": return click(handle, "[data-bulk='group'][data-group-id='group-a']");
            case "export":
                // Without onExport the matrix downloads as a blob URL, which jsdom lacks and a browser has.
                URL.createObjectURL ??= () => "blob:conformance";
                URL.revokeObjectURL ??= () => undefined;

                return click(handle, ".permissionmatrix-export-btn");
            case "reset": return click(handle, cell) && click(handle, ".permissionmatrix-reset-btn");
            default: return false;
        }
    },
};
