/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: DiagramEngine pointer input (#176, #184). The canvas reads its
 * pointer events through GestureRecognizer and follows TOUCH_EXPERIENCE.md:
 * the movement tolerance, a finger on the background pans, two fingers pan
 * and zoom and touch no object, a second finger or a pointercancel puts a
 * drag back, and a palm is ignored while a pen is down. A mouse presses
 * the tool at once. An interactive embed keeps its own pointer.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createDiagramEngine } from "./diagramengine";
// DiagramEngine reads `window.createGestureRecognizer`, and this registers the real one.
import "../gesturerecognizer/gesturerecognizer";

type Engine = ReturnType<typeof createDiagramEngine>;

let host: HTMLDivElement;
let engine: Engine;
let svg: SVGSVGElement;

/** One pointer event on the canvas, or on `target` inside it. */
function pointer(type: string, x: number, y: number,
    init: PointerEventInit = {}, target: Element = svg): void
{
    target.dispatchEvent(new PointerEvent(type, {
        bubbles: true, pointerId: 1, isPrimary: true, pointerType: "touch", button: 0,
        clientX: x, clientY: y, ...init,
    }));
}

/** A canvas with one box at (50, 50), 100 by 60. */
function createWithBox(id: string): Engine
{
    const created = createDiagramEngine(id, {});

    created.addObject({ id: "box", presentation: { shape: "rectangle",
        bounds: { x: 50, y: 50, width: 100, height: 60 } } });

    return created;
}

beforeEach(() =>
{
    host = document.createElement("div");
    host.id = "de-pointer-" + Math.random().toString(36).slice(2, 8);
    document.body.appendChild(host);
    engine = createWithBox(host.id);
    svg = host.querySelector("svg")!;
    // jsdom has no pointer capture.
    svg.setPointerCapture = vi.fn();
});

afterEach(() =>
{
    engine.destroy();
    host.remove();
});

/** The box's bounds. */
function box(): { x: number; y: number; width: number; height: number }
{
    return { ...engine.getObjectById("box")!.presentation.bounds };
}

function selected(): string[]
{
    return engine.getSelectedObjects().map((o) => o.id);
}

const MOUSE = { pointerType: "mouse" };
const SECOND = { pointerId: 2, isPrimary: false };

