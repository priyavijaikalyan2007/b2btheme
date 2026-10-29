/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: components whose dependencies the adapter loads first (readiness step
 * 2 P1, ADR-230, #51). DocViewer renders markdown through MarkdownRenderer
 * and marked, the vendored library arriving with its integrity hash; a page
 * URL from the agent is rejected (the URL-fetch rule). PresenceIndicator's
 * avatars are PersonChips, so a click on one reaches the agent.
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, surface, useHarness } from "../a2ui/adapter-page";

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

test.describe("Dependencies the adapter loads first", () =>
{
    test("DocViewer: renders a markdown page through MarkdownRenderer and the vendored marked", async ({ page }) =>
    {
        await mount(page, "DocViewer", { pages: [
            { id: "intro", title: "Introduction", markdown: "# Welcome\n\nThis is **bold**." },
            { id: "next", title: "Next steps", markdown: "## Next" }] });

        await expect(page.locator(".docviewer-article h1")).toHaveText("Welcome");
        await expect(page.locator(".docviewer-article strong")).toHaveText("bold");
        await expect(page.locator('head script[src$="/lib/marked-18.0.12.js"]'))
            .toHaveAttribute("integrity", /^sha384-/);
        await expect(page.locator('head script[src$="/lib/marked-18.0.12.js"]'))
            .toHaveAttribute("crossorigin", "anonymous");
        expect(await errors(page)).toEqual([]);
    });

    test("DocViewer: a page URL from the agent is rejected (the URL-fetch rule)", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "DocViewer", pages: { path: "/pages" } },
            { pages: [{ id: "a", title: "A", url: "/api/secrets" }] }));

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED",
            path: "/pages" })]);
    });

    test("PresenceIndicator: clicking a person in the expanded list sends onClick with the person", async ({ page }) =>
    {
        await mount(page, "PresenceIndicator", { eventData: { path: "/ev" }, clickable: true, expanded: true,
            people: [{ id: "1", name: "Alice Johnson" }, { id: "2", name: "Bob Smith", status: "online" }],
            onClick: { event: { name: "person", context: { p: { path: "/ev/click" } } } } });

        await page.locator(`${tagOf("PresenceIndicator")} .personchip`, { hasText: "Bob Smith" }).first().click();

        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "person",
            context: { p: { id: "2", name: "Bob Smith", status: "online" } } })]);
        expect(await errors(page)).toEqual([]);
    });
});
