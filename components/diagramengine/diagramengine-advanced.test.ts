/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DiagramEngine — Advanced Features
 * Covers: Find & Replace, Format Painter, Graph Analysis,
 * Comments, Deep Linking, Events, Spatial Queries, Stencils.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createDiagramEngine } from "./diagramengine";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;
let engine: ReturnType<typeof createDiagramEngine>;

function setup(): void
{
    container = document.createElement("div");
    container.id = "test-adv-" + Math.random().toString(36).substring(2, 8);
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
    engine = createDiagramEngine(container.id, {});
}

function teardown(): void
{
    container.remove();
}

/**
 * Creates an object with text content for find/replace tests.
 */
function addTextObject(id: string, text: string): ReturnType<typeof engine.addObject>
{
    return engine.addObject({
        id,
        presentation: {
            textContent: {
                runs: [{ text }],
                horizontalAlign: "left",
                verticalAlign: "top",
                overflow: "clip",
                padding: 8
            }
        }
    });
}

/**
 * Creates a minimal stub shape definition for registerStencilPack tests.
 */
function makeStubShape(type: string, label: string, icon: string): {
    type: string; category: string; label: string; icon: string;
    defaultSize: { w: number; h: number };
    render: () => SVGElement;
    getHandles: () => never[];
    getPorts: () => never[];
    hitTest: () => boolean;
    getTextRegions: () => never[];
    getOutlinePath: () => string;
}
{
    return {
        type,
        category: "custom",
        label,
        icon,
        defaultSize: { w: 60, h: 60 },
        render: () => document.createElementNS("http://www.w3.org/2000/svg", "g"),
        getHandles: () => [],
        getPorts: () => [],
        hitTest: () => false,
        getTextRegions: () => [],
        getOutlinePath: () => "M 0 0",
    };
}

/**
 * Creates a connector between two objects with required defaults.
 */
function addConn(srcId: string, tgtId: string): ReturnType<typeof engine.addConnector>
{
    return engine.addConnector({
        presentation: {
            sourceId: srcId,
            targetId: tgtId,
            waypoints: [],
            routing: "straight",
            style: { color: "#333", width: 1, startArrow: "none", endArrow: "block" },
            labels: []
        }
    });
}

/**
 * Creates a styled object with a solid fill for format painter tests.
 */
function addStyledObject(
    id: string,
    fillColor: string,
    strokeColor: string,
    strokeWidth: number
): ReturnType<typeof engine.addObject>
{
    return engine.addObject({
        id,
        presentation: {
            shape: "rectangle",
            bounds: { x: 0, y: 0, width: 100, height: 60 },
            style: {
                fill: { type: "solid", color: fillColor },
                stroke: { color: strokeColor, width: strokeWidth }
            },
            layer: "default"
        }
    });
}

// ============================================================================
// 1. FIND & REPLACE
// ============================================================================

describe("DiagramEngine — Find & Replace", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("findText returns matches from object text content", () =>
    {
        addTextObject("t1", "Hello World");
        addTextObject("t2", "Goodbye World");

        const results = engine.findText("World");

        expect(results.length).toBe(2);
        expect(results[0].objectId).toBe("t1");
        expect(results[1].objectId).toBe("t2");
    });

    test("findText returns empty array when no matches", () =>
    {
        addTextObject("t1", "Hello World");

        const results = engine.findText("zzznotfound");

        expect(results).toEqual([]);
    });

    test("findText with caseSensitive option", () =>
    {
        addTextObject("t1", "Hello World");
        addTextObject("t2", "hello world");

        const sensitive = engine.findText("Hello", { caseSensitive: true });

        expect(sensitive.length).toBe(1);
        expect(sensitive[0].objectId).toBe("t1");

        const insensitive = engine.findText("Hello", { caseSensitive: false });

        expect(insensitive.length).toBe(2);
    });

    test("replaceText replaces matching text and returns count", () =>
    {
        addTextObject("t1", "Hello World");
        addTextObject("t2", "Hello There");

        const count = engine.replaceText("Hello", "Hi");

        expect(count).toBe(2);
    });

    test("replaceText returns 0 when no matches", () =>
    {
        addTextObject("t1", "Hello World");

        const count = engine.replaceText("zzznotfound", "replacement");

        expect(count).toBe(0);
    });

    test("replaceText with caseSensitive option", () =>
    {
        addTextObject("t1", "Hello World");
        addTextObject("t2", "hello world");

        const count = engine.replaceText("Hello", "Hi", { caseSensitive: true });

        expect(count).toBe(1);
    });
});