describe("DiagramEngine pointer input (#176, #184)", () =>
{
    test("theFactory_WithoutGestureRecognizer_SaysWhatToLoad", () =>
    {
        const w = window as { createGestureRecognizer?: unknown };
        const real = w.createGestureRecognizer;

        delete w.createGestureRecognizer;

        try
        {
            expect(() => createDiagramEngine(host.id, {}))
                .toThrow(/Load components\/gesturerecognizer\/gesturerecognizer\.js before diagramengine\.js/);
        }
        finally
        {
            w.createGestureRecognizer = real;
        }
    });

    test("aTouchDrag_OnAnObject_MovesIt_AndCapturesThePointer", () =>
    {
        pointer("pointerdown", 100, 80, { pointerId: 7 });
        pointer("pointermove", 140, 100, { pointerId: 7 });
        pointer("pointerup", 140, 100, { pointerId: 7 });

        expect(box()).toMatchObject({ x: 90, y: 70 });
        expect(engine.canUndo()).toBe(true);
        expect(svg.setPointerCapture).toHaveBeenCalledWith(7);
    });

    test("aTouchWithinTheTolerance_MovesNothing_AndTapsToSelect", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 106, 86);

        expect(selected()).toEqual([]);

        pointer("pointerup", 106, 86);

        expect(box()).toMatchObject({ x: 50, y: 50 });
        expect(selected()).toEqual(["box"]);
        expect(engine.canUndo()).toBe(false);
    });

    test("aMousePress_SelectsAtOnce_AndMovesOnlyPastFourPixels", () =>
    {
        pointer("pointerdown", 100, 80, MOUSE);

        expect(selected()).toEqual(["box"]);

        pointer("pointermove", 103, 80, MOUSE);

        expect(box().x).toBe(50);

        pointer("pointermove", 120, 80, MOUSE);
        pointer("pointerup", 120, 80, MOUSE);

        expect(box().x).toBe(70);
    });

    test("aTouchDrag_OnTheBackground_PansTheView_AndKeepsTheSelection", () =>
    {
        engine.select(["box"]);
        pointer("pointerdown", 300, 300);
        pointer("pointermove", 340, 320);
        pointer("pointermove", 350, 330);
        pointer("pointerup", 350, 330);

        expect(engine.getViewport()).toMatchObject({ x: 50, y: 30, zoom: 1 });
        expect(box()).toMatchObject({ x: 50, y: 50 });
        expect(selected()).toEqual(["box"]);
    });

    test("aTouchTap_OnTheBackground_ClearsTheSelection", () =>
    {
        engine.select(["box"]);
        pointer("pointerdown", 300, 300);
        pointer("pointerup", 300, 300);

        expect(selected()).toEqual([]);
    });

    test("aMouseDrag_OnTheBackground_DrawsTheSelectionRectangle", () =>
    {
        pointer("pointerdown", 10, 10, MOUSE);
        pointer("pointermove", 200, 200, MOUSE);
        pointer("pointerup", 200, 200, MOUSE);

        expect(selected()).toEqual(["box"]);
        expect(engine.getViewport()).toMatchObject({ x: 0, y: 0 });
    });

    test("aLongPress_ThenADrag_OnTheBackground_DrawsTheSelectionRectangle", () =>
    {
        vi.useFakeTimers();

        try
        {
            // Clear of the 20 px edge zone, where a touch starts nothing.
            pointer("pointerdown", 30, 30);
            vi.advanceTimersByTime(500);
            pointer("pointermove", 200, 200);
            pointer("pointerup", 200, 200);
        }
        finally
        {
            vi.useRealTimers();
        }

        expect(selected()).toEqual(["box"]);
        expect(engine.getViewport()).toMatchObject({ x: 0, y: 0 });
    });

    test("twoFingers_PanAndZoomAtOnce_AndTouchNoObject", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointerdown", 200, 80, SECOND);

        // The spread doubles, and the center moves 50 to the right.
        pointer("pointermove", 300, 80, SECOND);
        pointer("pointerup", 300, 80, SECOND);
        pointer("pointerup", 100, 80);

        // The view pans 50 with the center, then doubles about (200, 80).
        expect(engine.getViewport()).toEqual({ x: -100, y: -80, zoom: 2 });
        expect(box()).toMatchObject({ x: 50, y: 50 });
        expect(selected()).toEqual([]);
        expect(engine.canUndo()).toBe(false);
    });

    test("aSecondFinger_DuringADrag_PutsTheObjectBack_ThenPinches", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);

        expect(box().x).toBe(90);

        pointer("pointerdown", 300, 100, SECOND);

        expect(box()).toMatchObject({ x: 50, y: 50 });

        pointer("pointermove", 200, 100);
        pointer("pointermove", 400, 100, SECOND);
        pointer("pointerup", 400, 100, SECOND);
        pointer("pointerup", 200, 100);

        expect(box()).toMatchObject({ x: 50, y: 50 });
        expect(engine.canUndo()).toBe(false);
        expect(engine.getZoomLevel()).toBeCloseTo(200 / 160);
    });

    test("pointercancel_DuringADrag_PutsTheObjectBack_WithNoUndo", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);
        pointer("pointercancel", 0, 0);
        pointer("pointermove", 300, 300);

        expect(box()).toMatchObject({ x: 50, y: 50 });
        expect(engine.canUndo()).toBe(false);
    });

    test("pointercancel_DuringASelectionRectangle_SelectsNothing", () =>
    {
        pointer("pointerdown", 10, 10, MOUSE);
        pointer("pointermove", 200, 200, MOUSE);
        pointer("pointercancel", 0, 0, MOUSE);

        expect(selected()).toEqual([]);
        expect(svg.querySelector(".de-tool-overlay")?.childElementCount ?? 0).toBe(0);
    });

    test("aPalm_WhileAPenIsDown_DoesNothing", () =>
    {
        const pen = { pointerId: 5, pointerType: "pen" };
        const palm = { pointerId: 6, isPrimary: true };

        pointer("pointerdown", 100, 80, pen);
        pointer("pointerdown", 300, 300, palm);
        pointer("pointermove", 400, 400, palm);
        pointer("pointermove", 140, 100, pen);
        pointer("pointerup", 400, 400, palm);
        pointer("pointerup", 140, 100, pen);

        expect(box()).toMatchObject({ x: 90, y: 70 });
        expect(engine.getViewport()).toMatchObject({ x: 0, y: 0, zoom: 1 });
    });

    test("aDoubleTap_OnAnObject_EditsItsText", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointerup", 100, 80);
        pointer("pointerdown", 102, 81);
        pointer("pointerup", 102, 81);

        expect(host.querySelector(".de-inline-edit")).not.toBeNull();
    });

    test("aMiddleDrag_PansWithAnyTool_AndTheSelectToolComesBack", () =>
    {
        const middle = { pointerType: "mouse", button: 1 };

        pointer("pointerdown", 100, 80, middle);
        pointer("pointermove", 140, 100, middle);
        pointer("pointerup", 140, 100, middle);

        expect(engine.getViewport()).toMatchObject({ x: 40, y: 20 });
        expect(box()).toMatchObject({ x: 50, y: 50 });
        expect(engine.getActiveTool()).toBe("select");
    });

    test("anInteractiveEmbed_KeepsItsPointer_AndAPressOutsideEndsIt", async () =>
    {
        (window as unknown as Record<string, unknown>).createPointerTestWidget =
            () => ({ getElement: () => document.createElement("div") });
        engine.registerEmbeddableComponent("pointer-test-widget", {
            factory: "createPointerTestWidget",
            label: "Pointer Test Widget",
            icon: "bi-puzzle",
            category: "data",
            defaultOptions: {},
            defaultSize: { w: 200, h: 100 },
        });
        engine.addObject({ id: "widget", presentation: { shape: "rectangle",
            bounds: { x: 300, y: 300, width: 200, height: 100 },
            embed: { component: "pointer-test-widget", options: {} } } });
        engine.toggleEmbedInteractive("widget");

        const inside = svg.querySelector('[data-embed-id="widget"]')!;
        const interactive = (): boolean =>
            (inside.querySelector(".de-embed-container") as HTMLElement).style.pointerEvents === "auto";

        expect(interactive()).toBe(true);

        pointer("pointerdown", 400, 350, {}, inside);
        pointer("pointermove", 450, 350, {}, inside);
        pointer("pointerup", 450, 350, {}, inside);

        expect(svg.setPointerCapture).not.toHaveBeenCalled();
        expect(engine.getObjectById("widget")!.presentation.bounds.x).toBe(300);
        expect(interactive()).toBe(true);

        pointer("pointerdown", 30, 30);
        pointer("pointerup", 30, 30);

        expect(interactive()).toBe(false);

        // The embed mounts from a requestAnimationFrame callback, so the
        // factory stays until that has run.
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        delete (window as unknown as Record<string, unknown>).createPointerTestWidget;
    });
});

