/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: rules in cdn/_headers that the e2e server cannot show, because
 *    it serves dist/ without them.
 *    - /icons/bootstrap-icons.css sends CORS like its fonts and the icon
 *      packs, so `crossorigin` does not drop it (apps report 2026-11-14,
 *      item 3).
 */
// @vitest-environment node

import fs from "node:fs";

/** The headers each path pattern sets: Cloudflare's format, a pattern then indented "Name: value" lines. */
function parseHeaders(text: string): Map<string, Map<string, string>>
{
    const rules = new Map<string, Map<string, string>>();
    let current: Map<string, string> | null = null;

    for (const line of text.split("\n"))
    {
        if (line.trim() === "" || line.startsWith("#")) { continue; }

        if (!line.startsWith(" "))
        {
            current = new Map();
            rules.set(line.trim(), current);
            continue;
        }

        const at = line.indexOf(":");
        current?.set(line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim());
    }

    return rules;
}

describe("cdn/_headers", () =>
{
    const rules = parseHeaders(fs.readFileSync("cdn/_headers", "utf8"));

    test("the Bootstrap Icons stylesheet sends CORS, like its fonts", () =>
    {
        expect(rules.get("/icons/bootstrap-icons.css")?.get("access-control-allow-origin")).toBe("*");
        expect(rules.get("/icons/fonts/*")?.get("access-control-allow-origin")).toBe("*");
    });

    test("the stylesheet keeps the default cache, as it changes in place", () =>
    {
        expect(rules.get("/icons/bootstrap-icons.css")?.has("cache-control")).toBe(false);
    });
});
