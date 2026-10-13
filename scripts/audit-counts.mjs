#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ CHECK: every count in CODEBASE_FIXES.md must be re-derivable.
 *
 * WHY THIS EXISTS. The March 2026 audit recorded counts that nobody can
 * reproduce, and the error is not small. Three worked examples:
 *
 *   - LOG-1 recorded 406 `console.log` occurrences and named
 *     `diagramengine` as the worst offender with 72. The tree holds 176
 *     lines containing the token, and 161 of them are the body of a
 *     logging shim, where `console.log` is the CORRECT mapping for INFO
 *     per FRONTEND_LOGGING.md. Two are real call sites.
 *   - WIN-1 was re-measured on 2026-10-12 as 311 occurrences on 203
 *     lines in 113 files. The file count is right. No file set in this
 *     repository yields 311 or 203, the code is byte-identical at every
 *     commit since, and the true figure is 294 occurrences on 186 lines.
 *   - LOG-1 was measured three times (406, 200, 176) with no change to
 *     the code in between, because the file set and the pattern were
 *     never written down.
 *
 * A count whose file set and pattern are not stated is not a measurement.
 * This script states both, in code, so every number in the tracker can be
 * re-derived with one command instead of being retyped from memory.
 *
 * HOW IT GATES. Each count carries a BASELINE measured on the date noted.
 * A count above its baseline fails the suite, so these numbers ratchet
 * down and never drift up silently. Lowering a baseline is the normal way
 * to record progress.
 *
 * WHAT IT CANNOT SEE. It counts tokens, not intent. It cannot tell whether
 * a call site chose `logDebug` where `logInfo` was right, which is the
 * question LOG-1 was really asking and is not answerable by grep. It also
 * trusts its own classifier, which is why that classifier has a test:
 * `scripts/audit-counts.test.ts`. Two classifier bugs produced false
 * findings while this script was being written, so the test is not
 * ceremony.
 *
 * Run: node scripts/audit-counts.mjs
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * THE FILE SET, stated once. Tracked TypeScript sources only: no test or
 * spec files, because a violation in a test is not a violation in the
 * library, nothing under `dist/`, which is generated, and no `.d.ts`
 * declaration file, which holds types rather than executable code. That
 * last exclusion means `components/globals.d.ts` is outside every count
 * here, including the marker count, so its `COMPONENT:` marker is a
 * convention this script does not enforce.
 */
export function sourceFiles()
{
    const out = execFileSync("git", ["ls-files", "*.ts"], { encoding: "utf8" });
    return out.split("\n")
        .filter(Boolean)
        .filter((f) => !/\.(test|spec)\.ts$/.test(f))
        .filter((f) => !/\.d\.ts$/.test(f))
        .filter((f) => !f.startsWith("dist/"));
}

/** Component sources only, used for the logging-pattern counts. */
export function componentFiles()
{
    return sourceFiles().filter((f) => f.startsWith("components/"));
}

/**
 * Is the match at `index` inside a quoted string? `diagramengine` draws
 * sample code on a canvas as string data, so `text: "  console.log(msg);"`
 * is a pixel, not a call.
 *
 * This scans once and tracks WHICH quote is open, rather than each quote
 * type's parity separately. Parity per type is wrong the moment a string
 * contains the other quote: in `const s = "it\'s"; console.log(s);` the
 * apostrophe leaves an odd single-quote count and a real call site reads as
 * string data. That case is in the tests.
 */
export function insideStringLiteral(line, index)
{
    let quote = null;
    for (let i = 0; i < index; i += 1)
    {
        const ch = line[i];
        if (ch === "\\") { i += 1; continue; }
        if (quote === null)
        {
            if (ch === '"' || ch === "'" || ch === "`") { quote = ch; }
        }
        else if (ch === quote)
        {
            quote = null;
        }
    }
    return quote !== null;
}

/**
 * Classify one line that contains `console.log`. The five outcomes are
 * disjoint and only `"call"` is a real call site.
 */
