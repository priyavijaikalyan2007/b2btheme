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
