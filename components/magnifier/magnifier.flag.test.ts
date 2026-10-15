/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: LOG-6 the fallback gates are read on every call
 *
 * FRONTEND_LOGGING.md section 6 promises that a flag set in a live browser
 * console takes effect immediately. Until LOG-6 that was true only when the
 * page loaded `logutility.js`. The fallback captured `_dbg` and `_trc` in a
 * const at script evaluation, so the 132 of 138 demo pages that take that
 * branch ignored anything set afterwards.
 *
 * WHY THIS FILE IMPORTS ONCE AND NEVER CALLS vi.resetModules().
 * That is the entire experiment. magnifier.trace.test.ts resets the
 * registry between cases because it had to: the gate was frozen at import.
 * Here the module is imported a single time in `beforeAll` and every case
 * flips the flag afterwards. A test that re-imported would pass just as
 * well against the old captured const and would prove nothing.
 *
 * A COUNT OF `_dbg()` CALL SITES CANNOT PROVE THIS EITHER.
 * scripts/audit-counts.mjs pins the text and holds the floor. Text is not
 * behaviour, which is the LOG-4 lesson in a new costume, so the console is
 * read here instead.
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import type { MagnifierInstance } from "./magnifier";

type FlagWindow = Window & {
    __ebt_trace_logging?: unknown;
    __ebt_debug_logging?: unknown;
};

const flags = window as unknown as FlagWindow;

let createMagnifier: typeof import("./magnifier")["createMagnifier"];
let targetEl: HTMLElement;
let instance: MagnifierInstance | null = null;

beforeAll(async () =>
{
    createMagnifier = (await import("./magnifier")).createMagnifier;
});

/** Everything written to console.debug while `run` executes, arguments intact. */
function consoleDebugDuring(run: () => void): unknown[][]
{
    const calls: unknown[][] = [];
    const spy = vi.spyOn(console, "debug").mockImplementation((...args: unknown[]) =>
    {
        calls.push(args);
    });
    try { run(); }
    finally { spy.mockRestore(); }
    return calls;
}

/** The calls carrying one level tag. */
function tagged(calls: unknown[][], tag: string): unknown[][]
{
    return calls.filter(args => args.some(a => a === tag));
}

/** Drives one real mousemove over the magnifier target. */
function moveTheMouse(): void
{
    targetEl.dispatchEvent(new MouseEvent("mousemove", { clientX: 42, clientY: 7, bubbles: true }));
}

beforeEach(() =>
{
    targetEl = document.createElement("div");
    document.body.appendChild(targetEl);
    instance = createMagnifier({ target: targetEl, enabled: true });
});

afterEach(() =>
{
    instance?.destroy();
    instance = null;
    targetEl.remove();
    // tests/setup.ts sets this once, globally, and these cases move it.
    flags.__ebt_debug_logging = false;
    delete flags.__ebt_trace_logging;
});

describe("the fallback branch is the one under test", () =>
{
    // Without this the whole file is vacuous. If `createLogUtility` were
    // defined, `_lu` would be truthy, the component would take the
    // LogUtility branch, and isGlobalFlagSet was ALWAYS read per call. Every
    // case below would pass while saying nothing about the shim.
    test("LogUtility is absent, so the component uses its console shim", () =>
    {
        expect(typeof (window as { createLogUtility?: unknown }).createLogUtility).not.toBe("function");
    });
});

describe("trace, set after the module was imported", () =>
{
    test("the flag turns trace on without a reload", () =>
    {
        expect(tagged(consoleDebugDuring(moveTheMouse), "[TRACE]")).toHaveLength(0);

        flags.__ebt_trace_logging = true;

        const after = tagged(consoleDebugDuring(moveTheMouse), "[TRACE]");
        expect(after.length).toBeGreaterThan(0);
        expect(after[0]).toContain("mousemove handler:");
    });

    test("the round trip: on, then off, then on again", () =>
    {
        flags.__ebt_trace_logging = true;
        expect(tagged(consoleDebugDuring(moveTheMouse), "[TRACE]").length).toBeGreaterThan(0);

        flags.__ebt_trace_logging = false;
        expect(tagged(consoleDebugDuring(moveTheMouse), "[TRACE]")).toHaveLength(0);

        flags.__ebt_trace_logging = true;
        expect(tagged(consoleDebugDuring(moveTheMouse), "[TRACE]").length).toBeGreaterThan(0);
    });
});

describe("debug, set after the module was imported", () =>
{
    test("the flag turns debug on and off without a reload", () =>
    {
        expect(tagged(consoleDebugDuring(() => instance?.setZoom(3)), "[DEBUG]")).toHaveLength(0);

        flags.__ebt_debug_logging = true;
        expect(tagged(consoleDebugDuring(() => instance?.setZoom(4)), "[DEBUG]").length).toBeGreaterThan(0);

        flags.__ebt_debug_logging = false;
        expect(tagged(consoleDebugDuring(() => instance?.setZoom(5)), "[DEBUG]")).toHaveLength(0);
    });

    test("unset means decide from the host, and jsdom serves localhost", () =>
    {
        expect(location.hostname).toBe("localhost");

        delete flags.__ebt_debug_logging;
        expect(tagged(consoleDebugDuring(() => instance?.setZoom(3)), "[DEBUG]").length).toBeGreaterThan(0);
    });
});

/*
 * The tri-state table, run against the shim rather than against
 * isGlobalFlagSet. logutility.test.ts pins the same table on the LogUtility
 * side. driftedHostRule compares the two copies of the host REGEX and
 * cannot see a difference in how the value is read, which is where these
 * two implementations had in fact drifted: the shim tested
 * `__ebt_trace_logging === true` and so ignored a truthy non-boolean that
 * LogUtility honours, and it sent an explicit `null` to the host rule where
 * LogUtility reads it as off.
 */
describe("the fallback reads a flag exactly as isGlobalFlagSet does", () =>
{
    const traceCases: Array<[string, unknown, boolean]> = [
        ["undefined", undefined, false],
        ["null", null, false],
        ["false", false, false],
        ["true", true, true],
        ["the number 1", 1, true],
        ["a non-empty string", "yes", true],
        ["the empty string", "", false],
    ];

    for (const [label, value, expected] of traceCases)
    {
        test(`trace with ${label} emits: ${expected}`, () =>
        {
            if (value === undefined) { delete flags.__ebt_trace_logging; }
            else { flags.__ebt_trace_logging = value; }

            const emitted = tagged(consoleDebugDuring(moveTheMouse), "[TRACE]").length > 0;
            expect(emitted).toBe(expected);
        });
    }

    const debugCases: Array<[string, unknown, boolean]> = [
        ["null", null, false],
        ["false", false, false],
        ["true", true, true],
        ["the number 0", 0, false],
        ["the number 1", 1, true],
    ];

    for (const [label, value, expected] of debugCases)
    {
        test(`debug with ${label} emits: ${expected}`, () =>
        {
            flags.__ebt_debug_logging = value;

            const emitted = tagged(consoleDebugDuring(() => instance?.setZoom(3)), "[DEBUG]").length > 0;
            expect(emitted).toBe(expected);
        });
    }
});