// ============================================================================
// 2. FORMAT PAINTER
// ============================================================================

describe("DiagramEngine — Format Painter", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("hasFormat is false initially", () =>
    {
        expect(engine.hasFormat()).toBe(false);
    });

    test("pickFormat captures style from an object", () =>
    {
        addStyledObject("src", "#ff0000", "#000000", 2);

        engine.pickFormat("src");

        expect(engine.hasFormat()).toBe(true);
    });

    test("hasFormat is true after pickFormat", () =>
    {
        addStyledObject("src", "#ff0000", "#000000", 2);

        engine.pickFormat("src");

        expect(engine.hasFormat()).toBe(true);
    });

    test("applyFormat applies the captured style to targets", () =>
    {
        addStyledObject("src", "#ff0000", "#000000", 3);
        addStyledObject("tgt", "#00ff00", "#333333", 1);

        engine.pickFormat("src");
        engine.applyFormat(["tgt"]);

        const tgt = engine.getObject("tgt");

        expect(tgt).not.toBeNull();
        expect(tgt!.presentation.style.fill?.color).toBe("#ff0000");
        expect(tgt!.presentation.style.stroke?.color).toBe("#000000");
        expect(tgt!.presentation.style.stroke?.width).toBe(3);
    });

    test("clearFormat resets format state", () =>
    {
        addStyledObject("src", "#ff0000", "#000000", 2);

        engine.pickFormat("src");

        expect(engine.hasFormat()).toBe(true);

        engine.clearFormat();

        expect(engine.hasFormat()).toBe(false);
    });

    test("hasFormat is false after clearFormat", () =>
    {
        addStyledObject("src", "#ff0000", "#000000", 2);

        engine.pickFormat("src");
        engine.clearFormat();

        expect(engine.hasFormat()).toBe(false);
    });
});

// ============================================================================
// 3. GRAPH ANALYSIS
// ============================================================================

describe("DiagramEngine — Graph Analysis", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("getShortestPath returns path between connected objects", () =>
    {
        engine.addObject({ id: "a" });
        engine.addObject({ id: "b" });
        engine.addObject({ id: "c" });
        addConn("a", "b");
        addConn("b", "c");

        const path = engine.getShortestPath("a", "c");

        expect(path).toEqual(["a", "b", "c"]);
    });

    test("getShortestPath returns empty for disconnected objects", () =>
    {
        engine.addObject({ id: "a" });
        engine.addObject({ id: "b" });
        engine.addObject({ id: "c" });
        addConn("a", "b");

        const path = engine.getShortestPath("a", "c");

        expect(path).toEqual([]);
    });

    test("getConnectedComponents groups connected objects", () =>
    {
        engine.addObject({ id: "a" });
        engine.addObject({ id: "b" });
        engine.addObject({ id: "c" });
        engine.addObject({ id: "d" });
        addConn("a", "b");
        addConn("c", "d");

        const components = engine.getConnectedComponents();

        expect(components.length).toBe(2);

        const hasAB = components.some(
            (c) => c.includes("a") && c.includes("b")
        );
        const hasCD = components.some(
            (c) => c.includes("c") && c.includes("d")
        );

        expect(hasAB).toBe(true);
        expect(hasCD).toBe(true);
    });

    test("getConnectedComponents with single object", () =>
    {
        engine.addObject({ id: "solo" });

        const components = engine.getConnectedComponents();

        expect(components.length).toBe(1);
        expect(components[0]).toEqual(["solo"]);
    });

    test("getIncomingConnectors returns connectors pointing to object", () =>
    {
        engine.addObject({ id: "a" });
        engine.addObject({ id: "b" });
        engine.addObject({ id: "c" });
        addConn("a", "b");
        addConn("c", "b");

        const incoming = engine.getIncomingConnectors("b");

        expect(incoming.length).toBe(2);
    });

    test("getOutgoingConnectors returns connectors from object", () =>
    {
        engine.addObject({ id: "a" });
        engine.addObject({ id: "b" });
        engine.addObject({ id: "c" });
        addConn("a", "b");
        addConn("a", "c");

        const outgoing = engine.getOutgoingConnectors("a");

        expect(outgoing.length).toBe(2);
    });

    test("getIncomingConnectors returns empty when none", () =>
    {
        engine.addObject({ id: "a" });
        engine.addObject({ id: "b" });
        addConn("a", "b");

        const incoming = engine.getIncomingConnectors("a");

        expect(incoming).toEqual([]);
    });

    test("getOutgoingConnectors returns empty when none", () =>
    {
        engine.addObject({ id: "a" });
        engine.addObject({ id: "b" });
        addConn("a", "b");

        const outgoing = engine.getOutgoingConnectors("b");

        expect(outgoing).toEqual([]);
    });
});

