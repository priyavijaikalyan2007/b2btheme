/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the LOG-4 trace coverage classifier
 *
 * LOG-4. Tests for scripts/trace-scan.mjs.
 *
 * The classifier decides which components must carry trace, so a wrong
 * answer either hides the gap LOG-4 exists to close or demands trace from
 * a component that does no high-frequency work. Every outcome of
 * classify() gets a case here, and so does each judgment the scanner
 * makes about what "high frequency" means:
 *
 *   - `click` is not high frequency, because one gesture produces one
 *   - a listener registered through a wrapper still counts, because 99 of
 *     229 call sites in this repository attach by reference
 *   - an observer counts even with no listener at all, which is the only
 *     reason the eight layout components are in scope
 */

import { describe, expect, test } from "vitest";
import
{
    HIGH_FREQUENCY_EVENTS,
    classify,
    countTraceCalls,
    declaresTraceShim,
    hasFrameRateObserver,
    hasHighFrequencyListener,
    isHighFrequency,
} from "./trace-scan.mjs";

// The house form since LOG-5 reflowed it and LOG-6 made the gate a call.
// declaresTraceShim only looks for `function logTrace(`, so the shape does
// not change what this file measures, but a fixture that shows a form no
// component still carries would be read as the pattern to copy.
const SHIM = [
    "function logTrace(...a: unknown[]): void",
    "{",
    "    _lu ? _lu.trace(...a) : _trc() && console.debug(...a);",
    "}",
].join("\n");

describe("hasHighFrequencyListener", () =>
{
    test("DirectRegistration_IsFound", () =>
    {
        expect(hasHighFrequencyListener('el.addEventListener("pointermove", onMove);')).toBe(true);
    });

    test("RegistrationThroughAWrapper_IsFound", () =>
    {
        // 99 of 229 sites in this repository attach by reference through a
        // helper, so a rule anchored on `addEventListener` would miss them.
        expect(hasHighFrequencyListener('this.addListener(el, "scroll", fn);')).toBe(true);
    });

    test("OneGesturePerEvent_IsNotHighFrequency", () =>
    {
        expect(hasHighFrequencyListener('el.addEventListener("click", onClick);')).toBe(false);
        expect(hasHighFrequencyListener('el.addEventListener("pointerdown", onDown);')).toBe(false);
    });

    test("ElementCreation_IsNotAListener", () =>
    {
        // htmlEl("input", { type: "text" }) builds an element. An object
        // literal is never a handler, so this must not read as a listener.
        expect(hasHighFrequencyListener('htmlEl("input", { type: "text" });')).toBe(false);
        expect(hasHighFrequencyListener('createElement("input", { class: CLS });')).toBe(false);
    });

    test("AnEventNamedStringPassedAsData_IsNotAListener", () =>
    {
        // hovercard calls hideCard(state, "scroll", true). The string spells
        // an event and the call is not a registration.
        expect(hasHighFrequencyListener('hideCard(state, "scroll", true);')).toBe(false);
    });

    test("AHelperWithTwoLeadingArguments_IsStillAListener", () =>
    {
        expect(hasHighFrequencyListener('addTracked(state.listeners, target, "scroll", onScroll, opts);')).toBe(true);
    });

    test("EveryDocumentedEventName_IsRecognised", () =>
    {
        for (const name of HIGH_FREQUENCY_EVENTS)
        {
            expect(hasHighFrequencyListener(`el.addEventListener("${name}", fn);`)).toBe(true);
        }
    });
});

describe("hasFrameRateObserver", () =>
{
    test("ResizeObserver_Counts", () =>
    {
        expect(hasFrameRateObserver("this.ro = new ResizeObserver(() => this.relayout());")).toBe(true);
    });

    test("AOneShotAnimationFrame_DoesNotCount", () =>
    {
        // bannerbar and codeeditor schedule a single frame to start a CSS
        // transition. That is not a frame loop and must not demand trace.
        expect(hasFrameRateObserver("requestAnimationFrame(() => el.classList.add(CLS));")).toBe(false);
    });

    test("ACountdownInterval_DoesNotCount", () =>
    {
        expect(isHighFrequency("this.tickTimer = setInterval(() => this.tick(), 1000);")).toBe(false);
    });
});

describe("countTraceCalls", () =>
{
    test("TheDeclarationItself_IsNotACall", () =>
    {
        expect(countTraceCalls(SHIM)).toBe(0);
    });

    test("CallsAreCounted_WithoutTheDeclaration", () =>
    {
        expect(countTraceCalls(`${SHIM}\nlogTrace("a");\nlogTrace("b");`)).toBe(2);
    });

    test("ACallWithNoDeclaration_StillCounts", () =>
    {
        expect(declaresTraceShim('logTrace("a");')).toBe(false);
        expect(countTraceCalls('logTrace("a");')).toBe(1);
    });
});

describe("classify", () =>
{
    test("HotAndCallingTheShim_IsTraced", () =>
    {
        const src = `${SHIM}\nel.addEventListener("pointermove", onMove);\nlogTrace("pointermove handler");`;
        expect(classify(src)).toBe("traced");
    });

    test("HotWithAnUncalledShim_IsTheLog4Gap", () =>
    {
        expect(classify(`${SHIM}\nel.addEventListener("pointermove", onMove);`)).toBe("untracedHotShim");
    });

    test("ColdWithAShim_IsADeadHelper", () =>
    {
        // FRONTEND_LOGGING.md: a component with no trace-level
        // instrumentation does not need a dead logTrace.
        expect(classify(`${SHIM}\nel.addEventListener("click", onClick);`)).toBe("deadTraceShim");
    });

    test("HotWithNoShimAtAll_WasNeverPartOfLog4", () =>
    {
        expect(classify('el.addEventListener("wheel", onWheel);')).toBe("hotWithoutShim");
    });

    test("ColdWithNoShim_IsNothingToDo", () =>
    {
        expect(classify('el.addEventListener("click", onClick);')).toBe("cold");
    });

    test("AnObserverAloneMakesAComponentHot", () =>
    {
        // The eight layout components register no high-frequency listener
        // and relayout on every ResizeObserver callback during a drag.
        expect(classify(`${SHIM}\nthis.ro = new ResizeObserver(() => this.relayout());`)).toBe("untracedHotShim");
    });
});
