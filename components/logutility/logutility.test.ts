/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: LogUtility
 * Spec-based tests for the centralised logging utility.
 * Tests cover: singleton creation, logger interface, level filtering,
 * timestamps, console output toggle, LogConsole routing, destroy, and
 * multiple-logger scenarios.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    createLogUtility,
    resetLogUtility,
} from "./logutility";
import type {
    LogUtility,
    Logger,
    LogConsoleHandle,
} from "./logutility";

// ============================================================================
// HELPERS
// ============================================================================

/** Create a mock LogConsoleHandle with vi.fn() stubs. */
function createMockLogConsole(): LogConsoleHandle
{
    return {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    resetLogUtility();

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
});

afterEach(() =>
{
    resetLogUtility();
    vi.restoreAllMocks();
});

// ============================================================================
// SINGLETON CREATION
// ============================================================================

describe("createLogUtility", () =>
{
    test("should create a LogUtility instance", () =>
    {
        const lu = createLogUtility();

        expect(lu).toBeDefined();
        expect(typeof lu.getLogger).toBe("function");
        expect(typeof lu.setLevel).toBe("function");
        expect(typeof lu.setLogConsole).toBe("function");
        expect(typeof lu.setConsoleOutput).toBe("function");
        expect(typeof lu.destroy).toBe("function");
    });

    test("should return the same singleton on repeated calls", () =>
    {
        const first = createLogUtility({ level: "info" });
        const second = createLogUtility({ level: "error" });

        expect(first).toBe(second);
    });

    test("should create a fresh instance after resetLogUtility", () =>
    {
        const first = createLogUtility();

        resetLogUtility();

        const second = createLogUtility();

        expect(first).not.toBe(second);
    });
});

// ============================================================================
// LOGGER INTERFACE
// ============================================================================

describe("getLogger", () =>
{
    test("should return a Logger with all expected methods", () =>
    {
        const lu = createLogUtility();
        const log = lu.getLogger("TestComponent");

        expect(typeof log.info).toBe("function");
        expect(typeof log.warn).toBe("function");
        expect(typeof log.error).toBe("function");
        expect(typeof log.debug).toBe("function");
        expect(typeof log.event).toBe("function");
    });

    test("should include component prefix in console output", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const log = lu.getLogger("MyWidget");

        log.info("started");

        expect(console.log).toHaveBeenCalledWith(
            "[INFO]",
            "[MyWidget]",
            "started"
        );
    });

    test("should support multiple loggers from the same utility", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const logA = lu.getLogger("CompA");
        const logB = lu.getLogger("CompB");

        logA.info("alpha");
        logB.info("beta");

        expect(console.log).toHaveBeenCalledWith(
            "[INFO]",
            "[CompA]",
            "alpha"
        );
        expect(console.log).toHaveBeenCalledWith(
            "[INFO]",
            "[CompB]",
            "beta"
        );
    });
});

// ============================================================================
// CONSOLE METHOD DISPATCH
// ============================================================================

describe("console method dispatch", () =>
{
    test("info should call console.log", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const log = lu.getLogger("X");

        log.info("msg");

        expect(console.log).toHaveBeenCalled();
    });

    test("warn should call console.warn", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const log = lu.getLogger("X");

        log.warn("msg");

        expect(console.warn).toHaveBeenCalledWith(
            "[WARN]",
            "[X]",
            "msg"
        );
    });

    test("error should call console.error", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const log = lu.getLogger("X");

        log.error("msg");

        expect(console.error).toHaveBeenCalledWith(
            "[ERROR]",
            "[X]",
            "msg"
        );
    });

    test("debug should call console.debug", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const log = lu.getLogger("X");

        log.debug("msg");

        expect(console.debug).toHaveBeenCalledWith(
            "[DEBUG]",
            "[X]",
            "msg"
        );
    });

    test("should pass multiple arguments through", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const log = lu.getLogger("Multi");
        const data = { key: "value" };

        log.info("context", data, 42);

        expect(console.log).toHaveBeenCalledWith(
            "[INFO]",
            "[Multi]",
            "context",
            data,
            42
        );
    });
});

// ============================================================================
// TIMESTAMPS
// ============================================================================

