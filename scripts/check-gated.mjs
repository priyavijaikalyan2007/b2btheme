#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * ⚓ COMPONENT: GatedCheck
 * 📜 PURPOSE: Fail when anything a publication gate holds back is in dist/,
 *    as a file or as a lib-manifest URL. test-local.sh [31].
 * 🔗 RELATES: [[PublicationGate]], [[VendorClosure]]
 * ⚡ FLOW: [dist/ walk + dist/lib-manifest.json urls] -> [gatedLeaks] -> exit
 *
 * Usage: node scripts/check-gated.mjs
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { GATES, gatedLeaks } from "./gated.mjs";

const DIST = "dist";
const MANIFEST = join(DIST, "lib-manifest.json");

/**
 * Every file under a directory, as paths relative to `root`.
 *
 * @param {string} root The directory to walk.
 * @returns {string[]} Relative paths with forward slashes.
 */
function filesUnder(root)
{
    return readdirSync(root, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => relative(root, join(entry.parentPath, entry.name)).split("\\").join("/"));
}

function main()
{
    // A check over nothing has not passed (ADR-196).
    if (!existsSync(MANIFEST))
    {
        console.error(`[check-gated] ${MANIFEST} is absent. Run \`npm run build\` first.`);
        process.exit(1);
    }

    const urls = Object.values(JSON.parse(readFileSync(MANIFEST, "utf8")).assets ?? {})
        .map((asset) => String(asset.url).replace(/^\//, ""));
    const files = filesUnder(DIST);
    const leaks = gatedLeaks([...files, ...urls]);

    if (leaks.length === 0)
    {
        console.log(`[check-gated] ${files.length} file(s) and ${urls.length} manifest URL(s): none gated.`);
        return;
    }

    for (const { path, gate } of leaks)
    {
        console.error(`  ${path}  held by ${gate}: ${GATES[gate]}`);
    }
    process.exit(1);
}

main();
