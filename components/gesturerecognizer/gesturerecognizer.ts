/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Created: 2026-11-15
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: GestureRecognizer
 * 📜 PURPOSE: The shared gesture recognizer of TOUCH_EXPERIENCE.md (section 9,
 *    item 3, and section 13, item 1). It turns the pointer events on one
 *    element into a tap, a double tap, a long press, a drag, and a
 *    two-finger gesture, with the thresholds of section 7. A component uses
 *    it instead of its own timers and thresholds (#182).
 * 🔗 RELATES: [[PointerGestureRegistry]], [[DiagramEngine]]
 * ⚡ FLOW: [pointer events] -> [createGestureRecognizer] -> [onTap, onDrag*,
 *          onTwoFinger*, ...] -> [component action]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[GestureRecognizer]";

const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;
// LOG-6. Read per call, never captured. See FRONTEND_LOGGING.md section 1.3.
function _dbg(): boolean
{
    const f = window.__ebt_debug_logging;
    return f === undefined ? LOCAL_HOSTS.test(location.hostname) : !!f;
}
function _trc(): boolean { return !!window.__ebt_trace_logging; }
function logInfo(...a: unknown[]): void
{
    _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}
function logWarn(...a: unknown[]): void
{
    _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a);
}
function logError(...a: unknown[]): void
{
    _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a);
}
function logDebug(...a: unknown[]): void
{
    _lu ? _lu.debug(...a) : _dbg() && console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}
function logTrace(...a: unknown[]): void
{
    _lu ? _lu.trace(...a) : _trc() && console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a);
}

// LOG-4a: the shim preamble is uniform across components; see InlineToolbar.
void [logInfo, logWarn, logError, logDebug, logTrace];

/**
 * The thresholds of TOUCH_EXPERIENCE.md section 7, in CSS pixels and
 * milliseconds. A component reads them from here and defines none of its
 * own. The recognizer uses the first five and the edge zone. The target
 * sizes, the automatic scroll zone and the pressed-state time are for the
 * component that uses it.
 */
export const GESTURE_THRESHOLDS = Object.freeze({
    /** A touch pointer that moves further than this is a drag, not a tap. */
    touchTolerance: 10,
    /** A mouse or pen pointer that moves further than this is a drag, not a click. */
    fineTolerance: 4,
    /** A touch pointer that stays down this long is a long press. */
    longPressMs: 500,
    /** The longest time between the two taps of a double tap. */
    doubleTapMs: 300,
    /** The longest distance between the two taps of a double tap. */
    doubleTapDistance: 24,
    /** The smallest target for a coarse pointer. */
    coarseTarget: 44,
    /** The smallest target for a fine pointer. */
    fineTarget: 24,
    /** A drag this close to the edge of a view scrolls the view. */
    autoScrollZone: 48,
    /** No touch gesture starts this close to the left or right screen edge. */
    edgeZone: 20,
    /** A pressed element shows its pressed state within this time. */
    pressedStateMs: 100,
});

/** The main button of a mouse or pen. */
const BUTTON_PRIMARY = 0;

/** The middle button of a mouse. A middle drag pans a zoomable surface. */
const BUTTON_MIDDLE = 1;

// ============================================================================
// INTERFACES
// ============================================================================

/** A one-pointer gesture: a tap, a double tap, a long press, or a drag. */
export interface PointerGesture
{
    /** `"touch"`, `"mouse"` or `"pen"`, from the event. */
    pointerType: string;
    /** The pointer's position now, in client coordinates. */
    x: number;
    y: number;
    /** Where the pointer went down, in client coordinates. */
    startX: number;
    startY: number;
    /** The button that went down: 0 for the main button, 1 for the middle one. */
    button: number;
    /** The event that produced this report, for its target and modifier keys. */
    event: PointerEvent;
}

/** A drag. It starts once the pointer moves further than the tolerance. */
export interface DragGesture extends PointerGesture
{
    /** True when the drag began after a long press. */
    afterLongPress: boolean;
}

/** A two-finger gesture. It reports the pan and the zoom together. */
export interface TwoFingerGesture
{
    /** The midpoint of the two fingers now, in client coordinates. */
    centerX: number;
    centerY: number;
    /** The midpoint when the gesture started. */
    startCenterX: number;
    startCenterY: number;
    /** The distance between the fingers now, divided by the distance at the start. */
    scale: number;
    /** The event that produced this report. */
    event: PointerEvent;
}

