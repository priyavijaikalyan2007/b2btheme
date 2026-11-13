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

import { auditAsset, auditDeprecated, installedVersions, servedHits } from "./vendor-audit.mjs";

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

/** The shape `npm audit --json` gave on 2026-11-05 for the A2UI runtime's tree. */
const A2UI_REPORT = {
    "@a2ui/lit": { severity: "high", nodes: ["node_modules/@a2ui/lit"],
        via: ["@a2ui/markdown-it", "@a2ui/web_core", "zod"] },
    "@a2ui/markdown-it": { severity: "high", nodes: ["node_modules/@a2ui/markdown-it"],
        via: ["@a2ui/web_core", "dompurify"] },
    "@a2ui/web_core": { severity: "high", nodes: ["node_modules/@a2ui/web_core"], via: ["zod", "zod-to-json-schema"] },
    dompurify: { severity: "critical", nodes: ["node_modules/@a2ui/markdown-it/node_modules/dompurify"],
        via: [{ title: "DOMPurify XSS", severity: "moderate", url: "https://github.com/advisories/GHSA-55q2-fjhq-7xh7" }] },
    zod: { severity: "high", nodes: ["node_modules/@a2ui/web_core/node_modules/zod"],
        via: [{ title: "Zod memory", severity: "high", url: "https://github.com/advisories/GHSA-mrhx-c7xc-m3w5" }] },
    "zod-to-json-schema": { severity: "high", nodes: ["node_modules/@a2ui/web_core/node_modules/zod-to-json-schema"],
        via: ["zod"] },
};

const A2UI_DISK: Record<string, string> = {
    "node_modules/@a2ui/lit": "0.14.0",
    "node_modules/@a2ui/markdown-it": "0.14.0",
    "node_modules/@a2ui/web_core": "0.14.0",
    "node_modules/@a2ui/markdown-it/node_modules/dompurify": "3.4.11",
    "node_modules/@a2ui/web_core/node_modules/zod": "3.25.76",
    "node_modules/@a2ui/web_core/node_modules/zod-to-json-schema": "3.25.2",
    "node_modules/zod": "4.6.7",
};

const a2uiAt = (node: string): string => A2UI_DISK[node];

/** a2ui-runtime's packages, and mcp-ext-apps' with the other zod. */
const RUNTIME = new Map([["@a2ui/lit", "0.14.0"], ["@a2ui/web_core", "0.14.0"], ["zod", "3.25.76"],
    ["zod-to-json-schema", "3.25.2"]]);
const EXT_APPS = new Map([["@modelcontextprotocol/ext-apps", "2.0.4"], ["zod", "4.6.7"]]);

const ZOD = { advisory: "GHSA-mrhx-c7xc-m3w5", package: "zod", version: "3.25.76", reason: "r",
    evidence: ["https://example.test"], decided: "2026-11-05", reviewBy: "2027-02-03", adr: "ADR-252" };
const LIT = { via: "@a2ui/markdown-it", package: "@a2ui/lit", version: "0.14.0", reason: "r",
    evidence: ["https://example.test"], decided: "2026-11-05", reviewBy: "2027-02-03", adr: "ADR-252" };

/** Failing package names and the exception keys applied. */
function audit(served: Map<string, string>, exceptions: unknown[], today = "2026-11-05")
{
    const { failures, used } = auditAsset(A2UI_REPORT, served, exceptions, today, a2uiAt);

    return { failing: failures.map((f) => f.name).sort(), used: [...used].sort(), failures };
}

