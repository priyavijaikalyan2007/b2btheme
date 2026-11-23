/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: dialogs and forms on a touch screen (#181)
 *
 * jsdom has no layout, so these measure in a browser, with a touch screen:
 *   - on each demo page, every target a finger meets is 44 CSS pixels each
 *     way (TOUCH_EXPERIENCE.md section 7). Each selector must match a drawn
 *     element, so a renamed class fails instead of passing with nothing
 *     measured. A drawn element is one with a box, since a fixed dialog's
 *     elements have no offsetParent;
 *   - a tap outside a FormDialog with unsaved changes leaves it open, and a tap
 *     outside a clean one closes it (section 6.1);
 *   - FormDialog's divider and PropertyInspector's edge leave a vertical
 *     swipe to the page (the section 9 touch-action table).
 * The controls of the pickers inside DynamicFormSwitcher belong to the
 * pickers family, so they are not measured here.
 */

import { expect, test, type Page } from "@playwright/test";

test.use({ hasTouch: true });

/** The drawn elements under each selector, and those smaller than 44px either way. */
async function measure(page: Page, selectors: string[])
{
    return page.evaluate((sels) => sels.map((sel) =>
    {
        const drawn = Array.from(document.querySelectorAll<HTMLElement>(sel))
            .filter((e) => e.getClientRects().length > 0);
        const small = drawn.map((e) => e.getBoundingClientRect()).filter((b) => b.width < 44 || b.height < 44)
            .map((b) => `${Math.round(b.width)}x${Math.round(b.height)}`);
        return { sel, drawn: drawn.length, small };
    }), selectors);
}

const PAGES: Array<{ name: string; open?: string; targets: string[] }> = [
    { name: "formdialog", open: "#formdialog-demo-complex-btn", targets: [".formdialog-close",
        ".formdialog-btn-cancel", ".formdialog-btn-submit", ".formdialog-section-toggle", ".formdialog-input"] },
    { name: "confirmdialog", open: "#cd-demo-default", targets: [".confirmdialog-close", ".confirmdialog-cancel",
        ".confirmdialog-confirm"] },
    { name: "errordialog", open: "#demo-error-technical", targets: [".errordialog-header .btn-close",
        ".errordialog-footer .btn", ".errordialog-technical-toggle"] },
    { name: "progressmodal", open: "#demo-progress-stepped", targets: [".progressmodal-copy-log-btn"] },
    { name: "sharedialog", open: "#demo-sd-existing", targets: [".sharedialog-close", ".sharedialog-access-remove",
        ".sharedialog-access-select", ".sharedialog-add-btn", ".sharedialog-cancel-btn", ".sharedialog-done-btn"] },
    { name: "propertyinspector", open: "#demo-pi-list button", targets: [".propertyinspector-tab"] },
    { name: "dynamicformswitcher", targets: [".dynamicformswitcher-input", ".dynamicformswitcher-select",
        ".dynamicformswitcher-selector-dropdown", ".dynamicformswitcher-segment", ".dynamicformswitcher-tab",
        ".dynamicformswitcher-radio-wrap"] },
    { name: "fileupload", targets: [".fileupload-download-link"] },
    { name: "stepper", targets: [".stepper-footer .btn"] },
    { name: "authcard", targets: [".idp-button"] },
    { name: "maskedentry", targets: [".maskedentry-toggle", ".maskedentry-copy", ".maskedentry-input"] },
];

for (const p of PAGES)
{
    test(`${p.name}: each target is 44px under a coarse pointer`, async ({ page }) =>
    {
        await page.goto(`/demo/components/${p.name}.html`);
        expect(await page.evaluate(() => matchMedia("(any-pointer: coarse)").matches)).toBe(true);
        if (p.open) { await page.locator(p.open).first().click(); }
        await page.locator(p.targets[0]).first().waitFor();
        // A dialog scales in as it opens, so it is measured once its animations end.
        await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));

        const found = await measure(page, p.targets);
        expect(found.filter((f) => f.drawn === 0).map((f) => f.sel)).toEqual([]);
        expect(found.filter((f) => f.small.length > 0)).toEqual([]);
    });
}

test("a tap outside a FormDialog closes it only when nothing is unsaved", async ({ page }) =>
{
    await page.goto("/demo/components/formdialog.html");
    await page.locator("#formdialog-demo-simple-btn").click();
    const input = page.locator(".formdialog-input").first();
    await input.waitFor();

    await input.fill("Ada");
    await page.touchscreen.tap(5, 5);
    await expect(page.locator(".formdialog-overlay")).toHaveCount(1);

    await input.fill("");
    await page.touchscreen.tap(5, 5);
    await expect(page.locator(".formdialog-overlay")).toHaveCount(0);
});

test("FormDialog's divider and PropertyInspector's edge leave a vertical swipe to the page", async ({ page }) =>
{
    await page.goto("/demo/components/formdialog.html");
    await page.locator("#formdialog-demo-panel-btn").click();
    const divider = page.locator(".formdialog-divider");
    await divider.waitFor();
    expect(await divider.evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-y");

    await page.goto("/demo/components/propertyinspector.html");
    await page.locator("#demo-pi-list button").first().click();
    const edge = page.locator(".propertyinspector-resize-handle").first();
    await edge.waitFor();
    expect(await edge.evaluate((el) => getComputedStyle(el).touchAction)).toBe("pan-y");
});
