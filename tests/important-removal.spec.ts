/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: The computed values that IMP-1's `!important` removals must not move. ADR-209.
 *
 * WHY THIS EXISTS
 * ---------------
 * IMP-1 deferred its work for months on the ground that "removing an
 * `!important` changes specificity, and specificity changes are visual",
 * and this repository has no visual-regression suite. That is true for
 * colour and spacing judgements. It is NOT true for a computed value.
 * `getComputedStyle` reports exactly what the cascade resolved to, which
 * is the only thing a specificity change can alter.
 *
 * So these are not screenshots and they are not approximations. Each test
 * reads the property the removed `!important` used to force and asserts
 * the number or colour the cascade produces without it.
 *
 * WHAT THE REMOVALS WERE
 * ----------------------
 * graphcanvas  `.gc-node-selected rect` and `.gc-edge-selected path` set
 *              `stroke` and `stroke-width` with `!important`. The entry
 *              claimed they were beating `.gc-node:hover rect`, which
 *              out-specifies them at (0,2,1) against (0,1,1). MEASURED:
 *              the hover rule sets `stroke-width` to 2.5, the SAME value
 *              the selection rule sets, and it never sets `stroke` at
 *              all. The only other source of `stroke` is `setAttribute`
 *              in `svgCreate`, an SVG PRESENTATION ATTRIBUTE, which loses
 *              to any CSS rule at any specificity. The four declarations
 *              were beating nothing.
 *
 * ribbon       `.ribbon-overflow-popup .ribbon-group-content` forced
 *              `display: flex`. `ribbon.ts:2647` sets `display: flex`
 *              INLINE on that same element when it moves the content into
 *              the popup, so the declaration agreed with an inline that
 *              would have won anyway.
 *
 * WHAT WOULD MAKE THESE TESTS LIE
 * -------------------------------
 * A test that only reads an unhovered node would pass whether or not the
 * hover rule competes, so `selectedNodeKeepsItsStrokeWhileHovered` hovers
 * the node it selected. That is the case the `!important` was claimed to
 * be protecting, and it is the one worth pinning.
 */

import { test, expect } from "@playwright/test";

const SELECTED_STROKE = "rgb(28, 126, 214)";      // $blue-600, src/scss/_variables.scss:23

test.describe("IMP-1 !important removals", () =>
{
    test("selectedNode_UsesTheSelectionStroke", async ({ page }) =>
    {
        await page.goto("/demo/components/graphcanvas.html");
        const node = page.locator("#demo-graphcanvas .gc-node").first();
        await node.waitFor();
        await node.click();

        const rect = page.locator("#demo-graphcanvas .gc-node-selected rect").first();
        await expect(rect).toHaveCSS("stroke", SELECTED_STROKE);
        await expect(rect).toHaveCSS("stroke-width", "2.5px");
    });

    test("selectedNodeKeepsItsStrokeWhileHovered", async ({ page }) =>
    {
        await page.goto("/demo/components/graphcanvas.html");
        const node = page.locator("#demo-graphcanvas .gc-node").first();
        await node.waitFor();
        await node.click();
        await node.hover();

        // The hover rule is .gc-node:hover rect at (0,2,1) and the selection
        // rule is .gc-node-selected rect at (0,1,1). Hover wins on
        // specificity and sets stroke-width to the same 2.5, and sets no
        // stroke at all, so the resolved values are unchanged.
        const rect = page.locator("#demo-graphcanvas .gc-node-selected rect").first();
        await expect(rect).toHaveCSS("stroke", SELECTED_STROKE);
        await expect(rect).toHaveCSS("stroke-width", "2.5px");
    });

    test("unselectedNode_DoesNotUseTheSelectionStroke", async ({ page }) =>
    {
        await page.goto("/demo/components/graphcanvas.html");
        const rect = page.locator("#demo-graphcanvas .gc-node rect").first();
        await rect.waitFor();

        // The control. Without it the two tests above would pass against a
        // stylesheet that painted every node blue.
        await expect(rect).not.toHaveCSS("stroke", SELECTED_STROKE);
    });

    // ------------------------------------------------------------------
    // treeview — the pair the old entry called "mechanically fixable",
    // which is exactly why they needed a check before being touched.
    // Both inputs carry `form-control form-control-sm`, and Bootstrap's
    // `.form-control-sm` sets padding, font-size and border-radius at
    // (0,1,0) with no `!important` of its own. Compounding the element
    // with the class gives (0,1,1), which wins without the keyword and
    // without assuming any ancestor.
    // ------------------------------------------------------------------

    test("treeviewSearchInput_KeepsItsPaddingAndSize", async ({ page }) =>
    {
        await page.goto("/demo/components/treeview.html");
        const input = page.locator("#demo-tv-search .treeview-search-input");
        await input.waitFor();

        await expect(input).toHaveCSS("padding-left", "28px");
        await expect(input).toHaveCSS("font-size", "13.6px");
    });

    test("treeviewRenameInput_KeepsItsHeightAndPadding", async ({ page }) =>
    {
        await page.goto("/demo/components/treeview.html");
        const node = page.locator("#demo-tv-context .treeview-node-label").first();
        await node.waitFor();
        await node.click();
        await page.keyboard.press("F2");

        const input = page.locator("#demo-tv-context .treeview-rename-input");
        await input.waitFor();
        // 29.7188px, NOT the 22px the stylesheet asked for. Bootstrap's
        // .form-control-sm sets min-height to calc(1.5em + 0.5rem + 2px),
        // and min-height beats height no matter how the height is spelled.
        // The `height: 22px` declaration here was dead on arrival and has
        // been deleted, and the 22px target was retired with it: a row is
        // 30px, so 29.72px fills it and 22px would float inside it.
        // DEBT-TV-1, settled.
        await expect(input).toHaveCSS("height", "29.7188px");
        await expect(input).toHaveCSS("font-size", "13.6px");
        await expect(input).toHaveCSS("padding-top", "1px");
        await expect(input).toHaveCSS("padding-left", "4px");
    });

    // ------------------------------------------------------------------
    // DEBT-TV-1, settled. The decision was that 22px was the stale number,
    // because the field already fills its row. That is the claim worth
    // pinning: not the height on its own, but the height AGAINST the row.
    // A future change that shrinks the input would keep the test above
    // honest only if the number were edited with it, and would break this
    // one, which is the point.
    // ------------------------------------------------------------------

    test("treeviewRenameInput_FillsItsRowAndDoesNotShiftIt", async ({ page }) =>
    {
        await page.goto("/demo/components/treeview.html");
        const tree = page.locator("#demo-tv-context");
        const rows = tree.locator(".treeview-node");
        await rows.first().waitFor();

        const rowHeight = await rows.nth(1).evaluate((el) => el.getBoundingClientRect().height);
        const before = await rows.first().evaluate((el) => el.getBoundingClientRect().height);

        await tree.locator(".treeview-node-label").first().click();
        await page.keyboard.press("F2");
        const input = tree.locator(".treeview-rename-input");
        await input.waitFor();

        const during = await rows.first().evaluate((el) => el.getBoundingClientRect().height);
        const inputHeight = await input.evaluate((el) => el.getBoundingClientRect().height);

        // Within a pixel of the row it sits in.
        expect(Math.abs(inputHeight - rowHeight)).toBeLessThan(1);

        // And renaming moves nothing.
        expect(during).toBe(before);
    });
});
