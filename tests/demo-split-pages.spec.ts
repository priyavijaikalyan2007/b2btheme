/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: two demo pages that broke when demo/full-demo.html was split into
 *    per-component pages, found when that page was retired. Each loaded
 *    without an error, so "every demo page loads clean" passed them:
 *    - modal.html kept the button but not the modal it opens;
 *    - shapebuilder.html kept a copy of the DiagramEngine demo, which
 *      returned early for want of its container, before Shape Builder ran.
 */

import { test, expect } from "@playwright/test";

test("the Modal page's button opens the enterprise modal", async ({ page }) =>
{
    await page.goto("/demo/components/modal.html");
    await page.getByRole("button", { name: "Launch Demo Modal" }).click();

    await expect(page.locator("#exampleModal .modal-header-enterprise")).toBeVisible();
});

test("the Shape Builder page mounts its canvas", async ({ page }) =>
{
    await page.goto("/demo/components/shapebuilder.html");

    await expect(page.locator("#demo-shapebuilder > *").first()).toBeAttached();
});
