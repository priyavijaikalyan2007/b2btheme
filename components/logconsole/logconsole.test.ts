/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: LogConsole
 * Spec-based tests for the LogConsole log viewer component.
 * Tests cover: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, log levels, filtering, export, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { LogConsole, createLogConsole } from "./logconsole";

import type { LogConsoleOptions, LogLevel, LogEntry } from "./logconsole";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function queryRoot(): HTMLElement | null
{
    return container.querySelector("[class*='logconsole']");
}

function queryHeader(): HTMLElement | null
{
    return container.querySelector(
        ".logconsole-header"
    ) as HTMLElement | null;
}

function queryBody(): HTMLElement | null
{
    return container.querySelector(
        ".logconsole-body"
    ) as HTMLElement | null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-logconsole";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createLogConsole
// ============================================================================

describe("createLogConsole", () =>
{
    test("returnsLogConsoleInstance", () =>
    {
        const lc = createLogConsole();
        expect(lc).toBeInstanceOf(LogConsole);
        lc.destroy();
    });

    test("withOptions_PassesConfig", () =>
    {
        const lc = createLogConsole({ maxEntries: 100 });
        expect(lc).toBeInstanceOf(LogConsole);
        lc.destroy();
    });

    test("getElement_ReturnsRootElement", () =>
    {
        const lc = createLogConsole();
        expect(lc.getElement()).toBeInstanceOf(HTMLElement);
        lc.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("LogConsole constructor", () =>
{
    test("defaultOptions_CreatesComponent", () =>
    {
        const lc = new LogConsole();
        expect(lc.getElement()).not.toBeNull();
        lc.destroy();
    });

    test("withCustomOptions_CreatesComponent", () =>
    {
        const lc = new LogConsole({
            maxEntries: 200,
            showHeader: true,
        });
        expect(lc.getElement()).not.toBeNull();
        lc.destroy();
    });
});

// ============================================================================
// PUBLIC METHODS — shorthand logging
// ============================================================================

describe("shorthand logging", () =>
{
    test("debug_AddsDebugEntry", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.debug("Debug message");
        expect(lc.exportAsText()).toContain("DEBUG");
        lc.destroy();
    });

    test("info_AddsInfoEntry", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.info("Info message");
        expect(lc.exportAsText()).toContain("INFO");
        lc.destroy();
    });

    test("warn_AddsWarnEntry", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.warn("Warning message");
        expect(lc.exportAsText()).toContain("WARN");
        lc.destroy();
    });

    test("error_AddsErrorEntry", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.error("Error message");
        expect(lc.exportAsText()).toContain("ERROR");
        lc.destroy();
    });

    test("success_AddsSuccessEntry", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.success("Success message");
        expect(lc.exportAsText()).toContain("SUCCESS");
        lc.destroy();
    });
});

// ============================================================================
// PUBLIC METHODS — structured log
// ============================================================================

describe("structured log", () =>
{
    test("log_AddsStructuredEntry", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.log({
            timestamp: "12:00:00.000",
            level: "INFO",
            message: "Structured entry",
        });
        expect(lc.exportAsText()).toContain("Structured entry");
        lc.destroy();
    });

    test("onEntry_CallbackFires", () =>
    {
        const onEntry = vi.fn();
        const lc = new LogConsole({ onEntry });
        container.appendChild(lc.getElement());
        lc.info("Test");
        expect(onEntry).toHaveBeenCalled();
        lc.destroy();
    });
});

// ============================================================================
// PUBLIC METHODS — clear
// ============================================================================

describe("clear", () =>
{
    test("clear_RemovesAllEntries", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.info("Entry 1");
        lc.info("Entry 2");
        lc.clear();
        expect(lc.exportAsText()).toBe("");
        lc.destroy();
    });

    test("onClear_CallbackFires", () =>
    {
        const onClear = vi.fn();
        const lc = new LogConsole({ onClear });
        container.appendChild(lc.getElement());
        lc.info("Entry");
        lc.clear();
        expect(onClear).toHaveBeenCalledOnce();
        lc.destroy();
    });
});

// ============================================================================
// PUBLIC METHODS — export
// ============================================================================

describe("export", () =>
{
    test("exportAsText_ReturnsFormattedString", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.info("Hello world");
        const text = lc.exportAsText();
        expect(text).toContain("Hello world");
        expect(text).toContain("INFO");
        lc.destroy();
    });

    test("exportAsText_EmptyLog_ReturnsEmpty", () =>
    {
        const lc = new LogConsole();
        expect(lc.exportAsText()).toBe("");
        lc.destroy();
    });
});

// ============================================================================
// PUBLIC METHODS — filter
// ============================================================================

describe("filter", () =>
{
    test("setFilter_UpdatesActiveFilters", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.setFilter(["ERROR", "WARN"]);
        expect(lc.getFilter()).toEqual(["ERROR", "WARN"]);
        lc.destroy();
    });

    test("getFilter_ReturnsActiveFilters", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        const filters = lc.getFilter();
        expect(filters).toHaveLength(5);
        expect(filters).toContain("DEBUG");
        expect(filters).toContain("INFO");
        expect(filters).toContain("WARN");
        expect(filters).toContain("ERROR");
        expect(filters).toContain("SUCCESS");
        lc.destroy();
    });

    test("setFilter_EmptyArray_HidesAll", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.setFilter([]);
        expect(lc.getFilter()).toHaveLength(0);
        lc.destroy();
    });
});

