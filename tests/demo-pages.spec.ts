/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Every demo page loads, and loads clean. ADR-205.
 *
 * WHY THIS EXISTS
 * ---------------
 * 129 demo pages shipped. Eight of them were ever opened in a browser by
 * anything in this repository, and those eight were the subject of a
 * hand-written spec. Structure checks [4] and [5] look like coverage and
 * are not: they ask whether a file exists on disk, never whether the page
 * made of those files works.
 *
 * The repository has been burned by exactly this twice, and both are on
 * the record. DEBT-DE-1 was a suite that spent months green while pointed
 * at a gallery index that loaded nothing. ADR-199 found a documented
 * driver.js version that HAD NEVER BEEN PUBLISHED, where the three demo
 * pages were right and the README was wrong, because nothing fetched
 * either one.
 *
 * WHAT IT FOUND ON ITS FIRST RUN. Four pages of 129, and every one was a
 * real defect rather than a flake:
 *
 *   markdowneditor        a MutationObserver called vditor.getValue()
 *                         before vditor had loaded its serialiser, and
 *                         then setValue() on a Vditor still constructing.
 *                         Four uncaught TypeErrors per load.
 *   dynamicformswitcher   `mount` handed a caller a host that was not in
 *                         the document, on three of four resolution paths.
 *   diagramengine         the embed probe had no strategy for a factory
 *                         that mounts itself, so a WORKING MarkdownEditor
 *                         embed threw on every render.
 *   docklayout            slots mount from the constructor, before the
 *                         grid is in the document (DEBT-DL-1).
 *
 * WHAT IT DOES NOT DO. It is a smoke gate. It asserts that a page loads,
 * says nothing on the console, requests nothing that 404s, and registers
 * the component it is named after. It asserts nothing about behaviour,
 * and a page can be badly wrong while passing every line of this file.
 *
 * NETWORK. This suite is a LOCAL gate and is not wired into CI, which runs
 * no browser today. It still needs the network, but NOT for CodeMirror any
 * more: ADR-211 vendored those fourteen packages into one hashed file on
 * this origin. What remains is `guidedtour.html` loading driver.js from
 * jsdelivr, and Google Fonts on most pages.
 */

import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { createRequire } from "node:module";

// The same reader the published API reference is graded with, rather than
// a second opinion about what a component registers (DEBT-DOC-1).
// `__filename` rather than `import.meta.url`, because Playwright compiles
// this file to CommonJS and import.meta is a syntax error there.
const { extractGlobals } = createRequire(__filename)(
    "../scripts/generate-docs.js");

/**
 * Tracked demo pages, from git rather than from `dist`.
 *
 * Enumerating the BUILT directory would hide a page the copy step dropped,
 * which is the failure mode this whole file is about. `_`-prefixed files
 * are templates, and structure check [4] skips them the same way.
 */
const PAGES: string[] = execFileSync(
    "git", ["ls-files", "demo/components/*.html"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((p) => !basename(p).startsWith("_"))
    // DEBT-DEMO-2. The flagship page is 855 KB, carries a section for
    // every component, and was in NEITHER this glob nor structure
    // check [5] — both iterate demo/components/*.html. Two unrelated
    // things had rotted in it: the deprecated workspaceswitcher path
    // (DEBT-TS-1) and a DocViewer section that threw on every load
    // because the page never loaded MarkdownRenderer. It is the page
    // a visitor is most likely to open.
    .concat(["demo/full-demo.html"]);

/** The globals the component of the same name registers, if there is one. */
function globalsFor(page: string): string[]
{
    const name = basename(page, ".html");
    const source = `components/${name}/${name}.ts`;

    // Several pages are not a component: `typography`, `colors` and the
    // `toolbar-basic` variant among them. They still have to load clean.
    if (!existsSync(source)) { return []; }

    return extractGlobals(readFileSync(source, "utf8")) as string[];
}

test.describe("every demo page loads clean", () =>
{
    test("the page list is not empty", () =>
    {
        // A `git ls-files` that matches nothing would make every test
        // below vacuous by simply not existing. ADR-196's lesson: a gate
        // that can pass by having no inputs has not been written yet.
        expect(PAGES.length).toBeGreaterThan(100);

        // DEBT-DEMO-2. The glob is what left the flagship page
        // untested for the life of this suite, so its presence is
        // asserted by name rather than left to a count.
        expect(PAGES).toContain("demo/full-demo.html");
    });

    for (const page of PAGES)
    {
        test(basename(page), async ({ page: browserPage }) =>
        {
            const consoleErrors: string[] = [];
            const pageErrors: string[] = [];
            const failedRequests: string[] = [];

            browserPage.on("console", (m) =>
            {
                if (m.type() === "error") { consoleErrors.push(m.text()); }
            });
            browserPage.on("pageerror", (e) => { pageErrors.push(e.message); });
            browserPage.on("requestfailed", (r) =>
            {
                failedRequests.push(
                    `${r.url()} (${r.failure()?.errorText ?? "failed"})`);
            });

            const response = await browserPage.goto("/" + page,
                { waitUntil: "load" });

            // Give deferred work — lazy module loads, `after` hooks, a
            // MutationObserver on the theme attribute — a chance to throw.
            // Every one of the four first findings surfaced in this window
            // rather than during load.
            await browserPage.waitForTimeout(400);

            expect(response?.status(), `${page} HTTP status`).toBe(200);
            expect(pageErrors, `${page} uncaught errors`).toEqual([]);
            expect(consoleErrors, `${page} console errors`).toEqual([]);
            expect(failedRequests, `${page} failed requests`).toEqual([]);

            // A page that loads silently and registers nothing is the
            // DEBT-DE-1 shape: it looks fine and demonstrates nothing.
            const expected = globalsFor(page);
            if (expected.length > 0)
            {
                const present = await browserPage.evaluate(
                    (names: string[]) => names.filter(
                        (n) => typeof (window as unknown as
                            Record<string, unknown>)[n] !== "undefined"),
                    expected);

                expect(present, `${page} registered none of ${expected.join(", ")}`)
                    .not.toEqual([]);
            }
        });
    }
});
