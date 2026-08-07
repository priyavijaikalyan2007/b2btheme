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

test.describe("Annotation standalone page", () =>
{
    test("hovering a pin does not oscillate", async ({ page }) =>
    {
        await page.goto("/demo/components/annotation.html");
        await page.waitForTimeout(400);

        const pin = page.locator("#an-pin-1 .annotation-marker");
        const root = page.locator("#an-pin-1 .annotation");

        await pin.hover();

        // Rebuilding the element under the pointer used to fire pointerleave,
        // which collapsed, which put the marker back under the pointer, which
        // re-expanded. Sample the state repeatedly: it must settle, not flip.
        await page.waitForTimeout(700);

        const samples: boolean[] = [];

        for (let i = 0; i < 8; i += 1)
        {
            samples.push((await root.getAttribute("class") ?? "")
                .includes("annotation-expanded"));
            await page.waitForTimeout(120);
        }

        const flips = samples.filter((v, i) => i > 0 && v !== samples[i - 1]).length;

        expect(flips,
            `expansion state changed ${flips} times while the pointer sat `
            + `still: ${samples.join(",")}`)
            .toBe(0);

        expect(samples[0], "a sustained hover should have expanded it")
            .toBe(true);
    });

    test("the pin stays put and the card opens beside it", async ({ page }) =>
    {
        await page.goto("/demo/components/annotation.html");
        await page.waitForTimeout(400);

        const pin = page.locator("#an-pin-1 .annotation-marker");
        const before = await pin.boundingBox();

        await pin.click();
        await page.waitForTimeout(200);

        const after = await pin.boundingBox();

        // The pin is the pointer's stable target; it must not move or vanish.
        // A couple of pixels of slack for the hover scale, which is intended.
        expect(Math.abs(after!.x - before!.x),
            "the pin moved when expanded").toBeLessThan(3);
        expect(Math.abs(after!.y - before!.y),
            "the pin moved when expanded").toBeLessThan(3);

        const card = await page.locator("#an-pin-1 .annotation-card")
            .boundingBox();

        expect(card!.x, "the card should open beside the pin")
            .toBeGreaterThan(before!.x);

        await page.screenshot({ path: `${SHOTS}/annotation-standalone.png` });
    });

    test("the editing examples do not overlap each other", async ({ page }) =>
    {
        await page.goto("/demo/components/annotation.html");
        await page.waitForTimeout(400);

        // Two expanded cards laid out in one flex ROW put the second pin
        // underneath the first card. Cards open sideways, so examples must
        // stack. Nothing but a real box measurement can see this.
        const first = await page.locator("#an-edit .annotation-card")
            .boundingBox();
        const second = await page.locator("#an-readonly .annotation-card")
            .boundingBox();

        const overlaps = first!.x < second!.x + second!.width
            && second!.x < first!.x + first!.width
            && first!.y < second!.y + second!.height
            && second!.y < first!.y + first!.height;

        expect(overlaps,
            `the editing cards overlap: ${JSON.stringify(first)} vs `
            + `${JSON.stringify(second)}`).toBe(false);

        await page.screenshot({
            path: `${SHOTS}/annotation-editing.png`, fullPage: true,
        });
    });

    test("typing in a callout reports through the change channel",
        async ({ page }) =>
    {
        await page.goto("/demo/components/annotation.html");
        await page.waitForTimeout(400);

        const field = page.locator("#an-edit .annotation-card-input");

        await field.fill("Revenue spike");

        await expect(page.locator("#an-edit-log span"))
            .toHaveText("Revenue spike");

        // The caret must survive the edit — a repaint would drop focus.
        await expect(field).toBeFocused();

        // read-only renders text, not a field.
        await expect(page.locator("#an-readonly .annotation-card-input"))
            .toHaveCount(0);
        await expect(page.locator("#an-readonly .annotation-card"))
            .toContainText("Set by the application");
    });

    test("five pins rest without covering the text they mark", async ({ page }) =>
    {
        await page.goto("/demo/components/annotation.html");
        await page.waitForTimeout(400);

        await expect(page.locator(".annot-demo-target .annotation-marker"))
            .toHaveCount(5);

        // None expanded at rest.
        await expect(page.locator(".annot-demo-target .annotation-expanded"))
            .toHaveCount(0);
    });
});
