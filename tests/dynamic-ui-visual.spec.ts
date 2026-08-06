/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: measurements that only a real browser can make, plus screenshots for
 * human review.
 *
 * These assert the properties the user reported as broken from screenshots —
 * a dock that grows as you talk, an annotation rendered as a framed widget —
 * because those are layout facts, invisible to jsdom and to the console.
 *
 * Run: npx playwright test tests/dynamic-ui-visual.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";

const SHOTS = "test-results/review";

/** Clicks a suggested prompt on the Dynamic UI page. */
async function runPrompt(page: Page, label: string): Promise<void>
{
    await page.locator("#dui-prompts").getByRole("button", { name: label })
        .click();
    await page.waitForTimeout(250);
}

test.describe("ChatDock keeps a constant height", () =>
{
    test("the dock does not grow as the conversation grows", async ({ page }) =>
    {
        await page.goto("/demo/components/chatdock.html");
        await page.waitForTimeout(400);

        const dock = page.locator(".chatdock");
        const start = await dock.boundingBox();

        for (const text of ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"])
        {
            await page.locator(".chatdock-input").fill(text);
            await page.locator(".chatdock-send").click();
            await page.waitForTimeout(80);
        }

        const end = await dock.boundingBox();

        expect(
            end!.height,
            `the dock grew from ${Math.round(start!.height)}px to `
            + `${Math.round(end!.height)}px — a docked chat must not change `
            + "size as the conversation grows")
            .toBeCloseTo(start!.height, 0);

        await page.screenshot({ path: `${SHOTS}/chatdock-after.png` });
    });

    test("the transcript scrolls rather than expanding", async ({ page }) =>
    {
        await page.goto("/demo/components/chatdock.html");
        await page.waitForTimeout(400);

        for (let i = 0; i < 10; i += 1)
        {
            await page.locator(".chatdock-input").fill(`message ${i}`);
            await page.locator(".chatdock-send").click();
            await page.waitForTimeout(60);
        }

        const turns = page.locator(".chatdock-turns");
        const box = await turns.boundingBox();

        // Fixed height means the region is smaller than its content.
        expect(box!.height).toBeLessThan(200);
    });
});

test.describe("Annotations are overlays, never framed widgets", () =>
{
    test("an annotation on the canvas has no title bar", async ({ page }) =>
    {
        await page.goto("/demo/components/dynamiccanvas.html");
        await page.waitForTimeout(500);

        await page.getByRole("button", { name: "Add annotation" }).click();
        await page.waitForTimeout(300);

        // The reported bug: a framed widget titled "Annotation" containing a
        // dot. An annotation must never acquire frame furniture.
        await expect(page.locator(".dyncanvas-frame")).toHaveCount(0);
        await expect(page.locator(".dyncanvas-overlay")).toHaveCount(1);
        await expect(page.locator(".dyncanvas-titlebar")).toHaveCount(0);

        await page.screenshot({ path: `${SHOTS}/annotation-collapsed.png` });
    });

    test("an annotation does not displace a note", async ({ page }) =>
    {
        await page.goto("/demo/components/dynamiccanvas.html");
        await page.waitForTimeout(500);

        await page.getByRole("button", { name: "Add note" }).click();
        await page.waitForTimeout(250);

        const before = await page.locator(".dyncanvas-frame").boundingBox();

        for (let i = 0; i < 5; i += 1)
        {
            await page.getByRole("button", { name: "Add annotation" }).click();
            await page.waitForTimeout(120);
        }

        const after = await page.locator(".dyncanvas-frame").boundingBox();

        expect(after!.x, "annotations moved the note").toBeCloseTo(before!.x, 0);
        expect(after!.y, "annotations moved the note").toBeCloseTo(before!.y, 0);

        await page.screenshot({ path: `${SHOTS}/annotation-many.png` });
    });

    test("expanding shows a popover card", async ({ page }) =>
    {
        await page.goto("/demo/components/dynamiccanvas.html");
        await page.waitForTimeout(500);

        await page.getByRole("button", { name: "Add annotation" }).click();
        await page.waitForTimeout(250);

        await page.locator(".annotation-marker").first().click();
        await page.waitForTimeout(200);

        await expect(page.locator(".annotation-card")).toHaveCount(1);

        await page.screenshot({ path: `${SHOTS}/annotation-expanded.png` });
    });
});

test.describe("Prompt order matches the narrative", () =>
{
    test("the first prompt is the schema one", async ({ page }) =>
    {
        await page.goto("/demo/dynamic-ui.html");
        await expect(page.locator("#dui-prompts button").first())
            .toBeVisible({ timeout: 5000 });

        // Clicking left to right must tell the story in order. Matcher order
        // put the annotation prompt first, so it fired before the grid it
        // annotates existed and silently did nothing.
        await expect(page.locator("#dui-prompts button").first())
            .toContainText("show me the tables");
    });

    test("every prompt reports what it did", async ({ page }) =>
    {
        await page.goto("/demo/dynamic-ui.html");
        await expect(page.locator("#dui-prompts button").first())
            .toBeVisible({ timeout: 5000 });

        // Out of order on purpose: annotating before there is a grid must
        // still produce a reply rather than silence.
        await runPrompt(page, "call out the orders table");

        await expect(page.locator(".chatdock-turn-assistant"))
            .not.toHaveCount(0);

        await page.screenshot({ path: `${SHOTS}/dynamic-ui-reply.png` });
    });

    test("the full narrative leaves the canvas coherent", async ({ page }) =>
    {
        await page.goto("/demo/dynamic-ui.html");
        await expect(page.locator("#dui-prompts button").first())
            .toBeVisible({ timeout: 5000 });

        await runPrompt(page, "show me the tables in the sales database");
        await runPrompt(page, "leave a note on the orders table");
        await runPrompt(page, "call out the orders table");

        await expect(page.locator(".dyncanvas-frame")).toHaveCount(3);
        await expect(page.locator(".dyncanvas-overlay")).toHaveCount(1);

        await page.screenshot({
            path: `${SHOTS}/dynamic-ui-full.png`, fullPage: false,
        });
    });
});