/** The callbacks, and the filter. Every member is optional. */
export interface GestureRecognizerOptions
{
    /** A tap, or a click of the main button. */
    onTap?: (gesture: PointerGesture) => void;
    /** A second tap within the time and the distance. It comes after that tap's `onTap`. */
    onDoubleTap?: (gesture: PointerGesture) => void;
    /** A touch pointer held still for the long-press time. No tap follows it. */
    onLongPress?: (gesture: PointerGesture) => void;
    /** A drag starts. An `onDragMove` to the same position follows at once. */
    onDragStart?: (gesture: DragGesture) => void;
    /** The dragged pointer moves. */
    onDragMove?: (gesture: DragGesture) => void;
    /** The dragged pointer lifts. */
    onDragEnd?: (gesture: DragGesture) => void;
    /**
     * The drag stops without an end: a `pointercancel`, a second finger, or
     * `cancel()`. Restore the state from before the drag (section 9, item 5).
     */
    onDragCancel?: (gesture: DragGesture) => void;
    /** Two touch pointers are down. */
    onTwoFingerStart?: (gesture: TwoFingerGesture) => void;
    /** One of the two fingers moves. */
    onTwoFingerMove?: (gesture: TwoFingerGesture) => void;
    /** One of the two fingers lifts. */
    onTwoFingerEnd?: (gesture: TwoFingerGesture) => void;
    /** A `pointercancel` or `cancel()` stops the two-finger gesture. */
    onTwoFingerCancel?: (gesture: TwoFingerGesture) => void;
    /**
     * Returns false for a pointer the recognizer must leave alone, such as
     * a press inside an embedded control that handles its own drags.
     */
    accept?: (event: PointerEvent) => boolean;
}

/** What `createGestureRecognizer` returns. */
export interface GestureRecognizerHandle
{
    /** The thresholds of section 7. */
    readonly thresholds: typeof GESTURE_THRESHOLDS;
    /** Cancels the gesture in progress, with `onDragCancel` or `onTwoFingerCancel`. */
    cancel(): void;
    /** Removes the listeners and the timer. Safe to call more than once. */
    destroy(): void;
}

/** One pointer that is down. */
interface Tracked
{
    id: number;
    type: string;
    button: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
}

/** Where the one-pointer gesture is. */
type Phase = "pressed" | "longPressed" | "dragging";

/** The last tap, for a double tap. */
interface LastTap
{
    type: string;
    x: number;
    y: number;
    time: number;
}

