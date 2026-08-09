/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: click-to-place, in a real browser.
 *
 * The library's claim is that an application never translates screen
 * coordinates: it says WHAT to place, the canvas works out WHERE, records it,
 * and restores it. Every assertion here is a measured box, because that claim
 * is entirely geometric — a mark that lands 40px off, or drifts on scroll, or
 * comes back somewhere else after a reload, produces no error and no log.
 *
 * The load-bearing test is "a placed mark restores to the same content": it
 * exercises capture and restore as inverses. If the forward and inverse
 * arithmetic ever drift apart, that is where it shows.
 *
 * Run: npx playwright test tests/placement.spec.ts
 */

import { test, expect, type Page, type Locator } from "@playwright/test";

const DEMO = "/demo/components/dynamiccanvas.html";
const SHOTS = "test-results/review";

/** Opens the canvas demo and waits for the manifest fetch to register. */
async function open(page: Page): Promise<void>
{
    await page.goto(DEMO);
    await expect(page.locator("#dc-place")).toBeEnabled({ timeout: 5000 });

    // The buttons exist before the manifest resolves; the canvas does not.
    await page.waitForFunction(() =>
        Boolean((window as unknown as Record<string, unknown>).dcCanvas),
        undefined, { timeout: 5000 });
}

/** Adds the scrolling document node and returns its body element. */
async function addDocument(page: Page): Promise<Locator>
{
    await page.locator("#dc-doc-node").click();
    await page.waitForTimeout(300);

    // The region that actually scrolls. The grid renders taller than its
    // frame and the frame body takes the overflow, so the body is the
    // scroller here — which is exactly what the canvas has to work out for
    // itself rather than assume.
    const scroller = page.locator(".dyncanvas-frame .dyncanvas-body").first();

    await expect(scroller).toBeVisible();
    await expect(page.locator(".datagrid-row").first()).toBeVisible();

    return scroller;
}

/** Arms placement and clicks the given point inside an element. */
async function placeAt(
    page: Page,
    target: Locator,
    fx: number,
    fy: number): Promise<{ x: number; y: number }>
{
    const box = (await target.boundingBox())!;
    const point = { x: box.x + box.width * fx, y: box.y + box.height * fy };

    await page.locator("#dc-place").click();
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(250);

    return point;
}