export function classifyConsoleLog(line, file = "")
{
    const index = line.indexOf("console.log");
    if (index < 0) { return "none"; }

    const trimmed = line.trimStart();
    if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*"))
    {
        return "doc-example";
    }
    if (insideStringLiteral(line, index)) { return "string-literal"; }
    if (/console\.log\(new Date\(\)\.toISOString\(\)/.test(line)) { return "shim-body"; }
    if (file.endsWith("components/logutility/logutility.ts")) { return "utility-terminus"; }
    return "call";
}

/**
 * Classify a component file against FRONTEND_LOGGING.md, which says every
 * component MUST carry the shim plus a `createLogUtility` check.
 */
export function classifyLoggingPattern(text)
{
    // A console call inside a string literal is data, not logging. The
    // ui-component stencils draw sample source onto the canvas, so
    // `{ text: "  console.log(msg);" }` is a pixel. classifyConsoleLog has
    // always known this. This classifier did not, and it reported
    // stencils-ui-components.ts as a standards violation for one drawn
    // string. Both now ask the same scanner.
    let hasConsole = false;
    for (const line of text.split("\n"))
    {
        const at = line.search(/console\.(log|debug|warn|error|trace|info)\b/);
        if (at !== -1 && !insideStringLiteral(line, at)) { hasConsole = true; break; }
    }

    // `createLogUtility` is the component resolving LogUtility for itself.
    // `makeLogger(` is a module inside the DiagramEngine bundle taking its
    // helpers from src/logging.ts, which resolves LogUtility once for all
    // twenty namespaces. Without this second form the seventeen engine
    // modules read as "no-logging" while holding 192 log calls, and the
    // count would be right by accident. See FRONTEND_LOGGING.md section 1.1.
    const hasUtility = text.includes("createLogUtility") || /\bmakeLogger\(/.test(text);
    const hasShim = /console\.(log|debug|warn|error)\(new Date\(\)\.toISOString\(\)/.test(text);

    if (hasUtility) { return "conforms"; }
    if (hasShim) { return "shim-without-utility"; }
    if (hasConsole) { return "direct-console"; }
    return "no-logging";
}

/**
 * Occurrences, not lines. `grep -c` counts lines and silently overrides
 * `-o`, which is how the 203-line figure became an occurrence count.
 */
export function countOccurrences(text, needle)
{
    let n = 0;
    let i = text.indexOf(needle);
    while (i !== -1)
    {
        n += 1;
        i = text.indexOf(needle, i + needle.length);
    }
    return n;
}

/**
 * Baselines measured 2026-10-13. windowAnyCasts, windowAnyFiles,
 * anyAnnotations, scssImportant and the three marker counts were measured at
 * 38c6f1b. The three logging counts and diagramengineLines were re-measured
 * after LOG-2 landed. Ratchet down only.
 */
const BASELINES = {
    windowAnyCasts: 294,
    windowAnyFiles: 113,
    consoleLogCalls: 0,
    shimWithoutUtility: 0,
    directConsole: 0,
    anyAnnotations: 88,
    scssImportant: 113,
    componentsMissingMarker: 3,
    diagramengineSrcMissingMarker: 2,
    scssMissingMarker: 4,
    diagramengineLines: 30479,
};

function measure()
{
    const files = sourceFiles();
    const counts = {
        windowAnyCasts: 0,
        windowAnyFiles: 0,
        consoleLogCalls: 0,
        shimWithoutUtility: 0,
        directConsole: 0,
        anyAnnotations: 0,
        scssImportant: 0,
        componentsMissingMarker: 0,
        diagramengineSrcMissingMarker: 0,
        scssMissingMarker: 0,
        diagramengineLines: 0,
    };
    const consoleLogKinds = {};
    const callSites = [];
    const nonConforming = [];

    for (const file of files)
    {
        const text = readFileSync(file, "utf8");

        const casts = countOccurrences(text, "window as any");
        counts.windowAnyCasts += casts;
        if (casts > 0) { counts.windowAnyFiles += 1; }

        counts.anyAnnotations += (text.match(/:\s*any\b/g) ?? []).length;

        for (const [n, line] of text.split("\n").entries())
        {
            if (!line.includes("console.log")) { continue; }
            const kind = classifyConsoleLog(line, file);
            consoleLogKinds[kind] = (consoleLogKinds[kind] ?? 0) + 1;
            if (kind === "call")
            {
                counts.consoleLogCalls += 1;
                callSites.push(`${file}:${n + 1}`);
            }
        }
    }

    for (const file of componentFiles())
    {
        const kind = classifyLoggingPattern(readFileSync(file, "utf8"));
        if (kind === "shim-without-utility") { counts.shimWithoutUtility += 1; nonConforming.push(file); }
        if (kind === "direct-console") { counts.directConsole += 1; nonConforming.push(file); }
    }

    // IMP-1 is about the SCSS SOURCES. The tracked .css files are generated,
    // so counting them measures the build rather than the code.
    const scss = execFileSync("git", ["ls-files", "*.scss"], { encoding: "utf8" })
        .split("\n").filter(Boolean).filter((f) => !f.startsWith("dist/"));
    for (const file of scss)
    {
        counts.scssImportant += countOccurrences(readFileSync(file, "utf8"), "!important");
    }

    // MRK-1/-2/-3 (MARKERS.md). All three entries were recorded in March 2026
    // and all three are wrong, MRK-2 by a factor of eleven.
    const unmarked = [];
    for (const file of componentFiles())
    {
        if (readFileSync(file, "utf8").includes("COMPONENT:")) { continue; }
        counts.componentsMissingMarker += 1;
        unmarked.push(file);
        if (file.startsWith("components/diagramengine/src/")) { counts.diagramengineSrcMissingMarker += 1; }
    }

    const scssSources = execFileSync("git", ["ls-files", "components/*/*.scss"], { encoding: "utf8" })
        .split("\n").filter(Boolean);
    for (const file of scssSources)
    {
        if (!readFileSync(file, "utf8").includes("COMPONENT:")) { counts.scssMissingMarker += 1; }
    }

    // STD-1. The file is the single largest in the repository and the entry
    // recorded its length, so the length is a tracked count.
    counts.diagramengineLines = readFileSync("components/diagramengine/diagramengine.ts", "utf8")
        .split("\n").length - 1;

    return { counts, consoleLogKinds, callSites, nonConforming, unmarked, fileCount: files.length };
}

function main()
{
    const { counts, consoleLogKinds, callSites, nonConforming, unmarked, fileCount } = measure();

    console.log(`  file set: ${fileCount} tracked .ts sources, excluding tests, declarations and dist`);
    console.log("  console.log lines by kind: "
        + Object.entries(consoleLogKinds).sort().map(([k, v]) => `${k}=${v}`).join(", "));

    const failures = [];
    for (const [key, baseline] of Object.entries(BASELINES))
    {
        const actual = counts[key];
        const mark = actual > baseline ? "OVER" : (actual < baseline ? "under" : "at");
        console.log(`  ${key.padEnd(30)} ${String(actual).padStart(5)}  (baseline ${baseline}, ${mark})`);
        if (actual > baseline)
        {
            failures.push(`${key}: ${actual} exceeds the baseline of ${baseline}`);
        }
    }

    if (callSites.length > 0)
    {
        console.log(`  bare console.log call sites: ${callSites.join(", ")}`);
    }
    if (nonConforming.length > 0)
    {
        console.log(`  files not following FRONTEND_LOGGING.md: ${nonConforming.length}`);
    }
    if (unmarked.length > 0)
    {
        console.log(`  .ts files with no COMPONENT marker: ${unmarked.join(", ")}`);
    }

    if (failures.length > 0)
    {
        console.error(`  FAIL: ${failures.length} count(s) rose above baseline`);
        for (const f of failures) { console.error(`    - ${f}`); }
        process.exit(1);
    }

    console.log("  PASS: every tracked count is at or below its recorded baseline");
}

if (import.meta.url === `file://${process.argv[1]}`)
{
    main();
}
