/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DiagramEngine — Core API
 * Covers: factory/lifecycle, object CRUD, selection, viewport/zoom,
 * undo/redo, tools, and serialisation.
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
    container.id = "test-core-" + Math.random().toString(36).substring(2, 8);
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
    engine = createDiagramEngine(container.id, {});
}

function teardown(): void
{
    container.remove();
}

// ============================================================================
// 1. FACTORY & LIFECYCLE
// ============================================================================

describe("DiagramEngine — Factory & Lifecycle", () =>
{
    afterEach(() => { teardown(); });

    test("creates engine from string ID", () =>
    {
        setup();
        expect(engine).toBeDefined();
    });

    test("creates engine from HTMLElement", () =>
    {
        container = document.createElement("div");
        container.id = "test-el-" + Math.random().toString(36).substring(2, 8);
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);

        engine = createDiagramEngine(container, {});

        expect(engine).toBeDefined();
    });

    test("throws on invalid container string", () =>
    {
        container = document.createElement("div");
        container.id = "dummy-teardown";
        document.body.appendChild(container);

        expect(() =>
        {
            createDiagramEngine("nonexistent-id-xyz", {});
        }).toThrow();
    });

    test("getElement returns an element", () =>
    {
        setup();

        const el = engine.getElement();

        expect(el).toBeDefined();
        expect(el.tagName).toBeDefined();
    });

    test("resize does not throw", () =>
    {
        setup();

        expect(() => { engine.resize(); }).not.toThrow();
    });

    test("destroy cleans up DOM", () =>
    {
        setup();

        const svgBefore = container.querySelector("svg");

        expect(svgBefore).not.toBeNull();

        engine.destroy();

        // After destroy, the SVG should be removed
        const svgAfter = container.querySelector("svg");

        expect(svgAfter).toBeNull();
    });

    test("destroy is idempotent — calling twice does not throw", () =>
    {
        setup();

        expect(() =>
        {
            engine.destroy();
            engine.destroy();
        }).not.toThrow();
    });
});

// ============================================================================
// 2. OBJECT CRUD
// ============================================================================

