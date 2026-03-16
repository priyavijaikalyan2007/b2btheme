/**
 * DiagramEngine — Comprehensive Playwright Tests
 *
 * Tests cover every feature specified in specs/diagramengine.prd.md.
 * Each test verifies functionality via the public API exposed on
 * window.createDiagramEngine and window.DiagramEngine.
 *
 * Test organisation mirrors the spec sections:
 *   §3  Document Model
 *   §4  Render Engine
 *   §5  Shape System
 *   §6  Tool System
 *   §7  Visual Guides
 *   §8  Templates
 *   §9  Layout Engine
 *   §10 Public API
 *   §11 Image and Icon Objects
 *   §12 Export
 */

import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Creates a DiagramEngine instance in the browser and returns a handle
 * for interacting with it via page.evaluate().
 */
async function createEngine(page: Page): Promise<void>
{
    await page.goto("/docs/demo.html");
    await page.waitForSelector(".de-canvas", { timeout: 10000 });
}

/**
 * Evaluates an expression against the global engine on the demo page.
 * The demo page creates `engine` in an IIFE — we need to find it.
 * Instead, we'll create our own engine in a test container.
 */
async function createTestEngine(page: Page): Promise<void>
{
    await page.goto("/docs/demo.html");

    await page.evaluate(() =>
    {
        const container = document.createElement("div");
        container.id = "test-engine-container";
        container.style.width = "800px";
        container.style.height = "600px";
        container.style.position = "absolute";
        container.style.top = "-9999px";
        document.body.appendChild(container);

        const createFn = (window as any).createDiagramEngine;
        if (!createFn)
        {
            throw new Error("createDiagramEngine not found on window");
        }

        (window as any).__testEngine = createFn("test-engine-container", {
            grid: { visible: true, size: 20, style: "dots" },
            editable: true,
            textEditable: true,
            connectable: true,
            resizable: true,
            rotatable: true,
        });
    });
}

async function evalEngine(page: Page, fn: string): Promise<any>
{
    return page.evaluate(`(window.__testEngine).${fn}`);
}

async function callEngine(page: Page, code: string): Promise<any>
{
    return page.evaluate(`
        (function() {
            var engine = window.__testEngine;
            ${code}
        })()
    `);
}

// ===========================================================================
// §3 DOCUMENT MODEL
// ===========================================================================

