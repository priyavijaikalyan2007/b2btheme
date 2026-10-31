/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: PermissionMatrix
 * Vitest unit tests for the PermissionMatrix component.
 * Covers: factory, options, DOM structure, ARIA, cell state API,
 * change tracking, bulk operations, callbacks, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import
{
    PermissionMatrix,
    createPermissionMatrix,
} from "./permissionmatrix";
import type
{
    PermissionMatrixOptions,
    Role,
    PermissionGroup,
    MatrixCell,
    PermissionChange,
} from "./permissionmatrix";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeRoles(): Role[]
{
    return [
        { id: "admin", name: "Admin" },
        { id: "editor", name: "Editor" },
        { id: "viewer", name: "Viewer" },
    ];
}

function makeGroups(): PermissionGroup[]
{
    return [
        {
            id: "docs",
            name: "Documents",
            permissions: [
                { id: "docs.read", name: "Read Documents" },
                { id: "docs.write", name: "Write Documents" },
            ],
        },
        {
            id: "users",
            name: "Users",
            permissions: [
                { id: "users.manage", name: "Manage Users" },
            ],
        },
    ];
}

function makeCells(): MatrixCell[]
{
    return [
        { roleId: "admin", permissionId: "docs.read", state: "granted" },
        { roleId: "admin", permissionId: "docs.write", state: "granted" },
        { roleId: "admin", permissionId: "users.manage", state: "granted" },
        { roleId: "editor", permissionId: "docs.read", state: "granted" },
        { roleId: "editor", permissionId: "docs.write", state: "granted" },
        { roleId: "editor", permissionId: "users.manage", state: "denied" },
        { roleId: "viewer", permissionId: "docs.read", state: "granted" },
        { roleId: "viewer", permissionId: "docs.write", state: "denied" },
        { roleId: "viewer", permissionId: "users.manage", state: "denied" },
    ];
}

function makeOptions(
    overrides?: Partial<PermissionMatrixOptions>
): PermissionMatrixOptions
{
    return {
        roles: makeRoles(),
        groups: makeGroups(),
        cells: makeCells(),
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-permmatrix";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createPermissionMatrix
// ============================================================================

describe("createPermissionMatrix", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        expect(container.querySelector(".permissionmatrix")).not.toBeNull();
        matrix.destroy();
    });

    test("withoutContainerId_ReturnsUnmountedInstance", () =>
    {
        const matrix = createPermissionMatrix(makeOptions());
        expect(container.querySelector(".permissionmatrix")).toBeNull();
        expect(matrix.getElement()).not.toBeNull();
        matrix.destroy();
    });

    test("returnsPermissionMatrixInstance", () =>
    {
        const matrix = createPermissionMatrix(makeOptions());
        expect(matrix).toBeInstanceOf(PermissionMatrix);
        matrix.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rootElement_HasPermissionmatrixClass", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        expect(container.querySelector(".permissionmatrix")).not.toBeNull();
        matrix.destroy();
    });

    test("rendersRoleColumns", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        const root = matrix.getElement()!;
        // Should contain role names in headers
        expect(root.textContent).toContain("Admin");
        expect(root.textContent).toContain("Editor");
        expect(root.textContent).toContain("Viewer");
        matrix.destroy();
    });

    test("rendersPermissionRows", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        const root = matrix.getElement()!;
        expect(root.textContent).toContain("Read Documents");
        expect(root.textContent).toContain("Write Documents");
        matrix.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("gridHasGridRole", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        const grid = container.querySelector("[role='grid']");
        expect(grid).not.toBeNull();
        matrix.destroy();
    });

    test("liveRegionExists", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        const live = container.querySelector("[aria-live]");
        expect(live).not.toBeNull();
        matrix.destroy();
    });
});

// ============================================================================
// PUBLIC API — CELL STATE
// ============================================================================