describe("timestamps", () =>
{
    test("should include ISO timestamp by default", () =>
    {
        const lu = createLogUtility();
        const log = lu.getLogger("TS");

        log.info("check");

        const callArgs = (console.log as ReturnType<typeof vi.fn>).mock.calls[0];

        // First argument should be an ISO date string.
        expect(typeof callArgs[0]).toBe("string");
        expect(callArgs[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(callArgs[1]).toBe("[INFO]");
    });

    test("should omit timestamp when timestamps is false", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const log = lu.getLogger("NoTS");

        log.info("check");

        const callArgs = (console.log as ReturnType<typeof vi.fn>).mock.calls[0];

        // First argument should be the level tag, not a timestamp.
        expect(callArgs[0]).toBe("[INFO]");
    });
});

// ============================================================================
// LEVEL FILTERING
// ============================================================================

describe("level filtering", () =>
{
    test("should output all levels when set to debug", () =>
    {
        const lu = createLogUtility({ level: "debug", timestamps: false });
        const log = lu.getLogger("All");

        log.debug("d");
        log.info("i");
        log.warn("w");
        log.error("e");

        expect(console.debug).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledTimes(1);
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledTimes(1);
    });

    test("should suppress debug when level is info", () =>
    {
        const lu = createLogUtility({ level: "info", timestamps: false });
        const log = lu.getLogger("InfoOnly");

        log.debug("suppressed");
        log.info("visible");

        expect(console.debug).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledTimes(1);
    });

    test("should suppress debug and info when level is warn", () =>
    {
        const lu = createLogUtility({ level: "warn", timestamps: false });
        const log = lu.getLogger("WarnOnly");

        log.debug("no");
        log.info("no");
        log.warn("yes");
        log.error("yes");

        expect(console.debug).not.toHaveBeenCalled();
        expect(console.log).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledTimes(1);
    });

    test("should suppress debug and info when level is error (warn always on)", () =>
    {
        const lu = createLogUtility({ level: "error", timestamps: false });
        const log = lu.getLogger("ErrOnly");

        log.debug("no");
        log.info("no");
        log.warn("always");
        log.error("yes");

        expect(console.debug).not.toHaveBeenCalled();
        expect(console.log).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledTimes(1);
    });

    test("errors are never filtered regardless of level", () =>
    {
        const lu = createLogUtility({ level: "error", timestamps: false });
        const log = lu.getLogger("Err");

        log.error("always visible");

        expect(console.error).toHaveBeenCalledTimes(1);
    });
});

// ============================================================================
// SET LEVEL (RUNTIME)
// ============================================================================

describe("setLevel", () =>
{
    test("should change filtering at runtime", () =>
    {
        const lu = createLogUtility({ level: "debug", timestamps: false });
        const log = lu.getLogger("Dynamic");

        log.debug("visible");

        expect(console.debug).toHaveBeenCalledTimes(1);

        lu.setLevel("warn");

        log.debug("suppressed");
        log.info("suppressed");

        expect(console.debug).toHaveBeenCalledTimes(1);
        expect(console.log).not.toHaveBeenCalled();
    });
});

// ============================================================================
// CONSOLE OUTPUT TOGGLE
// ============================================================================

describe("console output toggle", () =>
{
    test("should suppress all console output when disabled", () =>
    {
        const lu = createLogUtility({ consoleOutput: false, timestamps: false });
        const log = lu.getLogger("Silent");

        log.info("nope");
        log.warn("nope");
        log.error("nope");
        log.debug("nope");

        expect(console.log).not.toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
        expect(console.debug).not.toHaveBeenCalled();
    });

    test("setConsoleOutput should toggle output at runtime", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const log = lu.getLogger("Toggle");

        log.info("visible");

        expect(console.log).toHaveBeenCalledTimes(1);

        lu.setConsoleOutput(false);

        log.info("hidden");

        expect(console.log).toHaveBeenCalledTimes(1);

        lu.setConsoleOutput(true);

        log.info("visible again");

        expect(console.log).toHaveBeenCalledTimes(2);
    });
});

// ============================================================================
// LOG CONSOLE ROUTING
// ============================================================================

