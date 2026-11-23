/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: ExpressionBuilder's grid in a real browser (#207, #237).
 * jsdom has no layout and no pointer capture, so these show:
 *   - a drag by a row's handle moves the row, through GestureRecognizer, and reports the tree;
 *   - a row added at the end and dropped into a group joins it with the group's join;
 *   - a group cannot be dropped inside itself;
 *   - the same query back from the bar keeps the focus and the half-typed value;
 *   - under a coarse pointer each target is 44px, and the handle takes the touch (touch-action: none).
 * The page is the test's own, so each test controls the tree it drags.
 */

import { test, expect, type Page } from "@playwright/test";

const PAGE = "/__expressionbuilder.html";

const HTML = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="/css/custom.css">
<link rel="stylesheet" href="/icons/bootstrap-icons.css">
<link rel="stylesheet" href="/components/expressionbuilder/expressionbuilder.css">
<style>body { margin: 16px; } #host { width: 900px; }</style>
</head><body>
<div id="host"></div>
<script>window.__ebt_debug_logging = false;</script>
<script src="/components/gesturerecognizer/gesturerecognizer.js"></script>
<script src="/components/expressionbuilder/expressionbuilder.js"></script>
</body></html>`;

const text = (phrase: string) => ({ kind: "text", phrase });
const title = (value: string) => ({ kind: "filter", key: "title", op: "Contains", value: { text: value } });

/** Opens a builder on `root`, and records each tree it reports in window.__changes. */
async function open(page: Page, root: unknown): Promise<void>
{
    await page.route(`**${PAGE}`, (route) => route.fulfill({ contentType: "text/html", body: HTML }));
    await page.goto(PAGE);
    await page.evaluate((root) =>
    {
        const win = window as unknown as Record<string, any>;
        win.__changes = [];
        win.__builder = win.createExpressionBuilder("host", {
            facets: [{ key: "title", label: "Title", valueType: "text" }],
            tree: { root },
            onChange: (tree: unknown) => win.__changes.push(tree),
        });
    }, root);
}

/**
 * Drags the handle of the item at `from` to the line of the item at `to`: its bottom half or its top half, at
 * `x` from the line's left edge, so the pointer can pick a bracket column.
 */
async function drag(page: Page, from: string, to: string, below: boolean, x = 600): Promise<void>
{
    const handle = page.locator(`[data-item="${from}"] > .expressionbuilder-drag`);
    const h = (await handle.boundingBox())!;
    const t = (await page.locator(`[data-item="${to}"]`).boundingBox())!;

    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2 + 12, { steps: 3 });
    await page.mouse.move(t.x + x, below ? t.y + t.height - 3 : t.y + 3, { steps: 6 });
    await page.mouse.up();
}

const phrases = (page: Page): Promise<string[]> => page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLInputElement>("[data-role=phrase]")).map((i) => i.value));

test("a drag by the handle moves the row, and the builder reports the new order", async ({ page }) =>
{
    await open(page, { kind: "and", children: [text("a"), text("b"), text("c")] });

    await drag(page, "0", "2", true);

    expect(await phrases(page)).toEqual(["b", "c", "a"]);
    const changes = await page.evaluate(() => (window as any).__changes);
    expect(changes).toHaveLength(1);
    expect(changes[0].root.children.map((c: { phrase: string }) => c.phrase)).toEqual(["b", "c", "a"]);
    await expect(page.locator(".expressionbuilder-dragging, .expressionbuilder-drop-after")).toHaveCount(0);
});

test("a row added at the end and dropped into a group joins it with Or", async ({ page }) =>
{
    await open(page, { kind: "and", children: [text("a"), { kind: "or", children: [text("b"), text("c")] }] });

    await page.locator(".expressionbuilder-footer [data-role=add-text]").click();
    await page.keyboard.type("d");
    await page.keyboard.press("Tab");
    expect(await phrases(page)).toEqual(["a", "b", "c", "d"]);

    // Right of the brackets, at the bottom of c: the end of the group.
    await drag(page, "2", "1.1", true);

    const tree = await page.evaluate(() => (window as any).__builder.getTree());
    expect(tree.root).toEqual({ kind: "and", children: [text("a"),
        { kind: "or", children: [text("b"), text("c"), text("d")] }] });
    await expect(page.locator('[data-item="1.2"] [data-role=join]')).toHaveValue("or");
});

test("a group cannot be dropped inside itself, and nothing moves", async ({ page }) =>
{
    await open(page, { kind: "and", children: [text("a"), { kind: "or", children: [text("b"), text("c")] }] });

    await drag(page, "1", "1.0", true);

    expect(await phrases(page)).toEqual(["a", "b", "c"]);
    expect(await page.evaluate(() => (window as any).__changes.length)).toBe(0);
});

test("the same query back from the bar keeps the focus and what the person is typing", async ({ page }) =>
{
    await open(page, { kind: "and", children: [title("budget"), text("plan")] });
    const input = page.locator('[data-item="0"] [data-role="value-0"]');

    await input.click();
    await page.keyboard.type(" 2026");
    await page.evaluate(() => (window as any).__builder.setParsed({ tree: { root: { kind: "and", children: [
        { kind: "filter", key: "title", op: "Contains", value: { text: "budget" }, span: { start: 0, end: 24 } },
        { kind: "text", phrase: "plan", span: { start: 29, end: 35 } }] } } }));

    await expect(input).toBeFocused();
    await expect(input).toHaveValue("budget 2026");
    await page.keyboard.type("!");
    await expect(input).toHaveValue("budget 2026!");
});

test.describe("on a touch screen", () =>
{
    test.use({ hasTouch: true });

    test("each target is 44px under a coarse pointer, and the handle takes the touch", async ({ page }) =>
    {
        // A group, and a dashed run inside it, so every kind of target is drawn.
        await open(page, { kind: "and", children: [text("a"), { kind: "or", children: [
            { kind: "and", children: [text("b"), text("c")] }, text("d")] }] });
        await page.locator('[data-item="0"] [data-role=more]').click();

        const sizes = await page.evaluate(() =>
        {
            const targets = [
                ".expressionbuilder-drag", ".expressionbuilder-check", "[data-role=join]", "[data-role=not]",
                "[data-role=remove]", "[data-role=more]", ".expressionbuilder-menu-item", "[data-role=group-op]",
                "[data-role=ungroup]", "[data-role=make-group]", ".expressionbuilder-footer button",
            ];
            return {
                coarse: matchMedia("(pointer: coarse)").matches,
                touchAction: getComputedStyle(document.querySelector(".expressionbuilder-drag")!).touchAction,
                small: targets.flatMap((sel) => Array.from(document.querySelectorAll<HTMLElement>(sel)).map((el) =>
                {
                    const r = el.getBoundingClientRect();
                    return { sel, w: Math.round(r.width), h: Math.round(r.height) };
                })).filter((s) => s.w < 44 || s.h < 44),
                counted: targets.map((sel) => document.querySelectorAll(sel).length),
            };
        });

        expect(sizes.coarse).toBe(true);
        expect(sizes.touchAction).toBe("none");
        expect(sizes.counted.every((n) => n > 0)).toBe(true);
        expect(sizes.small).toEqual([]);
    });
});
