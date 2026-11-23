/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the shell's popups and menus on a touch screen (#181, part 2)
 *
 * jsdom has no layout and sends no real touch, so these show in a browser:
 *   - ContextMenu on a phone opens as a sheet at the bottom, with rows of 48px, and a tap on its backdrop closes
 *     it and reaches nothing under it. At a desktop width it opens at the pointer.
 *   - AppLauncher, UserMenu, TenantSwitcher and NotificationCenter close on a real tap on blank space. Safari on
 *     iOS sends no mousedown for that tap. Chromium does, so here the tap passes with the old mousedown listener
 *     too, and the unit tests show the pointerdown.
 *   - Under a coarse pointer, each one's targets are 44px.
 * The page is the test's own, so each test controls what it opens.
 */

import { expect, test, type Page } from "@playwright/test";

test.use({ hasTouch: true });

const PAGE = "/__touch-popups.html";
const NAMES = ["contextmenu", "applauncher", "usermenu", "tenantswitcher", "notificationcenter"];

const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/css/custom.css">
<link rel="stylesheet" href="/icons/bootstrap-icons.css">
${NAMES.map((n) => `<link rel="stylesheet" href="/components/${n}/${n}.css">`).join("\n")}
<style>body { margin: 0; } #host { display: flex; gap: 16px; padding: 16px; }
#under { position: fixed; left: 0; top: 0; width: 100%; height: 200px; }</style>
</head><body>
<button id="under" type="button">Under</button>
<div id="host"><div id="launcher"></div><div id="user"></div><div id="tenant"></div><div id="bell"></div></div>
<script>window.__clicks = 0;
document.getElementById("under").addEventListener("click", () => { window.__clicks += 1; });</script>
${NAMES.map((n) => `<script src="/components/${n}/${n}.js"></script>`).join("\n")}
</body></html>`;

async function open(page: Page, width: number): Promise<void>
{
    await page.setViewportSize({ width, height: 800 });
    await page.route(`**${PAGE}`, (route) => route.fulfill({ contentType: "text/html", body: HTML }));
    await page.goto(PAGE);
}

/** Each element's size under a selector, and those smaller than 44px either way. */
async function small(page: Page, selectors: string[]): Promise<Array<{ sel: string; w: number; h: number }>>
{
    return page.evaluate((sels) => sels.flatMap((sel) =>
        Array.from(document.querySelectorAll<HTMLElement>(sel)).filter((el) => el.offsetParent !== null).map((el) =>
        {
            const r = el.getBoundingClientRect();
            return { sel, w: Math.round(r.width), h: Math.round(r.height) };
        })).filter((s) => s.w < 44 || s.h < 44), selectors);
}

const ITEMS = `[{ id: "cut", label: "Cut" }, { id: "copy", label: "Copy" },
    { id: "more", label: "More", type: "submenu", children: [{ id: "x", label: "X" }] }]`;

test("ContextMenu on a phone is a sheet at the bottom, and a tap on its backdrop closes it", async ({ page }) =>
{
    await open(page, 390);
    await page.evaluate(`window.__menu = createContextMenu({ items: ${ITEMS}, x: 100, y: 100 })`);

    const sheet = page.locator(".contextmenu-sheet");
    await expect(sheet).toBeVisible();
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.width)).toBe(390);
    expect(Math.round(box.y + box.height)).toBe(800);
    expect(await small(page, [".contextmenu-item"])).toEqual([]);

    // A submenu opens in place of the list.
    await page.locator(".contextmenu-item", { hasText: "More" }).tap();
    await expect(sheet.locator(".contextmenu-item")).toHaveText(["Back", "X"]);

    // The backdrop takes the tap: the button under it hears nothing.
    await page.touchscreen.tap(195, 100);
    await expect(page.locator(".contextmenu, .contextmenu-backdrop")).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).__clicks)).toBe(0);
});

test("ContextMenu at a desktop width opens at the pointer, as before", async ({ page }) =>
{
    await open(page, 1024);
    await page.evaluate(`window.__menu = createContextMenu({ items: ${ITEMS}, x: 300, y: 250 })`);

    const box = (await page.locator(".contextmenu").boundingBox())!;
    expect(Math.round(box.x)).toBe(300);
    expect(Math.round(box.y)).toBe(250);
    await expect(page.locator(".contextmenu-backdrop")).toHaveCount(0);
});

/** Each popup: how to open it, whether it is open, and its targets once open. */
const POPUPS: Array<{ name: string; make: string; isOpen: string; targets: string[] }> = [
    {
        name: "AppLauncher",
        make: `window.__p = createAppLauncher({ apps: [{ id: "a", name: "Alpha", icon: "bi-house" },
            { id: "b", name: "Beta", icon: "bi-gear" }] }, "launcher"); window.__p.open();`,
        isOpen: "window.__p.isOpen()",
        targets: [".applauncher-trigger", ".applauncher-tile"],
    },
    {
        name: "UserMenu",
        make: `window.__p = createUserMenu("user", { userName: "Ada Lovelace", menuItems: [
            { id: "profile", label: "Profile" }, { id: "out", label: "Sign out" }] }); window.__p.open();`,
        isOpen: "window.__p.isOpen()",
        targets: [".usermenu-trigger", ".usermenu-item"],
    },
    {
        name: "TenantSwitcher",
        make: `window.__p = createTenantSwitcher({ tenants: [{ id: "t1", name: "Acme" }, { id: "t2", name: "Globex" }],
            activeTenantId: "t1" }, "tenant"); window.__p.open();`,
        isOpen: "window.__p.isOpen()",
        targets: [".tenantswitcher-trigger", ".tenantswitcher-item", ".tenantswitcher-create"],
    },
    {
        name: "NotificationCenter",
        make: `window.__p = createNotificationCenter({ container: document.getElementById("bell"), notifications: [
            { id: "n1", title: "Build passed", timestamp: new Date().toISOString() }] }); window.__p.open();`,
        isOpen: `document.querySelector(".notificationcenter-panel").classList.contains("notificationcenter-panel-open")`,
        targets: [".notificationcenter-bell", ".notificationcenter-close", ".notificationcenter-item-dismiss",
            ".notificationcenter-mark-all"],
    },
];

for (const p of POPUPS)
{
    test(`${p.name} closes on a tap on blank space, and its targets are 44px`, async ({ page }) =>
    {
        await open(page, 1024);
        await page.evaluate(p.make);
        expect(await page.evaluate(p.isOpen)).toBe(true);
        expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
        expect(await small(page, p.targets)).toEqual([]);

        // Blank space at the bottom left, away from each popup.
        await page.touchscreen.tap(20, 780);
        expect(await page.evaluate(p.isOpen)).toBe(false);
    });
}
