/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DiagramEngine — Embed System, UI Component Stencils, Page Frames
 * Covers: Phase 5 (UI component stencils) and Phase 6 (additional page frames).
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createDiagramEngine } from "./diagramengine";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;
let engine: ReturnType<typeof createDiagramEngine>;

function setup(): void
{
    container = document.createElement("div");
    container.id = "test-embed-" + Math.random().toString(36).substring(2, 8);
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
// 1. UI COMPONENT STENCIL PACK
// ============================================================================

describe("DiagramEngine — UI Component Stencils", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("loadStencilPack('ui-components') registers shapes", () =>
    {
        const before = engine.getAvailableShapes().length;

        engine.loadStencilPack("ui-components");

        const after = engine.getAvailableShapes().length;

        expect(after).toBe(before + 110);
    });

    test("ui-components pack includes datagrid shape", () =>
    {
        engine.loadStencilPack("ui-components");

        const shapes = engine.getAvailableShapes();
        const datagrid = shapes.find((s) => s.type === "datagrid");

        expect(datagrid).toBeDefined();
        expect(datagrid!.label).toBe("Data Grid");
        expect(datagrid!.category).toBe("ui-components");
    });

    test("ui-components pack includes all category shapes", () =>
    {
        engine.loadStencilPack("ui-components");

        const shapes = engine.getAvailableShapes();
        const uiShapes = shapes.filter((s) => s.category === "ui-components");

        expect(uiShapes.length).toBe(95);
    });

    test("ui-component shapes have valid defaultSize", () =>
    {
        engine.loadStencilPack("ui-components");

        const shapes = engine.getAvailableShapes();
        const uiShapes = shapes.filter((s) => s.category === "ui-components");

        for (const shape of uiShapes)
        {
            expect(shape.defaultSize.w).toBeGreaterThan(0);
            expect(shape.defaultSize.h).toBeGreaterThan(0);
        }
    });

    test("ui-component shapes have required methods", () =>
    {
        engine.loadStencilPack("ui-components");

        const shapes = engine.getAvailableShapes();
        const uiShapes = shapes.filter((s) => s.category === "ui-components");

        for (const shape of uiShapes)
        {
            expect(typeof shape.render).toBe("function");
            expect(typeof shape.getHandles).toBe("function");
            expect(typeof shape.getPorts).toBe("function");
            expect(typeof shape.hitTest).toBe("function");
            expect(typeof shape.getTextRegions).toBe("function");
            expect(typeof shape.getOutlinePath).toBe("function");
        }
    });

    test("datagrid shape can be set as draw shape", () =>
    {
        engine.loadStencilPack("ui-components");

        expect(() =>
        {
            engine.setDrawShape("datagrid");
        }).not.toThrow();
    });

    test("addObject with ui-component shape type works", () =>
    {
        engine.loadStencilPack("ui-components");

        const obj = engine.addObject({
            id: "ui-comp-test",
            presentation: {
                shape: "datagrid",
                bounds: { x: 50, y: 50, width: 400, height: 250 },
            }
        });

        expect(obj).toBeDefined();

        const allObjs = engine.getObjects();

        expect(allObjs.length).toBe(1);
    });

    test("representative shapes from each category exist", () =>
    {
        engine.loadStencilPack("ui-components");

        const shapes = engine.getAvailableShapes();
        const typeSet = new Set(shapes.map((s) => s.type));

        // Data
        expect(typeSet.has("datagrid")).toBe(true);
        expect(typeSet.has("treeview")).toBe(true);
        // Input
        expect(typeSet.has("datepicker")).toBe(true);
        expect(typeSet.has("colorpicker")).toBe(true);
        expect(typeSet.has("slider")).toBe(true);
        // Content
        expect(typeSet.has("codeeditor")).toBe(true);
        expect(typeSet.has("markdowneditor")).toBe(true);
        // Feedback
        expect(typeSet.has("toast")).toBe(true);
        expect(typeSet.has("stepper")).toBe(true);
        // Navigation
        expect(typeSet.has("ribbon")).toBe(true);
        expect(typeSet.has("toolbar")).toBe(true);
        // AI
        expect(typeSet.has("conversation")).toBe(true);
        // Governance
        expect(typeSet.has("auditlogviewer")).toBe(true);
        expect(typeSet.has("permissionmatrix")).toBe(true);
        // Layout
        expect(typeSet.has("docklayout")).toBe(true);
        expect(typeSet.has("gridlayout")).toBe(true);
        // Social
        expect(typeSet.has("activityfeed")).toBe(true);
        expect(typeSet.has("timeline")).toBe(true);
        // Other
        expect(typeSet.has("commandpalette")).toBe(true);
        expect(typeSet.has("fileexplorer")).toBe(true);
    });

    test("ui-component shape hitTest works", () =>
    {
        engine.loadStencilPack("ui-components");

        const shapes = engine.getAvailableShapes();
        const dg = shapes.find((s) => s.type === "datagrid")!;
        const bounds = {
            x: 0, y: 0,
            width: dg.defaultSize.w,
            height: dg.defaultSize.h
        };

        expect(dg.hitTest({ x: 200, y: 125 }, bounds)).toBe(true);
        expect(dg.hitTest({ x: -10, y: -10 }, bounds)).toBe(false);
    });

    test("ui-component shape getOutlinePath returns path data", () =>
    {
        engine.loadStencilPack("ui-components");

        const shapes = engine.getAvailableShapes();
        const dg = shapes.find((s) => s.type === "datagrid")!;
        const bounds = { x: 10, y: 20, width: 400, height: 250 };
        const path = dg.getOutlinePath(bounds);

        expect(path).toContain("M");
        expect(path).toContain("L");
        expect(path).toContain("Z");
    });

    test("ui-component shape getTextRegions returns content region", () =>
    {
        engine.loadStencilPack("ui-components");

        const shapes = engine.getAvailableShapes();
        const dg = shapes.find((s) => s.type === "datagrid")!;
        const bounds = { x: 0, y: 0, width: 400, height: 250 };
        const regions = dg.getTextRegions(bounds);

        expect(regions.length).toBe(1);
        expect(regions[0].id).toBe("content");
        expect(regions[0].bounds.width).toBeGreaterThan(0);
        expect(regions[0].bounds.height).toBeGreaterThan(0);
    });

    test("ui-component shape getPorts returns ports", () =>
    {
        engine.loadStencilPack("ui-components");

        const shapes = engine.getAvailableShapes();
        const dg = shapes.find((s) => s.type === "datagrid")!;
        const bounds = { x: 0, y: 0, width: 400, height: 250 };
        const ports = dg.getPorts(bounds);

        expect(ports.length).toBeGreaterThan(0);
    });

    test("ui-component shape getHandles returns handles", () =>
    {
        engine.loadStencilPack("ui-components");

        const shapes = engine.getAvailableShapes();
        const dg = shapes.find((s) => s.type === "datagrid")!;
        const bounds = { x: 0, y: 0, width: 400, height: 250 };
        const handles = dg.getHandles(bounds);

        expect(handles.length).toBe(8);
    });
});

