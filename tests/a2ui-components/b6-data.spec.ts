/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the nine B6 data views under @a2ui/lit (readiness step 2 B6, ADR-232).
 * Each event reaches the agent with its payload under eventData; TreeGrid's
 * lazy children are asked of the agent and answered through
 * loadChildrenResult; VisualTableEditor writes the edited table back;
 * ChartPanel draws with the Chart.js the adapter loads; LogConsole shows the
 * agent's entries.
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, dm, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";

useHarness();

const tagOf = (name: string) => `outcrop-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/** Where the surface components write each event's payload. */
const EV = { eventData: { path: "/ev" } };

/** An action prop that sends `name` with the channel's payload as `p`. */
const act = (name: string, channel: string) => ({ event: { name, context: { p: { path: `/ev/${channel}` } } } });

/** Mounts `name` with `props` and `data`, and waits for its handle. */
async function mount(page: Page, name: string, props: Record<string, unknown>, data: Record<string, unknown> = {}):
    Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: name, ...props }, data));
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(name));
}

/** Checks the agent received exactly `expected` (name and payload, in order) and nothing failed. */
async function sent(page: Page, expected: [string, unknown][]): Promise<void>
{
    await expect.poll(() => actions(page)).toEqual(expected.map(([name, p]) =>
        expect.objectContaining({ name, context: { p } })));
    expect(await errors(page)).toEqual([]);
}

const ROWS = [{ id: "r1", data: { name: "Alpha" } }, { id: "r2", data: { name: "Beta" } }];

test.describe("B6 data views under @a2ui/lit", () =>
{
    test("DataGrid: editing a cell sends onCellEdit with the row, column and values", async ({ page }) =>
    {
        await mount(page, "DataGrid", { ...EV, columns: [{ id: "name", label: "Name", editable: true }], rows: ROWS,
            onCellEdit: act("edit", "cellEdit") });

        await page.locator('.datagrid-row .datagrid-cell[data-col-id="name"]').first().dblclick();
        await page.locator(".datagrid-editor").fill("Gamma");
        await page.locator(".datagrid-editor").press("Enter");

        await sent(page, [["edit", { rowId: "r1", columnId: "name", oldValue: "Alpha", newValue: "Gamma" }]]);
    });

    test("TreeGrid: expanding a lazy row asks the agent for children; the answer renders", async ({ page }) =>
    {
        await mount(page, "TreeGrid", { ...EV, label: "Files", columns: [{ id: "size", label: "Size" }],
            nodes: [{ id: "docs", label: "Docs", lazy: true, children: null }],
            onLoadChildren: { event: { name: "children", context: { node: { path: "/ev/loadChildren/id" } } } },
            loadChildrenResult: { path: "/answers/children" } });

        await page.locator('.treegrid-row[data-node-id="docs"] .treegrid-toggle').click();
        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "children",
            context: { node: "docs" } })]);

        await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/answers/children",
            value: [{ id: "readme", label: "README.md", data: { size: "2 KB" } }] } }]);
        await expect(page.locator('.treegrid-row[data-node-id="readme"]')).toContainText("README.md");
        expect(await errors(page)).toEqual([]);
    });

    test("TreeGrid: double-clicking a row sends onActivate with its summary", async ({ page }) =>
    {
        await mount(page, "TreeGrid", { ...EV, label: "Files", columns: [{ id: "size", label: "Size" }],
            nodes: [{ id: "a", label: "Alpha", data: { size: "1 KB" } }], onActivate: act("open", "activate") });

        await page.locator('.treegrid-row[data-node-id="a"] .treegrid-cell').first().dblclick();

        await expect.poll(async () => (await actions(page)).find((a: { name: string }) => a.name === "open"))
            .toEqual(expect.objectContaining({ context: { p: expect.objectContaining({ id: "a", label: "Alpha" }) } }));
        expect(await errors(page)).toEqual([]);
    });

    test("ActivityFeed: clicking an event sends onEventClick with it", async ({ page }) =>
    {
        await mount(page, "ActivityFeed", { ...EV, onEventClick: act("event", "eventClick"), events: [{ id: "e1",
            actor: { id: "u1", name: "Ada" }, action: "commented", timestamp: "2026-10-29T10:00:00.000Z" }] });

        await page.locator(".activityfeed-event").first().click();

        await sent(page, [["event", expect.objectContaining({ id: "e1", action: "commented" })]]);
    });

    test("AuditLogViewer: clicking a row sends onRowClick with the entry", async ({ page }) =>
    {
        await mount(page, "AuditLogViewer", { ...EV, onRowClick: act("row", "rowClick"), entries: [{ id: "a1",
            timestamp: "2026-10-29T10:00:00.000Z", actor: "ada", action: "update", resource: "invoice/42" }] });

        await page.locator(".auditlog-row").first().click();

        await sent(page, [["row", expect.objectContaining({ id: "a1", resource: "invoice/42" })]]);
    });

    test("NotificationCenter: opening a notification and dismissing another send their events", async ({ page }) =>
    {
        await mount(page, "NotificationCenter", { ...EV, onNotificationClick: act("open", "notificationClick"),
            onDismiss: act("gone", "dismiss"), notifications: [
                { id: "n1", title: "Build failed", timestamp: "2026-10-29T10:00:00.000Z" },
                { id: "n2", title: "Review requested", timestamp: "2026-10-29T10:05:00.000Z" }] });

        await page.getByRole("button", { name: "Notifications" }).click();
        await page.locator(".notificationcenter-item", { hasText: "Build failed" })
            .locator(".notificationcenter-item-content").click();
        await page.locator(".notificationcenter-item", { hasText: "Review requested" })
            .locator(".notificationcenter-item-dismiss").click();

        await sent(page, [["open", expect.objectContaining({ id: "n1", title: "Build failed" })], ["gone", "n2"]]);
    });

    test("FacetSearch: typing and pressing Enter sends onSearch with the parsed query", async ({ page }) =>
    {
        await mount(page, "FacetSearch", { ...EV, onSearch: act("search", "search"),
            facets: [{ key: "status", label: "Status", valueType: "enum", values: ["open", "closed"] }] });

        await page.locator(".facetsearch-input").fill("quarterly");
        await page.locator(".facetsearch-input").press("Enter");

        await sent(page, [["search", expect.objectContaining({ text: expect.stringContaining("quarterly") })]]);
    });

    test("VisualTableEditor: editing a cell writes the table back", async ({ page }) =>
    {
        const table = { columns: [{ id: "c1" }], rows: [{ id: "r1", cells: { c1: { value: "old" } } }] };
        await mount(page, "VisualTableEditor", { value: { path: "/v" } }, { v: table });

        await page.locator("td").filter({ hasText: "old" }).dblclick();
        await page.keyboard.press("ControlOrMeta+A");
        await page.keyboard.type("new");
        await page.keyboard.press("Enter");

        await expect.poll(async () => JSON.stringify(await dm(page, "s", "/v"))).toContain("new");
        expect(await errors(page)).toEqual([]);
    });

    test("ChartPanel: draws with the Chart.js the adapter loads", async ({ page }) =>
    {
        await mount(page, "ChartPanel", { kind: "bar", ariaLabel: "Sales", categories: ["Q1", "Q2"],
            series: [{ id: "s", label: "Sales", data: [3, 5] }] });

        await expect(page.locator(`${tagOf("ChartPanel")} canvas`)).toBeVisible();
        await expect(page.locator('head script[src$="/lib/chart.js-4.5.1.js"]')).toHaveAttribute("integrity", /^sha384-/);
        expect(await errors(page)).toEqual([]);
    });

    test("LogConsole: shows the entries the agent supplies", async ({ page }) =>
    {
        await mount(page, "LogConsole", { entries: [{ timestamp: "10:00:00.000", level: "INFO", message: "Build started" },
            { timestamp: "10:00:02.000", level: "ERROR", message: "Build failed" }] });

        await expect(page.locator(".logconsole-entry")).toHaveCount(2);
        await expect(page.locator(".logconsole-entry").nth(1)).toContainText("Build failed");
        expect(await errors(page)).toEqual([]);
    });
});
