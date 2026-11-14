/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: LibLicenses
 * 📜 PURPOSE: Serve the license text of every package inside a /lib/ asset,
 *    current or deprecated, at /licenses/<package>@<version>/. The apps build
 *    their third-party notices from these, so that build reads no public CDN.
 *    specs/bugreports/2026-11-14-lib-404-caching-and-deprecation-notice-
 *    timing.md, item 4.
 * 🔗 RELATES: [[VendorClosure]], [[LibRetention]], [[CdnContract]]
 * ⚡ FLOW: [package dir the build resolved] -> [cdn/licenses.json + cdn/licenses/]
 *          -> [dist/licenses/] + [lib-manifest.json `licenses`]
 *
 * WHY THE TEXTS ARE COMMITTED
 * ---------------------------
 * A deprecated version keeps serving for 60 days after node_modules has
 * moved on, so its license cannot come from node_modules then. A text is
 * committed while its version is current, and it stays until no asset
 * names that version. A package that ships no license file (SignalR 8.0.0
 * on npm) has a text saved by hand, and its entry names where it came from.
 *
 * Pure, except the functions marked as reading or writing files.
 */

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { sriOf } from "./lib-retention.mjs";

export const LICENSES_INDEX = "cdn/licenses.json";
export const LICENSES_DIR = "cdn/licenses";

/** A license file's name: LICENSE, LICENCE, COPYING or NOTICE, an optional -SUFFIX, and an optional .md or .txt. */
export const LICENSE_FILE = /^(licen[cs]e|copying|notice)(-[a-z0-9]+)?(\.(md|txt))?$/i;

/** The key of one package version, as the index and the served path write it. */
export function licenseKey(name, version)
{
    return `${name}@${version}`;
}

/**
 * The served path of one license file, percent-encoded. Cloudflare answers
 * a path with `@` in it with a 307 to its `%40` form, so the manifest gives
 * that form, and a fetch needs no redirect.
 */
export function licenseUrl(key, file)
{
    return "/licenses/" + [...key.split("/"), file].map(encodeURIComponent).join("/");
}

/**
 * Reads files. The SPDX expression and license files of one installed package.
 *
 * @param {string} root - The package's directory, such as node_modules/@a2ui/web_core/node_modules/zod.
 * @returns {{license: string, files: Object<string, Buffer>}} No files when the package ships none.
 */
export function readLicenseSource(root)
{
    const { license } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

    if (typeof license !== "string")
    {
        throw new Error(`[lib-licenses] ${root}/package.json has no SPDX "license" string.`);
    }

    const names = readdirSync(root).filter((name) => LICENSE_FILE.test(name)).sort();

    return { license, files: Object.fromEntries(names.map((name) => [name, readFileSync(join(root, name))])) };
}

/** The index entry for a source: its SPDX expression and each file's hash. */
export function entryOf(source)
{
    return { license: source.license,
        files: Object.fromEntries(Object.entries(source.files).map(([name, bytes]) => [name, sriOf(bytes)])) };
}

/** True when two sources hold the same SPDX expression and the same bytes under the same names. */
export function sameSource(a, b)
{
    return JSON.stringify(entryOf(a)) === JSON.stringify(entryOf(b));
}

/**
 * What the committed texts need, against what this build serves.
 *
 * @param {Object<string, {license: string, files: Object<string, string>, source?: string}>} index - cdn/licenses.json.
 * @param {Map<string, {license: string, files: Object<string, Buffer>}>} current - Each package version a current
 *     asset holds, read from the directory the build resolved.
 * @param {Set<string>} deprecated - Each package version a deprecated entry holds.
 * @returns {{problems: string[], add: Map<string, {license: string, files: Object<string, Buffer>}>, stray: string[]}}
 *     `add` and `stray` are what `--record` writes and removes.
 */
export function licensePlan(index, current, deprecated)
{
    const problems = [];
    const add = new Map();

    for (const [key, source] of current)
    {
        const entry = index[key];
        const shipsFiles = Object.keys(source.files).length > 0;

        if (!entry)
        {
            if (shipsFiles) { add.set(key, source); }
            else
            {
                problems.push(`${key} ships no license file. Save its source repository's license, at the tag of `
                    + `this version, as ${LICENSES_DIR}/${key}/LICENSE.txt. Then add an entry to ${LICENSES_INDEX} `
                    + "with its SPDX expression, the file's sha384 and the `source` URL.");
            }
            continue;
        }

        if (entry.license !== source.license)
        {
            problems.push(`${key}: ${LICENSES_INDEX} records "${entry.license}", but its package.json says `
                + `"${source.license}".`);
        }

        if (shipsFiles && (entry.source
            || JSON.stringify(entry.files) !== JSON.stringify(entryOf(source).files)))
        {
            problems.push(`${key}: the committed license files differ from the package's own, under the same `
                + "version. A license text never changes under its URL.");
        }

        if (!shipsFiles && !entry.source)
        {
            problems.push(`${key} ships no license file, so its entry in ${LICENSES_INDEX} must name its \`source\`.`);
        }
    }

    for (const key of deprecated)
    {
        if (!current.has(key) && !index[key])
        {
            problems.push(`${key} is in a deprecated entry, but ${LICENSES_INDEX} has no text for it. Its text is `
                + "committed while it is current, so this is a lost file. Restore it from git.");
        }
    }

    const stray = Object.keys(index).filter((key) => !current.has(key) && !deprecated.has(key)).sort();

    return { problems, add, stray };
}