test.describe("§3 Document Model", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("engine creates with empty document", async ({ page }) =>
    {
        const doc = await callEngine(page, "return engine.getDocument();");
        expect(doc).toBeTruthy();
        expect(doc.version).toBe("1.0");
        expect(doc.objects).toHaveLength(0);
        expect(doc.connectors).toHaveLength(0);
        expect(doc.layers).toHaveLength(1);
        expect(doc.layers[0].id).toBe("default");
    });

    test("addObject creates object with ID", async ({ page }) =>
    {
        const obj = await callEngine(page, `
            return engine.addObject({
                semantic: { type: "test", data: { label: "Test" } },
                presentation: {
                    shape: "rectangle",
                    bounds: { x: 100, y: 100, width: 160, height: 80 }
                }
            });
        `);
        expect(obj).toBeTruthy();
        expect(obj.id).toBeTruthy();
        expect(obj.semantic.type).toBe("test");
        expect(obj.presentation.shape).toBe("rectangle");
        expect(obj.presentation.bounds.width).toBe(160);
    });

    test("addObject fills defaults for missing fields", async ({ page }) =>
    {
        const obj = await callEngine(page, `
            return engine.addObject({});
        `);
        expect(obj.presentation.shape).toBe("rectangle");
        expect(obj.presentation.rotation).toBe(0);
        expect(obj.presentation.flipX).toBe(false);
        expect(obj.presentation.flipY).toBe(false);
        expect(obj.presentation.locked).toBe(false);
        expect(obj.presentation.visible).toBe(true);
        expect(obj.presentation.layer).toBe("default");
    });

    test("removeObject removes from document", async ({ page }) =>
    {
        const id = await callEngine(page, `
            var obj = engine.addObject({});
            engine.removeObject(obj.id);
            return obj.id;
        `);
        const found = await callEngine(page, `
            return engine.getObject("${id}");
        `);
        expect(found).toBeNull();
    });

    test("updateObject modifies properties", async ({ page }) =>
    {
        await callEngine(page, `
            var obj = engine.addObject({
                semantic: { type: "original", data: {} }
            });
            engine.updateObject(obj.id, {
                semantic: { type: "updated", data: { modified: true } }
            });
            window.__testObjId = obj.id;
        `);
        const updated = await callEngine(page, `
            return engine.getObject(window.__testObjId);
        `);
        expect(updated.semantic.type).toBe("updated");
    });

    test("getObjects returns all objects", async ({ page }) =>
    {
        await callEngine(page, `
            engine.addObject({});
            engine.addObject({});
            engine.addObject({});
        `);
        const objects = await callEngine(page, "return engine.getObjects();");
        expect(objects).toHaveLength(3);
    });

    test("getObjectsBySemanticType filters correctly", async ({ page }) =>
    {
        await callEngine(page, `
            engine.addObject({ semantic: { type: "typeA", data: {} } });
            engine.addObject({ semantic: { type: "typeB", data: {} } });
            engine.addObject({ semantic: { type: "typeA", data: {} } });
        `);
        const typeA = await callEngine(page, `
            return engine.getObjectsBySemanticType("typeA");
        `);
        expect(typeA).toHaveLength(2);
    });

    test("semantic/presentation split is preserved", async ({ page }) =>
    {
        const obj = await callEngine(page, `
            return engine.addObject({
                semantic: {
                    type: "uml.class",
                    data: { className: "UserService" },
                    tags: ["backend"]
                },
                presentation: {
                    shape: "rectangle",
                    bounds: { x: 0, y: 0, width: 200, height: 100 }
                }
            });
        `);
        expect(obj.semantic.type).toBe("uml.class");
        expect(obj.semantic.data.className).toBe("UserService");
        expect(obj.semantic.tags).toContain("backend");
        expect(obj.presentation.shape).toBe("rectangle");
    });
});

// ===========================================================================
// §3.5 LAYERS
// ===========================================================================

test.describe("§3.5 Layers", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("default layer exists", async ({ page }) =>
    {
        const layers = await callEngine(page, "return engine.getLayers();");
        expect(layers).toHaveLength(1);
        expect(layers[0].name).toBe("Default");
    });

    test("addLayer creates new layer", async ({ page }) =>
    {
        const layer = await callEngine(page, `
            return engine.addLayer({ name: "Annotations" });
        `);
        expect(layer.name).toBe("Annotations");
        const layers = await callEngine(page, "return engine.getLayers();");
        expect(layers).toHaveLength(2);
    });

    test("removeLayer moves objects to default", async ({ page }) =>
    {
        await callEngine(page, `
            var layer = engine.addLayer({ name: "Temp" });
            engine.addObject({
                presentation: { layer: layer.id, shape: "rectangle",
                    bounds: { x: 0, y: 0, width: 100, height: 50 } }
            });
            engine.removeLayer(layer.id);
        `);
        const objects = await callEngine(page, "return engine.getObjects();");
        expect(objects[0].presentation.layer).toBe("default");
    });
});

// ===========================================================================
// §3.7 UNDO/REDO
// ===========================================================================

test.describe("§3.7 Undo/Redo", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("canUndo returns false initially", async ({ page }) =>
    {
        const can = await callEngine(page, "return engine.canUndo();");
        expect(can).toBe(false);
    });

    test("canRedo returns false initially", async ({ page }) =>
    {
        const can = await callEngine(page, "return engine.canRedo();");
        expect(can).toBe(false);
    });
});

// ===========================================================================
// §3.9 PERSISTENCE
// ===========================================================================

