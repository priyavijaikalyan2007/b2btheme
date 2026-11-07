/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Icon-pack classes in components (docs/ICON_PACKS.md, "In
 *    components"). In a real browser, the Ribbon demo's colour icons draw as
 *    images, its monochrome ones as masks over the text colour, a disabled
 *    control greys its icon, SymbolPicker finds the loaded pack's icons, and
 *    GraphCanvas draws font, colour and monochrome icon classes in its SVG,
 *    and TypeBadge sizes and colours them like its Bootstrap icons.
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

    test("GraphCanvas draws Font Awesome glyphs and pack images and masks", async ({ page }) =>
    {
        await page.goto("/demo/components/graphcanvas.html");
        const graph = page.locator("#demo-iconclass-graph");
        const node = (id: string) => graph.locator(`[data-node-id="${id}"]`);

        const fa = node("c1").locator("text").first();
        await expect(fa).toHaveAttribute("font-family", /Font Awesome 6 Free/);
        await expect(fa).toHaveAttribute("font-weight", "900");
        await expect(node("c3").locator("text").first()).toHaveAttribute("font-family", /Font Awesome 6 Brands/);
        expect(await fa.evaluate((el) => document.fonts.check(`900 14px ${el.getAttribute("font-family")}`)))
            .toBe(true);

        await expect(node("c5").locator("image.gc-node-icon"))
            .toHaveAttribute("href", /fluent-ui\/documents-files\/document-16-color\.svg$/);

        const rect = node("c4").locator("rect.gc-node-icon");
        const maskId = (await rect.getAttribute("mask"))!.match(/^url\(#(.+)\)$/)![1];
        const mask = graph.locator(`mask#${maskId}`);
        await expect(mask).toHaveAttribute("style", "mask-type:alpha");
        await expect(mask.locator("image")).toHaveAttribute("href", /person-16-regular\.svg$/);
        await expect(rect).toBeVisible();

        await expect(node("c6").locator("text").first()).toHaveAttribute("font-family", "bootstrap-icons");
    });

    test("TypeBadge draws Font Awesome and pack icons at the badge's icon size", async ({ page }) =>
    {
        await page.goto("/demo/components/typebadge.html");
        const row = page.locator("#demo-typebadge-iconclass");

        const fa = row.locator("i.fa-solid.fa-user").first();
        await expect(fa).toBeVisible();
        const faStyle = await fa.evaluate((el) =>
        {
            const s = getComputedStyle(el, "::before");
            return { content: s.content, font: s.fontFamily };
        });
        expect(faStyle.content).not.toBe("none");
        expect(faStyle.font).toContain("Font Awesome 6 Free");

        const mono = row.locator("i.fluent-ui-people-team-16-regular").first();
        const monoStyle = await mono.evaluate((el) =>
        {
            const s = getComputedStyle(el);
            return { mask: s.maskImage, bg: s.backgroundColor, color: s.color, width: s.width, size: s.fontSize };
        });
        expect(monoStyle.mask).toContain("people-team-16-regular.svg");
        expect(monoStyle.bg).toBe(monoStyle.color);
        // 1em wide; layout rounds widths to 1/64 px.
        expect(parseFloat(monoStyle.width)).toBeCloseTo(parseFloat(monoStyle.size), 1);

        const colour = row.locator("i.fluent-ui-document-16-color").first();
        expect(await colour.evaluate((el) => getComputedStyle(el).backgroundImage))
            .toContain("documents-files/document-16-color.svg");
        await expect(row.locator("i.bi.bi-crosshair").first()).toBeVisible();
    });

    test("SymbolPicker lists the loaded pack's icons by folder", async ({ page }) =>
    {
        await page.goto("/demo/components/symbolpicker.html");
        const picker = page.locator("#symbolpicker-demo-icons");
        await expect(picker.locator("i.fluent-ui-table-24-color").first()).toBeVisible();
        await expect(picker).toContainText("Data Charts (fluent-ui)");
    });
});
