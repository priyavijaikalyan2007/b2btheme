/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: McpRendererPage. The renderer page a server returns as its ui://
 *    resource text (spec §5.3): absolute URLs only, pinned runtime with SRI
 *    before the view, and no theme of its own.
 */

import { describe, expect, test } from "vitest";

import { rendererHtml } from "./renderer.mjs";

const libs = [
    { url: "/lib/mcp-ext-apps-2.0.4.js", integrity: "sha384-AAA" },
    { url: "/lib/a2ui-runtime-0.14.0.js", integrity: "sha384-BBB" },
];

describe("rendererHtml", () =>
{
    const html = rendererHtml("https://static.outcrop.us", libs);
    const doc = new DOMParser().parseFromString(html, "text/html");

    test("loads the runtime with SRI and CORS, in order, then the view as a module", () =>
    {
        expect([...doc.querySelectorAll("script")].map((s) => [s.src, s.getAttribute("integrity"), s.crossOrigin, s.type])).toEqual([
            ["https://static.outcrop.us/lib/mcp-ext-apps-2.0.4.js", "sha384-AAA", "anonymous", ""],
            ["https://static.outcrop.us/lib/a2ui-runtime-0.14.0.js", "sha384-BBB", "anonymous", ""],
            ["https://static.outcrop.us/mcp/view/v1.js", null, null, "module"],
        ]);
    });

    test("links the base theme and Bootstrap Icons from the origin, and the fonts", () =>
    {
        expect([...doc.querySelectorAll("link[rel=stylesheet]")].map((l) => l.getAttribute("href"))).toEqual([
            expect.stringMatching(/^https:\/\/fonts\.googleapis\.com\/css2\?/),
            "https://static.outcrop.us/css/custom.css",
            "https://static.outcrop.us/icons/bootstrap-icons.css",
        ]);
    });

    test("every URL is absolute (hosts load the page by srcdoc) and nothing sets a theme", () =>
    {
        const urls = [...doc.querySelectorAll("[src], [href]")].map((el) => el.getAttribute("src") ?? el.getAttribute("href"));

        expect(urls.filter((url) => !url?.startsWith("https://"))).toEqual([]);
        expect(html).not.toMatch(/data-bs-theme|theme-init/);
        expect(doc.getElementById("outcrop-mcp")).not.toBeNull();
    });
});