describe("DiagramEngine auto-scroll, return and Space (#184)", () =>
{
    /** jsdom gives the canvas no size, so these tests give it 400 by 300. */
    function sizeCanvas(): void
    {
        svg.getBoundingClientRect = () => new DOMRect(0, 0, 400, 300);
    }

    function boxTransform(): string | null
    {
        return svg.querySelector('[data-id="box"]')!.getAttribute("transform");
    }

    function key(type: string, k: string, target: Element = svg): void
    {
        target.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
    }

    beforeEach(() =>
    {
        vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] });
        sizeCanvas();
    });

    afterEach(() =>
    {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    test("aStillDrag_NearTheRightEdge_ScrollsTheView_AndKeepsTheBoxUnderThePointer", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 390, 80);

        expect(box().x).toBe(340);

        vi.advanceTimersByTime(200);

        const vp = engine.getViewport();

        // 10 px from the edge, the view moves left at most of the full speed.
        expect(vp.x).toBeLessThan(-100);
        expect(vp.y).toBe(0);
        // The point under the pointer is (390 - vp.x) in the canvas, and
        // the box moved with it from where the press grabbed it.
        expect(box().x).toBeCloseTo(50 + (390 - vp.x) - 100);

        pointer("pointerup", 390, 80);
        vi.advanceTimersByTime(200);

        expect(engine.getViewport().x).toBe(vp.x);
        expect(engine.canUndo()).toBe(true);
    });

    test("aDrag_PastTheEdge_ScrollsAtTheFullSpeed", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 100, 400);
        vi.advanceTimersByTime(500);
        pointer("pointerup", 100, 400);

        // 960 px a second, so half a second moves about 480.
        expect(engine.getViewport().y).toBeCloseTo(-480, -1);
        expect(engine.getViewport().x).toBe(0);
    });

    test("aSlowFrame_ScrollsNoMoreThanFiftyMilliseconds", () =>
    {
        const frames: FrameRequestCallback[] = [];

        vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => frames.push(cb));
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 100, 400);
        // The first frame counts as one 60 Hz frame, so 16 px.
        frames.shift()!(1000);
        // A tab that comes back after two seconds counts 50 ms, so 48 px.
        frames.shift()!(3000);

        expect(engine.getViewport().y).toBeCloseTo(-64);
    });

    test("aStillDrag_AwayFromTheEdge_DoesNotScroll", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 200, 150);
        vi.advanceTimersByTime(200);

        expect(engine.getViewport()).toMatchObject({ x: 0, y: 0 });
    });

    test("aBackgroundPan_NearTheEdge_DoesNotAutoScroll", () =>
    {
        pointer("pointerdown", 300, 250);
        pointer("pointermove", 390, 250);
        vi.advanceTimersByTime(200);

        expect(engine.getViewport()).toMatchObject({ x: 90, y: 0 });
    });

    test("aSecondFinger_StopsTheAutoScroll", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 390, 80);
        vi.advanceTimersByTime(100);
        pointer("pointerdown", 200, 150, SECOND);

        const x = engine.getViewport().x;

        vi.advanceTimersByTime(200);

        expect(engine.getViewport().x).toBe(x);
        expect(box()).toMatchObject({ x: 50, y: 50 });
    });

    test("aCancelledMove_SlidesBack_AndEndsAtTheStart", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);
        pointer("pointercancel", 140, 100);

        // The document is back at once. The drawing starts where the drag left it.
        expect(box()).toMatchObject({ x: 50, y: 50 });
        expect(boxTransform()).toBe("translate(40, 20) translate(50, 50)");

        vi.advanceTimersByTime(80);

        const [, dx] = /^translate\(([\d.]+), [\d.]+\)/.exec(boxTransform()!)!;

        expect(Number(dx)).toBeGreaterThan(0);
        expect(Number(dx)).toBeLessThan(40);

        vi.advanceTimersByTime(200);

        expect(boxTransform()).toBe("translate(50, 50)");
    });

    test("aCancelledMove_WithReducedMotion_Snaps", () =>
    {
        vi.spyOn(window, "matchMedia").mockImplementation((query) =>
            ({ matches: query === "(prefers-reduced-motion: reduce)" }) as MediaQueryList);

        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);
        pointer("pointercancel", 140, 100);

        expect(boxTransform()).toBe("translate(50, 50)");
    });

    test("aPress_DuringTheReturn_EndsIt", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);
        pointer("pointercancel", 140, 100);
        pointer("pointerdown", 300, 250, MOUSE);

        expect(boxTransform()).toBe("translate(50, 50)");
    });

    test("aCancelledResize_Snaps", () =>
    {
        engine.select(["box"]);
        // The top-left handle is at (50, 50). Its drag moves the box and changes its size.
        pointer("pointerdown", 50, 50, MOUSE);
        pointer("pointermove", 30, 40, MOUSE);

        expect(box()).toMatchObject({ x: 30, y: 40 });

        pointer("pointercancel", 30, 40, MOUSE);

        expect(box()).toMatchObject({ x: 50, y: 50, width: 100, height: 60 });
        expect(boxTransform()).toBe("translate(50, 50)");
    });

    test("spaceAndAPrimaryDrag_PansWithAnyTool_AndTheToolComesBack", () =>
    {
        engine.setActiveTool("draw");
        key("keydown", " ");
        pointer("pointerdown", 100, 80, MOUSE);
        pointer("pointermove", 140, 100, MOUSE);
        pointer("pointerup", 140, 100, MOUSE);

        expect(engine.getViewport()).toMatchObject({ x: 40, y: 20 });
        expect(engine.getObjects()).toHaveLength(1);
        expect(engine.getActiveTool()).toBe("draw");
    });

    test("aSpacePan_NearTheEdge_DoesNotAutoScroll", () =>
    {
        key("keydown", " ");
        pointer("pointerdown", 300, 150, MOUSE);
        pointer("pointermove", 390, 150, MOUSE);
        vi.advanceTimersByTime(200);

        expect(engine.getViewport()).toMatchObject({ x: 90, y: 0 });
    });

    test("spaceUp_OrABlur_EndsThePan", () =>
    {
        key("keydown", " ");
        key("keyup", " ");
        pointer("pointerdown", 100, 80, MOUSE);
        pointer("pointermove", 140, 100, MOUSE);
        pointer("pointerup", 140, 100, MOUSE);

        expect(box()).toMatchObject({ x: 90, y: 70 });

        key("keydown", " ");
        svg.dispatchEvent(new FocusEvent("blur"));
        pointer("pointerdown", 100, 80, MOUSE);
        pointer("pointermove", 140, 100, MOUSE);
        pointer("pointerup", 140, 100, MOUSE);

        expect(box()).toMatchObject({ x: 130, y: 90 });
        expect(engine.getViewport()).toMatchObject({ x: 0, y: 0 });
    });

    test("spaceInAnElementInsideTheCanvas_IsThatElementsKey", () =>
    {
        const field = document.createElement("div");

        svg.appendChild(field);

        const typed = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });

        field.dispatchEvent(typed);
        pointer("pointerdown", 100, 80, MOUSE);
        pointer("pointermove", 140, 100, MOUSE);
        pointer("pointerup", 140, 100, MOUSE);

        expect(typed.defaultPrevented).toBe(false);
        expect(box()).toMatchObject({ x: 90, y: 70 });
    });
});

