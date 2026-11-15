/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: DiagramEngine pointer input (#176, step 2). The canvas listens
 * for pointer events, so mouse, touch and pen take one path. It captures
 * the pointer, lets only the primary pointer drive the tools, and ends a
 * cancelled drag. An interactive embed keeps its own pointer.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createDiagramEngine } from "./diagramengine";

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

describe("DiagramEngine pointer input (#176)", () =>
{
    test("pointerdown_CapturesThePointer_SoADragThatLeavesTheCanvasStillEnds", () =>
    {
        pointer("pointerdown", 100, 80, { pointerId: 7 });

        expect(svg.setPointerCapture).toHaveBeenCalledWith(7);
    });

    test("aTouchDrag_MovesTheBox", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);
        pointer("pointerup", 140, 100);

        expect(engine.getObjectById("box")!.presentation.bounds.x).not.toBe(50);
        expect(engine.canUndo()).toBe(true);
    });

    test("aSecondFinger_DuringADrag_IsIgnored", () =>
    {
        // The same drag with one finger, on its own canvas, gives the
        // bounds the two-finger drag must end with.
        const other = document.createElement("div");

        other.id = host.id + "-alone";
        document.body.appendChild(other);

        const alone = createWithBox(other.id);
        const aloneSvg = other.querySelector("svg")!;

        aloneSvg.setPointerCapture = vi.fn();
        pointer("pointerdown", 100, 80, {}, aloneSvg);
        pointer("pointermove", 140, 100, {}, aloneSvg);
        pointer("pointerup", 140, 100, {}, aloneSvg);

        const second = { pointerId: 2, isPrimary: false };

        pointer("pointerdown", 100, 80);
        pointer("pointerdown", 400, 400, second);
        pointer("pointermove", 500, 500, second);
        pointer("pointermove", 140, 100);
        pointer("pointerup", 500, 500, second);
        pointer("pointerup", 140, 100);

        expect(engine.getObjectById("box")!.presentation.bounds)
            .toEqual(alone.getObjectById("box")!.presentation.bounds);
        expect(engine.getSelectedObjects().map((o) => o.id)).toEqual(["box"]);
        expect(svg.setPointerCapture).toHaveBeenCalledTimes(1);

        alone.destroy();
        other.remove();
    });

    test("pointercancel_EndsTheDrag_WhereThePointerLastWas", () =>
    {
        pointer("pointerdown", 100, 80);
        pointer("pointermove", 140, 100);

        const moved = { ...engine.getObjectById("box")!.presentation.bounds };

        pointer("pointercancel", 0, 0);
        pointer("pointermove", 300, 300);

        expect(engine.getObjectById("box")!.presentation.bounds).toEqual(moved);
        expect(engine.canUndo()).toBe(true);
    });

    test("pointercancel_DuringARubberBand_SelectsUpToTheLastPosition", () =>
    {
        // A cancel event's own position is not where the drag was. Here
        // it is (0, 0), and a band to (0, 0) would select nothing.
        pointer("pointerdown", 10, 10);
        pointer("pointermove", 200, 200);
        pointer("pointercancel", 0, 0);

        expect(engine.getSelectedObjects().map((o) => o.id)).toEqual(["box"]);
    });

    test("anInteractiveEmbed_KeepsItsPointer_AndAPressOutsideCapturesAgain", () =>
    {
        (window as unknown as Record<string, unknown>).createPointerTestWidget = () => ({});
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

        pointer("pointerdown", 400, 350, {}, inside);
        pointer("pointerup", 400, 350, {}, inside);

        expect(svg.setPointerCapture).not.toHaveBeenCalled();

        pointer("pointerdown", 10, 10);

        expect(svg.setPointerCapture).toHaveBeenCalledTimes(1);

        delete (window as unknown as Record<string, unknown>).createPointerTestWidget;
    });
});