// ============================================================================
// 4. COMMENTS
// ============================================================================

describe("DiagramEngine — Comments", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("addComment creates a comment", () =>
    {
        engine.addObject({ id: "obj1" });

        const comment = engine.addComment(
            { type: "object", entityId: "obj1" },
            "This is a comment",
            "user-1",
            "Alice"
        );

        expect(comment).toBeDefined();
        expect(comment.id).toBeDefined();
        expect(comment.status).toBe("open");
        expect(comment.thread.length).toBe(1);
        expect(comment.thread[0].content).toBe("This is a comment");
    });

    test("getComments returns all comments", () =>
    {
        engine.addObject({ id: "obj1" });

        engine.addComment(
            { type: "object", entityId: "obj1" },
            "Comment A",
            "user-1",
            "Alice"
        );

        engine.addComment(
            { type: "canvas", position: { x: 100, y: 200 } },
            "Comment B",
            "user-2",
            "Bob"
        );

        const comments = engine.getComments();

        expect(comments.length).toBe(2);
    });

    test("getComments returns empty initially", () =>
    {
        const comments = engine.getComments();

        expect(comments).toEqual([]);
    });

    test("getCommentsForObject returns comments for specific object", () =>
    {
        engine.addObject({ id: "obj1" });
        engine.addObject({ id: "obj2" });

        engine.addComment(
            { type: "object", entityId: "obj1" },
            "On obj1",
            "user-1",
            "Alice"
        );

        engine.addComment(
            { type: "object", entityId: "obj2" },
            "On obj2",
            "user-2",
            "Bob"
        );

        const obj1Comments = engine.getCommentsForObject("obj1");

        expect(obj1Comments.length).toBe(1);
        expect(obj1Comments[0].thread[0].content).toBe("On obj1");
    });

    test("getCommentsForObject returns empty for object with no comments", () =>
    {
        engine.addObject({ id: "obj1" });

        const comments = engine.getCommentsForObject("obj1");

        expect(comments).toEqual([]);
    });

    test("resolveComment marks comment as resolved", () =>
    {
        engine.addObject({ id: "obj1" });

        const comment = engine.addComment(
            { type: "object", entityId: "obj1" },
            "Needs review",
            "user-1",
            "Alice"
        );

        expect(comment.status).toBe("open");

        engine.resolveComment(comment.id);

        const updated = engine.getComments().find(
            (c) => c.id === comment.id
        );

        expect(updated).toBeDefined();
        expect(updated!.status).toBe("resolved");
    });
});

// ============================================================================
// 5. DEEP LINKING
// ============================================================================

describe("DiagramEngine — Deep Linking", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("navigateToURI with valid object URI returns true", () =>
    {
        engine.addObject({ id: "nav-target" });

        const result = engine.navigateToURI("object://nav-target");

        expect(result).toBe(true);
    });

    test("navigateToURI with unknown object returns false", () =>
    {
        const result = engine.navigateToURI("object://nonexistent");

        expect(result).toBe(false);
    });

    test("navigateToURI with invalid URI format returns false", () =>
    {
        const result = engine.navigateToURI("no-scheme-here");

        expect(result).toBe(false);
    });
});

// ============================================================================
// 6. EVENTS
// ============================================================================