describe("DiagramEngine embedded canvas (#184)", () =>
{
    /** Replaces the canvas with an embedded one that has the same box. */
    function embed(): void
    {
        engine.destroy();
        host.replaceChildren();
        engine = createDiagramEngine(host.id, { embedded: true });
        engine.addObject({ id: "box", presentation: { shape: "rectangle",
            bounds: { x: 50, y: 50, width: 100, height: 60 } } });
        svg = host.querySelector("svg")!;
        svg.setPointerCapture = vi.fn();
    }

    function inactive(): boolean
    {
        return svg.classList.contains("de-canvas-inactive");
    }

    function wheel(): WheelEvent
    {
        const e = new WheelEvent("wheel", { deltaY: -100, clientX: 100, clientY: 80, bubbles: true, cancelable: true });

        svg.dispatchEvent(e);
        return e;
    }

    test("aCanvas_IsActive_UnlessEmbedded", () =>
    {
        expect(inactive()).toBe(false);

        embed();

        expect(inactive()).toBe(true);
    });

    test("anInactiveCanvas_LeavesTheWheelToThePage", () =>
    {
        embed();

        expect(wheel().defaultPrevented).toBe(false);
        expect(engine.getZoomLevel()).toBe(1);
    });

    test("anInactiveCanvas_IgnoresATouchDrag_AndTwoFingers", () =>
    {
        embed();
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);
        pointer("pointerup", 140, 100);

        pointer("pointerdown", 250, 200);
        pointer("pointerdown", 300, 200, SECOND);
        pointer("pointermove", 350, 200, SECOND);
        pointer("pointerup", 350, 200, SECOND);
        pointer("pointerup", 250, 200);

        expect(box()).toMatchObject({ x: 50, y: 50 });
        expect(engine.getViewport()).toEqual({ x: 0, y: 0, zoom: 1 });
        expect(inactive()).toBe(true);
    });

    test("aFirstTap_OnlyActivates_AndTheNextTapSelects", () =>
    {
        embed();
        pointer("pointerdown", 100, 80);
        pointer("pointerup", 100, 80);

        expect(inactive()).toBe(false);
        expect(selected()).toEqual([]);
        expect(document.activeElement).toBe(svg);

        pointer("pointerdown", 100, 80);
        pointer("pointerup", 100, 80);

        expect(selected()).toEqual(["box"]);
    });

    test("aTouchDrag_OnAnInactiveCanvas_ReachesNoTool", () =>
    {
        embed();

        const tool = engine.getToolInstance("select") as { onMouseMove: () => void };
        const moved = vi.spyOn(tool, "onMouseMove");

        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);
        pointer("pointermove", 160, 110);
        pointer("pointerup", 160, 110);

        expect(moved).not.toHaveBeenCalled();
    });

    test("aMouseClick_AfterTheActivatingTap_IsAWholeClick", () =>
    {
        embed();
        pointer("pointerdown", 100, 80);
        pointer("pointerup", 100, 80);

        const tool = engine.getToolInstance("select") as { onMouseUp: () => void };
        const lifted = vi.spyOn(tool, "onMouseUp");

        pointer("pointerdown", 100, 80, MOUSE);
        pointer("pointerup", 100, 80, MOUSE);

        expect(selected()).toEqual(["box"]);
        expect(lifted).toHaveBeenCalledTimes(1);
    });

    test("aMousePress_ActivatesAndSelects", () =>
    {
        embed();
        pointer("pointerdown", 100, 80, MOUSE);
        pointer("pointerup", 100, 80, MOUSE);

        expect(inactive()).toBe(false);
        expect(selected()).toEqual(["box"]);
        expect(wheel().defaultPrevented).toBe(true);
    });

    test("keyboardFocus_Activates_AndFocusLeavingTheHost_Deactivates", () =>
    {
        embed();

        const outside = document.createElement("button");

        document.body.appendChild(outside);
        svg.focus();

        expect(inactive()).toBe(false);

        outside.focus();

        expect(inactive()).toBe(true);
        outside.remove();
    });

    test("focusMovingWithinTheHost_KeepsTheCanvasActive", () =>
    {
        embed();

        const editor = document.createElement("textarea");

        host.appendChild(editor);
        svg.focus();
        editor.focus();

        expect(inactive()).toBe(false);
    });

    test("escape_Deactivates_AnEmbeddedCanvas_Only", () =>
    {
        svg.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

        expect(inactive()).toBe(false);

        embed();
        svg.focus();
        svg.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

        expect(inactive()).toBe(true);
    });

    test("aCanvasThatIsNotEmbedded_StaysActive_WhenFocusLeaves", () =>
    {
        const outside = document.createElement("button");

        document.body.appendChild(outside);
        svg.focus();
        outside.focus();

        expect(inactive()).toBe(false);
        outside.remove();
    });
});

