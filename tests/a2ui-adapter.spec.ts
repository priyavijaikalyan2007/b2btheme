/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the A2UI adapter under Google's own renderers, in a real browser.
 *
 * A host page imports the BUILT /a2ui/adapter/v1.js from the served dist
 * tree, renders with @a2ui/lit (and, once, @a2ui/react), and the adapter
 * lazy-loads the real dist IIFE components. jsdom cannot show this: custom
 * element upgrade order, the renderer's own context handling, and the
 * shipped component scripts only meet here (spec §10.3). Per-component
 * behaviour lives in tests/a2ui-components/; this file keeps the adapter's
 * own concerns: theme injection and error codes.
 */

import { expect, test } from "@playwright/test";

import { errors, open, ORIGIN, send, surface, useHarness } from "./a2ui/adapter-page";

useHarness();

test.describe("A2UI adapter under @a2ui/lit", () =>
{
    test("injectBaseTheme loads custom.css exactly once", async ({ page }) =>
    {
        await open(page, "lit", { inject: "1" });
        await send(page, surface("s", { id: "root", component: "Ruler" }));
        await expect(page.locator("outcrop-ruler .outcrop-host .ruler").first()).toBeVisible();
        await expect(page.locator('head link[href$="/css/custom.css"]')).toHaveCount(1);
    });

    test("the default does not inject the base theme", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "Ruler" }));
        await expect(page.locator("outcrop-ruler .outcrop-host .ruler").first()).toBeVisible();
        await expect(page.locator(`head link[href="${ORIGIN}/css/custom.css"]`)).toHaveCount(0);
    });

    test("errors: a bound value that fails its schema is VALIDATION_FAILED with its path", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "StickyNote", collapsed: { path: "/c" } }, { c: "yes" }));

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED", path: "/c" })]);
    });

    test("errors: an assetBaseUrl that serves nothing is OUTCROP_ASSET_LOAD_FAILED", async ({ page }) =>
    {
        await open(page, "lit", { base: `${ORIGIN}/nothing-here` });
        await send(page, surface("s", { id: "root", component: "Ruler" }));

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "OUTCROP_ASSET_LOAD_FAILED" })]);
    });
});
