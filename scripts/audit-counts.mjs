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
import { readFileSync, readdirSync } from "node:fs";
import { scanComponents } from "./trace-scan.mjs";
import { census as testCensus, standInsOf, guardedAssertions } from "./test-assertions.mjs";
import { factoriesReturningClass, handlesWithoutImplements }
    from "./gen-handles.mjs";
import { measureClassification } from "./agentui/generate.mjs";
import { BELOW_REQUIRED, PENDING_CLASSIFICATION } from "./agentui/migration.mjs";

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
 *
 * `.mock.ts` JOINED `.test.ts` ON 2026-10-18, and the reason it had to
 * is worth the line. A CodeMirror mock lives beside its component so
 * two test files can share it, and it writes to `window`, which is
 * what a mock is for. Counted as component source it pushed
 * windowCasts, windowAliasDecls and windowAliasUses over their
 * baselines. These ratchets exist to keep untyped window access out of
 * SHIPPED code, and a mock is not shipped: nothing bundles it, the
 * `dist/` and `tests/` exclusions below are the same judgement, and
 * the suffix is narrow enough to read in a file listing.
 */
export function sourceFiles()
{
    const out = execFileSync("git", ["ls-files", "*.ts"], { encoding: "utf8" });
    return out.split("\n")
        .filter(Boolean)
        .filter((f) => !/\.(test|spec|mock)\.ts$/.test(f))
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
 * Counts declarations using the keyword that carry no `important-case: N`
 * comment, per CODING_STYLE.md.
 *
 * SCOPE IS THE TOP-LEVEL BLOCK, not the line above. One justification
 * usually covers a whole rule — markdowneditor's eleven Vditor overrides
 * are one decision, not eleven — so the comment may sit anywhere from the
 * start of the enclosing top-level block down to the declaration.
 *
 * THE BRACE WALK WAITS FOR THE OPENING BRACE rather than assuming it is on
 * the selector's line. This repository writes Allman braces in some
 * stylesheets, and a scan that reads depth on the selector line closes the
 * block immediately. That exact bug reported 8 reduced-motion overrides
 * where there are 11, and it is the reason this helper counts characters
 * instead of matching a line shape.
 *
 * A `//` comment line is skipped, so the word inside guidedtour's
 * explanatory note is not mistaken for a declaration.
 */
export function uncommentedImportants(text)
{
    const lines = text.split("\n");
    let depth = 0;
    let topStart = -1;
    let violations = 0;

    for (let i = 0; i < lines.length; i++)
    {
        const line = lines[i].trim();
        if (line.startsWith("//")) { continue; }

        if (line.includes("!important") && topStart >= 0)
        {
            const scope = lines.slice(topStart, i + 1).join("\n");
            if (!/important-case:\s*[1-5]/.test(scope)) { violations += 1; }
        }

        for (const ch of line)
        {
            if (ch === "{")
            {
                if (depth === 0) { topStart = i; }
                depth += 1;
            }
            else if (ch === "}")
            {
                depth -= 1;
                if (depth === 0) { topStart = -1; }
            }
        }
    }

    return violations;
}


/**
 * Disabled-class applications that never say so to assistive technology.
 *
 * DEBT-VR-11 found this by measuring colour. A component dims itself
 * when disabled — `.facetsearch-disabled { opacity: 0.5 }` and fifteen
 * more like it — and the rendered-contrast walker reported the dimmed
 * text as failing. WCAG 1.4.3 exempts an INACTIVE control, so the right
 * answer was to exempt them. There was nothing to exempt them BY: the
 * class is a styling hook, and a screen reader was still reading the
 * control as ordinary and operable.
 *
 * So the gate is not about contrast. A control that looks disabled and
 * does not say it is disabled is wrong on its own terms, and the colour
 * audit only happened to be the instrument that walked into it.
 *
 * WINDOW IS THE SAME LINE PLUS THREE. The attribute belongs beside the
 * class, not somewhere else in the file: a file-wide search passes for
 * a component that sets the attribute on ONE of its four call sites,
 * which is how twelve of these looked compliant from a distance.
 *
 * AND ON THE SAME ELEMENT. The first version of this check asked only
 * that the words appear near each other, and colorpicker passed it
 * while putting the class on its root and the attribute on its
 * trigger: the root is what carries `opacity: 0.5`, so every control
 * inside it was dimmed and none of them was marked. A gate that cannot
 * tell those two apart is checking for a word, not for a pairing.
 */
export function disabledWithoutAria(text)
{
    const lines = text.split("\n");
    const call = /([A-Za-z_$][\w$.?!\[\]]*)\.classList\.(?:add|toggle)\(\s*"[a-z0-9-]*disabled[a-z0-9-]*"/;
    let violations = 0;

    for (let i = 0; i < lines.length; i += 1)
    {
        const m = call.exec(lines[i]);
        if (!m) { continue; }

        // The receiver without its optional-chaining or non-null
        // marks, so `x?.classList` pairs with `x.setAttribute`.
        const recv = m[1].replace(/[?!]/g, "");
        const window = lines.slice(i, i + 4).join("\n").replace(/[?!]/g, "");
        if (!window.includes(`${recv}.setAttribute("aria-disabled"`))
        { violations += 1; }
    }

    return violations;
}

/**
 * Occurrences, not lines. `grep -c` counts lines and silently overrides
 * `-o`, which is how the 203-line figure became an occurrence count.
 */
/**
 * SCSS with its comments removed.
 *
 * A keyword counter that reads comments counts prose. Block comments go
 * first so a `//` inside one is not treated as a line comment, and a
 * `//` inside a string is left alone because SCSS url()s and content
 * strings legitimately contain one.
 */
export function stripScssComments(text)
{
    let out = "";
    let i = 0;
    let quote = "";

    while (i < text.length)
    {
        const c = text[i];
        const d = text[i + 1];

        if (quote)
        {
            if (c === "\\") { out += c + (d ?? ""); i += 2; continue; }
            if (c === quote) { quote = ""; }
            out += c;
            i += 1;
            continue;
        }

        if (c === "\"" || c === "'") { quote = c; out += c; i += 1; continue; }

        if (c === "/" && d === "*")
        {
            const end = text.indexOf("*/", i + 2);
            i = end === -1 ? text.length : end + 2;
            continue;
        }

        if (c === "/" && d === "/")
        {
            const end = text.indexOf("\n", i);
            i = end === -1 ? text.length : end;
            continue;
        }

        out += c;
        i += 1;
    }

    return out;
}

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
 * THE EIGHTH CHANGE IS THE FIRST FALL THIS LOG RECORDS, 30562 -> 30522,
 * and the largest fall the number has ever taken. It has fallen twice
 * before, 30693 -> 30479 after LOG-2 and 30479 -> 30478 after WIN-1, both
 * written up as re-measurements of other work rather than as entries here.
 * This one is deliberate, so it is recorded as carefully as a raise.
 * FALLBACK-9 item 2 took forty lines
 * out of `src/render-engine.ts`: renderEmbedPlaceholder and
 * appendPlaceholderContent are gone, and what they drew is gone with them.
 * A missing factory used to draw a dashed grey box with a puzzle icon and
 * the component name, which looks like a deliberate part of a diagram, so
 * a broken embed read as a designed one. The same placeholder stood in
 * for a factory that threw. Thirty lines came back to plumb the embed
 * definition into the render() mount path, which had been passing the
 * literal string "**Embedded content**" to every render()-only embed.
 *
 * The seventh raise was FALLBACK-8, 30551 -> 30562: eleven lines in
 * `src/engine.ts`, replacing `catch { return String(v); }` in
 * stringifyValue with a refusal carrying the original as cause. That
 * catch rendered a circular value as "[object Object]", which reads as
 * data rather than as a failure to read it. The same shape was fixed in
 * spinemap under FALLBACK-4 and in graphcanvas in the same commit.
 *
 * The sixth raise was FALLBACK-7, 30529 -> 30551: twenty-two lines in
 * `src/render-engine.ts`. The embed mount chain tried show(), then
 * render(), then getElement(), and each one swallowed its own error with
 * `catch (_)`. When all three missed, the chain simply returned, so a
 * failed embed left an empty container and no trace anywhere at all. The
 * probing itself is normalisation across heterogeneous components and is
 * kept. The lines pay for a failures array, a container check that throws
 * instead of returning, and a final throw naming the three strategies with
 * the first failure attached as cause.
 *
 * The fifth raise was MRK-1 and MRK-2, 30524 -> 30529: five lines across
 * `src/engine.ts` and `src/types.ts`, which carried a plain description
 * comment and not the marker block MARKERS.md requires. The three marker
 * counts all reach 0 with it, so the ratchet that records this raise is
 * also the one that can now never be satisfied by deleting a marker.
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
 * The rule is still ratchet down only. All seven raises are exceptions,
 * taken deliberately, measured at their minimum, and written here rather
 * than quietly absorbed. A ratchet that cannot record a justified exception
 * gets worked around instead, and a worked-around ratchet measures
 * nothing.
 *
 * scssImportantComponents was added on 2026-10-15, and it is the same
 * discovery the `: any` counts made twice: a ratchet named for one
 * population and measuring another. The tracker section reads "!important
 * in Component SCSS (113 occurrences, 20 files)" and lists component
 * stylesheets. scssImportant spans EVERY tracked .scss, so 58 of its 113
 * are in `src/scss/`, and 56 of those 58 are in one file,
 * `src/scss/_dark-mode.scss`, where beating Bootstrap's specificity is the
 * justification CODING_STYLE.md allows. The population the entry actually
 * describes is 55 across 18 files, not 113 across 20.
 *
 * Both counts are kept. The wide one stops the total growing anywhere.
 * The narrow one is a CEILING, and it is NOT a defect count.
 *
 * RECLASSIFIED 2026-10-20 (ADR-208). The 54 real declarations behind
 * scssImportantComponents were previously split by whether a comment sat
 * near them, which measures nothing. Sorted by what each one OVERRIDES,
 * 49 of the 54 are permitted by CODING_STYLE.md and 12 of those cannot be
 * written any other way: 11 sit in a prefers-reduced-motion block, 24
 * override a third-party stylesheet the variable layer cannot reach, 9
 * override an inline style that no selector can beat, and 5 override a
 * Bootstrap component class. Only 5 are in-house specificity bugs.
 *
 * So do not read a drop in this number as progress, and do not read 55 as
 * 55 problems. The number exists to stop the total growing. The live
 * target is the 5 in IMP-1, and no count in this file isolates them,
 * because the C/D/E split depends on inline styles set from TypeScript.
 *
 * ONE OF THE 113 IS THE WORD INSIDE A COMMENT, in
 * components/guidedtour/guidedtour.scss, where a note explains why the
 * declaration below it needs the keyword. 112 are real. It is left in
 * rather than parsed out: SCSS block comments would need a real scanner
 * for one occurrence, and a count that is high by one in a known place is
 * safer than a parser that is wrong in an unknown one. Written here so
 * the next reader does not rediscover it as a defect.
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
export const BASELINES = {
    windowCasts: 6,
    windowAnyCasts: 0,
    windowAnyFiles: 0,
    windowAliasDecls: 1,
    windowAliasUses: 1,
    ungatedVerboseShims: 0,
    driftedHostRule: 0,
    overLengthLines: 288,
    // DEBT-SEC-5. 77 is every CodeMirror specifier and nothing else:
    // fourteen esm.sh imports floating at major @6 and eight unpkg
    // paths with no version. The previous 0 was measured by a
    // predicate that matched cdn.jsdelivr.net alone, so it never
    // reached either registry. Pinning them is a separate decision,
    // because the fifteen packages have to interoperate.
    unpinnedCdnRefs: 10,
    tagsMissingSri: 0,
    // DEBT-SEC-8 and DEBT-SEC-7. 76 -> 65 -> 35 -> 17 across three
    // slices. The first pointed DOMPurify and font-awesome at the
    // copies this origin serves. The second did the same for vditor
    // and chart.js, and hashed mathlive in place on jsdelivr, because
    // this origin does not serve it. The third hashed driver.js and
    // moved the last two Bootstrap references onto this origin.
    //
    // A static.knobby.io host is outside CDN_HOSTS, so nothing HERE
    // re-checks those tags. Structure check [10] does, by pairing each
    // published hash with the URL it was computed from.
    //
    // THE REMAINING 17 ARE TWO POPULATIONS AND NEITHER IS A SLICE.
    // Ten sit in dated specs/*.prd.md planning documents, which are a
    // historical record. Do not chase this below 10. The rest are
    // CodeMirror's bare ESM import specifiers, which cannot carry an
    // integrity attribute at all: the attribute belongs to a script
    // tag and these are import statements inside a module. ADR-189 D4
    // records the two honest options and neither is a hash.
    thirdPartyTagsWithoutSri: 10,
    // DEBT-SEC-9 / ADR-210. 67 third-party ES-module specifiers that no
    // tag-based count could see. A CEILING, not a target of zero: neither
    // `import()` nor a static specifier can carry `integrity` today.
    cdnModuleSpecifiers: 0,
    // ERR-1. 306 -> 329 -> 330. Replacing 63 quiet container branches with
    // a throw orphaned the logWarn or logError helper in 23 components,
    // and the second census added visualtableeditor, which logged the
    // fault and then threw it. The refusal already carries the whole
    // message, and logging it first would print it twice, which is the
    // duplication FALLBACK-1 to 9 removed. The five helpers are the LOG-4a
    // preamble and are present whether or not a component uses them, which
    // is why this count was already 306 rather than 0. Under UNUSED-1.
    // 301 -> 298 on 2026-10-21. Three of them were FEATURES, not
    // dead code, which is what UNUSED-1 means by "treat each one as
    // a question before deleting it": ExplorerPicker's
    // `matchesTypeFilter` was the client-side half of a documented
    // option that only ever reached the API, CodeEditor's
    // `matchesKeyCombo` stood in for a `keyBindings` override the
    // keymap hard-coded past, and PermissionMatrix's `format`
    // parameter named a CSV serialiser that does not exist.
    //
    // 298 -> 287: two more were defects and six were genuinely dead.
    // PermissionMatrix's focusedRow/focusedCol were the roving
    // tabindex a grid needs to be TABBED INTO at all, and SpineMap's
    // popoverNodeId was what `applyTransform` needed to keep an open
    // popover attached to its node through a pan. The six deletions
    // are two spinner mirrors, two status-dot refs only ever
    // assigned null, a drag flag a probe showed unnecessary, and a
    // resize handler a ResizeObserver replaced.
    // 0 on 2026-10-21, AND THE RATCHET IS NO LONGER THE GUARANTEE.
    // tsconfig.json sets noUnusedLocals and noUnusedParameters to
    // true, which is what UNUSED-1 asked for on the day it was
    // written, and structure check [22] holds them there. This
    // ceiling stays at 0 as the second lock: a flag can be turned
    // off and the check names it, and a count cannot drift past 0
    // without the build failing first.
    //
    // THE 124 WERE NEVER DELETED. They are the LOG-4a preamble, and
    // every component now carries one `void [logInfo, ...]` line
    // saying the uniformity is deliberate. The minifier drops both
    // that line and the shims nothing calls, so the shipped artifact
    // is byte-for-byte what it was.
    unusedLocals: 0,

    // A CEILING AT ZERO (2026-10-21, UNUSED-1).
    // `scripts/bundle-diagramengine.sh` emits its own preamble of
    // sixteen shared constants and then greps each source module to
    // STRIP that module's declaration of the same name, because
    // thirty concatenated files share one scope. The cost is that
    // the number a reader finds in a src file is not necessarily
    // the number that ships, and nothing compared them.
    //
    // Two had drifted. `MAX_ZOOM` read 4.0 in render-engine.ts and
    // 32.0 in the bundle, so that file said the engine caps zoom at
    // 4x when it caps at 32x. `ROTATION_HANDLE_OFFSET` read 24
    // there and 25 in tool-select.ts.
    //
    // Not a floor: a module that stops declaring a local copy is
    // fine. What must never happen is a local copy that lies.
    bundlePreambleMismatches: 0,
    // PAT-1. A factory hands back a handle interface, never the
    // class. AGENTS.md "Factory return type" states the rule and
    // `implements` holds the two in step; this holds the fleet.
    factoriesReturningClass: 0,
    // The clause is the contract. Without it a handle and its class
    // agree by luck, which is how 6 of 14 pairs stood before PAT-1.
    handlesWithoutImplements: 0,
    // 2 -> 0 on 2026-10-24. DEBT-VR-11 and DEBT-VR-13 were SETTLED at
    // the owner's direction, not fixed. Both are minor and neither is
    // to be reopened without need; each entry carries its own reopen
    // condition. An exact baseline, so a new open entry raises it and
    // check [20] fails until the number is moved deliberately.
    trackerOpen: 0,
    consoleLogCalls: 0,
    shimWithoutUtility: 0,
    directConsole: 0,
    anyAnnotations: 0,
    anyCasts: 0,
    // 103 -> 104 on 2026-10-23, deliberately. `.text-secondary` resolves
    // `--bs-secondary-rgb`, one value for both themes, measuring 2.44 on
    // the dark ground. Bootstrap's own rule carries `!important`, so no
    // amount of specificity beats it without one — this is the case the
    // IMP-1 exemption exists for, and the ratchet made it a decision
    // rather than a habit.
    // 104 -> 103 and 45 -> 44 on 2026-10-24. Not a fix: the counter was
    // matching the keyword inside COMMENTS, so one of each was prose.
    scssImportant: 103,
    scssImportantComponents: 44,
    // IMP-1 / ADR-209. CODING_STYLE.md permits the keyword in five named
    // cases and requires a comment naming the case. This counts the
    // declarations that carry no such comment, and the ceiling is ZERO.
    // Without it the requirement is a sentence in a document that nothing
    // reads, which is the shape this repository spent October removing.
    scssImportantUncommented: 0,
    // DEBT-VR-11 / A11Y-1. A `*-disabled` class dims a control, and
    // sixteen components dimmed one without ever setting
    // `aria-disabled`. The ceiling is ZERO: a styling hook is not a
    // state, and the audit that found this was measuring colour.
    disabledWithoutAria: 0,
    componentsMissingMarker: 0,
    diagramengineSrcMissingMarker: 0,
    scssMissingMarker: 0,
    // ERR-1. 30522 -> 30523. DiagramEngine's container refusal named the
    // container and not the remedy, so it said what was wrong and not what
    // to do. One line, and the seventh recorded raise of this ceiling.
    //
    // ADR-205. 30523 -> 30546, the eighth raise. The embed probe had no
    // strategy for a factory that mounts itself into the container it
    // was handed, so a WORKING MarkdownEditor embed threw on every
    // render of the demo page. Strategy 0 counts the container's
    // children before the factory runs and returns when they grew.
    // Found by the demo-page smoke gate, which is the only thing in
    // this repository that had ever opened that page.
    // 30507 -> 30579 on 2026-10-21, and the 72 lines are the feature
    // DEBT-DE-1 was holding open. Twelve device stencils gained
    // `isContainer: true` and a normalised `contentArea`, which is
    // what makes a browser frame contain a shape dropped in its
    // viewport and not one dropped on its address bar. The ceiling
    // did its job here: the first attempt added the same four-line
    // comment to all twelve definitions and came in at 30619, and
    // the reason now sits once beside `devMarkContainer`.
    //
    // 30579 -> 30727 on 2026-10-22: `DiagramEngineHandle`, the 136
    // members `createDiagramEngine` hands a caller, plus the doc
    // comment above it (PAT-1). This is the entry's own exhibit —
    // "writing DiagramEngineHandle means deciding which of the 133
    // are API" — and the decision taken is NOT TODAY: the handle
    // mirrors the public surface, and `implements` makes narrowing
    // it later a one-line deletion that the typecheck will police.
    // Curating it now would be a second breaking change for CDN
    // consumers within a day of the first, decided by a repository
    // that cannot grep its own consumer.
    diagramengineLines: 30727,
    untracedHotShims: 0,
    deadTraceShims: 0,
    hotWithoutTraceShim: 0,
    // DEBT-TEST-1, ADR-196. A test block with no expect() at all. It
    // passes unless the code under it throws, and every one of the 21
    // was named for a behaviour: setFilters_UpdatesFilterState,
    // expandAll_ExpandsAllSteps, iconResolver_TakesPriority. Several
    // carried the assertion that was never written, as a comment.
    //
    // 21 -> 0 on 2026-10-17. Writing the twenty-one assertions found
    // one defect (DEBT-COLOR-1) and read four contracts that no test
    // had stated. A zero here is a real zero: the companion case in
    // scripts/test-assertions.test.ts fails if the parser ever stops
    // reaching every declaration, which is how the set is kept honest.
    testsWithoutAssertion: 0,
    // DEBT-TEST-1, ADR-196. A test block whose every assertion passes
    // for any value that is not null. Recounted against the current
    // parser on 2026-10-18, after the subject/matcher split:
    //
    // Classified by `node scripts/test-assertions.mjs --shapes`, which
    // prints the split below. THE FIRST VERSION OF THIS TABLE WAS RUN
    // FROM A SCRATCH FILE AND COULD NOT BE REPRODUCED THE NEXT DAY, so
    // the classifier is now committed beside the census. ADR-203.
    //
    // Counts are before -> now, both from the committed classifier,
    // run on 9ff3965 and on HEAD. The hand-run split it replaces said
    // 116 / 73 / 9 / 86, which nothing here can now reproduce.
    //
    // 267 -> 236 on 2026-10-19, ADR-205. The whole drop is the
    // namesAChange bucket, 66 -> 35, worked by cluster rather than by
    // file size: Ruler 5, SmartTextInput 8, three line pickers 6,
    // HoverCard 2, MultiselectCombo 3, DiagramEngine 7. Every rewrite
    // was mutation-proven and two blocks were DELETED rather than
    // rewritten, because each was the test below it with the assertion
    // removed.
    //
    // THE testBlocks FLOOR HELD BY ARITHMETIC AND NOT BY CATCHING
    // ANYTHING. Two deletions and four blocks collapsed into one
    // test.each is -5, and four new controls plus a split are +5. The
    // floor reads "at" and saw nothing, which is worth stating where
    // the next reader can see it: this floor catches a mass deletion,
    // not a balanced one.
    //
    // THE BUCKET IS NOW A COMMAND, NOT A READING.
    // `node scripts/test-assertions.mjs --shapes --shape namesAChange`
    // lists its members. The tally and the listing share one
    // classifier, `shapeOf`, because a second rule that agrees with
    // the first by inspection is the thing ADR-203 was written about.
    //
    // WHAT THE CLUSTER WORK KEPT FINDING WAS A MISSING PRECONDITION.
    // Ruler's five all called a method whose only effect is a render,
    // in an environment with no 2D context. DiagramEngine's
    // scrollToPageFrame fits the viewport to a canvas jsdom reports as
    // zero-sized. HoverCard's two called a two-argument `show` with
    // one argument. None of those could have failed whatever they
    // asserted, so the rewrite is half assertion and half setup.
    //
    //   113 -> 110  `.not.toThrow()` on IDEMPOTENCY — destroy_CalledTwice,
    //        closeWhenNotOpen. Weak but honest, and the right
    //        assertion is uniform: the DOM is clean and the handle is
    //        inert. Per-component selectors, near-zero expected yield.
    //    68 ->  35  `.not.toThrow()` on something else — the name states a
    //        change and the body asserts non-crash. 66 on 2026-10-18
    //        and 35 after the ADR-205 pass. The expectation that this
    //        bucket would read as contracts rather than defects MOSTLY
    //        held. No defect was FIXED from the 31, what kept turning
    //        up was preconditions that had never been met, and one
    //        defect was found and recorded: DEBT-STI-1.
    //    17 ->   6  `.not.toThrow()` on an ABSENT DEPENDENCY — the FALLBACK
    //        shape. The nine of 2026-10-18 are closed, and the six
    //        that remain each state a change in their name.
    //    86 ->  85  `.toBeDefined()` / `.toBeTruthy()` — mostly
    //        createX_ReturnsHandle. Redundant with the factory census
    //        since ERR-1 and ERR-2: every factory now throws or
    //        returns a real handle.
    //
    // 284 -> 267 on 2026-10-18. THE NINE WERE NOT THE HIGHEST YIELD,
    // and calling them that was wrong: six were positive controls in
    // nofallback suites, where `.not.toThrow()` is the correct shape
    // and the missing half is "assert the mount produced something".
    // The yield came from somewhere the classifier never pointed at.
    // GraphToolbar's suite mounted a stand-in Toolbar whose
    // setToolState had an empty body, so eight of its nine blocks
    // could not fail, and the real component exposed the defect the
    // stand-in hid. ADR-203, DEBT-GATE-2's lesson a second time.
    //
    // SO THE SECOND QUESTION IS NOW ASKED BY A SECOND INSTRUMENT.
    // `node scripts/test-assertions.mjs --stand-ins` lists every test
    // file that writes a global another component in this repository
    // owns without importing that component. It found the pre-fix
    // GraphToolbar suite, which is the regression case pinning it.
    // 11 on 2026-10-18, 6 after the pass that day. The six that
    // remain are `*.nofallback.test.ts` and `*.fallback2.test.ts`
    // suites whose claim IS the absence, or whose stub is an
    // instrument recording what the host handed it. DEBT-TEST-1c.
    //
    // THE TWO INSTRUMENTS DO NOT OVERLAP, and neither is a superset.
    // A stand-in block can carry a real assertion on a real value and
    // still prove nothing, because the suite wrote the value.
    //
    // 341 -> 335 -> 285 on 2026-10-18. Six of CodeEditor's eight
    // `_DoesNotThrow` cases were asserting that a public method does
    // nothing when CodeMirror is absent, which ADR-200 made a refusal.
    //
    // THE DROP FROM 335 TO 285 IS A CORRECTION, NOT A RELAXATION.
    // `expect(typeof x)` was counted as unable to fail and it can:
    // `typeof undefined` is "undefined", so the assertion fails for a
    // missing value. It is too LOOSE for the claim its test usually
    // makes, which is a real fault and a different one. Keeping 45
    // arguable members in a ceiling whose only value is that nobody
    // argues with it was the mistake ADR-196 D2 was written against.
    //
    // `.not.toThrow()` asserts the absence of a crash and nothing
    // about behaviour, and it is the literal negation of the rule
    // AGENTS.md states for a factory given no container.
    //
    // A toBeDefined() on a factory's return value cannot see a factory
    // that built nothing, and ERR-1 was 65 of those.
    //
    // 204 -> 173 ON 2026-10-21 IS A CORRECTION OF THE SAME KIND AS
    // THE typeof REMOVAL ABOVE, AND ALL 33 BLOCKS MOVED WITHOUT ONE
    // TEST CHANGING. Two rules read the text where the value was
    // meant.
    //
    // The exemption for a DOM query read the subject's SPELLING, so
    // `expect(root.querySelector(".x")).toBeTruthy()` was exempt and
    // `const x = root.querySelector(".x"); expect(x).toBeTruthy();`
    // was counted -- the identical claim, decided by the author's use
    // of a const. And a lookup was exempt under EITHER existence
    // matcher, though every member of the family returns null and
    // `expect(null).toBeDefined()` passes.
    //
    // THE SECOND HALF MOVED ONE BLOCK THE OTHER WAY. The count was
    // too LOW by `formdialog :: withDefaultSize_UsesMdSize`, which
    // the exemption had been hiding. A correction that only ever
    // subtracts is a relaxation wearing a correction's name.
    testsThatCannotFail: 0,
    siblingStandIns: 6,

    // ADR-216. ASSERTION SITES THAT RUN ONLY WHEN A CONDITION HOLDS,
    // AND A CEILING BECAUSE WHETHER ONE EVER RUNS CANNOT BE READ OFF
    // THE TEXT. It depends on what the component renders, so the only
    // way to know is to put a must-fail assertion inside each body
    // and run the suite. A block whose guards never open stays green.
    //
    // THAT SWEEP FOUND TWO ON 2026-10-21, AND NEITHER OTHER CEILING
    // COULD SEE EITHER. `applauncher :: OnSelect_FiresCallback`
    // queried `.applauncher-app-card`, a class the component has
    // never written, so its ONLY assertion never ran;
    // `testsWithoutAssertion` counts the text `expect(` and found
    // one, and `testsThatCannotFail` read `toHaveBeenCalled()` and
    // called the block honest. `spinemap ::
    // multipleXssVectors_SafeRendering` looped over `[href]`
    // elements that do not exist, so a third injection vector read
    // as checked and was skipped. Both are fixed and the sweep now
    // reports 0 of 71.
    //
    // THE NUMBER IS THE POPULATION THE SWEEP HAS TO COVER, not a
    // backlog. A guard written round a selector is cheap to add and
    // costs nothing to leave wrong, which is how the AppLauncher
    // block survived. Re-run the sweep when this grows.
    // 81 -> 76 on 2026-10-21: a `for (const m of ["a", "b"])` is not
    // a guard. The collection is written out in the test, so a
    // reader can see it is not empty and a probe has nothing to
    // find. All five that left had fired in the sweep.
    guardedAssertions: 74,
    // ADR-219 (2026-10-25): options the agent-protocol gate cannot classify,
    // measured by scripts/agentui/generate.mjs over every built manifest.
    // Target 0. A new component that adds one fails [20]. Pinned exactly:
    // the same value is a FLOOR (2026-10-25, final review I-3), so a fix
    // lowers this number and the floor in the same change.
    // ADR-225 (2026-10-28): 546 -> 528, treeview classified (readiness step 2 P0).
    // ADR-226 (2026-10-28): 528 -> 513, the ten B1 pickers classified.
    // ADR-227 (2026-10-28): 513 -> 491, the seven B2 date and time pickers classified.
    // ADR-228 (2026-10-28): 491 -> 452, ten B3 inputs classified.
    // ADR-229 (2026-10-29): 452 -> 427, ten B4 display components classified.
    // ADR-230 (2026-10-29): 427 -> 425, DocViewer classified once the adapter loads its dependencies.
    // ADR-231 (2026-10-29): 425 -> 392, seven B5 editors and forms classified.
    // ADR-232 (2026-10-29): 392 -> 326, the nine B6 data views classified.
    // ADR-234 (2026-10-29): 326 -> 318, PromptTemplateManager classified (B7).
    // ADR-234 (2026-10-29): 318 -> 299, ActionItems classified (B7).
    // ADR-234 (2026-10-29): 299 -> 288, RelationshipManager classified (B7).
    // ADR-234 (2026-10-29): 288 -> 276, Conversation classified (B7).
    // ADR-234 (2026-10-29): 276 -> 268, ExplorerPicker classified (B7).
    // ADR-235 (2026-10-29): 268 -> 265, MarketingHero classified (B8).
    // ADR-235 (2026-10-29): 265 -> 264, SiteFooter classified (B8).
    // ADR-235 (2026-10-29): 264 -> 258, TenantSwitcher classified (B8).
    // ADR-235 (2026-10-29): 258 -> 252, AppLauncher classified (B8).
    // ADR-235 (2026-10-29): 252 -> 231, Ribbon classified (B8).
    unclassifiedOptions: 231,
    // ADR-219 (2026-10-25): protocol-visible data props without JSDoc. Target 0.
    // Pinned exactly by the floor of the same value (2026-10-25).
    // ADR-228 (2026-10-28): 373 -> 343, PeoplePicker's and Tagger's options documented (B3).
    // ADR-229 (2026-10-29): 343 -> 312, PersonChip's, PresenceIndicator's and ReasoningAccordion's options
    // documented (B4).
    // ADR-231 (2026-10-29): 312 -> 286, CodeEditor's and DynamicFormSwitcher's options documented (B5).
    // ADR-232 (2026-10-29): 286 -> 202, seven B6 data views' options documented.
    // ADR-234 (2026-10-29): 202 -> 191, PromptTemplateManager's options documented (B7).
    // ADR-234 (2026-10-29): 191 -> 181, RelationshipManager's options documented (B7).
    // ADR-234 (2026-10-29): 181 -> 161, ExplorerPicker's options documented (B7).
    // ADR-235 (2026-10-29): 161 -> 149, TenantSwitcher's options documented (B8).
    // ADR-235 (2026-10-29): 149 -> 130, AppLauncher's options documented (B8).
    // ADR-235 (2026-10-29): 130 -> 104, Ribbon's options documented (B8).
    protocolPropsMissingJsdoc: 104,
    // ADR-222 (2026-10-27): pending components whose onChange is not their value (#39),
    // so the adapter would write the wrong type back. Target 0. Each is fixed by a
    // protocol.change declaration in its #20 batch. Pinned exactly by the floor of the same value.
    // ADR-226 (2026-10-28): 18 -> 8, the ten B1 pickers declared protocol.change.
    // ADR-227 (2026-10-28): 8 -> 4, the four B2 pickers declared { cleared: null }.
    // ADR-228 (2026-10-28): 4 -> 3, Slider declared change: "event" (B3).
    // ADR-229 (2026-10-29): 3 -> 2, Gauge declared change: "event" (B4).
    // ADR-231 (2026-10-29): 2 -> 1, DynamicFormSwitcher declared change: "event" (B5).
    changeMismatches: 1,
    // ADR-219 (2026-10-25): length of BELOW_REQUIRED in scripts/agentui/migration.mjs. Target 0.
    // 40 -> 6 on 2026-10-25: 34 components already verified at their required level and were promoted.
    // Pinned exactly by the floor of the same value (2026-10-25): removing a name means lowering
    // both numbers in the same change, and adding one fails.
    componentsBelowRequiredLevel: 6,
    // ADR-219 (2026-10-25): length of PENDING_CLASSIFICATION in scripts/agentui/migration.mjs.
    // 94 -> 93 the same day: stickynote left once one onChange in two roles stopped counting
    // as a double claim. Target 0. Pinned exactly by the floor of the same value (2026-10-25):
    // removing a name means lowering both numbers in the same change, and adding one fails [20].
    // ADR-225 (2026-10-28): 93 -> 92, treeview classified (readiness step 2 P0).
    // ADR-226 (2026-10-28): 92 -> 82, the ten B1 pickers classified.
    // ADR-227 (2026-10-28): 82 -> 75, the seven B2 date and time pickers classified.
    // ADR-228 (2026-10-28): 75 -> 65, ten B3 inputs classified (fileupload stays pending).
    // ADR-229 (2026-10-29): 65 -> 55, ten B4 display components classified (docviewer stays pending).
    // ADR-230 (2026-10-29): 55 -> 54, docviewer classified (the adapter loads MarkdownRenderer and marked).
    // ADR-231 (2026-10-29): 54 -> 47, seven B5 editors and forms classified (propertyinspector stays pending).
    // ADR-232 (2026-10-29): 47 -> 38, the nine B6 data views classified.
    // ADR-234 (2026-10-29): 38 -> 37, PromptTemplateManager classified (B7).
    // ADR-234 (2026-10-29): 37 -> 36, ActionItems classified (B7).
    // ADR-234 (2026-10-29): 36 -> 35, RelationshipManager classified (B7).
    // ADR-234 (2026-10-29): 35 -> 34, Conversation classified (B7).
    // ADR-234 (2026-10-29): 34 -> 33, ExplorerPicker classified (B7).
    // ADR-235 (2026-10-29): 33 -> 32, MarketingHero classified (B8).
    // ADR-235 (2026-10-29): 32 -> 31, SiteFooter classified (B8).
    // ADR-235 (2026-10-29): 31 -> 30, TenantSwitcher classified (B8).
    // ADR-235 (2026-10-29): 30 -> 29, AppLauncher classified (B8).
    // ADR-235 (2026-10-29): 29 -> 28, Ribbon classified (B8).
    componentsPendingClassification: 28,
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
export const FLOORS = {
    // A closed or settled entry is a decision somebody recorded. It can
    // be reworded and it can move between the two markers, but it does
    // not stop existing — so their SUM is the floor, while
    // `trackerOpen` is an exact baseline.
    trackerResolved: 110,
    diagramengineBundleExports: 138,
    tracedComponents: 109,
    traceCalls: 301,
    dynamicVerboseShims: 225,
    // DEBT-TEST-1, added 2026-10-18 after deleting 23 tests by
    // accident. A regex meant to replace one `describe` matched a
    // closing brace further down and took the XSS sanitisation suite
    // with it — stripsScriptTags, stripsJavascriptUrls and fourteen
    // more — and every gate here passed, because every gate here is a
    // CEILING and a mass deletion only makes a ceiling happier.
    //
    // The suite reported "5191 passed" in green. Nothing said that
    // 5214 had passed twenty minutes earlier.
    //
    // A floor is cheap and it is the only thing that can see this.
    // Raise it when the count rises, the same as any other floor.
    testBlocks: 5071,
    // ADR-219 (2026-10-25). The four agent-protocol migration counts are
    // ALSO ceilings in BASELINES, at the same values, so each is pinned
    // EXACTLY. As ceilings alone they let a count fall without the
    // committed number following it, and that slack is a free slot: a
    // fixed component leaves BELOW_REQUIRED and a new under-declared one
    // takes its place with every gate green (final review I-3). With the
    // floor, a fall fails here until BOTH numbers are lowered in the same
    // change, and a rise fails the ceiling. Measured 2026-10-25, unchanged
    // by the final-review fixes: 546, 373, 6, 93. changeMismatches (ADR-222) added
    // 2026-10-27 at its measured 18. ADR-225 (2026-10-28): 528 and 92 once treeview was
    // classified (readiness step 2 P0). ADR-226 (2026-10-28): 513, 8 and 82 after B1.
    // ADR-227 (2026-10-28): 491, 4 and 75 after B2. ADR-228 (2026-10-28): 452, 343, 3 and 65 after B3.
    // ADR-229 (2026-10-29): 427, 312, 2 and 55 after B4. ADR-230 (2026-10-29): 425 and 54 after P1.
    // ADR-231 (2026-10-29): 392, 286, 1 and 47 after B5. ADR-232 (2026-10-29): 326, 202 and 38 after B6.
    // ADR-234 (2026-10-29): 318, 191 and 37 once PromptTemplateManager was classified (B7).
    // ADR-234 (2026-10-29): 299 and 36 once ActionItems was classified (B7).
    // ADR-234 (2026-10-29): 288, 181 and 35 once RelationshipManager was classified (B7).
    // ADR-234 (2026-10-29): 276 and 34 once Conversation was classified (B7).
    // ADR-234 (2026-10-29): 268, 161 and 33 once ExplorerPicker was classified (B7).
    // ADR-235 (2026-10-29): 265 and 32 once MarketingHero was classified (B8).
    // ADR-235 (2026-10-29): 264 and 31 once SiteFooter was classified (B8).
    // ADR-235 (2026-10-29): 258, 149 and 30 once TenantSwitcher was classified (B8).
    // ADR-235 (2026-10-29): 252, 130 and 29 once AppLauncher was classified (B8).
    // ADR-235 (2026-10-29): 231, 104 and 28 once Ribbon was classified (B8).
    unclassifiedOptions: 231,
    protocolPropsMissingJsdoc: 104,
    changeMismatches: 1,
    componentsBelowRequiredLevel: 6,
    componentsPendingClassification: 28,
};

/**
 * THE VERSION IN A THIRD-PARTY CDN URL IS THE ONLY THING PINNING IT.
 *
 * jsdelivr resolves `npm/mermaid@11` to the newest 11.x AT REQUEST TIME and
 * `npm/dompurify` to the newest anything. A documented URL without an exact
 * version is a standing instruction to consumers to load whatever that
 * project publishes next, with no review here and no SRI either. DEBT-SEC-5
 * is about adding SRI to five optional libraries. This is the hole
 * underneath it, and when it was first measured one of the eight unpinned
 * references was DOMPurify, which vendor-closure.mjs itself calls the
 * highest-value asset to remove third-party trust from.
 *
 * An exact version is `@` followed by a digit AND a dot. `@11` is a major
 * and still floats, so `@11.17.2` and `@5.3.8` pass while `@11` and `@5` do
 * not.
 *
 * HOW MANY SEGMENTS THE PACKAGE NAME TAKES DEPENDS ON THE REGISTRY, and
 * getting that wrong is how the first version of this check reported four
 * correctly pinned URLs as floating. Under `npm/` a name is one segment,
 * or two when it is scoped: `@viz-js/viz@3.11.0`. Under `gh/` it is ALWAYS
 * two, user and repository, and it carries no leading at-sign:
 * `gh/highlightjs/cdn-release@11.11.1`. Reading the leading character
 * instead of the registry takes `highlightjs` for the whole name, finds no
 * version on it, and fails a URL that was never wrong.
 *
 * This reads documentation and demo pages, not source. A reference that is
 * wrong here is served to a consumer rather than executed by us, which is
 * why nothing else in this file was looking at it.
 */
export const CDN_HOSTS = /(?:cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|esm\.sh)/;

/** Every third-party CDN URL in a blob of documentation or markup. */
export function cdnUrlsIn(text)
{
    const pattern = new RegExp(`${CDN_HOSTS.source}\\/[^\\s"'\`)|<>]+`, "g");

    return text.match(pattern) ?? [];
}

/**
 * The version a CDN URL pins, or "" when it pins none. Each registry spells
 * the version somewhere different, which is the whole difficulty.
 */
export function versionOfCdnUrl(url)
{
    const parts = url.split("/");
    const host = parts[0];
    const rest = parts.slice(1);

    if (host === "cdnjs.cloudflare.com")
    {
        // ajax/libs/<name>/<version>/<path>. The version is a path segment
        // of its own and there is no at-sign anywhere in the URL.
        return rest[0] === "ajax" && rest[1] === "libs" ? (rest[3] ?? "") : "";
    }

    // jsdelivr carries the registry in the path. unpkg and esm.sh do not.
    const registry = host === "cdn.jsdelivr.net" ? rest[0] : "npm";
    const tail = host === "cdn.jsdelivr.net" ? rest.slice(1) : rest;

    if (tail.length === 0) { return ""; }

    const segments = (registry === "gh" || tail[0].startsWith("@")) ? 2 : 1;
    const pkg = tail.slice(0, segments).join("/");
    const at = pkg.lastIndexOf("@");

    return at > 0 ? pkg.slice(at + 1) : "";
}

export function countUnpinnedCdnRefs(text)
{
    let unpinned = 0;

    for (const url of cdnUrlsIn(text))
    {
        if (!/^\d+\.\d/.test(versionOfCdnUrl(url))) { unpinned += 1; }
    }

    return unpinned;
}

/**
 * DEBT-SEC-9. Every ES-module specifier that names a third-party CDN,
 * whether imported statically (`from "https://..."`) or dynamically
 * (`import("https://...")`).
 *
 * WHY THIS EXISTS, AND WHY `thirdPartyTagsWithoutSri` COULD NOT SEE IT.
 * That count matches TAGS. A module specifier is not a tag. DEBT-SEC-8
 * therefore reported 17 findings of which 7 were connection hints that
 * can never carry a hash, while 67 real third-party code loads sat
 * uncounted in five files. A count named for one population measuring
 * another, for the fourth time in this file.
 *
 * NONE OF THESE CAN CARRY `integrity` TODAY. `import()` has no integrity
 * argument, and a static specifier has no attributes at all. Import maps
 * define an `integrity` key, but support is not broad enough to rely on,
 * so this is a CEILING and not a ratchet that should reach zero. The way
 * to zero is to stop loading from a CDN, which is a vendoring decision.
 *
 * ADR-210.
 */
export const CDN_MODULE_SPECIFIER =
    /(?:\bfrom\s*|(?:^|[^.\w])import\s*\(\s*)["'](https:\/\/(?:esm\.sh|unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)[^"']*)["']/g;

export function countCdnModuleSpecifiers(text)
{
    return [...text.matchAll(CDN_MODULE_SPECIFIER)].length;
}

/**
 * Every `<script src>` and `<link href>` tag that FETCHES A SUBRESOURCE,
 * whatever other attributes it carries.
 *
 * CONNECTION HINTS ARE EXCLUDED, BECAUSE `integrity` IS MEANINGLESS ON
 * THEM. `rel="preconnect"` and `rel="dns-prefetch"` open a socket and warm
 * DNS. They fetch no bytes, so there is nothing to hash, and the HTML spec
 * does not define `integrity` for either. Counting them produced SEVEN
 * phantom findings in DEBT-SEC-8 that no edit could ever clear, because
 * the only way to "fix" one is to delete a performance hint.
 *
 * `preload` and `modulepreload` are NOT excluded. Both fetch, both accept
 * `integrity`, and both belong in the count.
 *
 * ADR-210.
 */
export const NON_FETCHING_REL = /\brel\s*=\s*["']?(?:preconnect|dns-prefetch)\b/i;

export function cdnTagsIn(text)
{
    return (text.match(/<(?:script|link)\b[^>]*>/g) ?? [])
        .filter((tag) => CDN_HOSTS.test(tag))
        .filter((tag) => !NON_FETCHING_REL.test(tag));
}

/**
 * DEBT-SEC-5, part one: CORRECTNESS. A tag pointing at a build the SRI
 * manifest records must carry that manifest's hash and `crossorigin`.
 *
 * `crossorigin` is not decoration. Without it the browser makes an opaque
 * request, cannot read the body to hash it, and the integrity check is
 * skipped rather than failed. A hash with no `crossorigin` therefore looks
 * like protection and is none.
 *
 * This is a ceiling of zero, because every URL it matches is one this
 * repository chose and hashed.
 */
export function countTagsMissingSri(text, byUrl)
{
    let missing = 0;

    for (const tag of cdnTagsIn(text))
    {
        const url = Object.keys(byUrl).find((u) => tag.includes(u));

        if (url === undefined) { continue; }

        const hashed = tag.includes(`integrity="${byUrl[url]}"`);
        const cors = tag.includes('crossorigin="anonymous"');

        if (!hashed || !cors) { missing += 1; }
    }

    return missing;
}

/**
 * DEBT-SEC-5, part two: COVERAGE, and the only one of the three that can
 * see a library nobody has decided about yet.
 *
 * A ceiling on manifest URLs cannot see a bare vditor tag, because a
 * vditor tag matches no manifest URL. That is the same blindness
 * DEBT-GATE-1 and DEBT-SEC-6 were: a check that passes because its
 * predicate never reached the thing it was meant to guard. So this one
 * counts third-party tags carrying no `integrity` AT ALL, on any of the
 * four registries, whether or not the manifest knows the library.
 *
 * The baseline is therefore not zero. It is the set of libraries that
 * still need a version or registry decision, and it only goes down.
 */
export function countThirdPartyTagsWithoutSri(text)
{
    return cdnTagsIn(text).filter((tag) => !tag.includes("integrity=")).length;
}

/**
 * UNUSED-1, and the only count here that needs the COMPILER rather than a
 * scan. `noUnusedLocals` and `noUnusedParameters` are off in tsconfig.json,
 * so this asks for them explicitly and counts TS6133.
 *
 * WHY IT WAS NOT RATCHETED BEFORE, AND WHY THAT COST SOMETHING. The entry
 * said to re-derive it by hand and recorded 414 on 2026-10-15. The real
 * number that day was already 308, because LOG-4 had just instrumented 94
 * components and deleted 12 dead shims. 106 of the 414 were the
 * `function logTrace` declarations that nothing called, measured at
 * e361179 and gone at 945db05.
 *
 * A QUARTER OF THE COUNT WENT AWAY AS A SIDE EFFECT AND NOTHING NOTICED,
 * which is the argument for the ratchet rather than against it. An
 * unratcheted number is not a measurement, it is a memory of one, and this
 * one was four commits stale within a day.
 *
 * It runs tsc, so it is the slowest check in this file at about 1.6
 * seconds. The whole point is that a scan cannot see an unused binding.
 */
export function countUnusedLocals()
{
    try
    {
        execFileSync("npx", ["tsc", "--noEmit", "--noUnusedLocals", "--noUnusedParameters"],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
        return 0;
    }
    catch (err)
    {
        // tsc exits non-zero when it reports anything, so the output is here.
        const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
        return (out.match(/error TS6133:/g) ?? []).length;
    }
}

/**
 * Counts the export keywords that survive into a generated bundle.
 *
 * Only a line-start `export ` counts, which is what the concatenation
 * produces and what tsc reads when it writes the .d.ts. An export inside
 * a string or a comment is not a declaration and must not be counted.
 */
/**
 * Shared constants whose SOURCE copy disagrees with the value the
 * bundle actually ships.
 *
 * (CRITICAL) THE BUNDLER WINS SILENTLY AND NOTHING CHECKED.
 * `scripts/bundle-diagramengine.sh` emits its own preamble of
 * sixteen shared constants and then greps each source module to
 * STRIP that module's own declaration of the same name. The point
 * is that thirty concatenated files share one scope and cannot each
 * declare `const CLS`. The cost is that the number a reader finds
 * in `src/render-engine.ts` is not necessarily the number that
 * ships, and nothing ever compared them.
 *
 * Two had drifted when this was written (2026-10-21, UNUSED-1).
 * `MAX_ZOOM` read 4.0 in the source and 32.0 in the bundle -- a
 * reader of that file believed the engine capped zoom at 4x and it
 * caps at 32x. `ROTATION_HANDLE_OFFSET` read 24 in
 * `render-engine.ts` and 25 in `tool-select.ts`, which is the same
 * fault with the two copies disagreeing with each other as well.
 *
 * A CEILING AT ZERO, not a floor: the local copies exist so each
 * module reads correctly on its own, and a module that stops
 * declaring one is fine. What must never happen is a local copy
 * that LIES.
 *
 * @returns One entry per disagreement, as `file: NAME src -> bundle`.
 */
/**
 * The three tracker tallies, read from CODEBASE_FIXES.md's own markers.
 *
 * The file's Summary table used to be written by hand. On 2026-10-21 it
 * read "36 items, 24 resolved" and called eight categories open, while
 * the entries under seven of them all carried `- [x]`. A table that
 * names a population it has stopped measuring is the defect most of
 * that file documents in other people's code, so the table is derived
 * from the markers now and check [20] holds the derivation.
 *
 * @returns {{trackerOpen: number, trackerResolved: number}} The open
 *   count, and closed plus settled together.
 */
export function trackerMarkers()
{
    const src = readFileSync("CODEBASE_FIXES.md", "utf8");
    const rows = src.split("\n").filter(
        (l) => /^- \[( |x|=)\] \*\*(?:SETTLED — )?[A-Z][A-Za-z0-9-]*\*\*/.test(l));

    // Closed and settled are counted TOGETHER. They were two floors
    // until 2026-10-22, when DEBT-SEC-3 moved from settled to closed
    // and the settled floor had to be lowered by hand — a floor
    // being edited to permit the thing it exists to catch. The move
    // is legitimate: a settled entry is a decision with a reopen
    // condition, and meeting that condition closes it. What is never
    // legitimate is an entry leaving the file, and their SUM catches
    // that while staying blind to traffic between them.
    const resolved = rows.filter(
        (l) => l.startsWith("- [x]") || l.startsWith("- [=]")).length;

    return {
        trackerOpen: rows.filter((l) => l.startsWith("- [ ]")).length,
        trackerResolved: resolved,
    };
}

export function bundlePreambleMismatches()
{
    const script = readFileSync("scripts/bundle-diagramengine.sh", "utf8");
    const shipped = new Map();

    for (const m of script.matchAll(/echo "const (\w+) = (.*?);"\n/g))
    {
        shipped.set(m[1], m[2].replace(/\\"/g, '"'));
    }

    const out = [];
    const dir = "components/diagramengine/src";

    for (const file of readdirSync(dir).filter((n) => n.endsWith(".ts")))
    {
        const text = readFileSync(`${dir}/${file}`, "utf8");

        for (const m of text.matchAll(/^const (\w+) = (.*?);$/gm))
        {
            if (!shipped.has(m[1])) { continue; }
            if (shipped.get(m[1]) === m[2]) { continue; }

            out.push(`${file}: ${m[1]} is ${m[2]}, bundle ships ${shipped.get(m[1])}`);
        }
    }
    return out;
}

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
        unpinnedCdnRefs: 0,
        tagsMissingSri: 0,
        thirdPartyTagsWithoutSri: 0,
        cdnModuleSpecifiers: 0,
        unusedLocals: 0,
        bundlePreambleMismatches: 0,
        factoriesReturningClass: 0,
        handlesWithoutImplements: 0,
        trackerOpen: 0,
        trackerResolved: 0,
        consoleLogCalls: 0,
        shimWithoutUtility: 0,
        directConsole: 0,
        anyAnnotations: 0,
        anyCasts: 0,
        scssImportant: 0,
        scssImportantComponents: 0,
        scssImportantUncommented: 0,
        disabledWithoutAria: 0,
        componentsMissingMarker: 0,
        diagramengineSrcMissingMarker: 0,
        scssMissingMarker: 0,
        diagramengineLines: 0,
        traceCalls: 0,
        testsWithoutAssertion: 0,
        testsThatCannotFail: 0,
        siblingStandIns: 0,
        guardedAssertions: 0,
        testBlocks: 0,
        unclassifiedOptions: 0,
        protocolPropsMissingJsdoc: 0,
        changeMismatches: 0,
        componentsBelowRequiredLevel: 0,
        componentsPendingClassification: 0,
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
        counts.disabledWithoutAria += disabledWithoutAria(text);

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
    // IMP-1. TWO COUNTS, BECAUSE THE ENTRY AND THE RATCHET WERE NOT
    // LOOKING AT THE SAME FILES. scssImportant spans every tracked
    // stylesheet. The tracker section is titled "!important in Component
    // SCSS" and lists component files only, so scssImportantComponents is
    // the one that matches the words around it.
    const scss = execFileSync("git", ["ls-files", "*.scss"], { encoding: "utf8" })
        .split("\n").filter(Boolean).filter((f) => !f.startsWith("dist/"));
    for (const file of scss)
    {
        // Comments stripped FIRST. This counted raw substrings over the
        // whole file, so a comment that said "specificity, not
        // `!important`" raised a count of DECLARATIONS by one — the
        // ratchet this file's own docstring warns about, "named for one
        // population and measuring another", committed by the ratchet.
        const raw = readFileSync(file, "utf8");
        const n = countOccurrences(stripScssComments(raw), "!important");
        counts.scssImportant += n;
        if (file.startsWith("components/"))
        {
            counts.scssImportantComponents += n;

            // The ORIGINAL text here, not the stripped one: this check
            // looks for the `important-case: N` COMMENT beside each
            // declaration, so stripping comments first would report
            // every one of them as unjustified.
            counts.scssImportantUncommented += uncommentedImportants(raw);
        }
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

    // UNUSED-1. The compiler, not a scan: an unused binding is an absence.
    counts.unusedLocals = countUnusedLocals();

    // UNUSED-1. A source copy of a bundled constant that LIES: the
    // bundler strips each module's declaration and emits its own.
    counts.bundlePreambleMismatches = bundlePreambleMismatches().length;

    // ADR-219. The generator's own tested classifier, not a second one:
    // it needs dist/capability-manifest.json, so run after the build.
    const protocol = measureClassification();
    counts.unclassifiedOptions = protocol.unclassifiedOptions;
    counts.protocolPropsMissingJsdoc = protocol.protocolPropsMissingJsdoc;
    counts.changeMismatches = protocol.changeMismatches;
    counts.componentsBelowRequiredLevel = BELOW_REQUIRED.size;
    counts.componentsPendingClassification = PENDING_CLASSIFICATION.size;

    // PAT-1. The compiler, not a regex: `Toolbar` and `ToolbarHandle`
    // differ by a resolved symbol.
    counts.factoriesReturningClass = factoriesReturningClass().length;
    counts.handlesWithoutImplements = handlesWithoutImplements().length;

    // The tracker's own Summary table, derived rather than typed.
    Object.assign(counts, trackerMarkers());

    // DEBT-TEST-1. A test that cannot fail is worse than no test. No
    // test is an absence somebody can count, and a passing test is a
    // claim with the suite's green offered as its evidence.
    const blocks = testCensus();
    counts.testBlocks = blocks.length;
    counts.testsWithoutAssertion = blocks.filter((b) => b.verdict === "none").length;
    counts.testsThatCannotFail = blocks.filter((b) => b.verdict === "vacuous").length;

    // ADR-216. An assertion that never RUNS, which is a different
    // fault from one that cannot fail and had no number until now.
    counts.guardedAssertions = guardedAssertions(blocks)
        .reduce((n, r) => n + r.at.length, 0);

    // DEBT-TEST-1c. A suite that writes a global another component here
    // owns, and does not import that component. The population was 11,
    // is 6, and all 6 are legitimate: each plants a stub that IS the
    // subject of the test, such as a factory that throws, or deletes the
    // global to prove the component refuses without it.
    //
    // A CEILING RATHER THAN A TARGET OF ZERO. Driving this to zero would
    // mean deleting the refusal tests, which are the ones that caught
    // FALLBACK-1 through -14. It exists so the number cannot GROW in
    // silence, which is how ADR-203's GraphToolbar defect survived: nine
    // blocks asserting on a fake Toolbar, every assertion real, every one
    // measuring the suite rather than the component.
    counts.siblingStandIns = standInsOf().filter((r) => !r.imported).length;

    // DEBT-SEC-5. Documentation and demo pages hand consumers third-party
    // URLs. One without an exact version is a floating dependency, and one
    // without an integrity hash is a build the host page cannot verify.
    const sri = JSON.parse(readFileSync("scripts/third-party-sri.json", "utf8"));
    const hashByUrl = Object.fromEntries(
        Object.values(sri.assets).map((a) => [a.url, a.integrity]));

    const published = execFileSync("git", ["ls-files", "*.md", "*.html"], { encoding: "utf8" })
        .split("\n").filter(Boolean).filter((f) => !f.startsWith("dist/"));
    for (const file of published)
    {
        // One file in the repository is not valid UTF-8. Reading it as
        // UTF-8 substitutes replacement characters rather than throwing,
        // and no CDN URL survives that intact, so it is read and counted
        // like any other rather than skipped silently.
        const text = readFileSync(file, "utf8");

        counts.unpinnedCdnRefs += countUnpinnedCdnRefs(text);
        counts.tagsMissingSri += countTagsMissingSri(text, hashByUrl);
        counts.thirdPartyTagsWithoutSri += countThirdPartyTagsWithoutSri(text);
        counts.cdnModuleSpecifiers += countCdnModuleSpecifiers(text);
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
