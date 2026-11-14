/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: LibNotices. Every build publishes the same retention data four
 *    ways: JSON and Markdown for agents, an HTML page for people, and
 *    Deprecation, Sunset and Link headers on each deprecated path (#147).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, test } from "vitest";

import { writeNotices } from "./lib-notices.mjs";

let root: string;

/** Writes a fixture tree: a record with one deprecated file, a manifest and a _headers source. */
function seed(headerRules = 2): void
{
    fs.mkdirSync(path.join(root, "cdn"), { recursive: true });
    fs.mkdirSync(path.join(root, "dist/docs"), { recursive: true });
    fs.writeFileSync(path.join(root, "cdn/lib-versions.json"), JSON.stringify({
        current: { signalr: { version: "10.0.11", files: { "/lib/signalr-10.0.11.js": "sha384-new" } } },
        deprecated: [{ asset: "signalr", version: "8.0.0", url: "/lib/signalr-8.0.0.js", integrity: "sha384-old",
            files: { "/lib/signalr-8.0.0.js": "sha384-old" }, packages: { "@microsoft/signalr": "8.0.0" },
            deprecatedOn: "2026-12-01", retireAfter: "2027-01-30", replacement: "/lib/signalr-10.0.11.js",
            reason: "Client 10 matches the server" }],
        retired: [],
    }));
    fs.writeFileSync(path.join(root, "dist/lib-manifest.json"), JSON.stringify({
        generated: "2027-01-20T08:00:00.000Z",
        assets: { signalr: { version: "10.0.11", url: "/lib/signalr-10.0.11.js" } },
    }));
    fs.writeFileSync(path.join(root, "cdn/_headers"),
        Array.from({ length: headerRules }, (_, i) => `/rule-${i}/*\n  Cache-Control: no-cache\n`).join("\n"));
}

const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

beforeEach(() =>
{
    root = fs.mkdtempSync(path.join(os.tmpdir(), "lib-notices-"));
});

describe("writeNotices", () =>
{
    test("writes the JSON, the Markdown, the HTML page and the header rules", () =>
    {
        seed();
        const lines = writeNotices({ root, today: "2027-01-20" });
        const json = JSON.parse(read("dist/lib-deprecations.json"));

        expect(json.policy).toEqual({ retainDays: 60, listRetiredDays: 90 });
        expect(json.generated).toBe("2027-01-20T08:00:00.000Z");
        expect(json.deprecated).toEqual([expect.objectContaining({ asset: "signalr", version: "8.0.0",
            daysRemaining: 10, replacement: "/lib/signalr-10.0.11.js" })]);
        expect(read("dist/lib-deprecations.md")).toContain("| signalr | 8.0.0 | `/lib/signalr-8.0.0.js` | 2027-01-30 | 10 |");
        expect(read("dist/docs/lib-deprecations.html")).toMatch(/<title>\/lib\/ deprecations[\s\S]*<table class=/);
        expect(read("dist/_headers")).toContain("/rule-1/*\n  Cache-Control: no-cache");
        expect(read("dist/_headers")).toContain("/lib/signalr-8.0.0.js\n  Deprecation: @1796083200\n"
            + "  Sunset: Sat, 30 Jan 2027 00:00:00 GMT");
        expect(lines).toContain("[lib] WARNING: signalr 8.0.0 retires in 10 days (after 2027-01-30)");
    });

    test("running twice gives the same _headers, built from the source", () =>
    {
        seed();
        writeNotices({ root, today: "2027-01-20" });
        const once = read("dist/_headers");

        writeNotices({ root, today: "2027-01-20" });
        expect(read("dist/_headers")).toBe(once);
    });

    test("more rules than Cloudflare allows is an error", () =>
    {
        seed(100);
        expect(() => writeNotices({ root, today: "2027-01-20" })).toThrow(/101 _headers rules.*limit of 100/);
    });
});
