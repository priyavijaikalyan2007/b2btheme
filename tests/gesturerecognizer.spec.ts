/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: GestureRecognizer in a real browser (#182), on its demo page.
 *    TOUCH_EXPERIENCE.md section 11 asks for a tap, a long press, a drag and
 *    a pinch with a touch pointer. Touch goes through the Chrome DevTools
 *    Protocol, because Playwright's touchscreen sends one finger and no
 *    moves. The unit tests cover the rules. This file shows that real
 *    pointer events, with real capture and touch-action, reach them.
 */

import { test, expect, type CDPSession, type Page } from "@playwright/test";

type Point = { x: number; y: number };

/** The demo's log, newest first. */
async function logLines(page: Page): Promise<string[]>
{
    return page.locator("#gesture-demo-log li").allTextContents();
}

/** The middle of the pad, in viewport coordinates. */
async function padCenter(page: Page): Promise<Point>
{
    const box = (await page.locator("#gesture-demo-pad").boundingBox())!;

    return { x: Math.round(box.x + (box.width / 2)), y: Math.round(box.y + (box.height / 2)) };
}

/** Sends one touch event with these fingers down. An empty list lifts all of them. */
function touch(cdp: CDPSession, type: string, points: Point[]): Promise<unknown>
{
    return cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 })),
    });
}

test.describe("GestureRecognizer", () =>
{
    let cdp: CDPSession;
    let c: Point;

    test.beforeEach(async ({ page }) =>
    {
        await page.goto("/demo/components/gesturerecognizer.html");
        await page.locator("#gesture-demo-pad").scrollIntoViewIfNeeded();
        cdp = await page.context().newCDPSession(page);
        c = await padCenter(page);
    });

    test("a finger down and up in place is a tap", async ({ page }) =>
    {
        await touch(cdp, "touchStart", [c]);
        await touch(cdp, "touchEnd", []);

        expect(await logLines(page)).toEqual([`Tap (touch) at ${c.x}, ${c.y}`]);
    });

    test("a finger held still is a long press, and its lift is not a tap", async ({ page }) =>
    {
        await touch(cdp, "touchStart", [c]);
        await expect(page.locator("#gesture-demo-last")).toHaveText(/^Long press/);
        await touch(cdp, "touchEnd", []);

        expect(await logLines(page)).toEqual([`Long press at ${c.x}, ${c.y}`]);
    });

    test("a finger that moves is a drag, captured until it lifts", async ({ page }) =>
    {
        await touch(cdp, "touchStart", [c]);

        for (let i = 1; i <= 8; i += 1)
        {
            await touch(cdp, "touchMove", [{ x: c.x + (i * 10), y: c.y }]);
        }

        await touch(cdp, "touchEnd", []);

        expect(await logLines(page)).toEqual([
            `Drag end at ${c.x + 80}, ${c.y}`,
            "Drag start (touch, button 0)",
        ]);
    });

    test("two fingers that spread report the zoom, and the page does not scroll", async ({ page }) =>
    {
        const y0 = await page.evaluate(() => window.scrollY);

        await touch(cdp, "touchStart", [{ x: c.x - 40, y: c.y }]);
        await touch(cdp, "touchStart", [{ x: c.x - 40, y: c.y }, { x: c.x + 40, y: c.y }]);

        for (let i = 1; i <= 4; i += 1)
        {
            await touch(cdp, "touchMove", [
                { x: c.x - 40 - (i * 10), y: c.y + (i * 5) },
                { x: c.x + 40 + (i * 10), y: c.y + (i * 5) },
            ]);
        }

        await expect(page.locator("#gesture-demo-last")).toHaveText("Two fingers: pan 0, 20, zoom 2.00");
        await touch(cdp, "touchEnd", []);

        expect(await logLines(page)).toEqual(["Two fingers up, zoom 2.00", "Two fingers down"]);
        expect(await page.evaluate(() => window.scrollY)).toBe(y0);
    });

    test("a second finger during a drag cancels the drag", async ({ page }) =>
    {
        await touch(cdp, "touchStart", [c]);
        await touch(cdp, "touchMove", [{ x: c.x + 30, y: c.y }]);
        await touch(cdp, "touchStart", [{ x: c.x + 30, y: c.y }, { x: c.x + 100, y: c.y }]);
        await touch(cdp, "touchEnd", []);

        expect(await logLines(page)).toEqual([
            "Two fingers up, zoom 1.00",
            "Two fingers down",
            "Drag cancelled",
            "Drag start (touch, button 0)",
        ]);
    });

    test("a mouse click is a tap, and a held mouse button is not a long press", async ({ page }) =>
    {
        await page.mouse.move(c.x, c.y);
        await page.mouse.down();
        await page.waitForTimeout(700);
        await page.mouse.up();

        expect(await logLines(page)).toEqual([`Tap (mouse) at ${c.x}, ${c.y}`]);
    });
});
