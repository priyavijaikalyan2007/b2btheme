#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: LibVerifyLive
 * 📜 PURPOSE: Download recorded /lib/ files from the live CDN and prove each
 *    one against its recorded hash. `npm run lib:verify-live` checks every
 *    current file; lib-deprecate.mjs uses fetchVerified to freeze an old
 *    version. specs/lib-retention.prd.md §7 (#147).
 * 🔗 RELATES: [[LibRetention]], [[LibDeprecate]]
 * ⚡ FLOW: [record files] -> [GET LIVE_ORIGIN + path] -> [sha384 compare] -> [bytes | problems]
 *
 * A mismatch is never repaired or substituted. It means the CDN does not
 * serve what the record says, and a person has to find out why.
 */

import { fileURLToPath } from "node:url";

import { LIVE_ORIGIN, readRecord, sriOf } from "./lib-retention.mjs";

/**
 * Downloads each file and checks its hash.
 *
 * @param {Object<string, string>} files - Served path to recorded SRI.
 * @param {typeof fetch} fetchImpl - fetch, or a stub in tests.
 * @param {string} [origin] - The CDN origin.
 * @returns {Promise<{bytes: Map<string, Buffer>, problems: string[]}>}
 */
export async function fetchVerified(files, fetchImpl, origin = LIVE_ORIGIN)
{
    const bytes = new Map();
    const problems = [];

    for (const [path, sri] of Object.entries(files))
    {
        const response = await fetchImpl(`${origin}${path}`);

        if (!response.ok) { problems.push(`${origin}${path} returned ${response.status}.`); continue; }

        const body = Buffer.from(await response.arrayBuffer());

        if (sriOf(body) !== sri) { problems.push(`${origin}${path} does not match its recorded hash.`); continue; }

        bytes.set(path, body);
    }

    return { bytes, problems };
}

async function main()
{
    const record = readRecord();
    const files = Object.assign({}, ...Object.values(record.current).map((c) => c.files));
    const { bytes, problems } = await fetchVerified(files, fetch);

    if (problems.length > 0)
    {
        console.error(`[lib-verify-live] ${problems.length} of ${Object.keys(files).length} files differ:\n  `
            + problems.join("\n  "));
        process.exit(1);
    }

    console.log(`[lib-verify-live] all ${bytes.size} current files match ${LIVE_ORIGIN}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
{
    main().catch((err) => { console.error(`[lib-verify-live] ${err.message ?? err}`); process.exit(1); });
}
