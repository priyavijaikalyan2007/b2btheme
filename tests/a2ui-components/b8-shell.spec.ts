/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the B8 app-shell components under @a2ui/lit (readiness step 2 B8,
 * ADR-235). Each sends its gestures with the payload under eventData, and
 * links an agent writes are rejected (the link rule, ADR-229).
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";

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

/** Checks the agent received exactly `expected` (name and payload, in order) and nothing failed. */
async function sent(page: Page, expected: [string, unknown][]): Promise<void>
{
    await expect.poll(() => actions(page)).toEqual(expected.map(([name, p]) =>
        expect.objectContaining({ name, context: { p } })));
    expect(await errors(page)).toEqual([]);
}

/** Checks the agent's write of `path` was rejected and nothing mounted a link. */
async function rejected(page: Page, path: string): Promise<void>
{
    await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED", path })]);
    await expect(page.locator("a[href^='javascript']")).toHaveCount(0);
}

/** The agent answers a search at /answers/search. */
const answerSearch = (page: Page, value: unknown[]) =>
    send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/answers/search", value } }]);

/** TenantSwitcher's tenants and its search provider, bound. */
const TENANTS = { ...EV, tenants: [{ id: "t1", name: "Alpha Corp", role: "Admin" },
    { id: "t2", name: "Beta LLC", role: "Member" }], activeTenantId: "t1", showSearch: true,
onSearch: { event: { name: "find", context: { p: { path: "/ev/search" } } } }, searchResult: { path: "/answers/search" } };

test.describe("B8 app-shell components under @a2ui/lit", () =>
{
    test("MarketingHero: each call to action sends its event with its text", async ({ page }) =>
    {
        await mount(page, "MarketingHero", { ...EV, title: "Ship faster", primaryAction: { text: "Get started" },
            secondaryAction: { text: "Read the docs" }, onPrimary: act("start", "primary"),
            onSecondary: act("docs", "secondary") });

        await page.getByRole("button", { name: "Get started" }).click();
        await page.getByRole("button", { name: "Read the docs" }).click();

        await sent(page, [["start", "Get started"], ["docs", "Read the docs"]]);
    });

    test("MarketingHero: an action href from the agent is rejected (the link rule)", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "MarketingHero", title: "Ship faster",
            primaryAction: { path: "/action" } }, { action: { text: "Go", href: "javascript:alert(1)" } }));

        await rejected(page, "/action");
    });

    test("SiteFooter: a group link and a legal link each send linkClick with their text and group", async ({ page }) =>
    {
        await mount(page, "SiteFooter", { ...EV, organization: { name: "Outcrop Inc" },
            groups: [{ title: "Product", links: [{ text: "Overview" }, { text: "Pricing" }] }],
            legal: { copyright: "© 2026 Outcrop Inc", links: [{ text: "Privacy" }] },
            onLinkClick: act("link", "linkClick") });

        await page.getByRole("button", { name: "Pricing" }).click();
        await page.getByRole("button", { name: "Privacy" }).click();

        await sent(page, [["link", { text: "Pricing", group: "Product" }], ["link", { text: "Privacy", group: null }]]);
    });

    test("SiteFooter: a link href from the agent is rejected (the link rule)", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "SiteFooter", groups: { path: "/groups" } },
            { groups: [{ title: "Product", links: [{ text: "Go", href: "javascript:alert(1)" }] }] }));

        await rejected(page, "/groups");
    });

    test("TenantSwitcher: picking a tenant sends onSwitch, and Create sends the search text", async ({ page }) =>
    {
        await mount(page, "TenantSwitcher", { ...TENANTS, onSwitch: act("switch", "switch"),
            onCreate: act("create", "create") });

        await page.locator(".tenantswitcher-trigger").click();
        await page.getByRole("option", { name: /Beta LLC/ }).click();
        await page.locator(".tenantswitcher-trigger").click();
        await page.locator(".tenantswitcher-search-input").fill("Delta");
        await expect.poll(async () => (await actions(page)).length).toBe(2);
        await page.locator(".tenantswitcher-create").click();

        await sent(page, [["switch", { id: "t2", name: "Beta LLC", role: "Member" }], ["find", "Delta"],
            ["create", "Delta"]]);
    });

    test("TenantSwitcher: the agent answers a search, and picking a result sends onSwitch", async ({ page }) =>
    {
        await mount(page, "TenantSwitcher", { ...TENANTS, onSwitch: act("switch", "switch") });

        await page.locator(".tenantswitcher-trigger").click();
        await page.locator(".tenantswitcher-search-input").fill("gam");
        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "find",
            context: { p: "gam" } })]);
        await answerSearch(page, [{ id: "t9", name: "Gamma Inc", role: "Viewer" }]);
        await page.getByRole("option", { name: /Gamma Inc/ }).click();

        await sent(page, [["find", "gam"], ["switch", { id: "t9", name: "Gamma Inc", role: "Viewer" }]]);
    });
});