/** The problems a plain build reports for what only `--record` may write or remove. */
export function unrecordedProblems(plan)
{
    return [
        ...[...plan.add.keys()].map((key) => `${key} is served, but ${LICENSES_INDEX} has no license text for it. `
            + "Run `npm run lib:record`."),
        ...plan.stray.map((key) => `${key} is in ${LICENSES_INDEX}, but no current or deprecated asset holds it. `
            + "Run `npm run lib:record` to remove it."),
    ];
}

/**
 * The committed files against the index: each one present and unchanged, and no others.
 *
 * @param {object} index - cdn/licenses.json.
 * @param {(key: string, file: string) => Buffer|null} read - A committed file's bytes, or null when absent.
 * @param {string[]} present - Every committed file, as "<key>/<file>".
 * @returns {string[]} Problems; empty means the tree matches the index.
 */
export function treeProblems(index, read, present)
{
    const problems = [];
    const expected = new Set();

    for (const [key, entry] of Object.entries(index))
    {
        for (const [file, sri] of Object.entries(entry.files))
        {
            const bytes = read(key, file);

            expected.add(`${key}/${file}`);

            if (bytes === null) { problems.push(`${LICENSES_DIR}/${key}/${file} is missing. ${LICENSES_INDEX} names it.`); }
            else if (sriOf(bytes) !== sri)
            {
                problems.push(`${LICENSES_DIR}/${key}/${file} does not match its hash in ${LICENSES_INDEX}.`);
            }
        }
    }

    for (const path of present.filter((p) => !expected.has(p)))
    {
        problems.push(`${LICENSES_DIR}/${path} is not named in ${LICENSES_INDEX}.`);
    }

    return problems;
}

/**
 * The manifest's `licenses` field for one asset, keyed like its `packages`.
 *
 * @param {Object<string, string>} packages - Package name to version.
 * @param {object} index - cdn/licenses.json, after every gate has passed.
 * @returns {Object<string, {license: string, files: string[]}>}
 */
export function licensesField(packages, index)
{
    return Object.fromEntries(Object.entries(packages).map(([name, version]) =>
    {
        const key = licenseKey(name, version);
        const entry = index[key];

        if (!entry) { throw new Error(`[lib-licenses] ${key} has no entry in ${LICENSES_INDEX}.`); }

        return [name, { license: entry.license, files: Object.keys(entry.files).map((file) => licenseUrl(key, file)) }];
    }));
}

/** Reads files. The index, as committed. */
export function readIndex(root = ".")
{
    return JSON.parse(readFileSync(join(root, LICENSES_INDEX), "utf8"));
}

/** Writes files. The index with sorted keys, and stable formatting. */
export function writeIndex(index, root = ".")
{
    const sorted = Object.fromEntries(Object.keys(index).sort().map((key) => [key, index[key]]));

    writeFileSync(join(root, LICENSES_INDEX), JSON.stringify(sorted, null, 2) + "\n");
}

/**
 * Writes files. Applies a plan to the committed texts, for `--record`.
 *
 * @returns {object} The new index.
 */
export function applyPlan(index, plan, root = ".")
{
    const next = { ...index };

    for (const [key, source] of plan.add)
    {
        const dir = join(root, LICENSES_DIR, key);

        mkdirSync(dir, { recursive: true });

        for (const [file, bytes] of Object.entries(source.files)) { writeFileSync(join(dir, file), bytes); }

        next[key] = entryOf(source);
    }

    for (const key of plan.stray)
    {
        rmSync(join(root, LICENSES_DIR, key), { recursive: true });
        // A scoped package leaves its @scope directory behind when it was the last one.
        const scope = key.startsWith("@") ? join(root, LICENSES_DIR, key.split("/")[0]) : null;

        if (scope && readdirSync(scope).length === 0) { rmSync(scope, { recursive: true }); }

        delete next[key];
    }

    writeIndex(next, root);

    return next;
}