describe("LogConsole routing", () =>
{
    test("event should route to LogConsole when configured", () =>
    {
        const mockLC = createMockLogConsole();
        const lu = createLogUtility({ logConsole: mockLC, timestamps: false });
        const log = lu.getLogger("Routed");

        log.event("User clicked save");

        expect(mockLC.info).toHaveBeenCalledWith(
            "[Routed] User clicked save"
        );
    });

    test("event should also log to console", () =>
    {
        const mockLC = createMockLogConsole();
        const lu = createLogUtility({ logConsole: mockLC, timestamps: false });
        const log = lu.getLogger("Both");

        log.event("action taken");

        expect(console.log).toHaveBeenCalled();
        expect(mockLC.info).toHaveBeenCalled();
    });

    test("event should include data in console output", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const log = lu.getLogger("Data");
        const payload = { userId: 42 };

        log.event("login", payload);

        expect(console.log).toHaveBeenCalledWith(
            "[INFO]",
            "[Data]",
            "login",
            payload
        );
    });

    test("event should not fail when no LogConsole is configured", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const log = lu.getLogger("NoLC");

        expect(() => log.event("safe")).not.toThrow();
        expect(console.log).toHaveBeenCalled();
    });

    test("setLogConsole should attach a LogConsole at runtime", () =>
    {
        const lu = createLogUtility({ timestamps: false });
        const log = lu.getLogger("Late");
        const mockLC = createMockLogConsole();

        log.event("before attach");

        expect(mockLC.info).not.toHaveBeenCalled();

        lu.setLogConsole(mockLC);

        log.event("after attach");

        expect(mockLC.info).toHaveBeenCalledWith(
            "[Late] after attach"
        );
    });

    test("setLogConsole(null) should detach the LogConsole", () =>
    {
        const mockLC = createMockLogConsole();
        const lu = createLogUtility({ logConsole: mockLC, timestamps: false });
        const log = lu.getLogger("Detach");

        log.event("routed");

        expect(mockLC.info).toHaveBeenCalledTimes(1);

        lu.setLogConsole(null);

        log.event("not routed");

        expect(mockLC.info).toHaveBeenCalledTimes(1);
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("should release the LogConsole reference", () =>
    {
        const mockLC = createMockLogConsole();
        const lu = createLogUtility({ logConsole: mockLC, timestamps: false });
        const log = lu.getLogger("Cleanup");

        lu.destroy();

        // After destroy, events should not route to LogConsole.
        log.event("after destroy");

        expect(mockLC.info).not.toHaveBeenCalled();
    });

    test("resetLogUtility should allow fresh singleton creation", () =>
    {
        const first = createLogUtility({ level: "error" });

        resetLogUtility();

        const second = createLogUtility({ level: "debug" });

        expect(first).not.toBe(second);
    });
});

// ============================================================================
// WINDOW GLOBALS
// ============================================================================

describe("window globals", () =>
{
    test("createLogUtility should be on window", () =>
    {
        const win = window as unknown as Record<string, unknown>;

        expect(typeof win.createLogUtility).toBe("function");
    });

    test("resetLogUtility should be on window", () =>
    {
        const win = window as unknown as Record<string, unknown>;

        expect(typeof win.resetLogUtility).toBe("function");
    });

    test("LogUtility class should be on window", () =>
    {
        const win = window as unknown as Record<string, unknown>;

        expect(typeof win.LogUtility).toBe("function");
    });
});

// ============================================================================
// GLOBAL DEBUG FLAGS
// ============================================================================

describe("global debug flags", () =>
{
    const win = window as unknown as Record<string, unknown>;

    afterEach(() =>
    {
        delete win.__ebt_debug_logging;
        delete win.__ebt_info_logging;
        delete win.__ebt_trace_logging;
        resetLogUtility();
    });

    test("__ebt_debug_logging enables debug even when level is error", () =>
    {
        const lu = createLogUtility({ level: "error", timestamps: false });
        const log = lu.getLogger("Flags");

        win.__ebt_debug_logging = true;

        log.debug("should appear");

        expect(console.debug).toHaveBeenCalled();
    });

    test("__ebt_info_logging enables info even when level is error", () =>
    {
        const lu = createLogUtility({ level: "error", timestamps: false });
        const log = lu.getLogger("Flags");

        win.__ebt_info_logging = true;

        log.info("should appear");

        expect(console.log).toHaveBeenCalled();
    });

    test("__ebt_trace_logging enables debug (alias)", () =>
    {
        const lu = createLogUtility({ level: "error", timestamps: false });
        const log = lu.getLogger("Flags");

        win.__ebt_trace_logging = true;

        log.debug("trace alias");

        expect(console.debug).toHaveBeenCalled();
    });

    test("warnings always emit regardless of flags", () =>
    {
        const lu = createLogUtility({ level: "error", timestamps: false });
        const log = lu.getLogger("Flags");

        log.warn("always visible");

        expect(console.warn).toHaveBeenCalled();
    });

    test("errors always emit regardless of flags", () =>
    {
        const lu = createLogUtility({ level: "error", timestamps: false });
        const log = lu.getLogger("Flags");

        log.error("always visible");

        expect(console.error).toHaveBeenCalled();
    });

    test("debug suppressed when flag is false and level is high", () =>
    {
        const lu = createLogUtility({ level: "error", timestamps: false });
        const log = lu.getLogger("Flags");

        win.__ebt_debug_logging = false;

        log.debug("should be suppressed");

        expect(console.debug).not.toHaveBeenCalled();
    });

    test("flags can be toggled at runtime", () =>
    {
        const lu = createLogUtility({ level: "error", timestamps: false });
        const log = lu.getLogger("Flags");

        log.debug("suppressed");

        expect(console.debug).not.toHaveBeenCalled();

        win.__ebt_debug_logging = true;

        log.debug("enabled");

        expect(console.debug).toHaveBeenCalledTimes(1);

        win.__ebt_debug_logging = false;

        log.debug("suppressed again");

        expect(console.debug).toHaveBeenCalledTimes(1);
    });
});
