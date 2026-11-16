/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: DiagramEngine pointer input in a real browser (#176, #184).
 * jsdom has no pointer capture and no touch-action, so these show that
 * real input reaches the gestures:
 *   - a drag released outside the canvas still ends, because the canvas
 *     captures the pointer;
 *   - a touch drag moves an object, because `touch-action: none` keeps
 *     the browser from taking the touch for a scroll;
 *   - the touch gestures of TOUCH_EXPERIENCE.md section 6.2: a tap, a long
 *     press then a drag, a drag on the background, a pinch, and a second
 *     finger during a drag (section 11, item 13).
 * Touch goes through the Chrome DevTools Protocol, because Playwright's
 * touchscreen sends one finger and no moves.
 */

import { test, expect, type CDPSession, type Page } from "@playwright/test";

const PAGE = "/__diagramengine-pointer.html";

/*
 * The canvas is 400 by 300 at the top left, on a page tall enough to
 * scroll. Without `touch-action: none`, a touch drag on the canvas would
 * scroll that page and cancel the pointer.
 */
const HTML = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="/css/custom.css">
<link rel="stylesheet" href="/components/diagramengine/diagramengine.css">
<style>body { margin: 0; height: 3000px; } #host { width: 400px; height: 300px; }</style>
</head><body>
<div id="host"></div>
<script>window.__ebt_debug_logging = false;</script>
<script src="/components/gesturerecognizer/gesturerecognizer.js"></script>
<script src="/components/diagramengine/diagramengine.js"></script>
</body></html>`;

/** The box starts at (50, 50), 100 by 60, at zoom 1 with no pan. */
const BOX = { x: 50, y: 50, width: 100, height: 60 };

async function open(page: Page): Promise<void>
{
    await page.route(`**${PAGE}`, (route) => route.fulfill({ contentType: "text/html", body: HTML }));
    await page.goto(PAGE);
    await page.evaluate((bounds) =>
    {
        const w = window as unknown as Record<string, any>;

        w.__engine = w.createDiagramEngine("host", { snapping: { grid: false, objects: false, guides: false } });
        w.__engine.addObject({ id: "box", presentation: { shape: "rectangle", bounds } });
    }, BOX);
}

type Point = { x: number; y: number };

/** Sends one touch event with these fingers down. An empty list lifts all of them. */
function touch(cdp: CDPSession, type: string, points: Point[]): Promise<unknown>
{
    return cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })),
    });
}

/** Calls a method of the engine on the page. */
function engineCall<T>(page: Page, method: string): Promise<T>
{
    return page.evaluate((m) => (window as unknown as Record<string, any>).__engine[m](), method);
}

function selectedIds(page: Page): Promise<string[]>
{
    return page.evaluate(() =>
        (window as unknown as Record<string, any>).__engine.getSelectedObjects().map((o: { id: string }) => o.id));
}

function boxBounds(page: Page): Promise<{ x: number; y: number }>
{
    return page.evaluate(() =>
    {
        const b = (window as unknown as Record<string, any>).__engine.getObjectById("box").presentation.bounds;

        return { x: b.x, y: b.y };
    });
}

/** The box's center on screen. */
async function boxCenter(page: Page): Promise<{ x: number; y: number }>
{
    const r = (await page.locator('[data-id="box"]').boundingBox())!;

    return { x: r.x + (r.width / 2), y: r.y + (r.height / 2) };
}

test.describe("DiagramEngine pointer input (#176, #184)", () =>
{
    test("a mouse drag released outside the canvas ends the drag", async ({ page }) =>
    {
        await open(page);

        const c = await boxCenter(page);

        await page.mouse.move(c.x, c.y);
        await page.mouse.down();
        await page.mouse.move(c.x + 40, c.y + 20, { steps: 4 });
        // Leave the canvas, which is 400 wide, and release out there.
        await page.mouse.move(600, c.y + 20, { steps: 4 });
        await page.mouse.up();

        const released = await boxBounds(page);

        // The box followed the pointer out of the canvas.
        expect(released.x).toBeGreaterThan(BOX.x + 40);

        // Back over the canvas with no button held. A drag that missed
        // its pointerup would still move the box here.
        await page.mouse.move(c.x, c.y, { steps: 4 });

        expect(await boxBounds(page)).toEqual(released);
        expect(await page.evaluate(() => (window as unknown as Record<string, any>).__engine.canUndo()))
            .toBe(true);
    });

    test("a touch drag moves the box and does not scroll the page", async ({ page }) =>
    {
        await open(page);

        const c = await boxCenter(page);
        const cdp = await page.context().newCDPSession(page);
        const touch = (type: string, x: number, y: number) => cdp.send("Input.dispatchTouchEvent",
            { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });

        await touch("touchStart", c.x, c.y);

        for (let i = 1; i <= 8; i += 1)
        {
            await touch("touchMove", c.x + (i * 10), c.y + (i * 10));
        }

        await touch("touchEnd", c.x + 80, c.y + 80);

        expect(await boxBounds(page)).toEqual({ x: BOX.x + 80, y: BOX.y + 80 });
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test("a tap selects the box, and a tap on the background clears it", async ({ page }) =>
    {
        await open(page);

        const c = await boxCenter(page);
        const cdp = await page.context().newCDPSession(page);

        await touch(cdp, "touchStart", [c]);
        await touch(cdp, "touchEnd", []);

        expect(await selectedIds(page)).toEqual(["box"]);

        await touch(cdp, "touchStart", [{ x: 300, y: 250 }]);
        await touch(cdp, "touchEnd", []);

        expect(await selectedIds(page)).toEqual([]);
    });

    test("a finger dragged on the background pans the view, not the page", async ({ page }) =>
    {
        await open(page);

        const cdp = await page.context().newCDPSession(page);

        await touch(cdp, "touchStart", [{ x: 300, y: 250 }]);

        for (let i = 1; i <= 6; i += 1)
        {
            await touch(cdp, "touchMove", [{ x: 300 - (i * 10), y: 250 - (i * 5) }]);
        }

        await touch(cdp, "touchEnd", []);

        expect(await engineCall(page, "getViewport")).toEqual({ x: -60, y: -30, zoom: 1 });
        expect(await boxBounds(page)).toEqual({ x: BOX.x, y: BOX.y });
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test("a long press and then a drag on the background draws the selection rectangle", async ({ page }) =>
    {
        await open(page);

        const cdp = await page.context().newCDPSession(page);

        await touch(cdp, "touchStart", [{ x: 30, y: 30 }]);
        // Longer than the 500 ms long press (section 7).
        await page.waitForTimeout(700);

        for (let i = 1; i <= 6; i += 1)
        {
            await touch(cdp, "touchMove", [{ x: 30 + (i * 30), y: 30 + (i * 20) }]);
        }

        await touch(cdp, "touchEnd", []);

        expect(await selectedIds(page)).toEqual(["box"]);
        expect(await engineCall(page, "getViewport")).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    test("two fingers that spread zoom about their midpoint and touch no object", async ({ page }) =>
    {
        await open(page);

        const cdp = await page.context().newCDPSession(page);

        await touch(cdp, "touchStart", [{ x: 250, y: 150 }]);
        await touch(cdp, "touchStart", [{ x: 250, y: 150 }, { x: 330, y: 150 }]);

        for (let i = 1; i <= 4; i += 1)
        {
            await touch(cdp, "touchMove", [{ x: 250 - (i * 10), y: 150 }, { x: 330 + (i * 10), y: 150 }]);
        }

        await touch(cdp, "touchEnd", []);

        // The spread doubles about (290, 150), which stays where it was.
        expect(await engineCall(page, "getViewport")).toEqual({ x: -290, y: -150, zoom: 2 });
        expect(await boxBounds(page)).toEqual({ x: BOX.x, y: BOX.y });
        expect(await selectedIds(page)).toEqual([]);
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test("a second finger during a drag puts the box back", async ({ page }) =>
    {
        await open(page);

        const c = await boxCenter(page);
        const cdp = await page.context().newCDPSession(page);

        await touch(cdp, "touchStart", [c]);

        for (let i = 1; i <= 4; i += 1)
        {
            await touch(cdp, "touchMove", [{ x: c.x + (i * 10), y: c.y }]);
        }

        // Chrome delivers the last move with the next frame.
        await expect.poll(async () => (await boxBounds(page)).x).toBe(BOX.x + 40);

        await touch(cdp, "touchStart", [{ x: c.x + 40, y: c.y }, { x: c.x + 140, y: c.y }]);
        await touch(cdp, "touchEnd", []);

        expect(await boxBounds(page)).toEqual({ x: BOX.x, y: BOX.y });
        expect(await engineCall(page, "canUndo")).toBe(false);
    });
});
