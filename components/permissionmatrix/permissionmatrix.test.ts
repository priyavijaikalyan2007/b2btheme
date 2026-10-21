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

    test("destroyTwice_LogsWarning", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const matrix = createPermissionMatrix(makeOptions(), "test-permmatrix");
        matrix.destroy();
        matrix.destroy();
        expect(warnSpy).toHaveBeenCalled();
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
