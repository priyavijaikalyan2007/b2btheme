/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: SpineMap inert text extraction (end to end)
 *
 * SEC-2 (ADR-165) moved `stripHtmlTags` from a detached `<div>` to a
 * `<template>`, because a template parses into an inert document with no
 * browsing context. The unit suite cannot tell the two apart: with the
 * detached `<div>` restored, all seventy-five tests in `spinemap.test.ts`
 * still pass, since jsdom starts no image load and runs no event handler.
 *
 * So the two assertions that matter live here. The first counts requests
 * for the payload's image, which needs no timing assumption: the old code
 * made one, the new code makes none. The second asserts no handler ran, and
 * carries a positive control in the same page, so the wait cannot be too
 * short to see a handler that did fire.
 */

import { test, expect } from "@playwright/test";

const PAGE = "/demo/components/spinemap.html";
const BUNDLE = "/components/spinemap/spinemap.js";
const PROBE = "/does-not-exist-sec2.png";

/** A stored field value that tries to run script when it is parsed. */
const HOSTILE_VALUE = `<img src="${PROBE}" onerror="window.__sec2 = 1">Desc`;

/** The same shape, for the control, so a fired handler is observable. */
const CONTROL_VALUE =
    `<img src="${PROBE}?control" onerror="window.__sec2ctl = 1">Ctl`;

test.describe("SpineMap — a field value is never parsed in the live document", () =>
{
    test("no request is made for the payload's image", async ({ page }) =>
    {
        let hits = 0;

        await page.route(`**${PROBE}**`, (route) =>
        {
            hits += 1;
            return route.fulfill({ status: 404, body: "" });
        });

        await page.goto(PAGE);
        await page.addScriptTag({ url: BUNDLE });
        await page.waitForFunction(
            () => typeof (window as any).createSpineMap === "function");

        await page.evaluate((value) =>
        {
            const host = document.createElement("div");

            host.id = "sec2-host";
            host.style.width = "800px";
            host.style.height = "600px";
            document.body.appendChild(host);

            const map = (window as any).createSpineMap({
                container: host,
                data: {
                    hubs: [{
                        id: "solo",
                        label: "Solo Hub",
                        status: "available",
                        branches: [],
                        metadata: { notes: value },
                    }],
                },
                popoverFields: [{
                    key: "notes",
                    label: "Notes",
                    type: "richtextinput",
                    source: "metadata",
                }],
            });

            (map.getElement()
                .querySelector("[data-id='solo']") as SVGGElement)
                .dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }, HOSTILE_VALUE);

        // The popover rendered the value as plain text.
        const value = page.locator(".spinemap-popover .spinemap-popover-value")
            .filter({ hasText: "Desc" });

        await expect(value).toHaveCount(1);
        await expect(value).toHaveText("Desc");

        // Positive control: the same payload through a live-document parse,
        // in this page, with the same wait. If this does not fire, the wait
        // below proves nothing and the test fails here instead of passing
        // for the wrong reason.
        const control = await page.evaluate(async (ctl) =>
        {
            const probe = document.createElement("div");

            document.body.appendChild(probe);
            probe.innerHTML = ctl;

            await new Promise((r) => setTimeout(r, 2000));

            return (window as any).__sec2ctl;
        }, CONTROL_VALUE);

        expect(control).toBe(1);

        // The payload's handler never ran, and no element from it exists.
        expect(await page.evaluate(() => (window as any).__sec2))
            .toBeUndefined();
        await expect(page.locator(".spinemap-popover img")).toHaveCount(0);
        await expect(page.locator(".spinemap-popover [onerror]"))
            .toHaveCount(0);

        // One request, from the control alone. The field value made none.
        expect(hits).toBe(1);
    });

    test("the same value parsed in a detached div does request and fire",
        async ({ page }) =>
        {
            let hits = 0;

            await page.route(`**${PROBE}**`, (route) =>
            {
                hits += 1;
                return route.fulfill({ status: 404, body: "" });
            });

            await page.goto(PAGE);

            // Characterisation of the defect in the same engine, so the test
            // above cannot pass because the scenario failed to reproduce.
            // This is the old implementation of stripHtmlTags, byte for byte.
            const fired = await page.evaluate(async (value) =>
            {
                const tmp = document.createElement("div");

                tmp.innerHTML = value;

                const text = tmp.textContent || tmp.innerText || "";

                await new Promise((r) => setTimeout(r, 2000));

                return { text, flag: (window as any).__sec2 };
            }, HOSTILE_VALUE);

            // It extracted the right text. The output was never the defect.
            expect(fired.text).toBe("Desc");

            // It also started a load and ran the handler, with the element
            // detached from the document the whole time.
            expect(fired.flag).toBe(1);
            expect(hits).toBe(1);
        });
});
