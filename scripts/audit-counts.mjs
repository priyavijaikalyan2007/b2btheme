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
 *     commit since, and the true figure was 294 occurrences on 186 lines.
 *     WIN-1 phase A has since removed the 220 of those that were the
 *     LogUtility lookup, leaving 74 occurrences on 74 lines in 27 files.
 *   - LOG-1 was measured three times (406, 200, 176) with no change to
 *     the code in between, because the file set and the pattern were
 *     never written down.
 *   - WIN-1's pattern is the literal `window as any`, and the library
 *     reaches `window` through an assertion in FOUR spellings. The one
 *     WIN-1 counts is the smaller population: 74 against 248 asserting to
 *     `Record<string, unknown>` and 3 to an inline object type. The count
 *     was never wrong. It answered a narrower question than its name
 *     suggests, and a cast written in any other spelling could be added
 *     for free. `windowCasts` gates the total, so no spelling is exempt.
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
import { scanComponents } from "./trace-scan.mjs";

/**
 * THE FILE SET, stated once. Tracked TypeScript sources only: no test or
 * spec files, because a violation in a test is not a violation in the
 * library, nothing under `dist/`, which is generated, and no `.d.ts`
 * declaration file, which holds types rather than executable code. That
 * last exclusion means `components/globals.d.ts` is outside every count
 * here, including the marker count, so its `COMPONENT:` marker is a
 * convention this script does not enforce.
 *
 * THE `tests/` EXCLUSION IS SEPARATE FROM THE `*.test.ts` ONE, and it was
 * missing until WIN-2. The name filter catches a file CALLED a test and
 * says nothing about a file that LIVES in the test directory, so
 * `tests/setup.ts` and `tests/helpers/dom-helpers.ts` were inside every
 * count while this comment and the printed header both said they were not.
 * CODEBASE_FIXES.md reasoned from the claim and concluded that the one
 * `(globalThis as any)` in `tests/setup.ts` was "outside the count twice
 * over", which was false twice. Those two files contribute exactly that one
 * occurrence and nothing else to any count here, so stating the set
 * correctly moves no baseline. See insight 6.64.
 */
