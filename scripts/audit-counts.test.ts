/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the tracker's count classifiers
 *
 * AUDIT-1 (ADR-168). Tests for scripts/audit-counts.mjs.
 *
 * The classifier these tests pin produced two false findings while it was
 * being written, and both are represented here as cases:
 *
 *   - a published name carries trailing parentheses in the quick
 *     reference, so searching a bundle for the literal `Name()` reports
 *     17 real names as missing
 *   - `grep -c` counts matching LINES and silently overrides `-o`, so two
 *     occurrences on one line count as one
 *
 * A count is only as trustworthy as the classifier behind it, so each
 * outcome gets a case and each bug gets a regression.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import
{
    classifyConsoleLog,
    classifyLoggingPattern,
    classifyWindowCast,
    LOCAL_HOST_RULE,
    countAnyCasts,
    cdnTagsIn,
    countCdnModuleSpecifiers,
    countOccurrences,
    stripScssComments,
    uncommentedImportants,
    countUngatedVerboseShims,
    countUnpinnedCdnRefs,
    countTagsMissingSri,
    countThirdPartyTagsWithoutSri,
    versionOfCdnUrl,
    countBundleExports,
    countWindowAliases,
    floorStatus,
    insideStringLiteral,
    BASELINES,
    FLOORS,
} from "./audit-counts.mjs";

describe("classifyConsoleLog", () =>
{
    test("a doc comment example is not a call site", () =>
    {
        expect(classifyConsoleLog(' *     onChange: (color) => console.log("Selected:", color)')).toBe("doc-example");
        expect(classifyConsoleLog('// console.log("left in by accident")')).toBe("doc-example");
        expect(classifyConsoleLog('/* console.log("block comment") */')).toBe("doc-example");
    });

    test("sample code drawn as string data is not a call site", () =>
    {
        const line = '        { num: "3", text: "  console.log(msg);", color: C_CODE_TEXT },';
        expect(classifyConsoleLog(line)).toBe("string-literal");
    });

    test("a logging shim body is the correct mapping for INFO, not a violation", () =>
    {
        const withUtility = 'function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) '
            + ': console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }';
        const withoutUtility = '    console.log(new Date().toISOString(), "[INFO]", BASIC_LOG_PREFIX, ...args);';
        expect(classifyConsoleLog(withUtility)).toBe("shim-body");
        expect(classifyConsoleLog(withoutUtility)).toBe("shim-body");
    });

    test("the log utility's own fallthrough is the terminus, not a violation", () =>
    {
        const line = "            default: console.log(...parts);";
        expect(classifyConsoleLog(line, "components/logutility/logutility.ts")).toBe("utility-terminus");
    });

    test("a bare call with a hand written prefix is a real call site", () =>
    {
        expect(classifyConsoleLog('            console.log("[ErrorDialog] Retry button clicked");')).toBe("call");
        expect(classifyConsoleLog('        console.log("[ErrorDialog] Showing error dialog:", error.title);'))
            .toBe("call");
    });

    test("a line without the token is classified as none", () =>
    {
        expect(classifyConsoleLog('console.debug("not log");')).toBe("none");
    });

    test("a bare call is never mistaken for a shim body", () =>
    {
        // The shim is recognised by its timestamp argument. A call that
        // merely mentions a date must not borrow that exemption.
        expect(classifyConsoleLog('console.log("started at", new Date().toISOString());')).toBe("call");
    });
});

describe("insideStringLiteral", () =>
{
    test("an odd number of preceding quotes means inside", () =>
    {
        const line = 'text: "  console.log(msg);"';
        expect(insideStringLiteral(line, line.indexOf("console.log"))).toBe(true);
    });

    test("an even number of preceding quotes means outside", () =>
    {
        const line = 'const prefix = "[X]"; console.log(prefix);';
        expect(insideStringLiteral(line, line.indexOf("console.log"))).toBe(false);
    });

    test("an escaped quote does not flip the parity", () =>
    {
        const line = 'const s = "a \\" b"; console.log(s);';
        expect(insideStringLiteral(line, line.indexOf("console.log"))).toBe(false);
    });

    test("a template literal counts too", () =>
    {
        const line = "const t = `  console.log(x);";
        expect(insideStringLiteral(line, line.indexOf("console.log"))).toBe(true);
    });

    test("an apostrophe inside a double quoted string does not open a string", () =>
    {
        // Tracking each quote type's parity separately gets this wrong: the
        // apostrophe leaves an odd single-quote count, so a real call site
        // reads as string data. The scanner tracks which quote is open.
        const line = 'const s = "it\'s"; console.log(s);';
        expect(insideStringLiteral(line, line.indexOf("console.log"))).toBe(false);
        expect(classifyConsoleLog(line)).toBe("call");
    });

    test("a double quote inside a template literal does not close it", () =>
    {
        const line = 'const t = `say "hi" and console.log(x)';
        expect(insideStringLiteral(line, line.indexOf("console.log"))).toBe(true);
    });
});

