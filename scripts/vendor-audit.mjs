#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: VendorAudit
 * 📜 PURPOSE: Report advisories against the packages this origin actually
 *    serves, rather than against the packages npm calls production.
 *    DEBT-SEC-10.
 * 🔗 RELATES: [[VendorClosure]], [[ClosureGate]], [[CdnContract]]
 * ⚡ FLOW: [dist/lib-manifest.json packages] -> [npm audit --json]
 *          -> [intersection] -> [exit 1 on any hit]
 *
 * WHY `npm audit --omit=dev` IS THE WRONG QUESTION HERE
 * -----------------------------------------------------
 * This repository has no runtime dependencies at all. Every library it
 * serves sits in devDependencies, because the browser closure is built
 * from node_modules and vendored into dist/lib. So `npm audit
 * --omit=dev` reports zero while this origin serves the vulnerable file.
 *
 * That is not a hypothetical. On 2026-10-23 dompurify carried a CRITICAL
 * advisory, this origin was serving it, consumers were told to load it,
 * and the production-scoped audit reported zero the whole time.
 *
 * The right population is neither "production" nor "everything". It is
 * the set of packages inside the artifacts in dist/lib, and the manifest
 * states that set per asset because vendor-closure.mjs reads it from
 * esbuild's metafile. codemirror6 alone holds twenty-eight packages
 * behind one hash.
 *
 * WHAT A HIT MEANS, AND WHAT IT DOES NOT
 * ---------------------------------------
 * npm reports a DEPENDENT as well as the vulnerable package, linked by a
 * `via` chain. A served package can therefore appear because of a
 * dependency its browser build never includes. A node-only transport
 * reached through a Node entry point is one example.
 *
 * Those stay visible on purpose. A person reads the chain and dismisses
 * the finding. The alternative is a filter that decides for them, and a
 * filter wrong once hides the advisory this gate exists to surface.
 *
 * THIS GATE NEEDS THE NETWORK AND FAILS WITHOUT IT
 * -------------------------------------------------
 * `npm audit` asks the registry. When the registry is unreachable there
 * is no answer, and an audit that reports "no advisories" because it
 * asked nobody is worse than no audit. So an unparseable reply throws.
 * The same rule covers an absent manifest and an empty package set
 * (ADR-196).
 *
 * Usage: node scripts/vendor-audit.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const MANIFEST = "dist/lib-manifest.json";

/**
 * The packages this origin serves, with the version each asset records.
 *
 * @returns {{served: Map<string, string>, assets: Map<string, string[]>}}
 *   Every served package with its version, and the asset names that hold
 *   each one.
 */
function servedPackages()
{
    if (!existsSync(MANIFEST))
    {
        throw new Error(
            `${MANIFEST} is absent. Run \`npm run build:vendor\` first. ` +
            "An audit with no package list is not a clean audit.");
    }

    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
    const served = new Map();
    const assets = new Map();

    for (const [assetName, asset] of Object.entries(manifest.assets ?? {}))
    {
        for (const [name, version] of Object.entries(asset.packages ?? {}))
        {
            served.set(name, version);
            assets.set(name, [...(assets.get(name) ?? []), assetName]);
        }
    }

    if (served.size === 0)
    {
        throw new Error(
            `${MANIFEST} lists no packages. A gate that passes because it ` +
            "read an empty population has not been written (ADR-196).");
    }

    return { served, assets };
}

/**
 * Assert that the manifest describes what is installed right now.
 *
 * A manifest written before an install audits the versions of a previous
 * build. The hashes would still verify, because the files on disk match
 * the manifest, and the audit would still ask about the wrong versions.
 *
 * @param {Map<string, string>} served Package name to recorded version.
 */
function assertFresh(served)
{
    const stale = [];

    for (const [name, version] of served)
    {
        const path = `node_modules/${name}/package.json`;

        if (!existsSync(path))
        {
            stale.push(`${name} is in the manifest and not installed`);
            continue;
        }

        const installed = JSON.parse(readFileSync(path, "utf8")).version;
        if (installed !== version)
        {
            stale.push(`${name}: manifest ${version}, installed ${installed}`);
        }
    }

    if (stale.length > 0)
    {
        throw new Error(
            "the manifest does not describe what is installed, so this " +
            "audit would ask about the wrong versions. Run " +
            "`npm run build:vendor`.\n  " + stale.join("\n  "));
    }
}

/** Ask the registry. `npm audit` exits non-zero on findings, so read stdout. */
function auditReport()
{
    const run = spawnSync("npm", ["audit", "--json"],
        { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

    if (run.error) { throw run.error; }

    try { return JSON.parse(run.stdout); }
    catch
    {
        throw new Error(
            "`npm audit --json` did not return JSON. The registry is " +
            "probably unreachable. An audit that asked nobody must not " +
            `report a clean result.\n${(run.stderr ?? "").slice(0, 400)}`);
    }
}

/** One advisory line per `via` entry, whether it names a chain or a CVE. */
function describe(via)
{
    if (typeof via === "string") { return `via ${via}`; }
    return `${via.title} [${via.severity}] ${via.url}`;
}

function main()
{
    const { served, assets } = servedPackages();
    assertFresh(served);

    const report = auditReport();
    const vulnerabilities = report.vulnerabilities ?? {};
    const hits = [];

    for (const [name, entry] of Object.entries(vulnerabilities))
    {
        if (!served.has(name)) { continue; }
        hits.push({ name, entry });
    }

    console.log(`[vendor-audit] ${served.size} package(s) served from ` +
        `${new Set([...assets.values()].flat()).size} asset(s) in ${MANIFEST}`);

    if (hits.length === 0)
    {
        const total = report.metadata?.vulnerabilities?.total ?? 0;
        console.log(`PASS: no advisory against a served package. ` +
            `${total} advisory group(s) in the full tree, none of them served.`);
        return;
    }

    console.error(`\nFAIL: ${hits.length} served package(s) carry an advisory. ` +
        "This origin publishes these files and consumers load them.\n");

    for (const { name, entry } of hits)
    {
        console.error(`  ${name}@${served.get(name)}  [${entry.severity}]  ` +
            `served in ${assets.get(name).join(", ")}`);

        for (const via of entry.via ?? []) { console.error(`      ${describe(via)}`); }

        const fix = entry.fixAvailable;
        if (fix && typeof fix === "object")
        {
            console.error(`      fix: ${fix.name}@${fix.version}` +
                `${fix.isSemVerMajor ? " (semver major)" : ""}`);
        }
        console.error("");
    }

    console.error("A version bump here changes a vendored filename and its " +
        "SRI hash. Read test-local.sh [28] and CDN_CONTRACT.md before moving one.");
    process.exit(1);
}

try { main(); }
catch (err)
{
    console.error(`[vendor-audit] ${String(err.message ?? err)}`);
    process.exit(1);
}
