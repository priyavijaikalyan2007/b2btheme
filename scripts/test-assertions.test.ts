/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: DEBT-TEST-1. The instrument that finds tests which cannot fail.
 *
 * The counts live in scripts/audit-counts.mjs as two ceilings. What lives
 * here is everything the counts cannot check about themselves: that the
 * parser reaches every block, and that each rule in the predicate fires
 * for the reason it was written.
 *
 * EVERY CASE BELOW IS A BUG THIS PARSER ACTUALLY HAD. The first draft
 * counted braces without knowing about string literals, and
 * `createLatexEditor({ expression: "\\invalid{" })` took it off the end
 * of the file. It read only the first argument group, so all six
 * `test.each(CASES)(name, fn)` blocks were invisible. It matched
 * `MENTIONS.test(x)` as a declaration. None of that is hypothetical.
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
    testBlocks, assertionsIn, isVacuous, verdictFor, shapesOf,
} from "./test-assertions.mjs";

type Block = { name: string; body: string };

describe("the parser reaches a block whatever is inside it", () =>
{
    test("an unbalanced brace inside a string does not end the block", () =>
    {
        // The latexeditor case. Three real tests were lost to this.
        const src = 'test("t", () =>\n{\n    f("\\\\invalid{");\n    expect(1).toBe(1);\n});\n';
        const blocks = testBlocks(src) as Block[];

        expect(blocks).toHaveLength(1);
        expect(assertionsIn(blocks[0].body)).toHaveLength(1);
    });

    test("an unbalanced parenthesis inside a string does not end the block", () =>
    {
        // The audit-counts case: classifyWindowCast("any).createLogUtility").
        const src = 'test("t", () =>\n{\n    expect(g("any).create")).toBe("any");\n});\n';

        expect(testBlocks(src)).toHaveLength(1);
    });

    test("a brace inside a comment does not end the block", () =>
    {
        const src = 'test("t", () =>\n{\n    // a stray } in prose\n    expect(1).toBe(1);\n});\n';

        expect(testBlocks(src)).toHaveLength(1);
    });

    test("a template literal with an interpolation is walked, not skipped", () =>
    {
        const src = "test(\"t\", () =>\n{\n    const s = `a ${ { k: 1 }.k } b`;\n"
            + "    expect(s).toBe(\"a 1 b\");\n});\n";
        const blocks = testBlocks(src) as Block[];

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe("t");
    });

    test("the curried test.each form is read from its second group", () =>
    {
        // `test.each(CASES)(name, fn)`. Reading only the first group
        // finds the table and no name, and loses the block.
        const src = 'test.each(CASES)("case %s", (c) =>\n{\n    expect(c).toBe(1);\n});\n';
        const blocks = testBlocks(src) as Block[];

        expect(blocks).toHaveLength(1);
        expect(blocks[0].name).toBe("case %s");
    });

    test("a RegExp test call is not a declaration", () =>
    {
        expect(testBlocks('const ok = MENTIONS.test(value);\n')).toHaveLength(0);
    });

    test("every declaration in the repository parses", () =>
    {
        // The companion to the two ceilings, and the reason they can be
        // believed. ERR-1 held a ceiling of 0 over three quarters of its
        // population for a day, because nothing asserted the size of the
        // set. A block the parser drops is a block neither ceiling sees.
        //
        // Derived rather than written down. A hardcoded total is a floor
        // that drifts: it would also have to be edited every time anyone
        // adds a test, and the edit that silences it looks exactly like
        // the edit that keeps it honest.
        const files = execFileSync("git", ["ls-files", "*.test.ts"], { encoding: "utf8" })
            .split("\n").filter(Boolean);
        const short: string[] = [];

        for (const file of files)
        {
            const src = readFileSync(file, "utf8");
            const declared = (src.match(/^[ \t]*test(?:\.each)?[ \t]*\(/gm) ?? []).length;
            const parsed = (testBlocks(src) as Block[]).length;

            if (declared !== parsed) { short.push(`${file}: ${declared} declared, ${parsed} parsed`); }
        }

        expect(short, `the parser drops blocks:\n  ${short.join("\n  ")}`).toHaveLength(0);
        expect(files.length).toBeGreaterThan(150);
    });
});

describe("the predicate fires for the reason it was written", () =>
{
    test("toBeDefined on a factory handle cannot fail", () =>
    {
        // ERR-1 was 65 factories that returned a handle for a component
        // they had not mounted. This assertion passes for every one.
        expect(isVacuous("expect(handle).toBeDefined()")).toBe(true);
    });

    test("a bare not.toThrow asserts the absence of a crash", () =>
    {
        expect(isVacuous("expect(() => f()).not.toThrow()")).toBe(true);
    });

    test("typeof is NOT vacuous, because it fails for a missing value", () =>
    {
        // This was the other way round until 2026-10-18. The case that
        // put typeof in the list was getMathML returning "" and
        // passing `typeof === "string"`, which is a real defect and
        // the wrong gate for it: `typeof undefined` is "undefined", so
        // the assertion fails for a missing value. Too LOOSE for the
        // claim is a different fault from cannot fail, and mixing them
        // put 45 arguable members in the ceiling.
        expect(isVacuous('expect(typeof mathml).toBe("string")')).toBe(false);
        expect(isVacuous('expect(typeof h.render).toBe("function")')).toBe(false);
    });

    test("a matcher quoted inside a subject is not the assertion", () =>
    {
        // This instrument's own tests pass assertion text as data. The
        // outer call is a real .toBe(), and matching the patterns
        // against the whole line called two of them vacuous.
        expect(isVacuous('expect(isVacuous("expect(h).toBeDefined()")).toBe(true)')).toBe(false);
    });

    test("an existence matcher on a DOM query is a real check", () =>
    {
        // THE SUBJECT DECIDES, NOT THE MATCHER. This makes exactly the
        // claim `.not.toBeNull()` makes, and that is not counted either.
        expect(isVacuous('expect(root.querySelector(".le-preview")).toBeTruthy()')).toBe(false);
        expect(isVacuous('expect(document.getElementById("x")).toBeDefined()')).toBe(false);
    });

    test("toBe and toEqual are never vacuous", () =>
    {
        expect(isVacuous('expect(mode).toBe("source")')).toBe(false);
        expect(isVacuous("expect(items).toEqual([1, 2])")).toBe(false);
    });

    test("a block with no expect at all is its own verdict", () =>
    {
        const block = { name: "t", body: "    acc.expandAll();\n" };

        expect(verdictFor(block)).toBe("none");
    });

    test("one real assertion is enough to clear a block", () =>
    {
        // A ceiling on blocks, not on assertions. A test that checks the
        // handle exists AND that the mode is source has made a claim.
        const block = {
            name: "t",
            body: 'expect(h).toBeDefined();\nexpect(h.getMode()).toBe("source");\n',
        };

        expect(verdictFor(block)).toBe("asserts");
    });
});

describe("the shape split is an instrument, not a note", () =>
{
    // ADR-203. The first split was run from a scratch file and could not
    // be reproduced the next day, so the table it produced had to be
    // taken on trust. These cases pin the one decision that table rests
    // on: which bucket a block falls into when two rules both match.

    const row = (name: string, body: string, file: string) =>
        ({ file, name, body, verdict: "vacuous" as const });

    test("an existence matcher never reaches the not.toThrow buckets", () =>
    {
        const rows = [row(
            "createX_ReturnsHandle",
            "expect(h).toBeDefined();",
            "scripts/audit-counts.mjs")];

        expect(shapesOf(rows)).toMatchObject({ existence: 1, absentDependency: 0 });
    });

    test("idempotency wins over the file that withholds a global", () =>
    {
        // The ordering that matters. graphtoolbar.test.ts deleted
        // window.Toolbar in its teardown, and classifying by file alone
        // called every destroy_CalledTwice inside it an absent
        // dependency. The name is the fact, the file is the hypothesis.
        const rows = [row(
            "destroy_CalledTwice_DoesNotThrow",
            "expect(() => h.destroy()).not.toThrow();",
            "scripts/test-assertions.test.ts")];

        expect(shapesOf(rows)).toMatchObject({ idempotent: 1, absentDependency: 0 });
    });

    test("a name that states a change lands in its own bucket", () =>
    {
        const rows = [row(
            "setFilters_UpdatesFilterState",
            "expect(() => h.setFilters([])).not.toThrow();",
            "scripts/audit-counts.mjs")];

        expect(shapesOf(rows)).toMatchObject({ namesAChange: 1, absentDependency: 0 });
    });

    test("a block that asserts is in no bucket at all", () =>
    {
        const rows = [{
            file: "scripts/audit-counts.mjs",
            name: "t",
            body: 'expect(h.getMode()).toBe("source");',
            verdict: "asserts" as const,
        }];
        const shapes = shapesOf(rows);

        expect(Object.values(shapes).reduce((a, b) => a + b, 0)).toBe(0);
    });
});
