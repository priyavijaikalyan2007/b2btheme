#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: ClosureGate
 * 📜 PURPOSE: Verify every published SRI hash still matches the artifact on
 *    disk, that each vendored file is present and non-empty, and that any
 *    document citing a published hash cites the URL that hash belongs to.
 *    DEBT-SEC-4, extended by DEBT-SEC-8.
 * 🔗 RELATES: [[VendorClosure]], [[CdnContract]]
 *
 * WHY THIS EXISTS SEPARATELY FROM THE BUILD
 * -----------------------------------------
 * The build asserts the closure when it bundles — esbuild's metafile marks
 * any unresolved import as external, and vendor-closure.mjs refuses to emit
 * an artifact that has one. That check runs at build time and cannot run
 * afterwards, because the metafile is not kept.
 *
 * What CAN drift afterwards is the pairing between a hash and a file: a
 * manual edit to dist/, a partial deploy, a stale manifest surviving a failed
 * build. A consumer that pins integrity="sha384-..." from the manifest and
 * fetches a file that no longer matches gets a hard load failure in the
 * browser, which is exactly the outage SRI is supposed to prevent on OUR
 * side rather than cause. So the gate re-pairs them.
 *
 * WHAT THE AUDIT CEILINGS CANNOT SEE (DEBT-SEC-8)
 * -----------------------------------------------
 * `thirdPartyTagsWithoutSri` in scripts/audit-counts.mjs counts tags that
 * carry no `integrity` at all. It therefore sees an UNHASHED tag and is
 * blind to a MIS-hashed one. Repointing a documented tag from this origin
 * back to a public CDN, while leaving the hash attached, keeps that count
 * unchanged — the tag still has an `integrity`, it is simply the wrong one.
 *
 * A hash is a claim about exactly one URL. So this gate also asserts the
 * pairing in the other direction: a tag carrying a hash this manifest
 * publishes must point at the URL that hash was computed from.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const MANIFEST = "dist/lib-manifest.json";

function sriOf(buffer)
{
    return "sha384-" + createHash("sha384").update(buffer).digest("base64");
}

/**
 * DEBT-SEC-8. Assert that documentation citing a published hash cites the
 * URL that hash belongs to.
 *
 * Returns the number of tags inspected, so a PASS reports coverage rather
 * than only the absence of a complaint. A zero here would mean the scan
 * reached nothing, which is the failure mode DEBT-GATE-1 and DEBT-SEC-6
 * both were.
 */
function checkDocumentedPairings(manifest, problems)
{
    const byHash = new Map();

    for (const [name, asset] of Object.entries(manifest.assets ?? {}))
    {
        byHash.set(asset.integrity, { name, url: asset.url });
    }

    const files = execFileSync("git", ["ls-files", "*.md", "*.html"], { encoding: "utf8" })
        .split("\n").filter(Boolean).filter((f) => !f.startsWith("dist/"));

    let inspected = 0;

    for (const file of files)
    {
        const text = readFileSync(file, "utf8");

        for (const tag of text.match(/<(?:script|link)\b[^>]*>/g) ?? [])
        {
            const hash = tag.match(/integrity="([^"]+)"/)?.[1];

            if (hash === undefined) { continue; }

            const pair = byHash.get(hash);

            if (pair === undefined) { continue; }

            inspected += 1;

            if (!tag.includes(pair.url))
            {
                problems.push(
                    `${file}: a tag carries the published ${pair.name} hash but ` +
                    `does not point at ${pair.url}`);
            }
            else if (!tag.includes('crossorigin="anonymous"'))
            {
                problems.push(
                    `${file}: ${pair.name} is hashed with no crossorigin, so the ` +
                    `browser SKIPS the check instead of failing it`);
            }
        }
    }

    return inspected;
}

function main()
{
    if (!existsSync(MANIFEST))
    {
        console.log(`  SKIP: ${MANIFEST} not present (run npm run build:vendor)`);
        return 0;
    }

    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
    const problems = [];
    let checked = 0;

    if (!manifest.generated)
    {
        problems.push(
            "manifest has no `generated` stamp — it was written by a failed " +
            "run and must not be trusted");
    }

    for (const [name, asset] of Object.entries(manifest.assets ?? {}))
    {
        const path = "dist" + asset.url;

        if (!existsSync(path))
        {
            problems.push(`${name}: manifest points at ${asset.url}, which does not exist`);
            continue;
        }

        const bytes = readFileSync(path);
        checked += 1;

        if (bytes.length === 0)
        {
            problems.push(`${name}: ${asset.url} is empty`);
            continue;
        }

        const actual = sriOf(bytes);

        if (actual !== asset.integrity)
        {
            problems.push(
                `${name}: hash mismatch for ${asset.url}\n` +
                `        manifest: ${asset.integrity}\n` +
                `        on disk:  ${actual}`);
        }

        if (!asset.url.includes(asset.version))
        {
            problems.push(
                `${name}: ${asset.url} does not carry its version, so it ` +
                `cannot be served immutable`);
        }
    }

    const paired = checkDocumentedPairings(manifest, problems);

    if (problems.length > 0)
    {
        console.log(`  FAIL: ${problems.length} problem(s) in the dependency closure\n`);
        for (const p of problems) { console.log(`    ${p}`); }
        console.log("\n  A consumer pins integrity from this manifest. A hash that");
        console.log("  does not match the file it names is a hard load failure in");
        console.log("  the browser, which is the outage SRI exists to prevent.");
        console.log("  An artifact problem means `npm run build:vendor`. A tag");
        console.log("  problem means the documentation, not the build.");
        return 1;
    }

    console.log(
        `  PASS: ${checked} vendored artifact(s) match their published hash, ` +
        `${paired} documented tag(s) correctly paired`);
    return 0;
}

process.exit(main());
