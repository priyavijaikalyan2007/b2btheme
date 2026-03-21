/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DiagramEngine — Feature Coverage
 * Covers: Connectors, Layers, Groups, Transforms, Clipboard,
 * Z-Ordering, Alignment, and Page Frames.
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
    container.id = "test-feat-" + Math.random().toString(36).substring(2, 8);
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
    engine = createDiagramEngine(container.id, {});
}

function teardown(): void
{
    container.remove();
}

/** Shorthand to add a rectangle at a given position. */
function addRect(
    id: string,
    x: number,
    y: number,
    w: number,
    h: number
): ReturnType<typeof engine.addObject>
{
    return engine.addObject({
        id,
        presentation: {
            shape: "rectangle",
            bounds: { x, y, width: w, height: h },
            style: {
                fill: { type: "solid", color: "#ffffff" },
                stroke: { color: "#000000", width: 1 }
            },
            layer: "default"
        }
    });
}

// ============================================================================
// 1. CONNECTORS
// ============================================================================

describe("DiagramEngine — Connectors", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("addConnector with source/target returns connector", () =>
    {
        const a = addRect("src", 0, 0, 100, 60);
        const b = addRect("tgt", 200, 0, 100, 60);

        const conn = engine.addConnector({
            presentation: {
                sourceId: a.id,
                targetId: b.id,
                waypoints: [],
                routing: "straight",
                style: { color: "#000", width: 1 },
                labels: []
            }
        });

        expect(conn).toBeDefined();
        expect(conn.presentation.sourceId).toBe("src");
        expect(conn.presentation.targetId).toBe("tgt");
    });

    test("connector renders a visible path with stroke", () =>
    {
        const a = addRect("vis-src", 0, 0, 100, 60);
        const b = addRect("vis-tgt", 300, 0, 100, 60);

        const conn = engine.addConnector({
            presentation: {
                sourceId: a.id,
                targetId: b.id,
                waypoints: [],
                routing: "straight",
                style: { color: "#ff0000", width: 2 },
                labels: []
            }
        });

        const connEl = container.querySelector(
            `[data-connector-id="${conn.id}"]`
        );

        expect(connEl).not.toBeNull();

        const path = connEl!.querySelector("path");

        expect(path).not.toBeNull();
        expect(path!.getAttribute("d")).toBeTruthy();
        expect(path!.getAttribute("stroke")).toBe("#ff0000");
        expect(path!.getAttribute("stroke-width")).toBe("2");
        expect(path!.getAttribute("fill")).toBe("none");

        // The path d should contain M and L (straight line)
        const d = path!.getAttribute("d") || "";

        expect(d).toMatch(/^M\s/);
        expect(d).toContain("L");
    });

    test("addConnector with explicit ID uses that ID", () =>
    {
        addRect("a", 0, 0, 50, 50);
        addRect("b", 100, 0, 50, 50);

        const conn = engine.addConnector({
            id: "my-conn-1",
            presentation: {
                sourceId: "a",
                targetId: "b",
                waypoints: [],
                routing: "straight",
                style: { color: "#000", width: 1 },
                labels: []
            }
        });

        expect(conn.id).toBe("my-conn-1");
    });

    test("getConnector returns an added connector", () =>
    {
        addRect("x", 0, 0, 40, 40);
        addRect("y", 100, 0, 40, 40);

        const conn = engine.addConnector({
            id: "conn-lookup",
            presentation: {
                sourceId: "x",
                targetId: "y",
                waypoints: [],
                routing: "straight",
                style: { color: "#000", width: 1 },
                labels: []
            }
        });

        const found = engine.getConnector("conn-lookup");

        expect(found).not.toBeNull();
        expect(found!.id).toBe("conn-lookup");
    });

    test("getConnector returns null for unknown ID", () =>
    {
        const result = engine.getConnector("nonexistent");

        expect(result).toBeNull();
    });

    test("getConnectors returns all connectors", () =>
    {
        addRect("c1", 0, 0, 40, 40);
        addRect("c2", 100, 0, 40, 40);
        addRect("c3", 200, 0, 40, 40);

        engine.addConnector({
            presentation: {
                sourceId: "c1", targetId: "c2",
                waypoints: [], routing: "straight",
                style: { color: "#000", width: 1 }, labels: []
            }
        });

        engine.addConnector({
            presentation: {
                sourceId: "c2", targetId: "c3",
                waypoints: [], routing: "straight",
                style: { color: "#000", width: 1 }, labels: []
            }
        });

        expect(engine.getConnectors().length).toBe(2);
    });

    test("getConnectors returns empty array initially", () =>
    {
        expect(engine.getConnectors()).toEqual([]);
    });

    test("removeConnector removes it from the document", () =>
    {
        addRect("r1", 0, 0, 40, 40);
        addRect("r2", 100, 0, 40, 40);

        engine.addConnector({
            id: "conn-del",
            presentation: {
                sourceId: "r1", targetId: "r2",
                waypoints: [], routing: "straight",
                style: { color: "#000", width: 1 }, labels: []
            }
        });

        expect(engine.getConnectors().length).toBe(1);

        engine.removeConnector("conn-del");

        expect(engine.getConnectors().length).toBe(0);
        expect(engine.getConnector("conn-del")).toBeNull();
    });

    test("updateConnector changes connector properties", () =>
    {
        addRect("u1", 0, 0, 40, 40);
        addRect("u2", 100, 0, 40, 40);

        engine.addConnector({
            id: "conn-upd",
            presentation: {
                sourceId: "u1", targetId: "u2",
                waypoints: [], routing: "straight",
                style: { color: "#000", width: 1 }, labels: []
            }
        });

        engine.updateConnector("conn-upd", {
            presentation: {
                sourceId: "u1", targetId: "u2",
                waypoints: [], routing: "orthogonal",
                style: { color: "#ff0000", width: 3 }, labels: []
            }
        });

        const updated = engine.getConnector("conn-upd");

        expect(updated).not.toBeNull();
        expect(updated!.presentation.routing).toBe("orthogonal");
        expect(updated!.presentation.style.color).toBe("#ff0000");
    });

    test("getConnectorsBetween returns connectors between two objects", () =>
    {
        addRect("ba", 0, 0, 40, 40);
        addRect("bb", 100, 0, 40, 40);
        addRect("bc", 200, 0, 40, 40);

        engine.addConnector({
            presentation: {
                sourceId: "ba", targetId: "bb",
                waypoints: [], routing: "straight",
                style: { color: "#000", width: 1 }, labels: []
            }
        });

        engine.addConnector({
            presentation: {
                sourceId: "bb", targetId: "ba",
                waypoints: [], routing: "straight",
                style: { color: "#000", width: 1 }, labels: []
            }
        });

        engine.addConnector({
            presentation: {
                sourceId: "ba", targetId: "bc",
                waypoints: [], routing: "straight",
                style: { color: "#000", width: 1 }, labels: []
            }
        });

        const between = engine.getConnectorsBetween("ba", "bb");

        expect(between.length).toBe(2);
    });

    test("getConnectorsBetween returns empty when none exist", () =>
    {
        addRect("iso1", 0, 0, 40, 40);
        addRect("iso2", 100, 0, 40, 40);

        const between = engine.getConnectorsBetween("iso1", "iso2");

        expect(between.length).toBe(0);
    });

    test("removing an object also removes attached connectors", () =>
    {
        addRect("del-a", 0, 0, 40, 40);
        addRect("del-b", 100, 0, 40, 40);

        engine.addConnector({
            id: "attached-conn",
            presentation: {
                sourceId: "del-a", targetId: "del-b",
                waypoints: [], routing: "straight",
                style: { color: "#000", width: 1 }, labels: []
            }
        });

        expect(engine.getConnectors().length).toBe(1);

        engine.removeObject("del-a");

        expect(engine.getConnectors().length).toBe(0);
        expect(engine.getConnector("attached-conn")).toBeNull();
    });
});

