/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: LOG-4 trace emission, end to end through a real component
 *
 * scripts/trace-scan.mjs counts the call sites. It cannot tell whether a
 * trace line ever reaches a console, and a count that cannot fail for the
 * reason it exists is the mistake STD-1 was built on.
 *
 * So this drives the real thing: a Magnifier, a real mousemove, and the
 * console it writes to. Magnifier is the smallest component with a
 * genuinely high-frequency handler and no LogUtility on the page, which
 * is the fallback branch 132 of 138 demo pages take.
 *
 * The flag is read once when the module is evaluated, so each case has to
 * reset the module registry and import again. That is not a quirk of the
 * test: it is the component's actual contract, and LOG-6 records that
 * FRONTEND_LOGGING.md section 6 promises a runtime toggle the fallback
 * branch does not deliver.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

let container: HTMLElement;
let targetEl: HTMLElement;

/** Builds a magnifier over a target and returns every console.debug call, arguments intact. */
async function traceCallsForAMouseMove(flag: boolean | undefined): Promise<unknown[][]>
{
    vi.resetModules();
    if (flag === undefined) { delete (window as { __ebt_trace_logging?: boolean }).__ebt_trace_logging; }
    else { window.__ebt_trace_logging = flag; }

    const calls: unknown[][] = [];
    const spy = vi.spyOn(console, "debug").mockImplementation((...args: unknown[]) =>
    {
        // Kept as raw arguments. Flattening with String() turns the payload
        // into "[object Object]" and quietly makes the privacy case vacuous.
        calls.push(args);
    });

    const { createMagnifier } = await import("./magnifier");
    const instance = createMagnifier({ target: targetEl, enabled: true });
    targetEl.dispatchEvent(new MouseEvent("mousemove", { clientX: 42, clientY: 7, bubbles: true }));
    instance.destroy();
    spy.mockRestore();
    return calls;
}

/** The calls that carry the TRACE tag. */
function traceCalls(calls: unknown[][]): unknown[][]
{
    return calls.filter(args => args.some(a => a === "[TRACE]"));
}

beforeEach(() =>
{
    container = document.createElement("div");
    document.body.appendChild(container);
    targetEl = document.createElement("div");
    targetEl.style.width = "200px";
    targetEl.style.height = "200px";
    container.appendChild(targetEl);
});

afterEach(() =>
{
    container.remove();
    delete (window as { __ebt_trace_logging?: boolean }).__ebt_trace_logging;
});

describe("LOG-4 trace emission", () =>
{
    test("FlagUnset_MouseMoveEmitsNoTrace", async () =>
    {
        expect(traceCalls(await traceCallsForAMouseMove(undefined))).toHaveLength(0);
    });

    test("FlagFalse_MouseMoveEmitsNoTrace", async () =>
    {
        expect(traceCalls(await traceCallsForAMouseMove(false))).toHaveLength(0);
    });

    test("FlagTrue_MouseMoveEmitsTheHandlerTrace", async () =>
    {
        const traces = traceCalls(await traceCallsForAMouseMove(true));
        expect(traces.length).toBeGreaterThan(0);
        expect(traces.some(args => args.includes("[Magnifier]") && args.includes("mousemove handler:"))).toBe(true);
    });

    test("FlagTrue_ThePayloadIsThePointerPositionAndNothingElse", async () =>
    {
        const traces = traceCalls(await traceCallsForAMouseMove(true));
        const call = traces.find(args => args.includes("mousemove handler:"));
        expect(call).toBeDefined();

        const payload = call?.find(a => typeof a === "object" && a !== null) as Record<string, unknown>;
        expect(payload).toEqual({ x: 42, y: 7 });

        // FRONTEND_LOGGING.md section 5 forbids PII, so the payload carries
        // the pointer position and nothing a user typed. Pinning the exact
        // key set is what makes that a check rather than a claim.
        expect(Object.keys(payload).sort()).toEqual(["x", "y"]);
    });
});