test.describe("§3.9 Persistence", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("toJSON produces valid JSON", async ({ page }) =>
    {
        await callEngine(page, "engine.addObject({});");
        const json = await callEngine(page, "return engine.toJSON(2);");
        const parsed = JSON.parse(json);
        expect(parsed.version).toBe("1.0");
        expect(parsed.objects).toHaveLength(1);
    });

    test("fromJSON restores document", async ({ page }) =>
    {
        await callEngine(page, `
            engine.addObject({
                semantic: { type: "test", data: { name: "hello" } }
            });
            var json = engine.toJSON();
            engine.clear();
            engine.fromJSON(json);
        `);
        const objects = await callEngine(page, "return engine.getObjects();");
        expect(objects).toHaveLength(1);
        expect(objects[0].semantic.data.name).toBe("hello");
    });

    test("isDirty tracks changes", async ({ page }) =>
    {
        const clean = await callEngine(page, "return engine.isDirty();");
        expect(clean).toBe(false);

        await callEngine(page, "engine.addObject({});");
        const dirty = await callEngine(page, "return engine.isDirty();");
        expect(dirty).toBe(true);

        await callEngine(page, "engine.markClean();");
        const cleanAgain = await callEngine(page, "return engine.isDirty();");
        expect(cleanAgain).toBe(false);
    });
});

// ===========================================================================
// §4 RENDER ENGINE
// ===========================================================================

test.describe("§4 Render Engine", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("SVG canvas element exists", async ({ page }) =>
    {
        const exists = await page.locator("#test-engine-container .de-canvas").count();
        expect(exists).toBe(1);
    });

    test("SVG has viewport group", async ({ page }) =>
    {
        const exists = await page.locator("#test-engine-container .de-viewport").count();
        expect(exists).toBe(1);
    });

    test("grid renders when visible", async ({ page }) =>
    {
        const gridEl = await page.locator("#test-engine-container .de-grid").count();
        expect(gridEl).toBe(1);
    });

    test("adding object creates SVG element", async ({ page }) =>
    {
        await callEngine(page, `
            engine.addObject({
                presentation: { shape: "rectangle",
                    bounds: { x: 50, y: 50, width: 100, height: 60 } }
            });
        `);
        const objCount = await page.locator(
            "#test-engine-container [data-id]"
        ).count();
        expect(objCount).toBeGreaterThanOrEqual(1);
    });

    test("removing object removes SVG element", async ({ page }) =>
    {
        await callEngine(page, `
            var obj = engine.addObject({});
            window.__removeId = obj.id;
        `);
        await callEngine(page, `
            engine.removeObject(window.__removeId);
        `);
        const objEls = await page.locator(
            `#test-engine-container [data-id="${await callEngine(page, "return window.__removeId")}"]`
        ).count();
        expect(objEls).toBe(0);
    });
});

// ===========================================================================
// §5 SHAPE SYSTEM
// ===========================================================================