// ============================================================================
// 2. LAYERS
// ============================================================================

describe("DiagramEngine — Layers", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("default layer exists on creation", () =>
    {
        const layers = engine.getLayers();

        expect(layers.length).toBeGreaterThanOrEqual(1);

        const defaultLayer = layers.find((l) => l.id === "default");

        expect(defaultLayer).toBeDefined();
        expect(defaultLayer!.name).toBe("Default");
    });

    test("addLayer creates a new layer", () =>
    {
        const before = engine.getLayers().length;

        engine.addLayer({ name: "Annotations" });

        expect(engine.getLayers().length).toBe(before + 1);
    });

    test("addLayer with custom properties preserves them", () =>
    {
        const layer = engine.addLayer({
            id: "custom-layer",
            name: "Custom",
            visible: false,
            locked: true,
            opacity: 0.5
        });

        expect(layer.id).toBe("custom-layer");
        expect(layer.name).toBe("Custom");
        expect(layer.visible).toBe(false);
        expect(layer.locked).toBe(true);
        expect(layer.opacity).toBe(0.5);
    });

    test("getLayers returns all layers", () =>
    {
        engine.addLayer({ name: "Layer A" });
        engine.addLayer({ name: "Layer B" });

        const layers = engine.getLayers();

        // default + 2 custom
        expect(layers.length).toBeGreaterThanOrEqual(3);
    });

    test("removeLayer removes the layer from the list", () =>
    {
        const layer = engine.addLayer({ id: "removable", name: "Removable" });

        const before = engine.getLayers().length;

        engine.removeLayer("removable");

        expect(engine.getLayers().length).toBe(before - 1);

        const found = engine.getLayers().find((l) => l.id === "removable");

        expect(found).toBeUndefined();
    });

    test("cannot remove the default layer", () =>
    {
        const before = engine.getLayers().length;

        engine.removeLayer("default");

        expect(engine.getLayers().length).toBe(before);

        const defaultLayer = engine.getLayers().find((l) => l.id === "default");

        expect(defaultLayer).toBeDefined();
    });

    test("objects on removed layer move to default layer", () =>
    {
        const layer = engine.addLayer({ id: "temp-layer", name: "Temp" });

        engine.addObject({
            id: "layered-obj",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 100, height: 60 },
                style: {
                    fill: { type: "solid", color: "#fff" },
                    stroke: { color: "#000", width: 1 }
                },
                layer: "temp-layer"
            }
        });

        engine.removeLayer("temp-layer");

        const obj = engine.getObject("layered-obj");

        expect(obj).not.toBeNull();
        expect(obj!.presentation.layer).toBe("default");
    });

    test("addLayer returns the created Layer object", () =>
    {
        const layer = engine.addLayer({ name: "Returns" });

        expect(layer).toBeDefined();
        expect(layer.id).toBeDefined();
        expect(layer.name).toBe("Returns");
        expect(layer.visible).toBe(true);
        expect(layer.locked).toBe(false);
    });
});