describe("DiagramEngine interaction mode (#184)", () =>
{
    /** Replaces the canvas with one in these options, with the same box. */
    function remake(opts: Parameters<typeof createDiagramEngine>[1]): void
    {
        engine.destroy();
        host.replaceChildren();
        engine = createDiagramEngine(host.id, opts);
        engine.addObject({ id: "box", presentation: { shape: "rectangle",
            bounds: { x: 50, y: 50, width: 100, height: 60 } } });
        svg = host.querySelector("svg")!;
        svg.setPointerCapture = vi.fn();
    }

    function key(k: string, init: KeyboardEventInit = {}): void
    {
        svg.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, ...init }));
    }

    /** The parts drawn for the box's selection: the outline, then any handles. */
    function selectionParts(): number
    {
        return svg.querySelector('[data-selection-id="box"]')?.childElementCount ?? 0;
    }

    test("theMode_IsEdit_ByDefault_AndEditableFalseMeansView", () =>
    {
        expect(engine.getInteractionMode()).toBe("edit");

        remake({ editable: false });

        expect(engine.getInteractionMode()).toBe("view");
        expect(svg.getAttribute("data-interaction-mode")).toBe("view");

        remake({ editable: false, interactionMode: "edit" });

        expect(engine.getInteractionMode()).toBe("edit");
    });

    test("aModeThatIsNotOneOfTheThree_Throws", () =>
    {
        expect(() => engine.setInteractionMode("read" as "view")).toThrow(/"view", "comment" or "edit", not "read"/);
        expect(engine.getInteractionMode()).toBe("edit");
        expect(() => remake({ interactionMode: "Edit" as "edit" })).toThrow(/not "Edit"/);
    });

    test("inView_AFingerDragOnTheBox_PansTheView", () =>
    {
        remake({ interactionMode: "view" });
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);
        pointer("pointerup", 140, 100);

        expect(engine.getViewport()).toMatchObject({ x: 40, y: 20 });
        expect(box()).toMatchObject({ x: 50, y: 50 });
    });

    test("inComment_AFingerDragOnTheBox_PansTheView", () =>
    {
        remake({ interactionMode: "comment" });
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);
        pointer("pointerup", 140, 100);

        expect(engine.getViewport()).toMatchObject({ x: 40, y: 20 });
        expect(box()).toMatchObject({ x: 50, y: 50 });
    });

    test("inView_AMouseSelects_AndItsDragMovesNothing", () =>
    {
        remake({ interactionMode: "view" });
        pointer("pointerdown", 100, 80, MOUSE);
        pointer("pointermove", 140, 100, MOUSE);
        pointer("pointerup", 140, 100, MOUSE);

        expect(selected()).toEqual(["box"]);
        expect(box()).toMatchObject({ x: 50, y: 50 });
        expect(engine.canUndo()).toBe(false);
    });

    test("inView_TheSelectionHasNoHandles_AndACornerDragResizesNothing", () =>
    {
        engine.select(["box"]);

        expect(selectionParts()).toBeGreaterThan(1);

        engine.setInteractionMode("view");

        expect(selectionParts()).toBe(1);

        engine.clearSelection();
        engine.select(["box"]);

        expect(selectionParts()).toBe(1);

        // The bottom-right handle was at (150, 110).
        pointer("pointerdown", 150, 110, MOUSE);
        pointer("pointermove", 190, 140, MOUSE);
        pointer("pointerup", 190, 140, MOUSE);

        expect(box()).toMatchObject({ x: 50, y: 50, width: 100, height: 60 });

        engine.setInteractionMode("edit");

        expect(selectionParts()).toBeGreaterThan(1);
    });

    test("inView_KeysChangeNothing_ButSelectAllWorks", () =>
    {
        pointer("pointerdown", 100, 80, MOUSE);
        pointer("pointermove", 140, 100, MOUSE);
        pointer("pointerup", 140, 100, MOUSE);
        engine.undo();
        engine.setInteractionMode("view");
        key("y", { ctrlKey: true });

        expect(box()).toMatchObject({ x: 50, y: 50 });

        engine.redo();
        engine.select(["box"]);

        key("ArrowRight");
        key("Delete");
        key("z", { ctrlKey: true });

        expect(box()).toMatchObject({ x: 90, y: 70 });
        expect(engine.getObjects()).toHaveLength(1);

        engine.clearSelection();
        key("a", { ctrlKey: true });

        expect(selected()).toEqual(["box"]);
    });

    test("inView_ADoubleTap_DoesNotEditTheText", () =>
    {
        remake({ interactionMode: "view" });
        pointer("pointerdown", 100, 80);
        pointer("pointerup", 100, 80);
        pointer("pointerdown", 102, 81);
        pointer("pointerup", 102, 81);

        expect(host.querySelector(".de-inline-edit")).toBeNull();
    });

    test("inView_OnlyTheToolsThatChangeNothing_Start", () =>
    {
        remake({ interactionMode: "view" });
        engine.setActiveTool("draw");

        expect(engine.getActiveTool()).toBe("select");

        engine.setActiveTool("measure");

        expect(engine.getActiveTool()).toBe("measure");
    });

    test("switchingToView_GivesTheDrawToolWayToSelect_AndSaysSo", () =>
    {
        const heard: unknown[] = [];

        engine.on("interactionMode:change", (mode: unknown) => heard.push(mode));
        engine.setActiveTool("draw");
        engine.setInteractionMode("view");

        expect(engine.getActiveTool()).toBe("select");
        expect(heard).toEqual(["view"]);

        engine.setInteractionMode("view");

        expect(heard).toEqual(["view"]);
    });

    test("switchingToView_DuringADrag_PutsTheBoxBack", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);
        engine.setInteractionMode("view");
        pointer("pointermove", 180, 120);
        pointer("pointerup", 180, 120);

        expect(box()).toMatchObject({ x: 50, y: 50 });
        expect(engine.canUndo()).toBe(false);
    });

    test("inView_ALongPressThenADrag_StillSelects", () =>
    {
        remake({ interactionMode: "view" });
        vi.useFakeTimers();

        try
        {
            pointer("pointerdown", 30, 30);
            vi.advanceTimersByTime(500);
            pointer("pointermove", 200, 200);
            pointer("pointerup", 200, 200);
        }
        finally
        {
            vi.useRealTimers();
        }

        expect(selected()).toEqual(["box"]);
        expect(box()).toMatchObject({ x: 50, y: 50 });
    });
});

