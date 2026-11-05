/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * @vitest-environment node
 *
 * ⚓ TESTS: AuditExceptions (ADR-252). The real list is well formed and
 *    every ADR it names exists; malformed entries are refused, not ignored.
 */

import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import { AUDIT_EXCEPTIONS, findException, isExpired, MAX_REVIEW_DAYS, validateExceptions }
    from "./audit-exceptions.mjs";

const ADRS = new Set([...readFileSync("agentknowledge/decisions.yaml", "utf8").matchAll(/^- id: (ADR-\d+)$/gm)]
    .map((match) => match[1]));

const GOOD = { advisory: "GHSA-mrhx-c7xc-m3w5", package: "zod", version: "3.25.76", reason: "rejected CVE",
    evidence: ["https://www.cve.org/CVERecord?id=CVE-2023-54404"], decided: "2026-11-05", reviewBy: "2027-02-03",
    adr: "ADR-252" };

/** The validation message for one entry, or "" when it is accepted. */
function refusal(entry: Record<string, unknown>): string
{
    try { validateExceptions([entry], ADRS); return ""; }
    catch (err) { return String((err as Error).message); }
}

describe("audit exceptions", () =>
{
    test("the real list is well formed and names recorded ADRs", () =>
    {
        expect(() => validateExceptions(AUDIT_EXCEPTIONS, ADRS)).not.toThrow();
    });

    test("the review window is the user's 90 days", () =>
    {
        expect(MAX_REVIEW_DAYS).toBe(90);
        expect(refusal({ ...GOOD, reviewBy: "2027-02-04" })).toMatch(/91 days/);
    });

    test("each careful-use rule refuses an entry that breaks it", () =>
    {
        const broken = {
            "both targets": { ...GOOD, via: "x" },
            "no target": { ...GOOD, advisory: undefined },
            "not a GHSA": { ...GOOD, advisory: "CVE-2023-54404" },
            "a range": { ...GOOD, version: "^3.25.76" },
            "no reason": { ...GOOD, reason: " " },
            "no evidence": { ...GOOD, evidence: [] },
            "http evidence": { ...GOOD, evidence: ["http://example.test"] },
            "unknown ADR": { ...GOOD, adr: "ADR-9999" },
            "bad date": { ...GOOD, decided: "5 Nov 2026" },
        };

        expect(Object.entries(broken).filter(([, entry]) => refusal(entry) === "").map(([name]) => name)).toEqual([]);
    });

    test("a duplicate entry is refused", () =>
    {
        expect(() => validateExceptions([GOOD, GOOD], ADRS)).toThrow(/duplicates/);
    });

    test("findException matches advisory, package and exact version only", () =>
    {
        const target = { advisory: GOOD.advisory };

        expect(findException([GOOD], target, "zod", "3.25.76")).toBe(GOOD);
        expect([findException([GOOD], target, "zod", "3.25.77"), findException([GOOD], target, "zod4", "3.25.76"),
            findException([GOOD], { via: "zod" }, "zod", "3.25.76")]).toEqual([undefined, undefined, undefined]);
    });

    test("an exception lapses the day after its review date", () =>
    {
        expect([isExpired(GOOD, "2027-02-03"), isExpired(GOOD, "2027-02-04")]).toEqual([false, true]);
    });
});