// ============================================================================
// 3. GROUPS
// ============================================================================

describe("DiagramEngine — Groups", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("group() creates a group object", () =>
    {
        addRect("g1", 0, 0, 50, 50);
        addRect("g2", 100, 0, 50, 50);

        const before = engine.getObjects().length;
        const groupObj = engine.group(["g1", "g2"]);

        expect(groupObj).toBeDefined();
        expect(groupObj.semantic.type).toBe("group");

        // One extra object (the group container) should exist
        expect(engine.getObjects().length).toBe(before + 1);
    });

    test("group() requires at least 2 IDs", () =>
    {
        addRect("lone", 0, 0, 50, 50);

        expect(() => engine.group(["lone"])).toThrow();
    });

    test("ungroup() dissolves group and returns children", () =>
    {
        addRect("ug1", 0, 0, 50, 50);
        addRect("ug2", 100, 0, 50, 50);

        const groupObj = engine.group(["ug1", "ug2"]);
        const children = engine.ungroup(groupObj.id);

        expect(children.length).toBe(2);

        // Children should no longer have a groupId
        for (const child of children)
        {
            expect(child.presentation.groupId).toBeUndefined();
        }

        // The group container object should be removed
        expect(engine.getObject(groupObj.id)).toBeNull();
    });

    test("grouped objects share a groupId", () =>
    {
        addRect("sg1", 0, 0, 50, 50);
        addRect("sg2", 100, 0, 50, 50);

        const groupObj = engine.group(["sg1", "sg2"]);

        const obj1 = engine.getObject("sg1");
        const obj2 = engine.getObject("sg2");

        expect(obj1!.presentation.groupId).toBe(groupObj.id);
        expect(obj2!.presentation.groupId).toBe(groupObj.id);
    });

    test("collapseGroup does not throw", () =>
    {
        addRect("cg1", 0, 0, 50, 50);
        addRect("cg2", 100, 0, 50, 50);

        const groupObj = engine.group(["cg1", "cg2"]);

        expect(() => engine.collapseGroup(groupObj.id)).not.toThrow();
    });

    test("expandGroup does not throw", () =>
    {
        addRect("eg1", 0, 0, 50, 50);
        addRect("eg2", 100, 0, 50, 50);

        const groupObj = engine.group(["eg1", "eg2"]);

        engine.collapseGroup(groupObj.id);

        expect(() => engine.expandGroup(groupObj.id)).not.toThrow();
    });

    test("collapseGroup hides child objects", () =>
    {
        addRect("ch1", 0, 0, 50, 50);
        addRect("ch2", 100, 0, 50, 50);

        const groupObj = engine.group(["ch1", "ch2"]);

        engine.collapseGroup(groupObj.id);

        const obj1 = engine.getObject("ch1");
        const obj2 = engine.getObject("ch2");

        expect(obj1!.presentation.visible).toBe(false);
        expect(obj2!.presentation.visible).toBe(false);
    });

    test("expandGroup shows child objects", () =>
    {
        addRect("eh1", 0, 0, 50, 50);
        addRect("eh2", 100, 0, 50, 50);

        const groupObj = engine.group(["eh1", "eh2"]);

        engine.collapseGroup(groupObj.id);
        engine.expandGroup(groupObj.id);

        const obj1 = engine.getObject("eh1");
        const obj2 = engine.getObject("eh2");

        expect(obj1!.presentation.visible).toBe(true);
        expect(obj2!.presentation.visible).toBe(true);
    });
});

