/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the demo pages for the query language work (#203) and the canvas wheel (#183).
 * demo-pages.spec.ts proves each page loads with no error. These prove each shows what it says it shows:
 *   - QueryLanguage colors a query, and a sample changes it;
 *   - FacetSearch's query section colors its text, shows a sample error, and has the compact zone button;
 *   - TimezonePicker's compact form shows the current city;
 *   - ExpressionBuilder draws its grid, with dashed runs, a group and a read-only row, and places a sample warning;
 *   - DiagramEngine says the wheel pans, and shows its zoom buttons (#221).
 */

import { test, expect } from "@playwright/test";

test("QueryLanguage colors a query as the API reads it, and a sample changes it", async ({ page }) =>
{
    await page.goto("/demo/components/querylanguage.html");

    await expect(page.locator("#ql-demo-out .ql-key").first()).toHaveText("type");
    await expect(page.locator("#ql-demo-out .ql-operator").first()).toHaveText("in");
    // The `in` of `meeting in march` is plain text.
    await expect(page.locator("#ql-demo-out")).toContainText("meeting in march");
    await expect(page.locator("#ql-demo-out .ql-operator", { hasText: /^in$/ })).toHaveCount(1);

    await page.locator("#ql-demo-samples button", { hasText: "return ?p" }).click();
    await expect(page.locator("#ql-demo-out .ql-variable")).toHaveText(["$max", "?p"]);
    await expect(page.locator("#ql-demo-ranges tr").first()).toContainText("amount");
});

test("FacetSearch's query section colors the text, shows a sample error, and has the zone button", async ({ page }) =>
{
    await page.goto("/demo/components/facetsearch.html");
    const section = page.locator("#facetsearch-query-section");

    await expect(section.locator(".facetsearch-tok-key").first()).toHaveText("type");
    await expect(section.locator(".timezonepicker-compact-button")).toBeVisible();

    await section.locator("#fs-demo-query-error").click();
    await expect(section.locator(".facetsearch-message-text")).toContainText("A bracket is not closed");
    await expect(section.locator(".facetsearch-mark-error")).toHaveText("(");
});

test("TimezonePicker's compact form shows the current city, and opens the dropdown", async ({ page }) =>
{
    await page.goto("/demo/components/timezonepicker.html");
    const button = page.locator("#demo-tz-compact .timezonepicker-compact-button");

    await expect(button.locator(".timezonepicker-compact-city")).toHaveText("Kolkata");
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
});

test("ExpressionBuilder draws its grid: two dashed runs, a group, a read-only search inside, and a warning",
    async ({ page }) =>
{
    await page.goto("/demo/components/expressionbuilder.html");

    await expect(page.locator("#eb-demo .expressionbuilder-run-start [data-role=make-group]")).toHaveCount(2);
    await expect(page.locator("#eb-demo .expressionbuilder-line-group")).toHaveCount(1);
    await expect(page.locator('#eb-demo [data-item="3"] [data-role=join]')).toHaveValue("or");
    await expect(page.locator('#eb-demo [data-item="4"] .expressionbuilder-cell-op')).toHaveText("has one where");
    await expect(page.locator("#eb-demo-tree")).toContainText("\"kind\": \"nested\"");

    await page.locator("#eb-demo-warning").click();
    const warned = page.locator("#eb-demo .expressionbuilder-has-warning");
    await expect(warned).toHaveCount(1);
    await expect(warned.locator("[data-role=key]")).toHaveValue("assigned");
});

test("DiagramEngine says the wheel pans and Ctrl zooms, and shows its zoom buttons", async ({ page }) =>
{
    await page.goto("/demo/components/diagramengine.html");

    await expect(page.locator("#diagramengine-section")).not.toContainText("scroll to zoom");
    await expect(page.locator("#diagramengine-section")).toContainText("Pan with the wheel");
    await expect(page.locator("#diagramengine-section .de-zoom-controls .de-zoom-button")).toHaveCount(3);
});
