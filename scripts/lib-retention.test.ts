/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: LibRetention. The record of served /lib/ versions, the dates
 *    that move a version from current to deprecated to retired, the gates
 *    a build applies, and the notices every build publishes (#147).
 */

import { describe, expect, test } from "vitest";

import {
    addDays, currentProblems, daysUntil, dueSoon, headerRules, noticeData, noticeMarkdown, overdue,
    retainedPath, retainedProblems, sriOf, summaryLines,
} from "./lib-retention.mjs";

const A = sriOf(Buffer.from("a"));
const B = sriOf(Buffer.from("b"));

/** A record with one current asset, one deprecated single file, one deprecated tree and two retirements. */
function record()
{
    return {
        current: {
            signalr: { version: "10.0.11", files: { "/lib/signalr-10.0.11.js": A } },
        },
        deprecated: [
            { asset: "signalr", version: "8.0.0", url: "/lib/signalr-8.0.0.js", integrity: B,
                files: { "/lib/signalr-8.0.0.js": B }, packages: { "@microsoft/signalr": "8.0.0" },
                deprecatedOn: "2026-12-01", retireAfter: "2027-01-30",
                replacement: "/lib/signalr-10.0.11.js", reason: "Client 10 | server 10" },
            { asset: "font-awesome", version: "6.5.1", url: "/lib/font-awesome-6.5.1/css/all.min.css",
                integrity: A, files: { "/lib/font-awesome-6.5.1/css/all.min.css": A,
                    "/lib/font-awesome-6.5.1/webfonts/fa-solid-900.woff2": B },
                packages: { "@fortawesome/fontawesome-free": "6.5.1" },
                deprecatedOn: "2026-11-20", retireAfter: "2027-01-19", replacement: null,
                reason: "Removed" },
        ],
        retired: [
            { asset: "marked", version: "18.0.12", url: "/lib/marked-18.0.12.js", retiredOn: "2026-11-13",
                replacement: "/lib/marked-18.1.3.js", reason: "Bug fixes (#164)" },
            { asset: "old", version: "1.0.0", url: "/lib/old-1.0.0.js", retiredOn: "2026-08-01",
                replacement: null, reason: "Long gone" },
        ],
    };
}

describe("dates", () =>
{
    test("addDays works in UTC across a month, a year and a leap day", () =>
    {
        expect(addDays("2026-12-01", 60)).toBe("2027-01-30");
        expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
        expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    });

    test("daysUntil counts whole days, and is negative once the date has passed", () =>
    {
        expect(daysUntil("2027-01-29", "2027-01-30")).toBe(1);
        expect(daysUntil("2027-01-30", "2027-01-30")).toBe(0);
        expect(daysUntil("2027-01-31", "2027-01-30")).toBe(-1);
    });

    test("an entry is overdue only after its retireAfter date", () =>
    {
        expect(overdue(record(), "2027-01-19")).toEqual([]);
        expect(overdue(record(), "2027-01-20").map((e) => e.asset)).toEqual(["font-awesome"]);
        expect(overdue(record(), "2027-01-31").map((e) => e.asset)).toEqual(["signalr", "font-awesome"]);
    });

    test("an entry is due soon within 14 days of retiring", () =>
    {
        expect(dueSoon(record(), "2027-01-04")).toEqual([]);
        expect(dueSoon(record(), "2027-01-05").map((e) => e.asset)).toEqual(["font-awesome"]);
        expect(dueSoon(record(), "2027-01-20").map((e) => e.asset)).toEqual(["signalr"]);
    });
});

describe("retainedPath", () =>
{
    test("maps a served /lib/ path into cdn/lib-retained", () =>
    {
        expect(retainedPath("/lib/signalr-8.0.0.js")).toBe("cdn/lib-retained/signalr-8.0.0.js");
        expect(() => retainedPath("/css/custom.css")).toThrow(/not a \/lib\/ path/);
    });
});

describe("currentProblems", () =>
{
    const built = (version: string, files: Record<string, string>) => ({ signalr: { version, files } });

    test("a build that matches the record has no problems", () =>
    {
        expect(currentProblems(record(), built("10.0.11", { "/lib/signalr-10.0.11.js": A }))).toEqual([]);
    });

    test("the same version with other bytes fails, naming the file", () =>
    {
        const problems = currentProblems(record(), built("10.0.11", { "/lib/signalr-10.0.11.js": B }));

        expect(problems).toEqual([expect.stringMatching(/\/lib\/signalr-10\.0\.11\.js changed.*same URL/)]);
    });

    test("a file added or dropped under the same version fails", () =>
    {
        expect(currentProblems(record(), built("10.0.11", {}))[0]).toMatch(/signalr-10\.0\.11\.js is no longer/);
        expect(currentProblems(record(), built("10.0.11",
            { "/lib/signalr-10.0.11.js": A, "/lib/extra.js": A }))[0]).toMatch(/\/lib\/extra\.js is new/);
    });

    test("a new version without a deprecation fails, naming lib:deprecate", () =>
    {
        const problems = currentProblems(record(), built("10.1.0", { "/lib/signalr-10.1.0.js": A }));

        expect(problems).toEqual([expect.stringMatching(/10\.0\.11 to 10\.1\.0.*npm run lib:deprecate -- signalr/)]);
    });

    test("an asset the record lacks fails, naming lib:record", () =>
    {
        const problems = currentProblems(record(), { ...built("10.0.11", { "/lib/signalr-10.0.11.js": A }),
            katex: { version: "0.19.0", files: { "/lib/katex-0.19.0.js": A } } });

        expect(problems).toEqual([expect.stringMatching(/katex.*npm run lib:record/)]);
    });

    test("a recorded asset no longer built fails, naming lib:deprecate", () =>
    {
        expect(currentProblems(record(), {})).toEqual([expect.stringMatching(/signalr.*npm run lib:deprecate -- signalr/)]);
    });
});

describe("retainedProblems", () =>
{
    const disk = (files: Record<string, Buffer>) => ({
        read: (served: string) => files[served] ?? null,
        list: () => Object.keys(files),
    });
    const all = {
        "/lib/signalr-8.0.0.js": Buffer.from("b"),
        "/lib/font-awesome-6.5.1/css/all.min.css": Buffer.from("a"),
        "/lib/font-awesome-6.5.1/webfonts/fa-solid-900.woff2": Buffer.from("b"),
    };

    test("frozen files that match the record have no problems", () =>
    {
        const { read, list } = disk(all);

        expect(retainedProblems(record(), read, list)).toEqual([]);
    });

    test("a missing, a changed and an extra file each fail", () =>
    {
        const { read, list } = disk({ ...all, "/lib/signalr-8.0.0.js": Buffer.from("x"),
            "/lib/stray.js": Buffer.from("s") });
        const missing = disk({ "/lib/signalr-8.0.0.js": Buffer.from("b") });

        expect(retainedProblems(record(), read, list)).toEqual([
            expect.stringMatching(/signalr-8\.0\.0\.js does not match/),
            expect.stringMatching(/stray\.js is in cdn\/lib-retained but no deprecated entry/),
        ]);
        expect(retainedProblems(record(), missing.read, missing.list)).toEqual([
            expect.stringMatching(/all\.min\.css is missing/),
            expect.stringMatching(/fa-solid-900\.woff2 is missing/),
        ]);
    });
});

describe("noticeData", () =>
{
    const assets = { signalr: { version: "10.0.11", url: "/lib/signalr-10.0.11.js" } };
    const notice = noticeData(record(), assets, "2026-12-15", "2026-12-15T10:00:00.000Z");

    test("states the policy and the current versions from the manifest", () =>
    {
        expect(notice.policy).toEqual({ retainDays: 60, listRetiredDays: 90 });
        expect(notice.current).toEqual({ signalr: { version: "10.0.11", url: "/lib/signalr-10.0.11.js" } });
        expect(notice.generated).toBe("2026-12-15T10:00:00.000Z");
    });

    test("gives each deprecated version its days remaining", () =>
    {
        expect(notice.deprecated.map((e: { daysRemaining: number }) => e.daysRemaining)).toEqual([46, 35]);
        expect(notice.deprecated[0]).toEqual(expect.objectContaining({ url: "/lib/signalr-8.0.0.js",
            integrity: B, retireAfter: "2027-01-30", replacement: "/lib/signalr-10.0.11.js" }));
        expect(notice.deprecated[0]).not.toHaveProperty("files");
    });

    test("lists retirements from the last 90 days only", () =>
    {
        expect(notice.retired.map((e: { asset: string }) => e.asset)).toEqual(["marked"]);
    });
});

describe("headerRules", () =>
{
    const notice = noticeData(record(), {}, "2026-12-15", "2026-12-15T10:00:00.000Z");
    const rules = headerRules(notice, record());

    test("a single file gets an exact rule with Deprecation, Sunset and a successor Link", () =>
    {
        expect(rules).toContain([
            "/lib/signalr-8.0.0.js",
            `  Deprecation: @${Date.UTC(2026, 11, 1) / 1000}`,
            "  Sunset: Sat, 30 Jan 2027 00:00:00 GMT",
            '  Link: </lib/signalr-10.0.11.js>; rel="successor-version"',
        ].join("\n"));
    });

    test("a tree gets one wildcard rule, and no Link when nothing replaces it", () =>
    {
        expect(rules).toContain("/lib/font-awesome-6.5.1/*\n  Deprecation: @");
        expect(rules.split("/lib/font-awesome-6.5.1/*")[1]).not.toMatch(/^[^/]*Link:/);
    });

    test("a notice entry the record lacks is an error", () =>
    {
        expect(() => headerRules(notice, { ...record(), deprecated: [] })).toThrow(/record does not/);
    });
});

describe("noticeMarkdown and summaryLines", () =>
{
    const assets = { signalr: { version: "10.0.11", url: "/lib/signalr-10.0.11.js" } };
    const notice = noticeData(record(), assets, "2027-01-10", "2027-01-10T00:00:00.000Z");

    test("the page carries an agent header and every deprecated version with its days left", () =>
    {
        const md = noticeMarkdown(notice);

        expect(md.startsWith("<!-- AGENT:")).toBe(true);
        expect(md).toContain("| signalr | 8.0.0 | `/lib/signalr-8.0.0.js` | 2027-01-30 | 20 |");
        expect(md).toContain("Client 10 \\| server 10");
        expect(md).toContain("| font-awesome | 6.5.1 | `/lib/font-awesome-6.5.1/css/all.min.css` | 2027-01-19 | 9 | none |");
        expect(md).toContain("| marked | 18.0.12 |");
    });

    test("the build log counts every state and warns for a version near its date", () =>
    {
        const lines = summaryLines(notice, "2027-01-10");

        expect(lines[0]).toBe("[lib] 1 current, 2 deprecated, 1 retired in the last 90 days");
        expect(lines).toContain("[lib] WARNING: font-awesome 6.5.1 retires in 9 days (after 2027-01-19)");
        expect(lines.some((l: string) => l.includes("WARNING: signalr"))).toBe(false);
    });
});