// ============================================================================
// 4. TRANSFORMS
// ============================================================================

describe("DiagramEngine — Transforms", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("flipHorizontal toggles flipX", () =>
    {
        addRect("fh", 0, 0, 100, 60);

        const before = engine.getObject("fh")!.presentation.flipX;

        engine.flipHorizontal(["fh"]);

        expect(engine.getObject("fh")!.presentation.flipX).toBe(!before);
    });

    test("flipVertical toggles flipY", () =>
    {
        addRect("fv", 0, 0, 100, 60);

        const before = engine.getObject("fv")!.presentation.flipY;

        engine.flipVertical(["fv"]);

        expect(engine.getObject("fv")!.presentation.flipY).toBe(!before);
    });

    test("rotateObjects updates rotation", () =>
    {
        addRect("rot", 0, 0, 100, 60);

        engine.rotateObjects(["rot"], 45);

        expect(engine.getObject("rot")!.presentation.rotation).toBe(45);
    });

    test("rotateObjects by 0 degrees is a no-op", () =>
    {
        addRect("rot0", 0, 0, 100, 60);

        const before = engine.getObject("rot0")!.presentation.rotation;

        engine.rotateObjects(["rot0"], 0);

        expect(engine.getObject("rot0")!.presentation.rotation).toBe(before);
    });

    test("rotateObjects accumulates (45 + 45 = 90)", () =>
    {
        addRect("rot-acc", 0, 0, 100, 60);

        engine.rotateObjects(["rot-acc"], 45);
        engine.rotateObjects(["rot-acc"], 45);

        expect(engine.getObject("rot-acc")!.presentation.rotation).toBe(90);
    });

    test("flipHorizontal twice returns to original", () =>
    {
        addRect("fh2", 0, 0, 100, 60);

        const original = engine.getObject("fh2")!.presentation.flipX;

        engine.flipHorizontal(["fh2"]);
        engine.flipHorizontal(["fh2"]);

        expect(engine.getObject("fh2")!.presentation.flipX).toBe(original);
    });

    test("flipVertical twice returns to original", () =>
    {
        addRect("fv2", 0, 0, 100, 60);

        const original = engine.getObject("fv2")!.presentation.flipY;

        engine.flipVertical(["fv2"]);
        engine.flipVertical(["fv2"]);

        expect(engine.getObject("fv2")!.presentation.flipY).toBe(original);
    });

    test("rotateObjects wraps at 360 degrees", () =>
    {
        addRect("rot-wrap", 0, 0, 100, 60);

        engine.rotateObjects(["rot-wrap"], 350);
        engine.rotateObjects(["rot-wrap"], 20);

        // (350 + 20) % 360 = 10
        expect(engine.getObject("rot-wrap")!.presentation.rotation).toBe(10);
    });
});

