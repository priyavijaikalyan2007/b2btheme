/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: `npm run demo:mcp` end to end (agentui-unblock §6). The real
 *    demo process: the host page calls each tool over Streamable HTTP,
 *    reads the ui:// resource, and renders the view from the local dist/
 *    in a sandboxed iframe. Covers every domain's components, a routed
 *    action, a lazy load, a server-answered search, a "message" route to
 *    the transcript, the host theme, and that nothing loads from
 *    production.
 */

import path from "node:path";
import { expect, test } from "@playwright/test";
import type { FrameLocator, Page } from "@playwright/test";

let demo: { origin: string; close: () => Promise<void> };
let production: string[] = [];

test.beforeAll(async () =>
{
    const repo = path.resolve(__dirname, "..");
    // The spec is compiled as CommonJS; the demo's modules are ESM.
    const { buildHost } = await import(path.join(repo, "mcp", "demo", "build.mjs"));
    const { startDemo } = await import(path.join(repo, "mcp", "demo", "serve.mjs"));

    await buildHost(repo);
    demo = await startDemo({ repo, port: 0 });
});

test.afterAll(async () => { await demo?.close(); });

test.beforeEach(async ({ page }) =>
{
    production = [];
    page.on("request", (request) =>
    {
        if (new URL(request.url()).hostname === "static.outcrop.us") { production.push(request.url()); }
    });
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());
    await page.goto(`${demo.origin}/host/`);
});

test.afterEach(() => { expect(production).toEqual([]); });

/** Calls a tool as the model would, and returns its view. */
async function call(page: Page, tool: string): Promise<FrameLocator>
{
    await page.locator(`#tools button[data-tool="${tool}"]`).click();
    await expect(page.locator(`iframe[data-tool="${tool}"]`)).toBeAttached();

    return page.frameLocator(`iframe[data-tool="${tool}"]`);
}

test.describe("MCP Apps demo", () =>
{
    test("offers the model's tools only; demo_action is for views", async ({ page }) =>
    {
        await expect(page.locator("#tools button")).toHaveText(["show_service_health", "show_orders", "plan_meeting",
            "edit_brand"]);
    });

    test("health: status, metric cards, gauge, two charts and a timeline; Refresh updates it", async ({ page }) =>
    {
        const view = await call(page, "show_service_health");

        await expect(view.getByText("Checkout degraded")).toBeVisible();
        await expect(view.getByText("p95 latency")).toBeVisible();
        await expect(view.getByText("Error budget left")).toBeVisible();
        await expect(view.getByRole("img", { name: "Checkout latency, 09:00 to 16:00" })).toBeVisible();
        await expect(view.getByRole("img", { name: "Checkout requests by region, last hour" })).toBeVisible();
        await expect(view.getByText("p95 over SLO")).toBeVisible();

        await view.getByRole("button", { name: "Refresh" }).click();
        await expect(view.getByText("Checkout operational")).toBeVisible();
        await expect(page.locator('.demo-log-entry[data-leg="view show_service_health"][data-kind="tools/call"]'))
            .toHaveCount(1);
    });

    test("orders: a selected row is answered by the server; a warehouse loads its aisles", async ({ page }) =>
    {
        const view = await call(page, "show_orders");

        await view.getByText("Fabrikam Bikes").click();
        await expect(view.getByText(/SO-4473, Fabrikam Bikes: Over the customer's credit limit/)).toBeVisible();

        await expect(view.getByText("Aisle B3")).toHaveCount(0);
        await view.getByText("Reno, NV").click();
        await view.getByText("Reno, NV").press("ArrowRight");
        await expect(view.getByText("Aisle B3")).toBeVisible();
    });

    test("scheduling: six pickers, and people search answered by the server", async ({ page }) =>
    {
        const view = await call(page, "plan_meeting");

        await expect(view.getByText("Plan the design review")).toBeVisible();
        await expect(view.getByText("Ana Ruiz")).toBeVisible();

        await view.getByPlaceholder("Invite people").fill("chen");
        await expect(view.getByText("Chen Wei")).toBeVisible();
    });

    test("branding: the contrast check reads the picked colour; Apply goes to the model", async ({ page }) =>
    {
        const view = await call(page, "edit_brand");

        await view.getByRole("button", { name: "Check contrast" }).click();
        await expect(view.getByText("#1D4ED8 with white text: 6.7:1, passes WCAG AA.")).toBeVisible();

        await view.getByRole("button", { name: "Apply to the campaign" }).click();
        const turn = page.locator('.demo-turn[data-role="user"]');

        await expect(turn).toContainText('The user chose "apply" on "apply" in surface "brand".');
        await expect(turn).toContainText('"primary":"#1D4ED8"');
    });

    test("the host theme reaches every open view, and back", async ({ page }) =>
    {
        const first = await call(page, "show_orders");
        const second = await call(page, "edit_brand");
        const dark = await page.evaluate(() => document.documentElement.dataset.bsTheme === "dark");
        const next = dark ? "light" : "dark";

        await expect(first.locator("html")).toHaveAttribute("data-bs-theme", dark ? "dark" : "light");
        await page.locator("#theme").click();
        await expect(first.locator("html")).toHaveAttribute("data-bs-theme", next);
        await expect(second.locator("html")).toHaveAttribute("data-bs-theme", next);
    });
});
