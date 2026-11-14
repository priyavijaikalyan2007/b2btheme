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
 * Usage: npm run lib:deprecate -- <asset> [<asset> ...] --reason "<why it moved>"
 *
 * One package can name several assets (vditor names vditor, vditor-css and
 * vditor-integrity). List every asset the build names, in one command.
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
import { servedVersions } from "./vendor-closure.mjs";

/**
 * Freezes the current version of an asset and records it as deprecated.
 * The record is written only after every file is proved and frozen.
 *
 * @param {string} asset - The asset name, as in lib-manifest.json.
 * @param {{fetchImpl: typeof fetch, today: string, reason: string, next: {version: string, namedBy: string}|null,
 *     root?: string, origin?: string}} options - `next` is what node_modules would build now, or null when the
 *     asset is being removed.
 * @returns {Promise<object>} The deprecated entry, with replacement null until the new version is recorded.
 */
export async function deprecate(asset, { fetchImpl, today, reason, next, root = ".", origin = LIVE_ORIGIN })
{
    if (!reason) { throw new Error("lib:deprecate needs a reason: --reason \"<why it moved>\"."); }

    const recordPath = join(root, RECORD_PATH);
    const record = readRecord(recordPath);
    const current = record.current[asset];

    if (!current) { throw new Error(`lib:deprecate: ${asset} is not a current asset in ${RECORD_PATH}.`); }

    if (next !== null && next.version === current.version)
    {
        throw new Error(`lib:deprecate: ${asset} is still ${current.version} in node_modules, so its URL would not `
            + `change. A package inside it moved, but not ${next.namedBy}, whose version names the URL. Bump `
            + `${next.namedBy} on the same branch, or close the bump. Nothing changed.`);
    }

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
    const at = args.indexOf("--reason");
    const reason = at === -1 ? "" : args[at + 1];
    const assets = args.filter((a, i) => !a.startsWith("--") && i !== at + 1);

    if (assets.length === 0)
    {
        throw new Error("Usage: npm run lib:deprecate -- <asset> [<asset> ...] --reason \"<why it moved>\"");
    }

    const next = servedVersions();
    const entries = [];

    // Every asset is proved and frozen before the record is rebuilt, so one bad asset stops all of them.
    for (const asset of assets)
    {
        entries.push(await deprecate(asset, { fetchImpl: fetch, today: todayUtc(), reason, next: next[asset] ?? null }));
    }

    // The new versions are in node_modules; record exactly these, then name each replacement.
    vendor("--record", "--moved", assets.join(","));

    const manifest = JSON.parse(readFileSync("dist/lib-manifest.json", "utf8"));
    const record = readRecord();

    for (const entry of entries)
    {
        const saved = record.deprecated.find((e) => e.asset === entry.asset && e.version === entry.version);

        saved.replacement = manifest.assets[entry.asset]?.url ?? null;
        entry.replacement = saved.replacement;
    }

    writeRecord(record);
    // A normal build last, so every gate passes on what is about to be committed.
    vendor();

    for (const entry of entries)
    {
        const to = entry.replacement ? `\`${entry.replacement}\`` : "nothing";

        console.log(`\n[lib:deprecate] ${entry.asset} ${entry.version} is deprecated until ${entry.retireAfter}.`);
        console.log("\nCHANGELOG line:\n");
        console.log(`- **${entry.asset} ${entry.version} deprecated**: \`${entry.url}\` keeps serving until `
            + `${entry.retireAfter}, then may return 404. Move to ${to}. ${reason}`);
        console.log("\nApps-team note (for ~/Work/knobby/apps/specs/bugreports/):\n");
        console.log(`# ${entry.asset} ${entry.version} is deprecated: move by ${entry.retireAfter}\n`);
        console.log(`\`https://static.knobby.io${entry.url}\` keeps serving its exact bytes until `
            + `${entry.retireAfter}. After that date it may return 404. Replace it with ${to}, and take the URL and `
            + "its `integrity` together from `https://static.knobby.io/lib-manifest.json`. Every page that loads "
            + `the old URL must move. Reason: ${reason}`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
{
    main().catch((err) => { console.error(String(err.message ?? err)); process.exit(1); });
}