describe("stripScssComments", () =>
{
    // IMP-1. The !important ratchet matched raw substrings over the
    // whole file, so a comment reading "specificity, not `!important`"
    // raised a count of DECLARATIONS. Two of the 105 it reported were
    // prose.
    test("a keyword in a line comment does not count", () =>
    {
        const scss = "// prefer specificity over !important\na { color: red; }";
        expect(countOccurrences(stripScssComments(scss), "!important")).toBe(0);
    });

    test("a keyword in a block comment does not count", () =>
    {
        const scss = "/* see IMP-1 about !important */\na { color: red; }";
        expect(countOccurrences(stripScssComments(scss), "!important")).toBe(0);
    });

    test("a real declaration still counts", () =>
    {
        const scss = "// about !important\na { color: red !important; }";
        expect(countOccurrences(stripScssComments(scss), "!important")).toBe(1);
    });

    test("a // inside a string survives", () =>
    {
        const scss = "a { background: url(\"https://x/y.png\") !important; }";
        const out = stripScssComments(scss);
        expect(out).toContain("https://x/y.png");
        expect(countOccurrences(out, "!important")).toBe(1);
    });

    test("a // inside a block comment does not end it early", () =>
    {
        const scss = "/* http://example.com\n   !important */\na { b: c; }";
        expect(countOccurrences(stripScssComments(scss), "!important")).toBe(0);
    });
});

describe("countOccurrences", () =>
{
    test("counts occurrences, not lines", () =>
    {
        // This is the `grep -c` bug. Both casts are on one line.
        const line = 'const f = (window as any).a ?? (window as any).b;';
        expect(countOccurrences(line, "window as any")).toBe(2);
    });

    test("counts across lines", () =>
    {
        expect(countOccurrences("window as any\nwindow as any\nwindow as any", "window as any")).toBe(3);
    });

    test("does not overlap matches", () =>
    {
        expect(countOccurrences("aaaa", "aa")).toBe(2);
    });

    test("absent needle counts zero", () =>
    {
        expect(countOccurrences("window as unknown as Record<string, unknown>", "window as any")).toBe(0);
    });
});

describe("classifyLoggingPattern", () =>
{
    const shim = 'function logInfo(...a: unknown[]): void { console.log(new Date().toISOString(), "[X]", P, ...a); }';

    test("the utility check is what conformance means", () =>
    {
        const text = 'const _lu = (typeof (window as any).createLogUtility === "function") ? x : null;\n' + shim;
        expect(classifyLoggingPattern(text)).toBe("conforms");
    });

    test("a shim without the utility check is only partly migrated", () =>
    {
        expect(classifyLoggingPattern(shim)).toBe("shim-without-utility");
    });

    test("direct console calls with no shim are unmigrated", () =>
    {
        expect(classifyLoggingPattern('console.log("[ErrorDialog] Showing");')).toBe("direct-console");
    });

    test("a component that logs nothing is not a violation", () =>
    {
        expect(classifyLoggingPattern("export function createThing(): void { return; }")).toBe("no-logging");
    });

    // Regression. The DiagramEngine modules take their helpers from
    // src/logging.ts, so they hold no `createLogUtility` of their own. A
    // classifier that only knows the direct form calls seventeen files
    // holding 57 log calls "no-logging" and passes, which is a count that
    // is right by accident. See FRONTEND_LOGGING.md section 1.1.
    test("helpers taken from the engine factory conform", () =>
    {
        const text = "const { info: logPenInfo } = makeLogger(PEN_LOG_PREFIX);\nlogPenInfo(\"Started\");";
        expect(classifyLoggingPattern(text)).toBe("conforms");
    });

    test("the factory name must be a call, not a mention in prose", () =>
    {
        expect(classifyLoggingPattern("// makeLogger is described in FRONTEND_LOGGING.md")).toBe("no-logging");
    });

    // Regression. stencils-ui-components.ts draws sample source onto the
    // canvas, so one of its data strings contains a console call. This
    // classifier reported the file as a standards violation until it asked
    // the same string-literal scanner that classifyConsoleLog uses.
    test("a console call drawn as canvas data is not logging", () =>
    {
        const text = '{ num: "3", text: "  console.log(msg);", color: C_CODE_TEXT },';
        expect(classifyLoggingPattern(text)).toBe("no-logging");
    });
});

/**
 * `windowCasts` counts every type assertion on `window`, whatever it asserts
 * to. WIN-1 counted one spelling of four, and the spelling it counted was the
 * smaller population, so these cases pin the mix rather than the total.
 */
