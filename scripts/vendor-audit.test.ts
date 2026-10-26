/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: VendorAudit. Which `npm audit` entries count against a served
 *    package: an advisory belongs to the installed copy npm names in
 *    `nodes`, and only a copy at the version this origin serves is served.
 */

import { describe, expect, test } from "vitest";

import { servedHits } from "./vendor-audit.mjs";

const SERVED = new Map([["dompurify", "3.4.17"], ["codemirror", "6.0.1"]]);

/** Versions on disk for each install path npm can name. */
const DISK: Record<string, string> = {
    "node_modules/dompurify": "3.4.17",
    "node_modules/@a2ui/markdown-it/node_modules/dompurify": "3.4.11",
    "node_modules/codemirror": "6.0.1",
};

const versionAt = (node: string): string => DISK[node];

describe("servedHits", () =>
{
    test("an advisory on a nested copy at another version does not count against the served copy", () =>
    {
        const report = { dompurify: { nodes: ["node_modules/@a2ui/markdown-it/node_modules/dompurify"], via: [] } };

        expect(servedHits(report, SERVED, versionAt)).toEqual([]);
    });

    test("an advisory on the copy at the served version counts", () =>
    {
        const report = { dompurify: { nodes: ["node_modules/dompurify",
            "node_modules/@a2ui/markdown-it/node_modules/dompurify"], via: [] } };

        expect(servedHits(report, SERVED, versionAt).map((h) => h.name)).toEqual(["dompurify"]);
    });

    test("a served dependent reached through a `via` chain still counts", () =>
    {
        const report = { codemirror: { nodes: ["node_modules/codemirror"], via: ["@codemirror/view"] } };

        expect(servedHits(report, SERVED, versionAt).map((h) => h.name)).toEqual(["codemirror"]);
    });

    test("a package this origin does not serve never counts", () =>
    {
        const report = { zod: { nodes: ["node_modules/zod"], via: [] } };

        expect(servedHits(report, SERVED, versionAt)).toEqual([]);
    });

    test("an entry without `nodes` throws rather than guessing which copy it means", () =>
    {
        const report = { dompurify: { via: [] } };

        expect(() => servedHits(report, SERVED, versionAt)).toThrow(/nodes/);
    });
});
