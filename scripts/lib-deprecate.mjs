#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: LibDeprecate
 * 📜 PURPOSE: Keep a replaced /lib/ version serving its exact bytes for
 *    RETAIN_DAYS. Run on the branch that bumps the package, a Dependabot
 *    branch included. specs/lib-retention.prd.md §7 (#147).
 * 🔗 RELATES: [[LibRetention]], [[LibVerifyLive]], [[VendorClosure]]
 * ⚡ FLOW: [record current] -> [live CDN bytes, hash-checked] -> [cdn/lib-retained]
 *          -> [record deprecated] -> [vendor-closure --record] -> [replacement]
 *
 * Usage: npm run lib:deprecate -- <asset> --reason "<why it moved>"
 *
 * WHY THE BYTES COME FROM THE LIVE CDN
 * ------------------------------------
 * On a bump branch, node_modules already holds the new version, so the old
 * bytes can only come from what is served. Each file is checked against the
 * hash recorded when it was published. A mismatch stops the command before
 * it writes anything: it never guesses or rebuilds.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { LIVE_ORIGIN, RECORD_PATH, RETAIN_DAYS, addDays, readRecord, retainedPath, todayUtc, writeRecord }
    from "./lib-retention.mjs";
import { fetchVerified } from "./lib-verify-live.mjs";

/**
 * Freezes the current version of an asset and records it as deprecated.
 * The record is written only after every file is proved and frozen.
 *
 * @param {string} asset - The asset name, as in lib-manifest.json.
 * @param {{fetchImpl: typeof fetch, today: string, reason: string, root?: string, origin?: string}} options
 * @returns {Promise<object>} The deprecated entry, with replacement null until the new version is recorded.
 */
export async function deprecate(asset, { fetchImpl, today, reason, root = ".", origin = LIVE_ORIGIN })
{
    if (!reason) { throw new Error("lib:deprecate needs a reason: --reason \"<why it moved>\"."); }

    const recordPath = join(root, RECORD_PATH);
    const record = readRecord(recordPath);
    const current = record.current[asset];

    if (!current) { throw new Error(`lib:deprecate: ${asset} is not a current asset in ${RECORD_PATH}.`); }

    const manifest = await (await fetchImpl(`${origin}/lib-manifest.json`)).json();
    const live = manifest.assets?.[asset];

    if (!live || live.version !== current.version)
    {
        throw new Error(`lib:deprecate: ${origin} serves ${asset} ${live?.version ?? "nothing"}, but ${RECORD_PATH} `
            + `records ${current.version}. Deprecate only what is published.`);
    }

    const { bytes, problems } = await fetchVerified(current.files, fetchImpl, origin);

    if (problems.length > 0) { throw new Error(`lib:deprecate: nothing changed.\n  ${problems.join("\n  ")}`); }

    for (const [served, body] of bytes)
    {
        const dest = join(root, retainedPath(served));

        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, body);
    }

    const entry = {
        asset, version: current.version, url: live.url, integrity: live.integrity, files: current.files,
        packages: live.packages, deprecatedOn: today, retireAfter: addDays(today, RETAIN_DAYS),
        replacement: null, reason,
    };

    delete record.current[asset];
    record.deprecated.push(entry);
    writeRecord(record, recordPath);

    return entry;
}

/** Runs vendor-closure with the given flags; throws when it fails. */
function vendor(...flags)
{
    const run = spawnSync(process.execPath, ["scripts/vendor-closure.mjs", ...flags], { stdio: "inherit" });

    if (run.status !== 0) { throw new Error(`vendor-closure ${flags.join(" ")} failed. The record shows how far it got.`); }
}

async function main()
{
    const args = process.argv.slice(2);
    const asset = args.find((a) => !a.startsWith("--"));
    const at = args.indexOf("--reason");
    const reason = at === -1 ? "" : args[at + 1];

    if (!asset) { throw new Error("Usage: npm run lib:deprecate -- <asset> --reason \"<why it moved>\""); }

    const entry = await deprecate(asset, { fetchImpl: fetch, today: todayUtc(), reason });

    // The new version is in node_modules; record it, then name it as the replacement.
    vendor("--record");

    const manifest = JSON.parse(readFileSync("dist/lib-manifest.json", "utf8"));
    const record = readRecord();
    const saved = record.deprecated.find((e) => e.asset === asset && e.version === entry.version);

    saved.replacement = manifest.assets[asset]?.url ?? null;
    writeRecord(record);
    // A normal build last, so every gate passes on what is about to be committed.
    vendor();

    const to = saved.replacement ? `\`${saved.replacement}\`` : "nothing";

    console.log(`\n[lib:deprecate] ${asset} ${entry.version} is deprecated until ${entry.retireAfter}.`);
    console.log("\nCHANGELOG line:\n");
    console.log(`- **${asset} ${entry.version} deprecated**: \`${entry.url}\` keeps serving until `
        + `${entry.retireAfter}, then returns 404. Move to ${to}. ${reason}`);
    console.log("\nApps-team note (for ~/Work/knobby/apps/specs/bugreports/):\n");
    console.log(`# ${asset} ${entry.version} is deprecated: move by ${entry.retireAfter}\n`);
    console.log(`\`https://static.knobby.io${entry.url}\` keeps serving its exact bytes until ${entry.retireAfter}. `
        + `After that date it returns 404. Replace it with ${to}, and take the URL and its \`integrity\` together `
        + "from `https://static.knobby.io/lib-manifest.json`. Every page that loads the old URL must move. "
        + `Reason: ${reason}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
{
    main().catch((err) => { console.error(String(err.message ?? err)); process.exit(1); });
}
