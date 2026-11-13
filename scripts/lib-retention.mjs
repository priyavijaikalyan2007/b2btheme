/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: dd7fb7aa-9096-4dd4-9b1e-67cf74f7df08
 * Created: 2026-11-13
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LibRetention
 * 📜 PURPOSE: The record of served /lib/ versions, the dates that move a
 *    version from current to deprecated to retired, the gates a build
 *    applies, and the notices every build publishes. specs/lib-retention.prd.md
 *    (#147).
 * 🔗 RELATES: [[VendorClosure]], [[VendorAudit]], [[CdnContract]]
 * ⚡ FLOW: [cdn/lib-versions.json] -> [gates | noticeData] -> [manifest, headers, pages]
 * ----------------------------------------------------------------------------
 *
 * WHY A RECORD, AND NOT THE BUILD ALONE
 * -------------------------------------
 * A build serves only what node_modules holds today, so a bump used to
 * make the old URL return 404 on the next deploy. Consumers pin these
 * URLs with SRI hashes. The record says what was published, so a build
 * can tell a bump from a mistake, keep an old version's exact bytes for
 * RETAIN_DAYS, and tell people and agents what is going away and when.
 *
 * Pure: no network and no file system, except readRecord and writeRecord.
 */

// @semantic-marker lib-retention

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

/** Days a replaced version keeps serving its exact bytes. */
export const RETAIN_DAYS = 60;
/** Days a retired version stays listed, so a 404 can be explained. */
export const LIST_RETIRED_DAYS = 90;
/** Days before retirement that the build log warns. */
export const WARN_DAYS = 14;
export const RECORD_PATH = "cdn/lib-versions.json";
export const RETAINED_DIR = "cdn/lib-retained";
export const LIVE_ORIGIN = "https://static.knobby.io";

const DAY_MS = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today as a UTC YYYY-MM-DD date. */
export function todayUtc()
{
    return new Date().toISOString().slice(0, 10);
}

/** Milliseconds at UTC midnight of a YYYY-MM-DD date; throws on any other form. */
function utcMs(date)
{
    if (!DATE.test(date)) { throw new Error(`lib-retention: "${date}" is not a YYYY-MM-DD date.`); }

    return Date.parse(`${date}T00:00:00Z`);
}

/** The UTC date `days` after `date`. */
export function addDays(date, days)
{
    return new Date(utcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`; negative once `to` has passed. */
export function daysUntil(from, to)
{
    return Math.round((utcMs(to) - utcMs(from)) / DAY_MS);
}

/** The SRI form of a SHA-384 digest, as lib-manifest.json writes it. */
export function sriOf(bytes)
{
    return "sha384-" + createHash("sha384").update(bytes).digest("base64");
}

/** The record, as committed. */
export function readRecord(path = RECORD_PATH)
{
    return JSON.parse(readFileSync(path, "utf8"));
}

/** Writes the record with stable formatting. */
export function writeRecord(record, path = RECORD_PATH)
{
    writeFileSync(path, JSON.stringify(record, null, 2) + "\n");
}

/** Where the frozen copy of a served /lib/ path lives. */
export function retainedPath(servedPath)
{
    if (!servedPath.startsWith("/lib/")) { throw new Error(`lib-retention: ${servedPath} is not a /lib/ path.`); }

    return `${RETAINED_DIR}/${servedPath.slice("/lib/".length)}`;
}

/**
 * Gates 1 and 2 of the spec: what this build produced against what was
 * published. A message names the command that fixes it.
 *
 * @param {object} record - The record.
 * @param {Object<string, {version: string, files: Object<string, string>}>} built - Each asset this build wrote.
 * @returns {string[]} Problems; empty means the build matches the record.
 */
export function currentProblems(record, built)
{
    const problems = [];

    for (const [asset, now] of Object.entries(built))
    {
        const was = record.current[asset];

        if (!was)
        {
            problems.push(`${asset} ${now.version} is served but not in ${RECORD_PATH}. A new asset is added `
                + "with `npm run lib:record`.");
            continue;
        }

        if (was.version !== now.version)
        {
            problems.push(`${asset} moved from ${was.version} to ${now.version} without a deprecation, so `
                + `${was.version}'s URL would return 404 on deploy. Run \`npm run lib:deprecate -- ${asset}\` `
                + "on this branch: it keeps the old bytes serving for 60 days.");
            continue;
        }

        problems.push(...fileProblems(asset, now.version, was.files, now.files));
    }

    for (const asset of Object.keys(record.current).filter((a) => !(a in built)))
    {
        problems.push(`${asset} ${record.current[asset].version} is in ${RECORD_PATH} but no longer built. `
            + `Removing a served asset needs a deprecation: \`npm run lib:deprecate -- ${asset}\`.`);
    }

    return problems;
}

