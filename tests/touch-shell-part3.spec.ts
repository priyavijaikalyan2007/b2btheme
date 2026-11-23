/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the rest of the shell on a touch screen (#181, part 3)
 *
 * jsdom has no layout, so these measure in a browser, with a touch screen, as
 * parts 1 and 2 do: on each demo page, every target a finger meets is 44 CSS
 * pixels each way (TOUCH_EXPERIENCE.md section 7). Each selector must match a
 * shown element, so a renamed class fails here instead of passing with nothing
 * measured. NavRail's targets were 44px before this part, and the test keeps
 * them there.
 *
 * A Ribbon submenu opens on a tap (#241). Chromium sends an emulated
 * mouseenter for a tap, so here the old hover listener opened it too. The unit
 * test shows the click that opens it, and that a tap's pointerleave does not
 * close it.
 */

import { expect, test, type Page } from "@playwright/test";

test.use({ hasTouch: true });

/** The shown elements under each selector, and those smaller than 44px either way. */
async function measure(page: Page, selectors: string[])
{
    return page.evaluate((sels) => sels.map((sel) =>
    {
        const shown = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter((e) => e.offsetParent !== null);
        const small = shown.map((e) => e.getBoundingClientRect()).filter((b) => b.width < 44 || b.height < 44)
            .map((b) => `${Math.round(b.width)}x${Math.round(b.height)}`);
        return { sel, shown: shown.length, small };
    }), selectors);
}

const PAGES: Array<{ name: string; targets: string[]; open?: (page: Page) => Promise<void> }> = [
    { name: "breadcrumb", targets: [".breadcrumb-nav-link", ".breadcrumb-nav-ellipsis",
        ".breadcrumb-nav-actions-caret"] },
    { name: "navrail", targets: [".navrail-item", ".navrail-toggle", ".navrail-search"] },
    { name: "workspaceshell", targets: [".workspaceshell-tab", ".workspaceshell-pin", ".workspaceshell-close",
        ".workspaceshell-new"] },
    { name: "ribbon", targets: [".ribbon-tab", ".ribbon-btn", ".ribbon-qat-btn", ".ribbon-collapse-btn",
        ".ribbon-menu-trigger", ".ribbon-split-primary", ".ribbon-split-arrow", ".ribbon-gallery-option",
        ".ribbon-gallery-more", ".ribbon-dropdown"] },
    { name: "inlinetoolbar", targets: [".inlinetoolbar-btn"] },
    { name: "bannerbar", targets: [".bannerbar-action", ".bannerbar-close"],
        open: (page) => page.locator("#demo-banner-action").click() },
    { name: "themetoggle", targets: [".themetoggle-btn"] },
];

for (const p of PAGES)
{
    test(`${p.name}: each target is 44px under a coarse pointer`, async ({ page }) =>
    {
        await page.goto(`/demo/components/${p.name}.html`);
        expect(await page.evaluate(() => matchMedia("(any-pointer: coarse)").matches)).toBe(true);
        await p.open?.(page);
        await page.locator(p.targets[0]).first().waitFor();

        const found = await measure(page, p.targets);
        expect(found.filter((f) => f.shown === 0).map((f) => f.sel)).toEqual([]);
        expect(found.filter((f) => f.small.length > 0)).toEqual([]);
    });
}

test("a Ribbon menu's submenu opens on a tap (#241)", async ({ page }) =>
{
    await page.goto("/demo/components/ribbon.html");
    const entry = page.locator(".ribbon-menu-entry:has(> .ribbon-menu-submenu)").first();
    // The trigger whose dropdown holds the first submenu entry.
    const index = await page.evaluate(() =>
    {
        const triggers = Array.from(document.querySelectorAll(".ribbon-menu-trigger"));
        return triggers.findIndex((t) => t.parentElement!.querySelector(".ribbon-menu-submenu") !== null);
    });
    expect(index).toBeGreaterThanOrEqual(0);

    await page.locator(".ribbon-menu-trigger").nth(index).tap();
    await entry.tap();
    await expect(entry.locator("> .ribbon-menu-submenu")).toBeVisible();
    // The submenu stays open after the tap's pointerleave.
    await page.waitForTimeout(400);
    await expect(entry.locator("> .ribbon-menu-submenu")).toBeVisible();
});
