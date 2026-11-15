/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: GestureRecognizer (#182)
 * The gestures and thresholds of TOUCH_EXPERIENCE.md sections 2, 5, 6.2 and 7:
 * tap, double tap, long press, drag, long press then drag, and the
 * two-finger gesture. Also a second finger during a drag, a palm while a pen
 * is down, pointercancel, capture, the edge zone, cancel() and destroy().
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
    createGestureRecognizer,
    GESTURE_THRESHOLDS,
    GestureRecognizerHandle,
    GestureRecognizerOptions,
} from "./gesturerecognizer";

// ============================================================================
// HELPERS
// ============================================================================

let el: HTMLDivElement;
let calls: string[];
let handle: GestureRecognizerHandle;
let last: Record<string, unknown>;

/** One pointer event on the element. jsdom defaults isPrimary to false. */
function fire(type: string, x: number, y: number, init: PointerEventInit = {}): void
{
    el.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, pointerId: 1, pointerType: "touch",
        isPrimary: true, button: type === "pointermove" ? -1 : 0,
        clientX: x, clientY: y, ...init,
    }));
}

/** A recognizer whose callbacks record their names and their last report. */
function recognize(extra: GestureRecognizerOptions = {}): GestureRecognizerHandle
{
    const names = ["onTap", "onDoubleTap", "onLongPress",
        "onDragStart", "onDragMove", "onDragEnd", "onDragCancel",
        "onTwoFingerStart", "onTwoFingerMove", "onTwoFingerEnd", "onTwoFingerCancel"] as const;
    const options: GestureRecognizerOptions = {};

    for (const name of names)
    {
        (options as Record<string, unknown>)[name] = (g: unknown) =>
        {
            calls.push(name);
            last[name] = g;
        };
    }

    return createGestureRecognizer(el, { ...options, ...extra });
}

beforeEach(() =>
{
    vi.useFakeTimers();
    el = document.createElement("div");
    document.body.appendChild(el);
    // jsdom has no pointer capture.
    el.setPointerCapture = vi.fn();
    calls = [];
    last = {};
    handle = recognize();
});

