/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the Dynamic UI demo, in a real browser.
 *
 * Written because the same failure was mis-diagnosed twice from reasoning: a
 * node that mounts correctly and renders OFF-SCREEN produces no error and no
 * log, so neither the jsdom suite nor the console can see it. Only a real
 * browser with real layout can, which is exactly what these assertions use —
 * bounding boxes, not internal state.
 *
 * Run: npx playwright test tests/dynamic-ui.spec.ts
 */

import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

const DEMO = "/demo/dynamic-ui.html";

/** Collects console output so a silent failure is still visible in the report. */
function watchConsole(page: Page): { errors: string[]; logs: string[] }
{
    const errors: string[] = [];
    const logs: string[] = [];

    page.on("console", (msg: ConsoleMessage) =>
    {
        logs.push(`${msg.type()}: ${msg.text()}`);

        if (msg.type() === "error")
        {
            errors.push(msg.text());
        }
    });

    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    return { errors, logs };
}

/** Opens the demo and waits for the manifest fetch to finish registering. */
async function open(page: Page): Promise<void>
{
    await page.goto(DEMO);

    // The prompt buttons are built from the script table after the manifest
    // fetch resolves, so their presence is the real readiness signal.
    await expect(page.locator("#dui-prompts button").first())
        .toBeVisible({ timeout: 5000 });
}

/** Clicks a suggested prompt by its visible label. */
async function runPrompt(page: Page, label: string): Promise<void>
{
    await page.getByRole("button", { name: label }).click();
    await page.waitForTimeout(250);
}

/** Asserts a frame's box lies inside the canvas's box. */
async function expectOnScreen(page: Page, index: number): Promise<void>
{
    const canvas = await page.locator("#dui-canvas").boundingBox();
    const frame = await page.locator(".dyncanvas-frame").nth(index).boundingBox();

    expect(canvas, "canvas has no box").not.toBeNull();
    expect(frame, `frame ${index} has no box — it never rendered`).not.toBeNull();

    expect(frame!.x, `frame ${index} is off the left edge`)
        .toBeGreaterThanOrEqual(canvas!.x - 1);

    expect(
        frame!.x + frame!.width,
        `frame ${index} spans x=${Math.round(frame!.x)}..`
        + `${Math.round(frame!.x + frame!.width)} but the canvas ends at `
        + `${Math.round(canvas!.x + canvas!.width)} — it is OFF-SCREEN`)
        .toBeLessThanOrEqual(canvas!.x + canvas!.width + 1);
}

test.describe("Dynamic UI demo", () =>
{
    test("loads and registers components without errors", async ({ page }) =>
    {
        const seen = watchConsole(page);

        await open(page);

        // Three suggested prompts, built from the script table.
        await expect(page.locator("#dui-prompts button")).toHaveCount(3);
        expect(seen.errors, seen.errors.join("\n")).toEqual([]);
    });

    test("prompt 1 mounts two frames, both with content", async ({ page }) =>
    {
        await open(page);
        await runPrompt(page, "show me the tables in the sales database");

        await expect(page.locator(".dyncanvas-frame")).toHaveCount(2);

        // A frame whose body is empty is the silent-failure signature.
        await expect(page.locator(".dyncanvas-frame").nth(0)
            .locator(".dyncanvas-body > *")).not.toHaveCount(0);
        await expect(page.locator(".dyncanvas-frame").nth(1)
            .locator(".dyncanvas-body > *")).not.toHaveCount(0);
    });

    test("prompt 2 adds a note that is VISIBLE on screen", async ({ page }) =>
    {
        const seen = watchConsole(page);

        await open(page);
        await runPrompt(page, "show me the tables in the sales database");
        await runPrompt(page, "leave a note on the orders table");

        await expect(
            page.locator(".dyncanvas-frame"),
            `frame count wrong. Console:\n${seen.logs.join("\n")}`)
            .toHaveCount(3);

        await expectOnScreen(page, 2);

        // And it must actually contain a note.
        await expect(page.locator(".stickynote")).toHaveCount(1);
    });

    test("prompt 3 adds a visible annotation", async ({ page }) =>
    {
        await open(page);
        await runPrompt(page, "show me the tables in the sales database");
        await runPrompt(page, "call out the orders table");

        await expect(page.locator(".dyncanvas-frame")).toHaveCount(3);
        await expectOnScreen(page, 2);
        await expect(page.locator(".annotation")).toHaveCount(1);
    });

    test("all three prompts together stay on screen", async ({ page }) =>
    {
        await open(page);
        await runPrompt(page, "show me the tables in the sales database");
        await runPrompt(page, "leave a note on the orders table");
        await runPrompt(page, "call out the orders table");

        await expect(page.locator(".dyncanvas-frame")).toHaveCount(4);

        for (let i = 0; i < 4; i += 1)
        {
            await expectOnScreen(page, i);
        }
    });

    test("selecting a table repaints the grid through the binding", async ({ page }) =>
    {
        await open(page);
        await runPrompt(page, "show me the tables in the sales database");

        const rows = page.locator(".datagrid-row");
        const before = await rows.count();

        // Frame titles come from the BUILT manifest labels ("Tree View"), not
        // from the demo, so locate the tree by its own markup instead.
        await page.locator(".dyncanvas-frame .treeview")
            .getByText("orders", { exact: false }).first().click();
        await page.waitForTimeout(300);

        expect(await rows.count(),
            "the grid did not repaint after selecting a table")
            .toBeGreaterThan(before);
    });

    test("pin toggles both ways", async ({ page }) =>
    {
        await open(page);
        await runPrompt(page, "show me the tables in the sales database");

        const frame = page.locator(".dyncanvas-frame").first();

        await frame.locator('[data-role="pin"]').click();
        await expect(frame).toHaveClass(/dyncanvas-frame-pinned/);

        await page.locator('.dyncanvas-frame [data-role="pin"]').first().click();
        await expect(frame).not.toHaveClass(/dyncanvas-frame-pinned/);
    });
});
