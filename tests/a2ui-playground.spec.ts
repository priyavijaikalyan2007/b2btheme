/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the A2UI playground (#30 spec §5, §10.2) in a real browser, under
 * its real CSP: it loads with no policy violation, pasted messages are
 * checked and applied through one path, a rejected batch renders nothing,
 * and a scenario steps forward through the toolbar.
 */

import { expect, test, type Page } from "@playwright/test";

import { cspViolations, openPlayground } from "./a2ui/playground-route";

const V = "v0.9.1";
const ID = "https://static.outcrop.us/a2ui/catalog/v1.json";
const surface = { version: V, createSurface: { surfaceId: "s", catalogId: ID } };
const ruler = { version: V, updateComponents: { surfaceId: "s", components: [{ id: "root", component: "Ruler" }] } };

async function paste(page: Page, messages: unknown[]): Promise<void>
{
    await page.getByRole("button", { name: /^Paste:/ }).click();
    await page.locator("#a2ui-paste .cm-content").click();
    await page.keyboard.insertText(JSON.stringify(messages));
}

test.describe("A2UI playground", () =>
{
    test("loads every region with no CSP violation", async ({ page }) =>
    {
        await openPlayground(page);

        await expect(page.locator(".a2ui-toolbar")).toBeVisible();
        await expect(page.locator(".a2ui-log")).toBeAttached();
        await expect(page.locator(".a2ui-surfaces")).toBeVisible();
        await expect(page.locator("#a2ui-data")).toBeAttached();
        expect(await cspViolations(page)).toEqual([]);
    });

    test("pasted messages are checked, then applied into a labelled frame", async ({ page }) =>
    {
        await openPlayground(page);
        await paste(page, [surface, ruler]);

        await page.locator("#a2ui-paste").locator("..").getByRole("button", { name: "Check" }).click();
        await expect(page.locator(".a2ui-paste-findings")).toHaveText("OK: 2 message(s), no findings");

        await page.locator("#a2ui-paste").locator("..").getByRole("button", { name: "Apply" }).click();
        await expect(page.locator('[data-surface="s"] outcrop-ruler .ruler').first()).toBeVisible();
        await expect(page.locator(".a2ui-log li")).toHaveCount(2);
        await expect(page.locator('.a2ui-log li[data-status="applied"]')).toHaveCount(2);
        expect(await cspViolations(page)).toEqual([]);
    });

    test("a batch with an unknown component is rejected whole and renders nothing", async ({ page }) =>
    {
        await openPlayground(page);
        await paste(page, [surface, { version: V, updateComponents: { surfaceId: "s",
            components: [{ id: "root", component: "Nope" }] } }]);

        await page.locator("#a2ui-paste").locator("..").getByRole("button", { name: "Apply" }).click();

        await expect(page.locator('.a2ui-log li[data-status="rejected"]')).toHaveCount(2);
        await expect(page.locator("[data-surface]")).toHaveCount(0);
        await expect(page.locator(".a2ui-findings")).toContainText('unknown component "Nope"');
    });

    test("a scenario steps forward from the toolbar", async ({ page }) =>
    {
        await openPlayground(page);
        await page.locator(".a2ui-toolbar select").selectOption("pick-orientation");
        await expect(page.getByRole("button", { name: /^Step:/ })).not.toHaveAttribute("aria-disabled", "true");

        for (let i = 0; i < 5; i++) { await page.getByRole("button", { name: /^Step:/ }).click(); }

        await expect(page.locator('.a2ui-log li[data-status="applied"]')).toHaveCount(3);
        await expect(page.locator("outcrop-orientation-picker .orientationpicker-trigger")).toBeVisible();
        await expect.poll(() => page.evaluate(() => (window as unknown as { a2uiPlayground: { snapshot():
            { dataModels: Record<string, unknown> } } }).a2uiPlayground.snapshot().dataModels))
            .toEqual({ s: { orientation: "portrait" } });
        expect(await cspViolations(page)).toEqual([]);
    });
});