describe("classifyWindowCast", () =>
{
    test("the bare any assertion is 'any'", () =>
    {
        expect(classifyWindowCast("any).createLogUtility")).toBe("any");
    });

    test("the double cast to a record is 'record'", () =>
    {
        expect(classifyWindowCast("unknown as Record<string, unknown>)[\"Toolbar\"]")).toBe("record");
    });

    // hovercard.ts:29 asserts to a record whose value type is a function, so
    // a classifier keyed on the full `Record<string, unknown>` string misses
    // it. The rule keys on the opening of the generic instead.
    test("a record of any value type is still 'record'", () =>
    {
        const tail = "unknown as Record<string, () => { getLogger: (p: string) => unknown }>)";
        expect(classifyWindowCast(tail)).toBe("record");
    });

    // dynamicformswitcher.ts:285 asserts to an inline object type. This is
    // the form that made the total 325 rather than the 321 derived from the
    // two spellings that were known.
    test("an inline object type is 'other'", () =>
    {
        expect(classifyWindowCast("unknown as { createLogUtility?: () => void };")).toBe("other");
    });

    // spinemap.ts:858 wraps the line after `as`, so the asserted type is not
    // on the matched line at all. It must still count.
    test("a wrapped assertion with no type on the line is 'other'", () =>
    {
        expect(classifyWindowCast("unknown as")).toBe("other");
    });

    // `anyOther` would classify as "any" under a prefix test without a word
    // boundary, and no such identifier should be read as the any assertion.
    test("a longer identifier beginning with any is not 'any'", () =>
    {
        expect(classifyWindowCast("anyOtherThing)")).toBe("other");
    });
});

/**
 * `countWindowAliases` watches the conversion surface `windowCasts` cannot
 * see. One `const win = window as unknown as Record<string, unknown>;` spends
 * a single occurrence of the counted pattern and then reaches `window`
 * untyped as often as the file likes. These cases pin the alias, not the
 * assertion that created it.
 */
describe("countWindowAliases", () =>
{
    test("an alias declaration counts once and each use counts once", () =>
    {
        const text = [
            "const win = window as unknown as Record<string, unknown>;",
            "win[\"createFormDialog\"] = createFormDialog;",
            "const f = win[\"createPeoplePicker\"];",
        ].join("\n");
        expect(countWindowAliases(text)).toEqual({ declarations: 1, uses: 2 });
    });

    test("the declaration line is never also a use", () =>
    {
        // `const win = window as X` contains the token `win` followed by
        // nothing that looks like access, but a rule that scanned the whole
        // file for the name would still have to skip this line on principle.
        const text = "const win = window as unknown as Record<string, unknown>;";
        expect(countWindowAliases(text)).toEqual({ declarations: 1, uses: 0 });
    });

    test("dot access through the alias counts too", () =>
    {
        const text = "const w = window as any;\nw.createToolbar();";
        expect(countWindowAliases(text).uses).toBe(1);
    });

    test("a globalThis alias is the same defect", () =>
    {
        const text = "const g = globalThis as unknown as Record<string, unknown>;\ng[\"Chart\"];";
        expect(countWindowAliases(text)).toEqual({ declarations: 1, uses: 1 });
    });

    // The fix this count expects. Dropping the assertion and keeping the
    // alias types every use through globals.d.ts and emits the same
    // JavaScript, so the count reaching 0 does not mean the aliases are gone.
    test("an alias with no assertion is not counted at all", () =>
    {
        const text = "const win = window;\nwin.createFormDialog = createFormDialog;";
        expect(countWindowAliases(text)).toEqual({ declarations: 0, uses: 0 });
    });

    test("a longer identifier sharing the alias prefix is not a use", () =>
    {
        const text = "const w = window as any;\nconst width = w2.x;\nwindowish.y;";
        expect(countWindowAliases(text).uses).toBe(0);
    });

    test("a file with no alias costs nothing", () =>
    {
        expect(countWindowAliases("export function f(): void { return; }"))
            .toEqual({ declarations: 0, uses: 0 });
    });
});

/**
 * `globalThis as` is counted with `window as` from WIN-2 on. The two reach
 * the same object and only the spelling differs, so a gate that watched one
 * of them would be the WIN-1 blind spot one level up.
 */
describe("the globalThis spelling", () =>
{
    test("classification does not depend on which global was asserted", () =>
    {
        expect(classifyWindowCast("any)[name]")).toBe("any");
        expect(classifyWindowCast("unknown as Record<string, unknown>)[name]")).toBe("record");
    });

    test("the counting pattern matches both spellings", () =>
    {
        const re = /(?:window|globalThis) as (.*)/g;
        const text = "(window as any).a;\n(globalThis as any).b;";
        expect([...text.matchAll(re)]).toHaveLength(2);
    });
});

/**
 * `countAnyCasts` watches the half of ANY-1 that `anyAnnotations` cannot
 * see. `: any` is a declaration saying the type is unknown; `as any` says
 * the same about an expression and carries no colon. 88 were gated and 69
 * were not. Third time in this repository that a ratchet was narrower than
 * the behavior it was named for, so these cases pin the behavior.
 */