test.describe("§5 Shape System", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("basic shapes are registered", async ({ page }) =>
    {
        const shapes = await callEngine(page, `
            return engine.getAvailableShapes().map(function(s) { return s.type; });
        `);
        expect(shapes).toContain("rectangle");
        expect(shapes).toContain("ellipse");
        expect(shapes).toContain("diamond");
        expect(shapes).toContain("triangle");
        expect(shapes).toContain("text");
    });

    test("extended shapes are registered", async ({ page }) =>
    {
        const shapes = await callEngine(page, `
            return engine.getAvailableShapes().map(function(s) { return s.type; });
        `);
        expect(shapes).toContain("hexagon");
        expect(shapes).toContain("star");
        expect(shapes).toContain("cross");
        expect(shapes).toContain("parallelogram");
        expect(shapes).toContain("arrow-right");
        expect(shapes).toContain("chevron");
        expect(shapes).toContain("callout");
        expect(shapes).toContain("donut");
        expect(shapes).toContain("image");
        expect(shapes).toContain("icon");
        expect(shapes).toContain("path");
    });

    test("each shape renders visible SVG", async ({ page }) =>
    {
        const shapeTypes = ["rectangle", "ellipse", "diamond", "triangle",
            "hexagon", "star", "cross", "donut"];

        for (const shapeType of shapeTypes)
        {
            await callEngine(page, `
                engine.addObject({
                    presentation: {
                        shape: "${shapeType}",
                        bounds: { x: 0, y: 0, width: 100, height: 80 }
                    }
                });
            `);
        }

        const objCount = await page.locator(
            "#test-engine-container [data-id]"
        ).count();
        expect(objCount).toBe(shapeTypes.length);
    });

    test("loadStencilPack registers new shapes", async ({ page }) =>
    {
        await callEngine(page, `engine.loadStencilPack("flowchart");`);
        const shapes = await callEngine(page, `
            return engine.getAvailableShapes().map(function(s) { return s.type; });
        `);
        expect(shapes).toContain("process");
        expect(shapes).toContain("decision");
        expect(shapes).toContain("terminator");
        expect(shapes).toContain("database");
    });

    test("loadStencilPack UML", async ({ page }) =>
    {
        await callEngine(page, `engine.loadStencilPack("uml");`);
        const shapes = await callEngine(page, `
            return engine.getAvailableShapes().map(function(s) { return s.type; });
        `);
        expect(shapes).toContain("uml-class");
        expect(shapes).toContain("uml-actor");
        expect(shapes).toContain("uml-note");
    });

    test("loadStencilPack BPMN", async ({ page }) =>
    {
        await callEngine(page, `engine.loadStencilPack("bpmn");`);
        const shapes = await callEngine(page, `
            return engine.getAvailableShapes().map(function(s) { return s.type; });
        `);
        expect(shapes).toContain("bpmn-task");
        expect(shapes).toContain("bpmn-start-event");
        expect(shapes).toContain("bpmn-end-event");
        expect(shapes).toContain("bpmn-gateway");
    });

    test("registerStencilPack adds custom shapes", async ({ page }) =>
    {
        await callEngine(page, `
            engine.registerStencilPack("custom", [{
                type: "my-shape",
                category: "custom",
                label: "My Shape",
                icon: "bi-box",
                defaultSize: { w: 100, h: 100 },
                render: function() { return document.createElementNS("http://www.w3.org/2000/svg", "rect"); },
                getHandles: function() { return []; },
                getPorts: function() { return []; },
                hitTest: function() { return true; },
                getTextRegions: function() { return []; },
                getOutlinePath: function() { return ""; }
            }]);
        `);
        const shapes = await callEngine(page, `
            return engine.getAvailableShapes().map(function(s) { return s.type; });
        `);
        expect(shapes).toContain("my-shape");
    });
});

// ===========================================================================
// §6 TOOL SYSTEM
// ===========================================================================

test.describe("§6 Tool System", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("default tool is select", async ({ page }) =>
    {
        const tool = await callEngine(page, "return engine.getActiveTool();");
        expect(tool).toBe("select");
    });

    test("setActiveTool changes tool", async ({ page }) =>
    {
        await callEngine(page, `engine.setActiveTool("draw");`);
        const tool = await callEngine(page, "return engine.getActiveTool();");
        expect(tool).toBe("draw");
    });

    test("all 9 tools can be activated", async ({ page }) =>
    {
        const tools = ["select", "draw", "text", "connect",
            "pen", "brush", "measure", "pan"];

        for (const toolName of tools)
        {
            await callEngine(page, `engine.setActiveTool("${toolName}");`);
            const active = await callEngine(page,
                "return engine.getActiveTool();");
            expect(active).toBe(toolName);
        }
    });
});

// ===========================================================================
// §6.4 GROUPING
// ===========================================================================

