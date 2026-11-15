/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: DiagramEngine pointer input in a real browser (#176, step 2).
 * jsdom has no pointer capture and no touch-action, so the two things
 * these prove can only be seen here:
 *   - a drag released outside the canvas still ends, because the canvas
 *     captures the pointer;
 *   - a touch drag moves an object, because `touch-action: none` keeps
 *     the browser from taking the touch for a scroll.
 */

import { test, expect, type Page } from "@playwright/test";

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

test.describe("DiagramEngine pointer input (#176)", () =>
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
});