describe("countAnyCasts", () =>
{
    test("a value cast counts", () =>
    {
        expect(countAnyCasts("const x = thing as any;")).toBe(1);
    });

    test("two casts on one line count twice", () =>
    {
        // The `grep -c` bug again. Measuring this file with `grep -c` reported
        // 52 casts in toolbar.ts where countAnyCasts finds 56.
        expect(countAnyCasts("f(a as any, b as any);")).toBe(2);
    });

    test("an annotation is not a cast", () =>
    {
        // anyAnnotations owns this one. Counting it here would double-count.
        expect(countAnyCasts("let x: any = 1;")).toBe(0);
    });

    test("a doc comment example is not a cast", () =>
    {
        expect(countAnyCasts(" *     const x = el as any;")).toBe(0);
        expect(countAnyCasts("// const x = el as any;")).toBe(0);
    });

    test("sample code drawn as string data is not a cast", () =>
    {
        const line = '        { num: "3", text: "  const x = y as any;", color: C },';
        expect(countAnyCasts(line)).toBe(0);
    });

    test("a longer identifier is not the keyword", () =>
    {
        expect(countAnyCasts("const n = parseAsAnyone(x);")).toBe(0);
        expect(countAnyCasts("const n = x as anyThing;")).toBe(0);
    });

    test("a file with no cast costs nothing", () =>
    {
        expect(countAnyCasts("export function f(): void { return; }")).toBe(0);
    });
});

/**
 * `countUngatedVerboseShims` watches the branch that runs when
 * `logutility.js` is NOT loaded. That branch filtered nothing, so debug and
 * trace printed unconditionally and no flag could stop them, on the 132 of
 * 138 demo pages that do not load the utility.
 *
 * The two paths cannot share code, because the fallback exists precisely
 * when the utility is absent. These cases pin the TEXT of the gate, and
 * logutility.test.ts pins the semantics on the other side.
 *
 * LOG-6 CHANGED THE TEXT THESE CASES PIN, from `_dbg` to `_dbg()`. The
 * captured const was read once at script evaluation, so a flag set in a
 * live console did nothing on this branch. The call form is the fix and
 * the old form now reads as ungated, which is case one below.
 * magnifier.flag.test.ts drives the behaviour, because text is not
 * behaviour and only one of the two can fail for the right reason.
 */
describe("countUngatedVerboseShims", () =>
{
    const shim = (name: string, body: string): string =>
        `function ${name}(...a: unknown[]): void { ${body} }`;

    test("an unguarded console fallback is ungated", () =>
    {
        const t = shim("logDebug", "_lu ? _lu.debug(...a) : console.debug(P, ...a);");
        expect(countUngatedVerboseShims(t).ungated).toBe(1);
    });

    test("a guarded fallback is gated", () =>
    {
        const t = shim("logDebug", "_lu ? _lu.debug(...a) : _dbg() && console.debug(P, ...a);");
        expect(countUngatedVerboseShims(t).ungated).toBe(0);
    });

    test("a gate captured in a const is ungated, because LOG-6 made it a call", () =>
    {
        const t = shim("logDebug", "_lu ? _lu.debug(...a) : _dbg && console.debug(P, ...a);");
        expect(countUngatedVerboseShims(t).ungated).toBe(1);
        expect(countUngatedVerboseShims(t).dynamic).toBe(0);
    });

    test("a dynamic shim is counted for the floor", () =>
    {
        const t = shim("logDebug", "_lu ? _lu.debug(...a) : _dbg() && console.debug(P, ...a);")
            + "\n" + shim("logTrace", "_lu ? _lu.trace(...a) : _trc() && console.debug(P, ...a);");
        expect(countUngatedVerboseShims(t).dynamic).toBe(2);
    });

    // The floor's own mutation. A shim DELETED with its calls leaves the
    // ceiling at zero, which reads as success. Only `dynamic` falls.
    test("a deleted shim is invisible to the ceiling and visible to the floor", () =>
    {
        const both = shim("logDebug", "_lu ? _lu.debug(...a) : _dbg() && console.debug(P, ...a);")
            + "\n" + shim("logTrace", "_lu ? _lu.trace(...a) : _trc() && console.debug(P, ...a);");
        const gone = shim("logTrace", "_lu ? _lu.trace(...a) : _trc() && console.debug(P, ...a);");
        expect(countUngatedVerboseShims(both)).toEqual({ ungated: 0, missingRule: 0, dynamic: 2 });
        expect(countUngatedVerboseShims(gone)).toEqual({ ungated: 0, missingRule: 0, dynamic: 1 });
    });

    test("debug and trace are counted separately", () =>
    {
        const t = shim("logDebug", "_lu ? _lu.debug(...a) : _dbg() && console.debug(P, ...a);")
            + "\n" + shim("logTrace", "_lu ? _lu.trace(...a) : console.debug(P, ...a);");
        expect(countUngatedVerboseShims(t).ungated).toBe(1);
    });

    test("trace must use its own gate, not debug's", () =>
    {
        // `_dbg && console.debug` inside logTrace would make trace follow the
        // host, and trace deliberately does not.
        const t = shim("logTrace", "_lu ? _lu.trace(...a) : _dbg() && console.debug(P, ...a);");
        expect(countUngatedVerboseShims(t).ungated).toBe(1);
    });

    test("info, warn and error are not verbose and are not counted", () =>
    {
        const t = shim("logInfo", "_lu ? _lu.info(...a) : console.log(P, ...a);")
            + "\n" + shim("logWarn", "_lu ? _lu.warn(...a) : console.warn(P, ...a);")
            + "\n" + shim("logError", "_lu ? _lu.error(...a) : console.error(P, ...a);");
        expect(countUngatedVerboseShims(t).ungated).toBe(0);
    });

    test("a file with no shims costs nothing", () =>
    {
        expect(countUngatedVerboseShims("export function f(): void { return; }"))
            .toEqual({ ungated: 0, missingRule: 0, dynamic: 0 });
    });

    // The drift guard. Two implementations of one rule is what this
    // repository keeps finding, so a file that computes `_dbg` has to carry
    // the rule character-for-character.
    test("computing _dbg without the host rule is drift", () =>
    {
        const t = "const f = window.__ebt_debug_logging ?? /^(localhost)$/.test(h);";
        expect(countUngatedVerboseShims(t).missingRule).toBe(1);
    });

    test("computing _dbg with the rule verbatim is not drift", () =>
    {
        const t = `const LOCAL_HOSTS = ${LOCAL_HOST_RULE};\n`
            + "function _dbg(): boolean { return !!window.__ebt_debug_logging; }";
        expect(countUngatedVerboseShims(t).missingRule).toBe(0);
    });

    test("the rule this check compares against is the one logutility declares", () =>
    {
        // If logutility.ts changes its regex, this fails and the 117 files
        // carrying a copy have to be updated with it.
        const source = readFileSync("components/logutility/logutility.ts", "utf8");
        expect(source).toContain(`const LOCAL_HOSTS = ${LOCAL_HOST_RULE};`);
    });
});

