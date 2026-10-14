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

import { describe, expect, test } from "vitest";
import
{
    classifyConsoleLog,
    classifyLoggingPattern,
    classifyWindowCast,
    countAnyCasts,
    countOccurrences,
    countWindowAliases,
    insideStringLiteral,
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