/** The centre of a locator's box. */
async function centreOf(target: Locator): Promise<{ x: number; y: number }>
{
    const box = (await target.boundingBox())!;

    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe("Click-to-place", () =>
{
    test("the mark lands where the pointer was, not at a corner", async ({ page }) =>
    {
        await open(page);

        const body = await addDocument(page);
        const clicked = await placeAt(page, body, 0.5, 0.4);

        await expect(page.locator(".annotation-marker")).toHaveCount(1);

        const centre = await centreOf(page.locator(".dyncanvas-overlay"));

        // The whole point of the gesture: this used to land on the target's
        // top-right corner regardless of where the user pointed.
        expect(Math.abs(centre.x - clicked.x),
            `mark is ${Math.round(Math.abs(centre.x - clicked.x))}px off in x`)
            .toBeLessThan(3);
        expect(Math.abs(centre.y - clicked.y),
            `mark is ${Math.round(Math.abs(centre.y - clicked.y))}px off in y`)
            .toBeLessThan(3);

        await page.screenshot({ path: `${SHOTS}/placement-placed.png` });
    });

    test("the recorded anchor carries the spot, not just the node",
        async ({ page }) =>
    {
        await open(page);

        const body = await addDocument(page);

        await placeAt(page, body, 0.5, 0.4);

        const anchor = await page.evaluate(() =>
        {
            const canvas = (window as unknown as Record<string, unknown>)
                .dcCanvas as { getDocument(): { nodes: Record<string, unknown> } };
            const nodes = canvas.getDocument().nodes;
            const placed = Object.values(nodes)
                .find((n) => (n as { component: string }).component === "annotation");

            return (placed as { anchor: Record<string, unknown> }).anchor;
        });

        expect(anchor.kind).toBe("node");
        expect(anchor.spot, "no spot was recorded").toBeTruthy();

        // Fractions, so the mark survives the frame being resized.
        const spot = anchor.spot as { x: number; y: number };

        expect(spot.x).toBeGreaterThan(0);
        expect(spot.x).toBeLessThan(1);
    });

    test("the mark travels with the content when it scrolls", async ({ page }) =>
    {
        await open(page);

        const body = await addDocument(page);

        // Placed well down the visible region so a scroll moves it without
        // scrolling it out of view — that is the next test's job.
        await placeAt(page, body, 0.5, 0.6);

        const before = await centreOf(page.locator(".dyncanvas-overlay"));
        const delta = 60;

        await body.evaluate((el, d) => { el.scrollTop = d; }, delta);
        await page.waitForTimeout(200);

        const after = await centreOf(page.locator(".dyncanvas-overlay"));

        // A mark records a position in the CONTENT. Anchored to the frame it
        // would sit still while the text it marks scrolled away beneath it.
        expect(before.y - after.y,
            `the mark moved ${Math.round(before.y - after.y)}px for a `
            + `${delta}px scroll — it should track the content exactly`)
            .toBeCloseTo(delta, 0);

        expect(Math.abs(after.x - before.x), "the mark drifted sideways")
            .toBeLessThan(2);
    });

    test("the mark hides when its content scrolls out of view",
        async ({ page }) =>
    {
        await open(page);

        const body = await addDocument(page);

        await placeAt(page, body, 0.5, 0.15);
        await expect(page.locator(".dyncanvas-overlay")).toBeVisible();

        await body.evaluate((el) => { el.scrollTop = el.scrollHeight; });
        await page.waitForTimeout(200);

        await expect(page.locator(".dyncanvas-overlay"),
            "a mark on content scrolled away must not float over other content")
            .toBeHidden();

        // And it comes back — hidden, not destroyed.
        await body.evaluate((el) => { el.scrollTop = 0; });
        await page.waitForTimeout(200);

        await expect(page.locator(".dyncanvas-overlay")).toBeVisible();
    });

    test("a placed mark restores to the same content from the patch log alone",
        async ({ page }) =>
    {
        await open(page);

        const body = await addDocument(page);

        await placeAt(page, body, 0.45, 0.3);

        // Scroll first: the restored position must be computed from the
        // recorded fraction, not inherited from wherever the DOM happens to be.
        await body.evaluate((el) => { el.scrollTop = 40; });
        await page.waitForTimeout(200);

        const before = await centreOf(page.locator(".dyncanvas-overlay"));

        // Everything an application would have stored, and nothing else.
        await page.evaluate(() =>
        {
            const w = window as unknown as Record<string, unknown>;
            const canvas = w.dcCanvas as {
                load(patches: unknown[]): void;
                clear(): void;
            };

            canvas.load(w.dcLog as unknown[]);
        });
        await page.waitForTimeout(300);

        // Restore the same scroll position; the mark's place in the content is
        // what was recorded, so the same scroll must show it in the same place.
        await page.locator(".dyncanvas-frame .dyncanvas-body").first()
            .evaluate((el) => { el.scrollTop = 40; });
        await page.waitForTimeout(200);

        const after = await centreOf(page.locator(".dyncanvas-overlay"));

        expect(after.x, "restored mark moved in x").toBeCloseTo(before.x, 0);
        expect(after.y, "restored mark moved in y").toBeCloseTo(before.y, 0);

        await page.screenshot({ path: `${SHOTS}/placement-restored.png` });
    });

    test("placing on bare canvas marks the point clicked", async ({ page }) =>
    {
        await open(page);
        await addDocument(page);

        const canvasBox = (await page.locator("#dc-canvas").boundingBox())!;
        const point = {
            x: canvasBox.x + canvasBox.width - 60,
            y: canvasBox.y + canvasBox.height - 60,
        };

        await page.locator("#dc-place").click();
        await page.mouse.click(point.x, point.y);
        await page.waitForTimeout(250);

        const centre = await centreOf(page.locator(".dyncanvas-overlay"));

        // The packer used to march every unanchored overlay along the top of
        // the main region, silently discarding the coordinates it was given.
        // Tight on purpose: this is also the guard on the canvas's marker size
        // matching the packer's. A silent 10px drift between them would offset
        // every dropped mark by half the difference, and 6px would allow it.
        expect(Math.abs(centre.x - point.x)).toBeLessThan(3);
        expect(Math.abs(centre.y - point.y)).toBeLessThan(3);
    });

    test("placing does not displace what it marks", async ({ page }) =>
    {
        await open(page);

        const body = await addDocument(page);
        const frame = page.locator(".dyncanvas-frame").first();
        const before = await frame.boundingBox();

        for (const fy of [0.2, 0.4, 0.6, 0.8])
        {
            await placeAt(page, body, 0.5, fy);
        }

        await expect(page.locator(".dyncanvas-overlay")).toHaveCount(4);

        const after = await frame.boundingBox();

        expect(after!.x, "marks moved the document").toBeCloseTo(before!.x, 0);
        expect(after!.y, "marks moved the document").toBeCloseTo(before!.y, 0);
    });

    test("a mark on a component's OWN scroller records which region it used",
        async ({ page }) =>
    {
        await open(page);

        // A note longer than its card scrolls inside its own text area rather
        // than scrolling the frame body.
        await page.locator("#dc-long-note").click();
        await page.waitForTimeout(300);

        const text = page.locator(".stickynote-text").first();

        await expect(text).toBeVisible();

        await placeAt(page, text, 0.5, 0.5);

        const anchor = await page.evaluate(() =>
        {
            const c = (window as unknown as Record<string, unknown>).dcCanvas as
                { getDocument(): { nodes: Record<string, unknown> } };

            return Object.values(c.getDocument().nodes)
                .filter((n) => (n as { component: string }).component === "annotation")
                .map((n) => (n as { anchor: Record<string, unknown> }).anchor)[0];
        });

        // Index 0 is the frame body. A fraction of the WRONG box lands nowhere
        // near what was pointed at, so the region has to be recorded.
        expect(anchor.within, `anchor was ${JSON.stringify(anchor)}`)
            .toBeGreaterThan(0);
    });

    test("a mark follows a component's own scroller", async ({ page }) =>
    {
        await open(page);
        await page.locator("#dc-long-note").click();
        await page.waitForTimeout(300);

        const text = page.locator(".stickynote-text").first();

        await placeAt(page, text, 0.5, 0.7);

        const before = await centreOf(page.locator(".dyncanvas-overlay"));
        const delta = 40;

        await text.evaluate((el, d) => { el.scrollTop = d; }, delta);
        await page.waitForTimeout(200);

        const after = await centreOf(page.locator(".dyncanvas-overlay"));

        expect(before.y - after.y,
            `the mark moved ${Math.round(before.y - after.y)}px for a `
            + `${delta}px scroll of the component's own region`)
            .toBeCloseTo(delta, 0);
    });

    test("Escape cancels an armed placement", async ({ page }) =>
    {
        await open(page);

        const body = await addDocument(page);

        await page.locator("#dc-place").click();
        await page.keyboard.press("Escape");

        const box = (await body.boundingBox())!;

        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(200);

        await expect(page.locator(".dyncanvas-overlay")).toHaveCount(0);
    });

    test("an armed click does not reach the component underneath",
        async ({ page }) =>
    {
        await open(page);

        await addDocument(page);

        const row = page.locator(".datagrid-row").nth(2);

        await expect(row).toBeVisible();

        const box = (await row.boundingBox())!;

        await page.locator("#dc-place").click();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(250);

        // Clicking a row to annotate it must not also select that row.
        await expect(page.locator(".dyncanvas-overlay")).toHaveCount(1);
        await expect(row).not.toHaveClass(/selected/);

        // Placement is one-shot: the next click is an ordinary click again.
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(200);

        await expect(page.locator(".dyncanvas-overlay")).toHaveCount(1);
    });

    test("the mark is editable the moment it is placed", async ({ page }) =>
    {
        await open(page);

        const body = await addDocument(page);

        await placeAt(page, body, 0.5, 0.4);

        const field = page.locator(".annotation-card-input");

        await expect(field).toBeVisible();

        await field.fill("Row 12 looks wrong");
        await expect(field).toHaveValue("Row 12 looks wrong");
    });
});
