#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: TestAssertionCensus
 * 📜 PURPOSE: Find the test blocks that cannot fail. Two populations:
 *    those with no `expect()` at all, and those whose every assertion
 *    passes for any value that is not null. DEBT-TEST-1 / ADR-196.
 * 🔗 RELATES: [[FactoryCensus]], [[NoFallbackCode]], [[LiterateErrors]]
 * ⚡ FLOW: [*.test.ts] -> [testBlocks] -> [classify] -> [two ceilings]
 *
 * WHY THIS EXISTS
 * ---------------
 * Twice in one session the defect was in the suite rather than in the
 * code, and both times it was found by accident while fixing something
 * else. ERR-1 turned 65 quiet factories into throws and broke 25 tests:
 * 23 of them had written the forbidden behaviour into the contract and
 * had been passing on every run. FALLBACK-10 found five more asserting
 * a feature the component does not implement.
 *
 * A test that cannot fail is worse than no test. No test is an absence
 * somebody can count. A passing test is a claim, and the suite's green
 * is the evidence offered for it.
 *
 * WHAT COUNTS AS AN ASSERTION THAT CANNOT FAIL
 * ---------------------------------------------
 * Deliberately narrow, because a ceiling with arguable members stops
 * being believed. Four matchers:
 *
 *   .toBeDefined()     true of every value a factory can return short
 *                      of undefined. A toBeDefined on a factory's
 *                      return value cannot see a factory that built
 *                      nothing, and ERR-1 was 65 of those.
 *   .not.toThrow()     asserts the absence of a crash and nothing about
 *                      behaviour. It is also the literal negation of
 *                      the house rule: AGENTS.md says a factory given
 *                      no container must throw.
 *   .toBeTruthy()      the same reach as toBeDefined, one step wider.
 * `expect(typeof x)` WAS IN THIS LIST UNTIL 2026-10-18 AND DID NOT
 * BELONG. The case that put it there was
 * `expect(typeof mathml).toBe("string")` passing against the "" that
 * getMathML returns for a conversion nobody implemented. That is a
 * real defect and this is the wrong gate for it: `typeof undefined`
 * is "undefined", so the assertion FAILS for a missing value and does
 * not meet the definition above. It is too LOOSE for the claim its
 * test makes, which is a different fault from one that cannot fail,
 * and mixing the two put 45 arguable members in a ceiling whose whole
 * value is that nobody argues with it. Removing them is a correction,
 * not a relaxation: all 45 are still weak, and none of them is blind.
 *
 * WHAT IS DELIBERATELY NOT COUNTED. `.not.toBeNull()` on a queried
 * element is a real check: the query carries a selector, and the element
 * is there or it is not. `.toBeInstanceOf(HTMLElement)` on getElement()
 * is weak and not empty. Including them adds 215 members and every one
 * of them is an argument. A number nobody argues with gets acted on.
 *
 * THE SUBJECT DECIDES, NOT THE MATCHER. `expect(root.querySelector(".x"))
 * .toBeTruthy()` makes exactly the claim that `.not.toBeNull()` makes,
 * and excluding one while counting the other would be incoherent. An
 * existence matcher is exempt when its subject is a DOM query, because
 * then the selector is the assertion. Twelve blocks turn on this.
 *
 * WHY THE PARSER BALANCES BRACES
 * -------------------------------
 * The first draft matched a test block by indentation, `\n(\s*)test\(`
 * through to `\n\1});`, and that stops at the first closing brace in
 * the right column. A nested `describe` callback, a `.forEach` with a
 * body, or an assertion inside an event handler all end the block
 * early, and every `expect()` after that point is invisible. The parse
 * is cheap to do properly.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

