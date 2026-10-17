/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: LOG-4a trace emission through the one component with its own shim form
 *
 * Eleven of the twelve components LOG-4a instrumented carry the house
 * preamble: `_lu`, five `function logX` helpers, a `_trc()` gate. This one
 * does not. It builds a `ComponentLogger` through a `getLogger()` with a
 * try/catch, keeps it in `_logger` rather than `_lu`, and declared no
 * `trace` on its interface until LOG-4a added one.
 *
 * A different shape is where a fleet-wide count is least useful.
 * `dynamicVerboseShims` reads the shim TEXT and would be satisfied by a
 * body that never runs, so the branch is driven here instead. The other
 * eleven are covered by magnifier.flag.test.ts, which drives the house
 * form through the same two gates.
 *
 * The fixture carries a `password` field on purpose. `input` is the event
 * FRONTEND_LOGGING.md section 5 is strictest about, so the payload is
 * asserted by its exact key set rather than by what it happens to contain.
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import type { DynamicFormSwitcherHandle } from "./dynamicformswitcher";

const flags = window as unknown as Window & { __ebt_trace_logging?: unknown };

let createDynamicFormSwitcher: typeof import("./dynamicformswitcher")["createDynamicFormSwitcher"];
let container: HTMLElement;
let handle: DynamicFormSwitcherHandle | null = null;

beforeAll(async () =>
{
    createDynamicFormSwitcher = (await import("./dynamicformswitcher")).createDynamicFormSwitcher;
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
    return calls.filter(args => args.some(a => a === "[TRACE]"));
}

/**
 * The value typed into the password field. Both the value and its LENGTH
 * are content under FRONTEND_LOGGING.md section 5, so the assertions below
 * derive the length from this constant rather than transcribing it. A
 * transcribed number stops checking the right thing the moment the fixture
 * changes, and says nothing when it does.
 */
const SECRET = "hunter2-correct-horse";

/** Types a secret into the password field and fires a real input event. */
function typeIntoThePasswordField(): void
{
    const field = container.querySelector<HTMLInputElement>('input[type="password"]');
    if (!field) { throw new Error("fixture has no password field"); }
    field.value = SECRET;
    field.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(() =>
{
    container = document.createElement("div");
    document.body.appendChild(container);
    handle = createDynamicFormSwitcher(container, {
        variants: {
            basic: {
                label: "Basic Auth",
                fields: [
                    { name: "username", label: "Username", type: "text", required: true },
                    { name: "password", label: "Password", type: "password", required: true },
                ],
            },
        },
        initialVariant: "basic",
    });
});

afterEach(() =>
{
    handle?.destroy();
    handle = null;
    container.remove();
    delete flags.__ebt_trace_logging;
});

describe("the fallback branch is the one under test", () =>
{
    test("LogUtility is absent, so the component uses its own console shim", () =>
    {
        expect(typeof (window as { createLogUtility?: unknown }).createLogUtility).not.toBe("function");
    });
});

describe("a flag set after the module was imported", () =>
{
    test("turns trace on, through a shim shaped unlike every other component", () =>
    {
        expect(consoleDebugDuring(typeIntoThePasswordField)).toHaveLength(0);

        flags.__ebt_trace_logging = true;

        const traces = consoleDebugDuring(typeIntoThePasswordField);
        expect(traces.length).toBeGreaterThan(0);
        expect(traces[0]).toContain("input handler:");
    });

    test("turns it off again", () =>
    {
        flags.__ebt_trace_logging = true;
        expect(consoleDebugDuring(typeIntoThePasswordField).length).toBeGreaterThan(0);

        flags.__ebt_trace_logging = false;
        expect(consoleDebugDuring(typeIntoThePasswordField)).toHaveLength(0);
    });
});

describe("the payload is the field name and nothing else", () =>
{
    test("it names the field and carries no part of what was typed", () =>
    {
        flags.__ebt_trace_logging = true;
        const traces = consoleDebugDuring(typeIntoThePasswordField);

        // Raw arguments. Flattening with String() renders the payload as
        // "[object Object]" and makes the assertion below vacuous.
        const payload = traces[0]?.find(a => typeof a === "object" && a !== null) as Record<string, unknown>;
        expect(payload).toEqual({ field: "password" });
        expect(Object.keys(payload)).toEqual(["field"]);

        // The secret must not reach the console by any route, including the
        // level tag and the prefix arguments.
        //
        // THE TIMESTAMP IS DROPPED FIRST, AND THAT IS NOT A WEAKENING. The
        // logger writes an ISO timestamp as argument zero. The secret is 21
        // characters long, and "21" appears in that timestamp for one minute
        // of every hour, for every 21st minute, and on every 21st day. This
        // assertion failed in CI at 12:21 UTC against a trace that was
        // correct, which is the worst way for a test to fail: it accuses the
        // code of leaking a password and it is wrong. Nothing the component
        // writes is excluded, only the clock reading the logger prepends.
        const written = JSON.stringify(traces.map(args => args.slice(1)));
        expect(written).not.toContain(SECRET);
        expect(written).not.toContain("hunter2");
        expect(written).not.toContain(String(SECRET.length));
    });
});