describe("floorStatus", () =>
{
    /*
     * A floor is the mirror of a baseline and the two are easy to write
     * the wrong way round. These cases pin the direction. STD-1 is the
     * reason floors exist: every other count in the script is a ceiling
     * on something unwanted, and a missing export keyword is an absence,
     * so no ceiling could ever rise in response to it.
     */
    test("fails when the count falls below the floor", () =>
    {
        expect(floorStatus(0, 138)).toBe("UNDER");
        expect(floorStatus(137, 138)).toBe("UNDER");
    });

    test("passes when the count sits exactly on the floor", () =>
    {
        expect(floorStatus(138, 138)).toBe("at");
    });

    test("passes when the count rises above the floor", () =>
    {
        expect(floorStatus(139, 138)).toBe("over");
        expect(floorStatus(1000, 138)).toBe("over");
    });

    test("a floor of zero still reports a status", () =>
    {
        expect(floorStatus(0, 0)).toBe("at");
        expect(floorStatus(1, 0)).toBe("over");
    });
});

describe("countBundleExports", () =>
{
    test("counts one declaration per line-start export", () =>
    {
        const text = [
            "export interface Rect",
            "{",
            "    x: number;",
            "}",
            "export function svgCreate(): void {}",
            "export const HIGHLIGHT_BLUE = \"rgba(173, 216, 230, 0.4)\";",
        ].join("\n");
        expect(countBundleExports(text)).toBe(3);
    });

    test("reads zero from a bundle built with the export strip restored", () =>
    {
        /*
         * This is the regression itself. scripts/bundle-diagramengine.sh
         * used to run `s/^export //g` over every source file, and the
         * published .d.ts was built from the result.
         */
        const stripped = [
            "interface Rect",
            "{",
            "    x: number;",
            "}",
            "function svgCreate(): void {}",
        ].join("\n");
        expect(countBundleExports(stripped)).toBe(0);
        expect(floorStatus(countBundleExports(stripped), 138)).toBe("UNDER");
    });

    test("does not count an export that is indented, quoted or commented", () =>
    {
        const text = [
            "    export interface Indented {}",
            "const note = \"export interface InAString {}\";",
            "// export interface Commented {}",
            " * export interface InABlockComment {}",
        ].join("\n");
        expect(countBundleExports(text)).toBe(0);
    });

    test("the real bundle is at or above its floor", () =>
    {
        const source = readFileSync("components/diagramengine/diagramengine.ts", "utf8");
        expect(countBundleExports(source)).toBeGreaterThanOrEqual(138);
    });
});

/**
 * `countUnpinnedCdnRefs` reads the URLs this repository hands to consumers
 * in documentation and demo pages. A jsdelivr URL without an exact version
 * resolves to whatever that project publishes next, which is a dependency
 * nobody here reviews.
 */
