/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: MarkdownRenderer PlantUML diagrams (end to end)
 *
 * SEC-3 (ADR-164) made a PlantUML reply load as an image through a data URL,
 * because a browser runs no script in an SVG that it loads as an image. Two
 * halves of that claim need a real engine, and the unit suite cannot assert
 * either one. jsdom loads no image, so `naturalWidth` is always 0 and a
 * data URL the browser refuses would still look correct there. jsdom also
 * runs no event handler from an image load, so "the handler did not fire"
 * passes in jsdom whether or not the markup was parsed.
 *
 * The spec serves its own stubbed PlantUML reply through page.route and
 * supplies a minimal `window.marked`, which is the contract the component
 * already states: the consumer provides marked.
 */

import { test, expect } from "@playwright/test";

const PAGE = "/demo/components/markdowneditor.html";
const BUNDLE = "/components/markdownrenderer/markdownrenderer.js";

const PLACEHOLDER = '<div class="md-diagram md-diagram-plantuml" '
    + 'data-lang="plantuml" data-source="@startuml A-&gt;B @enduml"></div>';

/** An SVG that draws a visible square and tries to run script on load. */
const HOSTILE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" '
    + 'width="120" height="80" viewBox="0 0 120 80">'
    + '<rect width="120" height="80" fill="#4169e1"/>'
    + '<image href="/does-not-exist.png" onerror="window.__sec3 = 1"/>'
    + '<script>window.__sec3 = 2;</script>'
    + '</svg>';

test.describe("MarkdownRenderer — a PlantUML reply renders as an inert image", () =>
{
    test("the diagram decodes and the reply's script never runs", async ({ page }) =>
    {
        await page.route("**/plantuml/**", (route) => route.fulfill({
            status: 200,
            contentType: "image/svg+xml",
            body: HOSTILE_SVG,
        }));

        await page.goto(PAGE);
        await page.addScriptTag({ url: BUNDLE });
        await page.waitForFunction(
            () => typeof (window as any).createMarkdownRenderer === "function");

        await page.evaluate((html) =>
        {
            (window as any).marked = { parse: () => html, use: () => undefined };

            const host = document.createElement("div");

            host.id = "sec3-host";
            document.body.appendChild(host);
            (window as any).createMarkdownRenderer({ plantuml: true })
                .render("diagram", host);
        }, PLACEHOLDER);

        const img = page.locator("#sec3-host .md-diagram-plantuml img");

        await expect(img).toHaveCount(1);

        // The browser decoded the data URL. jsdom cannot answer this, and a
        // data URL it refused would leave naturalWidth at 0.
        await expect.poll(async () => await img.evaluate(
            (el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

        const box = await img.boundingBox();

        expect(box?.width).toBeGreaterThan(0);
        expect(box?.height).toBeGreaterThan(0);

        // Neither the inline handler nor the script element ran, because the
        // reply was never parsed as markup.
        expect(await page.evaluate(() => (window as any).__sec3)).toBeUndefined();

        // Nothing from the reply exists as an element in the page.
        await expect(page.locator("#sec3-host svg")).toHaveCount(0);
        await expect(page.locator("#sec3-host [onerror]")).toHaveCount(0);

        // The payload is intact inside the data URL. The defect is closed by
        // never parsing the markup, not by filtering it.
        const src = await img.getAttribute("src");

        expect(src?.startsWith("data:image/svg+xml;base64,")).toBe(true);
        expect(atob((src ?? "").split(",")[1])).toContain("onerror");
    });

    test("the same reply assigned to innerHTML does run the handler", async ({ page }) =>
    {
        await page.goto(PAGE);

        // Characterisation of the defect in the same engine, so the test
        // above cannot pass because the scenario failed to reproduce. An
        // image that fails to load fires onerror even though innerHTML never
        // runs a script element.
        const fired = await page.evaluate(async (svg) =>
        {
            const host = document.createElement("div");

            document.body.appendChild(host);
            host.innerHTML = svg;

            await new Promise((r) => setTimeout(r, 1500));

            return (window as any).__sec3;
        }, HOSTILE_SVG);

        expect(fired).toBe(1);
    });
});