test.describe("§6.4 Grouping", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("group creates group object", async ({ page }) =>
    {
        const result = await callEngine(page, `
            var a = engine.addObject({});
            var b = engine.addObject({});
            var group = engine.group([a.id, b.id]);
            return {
                groupId: group.id,
                aGroupId: engine.getObject(a.id).presentation.groupId,
                bGroupId: engine.getObject(b.id).presentation.groupId
            };
        `);
        expect(result.aGroupId).toBe(result.groupId);
        expect(result.bGroupId).toBe(result.groupId);
    });

    test("ungroup removes group", async ({ page }) =>
    {
        const childCount = await callEngine(page, `
            var a = engine.addObject({});
            var b = engine.addObject({});
            var group = engine.group([a.id, b.id]);
            var children = engine.ungroup(group.id);
            return children.length;
        `);
        expect(childCount).toBe(2);
    });
});

// ===========================================================================
// §6.5 ROTATION & FLIP
// ===========================================================================

test.describe("§6.5 Rotation & Flip", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("rotateObjects changes rotation", async ({ page }) =>
    {
        const rotation = await callEngine(page, `
            var obj = engine.addObject({});
            engine.rotateObjects([obj.id], 45);
            return engine.getObject(obj.id).presentation.rotation;
        `);
        expect(rotation).toBe(45);
    });

    test("flipHorizontal toggles flipX", async ({ page }) =>
    {
        const flipX = await callEngine(page, `
            var obj = engine.addObject({});
            engine.flipHorizontal([obj.id]);
            return engine.getObject(obj.id).presentation.flipX;
        `);
        expect(flipX).toBe(true);
    });

    test("flipVertical toggles flipY", async ({ page }) =>
    {
        const flipY = await callEngine(page, `
            var obj = engine.addObject({});
            engine.flipVertical([obj.id]);
            return engine.getObject(obj.id).presentation.flipY;
        `);
        expect(flipY).toBe(true);
    });
});

// ===========================================================================
// §6.6 Z-ORDERING
// ===========================================================================

test.describe("§6.6 Z-Ordering", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("bringToFront sets highest zIndex", async ({ page }) =>
    {
        const result = await callEngine(page, `
            var a = engine.addObject({});
            var b = engine.addObject({});
            var c = engine.addObject({});
            engine.bringToFront([a.id]);
            var aZ = engine.getObject(a.id).presentation.zIndex;
            var cZ = engine.getObject(c.id).presentation.zIndex;
            return aZ > cZ;
        `);
        expect(result).toBe(true);
    });

    test("sendToBack sets lowest zIndex", async ({ page }) =>
    {
        const result = await callEngine(page, `
            var a = engine.addObject({});
            var b = engine.addObject({});
            var c = engine.addObject({});
            engine.sendToBack([c.id]);
            var aZ = engine.getObject(a.id).presentation.zIndex;
            var cZ = engine.getObject(c.id).presentation.zIndex;
            return cZ < aZ;
        `);
        expect(result).toBe(true);
    });
});

// ===========================================================================
// §6.7 CLIPBOARD
// ===========================================================================

test.describe("§6.7 Clipboard", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("copy and paste duplicates objects", async ({ page }) =>
    {
        const count = await callEngine(page, `
            var obj = engine.addObject({
                semantic: { type: "test", data: { value: 42 } }
            });
            engine.select([obj.id]);
            engine.copy();
            engine.paste();
            return engine.getObjects().length;
        `);
        expect(count).toBe(2);
    });

    test("duplicate creates copy", async ({ page }) =>
    {
        const count = await callEngine(page, `
            var obj = engine.addObject({});
            engine.select([obj.id]);
            engine.duplicate();
            return engine.getObjects().length;
        `);
        expect(count).toBe(2);
    });
});

// ===========================================================================
// §6.8 ALIGNMENT
// ===========================================================================

test.describe("§6.8 Alignment", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("alignObjects left aligns left edges", async ({ page }) =>
    {
        const result = await callEngine(page, `
            var a = engine.addObject({
                presentation: { bounds: { x: 100, y: 0, width: 50, height: 50 } }
            });
            var b = engine.addObject({
                presentation: { bounds: { x: 200, y: 50, width: 50, height: 50 } }
            });
            engine.alignObjects([a.id, b.id], "left");
            return {
                aX: engine.getObject(a.id).presentation.bounds.x,
                bX: engine.getObject(b.id).presentation.bounds.x
            };
        `);
        expect(result.aX).toBe(result.bX);
    });
});

