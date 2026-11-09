/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: The vditor-integrity entry (apps report
 *    2026-11-07-vditor-lazy-renderers-integrity). Every script and stylesheet
 *    Vditor adds for itself carries the hash of the served file and
 *    `crossorigin`. The browser refuses a changed chunk, MathJax is refused
 *    with a clear error, and MarkdownEditor works on this entry with no
 *    change. The test server is same-origin, so CORS is not exercised here.
 *    It is the /lib/* rule in cdn/_headers.
 */

import { test, expect, type Page } from "@playwright/test";

const TREE = "/lib/vditor-3.11.2/";

const MARKDOWN = [
    "# Title",
    "",
    "```mermaid",
    "graph TD",
    "  A-->B",
    "```",
    "",
    "$$",
    "e^{i\\pi}+1=0",
    "$$",
    "",
    "```js",
    "const x = 1;",
    "```",
].join("\n");

/** The page's errors: uncaught exceptions and console errors, as text. */
function collectErrors(page: Page): string[]
{
    const errors: string[] = [];

    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") { errors.push(m.text()); } });

    return errors;
}

/** A blank page on this origin with the entry loaded by its manifest hash. */
async function loadEntry(page: Page): Promise<void>
{
    await page.goto("/lib-manifest.json");
    await page.evaluate(async () =>
    {
        const manifest = await fetch("/lib-manifest.json").then((r) => r.json());
        const asset = manifest.assets["vditor-integrity"];

        await new Promise<void>((resolve, reject) =>
        {
            const script = Object.assign(document.createElement("script"),
                { src: asset.url, integrity: asset.integrity, crossOrigin: "anonymous" });

            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`${asset.url} did not load`));
            document.head.append(script);
        });
    });
}

/** Renders MARKDOWN with Vditor.preview() and the given math engine. */
async function preview(page: Page, engine: "KaTeX" | "MathJax"): Promise<void>
{
    await page.evaluate(({ markdown, engine, tree }) =>
    {
        const host = Object.assign(document.createElement("div"), { id: "preview" });

        document.body.append(host);
        (window as any).Vditor.preview(host, markdown, {
            cdn: location.origin + tree.replace(/\/$/, ""),
            mode: "light",
            hljs: { style: "github" },
            math: { engine },
        });
    }, { markdown: MARKDOWN, engine, tree: TREE });
}

/**
 * Each tag Vditor added for a file of the tree, with whether its integrity is
 * the SHA-384 of the bytes the server returns for it. Vditor's loaders give
 * every tag an id, so a tag with none is the page's own, such as the demo's
 * link to dist/index.css.
 */
async function treeTags(page: Page)
{
    return page.evaluate(async (tree) =>
    {
        const tags = [...document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>("script[src], link[href]")]
            .filter((el) => el.id !== ""
                && ((el as HTMLScriptElement).src || (el as HTMLLinkElement).href).includes(tree));

        return Promise.all(tags.map(async (el) =>
        {
            const url = (el as HTMLScriptElement).src || (el as HTMLLinkElement).href;
            const bytes = await fetch(url).then((r) => r.arrayBuffer());
            const digest = await crypto.subtle.digest("SHA-384", bytes);
            const expected = "sha384-" + btoa(String.fromCharCode(...new Uint8Array(digest)));

            return { id: el.id, matches: el.integrity === expected, crossOrigin: el.crossOrigin };
        }));
    }, TREE);
}

test.describe("vditor-integrity entry", () =>
{
    test("previewRendersMermaidKatexAndCode_EveryAddedTagCarriesItsHash", async ({ page }) =>
    {
        const errors = collectErrors(page);

        await loadEntry(page);
        await preview(page, "KaTeX");

        await expect(page.locator("#preview .katex").first()).toBeVisible();
        await expect(page.locator("#preview svg").first()).toBeVisible();
        await expect(page.locator("#preview pre code.hljs").first()).toBeVisible();

        const tags = await treeTags(page);

        expect(tags.map((t) => t.id)).toEqual(expect.arrayContaining([
            "vditorLuteScript", "vditorKatexScript", "vditorKatexStyle",
            "vditorHljsScript", "vditorHljsStyle", "vditorMermaidScript",
        ]));
        expect(tags.filter((t) => !t.matches || t.crossOrigin !== "anonymous")).toEqual([]);
        expect(errors).toEqual([]);
    });

    test("editorLoadsItsIconSetThroughTheCheckedLoader", async ({ page }) =>
    {
        const errors = collectErrors(page);

        await loadEntry(page);
        await page.evaluate((tree) => new Promise<void>((resolve) =>
        {
            const host = Object.assign(document.createElement("div"), { id: "editor" });

            document.body.append(host);
            new (window as any).Vditor(host, {
                cdn: location.origin + tree.replace(/\/$/, ""),
                mode: "ir", lang: "en_US", icon: "ant", value: "text", cache: { enable: false },
                after: () => resolve(),
            });
        }), TREE);

        // The icon set came through the synchronous loader before the patch.
        await expect(page.locator("#vditorIconScript")).toHaveCount(1);
        await expect.poll(() => page.locator("symbol[id^='vditor-icon']").count()).toBeGreaterThan(0);

        const tags = await treeTags(page);

        expect(tags.map((t) => t.id)).toEqual(expect.arrayContaining(["vditorLuteScript", "vditorIconScript"]));
        expect(tags.filter((t) => !t.matches || t.crossOrigin !== "anonymous")).toEqual([]);
        expect(errors).toEqual([]);
    });

    test("aChangedChunkIsRefused", async ({ page }) =>
    {
        const errors = collectErrors(page);

        await page.route(`**${TREE}dist/js/lute/lute.min.js*`, async (route) =>
        {
            const response = await route.fetch();

            await route.fulfill({ response, body: (await response.text()) + "\n;window.__tampered=1;" });
        });
        await loadEntry(page);
        await preview(page, "KaTeX");

        await expect.poll(() => errors.some((e) => /integrity/i.test(e) && e.includes("lute.min.js")))
            .toBe(true);
        expect(await page.evaluate(() => (window as any).__tampered)).toBeUndefined();
    });

    test("mathJaxIsRefusedWithAClearError", async ({ page }) =>
    {
        const errors = collectErrors(page);

        await loadEntry(page);
        await preview(page, "MathJax");

        await expect.poll(() => errors.some((e) => e.includes("[vditor-integrity] MathJax cannot be loaded")))
            .toBe(true);
        expect(await page.locator("#protyleMathJaxScript").count()).toBe(0);
    });

    test("markdownEditorRunsOnThisEntryUnchanged", async ({ page }) =>
    {
        const errors = collectErrors(page);

        await page.route("**/demo/components/markdowneditor.html", async (route) =>
        {
            const response = await route.fetch();
            const html = await response.text();
            const entry = '<script src="../../lib/vditor-3.11.2/dist/index.min.js"></script>';

            expect(html).toContain(entry);
            await route.fulfill({ response, body: html.replace(entry, '<script src="/lib/vditor-integrity-3.11.2.js"></script>') });
        });
        await page.goto("/demo/components/markdowneditor.html");

        await expect(page.locator("#vditorLuteScript")).toHaveCount(1);
        await expect(page.locator("#vditorIconScript")).toHaveCount(1);
        await expect.poll(() => page.locator("symbol[id^='vditor-icon']").count()).toBeGreaterThan(0);

        const tags = await treeTags(page);

        expect(tags.length).toBeGreaterThan(0);
        expect(tags.filter((t) => !t.matches || t.crossOrigin !== "anonymous")).toEqual([]);
        expect(errors).toEqual([]);
    });
});