export function sourceFiles()
{
    const out = execFileSync("git", ["ls-files", "*.ts"], { encoding: "utf8" });
    return out.split("\n")
        .filter(Boolean)
        .filter((f) => !/\.(test|spec)\.ts$/.test(f))
        .filter((f) => !/\.d\.ts$/.test(f))
        .filter((f) => !f.startsWith("tests/"))
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
 * Baselines measured 2026-10-13, except where noted. anyAnnotations,
 * scssImportant and the three marker counts were measured at 38c6f1b. The
 * three logging counts and diagramengineLines were re-measured after LOG-2
 * landed. windowAnyCasts, windowAnyFiles and diagramengineLines were
 * re-measured on 2026-10-14 after WIN-1 phase B, and windowCasts was added
 * the same day and measured at 325 before phase B ran. Ratchet down only.
 *
 * windowAnyCasts and windowAnyFiles are 0 and WIN-1 is closed. They stay in
 * the table because a baseline of 0 is the only one that cannot be met by
 * accident, and because deleting the count that defined the item would erase
 * the evidence that it reached 0. windowCasts is where the work continues.
 *
 * windowAliasDecls and windowAliasUses were added on 2026-10-14 while WIN-2
 * was being scoped, and they are the conversion surface windowCasts could
 * not see: 42 declarations carrying 73 accesses. windowCasts was unchanged at
 * 237 even though it now counts `globalThis as` too, because the only such
 * occurrence is in `tests/setup.ts` and the file set stopped including the
 * `tests/` directory in the same commit. Both edits landed BEFORE any source
 * file moved, which is the only order in which a gate is not fitted to the
 * result it is supposed to judge.
 *
 * WIN-2 then took the three to 6, 1 and 1, re-measured here on 2026-10-14.
 *
 * anyCasts was added on 2026-10-14 while ANY-1 was being scoped, and it is
 * the same discovery a third time. anyAnnotations counts `: any` and so
 * watches declarations, while a value cast carries no colon. 88 annotations
 * were gated and 69 casts were not, so the baseline covered 88 of 157. It is
 * baselined here BEFORE any source file moves.
 *
 * ANY-1 then took the pair to 13 and 2, re-measured on 2026-10-14.
 *
 * ungatedVerboseShims and driftedHostRule were added on 2026-10-14 for
 * LOG-3, baselined at 225 across 117 files BEFORE any preamble moved. The
 * second one is 0 from the start and must stay there: it fails the moment a
 * file computes `_dbg` without carrying the host rule verbatim, which is
 * the only mechanical guard against the two implementations of that rule
 * drifting apart.
 *
 * diagramengineLines HAS RISEN TWICE, 30478 -> 30482 -> 30488, and it is
 * the only baseline in this table that has ever gone up.
 *
 * The first raise was LOG-3: four lines in
 * `components/diagramengine/src/logging.ts`, three to compute the two gate
 * constants, which cannot be one line without passing 120 characters, and
 * one comment saying why. Those four lines stop nineteen engine namespaces
 * writing debug and trace to the console unconditionally on any page that
 * does not load `logutility.js`.
 *
 * The second raise was STD-1: six comment lines in
 * `components/diagramengine/src/engine.ts` explaining why
 * `DiagramEngineImpl` carries an export keyword. Note that the first raise
 * recorded here claimed "STD-1 exists to stop the largest file in the
 * repository growing". That was wrong. STD-1 was about export keywords,
 * this counter is the only thing watching the size, and the two were
 * conflated. STD-1 now reads as what it is, a build-script defect.
 *
 * The fourth raise was LOG-4a, 30503 -> 30524: twenty-one lines in
 * `src/engine.ts`, `src/render-engine.ts` and `src/logging.ts`. Three
 * inline listener thunks became blocks so a trace call could sit in them,
 * a MutationObserver and an inline-editor keydown gained one each, and the
 * engine's single destructure gained `trace: logTrace`. That one line is
 * what makes trace reachable from all twenty namespaces at once.
 *
 * The third raise was LOG-6, 30488 -> 30503: fifteen lines in
 * `components/diagramengine/src/logging.ts`, turning the two captured gate
 * constants into functions read on every call, plus the comment saying
 * why. One copy serves all twenty namespaces, so fifteen lines is the
 * whole cost of making the engine's console fallback respond to a flag set
 * after the bundle loaded.
 *
 * The rule is still ratchet down only. All four raises are exceptions,
 * taken deliberately, measured at their minimum, and written here rather
 * than quietly absorbed. A ratchet that cannot record a justified exception
 * gets worked around instead, and a worked-around ratchet measures
 * nothing.
 *
 * overLengthLines was added on 2026-10-15 for LOG-5 and is the first count
 * here that measures a style rule rather than a defect. AGENTS.md sets 120
 * characters and nothing enforced it, which is the UNUSED-1 shape: a stated
 * rule with no counter drifts without anybody deciding that it should.
 *
 * IT IS MEASURED IN CHARACTERS, NOT BYTES, AND THE TWO DISAGREE BY A THIRD.
 * `awk 'length > 120'` reported 928 against this check's 819 at the same
 * commit. awk counts bytes in the C locale and every marker header in this
 * repository carries ⚓, 📜, 🔗 and ⚡, which are three bytes each. The
 * shorter number is the real one, because 120 is a column limit and a
 * reader counts columns. LOG-5 reflowed 531 shim lines and the count went
 * 819 -> 288, which is exact.
 *
 * ADDING EXPORT KEYWORDS DID NOT MOVE THIS COUNT. The bundle script used
 * to delete them with a substitution, `s/^export //g`, which rewrites a
 * line and never removes one. Dropping that substitution took the bundle
 * from 1 export to 137 and left the line count at 30482.
 *
 * All 15 remaining uses of `any`
 * are in components/visualtableeditor/visualtableeditor.ts and are carried
 * as ANY-3, because they name another component's option types and neither
 * the no-cross-import rule nor components/globals.d.ts reaches those.
 *
 * A BASELINE OF 6 GATES THE TOTAL AND SAYS NOTHING ABOUT THE COMPOSITION.
 * Six assertions remain because each reaches window by a name known only at
 * run time, and ADR-174 D3 lists them by file and line. That list is the
 * allowlist. This number is only the count of it, so a seventh assertion
 * fails here, and a sixth one written somewhere new while one of the listed
 * six is removed does not. Read the list, not the number.
 *
 * windowAliasUses counts every property access on an aliased name ANYWHERE
 * in the file that declares the alias. It cannot tell an alias apart from a
 * parameter or a different local of the same name, so it over-counts by
 * design, which is the safe direction for a ratchet. The one remaining
 * untyped alias is named `globalNamespace` rather than `win` for exactly
 * this reason.
 */
const BASELINES = {
    windowCasts: 6,
    windowAnyCasts: 0,
    windowAnyFiles: 0,
    windowAliasDecls: 1,
    windowAliasUses: 1,
    ungatedVerboseShims: 0,
    driftedHostRule: 0,
    overLengthLines: 288,
    consoleLogCalls: 0,
    shimWithoutUtility: 0,
    directConsole: 0,
    anyAnnotations: 13,
    anyCasts: 2,
    scssImportant: 113,
    componentsMissingMarker: 3,
    diagramengineSrcMissingMarker: 2,
    scssMissingMarker: 4,
    diagramengineLines: 30524,
    untracedHotShims: 0,
    deadTraceShims: 0,
    hotWithoutTraceShim: 0,
};

/*
 * FLOORS are the opposite of BASELINES. A baseline is a ceiling on
 * something unwanted and fails when the count RISES. A floor is a minimum
 * on something wanted and fails when the count FALLS.
 *
 * There is one, and STD-1 is the reason it exists. The DiagramEngine
 * bundle is generated by scripts/bundle-diagramengine.sh, which used to
 * delete every export keyword on its way through. tsc writes the published
 * .d.ts from that file, so the largest component in the repository shipped
 * a 2,169 line type definition with exactly one usable name in it. The
 * factory was reachable. Its options type and its return type were not.
 *
 * Nothing in this repository could see that. Every count here is a ceiling
 * on a defect, and a missing export is an absence. Restoring the strip is
 * a one character edit to a build script, and the only visible effect
 * would be a d.ts quietly going back to one export, which no test read.
 *
 * tracedComponents is the second, and LOG-4 is the same shape again. 108
 * components declared a logTrace shim and 2 called it, so a drag or a
 * scroll produced no trace anywhere. An uncalled helper costs nothing and
 * breaks nothing, which is why it survived seven months. The ceilings
 * beside it close the other three doors: untracedHotShims fails if a
 * high-frequency component stops calling the shim it declares,
 * deadTraceShims fails if a component that does no high-frequency work
 * carries one, and hotWithoutTraceShim holds the 13 components that never
 * declared a shim and were therefore never part of LOG-4.
 *
 * dynamicVerboseShims is the third, added for LOG-6, and its job is narrow
 * enough to be worth stating. It counts 225 shims, 117 logDebug and 108
 * logTrace, whose console fallback reads the flag through `_dbg()` or
 * `_trc()` rather than a captured const. It was 213 when LOG-6 landed and
 * LOG-4a added the twelve logTrace shims that took it to 225. The engine
 * is not among them: it destructures `trace` from makeLogger rather than
 * declaring `function logTrace`, so no shim text exists there to count.
 *
 * traceCalls is the fourth, and a failed mutation is why it exists.
 * tracedComponents counts COMPONENTS, so it moves only when a component
 * loses its LAST trace call. Deleting four of diagramengine's five left
 * every count sitting at its line, because the fifth is in
 * src/render-engine.ts and one call is enough to keep the file in the
 * traced bucket. The larger the file the worse that gets, and the engine
 * is 30,524 lines. This floor holds the 301 calls themselves, so losing
 * any one of them fails.
 *
 * REVERTING `_dbg()` TO `_dbg` IS NOT WHAT THIS CATCHES. The
 * ungatedVerboseShims ceiling does that, because it now requires the call
 * form and a reverted shim reads as ungated. What this floor alone catches
 * is a logDebug shim DELETED together with its calls. countUngatedVerboseShims
 * skips a function it cannot find, so a removed shim leaves the ceiling at
 * zero and looks like success. tracedComponents already covers the 96
 * logTrace shims that way. The 117 logDebug shims sat under nothing.
 */
const FLOORS = {
    diagramengineBundleExports: 138,
    tracedComponents: 109,
    traceCalls: 301,
    dynamicVerboseShims: 225,
};

/**
 * Counts the export keywords that survive into a generated bundle.
 *
 * Only a line-start `export ` counts, which is what the concatenation
 * produces and what tsc reads when it writes the .d.ts. An export inside
 * a string or a comment is not a declaration and must not be counted.
 */
export function countBundleExports(text)
{
    return (text.match(/^export /gm) ?? []).length;
}

/**
 * Compares a count against a floor. The mirror of the baseline check: a
 * baseline fails when a count RISES, a floor fails when a count FALLS.
 */
export function floorStatus(actual, floor)
{
    if (actual < floor) { return "UNDER"; }
    return actual > floor ? "over" : "at";
}

/**
 * Classify one global-object type assertion by what it asserts to.
 *
 * WIN-1 counts the literal string `window as any`, and that is one of four
 * spellings this library uses to reach the same place. The others assert to
 * `Record<string, unknown>`, to an inline object type, or wrap the line so the
 * asserted type is not on it at all. A pattern narrower than the behavior it
 * watches is how a ratchet grows a blind spot larger than the count it holds,
 * so `windowCasts` gates every spelling and this function reports the mix.
 *
 * `globalThis as` is counted with `window as` from WIN-2 on. The two reach the
 * same object and only the spelling differs, so watching one of them is the
 * same defect one level up.
 *
 * @param tail - The text following `window as ` or `globalThis as ` at one
 *               match position.
 * @returns "any", "record", or "other".
 */
export function classifyWindowCast(tail)
{
    if (/^any\b/.test(tail)) { return "any"; }
    if (/^unknown as Record</.test(tail)) { return "record"; }
    return "other";
}

/**
 * Count the untyped window accesses that hide behind a LOCAL ALIAS.
 *
 * WHY THIS IS A SEPARATE COUNT AND NOT A WIDER REGEX
 * --------------------------------------------------
 * `windowCasts` counts the characters `window as `. A file that writes
 *
 *     const win = window as unknown as Record<string, unknown>;
 *     win["createFormDialog"] = createFormDialog;
 *     const f = win["createPeoplePicker"];
 *
 * spends ONE occurrence of that pattern and then reaches `window` untyped as
 * many times as it likes, for free. Measured across the tracked sources on
 * 2026-10-14: 42 alias declarations carrying 73 uses. The gate saw 42 of
 * those 115 accesses.
 *
 * This is the WIN-1 finding a second time, one level further out. WIN-1's
 * pattern was one spelling of four. `windowCasts` is every spelling of the
 * assertion and still only the assertion, so an alias moves the access out
 * from under it. A ratchet is only as wide as its pattern, and the pattern
 * has to name the BEHAVIOR (reaching window untyped) rather than the syntax
 * that happened to be used for it. See insight 6.61 and 6.65.
 *
 * THE FIX THE COUNT EXPECTS is to drop the assertion and keep the alias:
 * `const win = window;` types every use through `components/globals.d.ts`
 * and emits the same JavaScript. So this count going to zero does not mean
 * the aliases are gone, it means none of them is untyped.
 *
 * @param text - One file's full source.
 * @returns `{ declarations, uses }`, where `uses` counts every property
 *          access on an aliased name outside its own declaration line.
 */
export function countWindowAliases(text)
{
    const lines = text.split("\n");
    const declRe = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:window|globalThis) as /;
    const names = new Set();
    let declarations = 0;

    for (const line of lines)
    {
        const m = line.match(declRe);
        if (m) { names.add(m[1]); declarations += 1; }
    }
    if (names.size === 0) { return { declarations: 0, uses: 0 }; }

    let uses = 0;
    for (const name of names)
    {
        const useRe = new RegExp(`\\b${name}(?:\\[|\\.[A-Za-z_$])`, "g");
        for (const line of lines)
        {
            // The declaration itself is counted as a declaration, never as
            // a use, or `const win = window as X` would count its own name.
            if (declRe.test(line)) { continue; }
            uses += (line.match(useRe) ?? []).length;
        }
    }
    return { declarations, uses };
}

