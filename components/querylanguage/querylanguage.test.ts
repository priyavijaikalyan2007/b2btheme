/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: QueryLanguage
 * The syntax colors of the apps' query language (#205): what each range of text is, by the parser generated
 * from the apps' grammar, and that the generated code is still the grammar's.
 */

import { describe, test, expect, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { colorQuery } from "./querylanguage";

const HERE = join(process.cwd(), "components", "querylanguage");

/** Each colored range as `kind:text`, in order. */
function colors(text: string): string[]
{
    return colorQuery(text).map((r) => r.kind + ":" + text.slice(r.start, r.end));
}

describe("colorQuery", () =>
{
    test.each([
        ["a filter with `:`, and one with a word operator and a zoned date",
            "type:checklists.instance  created_at greater-or-equal 2026-11-01@kolkata",
            ["key:type", "operator::", "value:checklists.instance", "key:created_at",
                "operator:greater-or-equal", "value:2026-11-01@kolkata"]],
        ["`and` and `or` around a group",
            "(rel.parent_of:X and rel.child_of:Y) or rel.stakeholder_of:Z",
            ["key:rel.parent_of", "operator::", "value:X", "keyword:and", "key:rel.child_of", "operator::",
                "value:Y", "keyword:or", "key:rel.stakeholder_of", "operator::", "value:Z"]],
        ["a negation, a nested search and a variable",
            "-\"draft\"  rel.signed_off_by where ( -rel.member_of:?org )",
            ["keyword:-", "key:rel.signed_off_by", "keyword:where", "keyword:-", "key:rel.member_of",
                "operator::", "variable:?org"]],
        ["`in` with no key before it, which is plain text", "meeting in march", []],
        ["a list, with no closing bracket yet", "type in (note, task",
            ["key:type", "operator:in", "value:note", "value:task"]],
        ["a symbol, a negative number, a parameter and `return`", "amount >= -5 and size:$max return ?p",
            ["key:amount", "operator:>=", "value:-", "value:5", "keyword:and", "key:size", "operator::",
                "variable:$max", "keyword:return", "variable:?p"]],
        ["`is`, `exists`, `not` and a boolean", "starred is true not archived exists",
            ["key:starred", "operator:is", "value:true", "keyword:not", "key:archived", "operator:exists"]],
        ["a keyword spelled as a key", "contains:x", ["key:contains", "operator::", "value:x"]],
        ["`link`, and a comparison of two variables", "rel.owner link (role:lead) :x ?a = ?b",
            ["key:rel.owner", "keyword:link", "key:role", "operator::", "value:lead", "operator::", "value:x",
                "variable:?a", "operator:=", "variable:?b"]],
    ])("%s", (_name, text, expected) =>
    {
        expect(colors(text)).toEqual(expected);
    });

    test("counts in UTF-16 units, as a JavaScript string does, while ANTLR counts code points", () =>
    {
        // The emoji is two UTF-16 units and one code point.
        expect(colors("😀 type:x")).toEqual(["key:type", "operator::", "value:x"]);
        expect(colorQuery("😀 type:x")[0]).toEqual({ start: 3, end: 7, kind: "key" });
    });

    test.each([
        ["nothing", ""],
        ["only brackets", ")))((("],
        ["an open quote", "type:\"no"],
        ["an operator with no key", ">= 5"],
    ])("never throws, and colors only what it could place, for %s", (_name, text) =>
    {
        const ranges = colorQuery(text);

        expect(ranges.every((r) => r.start >= 0 && r.end <= text.length && r.start < r.end)).toBe(true);
    });

    test("a token the parser skipped to recover has no color", () =>
    {
        // The second `:` cannot follow `type:`, so the parser skips it.
        expect(colors("budget (type:")).toEqual(["key:type", "operator::"]);
        expect(colors("type::x")).toEqual(["key:type", "operator::"]);
        // The second `and` is skipped inside a negation's rule, where `and` would read as a keyword.
        expect(colors("a and and b")).toEqual(["keyword:and"]);
    });

    test("prints nothing for text the lexer or the parser cannot read, since an error is the API's to show", () =>
    {
        const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        try
        {
            // A `?` or `$` with no name after it is no token at all, and `a and and b` does not parse.
            colorQuery("? $ a and and b");

            expect(error).not.toHaveBeenCalled();
            expect(warn).not.toHaveBeenCalled();
        }
        finally
        {
            error.mockRestore();
            warn.mockRestore();
        }
    });

    test("is published on window for FacetSearch", () =>
    {
        expect(window.colorQuery).toBe(colorQuery);
    });
});

// ============================================================================
// THE GENERATED CODE IS THE GRAMMAR'S
// ============================================================================

describe("the generated lexer and parser", () =>
{
    const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
    const script = readFileSync(join(process.cwd(), "scripts", "generate-querylanguage.sh"), "utf8");
    const version = /^ANTLR_VERSION=(\S+)$/m.exec(script)![1];
    const stamp = readFileSync(join(HERE, "generated", "grammar.stamp"), "utf8").split("\n");

    test("were made from the grammar as it is now, so a copied grammar was also generated", () =>
    {
        const inputs = "antlr " + version + "\n" + readFileSync(join(HERE, "grammar", "QlLexer.g4"), "utf8")
            + readFileSync(join(HERE, "grammar", "QlParser.g4"), "utf8");

        expect(stamp[0], "run scripts/generate-querylanguage.sh").toBe(sha256(inputs));
    });

    test("were not edited by hand", () =>
    {
        // Sorted by byte order, as the script sorts them.
        const files = readdirSync(join(HERE, "generated")).filter((f) => f.endsWith(".ts"))
            .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        const outputs = files.map((f) => readFileSync(join(HERE, "generated", f), "utf8")).join("");

        expect(files).toEqual(["QlLexer.ts", "QlParser.ts"]);
        expect(stamp[1], "edit the grammar and regenerate, never the generated code").toBe(sha256(outputs));
    });

    test("match their runtime: the tool version is the antlr4 version the page loads", () =>
    {
        const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

        expect(pkg.devDependencies.antlr4).toBe(version);
        expect(readFileSync(join(HERE, "generated", "QlParser.ts"), "utf8")).toContain("by ANTLR " + version);
    });
});