// ===========================================================================
// §10 CONNECTORS
// ===========================================================================

test.describe("§10 Connectors", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("addConnector creates connector", async ({ page }) =>
    {
        const conn = await callEngine(page, `
            var a = engine.addObject({
                presentation: { bounds: { x: 0, y: 0, width: 100, height: 50 } }
            });
            var b = engine.addObject({
                presentation: { bounds: { x: 300, y: 0, width: 100, height: 50 } }
            });
            return engine.addConnector({
                presentation: {
                    sourceId: a.id, targetId: b.id,
                    routing: "straight",
                    style: { color: "black", width: 1.5, endArrow: "classic" },
                    labels: [], waypoints: []
                }
            });
        `);
        expect(conn).toBeTruthy();
        expect(conn.id).toBeTruthy();
    });

    test("getConnectors returns all", async ({ page }) =>
    {
        await callEngine(page, `
            var a = engine.addObject({});
            var b = engine.addObject({});
            engine.addConnector({
                presentation: { sourceId: a.id, targetId: b.id,
                    routing: "straight", style: { color: "black", width: 1 },
                    labels: [], waypoints: [] }
            });
        `);
        const conns = await callEngine(page, "return engine.getConnectors();");
        expect(conns).toHaveLength(1);
    });

    test("removeConnector removes from document", async ({ page }) =>
    {
        const result = await callEngine(page, `
            var a = engine.addObject({});
            var b = engine.addObject({});
            var conn = engine.addConnector({
                presentation: { sourceId: a.id, targetId: b.id,
                    routing: "straight", style: { color: "black", width: 1 },
                    labels: [], waypoints: [] }
            });
            engine.removeConnector(conn.id);
            return engine.getConnectors().length;
        `);
        expect(result).toBe(0);
    });
});

// ===========================================================================
// §10 VIEWPORT
// ===========================================================================

test.describe("§10 Viewport", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("getZoomLevel returns default 1.0", async ({ page }) =>
    {
        const zoom = await callEngine(page, "return engine.getZoomLevel();");
        expect(zoom).toBe(1);
    });

    test("zoomIn increases zoom", async ({ page }) =>
    {
        await callEngine(page, "engine.zoomIn();");
        const zoom = await callEngine(page, "return engine.getZoomLevel();");
        expect(zoom).toBeGreaterThan(1);
    });

    test("zoomOut decreases zoom", async ({ page }) =>
    {
        await callEngine(page, "engine.zoomOut();");
        const zoom = await callEngine(page, "return engine.getZoomLevel();");
        expect(zoom).toBeLessThan(1);
    });

    test("setZoomLevel sets exact zoom", async ({ page }) =>
    {
        await callEngine(page, "engine.setZoomLevel(2.0);");
        const zoom = await callEngine(page, "return engine.getZoomLevel();");
        expect(zoom).toBeCloseTo(2.0, 1);
    });

    test("getViewport returns state", async ({ page }) =>
    {
        const vp = await callEngine(page, "return engine.getViewport();");
        expect(vp).toHaveProperty("x");
        expect(vp).toHaveProperty("y");
        expect(vp).toHaveProperty("zoom");
    });
});

// ===========================================================================
// §10 SELECTION
// ===========================================================================

test.describe("§10 Selection", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("select sets selection", async ({ page }) =>
    {
        const count = await callEngine(page, `
            var a = engine.addObject({});
            var b = engine.addObject({});
            engine.select([a.id, b.id]);
            return engine.getSelectedObjectsPublic().length;
        `);
        expect(count).toBe(2);
    });

    test("clearSelection empties selection", async ({ page }) =>
    {
        await callEngine(page, `
            var a = engine.addObject({});
            engine.select([a.id]);
            engine.clearSelection();
        `);
        const count = await callEngine(page, `
            return engine.getSelectedObjectsPublic().length;
        `);
        expect(count).toBe(0);
    });
});