/**
 * Count the `as any` VALUE CASTS, which `anyAnnotations` cannot see.
 *
 * `anyAnnotations` counts `: any`, so it watches the places a declaration
 * says "I do not know this type". A value cast carries no colon and says
 * the same thing about an expression, and it was counted by nothing.
 * Measured across the tracked sources on 2026-10-14: 88 annotations and 70
 * casts, so ANY-1 held a baseline over 88 of 158.
 *
 * That is the third time in this repository that a ratchet turned out to be
 * narrower than the behavior it was named after. WIN-1 counted one spelling
 * of four. `windowCasts` counted the assertion and not the alias that moved
 * accesses out from under it. The lesson each time is the same: write the
 * pattern against the BEHAVIOR, which here is reaching for `any` to silence
 * the checker, rather than against one syntax for it. See insights 6.61 and
 * 6.65.
 *
 * COMMENTS AND STRING DATA ARE NOT CASTS. `windowCasts` has no such
 * filtering and a prose line reading "the global object as a namespace"
 * counted against it until the sentence was reworded, which is a false
 * POSITIVE and therefore safe, but it is still a number that does not mean
 * what it says. This count asks the same string scanner `classifyConsoleLog`
 * uses, because `diagramengine` draws sample source onto a canvas as string
 * data and this repository has been bitten by that twice.
 *
 * @param text - One file's full source.
 * @returns The number of real `as any` casts.
 */