describe("auditAsset", () =>
{
    test("with no exception, zod and every chain to it fail, and lit's unbundled markdown-it link is named", () =>
    {
        const { failing, failures } = audit(RUNTIME, []);

        expect(failing).toEqual(["@a2ui/lit", "@a2ui/web_core", "zod", "zod-to-json-schema"]);
        expect(failures.find((f) => f.name === "@a2ui/lit")?.problems.join("\n"))
            .toMatch(/via @a2ui\/markdown-it, which this asset does not bundle/);
    });

    test("the zod exception and lit's via exception clear the whole runtime, and both are reported used", () =>
    {
        expect(audit(RUNTIME, [ZOD, LIT])).toMatchObject({ failing: [],
            used: ["GHSA-mrhx-c7xc-m3w5 on zod@3.25.76", "via @a2ui/markdown-it on @a2ui/lit@0.14.0"] });
    });

    test("the zod exception alone leaves lit failing on its unbundled link: a person must record that", () =>
    {
        expect(audit(RUNTIME, [ZOD]).failing).toEqual(["@a2ui/lit"]);
    });

    test("if the asset did bundle markdown-it, lit's via exception is refused and markdown-it fails on its own", () =>
    {
        const bundled = new Map([...RUNTIME, ["@a2ui/markdown-it", "0.14.0"]]);
        const { failing, failures } = audit(bundled, [ZOD, LIT]);

        expect(failing).toEqual(["@a2ui/lit", "@a2ui/markdown-it"]);
        expect(failures.flatMap((f) => f.problems).join("\n"))
            .toMatch(/says @a2ui\/markdown-it is not bundled, but this asset serves/);
    });

    test("a served dependency's own advisory is followed through the chain", () =>
    {
        const bundled = new Map([...RUNTIME, ["@a2ui/markdown-it", "0.14.0"], ["dompurify", "3.4.11"]]);

        expect(audit(bundled, [ZOD]).failures.flatMap((f) => f.problems).join("\n")).toMatch(/GHSA-55q2-fjhq-7xh7/);
    });

    test("an exception is exact: zod at another version is not excused", () =>
    {
        const bumped = new Map([...RUNTIME, ["zod", "3.25.77"]]);
        const disk = { ...A2UI_DISK, "node_modules/@a2ui/web_core/node_modules/zod": "3.25.77" };
        const { failures } = auditAsset(A2UI_REPORT, bumped, [ZOD, LIT], "2026-11-05", (n: string) => disk[n]);

        expect(failures.map((f) => f.name)).toContain("zod");
    });

    test("an expired exception fails again and says why", () =>
    {
        const { failing, failures } = audit(RUNTIME, [ZOD, LIT], "2027-02-04");

        expect(failing).toContain("zod");
        expect(failures.find((f) => f.name === "zod")?.problems.join("\n")).toMatch(/expired on 2027-02-03/);
    });

    test("an asset serving zod 4 is clean, and uses no exception, while another asset serves zod 3", () =>
    {
        expect(audit(EXT_APPS, [ZOD, LIT])).toMatchObject({ failing: [], used: [] });
    });
});

describe("installedVersions", () =>
{
    test("finds nested copies, so a manifest serving zod 3 under web_core is fresh beside a top-level zod 4", () =>
    {
        const paths = ["node_modules/zod", "node_modules/@a2ui/web_core/node_modules/zod", "node_modules/zodiac"];

        expect(installedVersions("zod", paths, a2uiAt)).toEqual(["4.6.7", "3.25.76"]);
    });
});

describe("auditDeprecated", () =>
{
    const ENTRY = { asset: "dompurify", version: "3.4.16", packages: { dompurify: "3.4.16" } };
    const ADVISORY = { url: "https://github.com/advisories/GHSA-cg2g-xh64-v4q7", severity: "critical",
        title: "t", vulnerable_versions: "<=3.4.16" };
    const calls: unknown[] = [];
    const fetchWith = (body: unknown, status = 200) => async (url: string, init: { body: string }) =>
    {
        calls.push({ url, body: JSON.parse(init.body) });

        return new Response(JSON.stringify(body), { status });
    };
    const EXCEPTION = { advisory: "GHSA-cg2g-xh64-v4q7", package: "dompurify", version: "3.4.16", reason: "r",
        evidence: ["https://e"], decided: "2026-11-01", reviewBy: "2027-01-01", adr: "ADR-1" };

    test("asks npm's advisory endpoint about each deprecated version's exact packages", async () =>
    {
        calls.length = 0;
        await auditDeprecated([ENTRY], fetchWith({}), [], "2026-12-01");

        expect(calls).toEqual([{ url: "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk",
            body: { dompurify: ["3.4.16"] } }]);
    });

    test("an advisory no exception excuses fails, naming lib:retire", async () =>
    {
        const result = await auditDeprecated([ENTRY], fetchWith({ dompurify: [ADVISORY] }), [], "2026-12-01");

        expect(result.failures).toEqual([expect.stringMatching(
            /dompurify@3\.4\.16 \[critical\] GHSA-cg2g-xh64-v4q7 in deprecated dompurify 3\.4\.16.*npm run lib:retire -- dompurify@3\.4\.16/)]);
    });

    test("a matching exception excuses it until its review date", async () =>
    {
        const ok = await auditDeprecated([ENTRY], fetchWith({ dompurify: [ADVISORY] }), [EXCEPTION], "2026-12-01");
        const late = await auditDeprecated([ENTRY], fetchWith({ dompurify: [ADVISORY] }), [EXCEPTION], "2027-01-02");

        expect(ok).toEqual({ failures: [], used: new Set(["GHSA-cg2g-xh64-v4q7 on dompurify@3.4.16"]) });
        expect(late.failures).toEqual([expect.stringMatching(/expired on 2027-01-01/)]);
    });

    test("an endpoint error is an error, not a pass", async () =>
    {
        await expect(auditDeprecated([ENTRY], fetchWith({}, 503), [], "2026-12-01")).rejects.toThrow(/returned 503/);
    });

    test("no deprecated version means no request", async () =>
    {
        calls.length = 0;
        expect(await auditDeprecated([], fetchWith({}), [], "2026-12-01")).toEqual({ failures: [], used: new Set() });
        expect(calls).toEqual([]);
    });
});