afterEach(() =>
{
    handle.destroy();
    el.remove();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("factory", () =>
{
    test("thresholds_MatchSection7_AndCannotChange", () =>
    {
        expect(GESTURE_THRESHOLDS).toEqual({
            touchTolerance: 10, fineTolerance: 4, longPressMs: 500,
            doubleTapMs: 300, doubleTapDistance: 24, coarseTarget: 44,
            fineTarget: 24, autoScrollZone: 48, edgeZone: 20, pressedStateMs: 100,
        });
        expect(Object.isFrozen(GESTURE_THRESHOLDS)).toBe(true);
        expect(handle.thresholds).toBe(GESTURE_THRESHOLDS);
    });

    test("noElement_Throws", () =>
    {
        expect(() => createGestureRecognizer(null as unknown as Element, {}))
            .toThrow(/an element is required/);
    });

    test("publishesTheFactoryOnWindow", () =>
    {
        expect(window.createGestureRecognizer).toBe(createGestureRecognizer);
    });
});

// ============================================================================
// TAP AND DRAG
// ============================================================================

describe("tap and drag", () =>
{
    test("touchDownAndUp_InPlace_IsATap", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointerup", 100, 100);

        expect(calls).toEqual(["onTap"]);
        expect(last.onTap).toMatchObject({ pointerType: "touch", x: 100, y: 100 });
    });

    test("touchMove_WithinTenPixels_IsStillATap", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointermove", 106, 108);
        fire("pointerup", 106, 108);

        expect(calls).toEqual(["onTap"]);
    });

    test("touchMove_BeyondTenPixels_IsADrag", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointermove", 111, 100);
        fire("pointermove", 130, 100);
        fire("pointerup", 130, 100);

        expect(calls).toEqual(["onDragStart", "onDragMove", "onDragMove", "onDragEnd"]);
        expect(last.onDragStart).toMatchObject({ startX: 100, startY: 100, x: 111, afterLongPress: false });
        expect(last.onDragEnd).toMatchObject({ startX: 100, x: 130 });
    });

    test("mouseMove_BeyondFourPixels_IsADrag_AndWithinIsAClick", () =>
    {
        const mouse = { pointerType: "mouse" };

        fire("pointerdown", 100, 100, mouse);
        fire("pointermove", 103, 100, mouse);
        fire("pointerup", 103, 100, mouse);
        fire("pointerdown", 200, 200, mouse);
        fire("pointermove", 205, 200, mouse);
        fire("pointerup", 205, 200, mouse);

        expect(calls).toEqual(["onTap", "onDragStart", "onDragMove", "onDragEnd"]);
    });

    test("theDragReportsTheButton_SoAMiddleDragCanPan", () =>
    {
        const mouse = { pointerType: "mouse", button: 1 };

        fire("pointerdown", 100, 100, mouse);
        fire("pointermove", 120, 100, { pointerType: "mouse" });

        expect(last.onDragStart).toMatchObject({ button: 1 });
    });

    test("aMiddleClick_IsNotATap", () =>
    {
        fire("pointerdown", 100, 100, { pointerType: "mouse", button: 1 });
        fire("pointerup", 100, 100, { pointerType: "mouse", button: 1 });

        expect(calls).toEqual([]);
    });

    test("theSecondaryButton_IsLeftToContextmenu", () =>
    {
        fire("pointerdown", 100, 100, { pointerType: "pen", button: 2 });
        fire("pointermove", 150, 100, { pointerType: "pen" });
        fire("pointerup", 150, 100, { pointerType: "pen", button: 2 });

        expect(calls).toEqual([]);
    });

    test("capture_HappensWhenTheDragStarts_NotOnPointerdown", () =>
    {
        fire("pointerdown", 100, 100, { pointerId: 7 });

        expect(el.setPointerCapture).not.toHaveBeenCalled();

        fire("pointermove", 130, 100, { pointerId: 7 });

        expect(el.setPointerCapture).toHaveBeenCalledWith(7);
    });

    test("aLostPointerup_DoesNotBlockTheNextPress", () =>
    {
        const mouse = { pointerType: "mouse" };

        fire("pointerdown", 100, 100, mouse);
        // The pointerup landed outside the element, before any capture.
        fire("pointerdown", 200, 200, mouse);
        fire("pointerup", 200, 200, mouse);

        expect(calls).toEqual(["onTap"]);
        expect(last.onTap).toMatchObject({ x: 200 });
    });

    test("theReportCarriesTheEvent_ForTargetAndModifiers", () =>
    {
        fire("pointerdown", 100, 100, { shiftKey: true });
        fire("pointerup", 100, 100, { shiftKey: true });

        expect((last.onTap as { event: PointerEvent }).event.shiftKey).toBe(true);
    });
});

// ============================================================================
// LONG PRESS
// ============================================================================

describe("long press", () =>
{
    test("touchHeldFor500ms_IsALongPress_AndTheLiftIsNotATap", () =>
    {
        fire("pointerdown", 100, 100);
        vi.advanceTimersByTime(499);

        expect(calls).toEqual([]);

        vi.advanceTimersByTime(1);
        fire("pointerup", 100, 100);

        expect(calls).toEqual(["onLongPress"]);
        expect(last.onLongPress).toMatchObject({ pointerType: "touch", x: 100, y: 100 });
    });

    test("touchLiftedBefore500ms_IsATap", () =>
    {
        fire("pointerdown", 100, 100);
        vi.advanceTimersByTime(499);
        fire("pointerup", 100, 100);
        vi.advanceTimersByTime(100);

        expect(calls).toEqual(["onTap"]);
    });

    test("aDragBeforeTheTime_CancelsTheLongPress", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointermove", 130, 100);
        vi.advanceTimersByTime(600);

        expect(calls).toEqual(["onDragStart", "onDragMove"]);
    });

    test("jitterWithinTheTolerance_KeepsTheLongPress", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointermove", 105, 105);
        vi.advanceTimersByTime(500);

        expect(calls).toEqual(["onLongPress"]);
    });

    test("aLongPressThenADrag_IsADragAfterLongPress", () =>
    {
        fire("pointerdown", 100, 100);
        vi.advanceTimersByTime(500);
        fire("pointermove", 140, 140);
        fire("pointerup", 140, 140);

        expect(calls).toEqual(["onLongPress", "onDragStart", "onDragMove", "onDragEnd"]);
        expect(last.onDragStart).toMatchObject({ afterLongPress: true, startX: 100 });
    });

    test("aMouseOrPen_NeverLongPresses", () =>
    {
        fire("pointerdown", 100, 100, { pointerType: "mouse" });
        vi.advanceTimersByTime(1000);
        fire("pointerup", 100, 100, { pointerType: "mouse" });
        fire("pointerdown", 100, 100, { pointerType: "pen" });
        vi.advanceTimersByTime(1000);
        fire("pointerup", 100, 100, { pointerType: "pen" });

        expect(calls).toEqual(["onTap", "onTap"]);
    });
});