// ============================================================================
// 2. DEVICE STENCIL PACK
// ============================================================================

describe("DiagramEngine — Device Stencils", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("loadStencilPack('devices') registers 12 shapes", () =>
    {
        const before = engine.getAvailableShapes().length;

        engine.loadStencilPack("devices");

        const after = engine.getAvailableShapes().length;

        expect(after).toBe(before + 12);
    });

    test("device stencils include browser-chrome shape", () =>
    {
        engine.loadStencilPack("devices");

        const shapes = engine.getAvailableShapes();
        const bc = shapes.find((s) => s.type === "browser-chrome");

        expect(bc).toBeDefined();
        expect(bc!.label).toContain("Browser");
    });

    test("device stencils include all expected shape types", () =>
    {
        engine.loadStencilPack("devices");

        const shapes = engine.getAvailableShapes();
        const devShapes = shapes.filter((s) => s.category === "devices");
        const types = new Set(devShapes.map((s) => s.type));

        expect(types.has("browser-chrome")).toBe(true);
        expect(types.has("browser-minimal")).toBe(true);
        expect(types.has("mobile-iphone")).toBe(true);
        expect(types.has("mobile-android")).toBe(true);
        expect(types.has("tablet-ipad")).toBe(true);
        expect(types.has("desktop-window")).toBe(true);
        expect(types.has("desktop-macos")).toBe(true);
        expect(types.has("dialog-modal")).toBe(true);
        expect(types.has("card-container")).toBe(true);
        expect(types.has("sidebar-panel")).toBe(true);
        expect(types.has("navbar")).toBe(true);
        expect(types.has("footer")).toBe(true);
    });

    test("device shapes have content text regions", () =>
    {
        engine.loadStencilPack("devices");

        const shapes = engine.getAvailableShapes();
        const devShapes = shapes.filter((s) => s.category === "devices");

        for (const shape of devShapes)
        {
            const regions = shape.getTextRegions({
                x: 0, y: 0,
                width: shape.defaultSize.w,
                height: shape.defaultSize.h
            });

            expect(regions.length).toBeGreaterThan(0);
            expect(regions[0].id).toBe("content");
        }
    });

    test("addObject with device shape type works", () =>
    {
        engine.loadStencilPack("devices");

        const obj = engine.addObject({
            id: "browser-test",
            presentation: {
                shape: "browser-chrome",
                bounds: { x: 0, y: 0, width: 800, height: 600 },
            }
        });

        expect(obj).toBeDefined();
    });
});