export function countAnyCasts(text)
{
    let n = 0;
    for (const line of text.split("\n"))
    {
        const trimmed = line.trimStart();
        if (trimmed.startsWith("*") || trimmed.startsWith("//")) { continue; }
        for (const m of line.matchAll(/\bas any\b/g))
        {
            if (!insideStringLiteral(line, m.index)) { n += 1; }
        }
    }
    return n;
}

/**
 * The full body of a named function, found by MATCHING BRACES rather than
 * by a regex.
 *
 * The shims come in three shapes in this repository: one line, a ternary
 * split across lines, and an if/else block. A lazy `[^}]*` stops at the
 * first `}`, which for the if/else shape is the brace closing the `if`, so
 * a gate written in the `else` went unseen and four migrated files counted
 * as unmigrated. An anchored `\n}` fixed those and broke the one-liners.
 * Counting braces is the only version that reads all three.
 *
 * @param text - One file's full source.
 * @param name - The function name to find.
 * @returns The body between its braces, or null when absent.
 */
export function functionBody(text, name)
{
    const at = text.indexOf(`function ${name}(`);
    if (at === -1) { return null; }
    const open = text.indexOf("{", at);
    if (open === -1) { return null; }

    let depth = 0;
    for (let i = open; i < text.length; i += 1)
    {
        if (text[i] === "{") { depth += 1; }
        else if (text[i] === "}")
        {
            depth -= 1;
            if (depth === 0) { return text.slice(open + 1, i); }
        }
    }
    return null;
}