// ============================================================================
// DOUBLE TAP
// ============================================================================

describe("double tap", () =>
{
    function tap(x: number, y: number, init: PointerEventInit = {}): void
    {
        fire("pointerdown", x, y, init);
        fire("pointerup", x, y, init);
    }

    test("twoTapsWithin300msAnd24px_AreADoubleTap", () =>
    {
        tap(100, 100);
        vi.advanceTimersByTime(300);
        tap(120, 110);

        expect(calls).toEqual(["onTap", "onTap", "onDoubleTap"]);
        expect(last.onDoubleTap).toMatchObject({ x: 120, y: 110 });
    });

    test("twoTapsMoreThan300msApart_AreTwoTaps", () =>
    {
        tap(100, 100);
        vi.advanceTimersByTime(301);
        tap(100, 100);

        expect(calls).toEqual(["onTap", "onTap"]);
    });

    test("twoTapsMoreThan24pxApart_AreTwoTaps", () =>
    {
        tap(100, 100);
        tap(125, 100);

        expect(calls).toEqual(["onTap", "onTap"]);
    });

    test("aThirdTap_StartsANewPair", () =>
    {
        tap(100, 100);
        tap(100, 100);
        tap(100, 100);

        expect(calls).toEqual(["onTap", "onTap", "onDoubleTap", "onTap"]);
    });

    test("aDoubleClick_IsADoubleTap", () =>
    {
        tap(100, 100, { pointerType: "mouse" });
        tap(100, 100, { pointerType: "mouse" });

        expect(calls).toEqual(["onTap", "onTap", "onDoubleTap"]);
    });

    test("aTapAndAClick_AreNotADoubleTap", () =>
    {
        tap(100, 100);
        tap(100, 100, { pointerType: "mouse" });

        expect(calls).toEqual(["onTap", "onTap"]);
    });
});

// ============================================================================
// TWO FINGERS
// ============================================================================

