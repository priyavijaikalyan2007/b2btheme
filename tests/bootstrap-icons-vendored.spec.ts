/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Bootstrap Icons at /lib/bootstrap-icons-<version>/, loaded the way
 *    the apps load it (apps report 2026-11-07-bootstrap-icons-cors-and-hash):
 *    a <link> with the manifest's integrity hash and `crossorigin`, whose
 *    rules the page can then read, and whose fonts resolve beside it. The
 *    CORS header itself is the /lib/* rule in cdn/_headers; the test server
 *    is same-origin, so this checks the hash, the rules and the fonts.
 */

import { test, expect, type Page } from "@playwright/test";

/** A blank page on this origin, then the stylesheet linked with a given hash. */
async function linkStylesheet(page: Page, hash?: string)
{
    await page.goto("/lib-manifest.json");

    return page.evaluate(async (override) =>
    {
        const manifest = await fetch("/lib-manifest.json").then((r) => r.json());
        const asset = manifest.assets["bootstrap-icons"];
        const link = Object.assign(document.createElement("link"),
            { rel: "stylesheet", href: asset.url, integrity: override ?? asset.integrity, crossOrigin: "anonymous" });
        const loaded = await new Promise<boolean>((resolve) =>
        {
            link.onload = () => resolve(true);
            link.onerror = () => resolve(false);
            document.head.append(link);
        });

        return { loaded, url: asset.url as string };
    }, hash);
}

test.describe("vendored Bootstrap Icons", () =>
{
    test("loadsWithItsHash_RulesReadable_IconsDraw", async ({ page }) =>
    {
        const { loaded, url } = await linkStylesheet(page);
        expect(loaded).toBe(true);
        expect(url).toMatch(/^\/lib\/bootstrap-icons-\d+\.\d+\.\d+\/bootstrap-icons\.min\.css$/);

        const iconRules = await page.evaluate(() =>
        {
            const sheet = [...document.styleSheets].find((s) => s.href?.includes("/lib/bootstrap-icons-"));
            return [...sheet!.cssRules].filter((r) => (r as CSSStyleRule).selectorText?.startsWith(".bi-")).length;
        });
        expect(iconRules).toBeGreaterThan(2000);

        const drawn = await page.evaluate(async () =>
        {
            const icon = Object.assign(document.createElement("i"), { className: "bi bi-house" });
            document.body.append(icon);
            await document.fonts.ready;
            const face = [...document.fonts].find((f) => f.family.includes("bootstrap-icons"));
            return { family: getComputedStyle(icon, "::before").fontFamily, face: face?.status };
        });
        expect(drawn.family).toContain("bootstrap-icons");
        expect(drawn.face).toBe("loaded");
    });

    test("aWrongHash_IsRefused", async ({ page }) =>
    {
        const { loaded } = await linkStylesheet(page, "sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
        expect(loaded).toBe(false);
    });
});
