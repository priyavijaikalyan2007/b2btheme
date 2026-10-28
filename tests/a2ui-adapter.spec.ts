/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the A2UI adapter under Google's own renderers, in a real browser.
 *
 * A host page imports the BUILT /a2ui/adapter/v1.js from the served dist
 * tree, renders with @a2ui/lit (and, once, @a2ui/react), and the adapter
 * lazy-loads the real dist IIFE components. jsdom cannot show this: custom
 * element upgrade order, the renderer's own context handling, and the
 * shipped component scripts only meet here (spec §10.3).
 */

import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import { buildHarness } from "./a2ui/build-harness";

const ORIGIN = "http://localhost:8000";
const CATALOG = "https://static.outcrop.us/a2ui/catalog/v1.json";
const V = "v0.9.1";
let harnessDir = "";

test.beforeAll(async () => { harnessDir = await buildHarness(); });

/** Opens a harness page served under /__a2ui/ next to the real dist tree. */
async function open(page: Page, renderer: "lit" | "react", query: Record<string, string> = {}): Promise<void>
{
    const qs = new URLSearchParams({ base: ORIGIN, ...query }).toString();
    const themeLink = query.inject === "1" ? "" : `<link rel="stylesheet" href="/css/custom.css">`;

    await page.route(`${ORIGIN}/__a2ui/**`, async (route) =>
    {
        const name = new URL(route.request().url()).pathname.split("/").pop()!;

        if (name.endsWith(".html"))
        {
            await route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head><meta charset="utf-8">`
                + `${themeLink}</head><body><script type="module" src="/__a2ui/${renderer}.js"></script></body></html>` });
            return;
        }

        await route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.join(harnessDir, name), "utf8") });
    });
    await page.goto(`${ORIGIN}/__a2ui/${renderer}.html?${qs}`);
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
}

function send(page: Page, messages: Record<string, unknown>[]): Promise<void>
{
    return page.evaluate((m) => (window as unknown as { send(x: unknown): void }).send(m), messages);
}

function surface(id: string, root: Record<string, unknown>, data: Record<string, unknown> = {}): Record<string, unknown>[]
{
    return [
        { version: V, createSurface: { surfaceId: id, catalogId: CATALOG } },
        { version: V, updateComponents: { surfaceId: id, components: [root] } },
        { version: V, updateDataModel: { surfaceId: id, path: "/", value: data } },
    ];
}

const errors = (page: Page) => page.evaluate(() => (window as unknown as { __errors: unknown[] }).__errors);
const actions = (page: Page) => page.evaluate(() => (window as unknown as { __actions: { name: string; context: unknown }[] }).__actions);
const dm = (page: Page, sid: string, p: string) => page.evaluate(([s, q]) =>
    (window as unknown as { dm(a: string, b: string): unknown }).dm(s, q), [sid, p]);

test.describe("A2UI adapter under @a2ui/lit", () =>
{
    test("display: Ruler renders from the agent's message", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "Ruler", orientation: "horizontal" }));

        await expect(page.locator("outcrop-ruler .outcrop-host .ruler").first()).toBeVisible();
        expect(await errors(page)).toEqual([]);
    });

    test("field: OrientationPicker follows its binding, and the user's choice is written back", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "OrientationPicker", value: { path: "/o" } }, { o: "portrait" }));
        await expect(page.locator("outcrop-orientation-picker .orientationpicker-trigger")).toBeVisible();

        await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/o", value: "landscape" } }]);
        await expect.poll(() => page.evaluate(() => (window as unknown as { handleOf(t: string): { getValue(): unknown } })
            .handleOf("outcrop-orientation-picker").getValue())).toBe("landscape");

        await page.locator("outcrop-orientation-picker .orientationpicker-trigger").click();
        await page.locator('.orientationpicker-panel [data-value="portrait"]').click();
        await expect.poll(() => dm(page, "s", "/o")).toBe("portrait");
        expect(await errors(page)).toEqual([]);
    });

    test("surface: StickyNote writes the typed text, then sends onChange; a create-time prop rebuilds", async ({ page }) =>
    {
        await open(page, "lit");
        const note = { id: "root", component: "StickyNote", value: { path: "/note" }, eventData: { path: "/ev" },
            onChange: { event: { name: "noteChanged", context: { text: { path: "/note" } } } } };
        await send(page, surface("s", note, { note: "start" }));
        const area = page.locator("outcrop-sticky-note textarea");
        await expect(area).toHaveValue("start");

        await area.fill("typed by the user");
        await expect.poll(() => dm(page, "s", "/note")).toBe("typed by the user");
        await expect.poll(async () => (await actions(page)).at(-1)).toMatchObject(
            { name: "noteChanged", context: { text: "typed by the user" } });

        await page.evaluate(() => { (window as unknown as Record<string, unknown>).__first =
            (window as unknown as { handleOf(t: string): unknown }).handleOf("outcrop-sticky-note"); });
        await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [{ ...note, readOnly: true }] } }]);
        await expect.poll(() => page.evaluate(() => (window as unknown as { handleOf(t: string): unknown; __first: unknown })
            .handleOf("outcrop-sticky-note") !== (window as unknown as { __first: unknown }).__first)).toBe(true);
        expect(await errors(page)).toEqual([]);
    });

    test("field: ToolColorPicker shows the agent's colours, and the user's pick is written back", async ({ page }) =>
    {
        // Today the pick writes the whole ToolColor ({hex, label}) and raises VALIDATION_FAILED at /c.
        test.fail(true, "#39: onChange passes a ToolColor, but value is its hex");
        await open(page, "lit");
        const colors = [{ hex: "#ff0000", label: "Red" }, { hex: "#0000ff", label: "Blue" }];
        await send(page, surface("s", { id: "root", component: "ToolColorPicker", tool: "marker", colors,
            value: { path: "/c" } }, { c: "#ff0000" }));
        const swatches = page.locator("outcrop-tool-color-picker .toolcolorpicker-swatch");
        await expect(swatches).toHaveCount(2);

        await page.locator('outcrop-tool-color-picker [data-hex="#0000ff"]').click();
        await expect.poll(() => dm(page, "s", "/c")).toBe("#0000ff");
        expect(await errors(page)).toEqual([]);
    });

    test("display: SkeletonLoader renders the table preset at the agent's size", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "SkeletonLoader", preset: "table", rows: 2, columns: 3 }));

        await expect(page.locator("outcrop-skeleton-loader .skeleton-loader-table")).toBeVisible();
        await expect(page.locator("outcrop-skeleton-loader .skeleton-cell")).toHaveCount(6);
        expect(await errors(page)).toEqual([]);
    });

    test("display: GraphLegend lists the agent's node and edge types", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "GraphLegend", title: "Kinds",
            nodeTypes: [{ typeKey: "svc", displayName: "Service", icon: "gear", color: "#2563eb" },
                { typeKey: "db", displayName: "Database", icon: "database", color: "#16a34a" }],
            edgeTypes: [{ relationshipKey: "uses", displayName: "uses", style: "dashed" }] }));

        await expect(page.locator("outcrop-graph-legend .graphlegend-node-item")).toHaveCount(2);
        await expect(page.locator("outcrop-graph-legend .graphlegend-edge-item")).toHaveCount(1);
        await expect(page.locator("outcrop-graph-legend")).toContainText("Database");
        expect(await errors(page)).toEqual([]);
    });

    test("events: ChatDock shows the agent's turns and sends what the user submits as onSubmit", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "ChatDock", eventData: { path: "/ev" },
            turns: [{ id: "t1", role: "assistant", text: "Hello from the agent" }],
            onSubmit: { event: { name: "asked", context: { text: { path: "/ev/submit" } } } } }));
        await expect(page.locator("outcrop-chat-dock .chatdock-turns")).toContainText("Hello from the agent");

        await page.locator("outcrop-chat-dock .chatdock-input").fill("what next?");
        await page.locator("outcrop-chat-dock .chatdock-send").click();
        await expect.poll(async () => (await actions(page)).at(-1)).toMatchObject(
            { name: "asked", context: { text: "what next?" } });
        expect(await dm(page, "s", "/ev/submit")).toBe("what next?");
        expect(await errors(page)).toEqual([]);
    });

    test("events: WorkspaceShell renders the agent's canvases and sends the selected one", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "WorkspaceShell", eventData: { path: "/ev" },
            canvases: [{ id: "a", title: "Plan" }, { id: "b", title: "Budget", pinned: true }], activeCanvasId: "a",
            onSelectCanvas: { event: { name: "opened", context: { canvas: { path: "/ev/selectCanvas/id" } } } } }));
        await expect(page.locator("outcrop-workspace-shell .workspaceshell-tab")).toHaveCount(2);

        await page.locator('outcrop-workspace-shell [data-canvas-id="b"] .workspaceshell-tab-title').click();
        await expect.poll(async () => (await actions(page)).at(-1)).toMatchObject(
            { name: "opened", context: { canvas: "b" } });
        await expect(page.locator('outcrop-workspace-shell [data-canvas-id="b"]')).toHaveAttribute("aria-selected", "true");
        expect(await errors(page)).toEqual([]);
    });

    test("injectBaseTheme loads custom.css exactly once", async ({ page }) =>
    {
        await open(page, "lit", { inject: "1" });
        await send(page, surface("s", { id: "root", component: "Ruler" }));
        await expect(page.locator("outcrop-ruler .outcrop-host .ruler").first()).toBeVisible();
        await expect(page.locator('head link[href$="/css/custom.css"]')).toHaveCount(1);
    });

    test("the default does not inject the base theme", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "Ruler" }));
        await expect(page.locator("outcrop-ruler .outcrop-host .ruler").first()).toBeVisible();
        await expect(page.locator(`head link[href="${ORIGIN}/css/custom.css"]`)).toHaveCount(0);
    });

    test("errors: a bound value that fails its schema is VALIDATION_FAILED with its path", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "StickyNote", collapsed: { path: "/c" } }, { c: "yes" }));

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED", path: "/c" })]);
    });

    test("errors: an assetBaseUrl that serves nothing is OUTCROP_ASSET_LOAD_FAILED", async ({ page }) =>
    {
        await open(page, "lit", { base: `${ORIGIN}/nothing-here` });
        await send(page, surface("s", { id: "root", component: "Ruler" }));

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "OUTCROP_ASSET_LOAD_FAILED" })]);
    });
});

test.describe("A2UI adapter under @a2ui/react", () =>
{
    test("field: OrientationPicker round-trips under React", async ({ page }) =>
    {
        await open(page, "react");
        await send(page, surface("s", { id: "root", component: "OrientationPicker", value: { path: "/o" } }, { o: "portrait" }));
        await expect(page.locator("outcrop-orientation-picker .orientationpicker-trigger")).toBeVisible();

        await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/o", value: "landscape" } }]);
        await expect.poll(() => page.evaluate(() => (window as unknown as { handleOf(t: string): { getValue(): unknown } })
            .handleOf("outcrop-orientation-picker").getValue())).toBe("landscape");

        await page.locator("outcrop-orientation-picker .orientationpicker-trigger").click();
        await page.locator('.orientationpicker-panel [data-value="portrait"]').click();
        await expect.poll(() => dm(page, "s", "/o")).toBe("portrait");
        expect(await errors(page)).toEqual([]);
    });
});
