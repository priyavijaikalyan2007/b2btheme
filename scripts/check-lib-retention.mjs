#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: LibRetentionCheck
 * 📜 PURPOSE: Structure check [32]. A deprecated /lib/ version past its
 *    retireAfter date fails CI until it is retired; one within WARN_DAYS
 *    warns. specs/lib-retention.prd.md §6, gate 4 (#147).
 * 🔗 RELATES: [[LibRetention]], [[LibRetire]]
 * ⚡ FLOW: [cdn/lib-versions.json + today] -> [overdue | dueSoon] -> [exit code]
 *
 * This runs in test:structure, never in npm run build, so the calendar
 * can fail a pull request but never block a deploy.
 *
 * Usage: node scripts/check-lib-retention.mjs [--today YYYY-MM-DD]
 */

import { fileURLToPath } from "node:url";

import { daysUntil, dueSoon, overdue, readRecord, todayUtc } from "./lib-retention.mjs";

/**
 * What the check reports for one record on one day.
 *
 * @returns {{problems: string[], warnings: string[]}}
 */
export function checkRetention(record, today)
{
    return {
        problems: overdue(record, today).map((e) => `${e.asset} ${e.version} was due to retire after `
            + `${e.retireAfter}. Run \`npm run lib:retire -- ${e.asset}@${e.version}\` and commit the result.`),
        warnings: dueSoon(record, today).map((e) => `${e.asset} ${e.version} retires in `
            + `${daysUntil(today, e.retireAfter)} days (after ${e.retireAfter}).`),
    };
}

function main()
{
    const at = process.argv.indexOf("--today");
    const today = at === -1 ? todayUtc() : process.argv[at + 1];
    const { problems, warnings } = checkRetention(readRecord(), today);

    warnings.forEach((w) => console.log(`  WARN: ${w}`));

    if (problems.length > 0)
    {
        problems.forEach((p) => console.error(`  ${p}`));
        process.exit(1);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url))
{
    try { main(); }
    catch (err) { console.error(String(err.message ?? err)); process.exit(1); }
}
