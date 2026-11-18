/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Created: 2026-11-17
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: QueryLanguage
 * 📜 PURPOSE: The syntax colors of the apps' query language (#205). It reads
 *    text with a lexer and parser generated from the apps' own ANTLR grammar,
 *    and says which ranges are keywords, keys, operators, values and
 *    variables. It never reports an error: those come from the API's Parse
 *    call (#206). FacetSearch colors its `syntax: "query"` text with it.
 * 🔗 RELATES: [[FacetSearch]], [[TimezonePicker]]
 * ⚡ FLOW: [text] -> [QlLexer, QlParser] -> [parse tree] -> [colorQuery]
 *          -> [ranges] -> [FacetSearch's layer behind its input]
 * ----------------------------------------------------------------------------
 *
 * The ANTLR runtime is not bundled in. It is served from /lib/ under the
 * library rule, and the build points the `antlr4` import at window.antlr4
 * (scripts/bundle-querylanguage.mjs). Load /lib/antlr4-4.13.1.js first.
 */

// @entrypoint

import { CharStreams, CommonTokenStream, ParserRuleContext, TerminalNode } from "antlr4";
import type { ParseTree } from "antlr4";
import QlLexer from "./generated/QlLexer";
import QlParser from "./generated/QlParser";

// ============================================================================
// TYPES
// ============================================================================

/** What a range of query text is, for its color. Plain text has no range. */
export type QueryColorKind = "keyword" | "key" | "operator" | "value" | "variable";

/** A colored range of the text, in UTF-16 units, up to but not including `end`. */
export interface QueryColorRange
{
    start: number;
    end: number;
    kind: QueryColorKind;
}

// ============================================================================
// CLASSIFICATION
// ============================================================================

/**
 * The rules that decide what a token in them is, from the nearest one up. A token is a keyword only where
 * the parser read it as one: `in` after a key is an operator, and `in` in `meeting in march` is plain text.
 */
const KIND_BY_RULE = new Map<number, QueryColorKind | null>([
    [QlParser.RULE_key, "key"],
    [QlParser.RULE_compareOp, "operator"],
    [QlParser.RULE_scalar, "value"],
    [QlParser.RULE_value, "value"],
    // `is true` holds a boolean outside `value`.
    [QlParser.RULE_boolean, "value"],
    [QlParser.RULE_textTerm, null],
]);

/** Words that are operators where a condition holds them, and the keywords of the clauses. */
const KIND_BY_TOKEN = new Map<number, QueryColorKind>([
    [QlParser.COLON, "operator"],
    [QlParser.IN, "operator"],
    [QlParser.IS, "operator"],
    [QlParser.IS_NOT, "operator"],
    [QlParser.EXISTS, "operator"],
    [QlParser.MISSING, "operator"],
    [QlParser.AND, "keyword"],
    [QlParser.OR, "keyword"],
    [QlParser.NOT, "keyword"],
    [QlParser.BANG, "keyword"],
    [QlParser.MINUS, "keyword"],
    [QlParser.WHERE, "keyword"],
    [QlParser.LINK, "keyword"],
    [QlParser.RETURN, "keyword"],
]);

/** The rules whose own tokens KIND_BY_TOKEN names: a condition, a negation, the joins and the clauses. */
const CLAUSE_RULES = new Set([
    QlParser.RULE_condition, QlParser.RULE_unary, QlParser.RULE_andExpr, QlParser.RULE_expression,
    QlParser.RULE_linkClause, QlParser.RULE_returnClause,
]);

/** What a token is, by the rules around it, or null for plain text and punctuation. */
function kindOf(node: TerminalNode): QueryColorKind | null
{
    const type = node.symbol.type;

    if (type === QlParser.VARIABLE || type === QlParser.PARAMETER) { return "variable"; }

    for (let ctx = node.parentCtx as ParserRuleContext | null; ctx; ctx = ctx.parentCtx as ParserRuleContext | null)
    {
        // Each generated context has ruleIndex, though the runtime's typings leave it off the base class.
        const rule = (ctx as ParserRuleContext & { ruleIndex: number }).ruleIndex;

        if (KIND_BY_RULE.has(rule)) { return KIND_BY_RULE.get(rule)!; }
        // A token a clause holds itself, such as `in` in a condition or `and` between terms. A negative
        // number's `-` is inside `number`, so it never reaches the negation.
        if (CLAUSE_RULES.has(rule)) { return KIND_BY_TOKEN.get(type) ?? null; }
    }
    return null;
}

/** The UTF-16 offset of each code point, and one past the last. ANTLR counts code points. */
function utf16Offsets(text: string): number[]
{
    const offsets: number[] = [];
    let at = 0;

    for (const ch of text)
    {
        offsets.push(at);
        at += ch.length;
    }
    offsets.push(at);
    return offsets;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * The colored ranges of query text, in order. It reads the text as the API does, from the same grammar,
 * and colors each token by what the parser read it as. It never throws for text a person has not
 * finished: the parser recovers, and a token it could not place has no color.
 */
export function colorQuery(text: string): QueryColorRange[]
{
    const lexer = new QlLexer(CharStreams.fromString(text));
    lexer.removeErrorListeners();
    const parser = new QlParser(new CommonTokenStream(lexer));
    parser.removeErrorListeners();

    const offsets = utf16Offsets(text);
    const ranges: QueryColorRange[] = [];
    const walk = (tree: ParseTree): void =>
    {
        if (tree instanceof TerminalNode)
        {
            const token = tree.symbol;
            // A token the parser made up or skipped to recover has no color. The runtime does not export
            // ErrorNode, so this asks as its own ParseTreeWalker does.
            const error = (tree as { isErrorNode?: () => boolean }).isErrorNode?.() ?? false;
            const kind = (error || token.tokenIndex < 0 || token.type === QlParser.EOF) ? null : kindOf(tree);
            if (kind) { ranges.push({ start: offsets[token.start], end: offsets[token.stop + 1], kind }); }
            return;
        }
        const ctx = tree as ParserRuleContext;
        for (const child of ctx.children ?? []) { walk(child); }
    };
    walk(parser.query());
    return ranges;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    window["colorQuery"] = colorQuery;
}
