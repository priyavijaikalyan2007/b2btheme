/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: cdn/not-found-worker.mjs, and that wrangler.jsonc runs it.
 *    A 404 used to take the cache rule of its path, so a miss under /lib/
 *    was immutable for a year (specs/bugreports/2026-11-14-lib-404-caching-
 *    and-deprecation-notice-timing.md, item 1).
 */
// @vitest-environment node

import fs from "node:fs";

import worker from "../cdn/not-found-worker.mjs";

describe("not-found Worker", () =>
{
    test("answers 404 that no cache stores, under /lib/ too", async () =>
    {
        const res = worker.fetch(new Request("https://static.knobby.io/lib/katex-9.9.9.js"));

        expect(res.status).toBe(404);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(res.headers.get("Cache-Control")).not.toContain("immutable");
        expect(await res.text()).toBe("Not Found\n");
    });

    test("sends CORS, so an SRI request sees the 404 rather than a CORS error", () =>
    {
        const res = worker.fetch(new Request("https://static.knobby.io/lib/katex-9.9.9.js"));

        expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
        expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    test("a HEAD gets the same headers and no body", async () =>
    {
        const res = worker.fetch(new Request("https://static.knobby.io/css/nope.css", { method: "HEAD" }));

        expect(res.status).toBe(404);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(await res.text()).toBe("");
    });

    test("wrangler.jsonc runs it beside the assets", () =>
    {
        const config = fs.readFileSync("wrangler.jsonc", "utf8");

        expect(config).toMatch(/"main":\s*"\.\/cdn\/not-found-worker\.mjs"/);
        expect(config).toMatch(/"directory":\s*"\.\/dist\/"/);
        expect(config).not.toMatch(/run_worker_first/);
    });
});