describe("DiagramEngine — Object CRUD", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("addObject with minimal input returns object with generated ID", () =>
    {
        const obj = engine.addObject({});

        expect(obj).toBeDefined();
        expect(obj.id).toBeDefined();
        expect(typeof obj.id).toBe("string");
        expect(obj.id.length).toBeGreaterThan(0);
    });

    test("addObject with explicit ID uses that ID", () =>
    {
        const obj = engine.addObject({ id: "my-custom-id" });

        expect(obj.id).toBe("my-custom-id");
    });

    test("addObject with semantic data preserves it", () =>
    {
        const obj = engine.addObject({
            id: "semantic-test",
            semantic: {
                type: "uml.class",
                data: { className: "Foo", methods: ["bar"] },
                tags: ["architecture", "core"],
            },
        });

        expect(obj.semantic.type).toBe("uml.class");
        expect(obj.semantic.data).toEqual({ className: "Foo", methods: ["bar"] });
        expect(obj.semantic.tags).toEqual(["architecture", "core"]);
    });

    test("addObject with custom bounds", () =>
    {
        const obj = engine.addObject({
            id: "custom-bounds",
            presentation: {
                bounds: { x: 50, y: 75, width: 200, height: 150 },
            },
        });

        expect(obj.presentation.bounds.x).toBe(50);
        expect(obj.presentation.bounds.y).toBe(75);
        expect(obj.presentation.bounds.width).toBe(200);
        expect(obj.presentation.bounds.height).toBe(150);
    });

    test("addObject with custom style", () =>
    {
        const obj = engine.addObject({
            id: "custom-style",
            presentation: {
                style: {
                    fill: { type: "solid", color: "#ff0000" },
                    stroke: { color: "#00ff00", width: 3 },
                },
            },
        });

        expect(obj.presentation.style.fill).toEqual({ type: "solid", color: "#ff0000" });
        expect(obj.presentation.style.stroke).toEqual({ color: "#00ff00", width: 3 });
    });

    test("getObject returns added object", () =>
    {
        engine.addObject({ id: "findable" });

        const found = engine.getObject("findable");

        expect(found).not.toBeNull();
        expect(found!.id).toBe("findable");
    });

    test("getObject returns null for unknown ID", () =>
    {
        const found = engine.getObject("does-not-exist");

        expect(found).toBeNull();
    });

    test("getObjects returns all objects", () =>
    {
        engine.addObject({ id: "a" });
        engine.addObject({ id: "b" });
        engine.addObject({ id: "c" });

        const all = engine.getObjects();

        expect(all.length).toBe(3);

        const ids = all.map((o) => o.id);

        expect(ids).toContain("a");
        expect(ids).toContain("b");
        expect(ids).toContain("c");
    });

    test("getObjects returns empty array initially", () =>
    {
        const all = engine.getObjects();

        expect(all).toEqual([]);
    });

    test("removeObject removes the object", () =>
    {
        engine.addObject({ id: "removable" });

        expect(engine.getObject("removable")).not.toBeNull();

        engine.removeObject("removable");

        expect(engine.getObject("removable")).toBeNull();
    });

    test("removeObject on unknown ID does not throw", () =>
    {
        expect(() =>
        {
            engine.removeObject("nonexistent-id");
        }).not.toThrow();
    });

    test("updateObject changes presentation bounds", () =>
    {
        engine.addObject({ id: "upd-bounds" });

        engine.updateObject("upd-bounds", {
            presentation: {
                bounds: { x: 300, y: 400, width: 250, height: 180 },
            } as any,
        });

        const obj = engine.getObject("upd-bounds");

        expect(obj!.presentation.bounds.x).toBe(300);
        expect(obj!.presentation.bounds.y).toBe(400);
        expect(obj!.presentation.bounds.width).toBe(250);
        expect(obj!.presentation.bounds.height).toBe(180);
    });

    test("updateObject changes style", () =>
    {
        engine.addObject({ id: "upd-style" });

        engine.updateObject("upd-style", {
            presentation: {
                style: {
                    fill: { type: "solid", color: "#abcdef" },
                    stroke: { color: "#123456", width: 4 },
                },
            } as any,
        });

        const obj = engine.getObject("upd-style");

        expect(obj!.presentation.style.fill!.color).toBe("#abcdef");
    });

    test("updateObject changes semantic data", () =>
    {
        engine.addObject({
            id: "upd-sem",
            semantic: { type: "generic", data: { name: "old" } },
        });

        engine.updateObject("upd-sem", {
            semantic: { type: "uml.class", data: { name: "new" } } as any,
        });

        const obj = engine.getObject("upd-sem");

        expect(obj!.semantic.type).toBe("uml.class");
        expect(obj!.semantic.data.name).toBe("new");
    });

    test("getObjectsBySemanticType filters correctly", () =>
    {
        engine.addObject({
            id: "class-1",
            semantic: { type: "uml.class", data: {} },
        });
        engine.addObject({
            id: "task-1",
            semantic: { type: "bpmn.task", data: {} },
        });
        engine.addObject({
            id: "class-2",
            semantic: { type: "uml.class", data: {} },
        });

        const classes = engine.getObjectsBySemanticType("uml.class");
        const tasks = engine.getObjectsBySemanticType("bpmn.task");
        const nope = engine.getObjectsBySemanticType("nonexistent");

        expect(classes.length).toBe(2);
        expect(tasks.length).toBe(1);
        expect(nope.length).toBe(0);
    });
});

// ============================================================================
// 3. SELECTION
// ============================================================================

