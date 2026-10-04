#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: ClosureGate
 * 📜 PURPOSE: Verify every published SRI hash still matches the artifact on
 *    disk, and that each vendored file is present and non-empty. DEBT-SEC-4.
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
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const MANIFEST = "dist/lib-manifest.json";

function sriOf(buffer)
{
    return "sha384-" + createHash("sha384").update(buffer).digest("base64");
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

    if (problems.length > 0)
    {
        console.log(`  FAIL: ${problems.length} problem(s) in the dependency closure\n`);
        for (const p of problems) { console.log(`    ${p}`); }
        console.log("\n  A consumer pins integrity from this manifest. A hash that");
        console.log("  does not match the file is a hard load failure in the browser.");
        console.log("  Re-run `npm run build:vendor`.");
        return 1;
    }

    console.log(`  PASS: ${checked} vendored artifact(s) match their published hash`);
    return 0;
}

process.exit(main());