describe("DiagramEngine touch targets (#184)", () =>
{
    /** A drag from one point to another, with one pointer type. */
    function drag(from: [number, number], to: [number, number], init: PointerEventInit = {}): void
    {
        pointer("pointerdown", from[0], from[1], init);
        pointer("pointermove", to[0], to[1], init);
        pointer("pointerup", to[0], to[1], init);
    }

    /** Adds a 20 by 20 box at (300, 50), and selects it. */
    function selectSmallBox(): void
    {
        engine.addObject({ id: "small", presentation: { shape: "rectangle",
            bounds: { x: 300, y: 50, width: 20, height: 20 } } });
        engine.select(["small"]);
    }

    function small(): { x: number; y: number; width: number; height: number }
    {
        return { ...engine.getObjectById("small")!.presentation.bounds };
    }

    test("aFinger_FifteenPixelsOutsideACorner_Resizes_AndAMouseThereDoesNot", () =>
    {
        engine.select(["box"]);
        // The bottom-right handle is at (150, 110).
        drag([165, 110], [185, 130], MOUSE);

        expect(box()).toMatchObject({ x: 50, y: 50, width: 100, height: 60 });

        // The mouse drew a selection rectangle, which cleared the selection.
        engine.select(["box"]);
        drag([165, 110], [185, 130]);

        // The corner follows the finger.
        expect(box()).toMatchObject({ x: 50, y: 50, width: 135, height: 80 });
        expect(engine.getViewport()).toMatchObject({ x: 0, y: 0 });
    });

    test("aFingersTap_BesideAHandle_KeepsTheSelection_AndAddsNoUndoStep", () =>
    {
        engine.select(["box"]);
        pointer("pointerdown", 165, 110);
        pointer("pointerup", 165, 110);

        expect(selected()).toEqual(["box"]);
        expect(engine.canUndo()).toBe(false);
    });

    test("aFinger_InsideASmallSelectedBox_MovesIt", () =>
    {
        selectSmallBox();
        // The centre is 10 pixels from each edge handle.
        drag([310, 60], [340, 80]);

        expect(small()).toEqual({ x: 330, y: 70, width: 20, height: 20 });
    });

    test("theNearestHandle_Wins_WhenAFingersTargetsOverlap", () =>
    {
        selectSmallBox();
        // 5.4 pixels from the top-right handle, 13 from the top one.
        drag([322, 45], [342, 25]);

        // The top-right corner follows the finger. The top handle would
        // have kept the width.
        expect(small()).toEqual({ x: 300, y: 25, width: 42, height: 45 });
    });

    test("theRotationHandle_Wins_WhereItsTargetOverlapsTheTopHandle", () =>
    {
        engine.select(["box"]);
        // 7 pixels from the rotation handle at (100, 25), 18 from the top handle.
        drag([100, 32], [160, 80]);

        const obj = engine.getObjectById("box")!.presentation;

        expect(obj.rotation).not.toBe(0);
        expect(obj.bounds).toEqual({ x: 50, y: 50, width: 100, height: 60 });
    });

    test("aFingersTarget_Is44ScreenPixels_AtAnyZoom", () =>
    {
        engine.setZoomLevel(2);
        engine.select(["box"]);

        expect(engine.getViewport()).toMatchObject({ x: 0, y: 0, zoom: 2 });

        // The bottom-right handle is at (300, 220) on the screen. 30
        // pixels away is outside the target, so the finger pans.
        drag([330, 220], [350, 240]);

        expect(box()).toMatchObject({ width: 100, height: 60 });
        expect(engine.getViewport()).toMatchObject({ x: 20, y: 20 });

        // After that pan of (20, 20), the handle is at (320, 240) on the
        // screen. 20 pixels away is inside the target, so the finger
        // resizes. The corner follows it to (170, 120) on the canvas.
        drag([340, 240], [360, 260]);

        expect(box()).toMatchObject({ width: 120, height: 70 });
    });

    test("aFingersTarget_IsNeverSmallerThanAMouses_AtHighZoom", () =>
    {
        // At zoom 6, a 44-pixel target is 7.3 canvas pixels wide. The
        // mouse's target is 12 wide, so the finger keeps the mouse's.
        engine.setZoomLevel(6);
        engine.select(["box"]);
        // 5 canvas pixels right of the bottom-right handle at (900, 660).
        drag([930, 660], [990, 660]);

        expect(box()).toMatchObject({ width: 115 });
    });

    test("aFinger_LiftedBesideAConnectionPoint_Connects_AndAMouseThereDoesNot", () =>
    {
        engine.addObject({ id: "b2", presentation: { shape: "rectangle",
            bounds: { x: 250, y: 50, width: 100, height: 60 } } });
        engine.setActiveTool("connect");
        // b2's west point is at (250, 80). The lift is 15 pixels left of
        // it: inside a finger's target, outside a mouse's.
        drag([100, 80], [235, 80], MOUSE);

        expect(engine.getConnectors()).toHaveLength(0);

        engine.setActiveTool("connect");
        drag([100, 80], [235, 80]);

        expect(engine.getConnectors().map((c) => c.presentation))
            .toEqual([expect.objectContaining({ sourceId: "box", targetId: "b2", targetPort: "port-w" })]);
    });

    test("aConnectionPointsTarget_Is44ScreenPixels_AtAnyZoom", () =>
    {
        engine.addObject({ id: "b2", presentation: { shape: "rectangle",
            bounds: { x: 250, y: 50, width: 100, height: 60 } } });
        engine.setZoomLevel(2);
        engine.setActiveTool("connect");
        // b2's west point is at (500, 160) on the screen. A lift 30
        // pixels left of it is outside the target.
        drag([200, 160], [470, 160]);

        expect(engine.getConnectors()).toHaveLength(0);

        drag([200, 160], [480, 160]);

        expect(engine.getConnectors().map((c) => c.presentation.targetId)).toEqual(["b2"]);
    });

    test("aFinger_PressedBesideAConnectionPoint_StartsTheConnector", () =>
    {
        engine.addObject({ id: "b2", presentation: { shape: "rectangle",
            bounds: { x: 250, y: 50, width: 100, height: 60 } } });
        engine.setActiveTool("connect");
        // The box's east point is at (150, 80). The press is 10 pixels right of it.
        drag([160, 80], [300, 80]);

        expect(engine.getConnectors().map((c) => c.presentation))
            .toEqual([expect.objectContaining({ sourceId: "box", sourcePort: "port-e", targetId: "b2" })]);
    });
});

