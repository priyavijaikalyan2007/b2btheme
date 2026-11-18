/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: FacetSearch's underlines for Parse's problems in a real browser (#206).
 * The underlines are drawn by a layer behind the input, which jsdom cannot lay out, so these show:
 *   - a mark sits under the characters of its range, inside the input's box;
 *   - the mark moves with the input when the input scrolls its text;
 *   - the pointer over a mark puts its problem in the message line.
 */

import { test, expect, type Page } from "@playwright/test";

const PAGE = "/__facetsearch-marks.html";

/* The bar is 300 wide, so a long query scrolls in the input. */
const HTML = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="/css/custom.css">
<link rel="stylesheet" href="/components/facetsearch/facetsearch.css">
<style>body { margin: 16px; } #host { width: 300px; }</style>
</head><body>
<div id="host"></div>
<script>window.__ebt_debug_logging = false;</script>
<script src="/components/timezonepicker/timezonepicker.js"></script>
<script src="/components/facetsearch/facetsearch.js"></script>
</body></html>`;

type Box = { left: number; right: number; top: number; bottom: number };

/** Opens a bar holding `text`, applies Parse's `errors`, and returns the page. */
async function open(page: Page, text: string, errors: Array<{ start: number; end: number; title: string }>)
    : Promise<void>
{
    await page.route(`**${PAGE}`, (route) => route.fulfill({ contentType: "text/html", body: HTML }));
    await page.goto(PAGE);
    await page.evaluate(({ text, errors }) =>
    {
        const win = window as unknown as Record<string, any>;

        win.__bar = win.createFacetSearch("host", { facets: [], syntax: "query", value: text });
        win.__bar.setParsed({ text, errors: errors.map((e) => ({ code: "QL_X", detail: "D.", ...e })) });
    }, { text, errors });
}

/** The box of mark `i`, the input's box and scroll, and where `prefix` ends in the input's own font. */
async function measure(page: Page, i: number, prefix: string)
    : Promise<{ mark: Box; input: Box; scroll: number; layer: number; textEnd: number }>
{
    return page.evaluate(({ i, prefix }) =>
    {
        const input = document.querySelector<HTMLInputElement>(".facetsearch-input")!;
        const mark = document.querySelectorAll(".facetsearch-mark")[i].getBoundingClientRect();
        const box = input.getBoundingClientRect();
        const ctx = document.createElement("canvas").getContext("2d")!;
        ctx.font = getComputedStyle(input).font;

        return {
            mark: { left: mark.left, right: mark.right, top: mark.top, bottom: mark.bottom },
            input: { left: box.left, right: box.right, top: box.top, bottom: box.bottom },
            scroll: input.scrollLeft,
            layer: document.querySelector(".facetsearch-marks")!.scrollLeft,
            textEnd: box.left + ctx.measureText(prefix).width - input.scrollLeft,
        };
    }, { i, prefix });
}

test("a mark sits under the characters of its range, inside the input", async ({ page }) =>
{
    const text = "budget (type:";
    await open(page, text, [{ start: 7, end: 8, title: "A bracket is not closed" }]);

    const m = await measure(page, 0, "budget ");

    expect(Math.abs(m.mark.left - m.textEnd)).toBeLessThan(1);
    expect(m.mark.right).toBeGreaterThan(m.mark.left);
    expect(m.mark.top).toBeGreaterThanOrEqual(m.input.top - 1);
    expect(m.mark.bottom).toBeLessThanOrEqual(m.input.bottom + 1);
});

test("the mark moves with the input when the input scrolls", async ({ page }) =>
{
    const text = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi";
    const start = text.indexOf("omicron");
    await open(page, text, [{ start, end: start + 7, title: "Far along" }]);

    await page.locator(".facetsearch-input").focus();
    await page.keyboard.press("End");
    await expect.poll(async () => (await measure(page, 0, "")).scroll).toBeGreaterThan(0);

    const m = await measure(page, 0, text.slice(0, start));

    expect(m.layer).toBe(m.scroll);
    expect(Math.abs(m.mark.left - m.textEnd)).toBeLessThan(1);
});

test("the pointer over a mark puts its problem in the message line", async ({ page }) =>
{
    const text = "alpha beta gamma";
    await open(page, text, [{ start: 0, end: 5, title: "First" }, { start: 11, end: 16, title: "Third" }]);

    const line = page.locator(".facetsearch-message-text");
    await expect(line).toHaveText("First. D.");

    const m = await measure(page, 1, text.slice(0, 11));
    await page.mouse.move((m.mark.left + m.mark.right) / 2, (m.mark.top + m.mark.bottom) / 2);
    await expect(line).toHaveText("Third. D.");

    await page.mouse.move(m.input.right + 100, m.input.bottom + 100);
    await expect(line).toHaveText("First. D.");
});