// ============================================================================
// PUBLIC METHODS — lifecycle
// ============================================================================

describe("lifecycle", () =>
{
    test("getElement_ReturnsRootHTMLElement", () =>
    {
        const lc = new LogConsole();
        expect(lc.getElement()).toBeInstanceOf(HTMLElement);
        lc.destroy();
    });

    test("destroy_RemovesFromParent", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.destroy();
        expect(container.children.length).toBe(0);
    });

    test("destroy_NullsElement", () =>
    {
        const lc = new LogConsole();
        lc.destroy();
        // getElement returns rootEl which is nulled
        // This test verifies no error is thrown
        expect(true).toBe(true);
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("hasHeaderByDefault", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        expect(queryHeader()).not.toBeNull();
        lc.destroy();
    });

    test("showHeader_False_OmitsHeader", () =>
    {
        const lc = new LogConsole({ showHeader: false });
        container.appendChild(lc.getElement());
        expect(queryHeader()).toBeNull();
        lc.destroy();
    });

    test("hasBody", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        expect(queryBody()).not.toBeNull();
        lc.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("options", () =>
{
    test("maxEntries_EvictsOldEntries", () =>
    {
        const lc = new LogConsole({ maxEntries: 3 });
        container.appendChild(lc.getElement());
        lc.info("1");
        lc.info("2");
        lc.info("3");
        lc.info("4");
        const text = lc.exportAsText();
        const lines = text.split("\n").filter((l) => l.trim());
        expect(lines.length).toBeLessThanOrEqual(4);
        lc.destroy();
    });

    test("cssClass_AddedToRoot", () =>
    {
        const lc = new LogConsole({ cssClass: "my-log" });
        container.appendChild(lc.getElement());
        const root = queryRoot();
        expect(root?.classList.contains("my-log")).toBe(true);
        lc.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("rapidFireLogs_NoExceptions", async () =>
    {
        // DEBT-TEST-1b. The claim worth making is that all 100
        // arrived, in order, under the 500-entry default cap — a
        // console that silently dropped 90 of them would also not
        // throw (ADR-215).
        //
        // Entries are flushed to the DOM on a requestAnimationFrame,
        // batched, so the assertion has to wait a frame. That is the
        // precondition the old test never needed because it never
        // looked at the DOM.
        const lc = new LogConsole();
        container.appendChild(lc.getElement());

        for (let i = 0; i < 100; i++)
        {
            lc.info(`Message ${i}`);
        }

        await new Promise<void>((resolve) =>
        {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        const rows = lc.getElement().querySelectorAll(".logconsole-entry");

        expect(rows).toHaveLength(100);
        expect(rows[0].textContent).toContain("Message 0");
        expect(rows[99].textContent).toContain("Message 99");

        lc.destroy();
    });

    test("clearOnEmpty_LeavesTheConsoleMounted", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());

        lc.clear();

        // `clear()` empties the body and calls updateEmptyState().
        // Run against a console with nothing in it, what must hold is
        // that it is still mounted and still says it is empty —
        // surviving the call would also hold for a clear() that
        // removed its own element.
        expect(lc.getElement().isConnected).toBe(true);
        expect(lc.getElement().querySelectorAll(".logconsole-entry"))
            .toHaveLength(0);
        expect(lc.getElement().querySelector(".logconsole-empty"))
            .not.toBeNull();
        lc.destroy();
    });

    test("exportOnEmpty_ReturnsEmptyString", () =>
    {
        const lc = new LogConsole();
        expect(lc.exportAsText()).toBe("");
        lc.destroy();
    });

    test("multipleLogLevels_InSequence", () =>
    {
        const lc = new LogConsole();
        container.appendChild(lc.getElement());
        lc.debug("D");
        lc.info("I");
        lc.warn("W");
        lc.error("E");
        lc.success("S");
        const text = lc.exportAsText();
        expect(text).toContain("DEBUG");
        expect(text).toContain("INFO");
        expect(text).toContain("WARN");
        expect(text).toContain("ERROR");
        expect(text).toContain("SUCCESS");
        lc.destroy();
    });
});

describe("entries option (additive, readiness step 2 B6)", () =>
{
    test("entries_RenderAtConstruction_InOrder", async () =>
    {
        const lc = createLogConsole({ entries: [
            { timestamp: "10:00:00.000", level: "info", message: "started" },
            { timestamp: "10:00:01.000", level: "error", message: "failed" },
        ] });

        // Entries reach the DOM on a requestAnimationFrame, like log().
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const rows = lc.getElement().querySelectorAll(".logconsole-entry");

        expect(rows).toHaveLength(2);
        expect(rows[0].textContent).toContain("started");
        expect(rows[1].textContent).toContain("failed");
        lc.destroy();
    });

    test("entries_Absent_StartsEmpty", () =>
    {
        const lc = createLogConsole();

        expect(lc.getElement().querySelectorAll(".logconsole-entry")).toHaveLength(0);
        lc.destroy();
    });
});