/** Files of one version that changed, appeared or vanished; a served file must never change under its URL. */
function fileProblems(asset, version, was, now)
{
    const problems = [];

    for (const [path, sri] of Object.entries(now))
    {
        if (!(path in was)) { problems.push(`${asset} ${version}: ${path} is new under an unchanged version.`); }
        else if (was[path] !== sri)
        {
            problems.push(`${asset} ${version}: ${path} changed bytes under the same URL, which breaks every `
                + "consumer's SRI hash. Find what changed the build, such as a tool upgrade.");
        }
    }

    for (const path of Object.keys(was).filter((p) => !(p in now)))
    {
        problems.push(`${asset} ${version}: ${path} is no longer built under an unchanged version.`);
    }

    return problems;
}

/**
 * Gate 3: the frozen bytes in cdn/lib-retained against the deprecated entries.
 *
 * @param {object} record - The record.
 * @param {(servedPath: string) => Buffer|null} read - A frozen file's bytes, or null when absent.
 * @param {() => string[]} list - The served paths of every frozen file present.
 * @returns {string[]} Problems; empty means every frozen file is present and unchanged.
 */
export function retainedProblems(record, read, list)
{
    const problems = [];
    const expected = new Map(record.deprecated.flatMap((e) => Object.entries(e.files)));

    for (const [path, sri] of expected)
    {
        const bytes = read(path);

        if (bytes === null) { problems.push(`${retainedPath(path)} is missing. Its deprecated entry needs it.`); }
        else if (sriOf(bytes) !== sri)
        {
            problems.push(`${retainedPath(path)} does not match its recorded hash. Frozen bytes must never change.`);
        }
    }

    for (const path of list().filter((p) => !expected.has(p)))
    {
        problems.push(`${retainedPath(path)} is in ${RETAINED_DIR} but no deprecated entry names it.`);
    }

    return problems;
}

/** Deprecated entries past their retireAfter date. */
export function overdue(record, today)
{
    return record.deprecated.filter((e) => daysUntil(today, e.retireAfter) < 0);
}

/** Deprecated entries within WARN_DAYS of retiring, and not yet overdue. */
export function dueSoon(record, today)
{
    return record.deprecated.filter((e) =>
    {
        const left = daysUntil(today, e.retireAfter);

        return left >= 0 && left <= WARN_DAYS;
    });
}

/**
 * Everything the notices say, as of one build.
 *
 * @param {object} record - The record.
 * @param {Object<string, {version: string, url: string}>} assets - lib-manifest.json's assets.
 * @param {string} today - YYYY-MM-DD, UTC.
 * @param {string} generated - The build's ISO timestamp.
 */
export function noticeData(record, assets, today, generated)
{
    return {
        generated,
        policy: { retainDays: RETAIN_DAYS, listRetiredDays: LIST_RETIRED_DAYS },
        current: Object.fromEntries(Object.entries(assets).map(([asset, a]) =>
            [asset, { version: a.version, url: a.url }])),
        deprecated: record.deprecated.map((e) => ({
            asset: e.asset, version: e.version, url: e.url, integrity: e.integrity, packages: e.packages,
            deprecatedOn: e.deprecatedOn, retireAfter: e.retireAfter,
            daysRemaining: daysUntil(today, e.retireAfter),
            replacement: e.replacement, reason: e.reason,
        })),
        retired: record.retired.filter((r) => daysUntil(r.retiredOn, today) <= LIST_RETIRED_DAYS),
    };
}

/** The _headers path a deprecated entry's rule covers: its one file, or its versioned directory. */
function rulePath(entry, files)
{
    const paths = Object.keys(files);

    if (paths.length === 1 && paths[0] === entry.url) { return entry.url; }

    const dir = `/lib/${entry.asset}-${entry.version}/`;
    const outside = paths.filter((p) => !p.startsWith(dir));

    if (outside.length > 0)
    {
        throw new Error(`lib-retention: ${entry.asset} ${entry.version} has files outside ${dir}: `
            + `${outside.join(", ")}. One _headers rule cannot cover them.`);
    }

    return `${dir}*`;
}

