/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: CommandPalette's source in a real browser (apps report 2026-11-09).
 *    The demo's source answers after 400 ms. Typing shows "Searching…", then
 *    its results after the matching commands, as given, and a click runs one.
 */

import { test, expect } from "@playwright/test";

test.describe("CommandPalette source", () =>
{
    test("typing shows loading, then the source's results after the commands, and a click opens one", async ({ page }) =>
    {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("console", (m) => { if (m.type() === "error") { errors.push(m.text()); } });

        await page.goto("/demo/components/commandpalette.html");
        await page.locator("#cp-btn-open").click();
        await page.locator(".commandpalette-input").fill("plan");

        await expect(page.locator(".commandpalette-source-loading")).toHaveText("Searching…");
        await expect(page.locator(".commandpalette-result")).toHaveText(["Q3 planningTeam A / Plans",
            "System architecturePlatform / Design", "Weekly syncTeam A / Meetings"]);

        // Matching commands come first, as the report allows; the results follow them.
        const rows = page.locator(".commandpalette-item");
        const firstResult = await rows.evaluateAll((els) => els.findIndex((el) => el.hasAttribute("data-result-id")));
        expect(firstResult).toBeGreaterThan(0);
        await page.locator(".commandpalette-result").first().click();
        await expect(page.locator("#cp-demo-output")).toHaveText("Opened: Q3 planning");
        expect(errors).toEqual([]);
    });
});