describe("DiagramEngine — Events", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("on() registers event handler", () =>
    {
        const handler = vi.fn();

        engine.on("custom:event", handler);
        // Trigger via adding an object to confirm handler system is active
        engine.on("object:add", handler);
        engine.addObject({ id: "evt-obj" });

        expect(handler).toHaveBeenCalled();
    });

    test("off() removes event handler", () =>
    {
        const handler = vi.fn();

        engine.on("object:add", handler);
        engine.off("object:add", handler);
        engine.addObject({ id: "evt-obj" });

        expect(handler).not.toHaveBeenCalled();
    });

    test("object:add event fires when adding object", () =>
    {
        const handler = vi.fn();

        engine.on("object:add", handler);
        engine.addObject({ id: "evt-add" });

        expect(handler).toHaveBeenCalledTimes(1);

        const arg = handler.mock.calls[0][0] as { id: string };

        expect(arg.id).toBe("evt-add");
    });

    test("object:remove event fires when removing object", () =>
    {
        const handler = vi.fn();

        engine.addObject({ id: "evt-rm" });
        engine.on("object:remove", handler);
        engine.removeObject("evt-rm");

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith("evt-rm");
    });

    test("selection:change event fires on select", () =>
    {
        const handler = vi.fn();

        engine.addObject({ id: "sel-obj" });
        engine.on("selection:change", handler);
        engine.select(["sel-obj"]);

        expect(handler).toHaveBeenCalled();
    });

    test("tool:change event fires on setActiveTool", () =>
    {
        const handler = vi.fn();

        engine.on("tool:change", handler);
        engine.setActiveTool("draw");

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith("draw");
    });
});

// ============================================================================
// 7. SPATIAL QUERIES
// ============================================================================

describe("DiagramEngine — Spatial Queries", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("findObjectsInRect returns objects within rect", () =>
    {
        engine.addObject({
            id: "inside",
            presentation: {
                shape: "rectangle",
                bounds: { x: 50, y: 50, width: 40, height: 40 },
                layer: "default"
            }
        });

        engine.addObject({
            id: "outside",
            presentation: {
                shape: "rectangle",
                bounds: { x: 500, y: 500, width: 40, height: 40 },
                layer: "default"
            }
        });

        const results = engine.findObjectsInRect({
            x: 0, y: 0, width: 200, height: 200
        });

        expect(results.length).toBe(1);
        expect(results[0].id).toBe("inside");
    });

    test("findObjectsInRect returns empty when none in rect", () =>
    {
        engine.addObject({
            id: "far",
            presentation: {
                shape: "rectangle",
                bounds: { x: 500, y: 500, width: 40, height: 40 },
                layer: "default"
            }
        });

        const results = engine.findObjectsInRect({
            x: 0, y: 0, width: 100, height: 100
        });

        expect(results).toEqual([]);
    });

    test("findObjectsAtPoint returns objects at point", () =>
    {
        engine.addObject({
            id: "hit",
            presentation: {
                shape: "rectangle",
                bounds: { x: 10, y: 10, width: 100, height: 100 },
                layer: "default"
            }
        });

        const results = engine.findObjectsAtPoint({ x: 50, y: 50 });

        expect(results.length).toBe(1);
        expect(results[0].id).toBe("hit");
    });

    test("findObjectsAtPoint returns empty when none at point", () =>
    {
        engine.addObject({
            id: "miss",
            presentation: {
                shape: "rectangle",
                bounds: { x: 10, y: 10, width: 50, height: 50 },
                layer: "default"
            }
        });

        const results = engine.findObjectsAtPoint({ x: 500, y: 500 });

        expect(results).toEqual([]);
    });
});

// ============================================================================
// 8. STENCILS
// ============================================================================

describe("DiagramEngine — Stencils", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("getAvailableShapes returns shapes", () =>
    {
        const shapes = engine.getAvailableShapes();

        expect(Array.isArray(shapes)).toBe(true);
        expect(shapes.length).toBeGreaterThan(0);
    });

    test("registerStencilPack adds shapes", () =>
    {
        const before = engine.getAvailableShapes().length;

        engine.registerStencilPack("test-pack", [
            makeStubShape("custom-star", "Star", "bi-star")
        ]);

        const after = engine.getAvailableShapes().length;

        expect(after).toBe(before + 1);
    });

    test("registered shapes appear in getAvailableShapes", () =>
    {
        engine.registerStencilPack("test-pack", [
            makeStubShape("custom-hexagon", "Hexagon", "bi-hexagon")
        ]);

        const shapes = engine.getAvailableShapes();
        const found = shapes.find((s) => s.type === "custom-hexagon");

        expect(found).toBeDefined();
        expect(found!.label).toBe("Hexagon");
    });

    test("loadStencilPack loads built-in pack", () =>
    {
        const before = engine.getAvailableShapes().length;

        engine.loadStencilPack("flowchart");

        const after = engine.getAvailableShapes().length;

        expect(after).toBeGreaterThan(before);
    });

    test("setDrawShape changes draw shape type", () =>
    {
        // setDrawShape should not throw when given a valid shape type
        expect(() =>
        {
            engine.setDrawShape("ellipse");
        }).not.toThrow();
    });
});
