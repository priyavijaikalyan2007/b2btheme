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
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

// The globals a component publishes are already extracted, by the function
// check [19] grades the published reference with. A third reader of the same
// `window.x =` forms would be a third thing to keep correct (DEBT-DOC-1).
const { extractGlobals } = createRequire(import.meta.url)("./generate-docs.js");

/** Matchers that pass for any value that is not null or undefined. */
const MATCHERS = [
    /^\s*\.toBeDefined\s*\(\s*\)/,
    /^\s*\.not\s*\.\s*toThrow\s*\(/,
    /^\s*\.toBeTruthy\s*\(\s*\)/,
];

/** The one matcher that can see the null a lookup returns. */
const TRUTHY = /^\s*\.toBeTruthy\s*\(\s*\)/;

/**
 * A subject that carries its own claim, because it names what to find.
 *
 * EVERY MEMBER RETURNS NULL WHEN THE THING IS NOT THERE, AND THAT IS
 * THE WHOLE QUALIFICATION. The selector or the attribute name is the
 * assertion, so `expect(root.querySelector(".le-preview"))
 * .toBeTruthy()` is a real check and `.not.toBeNull()` on the same
 * subject is the same claim written differently.
 *
 * `querySelectorAll` AND `getElementsBy*` ARE DELIBERATELY ABSENT,
 * AND `querySelectorAll` WAS IN THIS PATTERN UNTIL 2026-10-21. They
 * return an empty NodeList or HTMLCollection rather than null, so
 * neither existence matcher can fail against them however wrong the
 * selector is. Exempting them would have hidden exactly the blocks
 * that claim a filter ran and then ask only whether the collection
 * exists — `symbolpicker :: Search_TypeQuery_FiltersGridItems` and
 * `cronpicker :: Options_CustomPresets_UsesProvidedPresets` are both
 * that shape. No block relied on the wider form the day it narrowed.
 */
const LOOKUP = /\bquerySelector\s*\(|\bgetElementById\s*\(|\.closest\s*\(|\.getAttribute\s*\(/;

/** A subject that is one name and nothing else. */
const BARE = /^[A-Za-z_$][\w$]*$/;

/**
 * The right-hand side of `const <name> = ...` in this body, or null.
 *
 * ONE HOP, NOT A RESOLVER. The point is to read the subject the
 * author wrote rather than the one they bound, and a second hop
 * would need scope rules this parser does not have. A name declared
 * twice in one block returns the first, which is the reading a
 * human gives it too.
 */
function boundTo(name, body)
{
    const at = new RegExp("\\bconst\\s+" + name + "\\s*(?::[^=\\n]+)?=").exec(body ?? "");
    if (at === null) { return null; }

    return body.slice(at.index + at[0].length).split(/;\s*\n|\n\s*\n/)[0];
}

/**
 * True when this one assertion could not fail for a live component.
 *
 * Takes either the split form from `assertionsIn` or the whole text,
 * and splits the text itself when given one, so a caller can ask about
 * a single line without parsing it first. `body` is optional and is
 * used only to resolve a bare subject to what it was bound to.
 *
 * (CRITICAL) TWO RULES HERE WERE WRONG UNTIL 2026-10-21 AND BOTH WERE
 * THE SAME MISTAKE: THE TEXT WAS READ WHERE THE VALUE WAS MEANT.
 *
 * The comment above the old pattern said THE SUBJECT DECIDES, and
 * then the code decided on the subject's SPELLING. `expect(root
 * .querySelector(".le-preview")).toBeTruthy()` was exempt while
 * `const preview = root.querySelector(".le-preview");
 * expect(preview).toBeTruthy();` was counted, though the two make
 * the identical claim. Fifteen blocks in `latexeditor` alone were
 * in the ceiling because their author used a local variable. ADR-203
 * states the rule this broke: the name is the fact and the structure
 * is the hypothesis.
 *
 * The second: a lookup was exempt under EITHER existence matcher.
 * `querySelector` returns null, and `expect(null).toBeDefined()`
 * PASSES — so the exemption let through an assertion that cannot
 * fail, which is the one thing this function exists to catch. The
 * count was too LOW, by `formdialog :: withDefaultSize_UsesMdSize`,
 * and the suite had pinned the wrong answer since the rule was
 * written.
 */
export function isVacuous(assertion, body = null)
{
    const a = typeof assertion === "string" ? (assertionsIn(assertion)[0] ?? null) : assertion;
    if (a === null) { return false; }

    const subject = a.subject.trim();
    const resolved = BARE.test(subject) ? (boundTo(subject, body) ?? subject) : subject;

    if (TRUTHY.test(a.matcher) && LOOKUP.test(resolved)) { return false; }
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

        // READ TO THE MATCHING QUOTE, NOT TO THE NEXT ONE. The first
        // form was /^\s*["'`]([^"'`]*)/, which stopped at whichever
        // quote came first — so `test("loadStencilPack('ui-components')
        // registers shapes")` was named `loadStencilPack(`. Forty
        // names were truncated this way, and the classifier reads
        // names: IDEMPOTENT and ROBUSTNESS_ONLY were matching against
        // partial titles.
        const name = /^\s*("[^"]*"|'[^']*'|`[^`]*`)/.exec(args.text);
        const arrow = args.text.indexOf("=>");
        const brace = arrow < 0 ? -1 : args.text.indexOf("{", arrow);
        if (name === null || brace < 0) { continue; }

        const body = balanced(args.text, brace, "{", "}");
        if (body === null) { continue; }

        blocks.push({ name: name[1].slice(1, -1), body: body.text, at: m.index });
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

    // NOT `found.every(isVacuous)`. `every` passes the index as the
    // second argument, and the second argument is now the body.
    return found.every((a) => isVacuous(a, block.body)) ? "vacuous" : "asserts";
}

/** Every test block in the repository, classified. */
/**
 * The `describe` scopes in a file that also assert a REFUSAL.
 *
 * WHY THIS EXISTS. `.not.toThrow()` is the correct shape for one
 * claim: that the accepted case is accepted, stated beside a sibling
 * proving the rejected case is rejected. `wiring.test.ts` has the
 * canonical pair — "throws when a binding names an unregistered
 * transform" sits directly above "accepts a binding naming a
 * registered transform", and the second is a POSITIVE CONTROL, not a
 * weak test.
 *
 * The census already recognised that category and detected it by
 * PROXY: a file that withholds a global. The proxy found the six in
 * `*.nofallback.test.ts` and missed every pair written in an ordinary
 * suite. This reads the thing itself (ADR-215).
 *
 * SCOPED TO THE DESCRIBE AND TO THE SUBJECT, AND THE SECOND HALF WAS
 * ADDED AFTER THE FIRST DRAFT OVER-CLAIMED. Scoping to the describe
 * alone pulled in `diagramengine-core :: resize does not throw`,
 * because the "Factory & Lifecycle" block it sits in also refuses a
 * bad container — a refusal about `createDiagramEngine`, not about
 * `resize`. That is the per-file withholding mistake (ADR-203)
 * repeated one level finer, so the callee has to match too: a pair is
 * `expect(() => f(...)).toThrow()` beside `expect(() => f(...))
 * .not.toThrow()`, same `f`.
 *
 * @param src - A test file's source.
 * @returns Ranges of describe bodies, each with the callees it refuses.
 */
export function refusalScopes(src)
{
    const scopes = [];
    const code = codeRanges(src);
    const inCode = (i) => code.some(([a, b]) => i >= a && i < b);

    for (const m of src.matchAll(/(?<!\.)\bdescribe\s*\(/g))
    {
        if (!inCode(m.index)) { continue; }

        const args = balanced(src, m.index + m[0].length - 1, "(", ")");

        if (args === null) { continue; }

        const refused = new Set();

        for (const a of assertionsIn(args.text))
        {
            if (!/(?<!\.not)\s*\.\s*toThrow/.test(a.matcher)) { continue; }

            for (const name of calleesIn(a.subject)) { refused.add(name); }
        }

        if (refused.size > 0) { scopes.push({ start: m.index, end: args.end, refused }); }
    }
    return scopes;
}

/**
 * The function names called inside an `expect(() => ...)` subject.
 *
 * Only the CALLEE, so `engineFor(doc)` and `engineFor(other)` pair.
 * A method call keeps its receiver — `engine.resize` rather than
 * `resize` — because two components in one suite can both have a
 * `destroy`, and the receiver is what tells them apart.
 *
 * @param subject - The text inside `expect(...)`.
 * @returns Callee names, possibly empty.
 */
export function calleesIn(subject)
{
    return [...subject.matchAll(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\(/g)]
        .map((m) => m[1]);
}

/**
 * An opening that runs its body only when something is true.
 *
 * `else` is here because `} else` reopens a body on the same line,
 * and a dead `else` is as invisible as a dead `if`.
 */
const GUARD = /\b(?:if|for|while)\s*\(|\}\s*else\b|\.(?:forEach|map|filter|some|every|find)\s*\(/g;

/** A `for ... of` whose collection is written out in the test. */
const LITERAL_LOOP = /\bof\s*\[/;

/**
 * Assertion sites inside a test block that run only when a condition
 * holds, as `{ file, name, at }` per block that has any, where `at`
 * holds the offset of each guarded body within the block.
 *
 * WHY THIS IS A CEILING AND NOT A VERDICT. Whether a guard ever opens
 * cannot be read off the text — it depends on what the component
 * renders. The only way to know is to put a must-fail assertion
 * inside each body and run the suite, and a block whose guards never
 * open stays green. That sweep found two on 2026-10-21, out of
 * 72 sites in 70 blocks: `applauncher :: OnSelect_FiresCallback`
 * queried a class the component has never written, so its ONLY
 * assertion never ran, and `spinemap :: multipleXssVectors_
 * SafeRendering` looped over `[href]` elements that do not exist.
 *
 * NEITHER CEILING COULD SEE EITHER OF THEM, WHICH IS WHY THIS ONE
 * EXISTS. `testsWithoutAssertion` counts the text `expect(` and both
 * blocks had one. `testsThatCannotFail` read the matcher —
 * `toHaveBeenCalled()`, `not.toContain()` — and called both honest.
 * An assertion that cannot fail and an assertion that never runs are
 * different faults with the same symptom, and only the first had a
 * number.
 *
 * So this counts the POPULATION the sweep has to cover. It cannot
 * grow in silence, which is exactly how the AppLauncher block
 * survived: a guard written round a selector is cheap to add and
 * costs nothing to leave wrong. ADR-216.
 *
 * `test(` inside the body excludes a loop that GENERATES blocks.
 * `EXTRACTION_CASES.forEach(... test(...))` is a table, and probing
 * it took a whole suite down at collection.
 *
 * A LOOP OVER AN ARRAY LITERAL IS NOT A GUARD. `for (const m of
 * ["destroy", "getValue"])` runs twice and the reader can see that
 * it does, so there is nothing for a probe to discover. Only a
 * collection the COMPONENT produced can come back empty, and that
 * is the whole risk this counts.
 */
export function guardedAssertions(rows)
{
    const out = [];

    for (const row of rows)
    {
        const code = codeRanges(row.body);

        // OFFSETS, NOT A TALLY. The sweep that decides whether a
        // guard ever opens has to insert a probe at each of these,
        // and a second reader of the same forms would be a second
        // thing to keep correct (DEBT-DOC-1). The ceiling takes the
        // length.
        const at = [];

        for (const m of row.body.matchAll(GUARD))
        {
            if (!code.some(([a, b]) => m.index >= a && m.index < b)) { continue; }

            // THE BODY BRACE IS NOT THE NEXT BRACE. `for (const f of
            // check({ destroyLeavesDom: true }))` opens an object
            // literal first, and taking that one read the argument
            // instead of the loop. A callback is the other way round:
            // `buttons.forEach(btn => { ... })` keeps its body INSIDE
            // the parentheses, after the arrow.
            const paren = m[0].endsWith("(")
                ? balanced(row.body, m.index + m[0].length - 1, "(", ")")
                : null;
            const from = paren === null
                ? m.index + m[0].length
                : (/=>/.test(paren.text)
                    ? m.index + m[0].length - 1 + paren.text.indexOf("=>")
                    : paren.end);

            const open = row.body.indexOf("{", from);
            if (open < 0) { continue; }

            const body = balanced(row.body, open, "{", "}");
            if (body === null) { continue; }
            if (!/\bexpect\s*\(/.test(body.text)) { continue; }
            if (/(?<!\.)\btest\s*\(/.test(body.text)) { continue; }
            if (paren !== null && LITERAL_LOOP.test(paren.text)) { continue; }

            at.push(open);
        }
        if (at.length > 0) { out.push({ file: row.file, name: row.name, at }); }
    }
    return out;
}

export function census(files = null)
{
    const list = files ?? execFileSync("git", ["ls-files", "*.test.ts"], { encoding: "utf8" })
        .split("\n").filter(Boolean);
    const rows = [];

    for (const file of list)
    {
        const src = readFileSync(file, "utf8");
        const scopes = refusalScopes(src);

        for (const block of testBlocks(src))
        {
            rows.push({
                file,
                name: block.name,
                body: block.body,
                // `at` is the block's offset in the file, and it is on
                // the row because `absentDependency` is a PER-BLOCK
                // question. Leaving it off made every key read
                // `file::undefined`, which silently restored the
                // file-level rule it was added to replace.
                at: block.at,
                verdict: verdictFor(block),
                pairedWithRefusal: scopes.some(
                    (s) => block.at >= s.start && block.at < s.end
                        && assertionsIn(block.body).some(
                            (a) => /\.not\s*\.\s*toThrow/.test(a.matcher)
                                && calleesIn(a.subject).some((c) => s.refused.has(c)))),
            });
        }
    }
    return rows;
}

/**
 * The shapes a vacuous block takes, as a count per shape.
 *
 * THE FIRST VERSION OF THIS SPLIT WAS NOT COMMITTED, AND THE TABLE IT
 * PRODUCED COULD NOT BE REPRODUCED A DAY LATER. A classification that
 * steers the next piece of work is an instrument, not a note, so it
 * lives here beside the census it partitions. ADR-203.
 *
 * ABSENT is the FALLBACK shape: the block runs with a dependency
 * withheld and asserts only that nothing crashed. IDEMPOTENT is a
 * second call to the same method OR a call that reaches an early
 * return — `destroy_CalledTwice`, `removeNonexistentPin`,
 * `setLayout_UnknownId` — because both answer "nothing should
 * happen" and the right assertion for both is that nothing did.
 * ROBUSTNESS-ONLY is a title that promises nothing but survival —
 * `importInvalidJSON_DoesNotCrash` — where the body matches the
 * title and the question is whether the claim is worth more.
 * NAMES-A-CHANGE is the rest of the `.not.toThrow()` family, where
 * the title states an effect the body never looks for. EXISTENCE is
 * `.toBeDefined()` and `.toBeTruthy()`.
 *
 * (CRITICAL) ROBUSTNESS-ONLY WAS SPLIT OUT ON 2026-10-20 (ADR-215),
 * AND THIS PARAGRAPH IS WHY. It already described NAMES-A-CHANGE as
 * "the title states an effect the body never looks for" — and the
 * code below never read a title. The bucket was the fall-through,
 * so every `.not.toThrow()` block that was neither idempotent nor
 * dependency-withheld landed in it whatever its name said. **21 of
 * its 35 members had titles stating no effect at all**, which is
 * this repository's recurring defect: a count named for one
 * population while measuring another. The comment documented a rule
 * nobody had written.
 */
const WITHHELD = /delete\s*\(?\s*\(?\s*(window|globalThis|global)\b|(window|globalThis|global)[^\n;]{0,40}=\s*(undefined|null)\b/;
/**
 * A title naming a REPEATED or TERMINAL call, where the property is
 * that the second one does nothing the first already did.
 *
 * (CRITICAL) THIS USED TO CARRY `nonexistent`, `unknown` AND `empty`,
 * AND NONE OF THE THREE IS IDEMPOTENCE. Working the bucket on
 * 2026-10-21 split 107 blocks into four properties wearing one name,
 * and only the repeated-call half is what the word means. An
 * operation naming an absent target is ADR-200's question — is the
 * caller owed the effect or an error — and it is answered per method:
 * a `remove` is owed nothing, because the state it asked for already
 * holds, and a `navigateTo` is owed an error. An EMPTY input is
 * neither; it is a boundary value, and a title promising only that
 * the component survived one belongs in ROBUSTNESS-ONLY, where the
 * open question is whether survival is enough.
 *
 * Filing all three here meant the bucket's number could not be read
 * as the size of any one piece of work, and the label named the
 * smallest of the four. This is ADR-215's fault at the level of the
 * vocabulary rather than the code: the word was wrong, not the rule.
 */
const IDEMPOTENT_SITUATION =
    /twice|calledtwice|again|idempotent|whennot|afterdestroy/i;

/**
 * A title that states the outcome IS nothing.
 *
 * (CRITICAL) IDEMPOTENT NEEDS BOTH HALVES, AND IT USED TO NEED ONLY
 * THE FIRST. The situation words above are matched anywhere in a
 * title, so `unknown stencil pack logs warning` was filed as
 * idempotent on the strength of "unknown" while its title named an
 * EFFECT the body never looked for, and
 * `emptyOptions_CreatesValidEditor` on the strength of "empty".
 * IDEMPOTENT is tested first in `shapeOf`, so neither was ever
 * asked the title question.
 *
 * That is ADR-215's defect in the one bucket ADR-215 did not
 * reach, and the rule it settled applies unchanged: the name is
 * the fact. A title that names a situation AND an effect is
 * claiming the effect.
 */
const NO_EFFECT =
    /does\s*n[o']?t\s*(throw|crash)|doesnotthrow|doesnotcrash|donotthrow|no\s*throw|nothrow|noexception|noerror|without\s*(a\s*)?(crash|throw|error)|handledgracefully|_noop\b|\bno\s*op\b|idempotent|\bharmless\b|\bignore[sd]?\b|does\s*nothing|\bunchanged\b|\bsafely\b|\bsilently\b/i;

/**
 * A title that promises only that nothing blew up.
 *
 * Deliberately matched against the CLAIM rather than the subject.
 * `SetSizes_ValidPercentages_DoesNotThrow` names a method and then
 * states what it expects of it, and what it expects is survival — so
 * the block is doing exactly what it says, and the open question is
 * whether survival is enough. That is a different question from the
 * one NAMES-A-CHANGE asks, which is why the two are no longer one
 * number.
 */
// `nothrow`, `nocrash` and `donot(throw|crash)` are here because
// NO_EFFECT already had them and this one did not, and the two are
// supposed to recognise the same phrase. `emptyData_NoThrow` fell
// through to NAMES-A-CHANGE on the strength of that gap — a title
// promising survival, filed in the bucket for titles promising an
// effect, by two regexes disagreeing about one word.
/**
 * A title whose whole claim is that the call was ACCEPTED.
 *
 * The accept half of an accept/refuse pair says the input is valid and
 * promises nothing about the result, which is exactly what makes it a
 * control. A title promising a result is making a second claim, and
 * the pairing says nothing about whether the body checks it.
 */
const ACCEPTS =
    /\baccepts?\b|\ballow(s|ed)?\b|\bis\s*fine\b|\bisfine\b|\bsucceeds?\b|\bvalid\b|\bworks\b/i;

const ROBUSTNESS_ONLY =
    /does\s*n[o']?t\s*(throw|crash)|doesnotthrow|doesnotcrash|donot(throw|crash)|no\s*throw|nothrow|nocrash|noexception|noerror|without\s*(a\s*)?(crash|throw|error)|handledgracefully|_noop\b|\bno\s*op\b/i;

/** The set of files that withhold a global somewhere in their text. */
/**
 * Every `beforeEach` / `beforeAll` body in `src` that withholds a
 * global, as `[start, end]` spans of the SUITE each one runs for.
 *
 * (CRITICAL) THE DELETE HAS TO RUN BEFORE THE BLOCK, AND THIS USED TO
 * READ THE WHOLE FILE. `WITHHELD.test(readFileSync(...))` matched the
 * text anywhere, so a file that installs a mock in `beforeEach` and
 * removes it in `afterEach` — the ordinary lifecycle, and 22 of the 24
 * matching files do it — had every `.not.toThrow()` block in it filed
 * as "the dependency was absent". All six members of the bucket on
 * 2026-10-21 ran with the dependency INSTALLED, and four of them had
 * titles stating a change that nothing checked.
 *
 * ADR-203 names this exactly, and ADR-215 already fixed one instance
 * of it in this same classifier: the file is the hypothesis and the
 * block is the fact. A delete in an `afterEach` is cleanup and
 * withholds nothing.
 *
 * @param src - The test file's source.
 * @returns Spans of the file in which a global is withheld.
 */
function withholdingSpans(src)
{
    const spans = [];

    for (const m of src.matchAll(/\b(beforeEach|beforeAll)\s*\(/g))
    {
        const args = balanced(src, m.index + m[0].length - 1, "(", ")");
        if (args === null || !WITHHELD.test(args.text)) { continue; }

        // The hook runs for its enclosing `describe`, or for the file
        // when it is top level. Walk out to the nearest describe whose
        // body contains the hook.
        let span = [0, src.length];

        for (const d of src.matchAll(/\bdescribe\s*\(/g))
        {
            const body = balanced(src, d.index + d[0].length - 1, "(", ")");
            if (body === null) { continue; }
            if (d.index < m.index && m.index < body.end
                && d.index > span[0]) { span = [d.index, body.end]; }
        }
        spans.push(span);
    }
    return spans;
}

/** The blocks a withheld dependency can excuse, keyed `file::offset`. */
function withheldBlocks(rows)
{
    const withheld = new Set();
    const spansByFile = new Map();

    for (const r of rows)
    {
        if (!spansByFile.has(r.file))
        {
            spansByFile.set(
                r.file, withholdingSpans(readFileSync(r.file, "utf8")));
        }

        // A delete inside the block's OWN body counts too.
        const own = WITHHELD.test(r.body);
        const inHook = spansByFile.get(r.file)
            .some(([a, b]) => r.at >= a && r.at < b);

        if (own || inHook) { withheld.add(`${r.file}::${r.at}`); }
    }
    return withheld;
}

/**
 * The shape of ONE vacuous block, or null when it is not vacuous.
 *
 * ONE CLASSIFIER, TWO CONSUMERS. The tally and the listing used to be
 * the same loop, so asking WHICH blocks are in a bucket meant writing a
 * second rule that agreed with the first by inspection. ADR-203 is the
 * record of what that costs: the bucket of nine it named had to be
 * rediscovered by guesswork, and the guesses returned 123 and 1.
 */
export function shapeOf(row, withheld)
{
    if (row.verdict !== "vacuous") { return null; }
    if (!/\.not\s*\.\s*toThrow/.test(row.body)) { return "existence"; }

    // `_` IS A WORD CHARACTER, SO `\b` DOES NOT FIRE AFTER ONE.
    // `addFiles_AfterDestroy_Ignored` failed `\bignored\b` for that
    // reason alone and fell through to namesAChange, which is the
    // kind of accident a rule that reads names has to be proof
    // against. Underscores read as separators here, the way a human
    // reads them, and every name test below uses this form.
    const title = row.name.replace(/_/g, " ");

    // IDEMPOTENCY IS TESTED FIRST, AND THE ORDER IS THE WHOLE
    // CLASSIFIER. Withholding is detected per FILE, because a suite
    // states the absence once in its setup, and a file that deletes
    // a global in teardown would otherwise claim every destroy_
    // CalledTwice block inside it. ADR-203.
    //
    // IT NEEDS BOTH HALVES OF THE TITLE. See NO_EFFECT above: the
    // situation alone claimed `unknown stencil pack logs warning`
    // on the strength of "unknown".
    if (IDEMPOTENT_SITUATION.test(title) && NO_EFFECT.test(title))
    {
        return "idempotent";
    }

    // ABSENT stays ahead of ROBUSTNESS-ONLY although both are beaten
    // by IDEMPOTENT, and the reason is not the name-versus-file rule
    // above. It is that "this file withholds a dependency" SUBSUMES
    // "the title claims only survival" and tells the reader more: it
    // says why the block exists at all. A row that matched both and
    // was filed under robustness would lose that.
    if (withheld.has(`${row.file}::${row.at}`)) { return "absentDependency"; }

    // ROBUSTNESS-ONLY OUTRANKS THE PAIR, and the case that settled it
    // is `treegrid :: deeplyNestedNodes_RendersWithoutCrash`. It
    // shares a callee with `missingContainer_Throws`, so the pairing
    // rule claimed it — but the two refuse and accept on DIFFERENT
    // dimensions, one a missing container and the other node depth,
    // and the block's own title claims survival. A real positive
    // control says it accepts: "accepts a binding naming a registered
    // transform" sits under "throws when a binding names an
    // unregistered transform". The name is the fact and the pairing is
    // the hypothesis, which is the rule idempotency already follows.
    if (ROBUSTNESS_ONLY.test(title)) { return "robustnessOnly"; }

    // THE PAIRING IS NOT ENOUGH ON ITS OWN, AND THIS IS THE SECOND
    // TIME. ADR-215 made a SURVIVAL title outrank the pairing because
    // `treegrid :: deeplyNestedNodes_RendersWithoutCrash` paired
    // correctly on `createTreeGrid` and still was not a control. A
    // title stating an EFFECT has the same claim on the same grounds:
    // `timeline :: spanWithoutEnd_TreatedAsPoint` sits beside a
    // refusal of `createTimeline`, and nothing in it checks that the
    // span rendered as a point. A control's title says the call is
    // ACCEPTED; it does not promise a particular result.
    if (row.pairedWithRefusal === true && ACCEPTS.test(title))
    {
        return "positiveControl";
    }

    return "namesAChange";
}

/** Every vacuous block, tagged with the shape it falls into. */
export function shapeRows(rows)
{
    const withheld = withheldBlocks(rows);

    return rows
        .map((r) => ({ ...r, shape: shapeOf(r, withheld) }))
        .filter((r) => r.shape !== null);
}

export function shapesOf(rows)
{
    const tally = {
        absentDependency: 0,
        idempotent: 0,
        robustnessOnly: 0,
        positiveControl: 0,
        namesAChange: 0,
        existence: 0,
    };

    for (const r of shapeRows(rows)) { tally[r.shape]++; }
    return tally;
}

/**
 * Every sibling component a test suite stands in for rather than mounts.
 *
 * WHY THIS IS A SEPARATE QUESTION FROM THE CENSUS ABOVE. A block can
 * carry a real assertion on a real value and still prove nothing,
 * because the thing it asserted against was written by the suite. The
 * GraphToolbar suite asserted on the items it handed its own fake
 * Toolbar, and the Toolbar defect those items were meant to exercise
 * had been live for the life of the component. ADR-203 states the
 * rule: a suite that has never mounted its real dependency has never
 * been tested.
 *
 * WHAT COUNTS. A test file writes a global that another component in
 * this repository owns, and does not import that component. Ownership
 * comes from `extractGlobals`, so the reader here is the same one the
 * published reference uses. The import check is textual on the sibling
 * path, because a side-effect import is how a component registers.
 *
 * WHAT IS DELIBERATELY NOT FLAGGED. A stub for a THIRD-PARTY bundle,
 * such as Bootstrap or `marked`, owns no source in this repository and
 * never appears. A suite that already imports the owner is a positive
 * control: it writes the global to make the factory throw, or to count
 * calls, with the real component present underneath.
 *
 * WHAT THIS DOES NOT DECIDE. Several rows are correct as they stand,
 * because the claim under test is that the host refuses when the
 * factory is absent or throws. The instrument enumerates, and the
 * triage lives in DEBT-TEST-1c beside the list.
 */
export function standInsOf(testFiles = null, sourceFiles = null)
{
    const dirOf = (file) => file.split("/").slice(-2, -1)[0];

    const sources = sourceFiles ?? execFileSync("git", ["ls-files", "components/*/*.ts"], { encoding: "utf8" })
        .split("\n").filter(Boolean)
        .filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".d.ts") && !f.includes(".mock."));

    const owner = new Map();

    for (const file of sources)
    {
        for (const name of extractGlobals(readFileSync(file, "utf8")))
        {
            // The parent directory names the component. Taken from the END
            // of the path rather than a fixed index, so the function works
            // on a fixture tree as well as on `components/`.
            if (!owner.has(name)) { owner.set(name, dirOf(file)); }
        }
    }

    const tests = testFiles ?? execFileSync("git", ["ls-files", "components/*/*.test.ts"], { encoding: "utf8" })
        .split("\n").filter(Boolean);
    const rows = [];

    for (const file of tests)
    {
        const src = readFileSync(file, "utf8");
        const dir = dirOf(file);

        for (const name of extractGlobals(src))
        {
            const owns = owner.get(name);

            // A component writing its OWN global is registering it, not
            // standing in for anything.
            if (!owns || owns === dir) { continue; }

            rows.push({ file, global: name, owner: owns, imported: src.includes(`../${owns}/${owns}`) });
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

    if (process.argv.includes("--shapes"))
    {
        const shapes = shapesOf(rows);

        for (const [k, v] of Object.entries(shapes))
        {
            console.log(`    ${String(v).padStart(4)}  ${k}`);
        }

        // `--shapes --shape <name>` lists the members of one bucket, so
        // the next piece of work is a command rather than a reading of
        // a table. ADR-205.
        const want = process.argv[process.argv.indexOf("--shape") + 1];
        if (process.argv.includes("--shape"))
        {
            for (const r of shapeRows(rows).filter((x) => x.shape === want))
            {
                console.log(`    ${r.file} :: ${r.name}`);
            }
        }
    }

    if (process.argv.includes("--stand-ins"))
    {
        const standIns = standInsOf().filter((r) => !r.imported);

        console.log(`  ${standIns.length} sibling global(s) stood in for by a suite that does not import the owner`);
        for (const r of standIns)
        {
            console.log(`    ${r.file} :: ${r.global}  (owner: ${r.owner})`);
        }
    }

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
