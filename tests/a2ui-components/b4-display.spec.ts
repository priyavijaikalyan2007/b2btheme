/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the ten B4 display components under @a2ui/lit (readiness step 2 B4,
 * ADR-229). The seven surface ones send their clicks with the payload under
 * eventData; Gauge's value is one-way; PresenceIndicator and
 * ReasoningAccordion render and send nothing. Breadcrumb's items schema
 * leaves href out (the link rule), so an agent's link is rejected.
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

test.describe("B4 display components under @a2ui/lit", () =>
{
    test("StatusBadge: clicking a clickable badge sends onClick with its label", async ({ page }) =>
    {
        await mount(page, "StatusBadge", { ...EV, label: "Degraded", status: "degraded", clickable: true,
            onClick: act("badge", "click") });

        await page.getByText("Degraded").click();

        await sent(page, [["badge", "Degraded"]]);
    });

    test("MetricCard: clicking a clickable card sends onClick with its label", async ({ page }) =>
    {
        await mount(page, "MetricCard", { ...EV, label: "Revenue", value: "$1.2M", clickable: true,
            onClick: act("card", "click") });

        await page.getByRole("button", { name: /Revenue/ }).click();

        await sent(page, [["card", "Revenue"]]);
    });

    test("Pill: clicking sends onClick; dismissing sends onDismiss, each with the label", async ({ page }) =>
    {
        await mount(page, "Pill", { ...EV, label: "Urgent", clickable: true, dismissible: true,
            onClick: act("pill", "click"), onDismiss: act("gone", "dismiss") });

        await page.getByText("Urgent").click();
        await page.locator(".pill-dismiss").click();

        await sent(page, [["pill", "Urgent"], ["gone", "Urgent"]]);
    });

    test("EmptyState: each button sends its action with its label", async ({ page }) =>
    {
        await mount(page, "EmptyState", { ...EV, heading: "No projects yet", actionLabel: "Create project",
            secondaryLabel: "Learn more", onAction: act("create", "action"), onSecondary: act("learn", "secondary") });

        await page.getByRole("button", { name: "Create project" }).click();
        await page.getByRole("button", { name: "Learn more" }).click();

        await sent(page, [["create", "Create project"], ["learn", "Learn more"]]);
    });

    test("Breadcrumb: clicking a segment sends onItemClick; a terminal action sends onActionClick", async ({ page }) =>
    {
        await mount(page, "Breadcrumb", { ...EV, items: [{ label: "Home" }, { label: "Reports" }],
            actions: [{ id: "share", label: "Share" }],
            onItemClick: act("crumb", "itemClick"), onActionClick: act("share", "actionClick") });

        await page.getByText("Home").click();
        await page.locator(".breadcrumb-nav-actions-caret").click();
        await page.getByRole("menuitem", { name: "Share" }).click();

        await sent(page, [["crumb", { item: { label: "Home" }, index: 0 }],
            ["share", { actionId: "share", item: { label: "Reports" } }]]);
    });

    test("Breadcrumb: an item href from the agent is rejected (the link rule)", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "Breadcrumb", items: { path: "/items" } },
            { items: [{ label: "Home", href: "javascript:alert(1)" }] }));

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED",
            path: "/items" })]);
        await expect(page.locator("a[href^='javascript:']")).toHaveCount(0);
    });

    test("PersonChip: clicking a clickable chip sends onClick with the name and email", async ({ page }) =>
    {
        await mount(page, "PersonChip", { ...EV, name: "Alice Johnson", email: "alice@example.com", clickable: true,
            onClick: act("person", "click") });

        await page.getByText("Alice Johnson").click();

        await sent(page, [["person", { name: "Alice Johnson", email: "alice@example.com" }]]);
    });

    test("ThemeToggle: choosing dark sends onChange with the theme and mode", async ({ page }) =>
    {
        await mount(page, "ThemeToggle", { ...EV, defaultTheme: "light", onChange: act("theme", "change") });

        await page.getByRole("button", { name: "Dark theme" }).click();

        await sent(page, [["theme", { theme: "dark", mode: "dark" }]]);
        await expect(page.locator("html")).toHaveAttribute("data-bs-theme", "dark");
    });

    test("Gauge: the agent's value is shown and never written back", async ({ page }) =>
    {
        await mount(page, "Gauge", { shape: "ring", value: { path: "/v" }, max: 100 }, { v: 40 });

        await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/v", value: 70 } }]);

        await expect.poll(() => page.evaluate((t) =>
            (window as unknown as { handleOf(x: string): { getValue(): number } }).handleOf(t).getValue(),
        tagOf("Gauge"))).toBe(70);
        expect(await actions(page)).toEqual([]);
        expect(await errors(page)).toEqual([]);
    });

    test("PresenceIndicator: renders the people and sends nothing", async ({ page }) =>
    {
        await mount(page, "PresenceIndicator", { people: [{ id: "1", name: "Alice Johnson" },
            { id: "2", name: "Bob Smith", status: "online" }] });

        await expect(page.locator(`${tagOf("PresenceIndicator")} .presence-indicator`)).toBeVisible();
        expect(await actions(page)).toEqual([]);
        expect(await errors(page)).toEqual([]);
    });

    test("ReasoningAccordion: renders its steps; a step click expands it and sends nothing", async ({ page }) =>
    {
        await mount(page, "ReasoningAccordion", { title: "Reasoning", steps: [
            { id: "a", title: "Read the request", status: "complete", content: "Parsed it." },
            { id: "b", title: "Draft the answer", status: "thinking" }] });

        const header = page.locator(".reasoning-step-header").first();
        await expect(header).toContainText("Read the request");
        await header.click();

        await expect(header).toHaveAttribute("aria-expanded", "true");
        expect(await actions(page)).toEqual([]);
        expect(await errors(page)).toEqual([]);
    });
});
