/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: AuditLogViewer
 * Vitest unit tests for the AuditLogViewer component.
 * Covers: factory, options, DOM structure, ARIA, handle methods,
 * entries API, filtering, pagination, export, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import
{
    AuditLogViewer,
    createAuditLogViewer,
} from "./auditlogviewer";
import type
{
    AuditLogViewerOptions,
    AuditLogEntry,
} from "./auditlogviewer";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeEntry(overrides?: Partial<AuditLogEntry>): AuditLogEntry
{
    return {
        id: "entry-" + Math.random().toString(36).slice(2, 6),
        timestamp: new Date(),
        actor: "admin@example.com",
        action: "user.login",
        resource: "session-123",
        severity: "info",
        ...overrides,
    };
}

function makeOptions(
    overrides?: Partial<AuditLogViewerOptions>
): AuditLogViewerOptions
{
    return {
        entries: [
            makeEntry({ id: "e1" }),
            makeEntry({ id: "e2" }),
            makeEntry({ id: "e3" }),
        ],
        pageSize: 10,
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-auditlog";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createAuditLogViewer
// ============================================================================

describe("createAuditLogViewer", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        expect(container.querySelector(".auditlog")).not.toBeNull();
        viewer.destroy();
    });

    test("withoutContainerId_ReturnsUnmountedInstance", () =>
    {
        const viewer = createAuditLogViewer(makeOptions());
        expect(container.querySelector(".auditlog")).toBeNull();
        expect(viewer.getElement()).not.toBeNull();
        viewer.destroy();
    });

    test("returnsAuditLogViewerInstance", () =>
    {
        const viewer = createAuditLogViewer(makeOptions());
        expect(viewer).toBeInstanceOf(AuditLogViewer);
        viewer.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rootElement_HasAuditlogClass", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        expect(container.querySelector(".auditlog")).not.toBeNull();
        viewer.destroy();
    });

    test("rendersTableRows", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const rows = container.querySelectorAll(".auditlog-row");
        expect(rows.length).toBe(3);
        viewer.destroy();
    });

    test("showSeverity_RendersSeverityBadges", () =>
    {
        const viewer = createAuditLogViewer(
            makeOptions({ showSeverity: true }), "test-auditlog"
        );
        const badges = container.querySelectorAll(
            ".auditlog-severity-badge"
        );
        expect(badges.length).toBeGreaterThan(0);
        viewer.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("tableHasGridRole", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const table = container.querySelector("[role='grid']");
        expect(table).not.toBeNull();
        viewer.destroy();
    });

    test("liveRegionExists", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const live = container.querySelector("[aria-live]");
        expect(live).not.toBeNull();
        viewer.destroy();
    });
});

// ============================================================================
// PUBLIC API — setEntries / addEntry / getEntries
// ============================================================================

describe("entries API", () =>
{
    test("setEntries_ReplacesAllEntries", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const newEntries = [makeEntry({ id: "new-1" })];
        viewer.setEntries(newEntries);
        expect(viewer.getEntries().length).toBe(1);
        viewer.destroy();
    });

    test("addEntry_InsertsAtTop", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const entry = makeEntry({ id: "added-1", actor: "new-user" });
        viewer.addEntry(entry);
        const entries = viewer.getEntries();
        expect(entries[0].id).toBe("added-1");
        viewer.destroy();
    });

    test("getEntries_ReturnsDefensiveCopy", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const entries = viewer.getEntries();
        entries.pop();
        expect(viewer.getEntries().length).toBe(3);
        viewer.destroy();
    });
});

// ============================================================================
// PUBLIC API — FILTERS
// ============================================================================

describe("filters", () =>
{
    test("setFilters_UpdatesFilterState", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");

        // "filter state is internal" was the reason given for asserting
        // nothing, and getFilters() has been on the handle all along.
        expect(viewer.getFilters()).toEqual({});

        viewer.setFilters({ actor: "admin@example.com" });

        expect(viewer.getFilters()).toEqual({ actor: "admin@example.com" });
        expect(container.querySelectorAll(".auditlog-chip")).toHaveLength(1);

        viewer.destroy();
    });

    test("clearFilters_ResetsFilters", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const rows = (): number => container.querySelectorAll(".auditlog-row").length;
        const all = rows();

        viewer.setFilters({ actor: "nobody@example.com" });
        expect(rows()).toBeLessThan(all);

        viewer.clearFilters();

        // The comment this replaces already said it: "After clearing,
        // all entries should be visible."
        expect(viewer.getFilters()).toEqual({});
        expect(rows()).toBe(all);
        expect(container.querySelectorAll(".auditlog-chip")).toHaveLength(0);

        viewer.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("show_AppendsToContainer", () =>
    {
        const viewer = new AuditLogViewer(makeOptions());
        viewer.show("test-auditlog");
        expect(container.querySelector(".auditlog")).not.toBeNull();
        viewer.destroy();
    });

    test("hide_RemovesFromDOM", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        viewer.hide();
        expect(container.querySelector(".auditlog")).toBeNull();
        viewer.destroy();
    });

    test("destroy_NullifiesElement", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        viewer.destroy();
        expect(viewer.getElement()).toBeNull();
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
        const viewer = new AuditLogViewer(makeOptions());
        expect(() => viewer.show("nonexistent")).toThrow(/was not found/);
        viewer.destroy();
    });

    test("emptyEntries_ShowsEmptyState", () =>
    {
        const viewer = createAuditLogViewer(
            makeOptions({ entries: [] }), "test-auditlog"
        );
        // Viewer should not crash with no entries
        expect(viewer.getElement()).not.toBeNull();
        viewer.destroy();
    });

    test("destroyTwice_IsSilentAndIdempotent", () =>
    {
        // LOG-7. This used to assert the warning. A second `destroy()`
        // is ADR-081's contract being HONOURED, so warning told the
        // caller they had erred when they had not, on a console the
        // host is not reading. The claim that was always worth making
        // is that the second call repeats nothing.
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const probe = destroyProbe();

        viewer.destroy();
        const first = probe.total();
        viewer.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        expect(warnSpy).not.toHaveBeenCalled();
        probe.restore();
        warnSpy.mockRestore();
    });
});