/**
 * THE LOCAL DEVELOPMENT RULE, as `components/logutility/logutility.ts`
 * states it. Repeated here so the check below can compare the two texts.
 */
export const LOCAL_HOST_RULE = String.raw`/^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/`;

/**
 * Count the verbose logging shims whose console fallback has no gate.
 *
 * WHY THE FALLBACK NEEDS ITS OWN GATE
 * -----------------------------------
 * Every component carries five one-line shims of the form
 *
 *     function logDebug(...a) { _lu ? _lu.debug(...a) : console.debug(...); }
 *
 * `_lu` is the LogUtility, which filters by level and by the `__ebt_*`
 * flags. The branch after the colon runs when `logutility.js` was NOT
 * loaded, and it filtered nothing at all: debug and trace printed
 * unconditionally and no flag could stop them. FRONTEND_LOGGING.md records
 * that 6 of 138 demo pages load the utility, so that branch is the usual
 * one rather than the exception.
 *
 * The two paths cannot share code, because the whole point of the fallback
 * is that the utility is absent. Two implementations of one rule is exactly
 * the drift this repository keeps finding, so this check pins the text:
 * a gated shim reads `: _dbg() && console.debug(` or
 * `: _trc() && console.debug(`, and any file that reads
 * `window.__ebt_debug_logging` must contain LOCAL_HOST_RULE verbatim.
 * The unit tests in logutility.test.ts pin the semantics on the other side.
 *
 * LOG-6 PUT THE PARENTHESES THERE AND THEY CARRY THE MEANING. The gate used
 * to be a const, evaluated once when the script loaded, so a flag set in a
 * live console changed nothing on the fallback path. Requiring the call
 * form is what stops that regression returning, and `dynamicVerboseShims`
 * is the floor underneath it.
 *
 * NOT EVERY FALLBACK IS COVERED HERE. This reads `function logDebug`, and
 * `components/diagramengine/src/logging.ts` builds its five helpers as
 * arrow properties on an object, so the engine's gates are outside the
 * ungated count and always were. driftedHostRule does see that file,
 * because it searches the whole text. The engine's behaviour is pinned by
 * the fallback semantics test instead.
 *
 * @param text - One file's full source.
 * @returns `{ ungated, missingRule }` for that file.
 */
export function countUngatedVerboseShims(text)
{
    let ungated = 0;
    let dynamic = 0;
    for (const [name, gate] of [["logDebug", "_dbg()"], ["logTrace", "_trc()"]])
    {
        const body = functionBody(text, name);
        if (body === null) { continue; }
        if (body.includes(`${gate} && console.`)) { dynamic += 1; }
        else { ungated += 1; }
    }
    const usesRule = text.includes("window.__ebt_debug_logging");
    const missingRule = usesRule && !text.includes(LOCAL_HOST_RULE) ? 1 : 0;
    return { ungated, missingRule, dynamic };
}

