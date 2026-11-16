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
 *     finger during a drag (section 11, item 13);
 *   - a drag held near the edge scrolls the view, and `Space` with a
 *     mouse drag pans it;
 *   - a finger or the wheel on an inactive embedded canvas scrolls the
 *     page, and a tap makes the canvas take the finger;
 *   - in view mode, a finger on an object pans and a mouse moves nothing;
 *   - a finger beside a handle grabs it, and a long press on a shape
 *     selects no text;
 *   - the cursor under a real mouse comes from the same hit tests as a
 *     press, and a drawing tool keeps its own;
 *   - a finger's press shows the outline at once, its long press lifts
 *     the box and opens the app's menu on the lift, and a right-click
 *     opens it too.
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

async function open(page: Page, embedded = false, interactionMode = "edit"): Promise<void>
{
    await page.route(`**${PAGE}`, (route) => route.fulfill({ contentType: "text/html", body: HTML }));
    await page.goto(PAGE);
    await page.evaluate(({ bounds, embedded, interactionMode }) =>
    {
        const w = window as unknown as Record<string, any>;

        w.__menus = [];
        w.__engine = w.createDiagramEngine("host",
            { embedded, interactionMode, snapping: { grid: false, objects: false, guides: false },
                onContextMenu: (r: { target: string }) => w.__menus.push(r.target) });
        w.__engine.addObject({ id: "box", presentation: { shape: "rectangle", bounds } });
    }, { bounds: BOX, embedded, interactionMode });
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


    test("a finger held near the right edge scrolls the view and keeps the box under it", async ({ page }) =>
    {
        await open(page);

        const c = await boxCenter(page);
        const cdp = await page.context().newCDPSession(page);

        await touch(cdp, "touchStart", [c]);

        for (let x = c.x + 40; x <= 390; x += 40)
        {
            await touch(cdp, "touchMove", [{ x, y: c.y }]);
        }

        await touch(cdp, "touchMove", [{ x: 390, y: c.y }]);
        // The finger stays still. Auto-scroll runs on frames, not on moves.
        await expect.poll(async () => (await engineCall<{ x: number }>(page, "getViewport")).x)
            .toBeLessThan(-100);
        await touch(cdp, "touchEnd", []);

        const vp = await engineCall<{ x: number; y: number }>(page, "getViewport");
        const r = (await page.locator('[data-id="box"]').boundingBox())!;

        // The box is still under the finger, at the same offset as at the press.
        expect(r.x + (r.width / 2)).toBeCloseTo(390, 0);
        expect(vp.y).toBe(0);
        expect(await page.evaluate(() => window.scrollX)).toBe(0);
    });

    test("a cancelled touch drag slides the box back to its start", async ({ page }) =>
    {
        await open(page);

        const c = await boxCenter(page);
        const cdp = await page.context().newCDPSession(page);
        const drawn = () => page.locator('[data-id="box"]').getAttribute("transform");

        await touch(cdp, "touchStart", [c]);

        for (let i = 1; i <= 4; i += 1)
        {
            await touch(cdp, "touchMove", [{ x: c.x + (i * 20), y: c.y }]);
        }

        await expect.poll(async () => (await boxBounds(page)).x).toBe(BOX.x + 80);
        await touch(cdp, "touchCancel", []);

        // The document is back at once, and the drawing follows it.
        expect(await boxBounds(page)).toEqual({ x: BOX.x, y: BOX.y });
        expect(await drawn()).toMatch(/^translate\([\d.]+, 0\) translate\(50, 50\)$/);
        await expect.poll(drawn).toBe("translate(50, 50)");
    });

    test("Space with a mouse drag on the box pans the view and leaves the box", async ({ page }) =>
    {
        await open(page);

        const c = await boxCenter(page);

        await page.locator("#host svg").focus();
        await page.keyboard.down(" ");
        await page.mouse.move(c.x, c.y);
        await page.mouse.down();
        await page.mouse.move(c.x + 40, c.y + 20, { steps: 4 });
        await page.mouse.up();
        await page.keyboard.up(" ");

        expect(await engineCall(page, "getViewport")).toEqual({ x: 40, y: 20, zoom: 1 });
        expect(await boxBounds(page)).toEqual({ x: BOX.x, y: BOX.y });
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });


    test("a finger on an inactive embedded canvas scrolls the page", async ({ page }) =>
    {
        await open(page, true);

        const cdp = await page.context().newCDPSession(page);

        await touch(cdp, "touchStart", [{ x: 300, y: 250 }]);

        for (let i = 1; i <= 8; i += 1)
        {
            await touch(cdp, "touchMove", [{ x: 300, y: 250 - (i * 20) }]);
        }

        await touch(cdp, "touchEnd", []);

        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
        expect(await engineCall(page, "getViewport")).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    test("a tap activates an embedded canvas, and then a finger moves the box", async ({ page }) =>
    {
        await open(page, true);

        const c = await boxCenter(page);
        const cdp = await page.context().newCDPSession(page);

        await touch(cdp, "touchStart", [c]);
        await touch(cdp, "touchEnd", []);

        expect(await selectedIds(page)).toEqual([]);
        await expect(page.locator("#host svg")).not.toHaveClass(/de-canvas-inactive/);

        await touch(cdp, "touchStart", [c]);

        for (let i = 1; i <= 4; i += 1)
        {
            await touch(cdp, "touchMove", [{ x: c.x + (i * 10), y: c.y + (i * 10) }]);
        }

        await touch(cdp, "touchEnd", []);

        expect(await boxBounds(page)).toEqual({ x: BOX.x + 40, y: BOX.y + 40 });
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test("the wheel on an inactive embedded canvas scrolls the page", async ({ page }) =>
    {
        await open(page, true);
        await page.mouse.move(300, 250);
        await page.mouse.wheel(0, 200);

        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
        expect(await engineCall(page, "getZoomLevel")).toBe(1);
    });


    test("in view mode a finger on the box pans, and a mouse drag moves nothing", async ({ page }) =>
    {
        await open(page, false, "view");

        const c = await boxCenter(page);
        const cdp = await page.context().newCDPSession(page);

        await touch(cdp, "touchStart", [c]);

        for (let i = 1; i <= 4; i += 1)
        {
            await touch(cdp, "touchMove", [{ x: c.x + (i * 10), y: c.y + (i * 5) }]);
        }

        await touch(cdp, "touchEnd", []);

        await expect.poll(() => engineCall(page, "getViewport")).toEqual({ x: 40, y: 20, zoom: 1 });

        const moved = await boxCenter(page);

        await page.mouse.move(moved.x, moved.y);
        await page.mouse.down();
        await page.mouse.move(moved.x + 40, moved.y + 20, { steps: 4 });
        await page.mouse.up();

        expect(await boxBounds(page)).toEqual({ x: BOX.x, y: BOX.y });
        expect(await selectedIds(page)).toEqual(["box"]);
        expect(await engineCall(page, "canUndo")).toBe(false);
    });

    test("a finger 15 pixels outside a corner resizes, and the canvas selects no text", async ({ page }) =>
    {
        await open(page);
        await page.evaluate(() => (window as unknown as Record<string, any>).__engine.select(["box"]));

        const cdp = await page.context().newCDPSession(page);

        // The bottom-right handle is at (150, 110), and the box ends there.
        await touch(cdp, "touchStart", [{ x: 165, y: 110 }]);

        for (let i = 1; i <= 4; i += 1)
        {
            await touch(cdp, "touchMove", [{ x: 165 + (i * 10), y: 110 + (i * 5) }]);
        }

        await touch(cdp, "touchEnd", []);

        // The corner follows the finger to (205, 130).
        await expect.poll(() => page.evaluate(() =>
            (window as unknown as Record<string, any>).__engine.getObjectById("box").presentation.bounds))
            .toEqual({ x: BOX.x, y: BOX.y, width: 155, height: 80 });
        expect(await engineCall(page, "getViewport")).toEqual({ x: 0, y: 0, zoom: 1 });

        const userSelect = await page.evaluate(() =>
        {
            const svg = document.querySelector("#host svg")!;
            const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
            const embed = document.createElement("div");

            embed.className = "de-embed-container";
            fo.appendChild(embed);
            svg.appendChild(fo);

            return {
                shape: getComputedStyle(document.querySelector('[data-id="box"]')!).userSelect,
                embed: getComputedStyle(embed).userSelect,
            };
        });

        expect(userSelect).toEqual({ shape: "none", embed: "text" });
    });

    test("the cursor under the mouse shows what a press does", async ({ page }) =>
    {
        await open(page);

        /** Moves the mouse there, and reads the cursor of the element under it. */
        const cursorAt = async (x: number, y: number): Promise<string> =>
        {
            await page.mouse.move(x, y);

            return page.evaluate(([px, py]) => getComputedStyle(document.elementFromPoint(px, py)!).cursor, [x, y]);
        };

        expect(await cursorAt(100, 80)).toBe("move");
        expect(await cursorAt(300, 200)).toBe("default");

        await page.evaluate(() => (window as unknown as Record<string, any>).__engine.select(["box"]));

        // 10 pixels outside the bottom-right handle at (150, 110).
        expect(await cursorAt(160, 110)).toBe("se-resize");
        expect(await cursorAt(100, 25)).toBe("grab");

        await page.evaluate(() => (window as unknown as Record<string, any>).__engine.setActiveTool("draw"));

        expect(await cursorAt(100, 80)).toBe("crosshair");
    });

    test("a long press opens the app's menu on the lift, and so does a right-click", async ({ page }) =>
    {
        await open(page);

        const cdp = await page.context().newCDPSession(page);
        const state = () => page.evaluate(() => ({
            pressed: document.querySelector(".de-pressed-outline") !== null,
            lifted: document.querySelector('[data-id="box"]')!.classList.contains("de-lifted"),
            menus: (window as unknown as Record<string, any>).__menus,
        }));

        await touch(cdp, "touchStart", [{ x: 100, y: 80 }]);

        expect(await state()).toEqual({ pressed: true, lifted: false, menus: [] });

        await expect.poll(state, { timeout: 2000 }).toEqual({ pressed: false, lifted: true, menus: [] });

        await touch(cdp, "touchEnd", []);

        expect(await state()).toEqual({ pressed: false, lifted: false, menus: ["object"] });

        await page.mouse.click(300, 200, { button: "right" });

        expect(await state()).toMatchObject({ menus: ["object", "canvas"] });
        expect(await selectedIds(page)).toEqual(["box"]);
    });
});
