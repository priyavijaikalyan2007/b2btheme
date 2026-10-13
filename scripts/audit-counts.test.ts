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
    countOccurrences,
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
    // holding 192 log calls "no-logging" and passes, which is a count that
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