describe("two fingers", () =>
{
    const a = { pointerId: 1 };
    const b = { pointerId: 2, isPrimary: false };

    test("twoFingers_ReportThePanAndTheZoomTogether", () =>
    {
        fire("pointerdown", 100, 100, a);
        fire("pointerdown", 200, 100, b);

        expect(calls).toEqual(["onTwoFingerStart"]);
        expect(last.onTwoFingerStart).toMatchObject({ centerX: 150, centerY: 100, scale: 1 });

        // Spread to twice the distance and move the midpoint down 50.
        fire("pointermove", 50, 150, a);
        fire("pointermove", 250, 150, b);

        expect(last.onTwoFingerMove).toMatchObject({
            centerX: 150, centerY: 150, startCenterX: 150, startCenterY: 100, scale: 2,
        });

        fire("pointerup", 250, 150, b);

        expect(calls).toEqual(["onTwoFingerStart", "onTwoFingerMove", "onTwoFingerMove", "onTwoFingerEnd"]);
    });

    test("bothFingersAreCaptured", () =>
    {
        fire("pointerdown", 100, 100, a);
        fire("pointerdown", 200, 100, b);

        expect(el.setPointerCapture).toHaveBeenCalledWith(1);
        expect(el.setPointerCapture).toHaveBeenCalledWith(2);
    });

    test("aSecondFingerDuringADrag_CancelsTheDrag_ThenStartsTwoFingers", () =>
    {
        fire("pointerdown", 100, 100, a);
        fire("pointermove", 140, 100, a);
        fire("pointerdown", 300, 100, b);
        fire("pointermove", 160, 100, a);
        fire("pointerup", 160, 100, a);

        expect(calls).toEqual(["onDragStart", "onDragMove", "onDragCancel",
            "onTwoFingerStart", "onTwoFingerMove", "onTwoFingerEnd"]);
    });

    test("aSecondFingerBeforeTheLongPress_StopsTheLongPressAndTheTap", () =>
    {
        fire("pointerdown", 100, 100, a);
        fire("pointerdown", 200, 100, b);
        vi.advanceTimersByTime(600);
        fire("pointerup", 200, 100, b);
        fire("pointerup", 100, 100, a);

        expect(calls).toEqual(["onTwoFingerStart", "onTwoFingerEnd"]);
    });

    test("theFingerLeftDown_DoesNothingUntilItLifts", () =>
    {
        fire("pointerdown", 100, 100, a);
        fire("pointerdown", 200, 100, b);
        fire("pointerup", 200, 100, b);
        fire("pointermove", 300, 300, a);
        fire("pointerup", 300, 300, a);

        expect(calls).toEqual(["onTwoFingerStart", "onTwoFingerEnd"]);
    });

    test("aFingerPutBackDown_StartsTwoFingersAgain", () =>
    {
        fire("pointerdown", 100, 100, a);
        fire("pointerdown", 200, 100, b);
        fire("pointerup", 200, 100, b);
        fire("pointerdown", 200, 100, { pointerId: 3, isPrimary: false });

        expect(calls).toEqual(["onTwoFingerStart", "onTwoFingerEnd", "onTwoFingerStart"]);
    });

    test("aThirdFinger_IsIgnored", () =>
    {
        fire("pointerdown", 100, 100, a);
        fire("pointerdown", 200, 100, b);
        fire("pointerdown", 300, 100, { pointerId: 3, isPrimary: false });
        fire("pointermove", 400, 100, { pointerId: 3, isPrimary: false });
        fire("pointerup", 400, 100, { pointerId: 3, isPrimary: false });

        expect(calls).toEqual(["onTwoFingerStart"]);
    });

    test("pointercancel_CancelsTheTwoFingerGesture", () =>
    {
        fire("pointerdown", 100, 100, a);
        fire("pointerdown", 200, 100, b);
        fire("pointercancel", 0, 0, a);

        expect(calls).toEqual(["onTwoFingerStart", "onTwoFingerCancel"]);
    });
});

// ============================================================================
// PEN AND PALM
// ============================================================================

describe("pen and palm", () =>
{
    const pen = { pointerId: 10, pointerType: "pen" };
    const palm = { pointerId: 11, isPrimary: true };

    test("aTouchWhileAPenIsDown_IsIgnored", () =>
    {
        fire("pointerdown", 100, 100, pen);
        fire("pointermove", 120, 100, pen);
        fire("pointerdown", 400, 400, palm);
        fire("pointermove", 450, 450, palm);
        vi.advanceTimersByTime(600);
        fire("pointerup", 450, 450, palm);
        fire("pointermove", 140, 100, pen);
        fire("pointerup", 140, 100, pen);

        expect(calls).toEqual(["onDragStart", "onDragMove", "onDragMove", "onDragEnd"]);
        expect(last.onDragEnd).toMatchObject({ pointerType: "pen", x: 140 });
    });

    test("twoTouchesWhileAPenIsDown_CancelThePen_AndStartTwoFingers", () =>
    {
        fire("pointerdown", 100, 100, pen);
        fire("pointermove", 120, 100, pen);
        fire("pointerdown", 400, 400, palm);
        fire("pointerdown", 500, 400, { pointerId: 12, isPrimary: false });

        expect(calls).toEqual(["onDragStart", "onDragMove", "onDragCancel", "onTwoFingerStart"]);
    });
});