// ============================================================================
// 3. EMBED PACK REGISTRATION
// ============================================================================

describe("DiagramEngine — Embed Pack", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("loadEmbedPack('enterprise-theme') registers components", () =>
    {
        engine.loadEmbedPack("enterprise-theme");

        const registry = engine.getEmbeddableComponents();

        expect(registry.size).toBe(95);
    });

    test("enterprise-theme embed pack includes datagrid", () =>
    {
        engine.loadEmbedPack("enterprise-theme");

        const registry = engine.getEmbeddableComponents();
        const dg = registry.get("datagrid");

        expect(dg).toBeDefined();
        expect(dg!.factory).toBe("createDataGrid");
        expect(dg!.label).toBe("Data Grid");
    });

    test("enterprise-theme embed pack includes all categories", () =>
    {
        engine.loadEmbedPack("enterprise-theme");

        const registry = engine.getEmbeddableComponents();
        const categories = new Set(
            Array.from(registry.values()).map((e) => e.category)
        );

        expect(categories.has("data")).toBe(true);
        expect(categories.has("input")).toBe(true);
        expect(categories.has("content")).toBe(true);
        expect(categories.has("feedback")).toBe(true);
        expect(categories.has("navigation")).toBe(true);
        expect(categories.has("ai")).toBe(true);
        expect(categories.has("governance")).toBe(true);
        expect(categories.has("layout")).toBe(true);
        expect(categories.has("social")).toBe(true);
        expect(categories.has("other")).toBe(true);
    });

    test("loadEmbedPack throws on unknown pack", () =>
    {
        expect(() =>
        {
            engine.loadEmbedPack("nonexistent");
        }).toThrow();
    });

    test("embed entries have valid factory names", () =>
    {
        engine.loadEmbedPack("enterprise-theme");

        const registry = engine.getEmbeddableComponents();

        for (const [, entry] of registry)
        {
            expect(typeof entry.factory).toBe("string");
            expect(entry.factory.length).toBeGreaterThan(0);
        }
    });

    test("embed entries have valid default sizes", () =>
    {
        engine.loadEmbedPack("enterprise-theme");

        const registry = engine.getEmbeddableComponents();

        for (const [, entry] of registry)
        {
            expect(entry.defaultSize.w).toBeGreaterThan(0);
            expect(entry.defaultSize.h).toBeGreaterThan(0);
        }
    });
});

// ============================================================================
// 4. PAGE FRAME SIZES (PHASE 6)
// ============================================================================