/** Matchers that pass for any value that is not null or undefined. */
const MATCHERS = [
    /^\s*\.toBeDefined\s*\(\s*\)/,
    /^\s*\.not\s*\.\s*toThrow\s*\(/,
    /^\s*\.toBeTruthy\s*\(\s*\)/,
];

/** Existence matchers, whose claim depends on what they are given. */
const EXISTENCE = /\.toBeDefined\s*\(\s*\)|\.toBeTruthy\s*\(\s*\)/;

/** A subject that carries its own claim, because it names what to find. */
const QUERY = /querySelector(All)?\s*\(|getElementById\s*\(|getElementsBy\w+\s*\(|\.closest\s*\(/;

/**
 * True when this one assertion could not fail for a live component.
 *
 * Takes either the split form from `assertionsIn` or the whole text,
 * and splits the text itself when given one, so a caller can ask about
 * a single line without parsing it first.
 */
export function isVacuous(assertion)
{
    const a = typeof assertion === "string" ? (assertionsIn(assertion)[0] ?? null) : assertion;
    if (a === null) { return false; }

    if (EXISTENCE.test(a.matcher) && QUERY.test(a.subject)) { return false; }
    return MATCHERS.some((v) => v.test(a.matcher));
}

/**
 * The text between the balanced delimiters that start at `from`, with
 * string literals, template literals and comments skipped.
 *
 * Counting every brace is not good enough, and the suite says so. The
 * expression `createLatexEditor({ expression: "\\invalid{" })` holds an
 * unbalanced brace inside a string, and `classifyWindowCast("any).create")`
 * holds an unbalanced parenthesis. A naive scan runs off the end of the
 * block and loses it, which dropped eight real tests across two files.
 * Same class of bug as splitting a parameter list on every comma when
 * one of them sits inside `Omit<GaugeOptions, "shape">`.
 */
function balanced(src, from, open, close)
{
    let depth = 0;
    let i = from;

    while (i < src.length)
    {
        const ch = src[i];

        if (ch === "\\") { i += 2; continue; }

        if (ch === "/" && src[i + 1] === "/")
        {
            i = src.indexOf("\n", i);
            if (i < 0) { return null; }
            continue;
        }

        if (ch === "/" && src[i + 1] === "*")
        {
            i = src.indexOf("*/", i + 2);
            if (i < 0) { return null; }
            i += 2;
            continue;
        }

        if (ch === "\"" || ch === "\'" || ch === "`")
        {
            i = endOfString(src, i);
            if (i < 0) { return null; }
            continue;
        }

        if (ch === open) { depth += 1; }
        else if (ch === close)
        {
            depth -= 1;
            if (depth === 0) { return { text: src.slice(from + 1, i), end: i }; }
        }
        i += 1;
    }
    return null;
}

/**
 * The index just past the string literal that starts at `from`.
 *
 * A template literal can hold `${ ... }` with code inside it, including
 * another string, so the interpolation is walked rather than scanned
 * past. Everything else runs to its closing quote.
 */
function endOfString(src, from)
{
    const quote = src[from];
    let i = from + 1;

    while (i < src.length)
    {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === quote) { return i + 1; }

        if (quote === "`" && src[i] === "$" && src[i + 1] === "{")
        {
            const hole = balanced(src, i + 1, "{", "}");
            if (hole === null) { return -1; }
            i = hole.end + 1;
            continue;
        }
        i += 1;
    }
    return -1;
}

/** The [start, end) spans of `src` that are code, not string or comment. */
function codeRanges(src)
{
    const ranges = [];
    let start = 0;
    let i = 0;

    while (i < src.length)
    {
        const ch = src[i];

        if (ch === "/" && src[i + 1] === "/")
        {
            ranges.push([start, i]);
            i = src.indexOf("\n", i);
            if (i < 0) { return ranges; }
            start = i;
            continue;
        }

        if (ch === "/" && src[i + 1] === "*")
        {
            ranges.push([start, i]);
            i = src.indexOf("*/", i + 2);
            if (i < 0) { return ranges; }
            i += 2;
            start = i;
            continue;
        }

        if (ch === "\"" || ch === "'" || ch === "`")
        {
            ranges.push([start, i]);
            i = endOfString(src, i);
            if (i < 0) { return ranges; }
            start = i;
            continue;
        }
        i += 1;
    }
    ranges.push([start, src.length]);
    return ranges;
}

/** Every `test(...)` block in one source, with its name and its body. */
export function testBlocks(src)
{
    const blocks = [];

    // `(?<!\.)` because `MENTIONS.test(x)` is a RegExp call, not a block,
    // and 25 of them across 11 files made the parsed count look short.
    // The positions are filtered to code, because a fixture that holds
    // the text of a test block is data: this file's own test cases pass
    // `'test("t", () => { ... }'` as a string, and counting those made
    // it report 18 blocks where 14 are declared.
    const code = codeRanges(src);
    const inCode = (i) => code.some(([a, b]) => i >= a && i < b);

    for (const m of src.matchAll(/(?<!\.)\btest(?:\.each)?\s*\(/g))
    {
        if (!inCode(m.index)) { continue; }
        let args = balanced(src, m.index + m[0].length - 1, "(", ")");
        if (args === null) { continue; }

        // `test.each(CASES)(name, fn)` is curried, so the first group
        // holds the table and the second holds the block. Six of these
        // exist, and reading only the first group loses all six.
        const next = src.slice(args.end + 1).match(/^\s*\(/);
        if (next !== null)
        {
            args = balanced(src, args.end + next[0].length, "(", ")");
            if (args === null) { continue; }
        }

        const name = /^\s*["'`]([^"'`]*)/.exec(args.text);
        const arrow = args.text.indexOf("=>");
        const brace = arrow < 0 ? -1 : args.text.indexOf("{", arrow);
        if (name === null || brace < 0) { continue; }

        const body = balanced(args.text, brace, "{", "}");
        if (body === null) { continue; }

        blocks.push({ name: name[1], body: body.text });
    }
    return blocks;
}

/**
 * The `expect(...)` calls in a body, split into subject and matcher.
 *
 * SPLIT, BECAUSE A SUBJECT CAN CONTAIN THE TEXT OF A MATCHER. The case
 * that forced it is in this instrument's own tests:
 * `expect(isVacuous("expect(h).toBeDefined()")).toBe(true)` is a real
 * assertion whose subject quotes a vacuous one, and matching the
 * patterns against the whole line called it vacuous.
 */
export function assertionsIn(body)
{
    const found = [];
    const code = codeRanges(body);

    for (const m of body.matchAll(/\bexpect\s*\(/g))
    {
        if (!code.some(([a, b]) => m.index >= a && m.index < b)) { continue; }

        const args = balanced(body, m.index + m[0].length - 1, "(", ")");
        if (args === null) { continue; }

        // The matcher runs to the end of the statement, and a matcher
        // argument can itself hold a newline, so take the balanced tail
        // rather than the rest of the line.
        const matcher = body.slice(args.end + 1).split(/;\s*\n|\n\s*\n/)[0];
        found.push({ subject: args.text, matcher, text: `expect(${args.text})${matcher}` });
    }
    return found;
}

/** Classify one block: "none", "vacuous", or "asserts". */
export function verdictFor(block)
{
    const found = assertionsIn(block.body);
    if (found.length === 0) { return "none"; }
    return found.every(isVacuous) ? "vacuous" : "asserts";
}

/** Every test block in the repository, classified. */
export function census(files = null)
{
    const list = files ?? execFileSync("git", ["ls-files", "*.test.ts"], { encoding: "utf8" })
        .split("\n").filter(Boolean);
    const rows = [];

    for (const file of list)
    {
        for (const block of testBlocks(readFileSync(file, "utf8")))
        {
            rows.push({ file, name: block.name, verdict: verdictFor(block) });
        }
    }
    return rows;
}

function main()
{
    const rows = census();
    const none = rows.filter((r) => r.verdict === "none");
    const vacuous = rows.filter((r) => r.verdict === "vacuous");

    console.log(`  ${rows.length} test block(s) parsed`);
    console.log(`  ${none.length} with no expect() at all`);
    console.log(`  ${vacuous.length} where every assertion cannot fail`);

    if (process.argv.includes("--list"))
    {
        for (const r of [...none, ...vacuous])
        {
            console.log(`    ${r.verdict.padEnd(8)} ${r.file} :: ${r.name}`);
        }
    }
    return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    process.exit(main());
}
