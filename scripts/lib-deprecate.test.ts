/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: LibDeprecate and LibRetire. Deprecating freezes the old version's
 *    bytes from the live CDN only when every hash matches, and retiring
 *    deletes them and lists the version as retired (#147).
 *
 * @vitest-environment node
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, test } from "vitest";

import { deprecate } from "./lib-deprecate.mjs";
import { retire } from "./lib-retire.mjs";
import { sriOf } from "./lib-retention.mjs";

const OLD = Buffer.from("signalr 8 bytes");
const ORIGIN = "https://cdn.test";
const NEXT = { version: "10.0.11", namedBy: "@microsoft/signalr" };
let root: string;

/** A record with signalr 8.0.0 current, and one retirement 100 days before 2027-03-01. */
function seed(): void
{
    fs.mkdirSync(path.join(root, "cdn"), { recursive: true });
    fs.writeFileSync(path.join(root, "cdn/lib-versions.json"), JSON.stringify({
        current: { signalr: { version: "8.0.0", files: { "/lib/signalr-8.0.0.js": sriOf(OLD) } } },
        deprecated: [],
        retired: [{ asset: "gone", version: "1.0.0", url: "/lib/gone-1.0.0.js", retiredOn: "2026-11-21",
            replacement: null, reason: "Old" }],
    }));
}

const readRecord = () => JSON.parse(fs.readFileSync(path.join(root, "cdn/lib-versions.json"), "utf8"));

/** A fetch that serves the live manifest and the given body for the signalr file. */
function liveFetch(body: Buffer, liveVersion = "8.0.0")
{
    return async (url: string) =>
    {
        if (url === `${ORIGIN}/lib-manifest.json`)
        {
            const manifest = { assets: { signalr: { version: liveVersion, url: `/lib/signalr-${liveVersion}.js`,
                integrity: sriOf(OLD), packages: { "@microsoft/signalr": liveVersion } } } };

            return new Response(JSON.stringify(manifest));
        }

        return url === `${ORIGIN}/lib/signalr-8.0.0.js` ? new Response(body) : new Response("", { status: 404 });
    };
}

beforeEach(() =>
{
    root = fs.mkdtempSync(path.join(os.tmpdir(), "lib-deprecate-"));
    seed();
});

describe("deprecate", () =>
{
    test("freezes the old bytes and records the deprecation for 60 days", async () =>
    {
        const entry = await deprecate("signalr", { fetchImpl: liveFetch(OLD), today: "2026-12-01",
            reason: "Client 10 (#145)", root, origin: ORIGIN, next: NEXT });

        expect(fs.readFileSync(path.join(root, "cdn/lib-retained/signalr-8.0.0.js"))).toEqual(OLD);
        expect(entry).toEqual({ asset: "signalr", version: "8.0.0", url: "/lib/signalr-8.0.0.js",
            integrity: sriOf(OLD), files: { "/lib/signalr-8.0.0.js": sriOf(OLD) },
            packages: { "@microsoft/signalr": "8.0.0" }, deprecatedOn: "2026-12-01", retireAfter: "2027-01-30",
            replacement: null, reason: "Client 10 (#145)" });
        expect(readRecord().deprecated).toEqual([entry]);
        expect(readRecord().current).toEqual({});
    });

    test("a live file that does not match its hash changes nothing", async () =>
    {
        const before = fs.readFileSync(path.join(root, "cdn/lib-versions.json"), "utf8");

        await expect(deprecate("signalr", { fetchImpl: liveFetch(Buffer.from("other")), today: "2026-12-01",
            reason: "r", root, origin: ORIGIN, next: NEXT })).rejects.toThrow(/does not match its recorded hash/);
        expect(fs.readFileSync(path.join(root, "cdn/lib-versions.json"), "utf8")).toBe(before);
        expect(fs.existsSync(path.join(root, "cdn/lib-retained"))).toBe(false);
    });

    test("a live version other than the recorded one changes nothing", async () =>
    {
        await expect(deprecate("signalr", { fetchImpl: liveFetch(OLD, "9.0.0"), today: "2026-12-01",
            reason: "r", root, origin: ORIGIN, next: NEXT })).rejects.toThrow(/serves signalr 9\.0\.0.*records 8\.0\.0/);
    });

    test("a version that has not moved is refused before anything changes", async () =>
    {
        await expect(deprecate("signalr", { fetchImpl: liveFetch(OLD), today: "2026-12-01", reason: "r", root,
            origin: ORIGIN, next: { version: "8.0.0", namedBy: "@microsoft/signalr" } }))
            .rejects.toThrow(/signalr is still 8\.0\.0.*Bump @microsoft\/signalr/);
        expect(fs.existsSync(path.join(root, "cdn/lib-retained"))).toBe(false);
    });

    test("an asset the record does not have, or no reason, is an error", async () =>
    {
        await expect(deprecate("nope", { fetchImpl: liveFetch(OLD), today: "2026-12-01", reason: "r", root,
            origin: ORIGIN, next: NEXT })).rejects.toThrow(/nope is not a current asset/);
        await expect(deprecate("signalr", { fetchImpl: liveFetch(OLD), today: "2026-12-01", reason: "", root,
            origin: ORIGIN, next: NEXT })).rejects.toThrow(/needs a reason/);
    });
});

describe("retire", () =>
{
    test("deletes the frozen bytes, lists the version as retired, and prunes old retirements", async () =>
    {
        const entry = await deprecate("signalr", { fetchImpl: liveFetch(OLD), today: "2026-12-01",
            reason: "Client 10", root, origin: ORIGIN, next: NEXT });
        const record = readRecord();

        record.deprecated[0].replacement = "/lib/signalr-10.0.11.js";
        fs.writeFileSync(path.join(root, "cdn/lib-versions.json"), JSON.stringify(record));

        const retired = retire("signalr", "8.0.0", { today: "2027-03-01", root });

        expect(fs.existsSync(path.join(root, "cdn/lib-retained/signalr-8.0.0.js"))).toBe(false);
        expect(retired).toEqual({ asset: "signalr", version: "8.0.0", url: entry.url, retiredOn: "2027-03-01",
            replacement: "/lib/signalr-10.0.11.js", reason: "Client 10" });
        expect(readRecord().deprecated).toEqual([]);
        expect(readRecord().retired).toEqual([retired]);
    });

    test("a version that is not deprecated is an error", () =>
    {
        expect(() => retire("signalr", "8.0.0", { today: "2027-03-01", root })).toThrow(/not deprecated/);
    });
});