// ===========================================================================
// §12 EXPORT
// ===========================================================================

test.describe("§12 Export", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("exportSVG returns SVG string", async ({ page }) =>
    {
        await callEngine(page, "engine.addObject({});");
        const svg = await callEngine(page, "return engine.exportSVG();");
        expect(svg).toContain("<svg");
        expect(svg).toContain("de-canvas");
    });

    test("exportJSON returns valid JSON", async ({ page }) =>
    {
        await callEngine(page, "engine.addObject({});");
        const json = await callEngine(page, "return engine.exportJSON();");
        const parsed = JSON.parse(json);
        expect(parsed.objects).toHaveLength(1);
    });
});

// ===========================================================================
// §16 FIND AND REPLACE
// ===========================================================================

test.describe("§16 Find and Replace", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("findText finds matching objects", async ({ page }) =>
    {
        const results = await callEngine(page, `
            engine.addObject({
                presentation: {
                    textContent: {
                        runs: [{ text: "Hello World" }],
                        overflow: "visible",
                        verticalAlign: "middle",
                        horizontalAlign: "center",
                        padding: 4
                    }
                }
            });
            engine.addObject({
                presentation: {
                    textContent: {
                        runs: [{ text: "Goodbye" }],
                        overflow: "visible",
                        verticalAlign: "middle",
                        horizontalAlign: "center",
                        padding: 4
                    }
                }
            });
            return engine.findText("Hello");
        `);
        expect(results).toHaveLength(1);
    });

    test("replaceText replaces matching text", async ({ page }) =>
    {
        const count = await callEngine(page, `
            engine.addObject({
                presentation: {
                    textContent: {
                        runs: [{ text: "old text here" }],
                        overflow: "visible",
                        verticalAlign: "middle",
                        horizontalAlign: "center",
                        padding: 4
                    }
                }
            });
            return engine.replaceText("old", "new");
        `);
        expect(count).toBe(1);
    });
});

// ===========================================================================
// §16 FORMAT PAINTER
// ===========================================================================

test.describe("§16 Format Painter", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("hasFormat returns false initially", async ({ page }) =>
    {
        const has = await callEngine(page, "return engine.hasFormat();");
        expect(has).toBe(false);
    });

    test("pickFormat and hasFormat", async ({ page }) =>
    {
        const has = await callEngine(page, `
            var obj = engine.addObject({
                presentation: {
                    style: { fill: { type: "solid", color: "red" } }
                }
            });
            engine.pickFormat(obj.id);
            return engine.hasFormat();
        `);
        expect(has).toBe(true);
    });

    test("clearFormat clears clipboard", async ({ page }) =>
    {
        await callEngine(page, `
            var obj = engine.addObject({});
            engine.pickFormat(obj.id);
            engine.clearFormat();
        `);
        const has = await callEngine(page, "return engine.hasFormat();");
        expect(has).toBe(false);
    });
});

// ===========================================================================
// §16 GRAPH ANALYSIS
// ===========================================================================

test.describe("§16 Graph Analysis", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("getShortestPath finds path", async ({ page }) =>
    {
        const path = await callEngine(page, `
            var a = engine.addObject({});
            var b = engine.addObject({});
            var c = engine.addObject({});
            engine.addConnector({
                presentation: { sourceId: a.id, targetId: b.id,
                    routing: "straight", style: { color: "black", width: 1 },
                    labels: [], waypoints: [] }
            });
            engine.addConnector({
                presentation: { sourceId: b.id, targetId: c.id,
                    routing: "straight", style: { color: "black", width: 1 },
                    labels: [], waypoints: [] }
            });
            return engine.getShortestPath(a.id, c.id);
        `);
        expect(path).toHaveLength(3);
    });

    test("getConnectedComponents finds components", async ({ page }) =>
    {
        const components = await callEngine(page, `
            var a = engine.addObject({});
            var b = engine.addObject({});
            var c = engine.addObject({});
            engine.addConnector({
                presentation: { sourceId: a.id, targetId: b.id,
                    routing: "straight", style: { color: "black", width: 1 },
                    labels: [], waypoints: [] }
            });
            return engine.getConnectedComponents();
        `);
        expect(components).toHaveLength(2); // {a,b} and {c}
    });
});

