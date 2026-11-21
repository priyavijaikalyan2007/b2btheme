/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the shell dividers and drag handles on a touch screen (#181, part 1)
 *
 * The review of #202 promised that each family's fix measures its targets in
 * a browser, because jsdom has no layout. With a touch screen,
 * `(pointer: coarse)` matches, and each divider must take a finger 22 CSS
 * pixels either side of its middle while its visible line stays thin
 * (TOUCH_EXPERIENCE.md section 6.1). Each surface must also declare the
 * touch-action that the section 9 table gives it.
 */

import { expect, test, type Page } from "@playwright/test";

test.use({ hasTouch: true });

/**
 * The divider's visible thickness, and whether a point 20px either side of
 * its middle, across the divider, still lands on it.
 */
async function measure(page: Page, selector: string, across: "x" | "y")
{
    return page.locator(selector).first().evaluate((el, axis) =>
    {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const hits = [-20, 20].map((d) =>
        {
            const hit = axis === "x" ? document.elementFromPoint(cx + d, cy) : document.elementFromPoint(cx, cy + d);
            return hit === el;
        });
        return {
            coarse: matchMedia("(pointer: coarse)").matches,
            thickness: axis === "x" ? r.width : r.height,
            hits,
            touchAction: getComputedStyle(el).touchAction,
        };
    }, across);
}

test("SplitLayout's divider takes a finger 20px either side, and a vertical swipe still scrolls", async ({ page }) =>
{
    await page.goto("/demo/components/splitlayout.html");
    await page.locator(".splitlayout-divider-horizontal").first().waitFor();

    const m = await measure(page, ".splitlayout-divider-horizontal", "x");

    expect(m.coarse).toBe(true);
    expect(m.thickness).toBeLessThanOrEqual(8);
    expect(m.hits).toEqual([true, true]);
    expect(m.touchAction).toBe("pan-y");
});

test("StackLayout's divider takes a finger 20px either side, and a horizontal swipe still scrolls", async ({ page }) =>
{
    await page.goto("/demo/components/stacklayout.html");
    await page.locator(".stacklayout-divider").first().waitFor();

    const m = await measure(page, ".stacklayout:not(.stacklayout--horizontal) .stacklayout-divider", "y");

    expect(m.coarse).toBe(true);
    expect(m.thickness).toBe(4);
    expect(m.hits).toEqual([true, true]);
    expect(m.touchAction).toBe("pan-x");
});

test("RibbonBuilder's tree divider takes a finger 20px either side", async ({ page }) =>
{
    await page.goto("/demo/components/ribbonbuilder.html");
    await page.locator(".ribbonbuilder-divider").first().waitFor();

    const m = await measure(page, ".ribbonbuilder-divider", "x");

    expect(m.thickness).toBe(4);
    expect(m.hits).toEqual([true, true]);
    expect(m.touchAction).toBe("pan-y");
});

test("the Toolbar grip takes the touch at once, so a drag is not a page scroll", async ({ page }) =>
{
    await page.goto("/demo/components/toolbar.html");
    // The demo makes each toolbar from a button. This one floats.
    await page.locator("#demo-toolbar-split").click();
    await page.locator(".toolbar-grip").first().waitFor();

    const touchAction = await page.locator(".toolbar-grip").first()
        .evaluate((el) => getComputedStyle(el).touchAction);

    expect(touchAction).toBe("none");
});