// ============================================================================
// CANCEL, FILTER, EDGE ZONE, LIFECYCLE
// ============================================================================

describe("cancel and lifecycle", () =>
{
    test("pointercancel_CancelsTheDrag_AndEndsNothing", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointermove", 140, 100);
        fire("pointercancel", 0, 0);
        fire("pointermove", 200, 100);
        fire("pointerup", 200, 100);

        expect(calls).toEqual(["onDragStart", "onDragMove", "onDragCancel"]);
        expect(last.onDragCancel).toMatchObject({ x: 140, startX: 100 });
    });

    test("pointercancel_BeforeADrag_IsNotATap", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointercancel", 100, 100);
        vi.advanceTimersByTime(600);

        expect(calls).toEqual([]);
    });

    test("cancel_CancelsTheDragInProgress", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointermove", 140, 100);
        handle.cancel();
        fire("pointermove", 200, 100);
        fire("pointerup", 200, 100);

        expect(calls).toEqual(["onDragStart", "onDragMove", "onDragCancel"]);
    });

    test("cancel_WhenIdle_DoesNothing", () =>
    {
        handle.cancel();

        expect(calls).toEqual([]);
    });

    test("accept_LeavesARefusedPointerAlone", () =>
    {
        handle.destroy();
        handle = recognize({ accept: (e) => e.clientX < 300 });
        fire("pointerdown", 400, 100);
        fire("pointermove", 450, 100);
        fire("pointerup", 450, 100);
        fire("pointerdown", 100, 100);
        fire("pointerup", 100, 100);

        expect(calls).toEqual(["onTap"]);
    });

    test("aTouchInTheEdgeZone_StartsNothing", () =>
    {
        fire("pointerdown", 19, 100);
        fire("pointerup", 19, 100);
        fire("pointerdown", window.innerWidth - 19, 100);
        fire("pointerup", window.innerWidth - 19, 100);
        fire("pointerdown", 20, 100);
        fire("pointerup", 20, 100);

        expect(calls).toEqual(["onTap"]);
    });

    test("aMouseInTheEdgeZone_StillClicks", () =>
    {
        fire("pointerdown", 5, 100, { pointerType: "mouse" });
        fire("pointerup", 5, 100, { pointerType: "mouse" });

        expect(calls).toEqual(["onTap"]);
    });

    test("destroy_RemovesTheListenersAndTheTimer_AndCanRunTwice", () =>
    {
        fire("pointerdown", 100, 100);
        handle.destroy();
        handle.destroy();
        vi.advanceTimersByTime(600);
        fire("pointerdown", 100, 100);
        fire("pointerup", 100, 100);

        expect(calls).toEqual([]);
    });

    test("aCallbackThatThrows_ReachesTheHost_AndTheNextGestureStillWorks", () =>
    {
        handle.destroy();

        let starts = 0;
        let ends = 0;
        let cancels = 0;
        const errors: unknown[] = [];
        // jsdom reports a throwing listener as an error event on window.
        const onError = (e: ErrorEvent) =>
        {
            errors.push(e.error);
            e.preventDefault();
        };

        window.addEventListener("error", onError);
        handle = createGestureRecognizer(el, {
            onDragEnd: () =>
            {
                ends++;
                throw new Error("boom");
            },
            onDragStart: () => { starts++; },
            onDragCancel: () => { cancels++; },
        });

        for (let i = 0; i < 2; i++)
        {
            fire("pointerdown", 100, 100);
            fire("pointermove", 140, 100);
            fire("pointerup", 140, 100);
        }

        window.removeEventListener("error", onError);

        // The state clears before the callback runs, so the next press is
        // not taken for a stale drag to cancel.
        expect(starts).toBe(2);
        expect(ends).toBe(2);
        expect(cancels).toBe(0);
        expect(errors).toHaveLength(2);
        expect((errors[0] as Error).message).toBe("boom");
    });
});