describe("DiagramEngine — Selection", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("select([id]) selects the object", () =>
    {
        engine.addObject({ id: "sel-1" });

        engine.select(["sel-1"]);

        const selected = engine.getSelectedObjectsPublic();

        expect(selected.length).toBe(1);
        expect(selected[0].id).toBe("sel-1");
    });

    test("select([]) clears selection", () =>
    {
        engine.addObject({ id: "sel-2" });
        engine.select(["sel-2"]);

        expect(engine.getSelectedObjectsPublic().length).toBe(1);

        engine.select([]);

        expect(engine.getSelectedObjectsPublic().length).toBe(0);
    });

    test("clearSelection clears all", () =>
    {
        engine.addObject({ id: "sel-3" });
        engine.addObject({ id: "sel-4" });
        engine.select(["sel-3", "sel-4"]);

        expect(engine.getSelectedObjectsPublic().length).toBe(2);

        engine.clearSelection();

        expect(engine.getSelectedObjectsPublic().length).toBe(0);
    });

    test("getSelectedObjectsPublic returns selected objects", () =>
    {
        engine.addObject({ id: "sel-a" });
        engine.addObject({ id: "sel-b" });
        engine.addObject({ id: "sel-c" });

        engine.select(["sel-a", "sel-c"]);

        const selected = engine.getSelectedObjectsPublic();
        const ids = selected.map((o) => o.id);

        expect(ids.length).toBe(2);
        expect(ids).toContain("sel-a");
        expect(ids).toContain("sel-c");
        expect(ids).not.toContain("sel-b");
    });

    test("select multiple IDs", () =>
    {
        engine.addObject({ id: "m1" });
        engine.addObject({ id: "m2" });
        engine.addObject({ id: "m3" });

        engine.select(["m1", "m2", "m3"]);

        const selected = engine.getSelectedObjectsPublic();

        expect(selected.length).toBe(3);
    });

    test("selecting non-existent ID does not throw", () =>
    {
        expect(() =>
        {
            engine.select(["ghost-id"]);
        }).not.toThrow();

        // No object with that ID, so selected objects array is empty
        const selected = engine.getSelectedObjectsPublic();

        expect(selected.length).toBe(0);
    });

    test("select replaces previous selection", () =>
    {
        engine.addObject({ id: "r1" });
        engine.addObject({ id: "r2" });

        engine.select(["r1"]);

        expect(engine.getSelectedObjectsPublic().length).toBe(1);
        expect(engine.getSelectedObjectsPublic()[0].id).toBe("r1");

        engine.select(["r2"]);

        expect(engine.getSelectedObjectsPublic().length).toBe(1);
        expect(engine.getSelectedObjectsPublic()[0].id).toBe("r2");
    });

    test("isSelected returns correct state", () =>
    {
        engine.addObject({ id: "is1" });
        engine.addObject({ id: "is2" });

        engine.select(["is1"]);

        expect(engine.isSelected("is1")).toBe(true);
        expect(engine.isSelected("is2")).toBe(false);
    });

    test("addToSelection adds without clearing", () =>
    {
        engine.addObject({ id: "add1" });
        engine.addObject({ id: "add2" });

        engine.select(["add1"]);
        engine.addToSelection("add2");

        const selected = engine.getSelectedObjectsPublic();

        expect(selected.length).toBe(2);
    });
});

// ============================================================================
// 4. VIEWPORT & ZOOM
// ============================================================================

describe("DiagramEngine — Viewport & Zoom", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("initial zoom level is 1.0", () =>
    {
        expect(engine.getZoomLevel()).toBe(1.0);
    });

    test("zoomIn increases zoom level", () =>
    {
        const before = engine.getZoomLevel();

        engine.zoomIn();

        expect(engine.getZoomLevel()).toBeGreaterThan(before);
    });

    test("zoomOut decreases zoom level", () =>
    {
        const before = engine.getZoomLevel();

        engine.zoomOut();

        expect(engine.getZoomLevel()).toBeLessThan(before);
    });

    test("setZoomLevel sets exact level", () =>
    {
        engine.setZoomLevel(2.0);

        expect(engine.getZoomLevel()).toBeCloseTo(2.0, 1);
    });

    test("setZoomLevel clamps to min", () =>
    {
        engine.setZoomLevel(0.01);

        // MIN_ZOOM is 0.1, should clamp
        expect(engine.getZoomLevel()).toBeGreaterThanOrEqual(0.1);
    });

    test("setZoomLevel clamps to max", () =>
    {
        engine.setZoomLevel(100);

        // MAX_ZOOM is 4.0, should clamp
        expect(engine.getZoomLevel()).toBeLessThanOrEqual(4.0);
    });

    test("getZoomLevel returns current zoom", () =>
    {
        const level = engine.getZoomLevel();

        expect(typeof level).toBe("number");
        expect(level).toBeGreaterThan(0);
    });

    test("getViewport returns viewport state", () =>
    {
        const vp = engine.getViewport();

        expect(vp).toBeDefined();
        expect(typeof vp.x).toBe("number");
        expect(typeof vp.y).toBe("number");
        expect(typeof vp.zoom).toBe("number");
    });

    test("zoomToFit does not throw with no objects", () =>
    {
        expect(() => { engine.zoomToFit(); }).not.toThrow();
    });

    test("zoomToFit does not throw with objects", () =>
    {
        engine.addObject({ id: "ztf-1" });
        engine.addObject({
            id: "ztf-2",
            presentation: { bounds: { x: 500, y: 500, width: 100, height: 100 } },
        });

        expect(() => { engine.zoomToFit(); }).not.toThrow();
    });
});

// ============================================================================
// 5. UNDO/REDO
// ============================================================================

