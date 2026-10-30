/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: DiagramEngine surface contract (readiness step 2 B9, ADR-236).
 * The document slot updates in place, keeping the viewport; selection,
 * objectDoubleClick and change reach on() subscribers; the viewport is the
 * state; the event bus's on() keeps working and now returns an unsubscribe.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createDiagramEngine } from "./diagramengine";

let container: HTMLDivElement;
let engine: ReturnType<typeof createDiagramEngine>;

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-surface-" + Math.random().toString(36).substring(2, 8);
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
});

afterEach(() =>
{
    engine?.destroy();
    container.remove();
});

describe("DiagramEngine surface contract (B9)", () =>
{
    test("on_Selection_HearsTheIds_AfterOnSelectionChange", () =>
    {
        const order: unknown[] = [];
        engine = createDiagramEngine(container.id, { onSelectionChange: (o) => order.push(`option:${o.length}`) });
        const a = engine.addObject({ id: "a" });
        engine.on("selection", (p) => order.push(p));

        engine.select([a.id]);

        expect(order).toEqual(["option:1", { objectIds: ["a"], connectorIds: [] }]);
    });

    test("on_Change_HearsTheDocument_OncePerEdit", async () =>
    {
        engine = createDiagramEngine(container.id, {});
        const heard = vi.fn();
        engine.on("change", heard);

        engine.addObject({ id: "a" });
        engine.updateObject("a", { presentation: { bounds: { x: 10, y: 10, width: 50, height: 40 } } } as never);
        await Promise.resolve();

        expect(heard).toHaveBeenCalledTimes(1);
        expect((heard.mock.calls[0][0] as { objects: { id: string }[] }).objects.map((o) => o.id)).toEqual(["a"]);
    });

    test("setData_Document_ReplacesItInPlace_KeepingTheViewport_Silently", async () =>
    {
        const onSelectionChange = vi.fn();
        engine = createDiagramEngine(container.id, { onSelectionChange });
        engine.addObject({ id: "a" });
        engine.setZoomLevel(1.5);
        const doc = engine.getDocument();
        const change = vi.fn();
        engine.on("change", change);
        onSelectionChange.mockClear();

        engine.setData("document", { ...doc, objects: [...doc.objects, { ...doc.objects[0], id: "b" }] });
        await Promise.resolve();

        expect(engine.getObjects().map((o) => o.id)).toEqual(["a", "b"]);
        expect(engine.getZoomLevel()).toBe(1.5);
        expect([change.mock.calls, onSelectionChange.mock.calls]).toEqual([[], []]);
        expect(() => engine.setData("objects", [])).toThrow(/"document"/);
        expect(() => engine.setData("document", { objects: "x" })).toThrow(/objects/);
    });

    test("getState_And_SetState_RoundTripTheViewport", () =>
    {
        const onViewportChange = vi.fn();
        engine = createDiagramEngine(container.id, { onViewportChange });

        engine.setState({ viewport: { x: 40, y: -20, zoom: 2 } });

        expect(engine.getState()).toEqual({ viewport: { x: 40, y: -20, zoom: 2 } });
        expect(onViewportChange).not.toHaveBeenCalled();
    });

    test("on_BusEvents_StillWork_AndReturnAnUnsubscribe", () =>
    {
        engine = createDiagramEngine(container.id, {});
        const heard = vi.fn();

        const off = engine.on("object:add", heard);
        engine.addObject({ id: "a" });
        off();
        engine.addObject({ id: "b" });

        expect(heard).toHaveBeenCalledTimes(1);
    });
});
