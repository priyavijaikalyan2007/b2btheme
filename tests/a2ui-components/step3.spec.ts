/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the components readiness step 3 raised to surface (#21-#26, ADR-237),
 * under @a2ui/lit. Each sends its gestures with the payload under eventData,
 * and the data an agent rewrites updates in place.
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, dm, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";

useHarness();

const tagOf = (name: string) => `outcrop-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/** Mounts `name` with `props` and `data`, and waits for its handle. */
async function mount(page: Page, name: string, props: Record<string, unknown>, data: Record<string, unknown> = {}):
    Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: name, ...props }, data));
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(name));
}

/** Where the surface components write each event's payload. */
const EV = { eventData: { path: "/ev" } };

/** An action prop that sends `name` with the channel's payload as `p`. */
const act = (name: string, channel: string) => ({ event: { name, context: { p: { path: `/ev/${channel}` } } } });

/** The agent writes `value` at `path`. */
const write = (page: Page, path: string, value: unknown) =>
    send(page, [{ version: V, updateDataModel: { surfaceId: "s", path, value } }]);

/** Checks the agent received exactly `expected` (name and payload, in order) and nothing failed. */
async function sent(page: Page, expected: [string, unknown][]): Promise<void>
{
    await expect.poll(async () => (await actions(page)).map((a) => [a.name, (a.context as { p: unknown }).p]))
        .toEqual(expected);
    expect(await errors(page)).toEqual([]);
}

/** UserMenu's items, as an agent writes them. */
const MENU = [{ id: "profile", label: "Profile" }, { id: "sign-out", label: "Sign out", danger: true }];

/** MultiselectCombo's options, as an agent writes them. */
const FRUIT = [{ value: "apple", label: "Apple" }, { value: "banana", label: "Banana" },
    { value: "cherry", label: "Cherry" }];

/** A flat timeline, as an agent writes it. */
const EVENTS = { start: "2026-01-01T00:00:00.000Z", end: "2026-01-08T00:00:00.000Z", groups: [] };
const LAUNCH = { id: "launch", type: "point", start: "2026-01-02T00:00:00.000Z", label: "Launch" };
const SPRINT = { id: "sprint", type: "span", start: "2026-01-03T00:00:00.000Z", end: "2026-01-05T00:00:00.000Z",
    label: "Sprint" };

/** A small permission grid, as an agent writes it. */
const GRID = {
    roles: [{ id: "admin", name: "Admin" }, { id: "viewer", name: "Viewer" }],
    groups: [{ id: "docs", name: "Documents", permissions: [{ id: "read", name: "Read" }, { id: "write", name: "Write" }] }],
    cells: [{ roleId: "admin", permissionId: "read", state: "granted" }, { roleId: "admin", permissionId: "write",
        state: "granted" }, { roleId: "viewer", permissionId: "read", state: "granted" }],
};
const CELL = (role: string, perm: string) => `.permissionmatrix-cell[data-role-id='${role}'][data-perm-id='${perm}']`;

test.describe("Step 3 components under @a2ui/lit", () =>
{
    test("UserMenu: clicking an item sends onSelect, and Sign out sends onSignOut first", async ({ page }) =>
    {
        await mount(page, "UserMenu", { ...EV, userName: "Ada Lovelace", menuItems: { path: "/menu" },
            onSelect: act("item", "select"), onSignOut: act("bye", "signout") }, { menu: MENU });

        await page.locator(".usermenu-trigger").click();
        await page.locator("[data-item-id='profile']").click();
        await page.locator(".usermenu-trigger").click();
        await page.locator("[data-item-id='sign-out']").click();

        await sent(page, [["item", "profile"], ["bye", "Ada Lovelace"], ["item", "sign-out"]]);
    });

    test("UserMenu: the agent's rewrite of menuItems updates it in place", async ({ page }) =>
    {
        await mount(page, "UserMenu", { userName: "Ada Lovelace", menuItems: { path: "/menu" } }, { menu: MENU });
        const before = await page.locator(".usermenu").elementHandle();

        await write(page, "/menu", [{ id: "help", label: "Help" }]);
        await page.locator(".usermenu-trigger").click();

        await expect(page.locator("[data-item-id='help']")).toHaveCount(1);
        await expect(page.locator("[data-item-id='profile']")).toHaveCount(0);
        expect(await before!.evaluate((el) => el.isConnected)).toBe(true);
        expect(await errors(page)).toEqual([]);
    });

    test("MultiselectCombo: picking options writes the value and sends onChange", async ({ page }) =>
    {
        await mount(page, "MultiselectCombo", { items: { path: "/items" }, value: { path: "/v" },
            onChange: { event: { name: "picked" } } }, { items: FRUIT, v: [] });

        await page.locator(".multiselectcombo-input-area").click();
        await page.locator(".multiselectcombo-item", { hasText: "Banana" }).click();
        await page.locator(".multiselectcombo-item", { hasText: "Cherry" }).click();

        await expect.poll(() => dm(page, "s", "/v")).toEqual(["banana", "cherry"]);
        await expect.poll(async () => (await actions(page)).map((a) => a.name)).toEqual(["picked", "picked"]);
        expect(await errors(page)).toEqual([]);
    });

    test("MultiselectCombo: the agent's writes of value and items update it in place", async ({ page }) =>
    {
        await mount(page, "MultiselectCombo", { items: { path: "/items" }, value: { path: "/v" } },
            { items: FRUIT, v: ["apple"] });
        const before = await page.locator(".multiselectcombo").first().elementHandle();

        await write(page, "/v", ["apple", "cherry"]);
        await write(page, "/items", [...FRUIT, { value: "date", label: "Date" }]);
        await page.locator(".multiselectcombo-input-area").click();

        await expect(page.locator(".multiselectcombo-item")).toHaveCount(4);
        await expect(page.locator(".multiselectcombo-item[aria-selected='true']")).toHaveCount(2);
        expect(await before!.evaluate((el) => el.isConnected)).toBe(true);
        expect(await errors(page)).toEqual([]);
    });

    test("Timeline: clicking an event sends onSelect with it", async ({ page }) =>
    {
        await mount(page, "Timeline", { ...EV, ...EVENTS, items: { path: "/items" }, onSelect: act("pick", "select") },
            { items: [LAUNCH, SPRINT] });

        await page.locator("[data-item-id='sprint']").click();

        await sent(page, [["pick", SPRINT]]);
    });

    test("Timeline: the agent's rewrite of items updates it in place, keeping the selection", async ({ page }) =>
    {
        await mount(page, "Timeline", { ...EVENTS, items: { path: "/items" } }, { items: [LAUNCH] });
        await page.locator("[data-item-id='launch']").click();
        const before = await page.locator(".timeline").elementHandle();

        await write(page, "/items", [LAUNCH, SPRINT]);

        await expect(page.locator("[data-item-id='sprint']")).toHaveCount(1);
        await expect(page.locator("[data-item-id='launch']")).toHaveClass(/selected/);
        expect(await before!.evaluate((el) => el.isConnected)).toBe(true);
        expect(await errors(page)).toEqual([]);
    });

    test("Timeline: a span the agent writes without an end is rejected", async ({ page }) =>
    {
        await mount(page, "Timeline", { ...EVENTS, items: { path: "/items" } }, { items: [LAUNCH] });

        await write(page, "/items", [{ id: "open", type: "span", start: "2026-01-03T00:00:00.000Z", label: "Open" }]);

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED" })]);
        await expect(page.locator("[data-item-id='launch']")).toHaveCount(1);
    });

    test("PermissionMatrix: editing a cell sends onChange, and Reset sends onReset with the unsaved count",
        async ({ page }) =>
        {
            await mount(page, "PermissionMatrix", { ...EV, roles: { path: "/g/roles" }, groups: { path: "/g/groups" },
                cells: { path: "/g/cells" }, onChange: act("edit", "change"), onReset: act("discard", "reset") },
            { g: GRID });

            await page.locator(CELL("viewer", "write")).click();
            await page.locator(".permissionmatrix-reset-btn").click();

            await sent(page, [["edit", { roleId: "viewer", permissionId: "write", previousState: "none",
                newState: "granted" }], ["discard", 1]]);
        });

    test("PermissionMatrix: the agent's rewrite of cells is a new baseline, updated in place", async ({ page }) =>
    {
        await mount(page, "PermissionMatrix", { roles: { path: "/g/roles" }, groups: { path: "/g/groups" },
            cells: { path: "/g/cells" } }, { g: GRID });
        await page.locator(CELL("viewer", "write")).click();
        const before = await page.locator(".permissionmatrix").first().elementHandle();

        await write(page, "/g/cells", [...GRID.cells, { roleId: "viewer", permissionId: "write", state: "granted" }]);

        await expect(page.locator(".permissionmatrix-reset-btn")).toBeDisabled();
        await expect(page.locator(CELL("viewer", "write"))).toHaveClass(/permissionmatrix-cell-granted/);
        await expect(page.locator(CELL("viewer", "write"))).not.toHaveClass(/permissionmatrix-cell-changed/);
        expect(await before!.evaluate((el) => el.isConnected)).toBe(true);
        expect(await errors(page)).toEqual([]);
    });
});