describe("DiagramEngine — Undo/Redo", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("canUndo is false initially", () =>
    {
        expect(engine.canUndo()).toBe(false);
    });

    test("canRedo is false initially", () =>
    {
        expect(engine.canRedo()).toBe(false);
    });

    test("after pushUndoCommand, canUndo is true", () =>
    {
        const obj = engine.addObject({ id: "undo-obj" });

        engine.pushUndoCommand({
            type: "test-add",
            label: "Add object",
            timestamp: Date.now(),
            mergeable: false,
            undo: () => { engine.removeObject(obj.id); },
            redo: () => { engine.addObject({ id: obj.id }); },
        });

        expect(engine.canUndo()).toBe(true);
    });

    test("undo reverses the command", () =>
    {
        const obj = engine.addObject({ id: "undo-rev" });

        engine.pushUndoCommand({
            type: "test-add",
            label: "Add object",
            timestamp: Date.now(),
            mergeable: false,
            undo: () => { engine.removeObject("undo-rev"); },
            redo: () => { engine.addObject({ id: "undo-rev" }); },
        });

        expect(engine.getObject("undo-rev")).not.toBeNull();

        engine.undo();

        expect(engine.getObject("undo-rev")).toBeNull();
    });

    test("after undo, canRedo is true", () =>
    {
        engine.addObject({ id: "undo-redo" });

        engine.pushUndoCommand({
            type: "test-add",
            label: "Add",
            timestamp: Date.now(),
            mergeable: false,
            undo: () => { engine.removeObject("undo-redo"); },
            redo: () => { engine.addObject({ id: "undo-redo" }); },
        });

        engine.undo();

        expect(engine.canRedo()).toBe(true);
    });

    test("redo restores the object", () =>
    {
        engine.addObject({ id: "redo-obj" });

        engine.pushUndoCommand({
            type: "test-add",
            label: "Add",
            timestamp: Date.now(),
            mergeable: false,
            undo: () => { engine.removeObject("redo-obj"); },
            redo: () => { engine.addObject({ id: "redo-obj" }); },
        });

        engine.undo();

        expect(engine.getObject("redo-obj")).toBeNull();

        engine.redo();

        expect(engine.getObject("redo-obj")).not.toBeNull();
    });

    test("after undo of single action, canUndo is false", () =>
    {
        engine.addObject({ id: "single-undo" });

        engine.pushUndoCommand({
            type: "test-add",
            label: "Add",
            timestamp: Date.now(),
            mergeable: false,
            undo: () => { engine.removeObject("single-undo"); },
            redo: () => { engine.addObject({ id: "single-undo" }); },
        });

        engine.undo();

        expect(engine.canUndo()).toBe(false);
    });

    test("multiple undo steps work", () =>
    {
        engine.addObject({ id: "multi-1" });

        engine.pushUndoCommand({
            type: "test-add",
            label: "Add 1",
            timestamp: Date.now(),
            mergeable: false,
            undo: () => { engine.removeObject("multi-1"); },
            redo: () => { engine.addObject({ id: "multi-1" }); },
        });

        engine.addObject({ id: "multi-2" });

        engine.pushUndoCommand({
            type: "test-add",
            label: "Add 2",
            timestamp: Date.now() + 1000,
            mergeable: false,
            undo: () => { engine.removeObject("multi-2"); },
            redo: () => { engine.addObject({ id: "multi-2" }); },
        });

        expect(engine.getObjects().length).toBe(2);

        engine.undo();

        expect(engine.getObjects().length).toBe(1);
        expect(engine.getObject("multi-2")).toBeNull();

        engine.undo();

        expect(engine.getObjects().length).toBe(0);
        expect(engine.getObject("multi-1")).toBeNull();
    });

    test("undo without any commands does not throw", () =>
    {
        expect(() => { engine.undo(); }).not.toThrow();
    });

    test("redo without any undone commands does not throw", () =>
    {
        expect(() => { engine.redo(); }).not.toThrow();
    });
});

// ============================================================================
// 6. TOOLS
// ============================================================================

describe("DiagramEngine — Tools", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("default tool is select", () =>
    {
        expect(engine.getActiveTool()).toBe("select");
    });

    test("setActiveTool changes tool", () =>
    {
        engine.setActiveTool("pan");

        expect(engine.getActiveTool()).toBe("pan");
    });

    test("getActiveTool returns current tool", () =>
    {
        const tool = engine.getActiveTool();

        expect(typeof tool).toBe("string");
        expect(tool.length).toBeGreaterThan(0);
    });

    test("setActiveTool to draw", () =>
    {
        engine.setActiveTool("draw");

        expect(engine.getActiveTool()).toBe("draw");
    });

    test("setActiveTool to connect", () =>
    {
        engine.setActiveTool("connect");

        expect(engine.getActiveTool()).toBe("connect");
    });
});

