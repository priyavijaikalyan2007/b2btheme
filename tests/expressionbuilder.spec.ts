/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: ExpressionBuilder in a real browser (#207).
 * jsdom has no layout and no pointer capture, so these show:
 *   - a drag by a row's grip moves the row, through GestureRecognizer, and reports the tree;
 *   - a group cannot be dropped inside itself;
 *   - the same query back from the bar keeps the focus and the half-typed value;
 *   - the grip starts a drag at once on touch (touch-action: none).
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

/** Drags the grip of the row at `from` to the vertical middle of `to`, `below` it or above it. */
async function drag(page: Page, from: string, to: string, below: boolean): Promise<void>
{
    const grip = page.locator(`[data-path="${from}"] > .expressionbuilder-drag, `
        + `[data-path="${from}"] > .expressionbuilder-group-head > .expressionbuilder-drag`).first();
    const g = (await grip.boundingBox())!;
    const t = (await page.locator(`[data-path="${to}"]`).boundingBox())!;

    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + 12, { steps: 3 });
    await page.mouse.move(t.x + 200, below ? t.y + t.height - 3 : t.y + 3, { steps: 6 });
    await page.mouse.up();
}

const phrases = (page: Page): Promise<string[]> => page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLInputElement>("[data-role=phrase]")).map((i) => i.value));

test("a drag by the grip moves the row, and the builder reports the new order", async ({ page }) =>
{
    await open(page, { kind: "and", children: [text("a"), text("b"), text("c")] });

    await drag(page, "0", "2", true);

    expect(await phrases(page)).toEqual(["b", "c", "a"]);
    const changes = await page.evaluate(() => (window as any).__changes);
    expect(changes).toHaveLength(1);
    expect(changes[0].root.children.map((c: { phrase: string }) => c.phrase)).toEqual(["b", "c", "a"]);
    await expect(page.locator(".expressionbuilder-dragging, .expressionbuilder-drop-after")).toHaveCount(0);
});

test("a drag puts a row into another group, and refuses a group inside itself", async ({ page }) =>
{
    await open(page, { kind: "and", children: [text("a"), { kind: "or", children: [text("b"), text("c")] }] });

    await drag(page, "0", "1.0", false);
    expect(await phrases(page)).toEqual(["a", "b", "c"]);
    // "a" left the root, so the group is row 0, and "a" is its first row.
    expect(await page.locator('[data-path="0.0"] [data-role=phrase]').inputValue()).toBe("a");

    // The group is now row 0. Dropping it on its own row "b" is refused, and nothing moves.
    await drag(page, "0", "0.1", true);
    expect(await phrases(page)).toEqual(["a", "b", "c"]);
    expect(await page.evaluate(() => (window as any).__changes.length)).toBe(1);
});

test("the same query back from the bar keeps the focus and what the person is typing", async ({ page }) =>
{
    await open(page, { kind: "and", children: [title("budget"), text("plan")] });
    const input = page.locator('[data-path="0"] [data-role="value-0"]');

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

test("the grip takes the touch itself, so a drag starts at once", async ({ page }) =>
{
    await open(page, { kind: "and", children: [text("a"), text("b")] });

    expect(await page.locator(".expressionbuilder-drag").first().evaluate((el) => getComputedStyle(el).touchAction))
        .toBe("none");
});

test("a drag moves a row into a search inside, and never between a link and the rest", async ({ page }) =>
{
    await page.route(`**${PAGE}`, (route) => route.fulfill({ contentType: "text/html", body: HTML }));
    await page.goto(PAGE);
    await page.evaluate(() =>
    {
        const win = window as unknown as Record<string, any>;
        const f = (key: string, value: unknown) => ({ kind: "filter", key, op: "Equals", value });
        win.__changes = [];
        win.__builder = win.createExpressionBuilder("host", {
            facets: [
                { key: "title", label: "Title", valueType: "text" },
                { key: "rel.signed_off_by", label: "Signed off by", valueType: "text", relationship: true,
                  link: [{ key: "provenance", label: "Provenance", valueType: "text" }] },
            ],
            tree: { root: { kind: "and", children: [
                f("title", { text: "budget" }),
                { kind: "nested", key: "rel.signed_off_by", link: f("provenance", { text: "manual" }),
                  where: f("title", { text: "plan" }) },
            ] } },
            onChange: (tree: unknown) => win.__changes.push(tree),
        });
    });

    // The title row goes into the search inside, below its row.
    await drag(page, "0", "1.where.0", true);
    const tree = await page.evaluate(() => (window as any).__builder.getTree());
    expect(tree.root.where).toEqual({ kind: "and", children: [
        { kind: "filter", key: "title", op: "Equals", value: { text: "plan" } },
        { kind: "filter", key: "title", op: "Equals", value: { text: "budget" } }] });

    // The link's row does not leave the link, and a row of the item's keys does not enter it.
    await drag(page, "0.link.0", "0.where.0", true);
    await drag(page, "0.where.0", "0.link.0", true);
    expect(await page.evaluate(() => (window as any).__changes.length)).toBe(1);
});