// ============================================================================
// SURFACE CONTRACT (B6)
// ============================================================================

describe("surface contract (B6)", () =>
{
    const STAMP = new Date("2026-03-01T10:00:00.000Z");

    function richEntry(): AuditLogEntry
    {
        return makeEntry({
            id: "rich",
            timestamp: STAMP,
            actorId: "u-1",
            resourceType: "session",
            ipAddress: "10.0.0.1",
            severity: "warning",
            detail: { before: 1, after: new Date() },
            metadata: { trace: Symbol.for("not-json") as unknown as string },
        });
    }

    function rowOf(viewer: { getElement(): HTMLElement | null }, id: string): HTMLElement
    {
        return viewer.getElement()!.querySelector(`[data-entry-id="${id}"]`) as HTMLElement;
    }

    const EXPECTED = {
        id: "rich",
        timestamp: "2026-03-01T10:00:00.000Z",
        actor: "admin@example.com",
        action: "user.login",
        resource: "session-123",
        actorId: "u-1",
        resourceType: "session",
        ipAddress: "10.0.0.1",
        severity: "warning",
    };

    test("on_RowClick_DeliversEntryWithoutDetailAndMetadata", () =>
    {
        const viewer = createAuditLogViewer(makeOptions({ entries: [richEntry()] }), "test-auditlog");
        const heard = vi.fn();
        viewer.on("rowClick", heard);

        rowOf(viewer, "rich").click();

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith(EXPECTED);
        viewer.destroy();
    });

    test("on_RowClick_PayloadSurvivesJsonRoundTrip", () =>
    {
        const viewer = createAuditLogViewer(makeOptions({ entries: [richEntry()] }), "test-auditlog");
        let payload: unknown;
        viewer.on("rowClick", (p) => { payload = p; });

        rowOf(viewer, "rich").click();

        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        viewer.destroy();
    });

    test("on_RowClick_PayloadIsACopy_MutatingItDoesNotTouchTheEntry", () =>
    {
        const viewer = createAuditLogViewer(makeOptions({ entries: [richEntry()] }), "test-auditlog");
        viewer.on("rowClick", (p) => { (p as Record<string, unknown>).actor = "mutated"; });

        rowOf(viewer, "rich").click();

        expect(viewer.getEntries()[0].actor).toBe("admin@example.com");
        viewer.destroy();
    });

    test("on_RowClick_FiresAfterOnRowClick_ExactlyOnce", () =>
    {
        const order: string[] = [];
        const viewer = createAuditLogViewer(
            makeOptions({ entries: [richEntry()], onRowClick: (e) => order.push(`option:${e.id}`) }),
            "test-auditlog"
        );
        viewer.on("rowClick", (p) => order.push(`channel:${(p as { id: string }).id}`));

        rowOf(viewer, "rich").click();

        expect(order).toEqual(["option:rich", "channel:rich"]);
        viewer.destroy();
    });

    test("on_RowClick_FiresWithoutOnRowClick", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const heard = vi.fn();
        viewer.on("rowClick", heard);

        rowOf(viewer, "e2").click();

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard.mock.calls[0][0]).toMatchObject({ id: "e2" });
        viewer.destroy();
    });

    test("on_RowClick_FiresOnEnterKey", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const heard = vi.fn();
        viewer.on("rowClick", heard);

        const table = viewer.getElement()!.querySelector(".auditlog-table-body") as HTMLElement;
        table.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        expect(heard).toHaveBeenCalledTimes(1);
        viewer.destroy();
    });

    test("on_RowClick_UnsubscribeStopsDelivery", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const heard = vi.fn();
        const off = viewer.on("rowClick", heard);

        rowOf(viewer, "e1").click();
        off();
        rowOf(viewer, "e1").click();

        expect(heard).toHaveBeenCalledTimes(1);
        viewer.destroy();
    });

    test("on_RowClick_ThrowingHandler_DoesNotStopOthers", () =>
    {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const second = vi.fn();
        viewer.on("rowClick", () => { throw new Error("boom"); });
        viewer.on("rowClick", second);

        rowOf(viewer, "e1").click();

        expect(second).toHaveBeenCalledTimes(1);
        errSpy.mockRestore();
        viewer.destroy();
    });

    test("destroy_ClearsHandlers", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");
        const heard = vi.fn();
        viewer.on("rowClick", heard);
        const row = rowOf(viewer, "e1");

        viewer.destroy();
        row.click();

        expect(heard).not.toHaveBeenCalled();
    });

    test("on_UnknownChannel_Throws_NamingValidChannels", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");

        expect(() => viewer.on("bogus", () => undefined)).toThrow(/rowClick/);
        viewer.destroy();
    });

    test("setData_Throws_NamingTheSetters", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");

        expect(() => viewer.setData("entries", [])).toThrow(/AuditLogViewer.*no data slots.*setEntries/);
        viewer.destroy();
    });

    test("getState_ReturnsEmptyObject_SetStateDoesNothing", () =>
    {
        const viewer = createAuditLogViewer(makeOptions(), "test-auditlog");

        expect(viewer.getState()).toEqual({});
        viewer.setState({ page: 3 });
        expect(viewer.getState()).toEqual({});
        expect(viewer.getPage()).toBe(1);
        viewer.destroy();
    });
});