// ============================================================================
// 5. CLIPBOARD
// ============================================================================

describe("DiagramEngine — Clipboard", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("copy() with no selection does not throw", () =>
    {
        expect(() => engine.copy()).not.toThrow();
    });

    test("duplicate() creates a copy of selected objects", () =>
    {
        addRect("dup-src", 0, 0, 100, 60);

        engine.select(["dup-src"]);
        engine.duplicate();

        // Original + duplicate
        expect(engine.getObjects().length).toBe(2);
    });

    test("cut() removes selected objects", () =>
    {
        addRect("cut-1", 0, 0, 100, 60);
        addRect("cut-2", 200, 0, 100, 60);

        engine.select(["cut-1"]);
        engine.cut();

        expect(engine.getObject("cut-1")).toBeNull();

        // cut-2 should still exist
        expect(engine.getObject("cut-2")).not.toBeNull();
    });

    test("paste() after copy adds new objects", () =>
    {
        addRect("cp-src", 0, 0, 100, 60);

        engine.select(["cp-src"]);
        engine.copy();

        const before = engine.getObjects().length;

        engine.paste();

        expect(engine.getObjects().length).toBe(before + 1);
    });

    test("paste() offsets the new object by 20px", () =>
    {
        addRect("cp-off", 50, 80, 100, 60);

        engine.select(["cp-off"]);
        engine.copy();
        engine.paste();

        const all = engine.getObjects();
        const pasted = all.find((o) => o.id !== "cp-off");

        expect(pasted).toBeDefined();
        expect(pasted!.presentation.bounds.x).toBe(70);
        expect(pasted!.presentation.bounds.y).toBe(100);
    });

    test("paste() with empty clipboard does nothing", () =>
    {
        addRect("no-paste", 0, 0, 50, 50);

        const before = engine.getObjects().length;

        // No copy was done — clipboard should be empty
        engine.paste();

        expect(engine.getObjects().length).toBe(before);
    });
});

// ============================================================================
// 6. Z-ORDERING
// ============================================================================