// ============================================================================
// PRESS AND RELEASE
// ============================================================================

describe("press and release", () =>
{
    /** The default recognizer, with onPress and onRelease recorded as well. */
    function recognizeWithPress(): void
    {
        handle.destroy();
        handle = recognize({
            onPress: (g) => { calls.push("onPress"); last.onPress = g; },
            onRelease: (g) => { calls.push("onRelease"); last.onRelease = g; },
        });
    }

    beforeEach(recognizeWithPress);

    test("aTap_IsPress_Tap_Release", () =>
    {
        fire("pointerdown", 100, 100);

        expect(calls).toEqual(["onPress"]);
        expect(last.onPress).toMatchObject({ pointerType: "touch", x: 100, y: 100, button: 0 });

        fire("pointerup", 100, 100);

        expect(calls).toEqual(["onPress", "onTap", "onRelease"]);
    });

    test("aDoubleTap_ReleasesAfterTheDoubleTap", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointerup", 100, 100);
        fire("pointerdown", 102, 101);
        fire("pointerup", 102, 101);

        expect(calls).toEqual(["onPress", "onTap", "onRelease", "onPress", "onTap", "onDoubleTap", "onRelease"]);
    });

    test("aDrag_ReleasesAfterTheDragEnd", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointermove", 140, 100);
        fire("pointerup", 140, 100);

        expect(calls).toEqual(["onPress", "onDragStart", "onDragMove", "onDragEnd", "onRelease"]);
        expect(last.onRelease).toMatchObject({ x: 140, y: 100, startX: 100 });
    });

    test("aLongPress_ThenALift_Releases", () =>
    {
        fire("pointerdown", 100, 100);
        vi.advanceTimersByTime(GESTURE_THRESHOLDS.longPressMs);
        fire("pointerup", 100, 100);

        expect(calls).toEqual(["onPress", "onLongPress", "onRelease"]);
    });

    test("aMiddleClick_WithNoDrag_Releases_AndIsNoTap", () =>
    {
        fire("pointerdown", 100, 100, { pointerType: "mouse", button: 1 });
        fire("pointerup", 100, 100, { pointerType: "mouse", button: 1 });

        expect(calls).toEqual(["onPress", "onRelease"]);
    });

    test("pointercancel_BeforeADrag_Releases_WithNoCancel", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointercancel", 0, 0);

        expect(calls).toEqual(["onPress", "onRelease"]);
    });

    test("pointercancel_DuringADrag_ReleasesAfterTheCancel", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointermove", 140, 100);
        fire("pointercancel", 0, 0);

        expect(calls).toEqual(["onPress", "onDragStart", "onDragMove", "onDragCancel", "onRelease"]);
    });

    test("aSecondFinger_ReleasesTheFirst_BeforeTheTwoFingerStart", () =>
    {
        fire("pointerdown", 100, 100);
        fire("pointerdown", 200, 100, { pointerId: 2, isPrimary: false });

        expect(calls).toEqual(["onPress", "onRelease", "onTwoFingerStart"]);
    });

    test("aPalm_WhileAPenIsDown_PressesNothing", () =>
    {
        fire("pointerdown", 100, 100, { pointerType: "pen" });
        fire("pointerdown", 300, 300, { pointerId: 2 });

        expect(calls).toEqual(["onPress"]);
    });

    test("aLostPointerup_ReleasesTheOldPress_BeforeTheNewOne", () =>
    {
        fire("pointerdown", 100, 100, { pointerType: "mouse" });
        fire("pointerdown", 200, 200, { pointerType: "mouse" });

        expect(calls).toEqual(["onPress", "onRelease", "onPress"]);
    });

    test("cancel_ReleasesThePress", () =>
    {
        fire("pointerdown", 100, 100);
        handle.cancel();

        expect(calls).toEqual(["onPress", "onRelease"]);
    });
});
