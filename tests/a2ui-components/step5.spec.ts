/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the components readiness step 5 gives a manifest (specs/agentui-step5.prd.md),
 * under @a2ui/lit. S5-1: TypeBadge (ADR-243). S5-2: StatusBar and Sidebar (ADR-244).
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";

useHarness();

const tagOf = (name: string) => `outcrop-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/** Mounts `name` with `props`, and waits for its handle. */
async function mount(page: Page, name: string, props: Record<string, unknown>): Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: name, ...props }, {}));
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(name));
}

/** Mounts a tree of components (the first is the root), and waits for the root's handle. */
async function mountTree(page: Page, components: Record<string, unknown>[]): Promise<void>
{
    await open(page, "lit");
    await send(page, [
        { version: V, createSurface: { surfaceId: "s", catalogId: "https://static.outcrop.us/a2ui/catalog/v1.json" } },
        { version: V, updateComponents: { surfaceId: "s", components } },
        { version: V, updateDataModel: { surfaceId: "s", path: "/", value: {} } },
    ]);
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(String(components[0].component)));
}

/** The actions sent so far, as [name, context.p]. */
async function sent(page: Page): Promise<unknown[][]>
{
    return (await actions(page)).map((a) => [a.name, (a.context as { p: unknown }).p]);
}

/** Where the surface components write each event's payload. */
const EV = { eventData: { path: "/ev" } };

/** An action prop that sends `name` with the channel's payload as `p`. */
const act = (name: string, channel: string) => ({ event: { name, context: { p: { path: `/ev/${channel}` } } } });

test.describe("Step 5 components under @a2ui/lit", () =>
{
    test("TypeBadge: renders its type, and clicking a clickable badge sends onClick with its typeKey",
        async ({ page }) =>
        {
            await mount(page, "TypeBadge", { ...EV, typeKey: "strategy.okr", icon: "crosshair", clickable: true,
                onClick: act("type", "click") });

            const badge = page.getByRole("button", { name: "Type: okr" });
            await expect(badge).toBeVisible();
            await badge.press("Enter");

            await expect.poll(() => actions(page)).toEqual([
                expect.objectContaining({ name: "type", context: { p: { typeKey: "strategy.okr" } } })]);
            expect(await errors(page)).toEqual([]);
        });

    test("StatusBar: renders its regions inside the surface, not pinned to the viewport", async ({ page }) =>
    {
        await mount(page, "StatusBar", { regions: [{ id: "ln", label: "Ln", value: "12" },
            { id: "enc", value: "UTF-8" }] });

        const bar = page.locator(".statusbar");
        await expect(bar).toContainText("Ln");
        await expect(bar).toContainText("UTF-8");
        expect(await bar.evaluate((el) => getComputedStyle(el).position)).not.toBe("fixed");
        expect(await bar.evaluate((el) => el.closest("outcrop-status-bar") !== null)).toBe(true);
        expect(await errors(page)).toEqual([]);
    });

    test("Sidebar: holds its A2UI child, resizing sends onResize, collapsing sends onCollapse, width updates in place",
        async ({ page }) =>
        {
            const SIDEBAR = { id: "root", component: "Sidebar", title: "Filters", width: 280, content: "note", ...EV,
                onResize: act("size", "resize"), onCollapse: act("fold", "collapse") };
            await mountTree(page, [SIDEBAR, { id: "note", component: "Text", text: "A sidebar child" }]);

            const sidebar = page.locator(".sidebar-container");
            await expect(sidebar).toHaveClass(/sidebar-contained/);
            await expect(sidebar.getByText("A sidebar child")).toBeVisible();
            await expect(sidebar.locator(".sidebar-close-btn:visible")).toHaveCount(0);

            await sidebar.locator(".sidebar-resize-handle-h").focus();
            await page.keyboard.press("ArrowRight");
            await expect.poll(async () => (await sent(page)).filter(([n]) => n === "size").length).toBe(1);

            await sidebar.locator(".sidebar-collapse-btn").click();
            await expect.poll(async () => (await sent(page)).filter(([n]) => n === "fold"))
                .toEqual([["fold", { collapsed: true }]]);

            // width is state, so an agent's change applies in place: the same root and child stay.
            await page.evaluate(() =>
            {
                document.querySelector<HTMLElement>(".sidebar-container")!.dataset.kept = "yes";
            });
            await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [
                { ...SIDEBAR, width: 360, collapsed: false }] } }]);

            await expect(page.locator(".sidebar-container[data-kept='yes']")).toHaveCount(1);
            await expect(page.locator(".sidebar-container").getByText("A sidebar child")).toBeVisible();
            expect(await errors(page)).toEqual([]);
        });
});
