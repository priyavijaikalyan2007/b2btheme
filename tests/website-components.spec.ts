/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: MarketingHero and SiteFooter (end to end)
 *
 * Layout behaviour that jsdom cannot see. The unit suites assert DOM
 * structure; nothing there computes a box, so "does the split actually sit
 * side by side" and "does anything overflow at 320px" can only be answered
 * by a real engine.
 *
 * Each spec navigates to a page that LOADS the component and waits on the
 * window global rather than a bare selector — the DiagramEngine suite once
 * spent months green-looking while pointed at a gallery index that loaded
 * nothing (DEBT-DE-1).
 */

import { test, expect } from "@playwright/test";

const HERO_PAGE = "/demo/components/marketinghero.html";
const FOOTER_PAGE = "/demo/components/sitefooter.html";

/** Wait until the component's factory is on the window, not merely the DOM. */
async function waitForFactory(page: import("@playwright/test").Page, name: string): Promise<void>
{
    await page.waitForFunction(
        (fn) => typeof (window as any)[fn] === "function", name);
}

test.describe("MarketingHero layout", () =>
{
    test("split hero sits side by side above its breakpoint", async ({ page }) =>
    {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(HERO_PAGE);
        await waitForFactory(page, "createMarketingHero");

        const hero = page.locator(".marketinghero-split.marketinghero-stack-lg").first();
        const contentBox = await hero.locator(".marketinghero-content").first().boundingBox();
        const asideBox = await hero.locator(".marketinghero-aside").first().boundingBox();

        expect(contentBox).not.toBeNull();
        expect(asideBox).not.toBeNull();

        // Side by side: the aside starts at or beyond where the content ends.
        expect(asideBox!.x).toBeGreaterThanOrEqual(
            contentBox!.x + contentBox!.width - 1);
    });

    test("split hero stacks below its breakpoint", async ({ page }) =>
    {
        await page.setViewportSize({ width: 800, height: 900 });
        await page.goto(HERO_PAGE);
        await waitForFactory(page, "createMarketingHero");

        const hero = page.locator(".marketinghero-split.marketinghero-stack-lg").first();
        const contentBox = await hero.locator(".marketinghero-content").first().boundingBox();
        const asideBox = await hero.locator(".marketinghero-aside").first().boundingBox();

        // Stacked: the aside starts at or below where the content ends.
        expect(asideBox!.y).toBeGreaterThanOrEqual(
            contentBox!.y + contentBox!.height - 1);
    });

    test("the two collapse points differ between lg and md", async ({ page }) =>
    {
        // At 800px the lg hero has stacked and the md hero has not. If both
        // behaved the same, stackBelow would be doing nothing.
        await page.setViewportSize({ width: 800, height: 900 });
        await page.goto(HERO_PAGE);
        await waitForFactory(page, "createMarketingHero");

        const lg = page.locator(".marketinghero-stack-lg").first();
        const md = page.locator(".marketinghero-stack-md").first();

        const lgContent = await lg.locator(".marketinghero-content").first().boundingBox();
        const lgAside = await lg.locator(".marketinghero-aside").first().boundingBox();
        const mdContent = await md.locator(".marketinghero-content").first().boundingBox();
        const mdAside = await md.locator(".marketinghero-aside").first().boundingBox();

        expect(lgAside!.y).toBeGreaterThan(lgContent!.y);                     // stacked
        expect(mdAside!.x).toBeGreaterThanOrEqual(
            mdContent!.x + mdContent!.width - 1);                             // side by side
    });

    test("the eyebrow paints above the heading it follows in source", async ({ page }) =>
    {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(HERO_PAGE);
        await waitForFactory(page, "createMarketingHero");

        const content = page.locator("#hero-stacked .marketinghero-content");
        const eyebrowBox = await content.locator(".marketinghero-eyebrow").boundingBox();
        const titleBox = await content.locator(".marketinghero-title").boundingBox();

        expect(eyebrowBox!.y).toBeLessThan(titleBox!.y);
    });
});

test.describe("SiteFooter layout", () =>
{
    test("columns stack in source order on a narrow viewport", async ({ page }) =>
    {
        await page.setViewportSize({ width: 320, height: 900 });
        await page.goto(FOOTER_PAGE);
        await waitForFactory(page, "createSiteFooter");

        const grid = page.locator(".sitefooter-cols-3").first();
        const blocks = grid.locator(":scope > *");
        const count = await blocks.count();
        expect(count).toBeGreaterThan(1);

        let previousBottom = -1;
        for (let i = 0; i < count; i++)
        {
            const box = await blocks.nth(i).boundingBox();
            expect(box!.y).toBeGreaterThanOrEqual(previousBottom - 1);
            previousBottom = box!.y + box!.height;
        }
    });

    test("columns sit side by side above md", async ({ page }) =>
    {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(FOOTER_PAGE);
        await waitForFactory(page, "createSiteFooter");

        const grid = page.locator(".sitefooter-cols-3").first();
        const first = await grid.locator(":scope > *").nth(0).boundingBox();
        const second = await grid.locator(":scope > *").nth(1).boundingBox();

        expect(second!.x).toBeGreaterThan(first!.x);
        expect(Math.abs(second!.y - first!.y)).toBeLessThan(2);
    });

    test("nothing overflows the viewport at 320px", async ({ page }) =>
    {
        await page.setViewportSize({ width: 320, height: 900 });
        await page.goto(FOOTER_PAGE);
        await waitForFactory(page, "createSiteFooter");

        // The four-column section carries a 57-character email address and a
        // German compound precisely so this assertion has something to catch.
        const overflows = await page.evaluate(() =>
            document.documentElement.scrollWidth
                > document.documentElement.clientWidth);

        expect(overflows).toBe(false);
    });

    test("each navigation group has an accessible name", async ({ page }) =>
    {
        await page.goto(FOOTER_PAGE);
        await waitForFactory(page, "createSiteFooter");

        const groups = page.locator(".sitefooter-group");
        const count = await groups.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++)
        {
            const labelledBy = await groups.nth(i).getAttribute("aria-labelledby");
            expect(labelledBy).toBeTruthy();
            await expect(page.locator(`#${labelledBy}`)).toHaveCount(1);
        }
    });

    test("a focused footer link shows a visible outline", async ({ page }) =>
    {
        await page.goto(FOOTER_PAGE);
        await waitForFactory(page, "createSiteFooter");

        const link = page.locator(".sitefooter-links a").first();
        await link.focus();

        const outlineWidth = await link.evaluate((el) =>
            window.getComputedStyle(el).outlineWidth);

        expect(parseFloat(outlineWidth)).toBeGreaterThan(0);
    });
});

test.describe("Both themes", () =>
{
    for (const theme of ["light", "dark"])
    {
        test(`hero and footer render in ${theme}`, async ({ page }) =>
        {
            await page.goto(HERO_PAGE);
            await page.evaluate((t) =>
                document.documentElement.setAttribute("data-bs-theme", t), theme);
            await expect(page.locator(".marketinghero").first()).toBeVisible();

            await page.goto(FOOTER_PAGE);
            await page.evaluate((t) =>
                document.documentElement.setAttribute("data-bs-theme", t), theme);
            await expect(page.locator(".sitefooter").first()).toBeVisible();
        });
    }
});