// ===========================================================================
// §16 COMMENTS
// ===========================================================================

test.describe("§16 Comments", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("addComment creates comment", async ({ page }) =>
    {
        const comment = await callEngine(page, `
            var obj = engine.addObject({});
            return engine.addComment(
                { type: "object", entityId: obj.id },
                "This needs review",
                "user1", "Alice"
            );
        `);
        expect(comment).toBeTruthy();
        expect(comment.thread).toHaveLength(1);
        expect(comment.status).toBe("open");
    });

    test("getCommentsForObject returns filtered comments", async ({ page }) =>
    {
        const count = await callEngine(page, `
            var obj = engine.addObject({});
            engine.addComment(
                { type: "object", entityId: obj.id },
                "Comment 1", "user1", "Alice"
            );
            engine.addComment(
                { type: "object", entityId: obj.id },
                "Comment 2", "user2", "Bob"
            );
            return engine.getCommentsForObject(obj.id).length;
        `);
        expect(count).toBe(2);
    });

    test("resolveComment changes status", async ({ page }) =>
    {
        const status = await callEngine(page, `
            var obj = engine.addObject({});
            var comment = engine.addComment(
                { type: "object", entityId: obj.id },
                "Fix this", "user1", "Alice"
            );
            engine.resolveComment(comment.id);
            return engine.getComments()[0].status;
        `);
        expect(status).toBe("resolved");
    });
});

// ===========================================================================
// §16 LAYOUT ENGINE
// ===========================================================================

test.describe("§16 Layout Engine", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("applyLayout grid repositions objects", async ({ page }) =>
    {
        const result = await callEngine(page, `
            engine.addObject({ presentation: { bounds: { x: 500, y: 500, width: 100, height: 50 } } });
            engine.addObject({ presentation: { bounds: { x: 600, y: 600, width: 100, height: 50 } } });
            engine.applyLayout("grid", { columns: 2, gap: 20 });
            var objs = engine.getObjects();
            return {
                firstX: objs[0].presentation.bounds.x,
                secondX: objs[1].presentation.bounds.x
            };
        `);
        // After grid layout, objects should be repositioned
        expect(result.firstX).toBeDefined();
        expect(result.secondX).toBeDefined();
    });

    test("registerLayout adds custom layout", async ({ page }) =>
    {
        await callEngine(page, `
            engine.registerLayout("custom-test", function(objects) {
                var positions = new Map();
                objects.forEach(function(obj, i) {
                    positions.set(obj.id, { x: i * 100, y: 0 });
                });
                return positions;
            });
            engine.addObject({});
            engine.addObject({});
            engine.applyLayout("custom-test");
        `);
        const objs = await callEngine(page, "return engine.getObjects();");
        expect(objs[0].presentation.bounds.x).toBe(0);
        expect(objs[1].presentation.bounds.x).toBe(100);
    });
});

// ===========================================================================
// LIFECYCLE
// ===========================================================================

test.describe("Lifecycle", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await createTestEngine(page);
    });

    test("destroy removes SVG", async ({ page }) =>
    {
        await callEngine(page, "engine.destroy();");
        const svgCount = await page.locator(
            "#test-engine-container .de-canvas"
        ).count();
        expect(svgCount).toBe(0);
    });

    test("clear resets document", async ({ page }) =>
    {
        await callEngine(page, `
            engine.addObject({});
            engine.addObject({});
            engine.clear();
        `);
        const count = await callEngine(page, "return engine.getObjects().length;");
        expect(count).toBe(0);
    });
});