describe("countUnpinnedCdnRefs", () =>
{
    test("an exact version is pinned", () =>
    {
        expect(countUnpinnedCdnRefs("https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js")).toBe(0);
    });

    test("a bare package name is not pinned", () =>
    {
        expect(countUnpinnedCdnRefs("https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js")).toBe(1);
    });

    test("a major on its own still floats", () =>
    {
        // jsdelivr resolves `@11` to the newest 11.x at request time.
        expect(countUnpinnedCdnRefs("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js")).toBe(1);
        expect(countUnpinnedCdnRefs("https://cdn.jsdelivr.net/npm/bootstrap@5/css/bootstrap.min.css")).toBe(1);
    });

    test("a scoped package keeps its own at-sign", () =>
    {
        const u = "https://cdn.jsdelivr.net/npm/@viz-js/viz@3.11.0/lib/viz-standalone.js";
        expect(countUnpinnedCdnRefs(u)).toBe(0);
        expect(countUnpinnedCdnRefs("https://cdn.jsdelivr.net/npm/@viz-js/viz/lib/viz-standalone.js")).toBe(1);
    });

    // The bug the first version of this check shipped with. A gh name is
    // user AND repository, and it carries no leading at-sign, so reading
    // the first character instead of the registry took `highlightjs` for
    // the whole name and failed four URLs that were correctly pinned.
    test("a gh package name is two segments and carries no at-sign", () =>
    {
        const u = "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/highlight.min.js";
        expect(countUnpinnedCdnRefs(u)).toBe(0);
        expect(countUnpinnedCdnRefs("https://cdn.jsdelivr.net/gh/highlightjs/cdn-release/build/x.js")).toBe(1);
    });

    test("every URL in one file is counted, not just the first", () =>
    {
        const t = "a https://cdn.jsdelivr.net/npm/marked/marked.min.js b\n"
            + "c https://cdn.jsdelivr.net/npm/vditor/dist/index.min.js d";
        expect(countUnpinnedCdnRefs(t)).toBe(2);
    });

    test("a file with no CDN URLs costs nothing", () =>
    {
        expect(countUnpinnedCdnRefs("# Heading\n\nSome prose.")).toBe(0);
    });
});

/**
 * DEBT-SEC-5 widened `countUnpinnedCdnRefs` from one registry to four.
 *
 * The previous predicate matched `cdn.jsdelivr.net` alone and reported 0,
 * while 77 CodeMirror references floated on unpkg and esm.sh the whole
 * time. A ceiling of zero measured by a predicate that cannot reach the
 * thing it guards is the DEBT-GATE-1 failure again, so each registry gets
 * a pinned case and an unpinned one.
 */
describe("versionOfCdnUrl across registries", () =>
{
    test("unpkg carries the version on the package, with no registry segment", () =>
    {
        expect(versionOfCdnUrl("unpkg.com/vditor@3.11.2/dist/index.min.js")).toBe("3.11.2");
        expect(versionOfCdnUrl("unpkg.com/@codemirror/view/dist/index.cjs")).toBe("");
    });

    test("esm.sh floats when it names a bare major", () =>
    {
        expect(versionOfCdnUrl("esm.sh/@codemirror/view@6")).toBe("6");
        expect(countUnpinnedCdnRefs("https://esm.sh/@codemirror/view@6")).toBe(1);
        expect(countUnpinnedCdnRefs("https://esm.sh/@codemirror/view@6.26.3")).toBe(0);
    });

    // cdnjs spells the version as a path segment and uses no at-sign at
    // all, so the at-sign parser the other three share returns nothing.
    test("cdnjs puts the version in its own path segment", () =>
    {
        const u = "cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";
        expect(versionOfCdnUrl(u)).toBe("6.5.0");
        expect(countUnpinnedCdnRefs(`https://${u}`)).toBe(0);
        expect(countUnpinnedCdnRefs("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/css/all.min.css"))
            .toBe(1);
    });

    test("the jsdelivr cases the widening had to leave alone", () =>
    {
        expect(countUnpinnedCdnRefs("https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js")).toBe(0);
        expect(countUnpinnedCdnRefs("https://cdn.jsdelivr.net/npm/marked/marked.min.js")).toBe(1);
    });
});

/**
 * DEBT-SEC-5, the correctness ceiling. A tag pointing at a build the
 * manifest records must carry that manifest's hash AND `crossorigin`.
 *
 * The `crossorigin` half is not style. Without it the browser issues an
 * opaque request, cannot read the body in order to hash it, and skips the
 * integrity check instead of failing it. A hash with no `crossorigin` is
 * the most convincing way to have no protection at all, which is why it
 * is a failure here rather than a warning.
 */