describe("DiagramEngine mouse targets and the cursor (#191, #192)", () =>
{
    function drag(from: [number, number], to: [number, number], init: PointerEventInit = MOUSE): void
    {
        pointer("pointerdown", from[0], from[1], init);
        pointer("pointermove", to[0], to[1], init);
        pointer("pointerup", to[0], to[1], init);
    }

    /** A move with no button held, and the cursor it leaves. */
    function hover(x: number, y: number, init: PointerEventInit = MOUSE): string
    {
        pointer("pointermove", x, y, { buttons: 0, ...init });

        return svg.style.cursor;
    }

    test("aMouse_TenPixelsOutsideACorner_Resizes", () =>
    {
        engine.select(["box"]);
        // The bottom-right handle is at (150, 110).
        drag([160, 110], [180, 130]);

        expect(box()).toMatchObject({ x: 50, y: 50, width: 130, height: 80 });
    });

    test("aMousesTarget_Is24ScreenPixels_WhenZoomedOut", () =>
    {
        engine.setZoomLevel(0.5);
        engine.select(["box"]);
        // The bottom-right handle is at (75, 55) on the screen. 15 pixels
        // away is outside the target, so the mouse draws a selection
        // rectangle, which clears the selection.
        drag([90, 55], [100, 65]);

        expect(box()).toMatchObject({ width: 100, height: 60 });

        engine.select(["box"]);
        // 10 pixels away is inside it. The corner follows the mouse to
        // (190, 130) on the canvas.
        drag([85, 55], [95, 65]);

        expect(box()).toMatchObject({ width: 140, height: 80 });
    });

    test("aMousesTarget_IsNeverSmallerThanBefore_WhenZoomedIn", () =>
    {
        // At zoom 4, a 24-pixel target is 6 canvas pixels wide, half the
        // old radius of 6.
        engine.setZoomLevel(4);
        engine.select(["box"]);
        // 5 canvas pixels right of the bottom-right handle at (600, 440).
        drag([620, 440], [660, 440]);

        expect(box()).toMatchObject({ width: 115 });
    });

    test("aMouseInsideTheBox_NearACorner_StillMovesIt", () =>
    {
        engine.select(["box"]);
        // 11 pixels inside the bottom-right corner.
        drag([142, 102], [162, 112]);

        expect(box()).toEqual({ x: 70, y: 60, width: 100, height: 60 });
    });

    test("aMouse_LiftedTenPixelsBesideAConnectionPoint_Connects", () =>
    {
        engine.addObject({ id: "b2", presentation: { shape: "rectangle",
            bounds: { x: 250, y: 50, width: 100, height: 60 } } });
        engine.setActiveTool("connect");
        drag([100, 80], [240, 80]);

        expect(engine.getConnectors().map((c) => c.presentation))
            .toEqual([expect.objectContaining({ targetId: "b2", targetPort: "port-w" })]);
    });

    test("theCursor_FollowsTheSameHitTestsAsAPress", () =>
    {
        expect(hover(100, 80)).toBe("move");
        expect(hover(300, 200)).toBe("default");

        engine.select(["box"]);

        // 10 pixels outside the bottom-right handle, inside its target.
        expect(hover(160, 110)).toBe("se-resize");
        // 15 pixels outside is past a mouse's target, as a press there is.
        expect(hover(165, 110)).toBe("default");
        expect(hover(50, 80)).toBe("w-resize");
        expect(hover(100, 25)).toBe("grab");
        // A pen hovers as a mouse does.
        expect(hover(300, 200, { pointerType: "pen" })).toBe("default");
        // A finger has no hover, so it leaves the cursor alone.
        expect(hover(100, 80, { pointerType: "touch" })).toBe("default");
    });

    test("outsideEditMode_TheCursorOverAnObject_IsPointer_AndShowsNoHandle", () =>
    {
        engine.select(["box"]);
        engine.setInteractionMode("view");

        expect(hover(100, 80)).toBe("pointer");
        expect(hover(150, 110)).toBe("pointer");
        expect(hover(160, 110)).toBe("default");
    });

    test("aDrawingTool_KeepsItsCursor_OverAShape", () =>
    {
        engine.setActiveTool("draw");

        expect(hover(100, 80)).toBe("crosshair");

        engine.setActiveTool("select");

        expect(svg.style.cursor).toBe("default");
        expect(hover(100, 80)).toBe("move");
    });
});