/** The two fingers of a two-finger gesture. */
interface Pair
{
    a: Tracked;
    b: Tracked;
    startCenterX: number;
    startCenterY: number;
    startDistance: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/** The movement that turns a press into a drag, for this pointer type. */
function toleranceFor(type: string): number
{
    return type === "touch" ? GESTURE_THRESHOLDS.touchTolerance : GESTURE_THRESHOLDS.fineTolerance;
}

/** The distance between two points. */
function distance(ax: number, ay: number, bx: number, by: number): number
{
    return Math.hypot(ax - bx, ay - by);
}

/** True when a touch at this x starts in the edge zone the browser keeps for navigation. */
function inEdgeZone(x: number): boolean
{
    return x < GESTURE_THRESHOLDS.edgeZone || x > window.innerWidth - GESTURE_THRESHOLDS.edgeZone;
}

// ============================================================================
// RECOGNIZER
// ============================================================================

/**
 * Recognizes the gestures of TOUCH_EXPERIENCE.md on one element. The
 * component declares the element's `touch-action` itself (section 9, item 7).
 *
 * @param element The surface whose pointer events to read.
 * @param options The callbacks, and the `accept` filter.
 * @returns A handle to cancel the gesture in progress, or to stop.
 */
export function createGestureRecognizer(
    element: Element,
    options: GestureRecognizerOptions
): GestureRecognizerHandle
{
    if (!element)
    {
        throw new Error(`${LOG_PREFIX} createGestureRecognizer: an element is required. `
            + "Pass the element whose pointer events it reads.");
    }

    /** Each touch pointer that is down, including one ignored as a palm. */
    const touches = new Map<number, Tracked>();
    /** The pointer of the one-pointer gesture, or null. */
    let primary: Tracked | null = null;
    let phase: Phase = "pressed";
    let pair: Pair | null = null;
    let lastTap: LastTap | null = null;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    /** Whether the drag in progress began after a long press. */
    let dragAfterLongPress = false;
    /** The latest event, which the long-press timer and cancel() report with. */
    let lastEvent: PointerEvent | null = null;
    let destroyed = false;

    // ── Reports ──

    function pointerGesture(t: Tracked, event: PointerEvent): PointerGesture
    {
        return { pointerType: t.type, x: t.x, y: t.y, startX: t.startX, startY: t.startY,
            button: t.button, event };
    }

    function dragGesture(t: Tracked, event: PointerEvent, afterLongPress: boolean): DragGesture
    {
        return { ...pointerGesture(t, event), afterLongPress };
    }

    function twoFingerGesture(p: Pair, event: PointerEvent): TwoFingerGesture
    {
        return {
            centerX: (p.a.x + p.b.x) / 2,
            centerY: (p.a.y + p.b.y) / 2,
            startCenterX: p.startCenterX,
            startCenterY: p.startCenterY,
            scale: distance(p.a.x, p.a.y, p.b.x, p.b.y) / p.startDistance,
            event,
        };
    }

    // ── One-pointer gesture ──

    function clearLongPress(): void
    {
        if (longPressTimer !== null)
        {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }

    function startPrimary(t: Tracked): void
    {
        primary = t;
        phase = "pressed";
        dragAfterLongPress = false;

        if (t.type === "touch")
        {
            longPressTimer = setTimeout(onLongPressTime, GESTURE_THRESHOLDS.longPressMs);
        }
    }

    function onLongPressTime(): void
    {
        longPressTimer = null;

        if (!primary || phase !== "pressed") { return; }

        phase = "longPressed";
        lastTap = null;
        logDebug("Long press at", primary.x, primary.y);
        options.onLongPress?.(pointerGesture(primary, lastEvent!));
    }

    /**
     * Ends the one-pointer gesture with no end report. A drag in progress
     * reports `onDragCancel`. The state is cleared first, so a callback that
     * throws still leaves the recognizer ready for the next gesture.
     */
    function abandonPrimary(event: PointerEvent, reason: string): void
    {
        const t = primary;
        const wasDragging = phase === "dragging";

        clearLongPress();
        primary = null;

        if (t && wasDragging)
        {
            logDebug("Drag cancelled:", reason);
            options.onDragCancel?.(dragGesture(t, event, dragAfterLongPress));
        }
    }

    function moveAndMaybeDrag(t: Tracked, event: PointerEvent): void
    {
        if (phase === "dragging")
        {
            logTrace("Drag move", t.x, t.y);
            options.onDragMove?.(dragGesture(t, event, dragAfterLongPress));
            return;
        }

        if (distance(t.x, t.y, t.startX, t.startY) <= toleranceFor(t.type)) { return; }

        clearLongPress();
        dragAfterLongPress = phase === "longPressed";
        phase = "dragging";
        lastTap = null;
        element.setPointerCapture(t.id);
        logDebug("Drag start", t.type, "after long press:", dragAfterLongPress);
        options.onDragStart?.(dragGesture(t, event, dragAfterLongPress));
        options.onDragMove?.(dragGesture(t, event, dragAfterLongPress));
    }

    function liftPrimary(t: Tracked, event: PointerEvent): void
    {
        const lifted = phase;

        clearLongPress();
        primary = null;

        if (lifted === "dragging")
        {
            logDebug("Drag end");
            options.onDragEnd?.(dragGesture(t, event, dragAfterLongPress));
            return;
        }

        if (lifted === "pressed" && t.button === BUTTON_PRIMARY)
        {
            tap(t, event);
        }
    }

    function tap(t: Tracked, event: PointerEvent): void
    {
        const now = performance.now();
        const prior = lastTap;
        const isDouble = prior !== null
            && prior.type === t.type
            && now - prior.time <= GESTURE_THRESHOLDS.doubleTapMs
            && distance(prior.x, prior.y, t.x, t.y) <= GESTURE_THRESHOLDS.doubleTapDistance;

        lastTap = isDouble ? null : { type: t.type, x: t.x, y: t.y, time: now };
        options.onTap?.(pointerGesture(t, event));

        if (isDouble)
        {
            logDebug("Double tap");
            options.onDoubleTap?.(pointerGesture(t, event));
        }
    }

    // ── Two-finger gesture ──

    function startPair(a: Tracked, b: Tracked, event: PointerEvent): void
    {
        a.startX = a.x;
        a.startY = a.y;
        b.startX = b.x;
        b.startY = b.y;
        pair = {
            a, b,
            startCenterX: (a.x + b.x) / 2,
            startCenterY: (a.y + b.y) / 2,
            // Two fingers on one spot would divide by zero.
            startDistance: Math.max(1, distance(a.x, a.y, b.x, b.y)),
        };
        lastTap = null;
        element.setPointerCapture(a.id);
        element.setPointerCapture(b.id);
        logDebug("Two-finger start");
        options.onTwoFingerStart?.(twoFingerGesture(pair, event));
    }

    function endPair(event: PointerEvent, cancelled: boolean): void
    {
        const p = pair!;

        pair = null;
        logDebug(cancelled ? "Two-finger cancelled" : "Two-finger end");

        if (cancelled)
        {
            options.onTwoFingerCancel?.(twoFingerGesture(p, event));
        }
        else
        {
            options.onTwoFingerEnd?.(twoFingerGesture(p, event));
        }
    }

    function inPair(id: number): boolean
    {
        return pair !== null && (pair.a.id === id || pair.b.id === id);
    }

    // ── Listeners ──

    function onPointerDown(e: PointerEvent): void
    {
        if (options.accept && !options.accept(e))
        {
            logDebug("Pointer refused by accept:", e.pointerType, e.pointerId);
            return;
        }

        lastEvent = e;

        const t: Tracked = { id: e.pointerId, type: e.pointerType, button: e.button,
            startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY };

        if (primary && primary.id === e.pointerId)
        {
            // Its pointerup landed outside the element before any capture.
            logDebug("Pointer", e.pointerId, "went down again; dropping its old press");
            abandonPrimary(e, "lost pointerup");
        }

        if (e.pointerType === "touch")
        {
            downTouch(t, e);
            return;
        }

        if (e.button !== BUTTON_PRIMARY && e.button !== BUTTON_MIDDLE)
        {
            // The pen barrel and the secondary button are the context menu,
            // which the component reads from `contextmenu` (section 9, item 8).
            return;
        }

        if (primary || pair)
        {
            logDebug("Ignored", e.pointerType, "pointer: a gesture is in progress");
            return;
        }

        startPrimary(t);
    }

    function downTouch(t: Tracked, e: PointerEvent): void
    {
        if (pair)
        {
            logDebug("Ignored a third finger");
            return;
        }

        if (touches.size === 0 && !primary && inEdgeZone(e.clientX))
        {
            logDebug("Ignored a touch in the edge zone at x =", e.clientX);
            return;
        }

        touches.set(t.id, t);

        if (touches.size === 2)
        {
            const [a, b] = [...touches.values()];

            // Two fingers change the view, never the content (rule 1).
            abandonPrimary(e, "a second finger");
            startPair(a, b, e);
            return;
        }

        if (primary)
        {
            // A palm while a pen or a mouse is down (section 5).
            logDebug("Ignored a touch while a", primary.type, "pointer is down");
            return;
        }

        startPrimary(t);
    }

    function onPointerMove(e: PointerEvent): void
    {
        const touch = touches.get(e.pointerId);

        if (touch)
        {
            touch.x = e.clientX;
            touch.y = e.clientY;
        }

        if (inPair(e.pointerId))
        {
            logTrace("Two-finger move");
            options.onTwoFingerMove?.(twoFingerGesture(pair!, e));
            return;
        }

        if (!primary || primary.id !== e.pointerId) { return; }

        lastEvent = e;
        primary.x = e.clientX;
        primary.y = e.clientY;
        moveAndMaybeDrag(primary, e);
    }

    function onPointerUp(e: PointerEvent): void
    {
        touches.delete(e.pointerId);

        if (inPair(e.pointerId))
        {
            endPair(e, false);
            return;
        }

        if (!primary || primary.id !== e.pointerId) { return; }

        primary.x = e.clientX;
        primary.y = e.clientY;
        liftPrimary(primary, e);
    }

    function onPointerCancel(e: PointerEvent): void
    {
        touches.delete(e.pointerId);

        if (inPair(e.pointerId))
        {
            endPair(e, true);
            return;
        }

        if (!primary || primary.id !== e.pointerId) { return; }

        // The cancel event's own position is not where the pointer was, so
        // the report keeps the last position.
        abandonPrimary(e, "pointercancel");
    }

    element.addEventListener("pointerdown", onPointerDown as EventListener);
    element.addEventListener("pointermove", onPointerMove as EventListener);
    element.addEventListener("pointerup", onPointerUp as EventListener);
    element.addEventListener("pointercancel", onPointerCancel as EventListener);
    logDebug("Created");

    return {
        thresholds: GESTURE_THRESHOLDS,

        cancel(): void
        {
            if (pair)
            {
                endPair(lastEvent!, true);
            }
            else if (primary)
            {
                abandonPrimary(lastEvent!, "cancel()");
            }
        },

        destroy(): void
        {
            if (destroyed) { return; }

            destroyed = true;
            clearLongPress();
            primary = null;
            pair = null;
            touches.clear();
            element.removeEventListener("pointerdown", onPointerDown as EventListener);
            element.removeEventListener("pointermove", onPointerMove as EventListener);
            element.removeEventListener("pointerup", onPointerUp as EventListener);
            element.removeEventListener("pointercancel", onPointerCancel as EventListener);
            logDebug("Destroyed");
        },
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.createGestureRecognizer = createGestureRecognizer;
