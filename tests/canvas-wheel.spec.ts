/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the wheel on GraphCanvas and SpineMap in a real browser (#181).
 * jsdom cannot show that a wheel the canvas takes leaves the page where
 * it was, so these do:
 *   - the wheel pans the view and does not scroll the page;
 *   - `Ctrl` with the wheel zooms the view one step and not the page.
 */

import { test, expect, type Page } from "@playwright/test";

const PAGE = "/__canvas-wheel.html";

/* The canvas is 400 by 300 at the top left, on a page tall enough to scroll. */
const HTML = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="/css/custom.css">
<link rel="stylesheet" href="/components/graphcanvas/graphcanvas.css">
<link rel="stylesheet" href="/components/spinemap/spinemap.css">
<style>body { margin: 0; height: 3000px; } #host { width: 400px; height: 300px; }</style>
</head><body>
<div id="host"></div>
<script>window.__ebt_debug_logging = false;</script>
<script src="/components/graphcanvas/graphcanvas.js"></script>
<script src="/components/spinemap/spinemap.js"></script>
</body></html>`;

type View = { tx: number; ty: number; scale: number };

/** Opens the page with one canvas, and returns a reader of its view. */
async function open(page: Page, which: "graph" | "spine"): Promise<() => Promise<View>>
{
    await page.route(`**${PAGE}`, (route) => route.fulfill({ contentType: "text/html", body: HTML }));
    await page.goto(PAGE);
    await page.evaluate((w) =>
    {
        const win = window as unknown as Record<string, any>;
        const container = document.getElementById("host")!;

        win.__canvas = (w === "graph")
            ? win.createGraphCanvas({ container,
                nodes: [{ id: "a", label: "A", type: "entity" }, { id: "b", label: "B", type: "entity" }],
                edges: [{ id: "e", sourceId: "a", targetId: "b", type: "has" }] })
            : win.createSpineMap({ container, data: { hubs: [{ id: "h", label: "Hub", status: "available",
                branches: [{ id: "b", label: "Branch", status: "planned" }] }] } });
    }, which);

    const selector = (which === "graph") ? ".gc-transform" : ".spinemap-transform";

    return () => page.evaluate((sel) =>
    {
        const t = document.querySelector(sel)!.getAttribute("transform")!;
        const [tx, ty, scale] = (t.match(/-?[\d.]+(e-?\d+)?/g) ?? []).map(Number);

        return { tx, ty, scale };
    }, selector);
}

for (const which of ["graph", "spine"] as const)
{
    test(`${which}: the wheel pans the view and not the page, and Ctrl with the wheel zooms it`, async ({ page }) =>
    {
        const view = await open(page, which);

        await page.mouse.move(200, 150);

        const start = await view();

        await page.mouse.wheel(0, 120);

        await expect.poll(view).toEqual({ tx: start.tx, ty: start.ty - 120, scale: start.scale });
        expect(await page.evaluate(() => window.scrollY)).toBe(0);

        await page.keyboard.down("Control");
        await page.mouse.wheel(0, -100);
        await page.keyboard.up("Control");

        await expect.poll(async () => (await view()).scale).toBeCloseTo(start.scale * 1.15, 6);
        expect(await page.evaluate(() => window.visualViewport!.scale)).toBe(1);
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
}
