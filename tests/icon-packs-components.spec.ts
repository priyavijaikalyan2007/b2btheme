/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Icon-pack classes in components (docs/ICON_PACKS.md, "In
 *    components"). In a real browser, the Ribbon demo's colour icons draw as
 *    images, its monochrome ones as masks over the text colour, a disabled
 *    control greys its icon, and SymbolPicker finds the loaded pack's icons.
 */

import { test, expect } from "@playwright/test";

test.describe("icon packs in components", () =>
{
    test("Ribbon draws colour, monochrome and disabled pack icons", async ({ page }) =>
    {
        await page.goto("/demo/components/ribbon.html");
        const root = page.locator("#ribbon-demo-colour");
        const table = root.locator("i.fluent-ui-table-24-color");
        await expect(table).toBeVisible();
        const tableStyle = await table.evaluate((el) =>
        {
            const s = getComputedStyle(el);
            return { image: s.backgroundImage, width: s.width, height: s.height };
        });
        expect(tableStyle.image).toContain("fluent-ui/data-charts/table-24-color.svg");
        expect(tableStyle.width).toBe("24px");
        expect(tableStyle.height).toBe("24px");
        const link = await root.locator("i.fluent-ui-link-24-color").evaluate((el) => getComputedStyle(el).filter);
        expect(link).toBe("grayscale(1)");
        expect(await table.evaluate((el) => getComputedStyle(el).filter)).toBe("none");
        await root.getByRole("tab", { name: "Home" }).click();
        const cut = root.locator("i.fluent-ui-cut-16-regular");
        await expect(cut).toBeVisible();
        const cutStyle = await cut.evaluate((el) =>
        {
            const s = getComputedStyle(el);
            return { mask: s.maskImage, bg: s.backgroundColor, color: s.color };
        });
        expect(cutStyle.mask).toContain("text-editing/cut-16-regular.svg");
        expect(cutStyle.bg).toBe(cutStyle.color);
    });

    test("SymbolPicker lists the loaded pack's icons by folder", async ({ page }) =>
    {
        await page.goto("/demo/components/symbolpicker.html");
        const picker = page.locator("#symbolpicker-demo-icons");
        await expect(picker.locator("i.fluent-ui-table-24-color").first()).toBeVisible();
        await expect(picker).toContainText("Data Charts (fluent-ui)");
    });
});