describe("countTagsMissingSri", () =>
{
    // Real CDN URLs, because the check matches tags on a CDN host first.
    // A fixture on no host is filtered out before the hash is ever read,
    // which is how the first draft of these cases passed while asserting
    // the opposite of what they meant.
    const URL = "https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js";
    const HASH = "sha384-H+hy9ULve6xfxRkWIh/YOtvDdpXgV2fmAGQkIDTxIgZwNoaoBal14Di2YTMR6MzR";
    const byUrl = { [URL]: HASH };
    const good = `<script src="${URL}" integrity="${HASH}" crossorigin="anonymous"></script>`;

    test("a correctly hashed tag costs nothing", () =>
    {
        expect(countTagsMissingSri(good, byUrl)).toBe(0);
    });

    test("a tag with no integrity is counted", () =>
    {
        expect(countTagsMissingSri(`<script src="${URL}"></script>`, byUrl)).toBe(1);
    });

    test("a tag carrying the WRONG hash is counted", () =>
    {
        const t = `<script src="${URL}" integrity="sha384-other" crossorigin="anonymous"></script>`;
        expect(countTagsMissingSri(t, byUrl)).toBe(1);
    });

    test("a hash with no crossorigin is counted", () =>
    {
        expect(countTagsMissingSri(`<script src="${URL}" integrity="${HASH}"></script>`, byUrl)).toBe(1);
    });

    test("a stylesheet link is held to the same rule", () =>
    {
        const css = "https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css";
        const u = { [css]: "sha384-css" };
        expect(countTagsMissingSri(`<link rel="stylesheet" href="${css}">`, u)).toBe(1);
        expect(countTagsMissingSri(
            `<link rel="stylesheet" href="${css}" integrity="sha384-css" crossorigin="anonymous">`,
            u)).toBe(0);
    });

    // The manifest covers seven builds. A tag for a library nobody has
    // decided about is not a correctness failure here, and the coverage
    // count below is the check that can see it.
    test("a tag for a library the manifest does not record is not counted here", () =>
    {
        const t = '<script src="https://unpkg.com/vditor@3.11.2/dist/index.min.js"></script>';
        expect(countTagsMissingSri(t, byUrl)).toBe(0);
    });
});

/**
 * DEBT-SEC-5, the coverage ceiling, and the only one of the three that can
 * see a library this repository has not decided about yet. It counts
 * third-party tags carrying no `integrity` at all, on any of the four
 * registries, whether or not the manifest knows them.
 */
describe("countThirdPartyTagsWithoutSri", () =>
{
    test("an unhashed tag on each registry is counted", () =>
    {
        const t = '<script src="https://cdn.jsdelivr.net/npm/a@1.0/a.js"></script>\n'
            + '<script src="https://unpkg.com/b@1.0/b.js"></script>\n'
            + '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/c/1.0/c.css">\n'
            + '<script type="module" src="https://esm.sh/d@1.0"></script>';
        expect(countThirdPartyTagsWithoutSri(t)).toBe(4);
    });

    test("a hashed tag costs nothing", () =>
    {
        expect(countThirdPartyTagsWithoutSri(
            `<script src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js" integrity="sha384-H+hy9ULve6xfxRkWIh/YOtvDdpXgV2fmAGQkIDTxIgZwNoaoBal14Di2YTMR6MzR" crossorigin="anonymous"></script>`)).toBe(0);
    });

    test("a tag served from this origin is not third-party", () =>
    {
        expect(countThirdPartyTagsWithoutSri('<script src="components/toolbar/toolbar.js"></script>')).toBe(0);
    });

    // A bare URL in a table or a sentence is not a tag. The coverage count
    // matches on tags, because a URL in prose is not something a browser
    // ever loads.
    test("a bare URL in prose is not a tag", () =>
    {
        expect(countThirdPartyTagsWithoutSri("See https://unpkg.com/vditor@3.11.2/dist/index.min.js here."))
            .toBe(0);
    });
});

describe("uncommentedImportants", () =>
{
    const KW = "!" + "important";

    test("a declaration with no case comment counts", () =>
    {
        expect(uncommentedImportants(`.a {\n  color: red ${KW};\n}`)).toBe(1);
    });

    test("a case comment in the same block clears it", () =>
    {
        expect(uncommentedImportants(
            `.a {\n  // important-case: 3 - reason\n  color: red ${KW};\n}`)).toBe(0);
    });

    test("one comment covers every declaration in its top-level block", () =>
    {
        expect(uncommentedImportants(
            `.a {\n  // important-case: 4 - reason\n  .b { color: red ${KW}; }\n` +
            `  .c { color: blue ${KW}; }\n}`)).toBe(0);
    });

    // THE ALLMAN TRAP. A scanner that reads depth on the selector's line
    // sees this block close immediately and reports zero. That exact bug
    // counted 8 reduced-motion overrides where there are 11.
    test("an Allman brace does not hide the block", () =>
    {
        expect(uncommentedImportants(
            `@media (prefers-reduced-motion: reduce)\n{\n` +
            `    // important-case: 2 - reason\n    .a { transition: none ${KW}; }\n}`)).toBe(0);
    });

    test("a comment does not leak into the next top-level block", () =>
    {
        expect(uncommentedImportants(
            `.a {\n  // important-case: 2 - reason\n  color: red ${KW};\n}\n` +
            `.b {\n  color: blue ${KW};\n}`)).toBe(1);
    });

    // guidedtour.scss explains the keyword in prose above the declaration.
    // That line is a comment, not a declaration, and must not be counted.
    test("the word inside a comment is not a declaration", () =>
    {
        expect(uncommentedImportants(`.a {\n  // needs ${KW} here\n  color: red;\n}`)).toBe(0);
    });

    test("a case number outside 1-5 does not clear it", () =>
    {
        expect(uncommentedImportants(
            `.a {\n  // important-case: 9 - invented\n  color: red ${KW};\n}`)).toBe(1);
    });
});

