/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * Recording run for the MCP Apps demo (agentui-unblock §7, PR 4). Starts
 * `npm run demo:mcp`'s process, walks the four domains at 1920×1080 with
 * a caption for each step and the JSON-RPC log in view, and saves
 * mcp/demo/.out/videos/mcp-apps.webm for encode.mjs. Every step waits for
 * what it shows, so a recording is only made of a demo that works.
 *
 * On macOS, run it under `caffeinate -i` when the terminal is in the
 * background: App Nap otherwise delays the runner's timers by tens of
 * seconds, and every delay is a frozen stretch of video.
 */

import path from "node:path";
import { expect, test } from "@playwright/test";
import type { FrameLocator, Page } from "@playwright/test";

const REPO = path.resolve(__dirname, "..", "..", "..");
const VIDEOS = path.join(REPO, "mcp", "demo", ".out", "videos");
const SIZE = { width: 1920, height: 1080 };
/** A caption stays up long enough to read: about 18 characters a second, and never under 2.5 s. */
const READ_MS_PER_CHAR = 55;
const MIN_CAPTION_MS = 2500;
const started = Date.now();

/** A caption bar over the bottom of the page. Added by the recorder only; the demo has none. */
async function caption(page: Page, text: string): Promise<void>
{
    await page.evaluate((t) =>
    {
        let bar = document.getElementById("recording-caption");

        if (!bar)
        {
            bar = document.createElement("div");
            bar.id = "recording-caption";
            bar.setAttribute("style", "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9999;"
                + "pointer-events:none;"
                + "max-width:1400px;padding:14px 28px;border-radius:10px;font:500 26px/1.35 Inter,system-ui,sans-serif;"
                + "text-align:center;background:rgba(15,23,42,0.88);color:#f8fafc;"
                + "box-shadow:0 8px 24px rgba(0,0,0,.25)");
            document.body.append(bar);
        }

        bar.textContent = t;
    }, text);
    console.log(`[record] ${((Date.now() - started) / 1000).toFixed(1)} s: ${text.slice(0, 50)}`);
    await page.waitForTimeout(Math.max(MIN_CAPTION_MS, text.length * READ_MS_PER_CHAR));
}

/** Calls a tool as the model would, and brings its view to the top of the conversation. */
async function call(page: Page, tool: string): Promise<FrameLocator>
{
    await page.locator(`#tools button[data-tool="${tool}"]`).click();

    const frame = page.locator(`iframe[data-tool="${tool}"]`);
    const view = page.frameLocator(`iframe[data-tool="${tool}"]`);

    await expect(view.locator("#outcrop-mcp .outcrop-mcp-surface").first()).toBeVisible();
    await page.waitForTimeout(600);
    await frame.evaluate((el) => el.closest(".demo-turn")?.scrollIntoView({ block: "start", behavior: "smooth" }));
    await page.waitForTimeout(800);

    return view;
}

/** Opens the newest log entry of a kind, so its JSON shows. */
async function openLog(page: Page, kind: string): Promise<void>
{
    const entry = page.locator(`.demo-log-entry[data-kind="${kind}"]`).last();

    await entry.locator("summary").click();
    await entry.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "smooth" }));
}

test("record the MCP Apps demo", async ({ browser }) =>
{
    // The spec is compiled as CommonJS; the demo's modules are ESM.
    const { buildHost } = await import(path.join(REPO, "mcp", "demo", "build.mjs"));
    const { startDemo } = await import(path.join(REPO, "mcp", "demo", "serve.mjs"));

    await buildHost(REPO);
    const demo = await startDemo({ repo: REPO, port: 0 });
    const context = await browser.newContext({ viewport: SIZE, colorScheme: "light",
        recordVideo: { dir: VIDEOS, size: SIZE } });
    const page = await context.newPage();

    try
    {
        await page.goto(`${demo.origin}/host/`);
        await expect(page.locator("#tools button")).toHaveCount(4);
        await caption(page, "An MCP Apps host on the left, a demo MCP server behind it, "
            + "every JSON-RPC message on the right. "
            + "Each button stands in for the model calling a tool.");

        // Service health: charts.
        const health = await call(page, "show_service_health");
        await caption(page, "show_service_health returns A2UI messages. "
            + "The host renders our view in a sandboxed iframe: "
            + "status, metric cards, a gauge, two charts and a timeline.");
        await health.getByRole("button", { name: "Refresh" }).click();
        await expect(health.getByText("Checkout operational")).toBeVisible();
        await openLog(page, "tools/call");
        await caption(page, "Refresh is routed to the server's app-only demo_action tool; "
            + "its answer updates the view.");

        // Orders: data grids.
        const orders = await call(page, "show_orders");
        await caption(page, "show_orders: a DataGrid and a TreeGrid.");
        await orders.getByText("Fabrikam Bikes").click();
        await expect(orders.getByText(/SO-4473, Fabrikam Bikes/)).toBeVisible();
        await caption(page, "Selecting a row asks the server for the order's detail.");
        await orders.getByText("Reno, NV").click();
        await orders.getByText("Reno, NV").press("ArrowRight");
        await expect(orders.getByText("Aisle B3")).toBeVisible();
        await caption(page, "Expanding a warehouse loads its aisles from the server.");

        // Meeting: pickers.
        const meeting = await call(page, "plan_meeting");
        await caption(page, "plan_meeting: date, time, time zone, duration, recurrence and people pickers, "
            + "all bound to one data model.");
        await meeting.getByPlaceholder("Invite people").pressSequentially("chen", { delay: 160 });
        await expect(meeting.getByText("Chen Wei")).toBeVisible();
        await caption(page, "People search is answered by the server.");
        await meeting.getByText("Chen Wei").click();
        await meeting.getByRole("button", { name: "Book it" }).click();
        await expect(page.locator('.demo-turn[data-role="user"]').last()).toContainText('"book"');
        await page.locator('.demo-turn[data-role="user"]').last()
            .evaluate((el) => el.scrollIntoView({ block: "center", behavior: "smooth" }));
        await caption(page, "Book goes to the model instead: the view sends every picked value as a user turn.");

        // Brand: design pickers.
        const brand = await call(page, "edit_brand");
        await caption(page, "edit_brand: colour, gradient and font pickers.");
        await brand.getByRole("button", { name: "Check contrast" }).click();
        await expect(brand.getByText(/passes WCAG AA/)).toBeVisible();
        await caption(page, "The server reads the picked colour back and checks its contrast.");

        // Theme.
        await page.locator("#theme").click();
        await expect(brand.locator("html")).toHaveAttribute("data-bs-theme", "dark");
        await caption(page, "The host's theme reaches every open view.");
        await page.locator(`iframe[data-tool="show_service_health"]`)
            .evaluate((el) => el.closest(".demo-turn")?.scrollIntoView({ block: "start", behavior: "smooth" }));
        await caption(page, "One renderer page, every component in the catalog, any MCP Apps host. npm run demo:mcp");
    }
    finally
    {
        const video = page.video();

        await context.close();
        await video?.saveAs(path.join(VIDEOS, "mcp-apps.webm"));
        await video?.delete();
        await demo.close();
    }
});