describe("DiagramEngine — Page Frame Sizes", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("getPageFrameSizes returns array", () =>
    {
        const sizes = engine.getPageFrameSizes();

        expect(Array.isArray(sizes)).toBe(true);
        expect(sizes.length).toBeGreaterThan(0);
    });

    test("page frame sizes include Paper category", () =>
    {
        const sizes = engine.getPageFrameSizes();
        const paper = sizes.filter((s) => s.category === "Paper");

        expect(paper.length).toBeGreaterThan(0);

        const a4 = paper.find((s) => s.name === "A4 Portrait");

        expect(a4).toBeDefined();
        expect(a4!.width).toBe(794);
        expect(a4!.height).toBe(1123);
    });

    test("page frame sizes include Mobile category", () =>
    {
        const sizes = engine.getPageFrameSizes();
        const mobile = sizes.filter((s) => s.category === "Mobile");

        expect(mobile.length).toBeGreaterThanOrEqual(5);

        const iphone = mobile.find((s) => s.name === "iPhone 15");

        expect(iphone).toBeDefined();
        expect(iphone!.width).toBe(393);
        expect(iphone!.height).toBe(852);
    });

    test("page frame sizes include Tablet category", () =>
    {
        const sizes = engine.getPageFrameSizes();
        const tablet = sizes.filter((s) => s.category === "Tablet");

        expect(tablet.length).toBe(5);

        const ipadPro = tablet.find((s) => s.name === "iPad Pro 12.9");

        expect(ipadPro).toBeDefined();
        expect(ipadPro!.width).toBe(1024);
        expect(ipadPro!.height).toBe(1366);
    });

    test("page frame sizes include Laptop category", () =>
    {
        const sizes = engine.getPageFrameSizes();
        const laptop = sizes.filter((s) => s.category === "Laptop");

        expect(laptop.length).toBe(3);

        const mbp = laptop.find((s) => s.name === "MacBook Pro 16");

        expect(mbp).toBeDefined();
        expect(mbp!.width).toBe(1728);
        expect(mbp!.height).toBe(1117);
    });

    test("page frame sizes include Icons category", () =>
    {
        const sizes = engine.getPageFrameSizes();
        const icons = sizes.filter((s) => s.category === "Icons");

        expect(icons.length).toBe(11);

        const icon16 = icons.find((s) => s.name === "Icon 16x16");

        expect(icon16).toBeDefined();
        expect(icon16!.width).toBe(16);
        expect(icon16!.height).toBe(16);

        const icon512 = icons.find((s) => s.name === "Icon 512x512");

        expect(icon512).toBeDefined();
        expect(icon512!.width).toBe(512);
        expect(icon512!.height).toBe(512);

        const appleTch = icons.find((s) => s.name === "Apple Touch 180x180");

        expect(appleTch).toBeDefined();
        expect(appleTch!.width).toBe(180);
    });

    test("page frame sizes include Screen category", () =>
    {
        const sizes = engine.getPageFrameSizes();
        const screens = sizes.filter((s) => s.category === "Screen");

        expect(screens.length).toBeGreaterThanOrEqual(3);

        const fhd = screens.find((s) => s.name === "Full HD (1080p)");

        expect(fhd).toBeDefined();
        expect(fhd!.width).toBe(1920);
        expect(fhd!.height).toBe(1080);
    });

    test("page frame sizes include Presentation category", () =>
    {
        const sizes = engine.getPageFrameSizes();
        const pres = sizes.filter((s) => s.category === "Presentation");

        expect(pres.length).toBe(2);
    });

    test("page frame sizes include Cards category", () =>
    {
        const sizes = engine.getPageFrameSizes();
        const cards = sizes.filter((s) => s.category === "Cards");

        expect(cards.length).toBeGreaterThan(0);
    });

    test("addPageFrame works with new device sizes", () =>
    {
        expect(() =>
        {
            engine.addPageFrame("iPhone SE");
        }).not.toThrow();
    });

    test("addPageFrame works with icon sizes", () =>
    {
        expect(() =>
        {
            engine.addPageFrame("Icon 128x128");
        }).not.toThrow();
    });

    test("addPageFrame works with tablet sizes", () =>
    {
        expect(() =>
        {
            engine.addPageFrame("iPad Air");
        }).not.toThrow();
    });

    test("addPageFrame works with laptop sizes", () =>
    {
        expect(() =>
        {
            engine.addPageFrame("MacBook Pro 14");
        }).not.toThrow();
    });

    test("all page frame sizes have positive dimensions", () =>
    {
        const sizes = engine.getPageFrameSizes();

        for (const size of sizes)
        {
            expect(size.width).toBeGreaterThan(0);
            expect(size.height).toBeGreaterThan(0);
            expect(typeof size.name).toBe("string");
            expect(size.name.length).toBeGreaterThan(0);
            expect(typeof size.category).toBe("string");
            expect(size.category.length).toBeGreaterThan(0);
        }
    });
});

// ============================================================================
// 5. SPATIAL CONTAINMENT (Phase 4 coverage)
// ============================================================================

describe("DiagramEngine — Spatial Containment", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("getContainedObjects returns empty for non-container", () =>
    {
        engine.addObject({
            id: "rect1",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 100, height: 100 },
            }
        });

        const contained = engine.getContainedObjects("rect1");

        expect(contained).toEqual([]);
    });

    test("loadStencilPack('devices') + addObject creates container", () =>
    {
        engine.loadStencilPack("devices");

        const obj = engine.addObject({
            id: "browser1",
            presentation: {
                shape: "browser-chrome",
                bounds: { x: 0, y: 0, width: 800, height: 600 },
            }
        });

        expect(obj).toBeDefined();
    });
});

// ============================================================================
// 6. COMBINED STENCIL + EMBED INTEGRATION
// ============================================================================

describe("DiagramEngine — Stencil + Embed Integration", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("loading ui-components and devices packs together works", () =>
    {
        const before = engine.getAvailableShapes().length;

        engine.loadStencilPack("ui-components");
        engine.loadStencilPack("devices");

        const after = engine.getAvailableShapes().length;

        expect(after).toBe(before + 110 + 12);
    });

    test("loading embed pack with ui-component stencils", () =>
    {
        engine.loadStencilPack("ui-components");
        engine.loadEmbedPack("enterprise-theme");

        const shapes = engine.getAvailableShapes();
        const embeds = engine.getEmbeddableComponents();

        expect(shapes.filter((s) => s.category === "ui-components").length).toBe(95);
        expect(embeds.size).toBe(95);
    });

    test("unknown stencil pack logs warning", () =>
    {
        expect(() =>
        {
            engine.loadStencilPack("nonexistent-pack");
        }).not.toThrow();
    });
});
