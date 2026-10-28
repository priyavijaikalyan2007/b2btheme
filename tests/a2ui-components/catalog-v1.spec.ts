/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: catalog v1 components driven like a user, in a real browser
 *    (readiness spec §6.2). Each title starts with the catalog component name;
 *    scripts/agentui/gesture-coverage.test.ts requires one for every component
 *    with a two-way value or events. A value written back is checked against
 *    the catalog schema, not just for presence.
 */

import { expect, test } from "@playwright/test";

import { actions, dm, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";
import { expectCatalogValid } from "../a2ui/catalog-valid";

useHarness();

test.describe("catalog v1 under @a2ui/lit", () =>
{
    test("Ruler: renders from the agent's message", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "Ruler", orientation: "horizontal" }));

        await expect(page.locator("outcrop-ruler .outcrop-host .ruler").first()).toBeVisible();
        expect(await errors(page)).toEqual([]);
    });

    test("OrientationPicker: follows its binding, and the user's choice is written back", async ({ page }) =>
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
        await expectCatalogValid("OrientationPicker", "value", await dm(page, "s", "/o"));
        expect(await errors(page)).toEqual([]);
    });

    test("StickyNote: writes the typed text, then sends onChange; a create-time prop rebuilds", async ({ page }) =>
    {
        await open(page, "lit");
        const note = { id: "root", component: "StickyNote", value: { path: "/note" }, eventData: { path: "/ev" },
            onChange: { event: { name: "noteChanged", context: { text: { path: "/note" } } } } };
        await send(page, surface("s", note, { note: "start" }));
        const area = page.locator("outcrop-sticky-note textarea");
        await expect(area).toHaveValue("start");

        await area.fill("typed by the user");
        await expect.poll(() => dm(page, "s", "/note")).toBe("typed by the user");
        await expectCatalogValid("StickyNote", "value", await dm(page, "s", "/note"));
        await expect.poll(async () => (await actions(page)).at(-1)).toMatchObject(
            { name: "noteChanged", context: { text: "typed by the user" } });

        await page.evaluate(() => { (window as unknown as Record<string, unknown>).__first =
            (window as unknown as { handleOf(t: string): unknown }).handleOf("outcrop-sticky-note"); });
        await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [{ ...note, readOnly: true }] } }]);
        await expect.poll(() => page.evaluate(() => (window as unknown as { handleOf(t: string): unknown; __first: unknown })
            .handleOf("outcrop-sticky-note") !== (window as unknown as { __first: unknown }).__first)).toBe(true);
        expect(await errors(page)).toEqual([]);
    });

    test("ToolColorPicker: shows the agent's colours, and the user's pick is written back", async ({ page }) =>
    {
        await open(page, "lit");
        const colors = [{ hex: "#ff0000", label: "Red" }, { hex: "#0000ff", label: "Blue" }];
        await send(page, surface("s", { id: "root", component: "ToolColorPicker", tool: "marker", colors,
            value: { path: "/c" } }, { c: "#ff0000" }));
        const swatches = page.locator("outcrop-tool-color-picker .toolcolorpicker-swatch");
        await expect(swatches).toHaveCount(2);

        await page.locator('outcrop-tool-color-picker [data-hex="#0000ff"]').click();
        await expect.poll(() => dm(page, "s", "/c")).toBe("#0000ff");
        await expectCatalogValid("ToolColorPicker", "value", await dm(page, "s", "/c"));
        expect(await errors(page)).toEqual([]);
    });

    test("SkeletonLoader: renders the table preset at the agent's size", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "SkeletonLoader", preset: "table", rows: 2, columns: 3 }));

        await expect(page.locator("outcrop-skeleton-loader .skeleton-loader-table")).toBeVisible();
        await expect(page.locator("outcrop-skeleton-loader .skeleton-cell")).toHaveCount(6);
        expect(await errors(page)).toEqual([]);
    });

    test("GraphLegend: lists the agent's node and edge types", async ({ page }) =>
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

    test("ChatDock: shows the agent's turns and sends what the user submits as onSubmit", async ({ page }) =>
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

    test("WorkspaceShell: renders the agent's canvases and sends the selected one", async ({ page }) =>
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
});

test.describe("catalog v1 under @a2ui/react", () =>
{
    test("OrientationPicker: round-trips under React", async ({ page }) =>
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
        await expectCatalogValid("OrientationPicker", "value", await dm(page, "s", "/o"));
        expect(await errors(page)).toEqual([]);
    });
});