describe("DiagramEngine context menu and pressed state (#184)", () =>
{
    let menu: ReturnType<typeof vi.fn>;

    /** Replaces the canvas with one that has a menu, and the same box. */
    function remake(opts: Parameters<typeof createDiagramEngine>[1] = {}): void
    {
        engine.destroy();
        host.replaceChildren();
        menu = vi.fn();
        engine = createDiagramEngine(host.id, { onContextMenu: menu, ...opts });
        engine.addObject({ id: "box", presentation: { shape: "rectangle",
            bounds: { x: 50, y: 50, width: 100, height: 60 } } });
        svg = host.querySelector("svg")!;
        svg.setPointerCapture = vi.fn();
    }

    beforeEach(() =>
    {
        vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
        remake();
    });

    afterEach(() =>
    {
        vi.useRealTimers();
    });

    function pressedOutline(): Element | null
    {
        return svg.querySelector(".de-pressed-outline");
    }

    function lifted(): boolean
    {
        return svg.querySelector('[data-id="box"]')!.classList.contains("de-lifted");
    }

    function longPress(x: number, y: number): void
    {
        pointer("pointerdown", x, y);
        vi.advanceTimersByTime(500);
    }

    /** A contextmenu event, as a right-click sends, and whether it was stopped. */
    function rightClick(x: number, y: number): boolean
    {
        const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 });

        svg.dispatchEvent(e);

        return e.defaultPrevented;
    }

    test("aFingersPress_OnTheBox_ShowsItsOutlineDimmed_AtOnce_UntilTheLift", () =>
    {
        pointer("pointerdown", 100, 80);

        expect(pressedOutline()).not.toBeNull();
        expect(["x", "y", "width", "height"].map((a) => pressedOutline()!.getAttribute(a)))
            .toEqual(["50", "50", "100", "60"]);
        expect(selected()).toEqual([]);

        pointer("pointerup", 100, 80);

        expect(pressedOutline()).toBeNull();
        expect(selected()).toEqual(["box"]);
    });

    test("aPressedOutline_Shows_OnlyForAFingerOnAnObject_WithTheSelectTool", () =>
    {
        pointer("pointerdown", 300, 200);

        expect(pressedOutline()).toBeNull();

        pointer("pointerup", 300, 200);
        pointer("pointerdown", 100, 80, MOUSE);

        expect(pressedOutline()).toBeNull();

        pointer("pointerup", 100, 80, MOUSE);
        engine.setActiveTool("draw");
        pointer("pointerdown", 100, 80);

        expect(pressedOutline()).toBeNull();
    });

    test("aDrag_EndsThePressedState", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);

        expect(pressedOutline()).toBeNull();
        expect(box()).toMatchObject({ x: 90, y: 70 });
    });

    test("aCancel_OrAViewModePan_EndsThePressedState", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointercancel", 100, 80);

        expect(pressedOutline()).toBeNull();

        // In view mode a finger's drag on the box pans, and selects nothing.
        remake({ interactionMode: "view" });
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);

        expect(pressedOutline()).toBeNull();
        expect(engine.getViewport()).toMatchObject({ x: 40, y: 20 });
    });

    test("aLongPress_OnTheBox_LiftsIt_AndTheLiftOpensTheMenuForIt", () =>
    {
        longPress(100, 80);

        expect(lifted()).toBe(true);
        expect(pressedOutline()).toBeNull();
        expect(menu).not.toHaveBeenCalled();

        pointer("pointerup", 100, 80);

        expect(menu).toHaveBeenCalledTimes(1);
        expect(menu.mock.calls[0][0]).toMatchObject({ target: "object", clientX: 100, clientY: 80,
            canvasPoint: { x: 100, y: 80 }, object: expect.objectContaining({ id: "box" }) });
        expect(selected()).toEqual(["box"]);
        expect(lifted()).toBe(false);
    });

    test("aLongPress_ThenADrag_MovesTheLiftedBox_AndOpensNoMenu", () =>
    {
        longPress(100, 80);
        pointer("pointermove", 140, 100);

        expect(box()).toMatchObject({ x: 90, y: 70 });
        // The box was drawn again where it moved, and is still lifted.
        expect(lifted()).toBe(true);

        pointer("pointerup", 140, 100);

        expect(menu).not.toHaveBeenCalled();
        expect(lifted()).toBe(false);
    });

    test("aLongPress_OnTheBackground_OpensTheCanvasMenu_AndKeepsTheSelection", () =>
    {
        engine.select(["box"]);
        longPress(300, 200);
        pointer("pointerup", 300, 200);

        expect(menu).toHaveBeenCalledTimes(1);
        expect(menu.mock.calls[0][0]).toMatchObject({ target: "canvas", canvasPoint: { x: 300, y: 200 } });
        expect(menu.mock.calls[0][0].object).toBeUndefined();
        expect(selected()).toEqual(["box"]);
    });

    test("aLongPress_EndedByASecondFingerOrACancel_OpensNoMenu", () =>
    {
        longPress(100, 80);
        pointer("pointerdown", 200, 200, SECOND);

        expect(lifted()).toBe(false);

        pointer("pointerup", 200, 200, SECOND);
        pointer("pointerup", 100, 80);
        longPress(100, 80);
        pointer("pointercancel", 100, 80);

        expect(menu).not.toHaveBeenCalled();
    });

    test("aRightClick_OnTheBox_SelectsIt_AndOpensTheAppsMenu_NotTheBrowsers", () =>
    {
        expect(rightClick(100, 80)).toBe(true);
        expect(menu).toHaveBeenCalledTimes(1);
        expect(menu.mock.calls[0][0]).toMatchObject({ target: "object", clientX: 100, clientY: 80 });
        expect(selected()).toEqual(["box"]);
    });

    test("aRightClick_OnASelectedObject_KeepsTheWholeSelection", () =>
    {
        engine.addObject({ id: "b2", presentation: { shape: "rectangle",
            bounds: { x: 250, y: 50, width: 100, height: 60 } } });
        engine.select(["box", "b2"]);
        rightClick(100, 80);

        expect(selected()).toEqual(["box", "b2"]);
    });

    test("aRightClick_OnAConnector_SelectsIt_AndOpensItsMenu", () =>
    {
        engine.addObject({ id: "b2", presentation: { shape: "rectangle",
            bounds: { x: 250, y: 50, width: 100, height: 60 } } });
        const conn = engine.addConnector({ presentation: { sourceId: "box", targetId: "b2",
            sourcePort: "port-e", targetPort: "port-w", waypoints: [], routing: "straight",
            style: { color: "#000", width: 2 }, labels: [] } } as Parameters<Engine["addConnector"]>[0]);

        rightClick(200, 80);

        expect(menu.mock.calls[0][0]).toMatchObject({ target: "connector", connector: expect.objectContaining({ id: conn.id }) });
        expect(selected()).toEqual([]);
    });

    test("withoutOnContextMenu_ARightClick_ShowsTheBrowsersMenu_AndSelectsNothing", () =>
    {
        remake({ onContextMenu: undefined });

        expect(rightClick(100, 80)).toBe(false);
        expect(selected()).toEqual([]);
    });

    test("theBrowsersContextMenu_DuringAFingersPress_IsDropped", () =>
    {
        pointer("pointerdown", 100, 80);

        expect(rightClick(100, 80)).toBe(true);
        expect(menu).not.toHaveBeenCalled();
    });

    test("anInactiveEmbeddedCanvas_IgnoresALongPress_AndARightClickActivatesIt", () =>
    {
        remake({ embedded: true });
        longPress(100, 80);
        pointer("pointerup", 100, 80);

        expect(lifted()).toBe(false);
        expect(menu).not.toHaveBeenCalled();

        rightClick(100, 80);

        expect(svg.classList.contains("de-canvas-inactive")).toBe(false);
        expect(menu).toHaveBeenCalledTimes(1);
    });

    test("inView_ALongPressLiftsNothing_ButTheMenuOpens", () =>
    {
        remake({ interactionMode: "view" });
        longPress(100, 80);

        expect(lifted()).toBe(false);

        pointer("pointerup", 100, 80);

        expect(menu).toHaveBeenCalledTimes(1);
    });
});