/**
 * Cloudflare _headers rules for each deprecated path: Deprecation (RFC 9745),
 * Sunset (RFC 8594) and, when one exists, a successor-version Link.
 *
 * @param {object} notice - noticeData's result.
 * @param {object} record - The record the notice came from, for each entry's files.
 */
export function headerRules(notice, record)
{
    return notice.deprecated.map((e) =>
    {
        const full = record.deprecated.find((d) => d.asset === e.asset && d.version === e.version);

        if (!full) { throw new Error(`lib-retention: the notice lists ${e.asset} ${e.version}, which the record does not.`); }

        const lines = [
            rulePath(e, full.files),
            `  Deprecation: @${utcMs(e.deprecatedOn) / 1000}`,
            `  Sunset: ${new Date(utcMs(e.retireAfter)).toUTCString()}`,
        ];

        if (e.replacement) { lines.push(`  Link: <${e.replacement}>; rel="successor-version"`); }

        return lines.join("\n");
    }).join("\n\n");
}

/** A Markdown table cell: backslashes first, so an escaped pipe in the text cannot unescape. */
export function cell(text)
{
    return String(text).replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

/** The human page, also served as Markdown for agents. */
export function noticeMarkdown(notice)
{
    const deprecated = notice.deprecated.length === 0 ? "No version is deprecated."
        : ["| Asset | Version | URL | Retires after | Days left | Replacement | Reason |",
            "|---|---|---|---|---|---|---|",
            ...notice.deprecated.map((e) => `| ${e.asset} | ${e.version} | \`${e.url}\` | ${e.retireAfter} | `
                + `${e.daysRemaining} | ${e.replacement ? `\`${e.replacement}\`` : "none"} | ${cell(e.reason)} |`),
        ].join("\n");
    const current = ["| Asset | Version | URL |", "|---|---|---|",
        ...Object.entries(notice.current).map(([asset, c]) => `| ${asset} | ${c.version} | \`${c.url}\` |`),
    ].join("\n");
    const retired = notice.retired.length === 0 ? "None."
        : ["| Asset | Version | URL | Retired on | Replacement | Reason |", "|---|---|---|---|---|---|",
            ...notice.retired.map((r) => `| ${r.asset} | ${r.version} | \`${r.url}\` | ${r.retiredOn} | `
                + `${r.replacement ? `\`${r.replacement}\`` : "none"} | ${cell(r.reason)} |`),
        ].join("\n");

    return [
        "<!-- AGENT: Generated on every build from cdn/lib-versions.json. The /lib/ versions this CDN serves, "
            + "the deprecated ones with their retire dates, and recent retirements. "
            + "Machine-readable form: /lib-deprecations.json. -->",
        "",
        "# /lib/ versions: current, deprecated and retired",
        "",
        `Generated ${notice.generated}.`,
        "",
        `When a newer version replaces one, the old version keeps serving its exact bytes for ${notice.policy.retainDays} `
            + "days. Then it is retired, and its URL returns 404. Each deprecated path sends `Deprecation`, `Sunset` "
            + "and, when there is one, a `Link` to its replacement. Read the same data as JSON at "
            + "`/lib-deprecations.json`, or in the `deprecated` and `retired` fields of `/lib-manifest.json`.",
        "",
        "## Deprecated",
        "",
        deprecated,
        "",
        "## Current",
        "",
        current,
        "",
        `## Retired in the last ${notice.policy.listRetiredDays} days`,
        "",
        retired,
        "",
    ].join("\n");
}

/** The build log's summary block. */
export function summaryLines(notice, today)
{
    const lines = [`[lib] ${Object.keys(notice.current).length} current, ${notice.deprecated.length} deprecated, `
        + `${notice.retired.length} retired in the last ${notice.policy.listRetiredDays} days`];

    for (const e of notice.deprecated)
    {
        lines.push(`[lib]   ${e.asset} ${e.version}: ${e.daysRemaining} days left (retires after ${e.retireAfter})`
            + (e.replacement ? ` -> ${e.replacement}` : ""));
    }

    for (const e of notice.deprecated)
    {
        const left = daysUntil(today, e.retireAfter);

        if (left >= 0 && left <= WARN_DAYS)
        {
            lines.push(`[lib] WARNING: ${e.asset} ${e.version} retires in ${left} days (after ${e.retireAfter})`);
        }
    }

    return lines;
}