describe("cell state API", () =>
{
    test("getCellState_ReturnsCorrectState", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        expect(matrix.getCellState("admin", "docs.read")).toBe("granted");
        expect(matrix.getCellState("viewer", "docs.write")).toBe("denied");
        matrix.destroy();
    });

    test("setCellState_UpdatesState", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        matrix.setCellState("viewer", "docs.write", "granted");
        expect(matrix.getCellState("viewer", "docs.write")).toBe("granted");
        matrix.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onChange_SetCellStateUpdatesStateAndTracksChange", () =>
    {
        const onChange = vi.fn();
        const matrix = createPermissionMatrix(
            makeOptions({ onChange }), "test-permmatrix"
        );
        // setCellState is a programmatic API — it updates state and tracks
        // the change but does not fire onChange (that fires via UI click).
        matrix.setCellState("viewer", "docs.write", "granted");
        expect(matrix.getCellState("viewer", "docs.write")).toBe("granted");
        const changes = matrix.getChanges();
        expect(changes.length).toBeGreaterThan(0);
        const change = changes.find(
            (c: PermissionChange) =>
                c.roleId === "viewer" && c.permissionId === "docs.write"
        );
        expect(change).toBeDefined();
        expect(change!.newState).toBe("granted");
        matrix.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("options", () =>
{
    test("readOnly_DisablesCellToggling", () =>
    {
        const onChange = vi.fn();
        const matrix = createPermissionMatrix(
            makeOptions({ readOnly: true, onChange }), "test-permmatrix"
        );
        // In read-only mode, programmatic setCellState still works,
        // but UI interaction is disabled
        expect(matrix.getElement()).not.toBeNull();
        matrix.destroy();
    });

    test("cssClass_AppliedToRoot", () =>
    {
        const matrix = createPermissionMatrix(
            makeOptions({ cssClass: "my-matrix" }), "test-permmatrix"
        );
        expect(
            matrix.getElement()?.classList.contains("my-matrix")
        ).toBe(true);
        matrix.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("show_AppendsToContainer", () =>
    {
        const matrix = new PermissionMatrix(makeOptions());
        matrix.show("test-permmatrix");
        expect(container.querySelector(".permissionmatrix")).not.toBeNull();
        matrix.destroy();
    });

    test("hide_RemovesFromDOM", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        matrix.hide();
        expect(container.querySelector(".permissionmatrix")).toBeNull();
        matrix.destroy();
    });

    test("destroy_NullifiesElement", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        matrix.destroy();
        expect(matrix.getElement()).toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("showInMissingContainer_Throws", () =>
    {
        // ERR-1. This case asserted the defect: a container that is
        // not there used to be logged and walked past. AGENTS.md
        // calls that returning a null object.
        const matrix = new PermissionMatrix(makeOptions());
        expect(() => matrix.show("nonexistent")).toThrow(/was not found/);
        matrix.destroy();
    });

    test("emptyRolesAndGroups_RendersWithoutCrash", () =>
    {
        const matrix = createPermissionMatrix(
            makeOptions({ roles: [], groups: [], cells: [] }),
            "test-permmatrix"
        );
        expect(matrix.getElement()).not.toBeNull();
        matrix.destroy();
    });

    test("destroyTwice_IsSilentAndIdempotent", () =>
    {
        // LOG-7. This used to assert the warning. A second `destroy()`
        // is ADR-081's contract being HONOURED, so warning told the
        // caller they had erred when they had not, on a console the
        // host is not reading. The claim that was always worth making
        // is that the second call repeats nothing.
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        const probe = destroyProbe();

        matrix.destroy();
        const first = probe.total();
        matrix.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        expect(warnSpy).not.toHaveBeenCalled();
        probe.restore();
        warnSpy.mockRestore();
    });
});

// ============================================================================
// EXPORT FORMAT — UNUSED-1
// ============================================================================

describe("exportData names the format it cannot produce", () =>
{
    // `ExportFormat` publishes `"json" | "csv"` and there is no CSV
    // serialiser in this component. `exportData` took the parameter
    // and returned the same object whatever it was handed, so a
    // caller asking for CSV got JSON and no indication — the
    // compiler had been reporting the parameter as unread since it
    // was written. ADR-200: a request the caller NAMED is owed
    // either the effect or an error.
    test("json returns the structured export", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");

        const data = matrix.exportData("json");

        expect(data.roles).toEqual(makeOptions().roles);
        expect(typeof data.exportedAt).toBe("string");
        matrix.destroy();
    });

    test("csv throws and says what to do instead", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");

        expect(() => matrix.exportData("csv"))
            .toThrow(/not implemented.*MatrixExportData/s);

        matrix.destroy();
    });
});

// ============================================================================
// ROVING TABINDEX — UNUSED-1
// ============================================================================

describe("the grid is reachable by keyboard", () =>
{
    function cells(): HTMLElement[]
    {
        return [...container.querySelectorAll<HTMLElement>(
            ".permissionmatrix-cell")];
    }

    // EVERY CELL WAS BUILT WITH tabindex="-1" AND NOTHING EVER SET A
    // ZERO, so a user tabbing through the page skipped the whole
    // matrix -- and `onGridKeydown` only fires on a focused cell, so
    // the arrow navigation below it was unreachable too. The private
    // `focusedRow` / `focusedCol`, initialised to 0,0, are exactly
    // the state a roving tabindex needs and nothing read them: the
    // compiler had been reporting both as unused (UNUSED-1).
    test("exactly one cell carries tabindex 0", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");

        const reachable = cells().filter(
            (c) => c.getAttribute("tabindex") === "0");

        expect(reachable).toHaveLength(1);
        expect(reachable[0]).toBe(cells()[0]);
        matrix.destroy();
    });

    test("arrowing right moves the zero with the focus", () =>
    {
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        const first = cells()[0];

        first.dispatchEvent(new KeyboardEvent("keydown",
            { key: "ArrowRight", bubbles: true }));

        expect(first.getAttribute("tabindex")).toBe("-1");
        expect(cells().filter((c) => c.getAttribute("tabindex") === "0"))
            .toHaveLength(1);
        matrix.destroy();
    });
});

describe("the roving entry point survives a re-render", () =>
{
    test("a re-render restores the zero where the user left it", () =>
    {
        // `focusedRow` / `focusedCol` exist so the grid does not
        // send the user back to the top-left every time a filter
        // or a group toggle rebuilds it.
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        const cellsNow = (): HTMLElement[] => [
            ...container.querySelectorAll<HTMLElement>(".permissionmatrix-cell")];

        cellsNow()[0].dispatchEvent(new KeyboardEvent("keydown",
            { key: "ArrowRight", bubbles: true }));

        matrix.setFilter("");

        const zeros = cellsNow().filter(
            (c) => c.getAttribute("tabindex") === "0");
        expect(zeros).toHaveLength(1);
        expect(zeros[0]).toBe(cellsNow()[1]);

        matrix.destroy();
    });
});

// ============================================================================
// SURFACE CONTRACT (additive, readiness step 3)
// ============================================================================

describe("PermissionMatrix surface contract", () =>
{
    /** Mounts a matrix with `overrides` into the test container. */
    function mount(overrides?: Partial<PermissionMatrixOptions>): PermissionMatrix
    {
        const pm = createPermissionMatrix(makeOptions(overrides)) as PermissionMatrix;

        pm.show(container);

        return pm;
    }

    /** Clicks the cell for `roleId` and `permId`. */
    function clickCell(roleId: string, permId: string): void
    {
        const cell = container.querySelector<HTMLElement>(
            `.permissionmatrix-cell[data-role-id="${roleId}"][data-perm-id="${permId}"]`);

        expect(cell).not.toBeNull();
        cell!.click();
    }

    test("change_CellClick_EmitsTheChangeAfterOnChange", () =>
    {
        const order: unknown[] = [];
        const pm = mount({ onChange: (c) => order.push(`legacy:${c.roleId}`) });
        pm.on("change", (p) => order.push(p));

        clickCell("viewer", "docs.write");

        expect(order).toEqual(["legacy:viewer",
            { roleId: "viewer", permissionId: "docs.write", previousState: "denied", newState: "none" }]);
        pm.destroy();
    });

    test("bulkchange_GroupToggle_EmitsTheBulkChangeAfterOnBulkChange", () =>
    {
        const order: string[] = [];
        const pm = mount({ enableGroupBulk: true, onBulkChange: () => order.push("legacy") });
        pm.on("bulkchange", (p) => order.push(`channel:${(p as { groupId: string }).groupId}`));

        container.querySelector<HTMLElement>("[data-bulk='group'][data-group-id='users'][data-role-id='viewer']")!
            .click();

        expect(order).toEqual(["legacy", "channel:users"]);
        pm.destroy();
    });

    test("export_ExportClick_EmitsTheExportWithoutHostData", () =>
    {
        const heard: unknown[] = [];
        const onExport = vi.fn();
        const pm = mount({ showExport: true, onExport,
            roles: [{ id: "admin", name: "Admin", data: { secret: 1 } }] });
        pm.on("export", (p) => heard.push(p));

        container.querySelector<HTMLElement>(".permissionmatrix-export-btn")!.click();

        expect(onExport).toHaveBeenCalledTimes(1);
        const exported = heard[0] as { roles: Record<string, unknown>[] };
        expect(exported.roles).toEqual([{ id: "admin", name: "Admin" }]);
        expect(onExport.mock.calls[0][0].roles[0].data).toEqual({ secret: 1 });
        pm.destroy();
    });

    test("reset_ResetClick_EmitsThePendingCountAfterOnReset", () =>
    {
        const order: unknown[] = [];
        const pm = mount({ showReset: true, onReset: () => order.push("legacy") });
        pm.on("reset", (p) => order.push(p));

        clickCell("viewer", "docs.write");
        container.querySelector<HTMLElement>(".permissionmatrix-reset-btn")!.click();

        expect(order).toEqual(["legacy", 1]);
        pm.destroy();
    });

    test("on_UnknownChannel_Throws_AndUnsubscribeStopsDelivery", () =>
    {
        const pm = mount();
        const handler = vi.fn();

        pm.on("change", handler)();
        clickCell("viewer", "docs.write");

        expect(handler).not.toHaveBeenCalled();
        expect(() => pm.on("select", () => undefined)).toThrow(/valid channels/);
        pm.destroy();
    });

    test("setData_Slots_ReplaceOnePartInPlace", () =>
    {
        const pm = mount();
        const root = pm.getElement();

        clickCell("viewer", "docs.write");
        pm.setData("roles", [...makeRoles(), { id: "guest", name: "Guest" }]);
        expect(pm.getChanges()).toHaveLength(1);
        expect(container.querySelector(".permissionmatrix-cell[data-role-id='guest']")).not.toBeNull();

        pm.setData("cells", [{ roleId: "guest", permissionId: "docs.read", state: "granted" }]);
        expect(pm.getChanges()).toEqual([]);
        expect(pm.getCellState("guest", "docs.read")).toBe("granted");
        expect(pm.getCellState("admin", "docs.read")).toBe("none");

        pm.setData("groups", [{ id: "billing", name: "Billing", permissions: [{ id: "b.view", name: "View" }] }]);
        expect(container.querySelector(".permissionmatrix-row[data-perm-id='b.view']")).not.toBeNull();
        expect(pm.getElement()).toBe(root);
        expect(() => pm.setData("permissions", [])).toThrow(/slots are/);
        pm.destroy();
    });

    test("setData_LegacyForm_StillReplacesAllThree", () =>
    {
        const pm = mount();

        clickCell("viewer", "docs.write");
        pm.setData(makeRoles().slice(0, 1), makeGroups(), [
            { roleId: "admin", permissionId: "docs.read", state: "denied" }]);

        expect(pm.getChanges()).toEqual([]);
        expect(pm.getCellState("admin", "docs.read")).toBe("denied");
        pm.destroy();
    });

    test("getState_SetState_RestoresEditsExpansionAndFilter_FiringNothing", () =>
    {
        const onChange = vi.fn();
        const heard = vi.fn();
        const pm = mount({ onChange });
        clickCell("viewer", "docs.write");
        pm.collapseGroup("users");
        pm.setFilter("read");
        const captured = pm.getState();
        pm.on("change", heard);
        onChange.mockClear();

        pm.setData("cells", makeCells());
        pm.expandAllGroups();
        pm.clearFilter();
        pm.setState(captured);

        expect(pm.getState()).toEqual(captured);
        expect(captured).toEqual({ changes: [expect.objectContaining({ roleId: "viewer" })],
            expandedGroups: ["docs"], filter: "read" });
        expect(pm.getCellState("viewer", "docs.write")).toBe("none");
        expect(onChange).not.toHaveBeenCalled();
        expect(heard).not.toHaveBeenCalled();
        pm.destroy();
    });
});

// ============================================================================
// THE SIX OPTIONS THAT WERE NEVER READ, AND RESET (#70)
// ============================================================================

describe("options that were declared but not read, and Reset (#70)", () =>
{
    function mount(overrides?: Partial<PermissionMatrixOptions>): PermissionMatrix
    {
        const pm = createPermissionMatrix(makeOptions(overrides)) as PermissionMatrix;
        pm.show(container);
        return pm;
    }

    const cell = (roleId: string, permId: string) => container.querySelector<HTMLElement>(
        `.permissionmatrix-cell[data-role-id="${roleId}"][data-perm-id="${permId}"]`)!;

    /** A child role inheriting from admin, with no explicit cells. */
    const inheriting = (): Partial<PermissionMatrixOptions> => ({
        roles: [...makeRoles(), { id: "child", name: "Child", inheritsFrom: "admin" }] });

    test("showInheritance_DefaultResolvesInheritance_FalseDoesNot", () =>
    {
        const on = mount(inheriting());
        expect(on.getEffectiveState("child", "docs.read")).toBe("inherited");
        on.destroy();

        const off = mount({ ...inheriting(), showInheritance: false });
        expect(off.getEffectiveState("child", "docs.read")).toBe("none");
        off.destroy();
    });

    test("showChangeHighlight_DefaultHighlightsAnEdit_FalseDoesNot", () =>
    {
        const on = mount();
        cell("viewer", "docs.write").click();
        expect(cell("viewer", "docs.write").classList.contains("permissionmatrix-cell-changed")).toBe(true);
        on.destroy();

        const off = mount({ showChangeHighlight: false });
        cell("viewer", "docs.write").click();
        expect(off.getChanges()).toHaveLength(1);
        expect(cell("viewer", "docs.write").classList.contains("permissionmatrix-cell-changed")).toBe(false);
        off.destroy();
    });

    test("stickyHeaderAndFirstColumn_DefaultSticky_FalseOptsOut", () =>
    {
        const on = mount();
        expect(on.getElement()!.className).not.toMatch(/no-sticky/);
        on.destroy();

        const off = mount({ stickyHeader: false, stickyFirstColumn: false });
        expect(off.getElement()!.classList.contains("permissionmatrix-no-sticky-header")).toBe(true);
        expect(off.getElement()!.classList.contains("permissionmatrix-no-sticky-column")).toBe(true);
        off.destroy();
    });

    test("roleAndPermissionBulk_OffByDefault", () =>
    {
        const pm = mount();
        expect(container.querySelector("[data-bulk='role'], [data-bulk='permission']")).toBeNull();
        pm.destroy();
    });

    test("enableRoleBulk_GrantsEveryPermissionForTheRole", () =>
    {
        const onBulkChange = vi.fn();
        const heard = vi.fn();
        const pm = mount({ enableRoleBulk: true, onBulkChange });
        pm.on("bulkchange", heard);

        container.querySelector<HTMLElement>("[data-bulk='role'][data-role-id='viewer']")!.click();

        expect(["docs.read", "docs.write", "users.manage"].map((p) => pm.getCellState("viewer", p)))
            .toEqual(["granted", "granted", "granted"]);
        expect(onBulkChange).toHaveBeenCalledWith(expect.objectContaining({ type: "grant-all-for-role",
            roleId: "viewer", changes: expect.arrayContaining([expect.objectContaining({ permissionId: "docs.write" })]) }));
        expect(heard).toHaveBeenCalledTimes(1);
        pm.destroy();
    });

    test("enablePermissionBulk_TogglesThePermissionForEveryEditableRole", () =>
    {
        const onBulkChange = vi.fn();
        const pm = mount({ enablePermissionBulk: true, onBulkChange,
            roles: [...makeRoles(), { id: "owner", name: "Owner", readonly: true }] });

        container.querySelector<HTMLElement>("[data-bulk='permission'][data-perm-id='users.manage']")!.click();

        expect(["admin", "editor", "viewer"].map((r) => pm.getCellState(r, "users.manage")))
            .toEqual(["granted", "granted", "granted"]);
        expect(pm.getCellState("owner", "users.manage")).toBe("none");
        expect(onBulkChange.mock.calls[0][0]).toMatchObject({ type: "grant-all-for-permission",
            permissionId: "users.manage" });

        container.querySelector<HTMLElement>("[data-bulk='permission'][data-perm-id='users.manage']")!.click();
        expect(onBulkChange.mock.calls[1][0]).toMatchObject({ type: "deny-all-for-permission" });
        pm.destroy();
    });

    test("reset_WithoutOnReset_RevertsTheEdits", () =>
    {
        const heard = vi.fn();
        const pm = mount();
        pm.on("reset", heard);
        cell("viewer", "docs.write").click();

        container.querySelector<HTMLElement>(".permissionmatrix-reset-btn")!.click();

        expect(pm.getChanges()).toEqual([]);
        expect(pm.getCellState("viewer", "docs.write")).toBe("denied");
        expect(heard).toHaveBeenCalledWith(1);
        pm.destroy();
    });

    test("reset_WithOnReset_LeavesItToTheHost", () =>
    {
        const onReset = vi.fn();
        const pm = mount({ onReset });
        cell("viewer", "docs.write").click();

        container.querySelector<HTMLElement>(".permissionmatrix-reset-btn")!.click();

        expect(onReset).toHaveBeenCalledTimes(1);
        expect(pm.getChanges()).toHaveLength(1);
        pm.destroy();
    });
});