describe("cdnTagsIn excludes connection hints", () =>
{
    const HOST = "https://cdn.jsdelivr.net/npm/thing@1/x.js";

    // A preconnect opens a socket and fetches nothing, so there is no body
    // to hash. Seven of DEBT-SEC-8's seventeen were these, and no edit
    // could clear one without deleting a performance hint.
    test("a preconnect is not a subresource tag", () =>
    {
        expect(cdnTagsIn('<link rel="preconnect" href="https://cdn.jsdelivr.net">')).toHaveLength(0);
    });

    test("a dns-prefetch is not a subresource tag", () =>
    {
        expect(cdnTagsIn('<link rel="dns-prefetch" href="https://unpkg.com">')).toHaveLength(0);
    });

    test("a stylesheet from the same host still counts", () =>
    {
        expect(cdnTagsIn(`<link rel="stylesheet" href="${HOST}">`)).toHaveLength(1);
    });

    // preload and modulepreload DO fetch and DO accept integrity, so
    // excluding them would hide real findings.
    test("a modulepreload without integrity still counts", () =>
    {
        expect(countThirdPartyTagsWithoutSri(
            `<link rel="modulepreload" href="${HOST}">`)).toBe(1);
    });

    test("a preload without integrity still counts", () =>
    {
        expect(countThirdPartyTagsWithoutSri(
            `<link rel="preload" as="script" href="${HOST}">`)).toBe(1);
    });

    test("a script tag is unaffected by the rel filter", () =>
    {
        expect(countThirdPartyTagsWithoutSri(`<script src="${HOST}"></script>`)).toBe(1);
    });

    test("a preconnect contributes no missing-integrity finding", () =>
    {
        expect(countThirdPartyTagsWithoutSri(
            '<link rel="preconnect" href="https://esm.sh">')).toBe(0);
    });
});

describe("countCdnModuleSpecifiers", () =>
{
    test("a dynamic import from a CDN counts", () =>
    {
        expect(countCdnModuleSpecifiers('await import("https://esm.sh/@codemirror/view@6");')).toBe(1);
    });

    test("a static import from a CDN counts", () =>
    {
        expect(countCdnModuleSpecifiers('import { EditorView } from "https://esm.sh/x@6";')).toBe(1);
    });

    // A relative or same-origin specifier is this repository's own code.
    test("a relative specifier does not count", () =>
    {
        expect(countCdnModuleSpecifiers('import { x } from "./local.js";')).toBe(0);
    });

    test("a same-origin absolute path does not count", () =>
    {
        expect(countCdnModuleSpecifiers('await import("/lib/vditor.js");')).toBe(0);
    });

    // `foo.import(...)` is a property call, not the import operator. Without
    // the leading-character guard this would count as a module load.
    test("a method named import does not count", () =>
    {
        expect(countCdnModuleSpecifiers('registry.import("https://esm.sh/x@6");')).toBe(0);
    });

    // A tag is counted by thirdPartyTagsWithoutSri, not here. Double
    // counting one load in two ceilings would make both meaningless.
    test("a script tag is not a module specifier", () =>
    {
        expect(countCdnModuleSpecifiers('<script src="https://esm.sh/x@6"></script>')).toBe(0);
    });
});

// ADR-219. A ceiling alone lets a count fall without the committed number
// following it, and the slack is then a free slot: a fixed component leaves
// BELOW_REQUIRED and a new under-declared one takes its place with every
// gate green. A floor at the same value makes each count exact, so a fall
// forces the pin down in the same change.
describe("ADR-219 migration counts are pinned exactly", () =>
{
    test.each(["unclassifiedOptions", "protocolPropsMissingJsdoc", "changeMismatches", "componentsBelowRequiredLevel",
        "componentsPendingClassification"])("%s is a ceiling and a floor at the same value", (key) =>
    {
        const ceilings = BASELINES as Record<string, number>;
        const floors = FLOORS as Record<string, number>;

        expect(typeof ceilings[key], `${key} has no BASELINES entry`).toBe("number");
        expect(floors[key], `${key} must also be a FLOORS entry equal to its baseline`).toBe(ceilings[key]);
    });
});