// ============================================================================
// 7. SERIALISATION
// ============================================================================

describe("DiagramEngine — Serialisation", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("toJSON returns valid JSON string", () =>
    {
        const json = engine.toJSON();

        expect(typeof json).toBe("string");
        expect(() => { JSON.parse(json); }).not.toThrow();
    });

    test("toJSON with indent formats output", () =>
    {
        const json = engine.toJSON(2);

        expect(json).toContain("\n");
        expect(json).toContain("  ");
    });

    test("fromJSON loads document", () =>
    {
        engine.addObject({ id: "pre-load" });

        const json = engine.toJSON();

        // Create a fresh engine and load the document
        const container2 = document.createElement("div");

        container2.id = "test-from-json-" + Math.random().toString(36).substring(2, 8);
        container2.style.width = "800px";
        container2.style.height = "600px";
        document.body.appendChild(container2);

        const engine2 = createDiagramEngine(container2.id, {});

        engine2.fromJSON(json);

        const obj = engine2.getObject("pre-load");

        expect(obj).not.toBeNull();

        container2.remove();
    });

    test("round-trip: toJSON -> fromJSON preserves objects", () =>
    {
        engine.addObject({
            id: "rt-1",
            semantic: { type: "uml.class", data: { name: "Foo" } },
            presentation: {
                shape: "rectangle",
                bounds: { x: 10, y: 20, width: 300, height: 200 },
            },
        });
        engine.addObject({
            id: "rt-2",
            semantic: { type: "bpmn.task", data: { name: "Bar" } },
        });

        const json = engine.toJSON();

        const container2 = document.createElement("div");

        container2.id = "test-rt-" + Math.random().toString(36).substring(2, 8);
        container2.style.width = "800px";
        container2.style.height = "600px";
        document.body.appendChild(container2);

        const engine2 = createDiagramEngine(container2.id, {});

        engine2.fromJSON(json);

        expect(engine2.getObjects().length).toBe(2);

        const o1 = engine2.getObject("rt-1");

        expect(o1).not.toBeNull();
        expect(o1!.semantic.type).toBe("uml.class");
        expect(o1!.presentation.bounds.width).toBe(300);

        const o2 = engine2.getObject("rt-2");

        expect(o2).not.toBeNull();
        expect(o2!.semantic.type).toBe("bpmn.task");

        container2.remove();
    });

    test("round-trip preserves connectors", () =>
    {
        engine.addObject({ id: "conn-src" });
        engine.addObject({ id: "conn-tgt" });
        engine.addConnector({
            presentation: {
                sourceId: "conn-src",
                targetId: "conn-tgt",
                waypoints: [],
                routing: "straight",
                style: { color: "#000", width: 1.5, endArrow: "classic" },
                labels: [],
            },
        });

        const json = engine.toJSON();
        const doc = JSON.parse(json);

        expect(doc.connectors.length).toBe(1);
        expect(doc.connectors[0].presentation.sourceId).toBe("conn-src");
        expect(doc.connectors[0].presentation.targetId).toBe("conn-tgt");
    });

    test("isDirty is false initially", () =>
    {
        expect(engine.isDirty()).toBe(false);
    });

    test("isDirty is true after addObject", () =>
    {
        engine.addObject({ id: "dirty-test" });

        expect(engine.isDirty()).toBe(true);
    });

    test("markClean resets dirty flag", () =>
    {
        engine.addObject({ id: "clean-test" });

        expect(engine.isDirty()).toBe(true);

        engine.markClean();

        expect(engine.isDirty()).toBe(false);
    });

    test("exportSVG returns SVG string", () =>
    {
        engine.addObject({ id: "svg-export" });

        const svg = engine.exportSVG();

        expect(typeof svg).toBe("string");
        expect(svg).toContain("<svg");
        expect(svg).toContain("</svg>");
    });

    test("exportJSON returns JSON string", () =>
    {
        engine.addObject({ id: "json-export" });

        const json = engine.exportJSON();

        expect(typeof json).toBe("string");

        const doc = JSON.parse(json);

        expect(doc.objects).toBeDefined();
        expect(doc.objects.length).toBe(1);
    });
});
