#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: LibNotices
 * 📜 PURPOSE: On every build, tell people and agents which /lib/ versions are
 *    current, which are deprecated and for how many more days, and which were
 *    retired recently. specs/lib-retention.prd.md §8 (#147).
 * 🔗 RELATES: [[LibRetention]], [[DocGenerator]], [[CdnContract]]
 * ⚡ FLOW: [cdn/lib-versions.json + dist/lib-manifest.json]
 *          -> [lib-deprecations.json | .md | docs/lib-deprecations.html | _headers] -> [build log]
 *
 * Runs after build:docs, so dist/docs exists, and rebuilds dist/_headers
 * from cdn/_headers, so running it twice gives the same file. Nothing it
 * writes is committed: the day counts change daily.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { RECORD_PATH, headerRules, noticeData, noticeMarkdown, readRecord, summaryLines, todayUtc }
    from "./lib-retention.mjs";

const { convertMarkdown, wrapHtml } = createRequire(import.meta.url)("./generate-docs.js");

/** Cloudflare's documented limit on _headers rules. */
const MAX_HEADER_RULES = 100;

/**
 * Writes every notice under root/dist and returns the build-log summary.
 *
 * @param {{root?: string, today: string}} options
 * @returns {string[]} The summary lines.
 */
export function writeNotices({ root = ".", today })
{
    const record = readRecord(join(root, RECORD_PATH));
    const manifest = JSON.parse(readFileSync(join(root, "dist/lib-manifest.json"), "utf8"));
    const notice = noticeData(record, manifest.assets, today, manifest.generated);
    const markdown = noticeMarkdown(notice);
    const rules = headerRules(notice, record);
    const source = readFileSync(join(root, "cdn/_headers"), "utf8").trimEnd();
    const headers = rules
        ? `${source}\n\n# Deprecated /lib/ versions, generated from ${RECORD_PATH} (#147).\n${rules}\n`
        : `${source}\n`;
    const count = headers.split("\n").filter((line) => line.startsWith("/")).length;

    if (count > MAX_HEADER_RULES)
    {
        throw new Error(`lib-notices: ${count} _headers rules is over Cloudflare's limit of ${MAX_HEADER_RULES}. `
            + "Retire a deprecated version, or merge rules in cdn/_headers.");
    }

    writeFileSync(join(root, "dist/lib-deprecations.json"), JSON.stringify(notice, null, 2) + "\n");
    writeFileSync(join(root, "dist/lib-deprecations.md"), markdown);
    writeFileSync(join(root, "dist/docs/lib-deprecations.html"),
        wrapHtml("/lib/ deprecations", convertMarkdown(markdown)));
    writeFileSync(join(root, "dist/_headers"), headers);

    return summaryLines(notice, today);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
{
    try
    {
        for (const line of writeNotices({ today: todayUtc() })) { console.log(line); }
    }
    catch (err)
    {
        console.error(String(err.message ?? err));
        process.exit(1);
    }
}