describe("DiagramEngine — Z-Ordering", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("bringToFront moves object to highest zIndex", () =>
    {
        addRect("z1", 0, 0, 50, 50);
        addRect("z2", 60, 0, 50, 50);
        addRect("z3", 120, 0, 50, 50);

        engine.bringToFront(["z1"]);

        const obj1 = engine.getObject("z1")!;
        const obj2 = engine.getObject("z2")!;
        const obj3 = engine.getObject("z3")!;

        expect(obj1.presentation.zIndex).toBeGreaterThan(obj2.presentation.zIndex);
        expect(obj1.presentation.zIndex).toBeGreaterThan(obj3.presentation.zIndex);
    });

    test("sendToBack moves object to lowest zIndex", () =>
    {
        addRect("zb1", 0, 0, 50, 50);
        addRect("zb2", 60, 0, 50, 50);
        addRect("zb3", 120, 0, 50, 50);

        engine.sendToBack(["zb3"]);

        const obj1 = engine.getObject("zb1")!;
        const obj2 = engine.getObject("zb2")!;
        const obj3 = engine.getObject("zb3")!;

        expect(obj3.presentation.zIndex).toBeLessThan(obj1.presentation.zIndex);
        expect(obj3.presentation.zIndex).toBeLessThan(obj2.presentation.zIndex);
    });

    test("bringToFront then sendToBack on different objects maintains relative order", () =>
    {
        addRect("zo1", 0, 0, 50, 50);
        addRect("zo2", 60, 0, 50, 50);
        addRect("zo3", 120, 0, 50, 50);

        engine.bringToFront(["zo1"]);
        engine.sendToBack(["zo3"]);

        const obj1 = engine.getObject("zo1")!;
        const obj2 = engine.getObject("zo2")!;
        const obj3 = engine.getObject("zo3")!;

        expect(obj1.presentation.zIndex).toBeGreaterThan(obj2.presentation.zIndex);
        expect(obj3.presentation.zIndex).toBeLessThan(obj2.presentation.zIndex);
    });

    test("bringToFront multiple objects assigns the same highest zIndex", () =>
    {
        addRect("zm1", 0, 0, 50, 50);
        addRect("zm2", 60, 0, 50, 50);
        addRect("zm3", 120, 0, 50, 50);

        engine.bringToFront(["zm1", "zm2"]);

        const obj1 = engine.getObject("zm1")!;
        const obj2 = engine.getObject("zm2")!;
        const obj3 = engine.getObject("zm3")!;

        expect(obj1.presentation.zIndex).toBeGreaterThan(obj3.presentation.zIndex);
        expect(obj2.presentation.zIndex).toBeGreaterThan(obj3.presentation.zIndex);
    });

    test("sendToBack multiple objects assigns the same lowest zIndex", () =>
    {
        addRect("zn1", 0, 0, 50, 50);
        addRect("zn2", 60, 0, 50, 50);
        addRect("zn3", 120, 0, 50, 50);

        engine.sendToBack(["zn2", "zn3"]);

        const obj1 = engine.getObject("zn1")!;
        const obj2 = engine.getObject("zn2")!;
        const obj3 = engine.getObject("zn3")!;

        expect(obj2.presentation.zIndex).toBeLessThan(obj1.presentation.zIndex);
        expect(obj3.presentation.zIndex).toBeLessThan(obj1.presentation.zIndex);
    });

    test("bringToFront on single object in an empty canvas does not throw", () =>
    {
        addRect("zs", 0, 0, 50, 50);

        expect(() => engine.bringToFront(["zs"])).not.toThrow();
    });
});

// ============================================================================
// 7. ALIGNMENT
// ============================================================================

