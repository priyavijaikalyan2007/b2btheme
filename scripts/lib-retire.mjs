#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: LibRetire
 * 📜 PURPOSE: End a deprecated /lib/ version: delete its frozen bytes, so the
 *    next deploy stops serving it, and list it as retired for
 *    LIST_RETIRED_DAYS. specs/lib-retention.prd.md §7 (#147).
 * 🔗 RELATES: [[LibRetention]], [[LibDeprecate]]
 * ⚡ FLOW: [record deprecated] -> [delete cdn/lib-retained files] -> [record retired]
 *
 * Usage: npm run lib:retire -- <asset>@<version>
 */

import { readdirSync, rmdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { LIST_RETIRED_DAYS, RECORD_PATH, RETAINED_DIR, daysUntil, readRecord, retainedPath, todayUtc, writeRecord }
    from "./lib-retention.mjs";

/** Removes empty directories from dir up to, but not including, stop. */
function pruneEmpty(dir, stop)
{
    for (let d = dir; d !== stop && d.startsWith(stop); d = dirname(d))
    {
        if (readdirSync(d).length > 0) { return; }

        rmdirSync(d);
    }
}

/**
 * Retires one deprecated version.
 *
 * @param {string} asset - The asset name.
 * @param {string} version - The deprecated version.
 * @param {{today: string, root?: string}} options
 * @returns {object} The retired entry.
 */
export function retire(asset, version, { today, root = "." })
{
    const recordPath = join(root, RECORD_PATH);
    const record = readRecord(recordPath);
    const at = record.deprecated.findIndex((e) => e.asset === asset && e.version === version);

    if (at === -1) { throw new Error(`lib:retire: ${asset} ${version} is not deprecated in ${RECORD_PATH}.`); }

    const [entry] = record.deprecated.splice(at, 1);

    for (const served of Object.keys(entry.files))
    {
        const file = join(root, retainedPath(served));

        rmSync(file);
        pruneEmpty(dirname(file), join(root, RETAINED_DIR));
    }

    const retired = { asset, version, url: entry.url, retiredOn: today, replacement: entry.replacement,
        reason: entry.reason };

    record.retired = [...record.retired.filter((r) => daysUntil(r.retiredOn, today) <= LIST_RETIRED_DAYS), retired];
    writeRecord(record, recordPath);

    return retired;
}

function main()
{
    const target = process.argv[2] ?? "";
    const split = target.lastIndexOf("@");

    if (split <= 0) { throw new Error("Usage: npm run lib:retire -- <asset>@<version>"); }

    const retired = retire(target.slice(0, split), target.slice(split + 1), { today: todayUtc() });

    console.log(`[lib:retire] ${retired.asset} ${retired.version} is retired. The next deploy stops serving `
        + `${retired.url}.`);
    console.log("\nCHANGELOG line:\n");
    console.log(`- **${retired.asset} ${retired.version} retired**: \`${retired.url}\` now returns 404`
        + (retired.replacement ? `. Use \`${retired.replacement}\`.` : "."));
}

if (process.argv[1] === fileURLToPath(import.meta.url))
{
    try { main(); }
    catch (err) { console.error(String(err.message ?? err)); process.exit(1); }
}
