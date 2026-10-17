#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: SriManifest
 * 📜 PURPOSE: Publish subresource integrity hashes for the third-party
 *    libraries this repository recommends but does NOT serve, and verify
 *    those hashes against the live builds on demand. DEBT-SEC-5 / ADR-189.
 * 🔗 RELATES: [[VendorClosure]], [[CdnContract]], [[NoFallbackCode]]
 * ⚡ FLOW: [scripts/third-party-sri.json] -> [dist/third-party-sri.json]
 *          -> [consumer <script src integrity>]
 *          [--verify] -> [refetch each URL] -> [recompute] -> [diff]
 *
 * WHY THIS IS NOT PART OF vendor-closure.mjs
 * -------------------------------------------
 * That script makes one promise: we build this asset, we serve it from this
 * origin, and we hash what we serve. These seven assets are chosen by the
 * host page and served by jsdelivr. The promise here is narrower and worth
 * stating separately: a named immutable build has this hash.
 *
 * WHY THE HASHES ARE RECORDED AND NOT COMPUTED AT BUILD TIME
 * -----------------------------------------------------------
 * Fetching nine URLs inside the build gate would make CI depend on a third
 * party being reachable, which is a new way for a green suite to go red for
 * no reason. jsdelivr serves versioned URLs as immutable, so the hash of a
 * pinned build does not drift. A mismatch is therefore an incident and not
 * maintenance, and `--verify` is the thing that reports it.
 *
 * HOW THIS COMPOSES WITH THE NO-FALLBACK RULE
 * --------------------------------------------
 * A hash mismatch makes the browser refuse the script. The global is then
 * absent, and the component that needs it throws. SRI is the fail-fast rule
 * applied at the network boundary, which is the one boundary a runtime
 * check in this repository cannot reach.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = "scripts/third-party-sri.json";
const PUBLISHED = "dist/third-party-sri.json";

/**
 * The one computation in this file. Kept pure and exported so a test can
 * prove it against known bytes without reaching the network.
 */
export function sriOf(buffer)
{
    return "sha384-" + createHash("sha384").update(buffer).digest("base64");
}

/** Read the recorded manifest, failing loudly rather than returning a shape. */
export function readManifest(path = SOURCE)
{
    return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Every asset the manifest records, flattened to the shape both the
 * publisher and the documentation check want.
 */
export function assetList(manifest)
{
    return Object.entries(manifest.assets).map(([name, asset]) => ({ name, ...asset }));
}

/** Copy the recorded manifest into dist, so "published" is literal. */
function publish()
{
    const manifest = readManifest();
    const assets = assetList(manifest);

    mkdirSync("dist", { recursive: true });
    writeFileSync(PUBLISHED, JSON.stringify(manifest, null, 2) + "\n");

    for (const asset of assets)
    {
        const kb = String(Math.round(asset.bytes / 1024)).padStart(5);
        console.log(`  ${asset.name.padEnd(20)} ${asset.version.padEnd(9)} ${kb} KB  ${asset.requirement}`);
    }

    const unhashable = Object.keys(manifest.unhashable ?? {});

    console.log(`  ${assets.length} hashed, ${unhashable.length} unhashable (${unhashable.join(", ")})`);
    console.log(`  manifest -> ${PUBLISHED}`);
}

/**
 * Refetch every recorded URL and compare. This is the only code path that
 * touches the network, and it is deliberately not in the default gate.
 */
async function verify()
{
    const assets = assetList(readManifest());
    const failures = [];

    for (const asset of assets)
    {
        let response;

        try
        {
            response = await fetch(asset.url);
        }
        catch (e)
        {
            failures.push(`${asset.name}: ${asset.url} could not be fetched (${e.message})`);
            continue;
        }

        if (!response.ok)
        {
            failures.push(`${asset.name}: ${asset.url} returned HTTP ${response.status}`);
            continue;
        }

        const bytes = Buffer.from(await response.arrayBuffer());
        const actual = sriOf(bytes);

        if (actual !== asset.integrity)
        {
            failures.push(
                `${asset.name}: hash changed at an immutable URL.\n`
                + `    url      ${asset.url}\n`
                + `    recorded ${asset.integrity}\n`
                + `    actual   ${actual}`);
            continue;
        }

        if (bytes.length !== asset.bytes)
        {
            failures.push(
                `${asset.name}: byte count changed, ${asset.bytes} recorded, ${bytes.length} actual`);
            continue;
        }

        console.log(`  ok  ${asset.name.padEnd(20)} ${asset.integrity}`);
    }

    if (failures.length > 0)
    {
        console.error(`\n${failures.length} of ${assets.length} assets failed verification:\n`);
        for (const failure of failures) { console.error(`  ${failure}`); }
        console.error(
            "\nA versioned jsdelivr URL is immutable. A changed hash here is a"
            + "\nsupply-chain incident and not a version bump. Investigate before"
            + "\nupdating the recorded hash.");
        process.exit(1);
    }

    console.log(`\n  ${assets.length} of ${assets.length} verified against the live builds.`);
}

async function main()
{
    if (process.argv.includes("--verify")) { await verify(); }
    else { publish(); }
}

// Importable by the test without running. argv[1] is absent under some runners.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    main().catch((err) =>
    {
        console.error(String(err.message ?? err));
        process.exit(1);
    });
}
