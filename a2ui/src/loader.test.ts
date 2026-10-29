/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiAdapter / Loader. Component scripts and stylesheets load once
 *    per page from the host-supplied assetBaseUrl; the base theme only when
 *    the host opts in with injectBaseTheme (spec §6.1).
 */

import { beforeEach, describe, expect, test } from "vitest";

import { loadAssets, resetLoaderForTests } from "./loader";

const BASE = "https://cdn.test";

function injected(): HTMLElement[]
{
    return [...document.head.querySelectorAll<HTMLElement>("script[src], link[rel=stylesheet]")];
}

function fire(type: "load" | "error"): void
{
    for (const el of injected()) { el.dispatchEvent(new Event(type)); }
}

beforeEach(() =>
{
    resetLoaderForTests();
    document.head.replaceChildren();
});

describe("loadAssets", () =>
{
    test("injects the script and stylesheet and resolves when both load", async () =>
    {
        const p = loadAssets(BASE, { js: "components/a/a.js", css: "components/a/a.css" }, false);

        expect(injected().map((e) => e.getAttribute("src") ?? e.getAttribute("href")))
            .toEqual(["https://cdn.test/components/a/a.js", "https://cdn.test/components/a/a.css"]);
        fire("load");
        await expect(p).resolves.toBeUndefined();
    });

    test("a classic script: neither async nor a module", () =>
    {
        void loadAssets(BASE, { js: "components/a/a.js" }, false);
        const script = document.head.querySelector("script")!;

        expect(script.async).toBe(false);
        expect(script.type).toBe("");
    });

    test("loads each URL once across many callers", () =>
    {
        void loadAssets(BASE, { js: "components/a/a.js" }, false);
        void loadAssets(BASE, { js: "components/a/a.js" }, false);

        expect(injected()).toHaveLength(1);
    });

    test("without css only a script is injected", () =>
    {
        void loadAssets(BASE, { js: "components/a/a.js" }, false);

        expect(injected().map((e) => e.tagName)).toEqual(["SCRIPT"]);
    });

    test("an error rejects with the URL and stays rejected", async () =>
    {
        const p = loadAssets(BASE, { js: "components/a/a.js" }, false);
        fire("error");

        await expect(p).rejects.toThrow(/Could not load https:\/\/cdn\.test\/components\/a\/a\.js/);
        await expect(loadAssets(BASE, { js: "components/a/a.js" }, false)).rejects.toThrow(/a\.js/);
    });

    test("injectBaseTheme adds custom.css once; false never does", () =>
    {
        void loadAssets(BASE, { js: "components/a/a.js" }, false);
        expect(document.head.querySelector('link[href$="/css/custom.css"]')).toBeNull();

        void loadAssets(BASE, { js: "components/a/a.js" }, true);
        void loadAssets(BASE, { js: "components/b/b.js" }, true);
        expect(document.head.querySelectorAll('link[href="https://cdn.test/css/custom.css"]')).toHaveLength(1);
    });

    test("dependencies are injected first, in order, libraries with integrity and CORS (ADR-230)", () =>
    {
        void loadAssets(BASE, { js: "components/v/v.js", deps: [
            { path: "lib/marked-18.0.12.js", integrity: "sha384-AAA" },
            { path: "lib/katex-css-0.19.0/katex.min.css", integrity: "sha384-BBB" },
            { path: "components/m/m.js" }] }, false);

        const els = injected();

        expect(els.map((e) => e.getAttribute("src") ?? e.getAttribute("href"))).toEqual([
            "https://cdn.test/lib/marked-18.0.12.js", "https://cdn.test/lib/katex-css-0.19.0/katex.min.css",
            "https://cdn.test/components/m/m.js", "https://cdn.test/components/v/v.js"]);
        expect(els.map((e) => [e.getAttribute("integrity"), e.getAttribute("crossorigin")])).toEqual([
            ["sha384-AAA", "anonymous"], ["sha384-BBB", "anonymous"], [null, null], [null, null]]);
    });

    test("a dependency two components share loads once, and its failure rejects both", async () =>
    {
        const dep = { path: "components/m/m.js" };
        const a = loadAssets(BASE, { js: "components/a/a.js", deps: [dep] }, false);
        const b = loadAssets(BASE, { js: "components/b/b.js", deps: [dep] }, false);

        expect(document.head.querySelectorAll('script[src="https://cdn.test/components/m/m.js"]')).toHaveLength(1);
        document.head.querySelector('script[src$="/m.js"]')!.dispatchEvent(new Event("error"));

        await expect(a).rejects.toThrow(/m\.js/);
        await expect(b).rejects.toThrow(/m\.js/);
    });

    test("a trailing slash or a relative base is a literate throw", () =>
    {
        expect(() => loadAssets("https://cdn.test/", { js: "x.js" }, false)).toThrow(/trailing slash/);
        expect(() => loadAssets("/dist", { js: "x.js" }, false)).toThrow(/absolute http\(s\): or file: URL/);
    });
});