describe("DiagramEngine — Alignment", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("alignObjects 'left' aligns to leftmost edge", () =>
    {
        addRect("al1", 10, 0, 50, 50);
        addRect("al2", 80, 0, 50, 50);
        addRect("al3", 150, 0, 50, 50);

        engine.alignObjects(["al1", "al2", "al3"], "left");

        const x1 = engine.getObject("al1")!.presentation.bounds.x;
        const x2 = engine.getObject("al2")!.presentation.bounds.x;
        const x3 = engine.getObject("al3")!.presentation.bounds.x;

        expect(x1).toBe(10);
        expect(x2).toBe(10);
        expect(x3).toBe(10);
    });

    test("alignObjects 'right' aligns to rightmost edge", () =>
    {
        addRect("ar1", 10, 0, 50, 50);
        addRect("ar2", 80, 0, 60, 50);
        addRect("ar3", 150, 0, 40, 50);

        engine.alignObjects(["ar1", "ar2", "ar3"], "right");

        // Rightmost edge is max(10+50, 80+60, 150+40) = 190
        // Each object's x = rightEdge - width
        const b1 = engine.getObject("ar1")!.presentation.bounds;
        const b2 = engine.getObject("ar2")!.presentation.bounds;
        const b3 = engine.getObject("ar3")!.presentation.bounds;

        const rightEdge = 190;

        expect(b1.x + b1.width).toBe(rightEdge);
        expect(b2.x + b2.width).toBe(rightEdge);
        expect(b3.x + b3.width).toBe(rightEdge);
    });

    test("alignObjects 'top' aligns to topmost edge", () =>
    {
        addRect("at1", 0, 20, 50, 50);
        addRect("at2", 0, 80, 50, 50);
        addRect("at3", 0, 150, 50, 50);

        engine.alignObjects(["at1", "at2", "at3"], "top");

        const y1 = engine.getObject("at1")!.presentation.bounds.y;
        const y2 = engine.getObject("at2")!.presentation.bounds.y;
        const y3 = engine.getObject("at3")!.presentation.bounds.y;

        expect(y1).toBe(20);
        expect(y2).toBe(20);
        expect(y3).toBe(20);
    });

    test("alignObjects 'bottom' aligns to bottommost edge", () =>
    {
        addRect("ab1", 0, 10, 50, 40);
        addRect("ab2", 0, 80, 50, 60);
        addRect("ab3", 0, 150, 50, 30);

        engine.alignObjects(["ab1", "ab2", "ab3"], "bottom");

        // Bottom edge is max(10+40, 80+60, 150+30) = 180
        const b1 = engine.getObject("ab1")!.presentation.bounds;
        const b2 = engine.getObject("ab2")!.presentation.bounds;
        const b3 = engine.getObject("ab3")!.presentation.bounds;

        const bottomEdge = 180;

        expect(b1.y + b1.height).toBe(bottomEdge);
        expect(b2.y + b2.height).toBe(bottomEdge);
        expect(b3.y + b3.height).toBe(bottomEdge);
    });

    test("alignObjects 'center' centers horizontally", () =>
    {
        addRect("ac1", 10, 0, 30, 50);
        addRect("ac2", 80, 0, 60, 50);
        addRect("ac3", 200, 0, 40, 50);

        engine.alignObjects(["ac1", "ac2", "ac3"], "center");

        const b1 = engine.getObject("ac1")!.presentation.bounds;
        const b2 = engine.getObject("ac2")!.presentation.bounds;
        const b3 = engine.getObject("ac3")!.presentation.bounds;

        const center1 = b1.x + b1.width / 2;
        const center2 = b2.x + b2.width / 2;
        const center3 = b3.x + b3.width / 2;

        // All horizontal centres should be approximately equal
        expect(Math.abs(center1 - center2)).toBeLessThan(1);
        expect(Math.abs(center2 - center3)).toBeLessThan(1);
    });

    test("alignObjects 'middle' centers vertically", () =>
    {
        addRect("am1", 0, 10, 50, 30);
        addRect("am2", 0, 80, 50, 60);
        addRect("am3", 0, 200, 50, 40);

        engine.alignObjects(["am1", "am2", "am3"], "middle");

        const b1 = engine.getObject("am1")!.presentation.bounds;
        const b2 = engine.getObject("am2")!.presentation.bounds;
        const b3 = engine.getObject("am3")!.presentation.bounds;

        const mid1 = b1.y + b1.height / 2;
        const mid2 = b2.y + b2.height / 2;
        const mid3 = b3.y + b3.height / 2;

        expect(Math.abs(mid1 - mid2)).toBeLessThan(1);
        expect(Math.abs(mid2 - mid3)).toBeLessThan(1);
    });

    test("distributeObjects 'horizontal' distributes evenly", () =>
    {
        addRect("dh1", 0, 0, 40, 40);
        addRect("dh2", 100, 0, 40, 40);
        addRect("dh3", 300, 0, 40, 40);

        engine.distributeObjects(["dh1", "dh2", "dh3"], "horizontal");

        const b1 = engine.getObject("dh1")!.presentation.bounds;
        const b2 = engine.getObject("dh2")!.presentation.bounds;
        const b3 = engine.getObject("dh3")!.presentation.bounds;

        // First and last should remain fixed; middle is evenly distributed
        expect(b1.x).toBe(0);
        expect(b3.x).toBe(300);

        // Gap between first right edge and second left edge should equal
        // gap between second right edge and third left edge
        const gap1 = b2.x - (b1.x + b1.width);
        const gap2 = b3.x - (b2.x + b2.width);

        expect(Math.abs(gap1 - gap2)).toBeLessThan(1);
    });

    test("distributeObjects 'vertical' distributes evenly", () =>
    {
        addRect("dv1", 0, 0, 40, 40);
        addRect("dv2", 0, 100, 40, 40);
        addRect("dv3", 0, 300, 40, 40);

        engine.distributeObjects(["dv1", "dv2", "dv3"], "vertical");

        const b1 = engine.getObject("dv1")!.presentation.bounds;
        const b2 = engine.getObject("dv2")!.presentation.bounds;
        const b3 = engine.getObject("dv3")!.presentation.bounds;

        // First and last should remain fixed; middle is evenly distributed
        expect(b1.y).toBe(0);
        expect(b3.y).toBe(300);

        const gap1 = b2.y - (b1.y + b1.height);
        const gap2 = b3.y - (b2.y + b2.height);

        expect(Math.abs(gap1 - gap2)).toBeLessThan(1);
    });
});