function measure()
{
    const files = sourceFiles();
    const counts = {
        windowCasts: 0,
        windowAnyCasts: 0,
        windowAnyFiles: 0,
        windowAliasDecls: 0,
        windowAliasUses: 0,
        ungatedVerboseShims: 0,
        driftedHostRule: 0,
        dynamicVerboseShims: 0,
        overLengthLines: 0,
        consoleLogCalls: 0,
        shimWithoutUtility: 0,
        directConsole: 0,
        anyAnnotations: 0,
        anyCasts: 0,
        scssImportant: 0,
        componentsMissingMarker: 0,
        diagramengineSrcMissingMarker: 0,
        scssMissingMarker: 0,
        diagramengineLines: 0,
        traceCalls: 0,
    };
    const consoleLogKinds = {};
    const windowCastKinds = {};
    const callSites = [];
    const nonConforming = [];

    for (const file of files)
    {
        const text = readFileSync(file, "utf8");

        const casts = countOccurrences(text, "window as any");
        counts.windowAnyCasts += casts;
        if (casts > 0) { counts.windowAnyFiles += 1; }

        for (const m of text.matchAll(/(?:window|globalThis) as (.*)/g))
        {
            counts.windowCasts += 1;
            const kind = classifyWindowCast(m[1]);
            windowCastKinds[kind] = (windowCastKinds[kind] ?? 0) + 1;
        }

        const shims = countUngatedVerboseShims(text);
        counts.ungatedVerboseShims += shims.ungated;
        counts.driftedHostRule += shims.missingRule;
        counts.dynamicVerboseShims += shims.dynamic;

        // LOG-5. AGENTS.md sets 120 characters and nothing enforced it.
        for (const line of text.split("\n"))
        {
            if (line.length > 120) { counts.overLengthLines += 1; }
        }

        const aliases = countWindowAliases(text);
        counts.windowAliasDecls += aliases.declarations;
        counts.windowAliasUses += aliases.uses;

        counts.anyAnnotations += (text.match(/:\s*any\b/g) ?? []).length;
        counts.anyCasts += countAnyCasts(text);

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
    counts.diagramengineBundleExports = countBundleExports(
        readFileSync("components/diagramengine/diagramengine.ts", "utf8"));
    counts.diagramengineLines = readFileSync("components/diagramengine/diagramengine.ts", "utf8")
        .split("\n").length - 1;

    // LOG-4. Trace coverage, measured by scripts/trace-scan.mjs, which owns
    // the definition of what counts as high-frequency work.
    const trace = scanComponents();
    counts.tracedComponents = trace.traced.length;
    counts.traceCalls = trace.calls;
    counts.untracedHotShims = trace.untracedHotShim.length;
    counts.deadTraceShims = trace.deadTraceShim.length;
    counts.hotWithoutTraceShim = trace.hotWithoutShim.length;

    return { counts, consoleLogKinds, windowCastKinds, callSites, nonConforming, unmarked, fileCount: files.length };
}

function main()
{
    const { counts, consoleLogKinds, windowCastKinds, callSites, nonConforming, unmarked, fileCount } = measure();

    console.log(`  file set: ${fileCount} tracked .ts sources, excluding tests, declarations and dist`);
    console.log("  console.log lines by kind: "
        + Object.entries(consoleLogKinds).sort().map(([k, v]) => `${k}=${v}`).join(", "));
    console.log("  window casts by asserted type: "
        + Object.entries(windowCastKinds).sort().map(([k, v]) => `${k}=${v}`).join(", "));

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

    for (const [key, floor] of Object.entries(FLOORS))
    {
        const actual = counts[key];
        const mark = floorStatus(actual, floor);
        console.log(`  ${key.padEnd(30)} ${String(actual).padStart(5)}  (floor ${floor}, ${mark})`);
        if (actual < floor)
        {
            failures.push(`${key}: ${actual} is below the floor of ${floor}`);
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
        console.error(`  FAIL: ${failures.length} count(s) outside baseline or floor`);
        for (const f of failures) { console.error(`    - ${f}`); }
        process.exit(1);
    }

    console.log("  PASS: every ceiling is at or below its baseline, every floor at or above it");
}

if (import.meta.url === `file://${process.argv[1]}`)
{
    main();
}