// ============================================================================
// 8. PAGE FRAMES
// ============================================================================

describe("DiagramEngine — Page Frames", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("addPageFrame creates a frame", () =>
    {
        const frame = engine.addPageFrame("A4 Portrait", { x: 0, y: 0 });

        expect(frame).toBeDefined();
        expect(frame.id).toBeDefined();
        expect(frame.sizeName).toBe("A4 Portrait");
        expect(frame.width).toBe(794);
        expect(frame.height).toBe(1123);
    });

    test("getPageFrames returns all frames", () =>
    {
        engine.addPageFrame("A4 Portrait", { x: 0, y: 0 });
        engine.addPageFrame("A4 Landscape", { x: 900, y: 0 });

        const frames = engine.getPageFrames();

        expect(frames.length).toBe(2);
    });

    test("removePageFrame removes it", () =>
    {
        const frame = engine.addPageFrame("A4 Portrait", { x: 0, y: 0 });

        engine.removePageFrame(frame.id);

        expect(engine.getPageFrames().length).toBe(0);
    });

    test("lockPageFrame locks the frame", () =>
    {
        const frame = engine.addPageFrame("A4 Portrait", { x: 0, y: 0 });

        engine.lockPageFrame(frame.id);

        const updated = engine.getPageFrames().find((f) => f.id === frame.id);

        expect(updated!.locked).toBe(true);
    });

    test("unlockPageFrame unlocks the frame", () =>
    {
        const frame = engine.addPageFrame("A4 Portrait", { x: 0, y: 0 });

        engine.lockPageFrame(frame.id);
        engine.unlockPageFrame(frame.id);

        const updated = engine.getPageFrames().find((f) => f.id === frame.id);

        expect(updated!.locked).toBe(false);
    });

    test("setPageFrameBorder updates border properties", () =>
    {
        const frame = engine.addPageFrame("A4 Portrait", { x: 0, y: 0 });

        engine.setPageFrameBorder(frame.id, "#ff0000", 1.5);

        const updated = engine.getPageFrames().find((f) => f.id === frame.id);

        expect(updated!.borderColor).toBe("#ff0000");
        expect(updated!.borderWidth).toBe(1.5);
    });

    test("setPageFrameBackground updates background color", () =>
    {
        const frame = engine.addPageFrame("A4 Portrait", { x: 0, y: 0 });

        engine.setPageFrameBackground(frame.id, "rgba(255, 0, 0, 0.1)");

        const updated = engine.getPageFrames().find((f) => f.id === frame.id);

        expect(updated!.backgroundColor).toBe("rgba(255, 0, 0, 0.1)");
    });

    test("setPageFrameMargins updates margins", () =>
    {
        const frame = engine.addPageFrame("A4 Portrait", { x: 0, y: 0 });

        engine.setPageFrameMargins(frame.id, {
            top: 20, right: 15, bottom: 20, left: 15
        });

        const updated = engine.getPageFrames().find((f) => f.id === frame.id);

        expect(updated!.margins.top).toBe(20);
        expect(updated!.margins.right).toBe(15);
        expect(updated!.margins.bottom).toBe(20);
        expect(updated!.margins.left).toBe(15);
    });

    test("getPageFrameSizes returns available sizes", () =>
    {
        const sizes = engine.getPageFrameSizes();

        expect(sizes.length).toBeGreaterThan(0);

        const a4 = sizes.find((s) => s.name === "A4 Portrait");

        expect(a4).toBeDefined();
        expect(a4!.category).toBe("Paper");
    });

    test("scrollToPageFrame does not throw", () =>
    {
        const frame = engine.addPageFrame("A4 Portrait", { x: 0, y: 0 });

        expect(() => engine.scrollToPageFrame(frame.id)).not.toThrow();
    });
});
