#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: FabricatedReadGate
 * 📜 PURPOSE: Find a failure branch that returns something readable, using the
 *    TypeScript AST rather than a regex. DEBT-FAB-2 / ADR-157.
 * 🔗 RELATES: [[NoFabricatedReads]], [[LiterateErrors]]
 *
 * WHY THIS EXISTS ALONGSIDE check-stand-in-reads.py
 * -------------------------------------------------
 * That check finds NAMED stand-in factories — `createNullPicker`,
 * `buildFallbackApi`. It is a name match, so it sees only code that announces
 * itself. ADR-148 found three shapes it cannot see, and the worst instance in
 * that entire audit was one of them: `DynamicFormSwitcher.fallbackDefault`,
 * an aggregation-point default that invented a typed value for a field that
 * never mounted, and fed it straight into `getValues()`.
 *
 * A regex pass over `catch` blocks was tried first and produced 25 hits of
 * which roughly 4 were real, because a regex cannot tell whether a `return`
 * is INSIDE the catch or merely after it. That is a structural question, so
 * this walks the AST and asks it structurally.
 *
 * WHAT IT FLAGS
 * -------------
 * A `return`, or an ASSIGNMENT of an object literal, that is inside a
 * failure context — a `catch` clause,
 * or an `if` whose condition tests for absence (`!x`, `x == null`,
 * `x === undefined`) — and whose value is either:
 *
 *   - an object literal carrying a read method (getValue, serialize, …), or
 *   - a fabricated primitive where the function's own name says it is a
 *     fallback or default.
 *
 * WHAT IT DELIBERATELY DOES NOT FLAG
 * ----------------------------------
 * `return null`, `return undefined`, `return` and `throw`. Those are honest
 * refusals — the caller can tell nothing was produced, which is the whole
 * point of ADR-148. An empty array from a CACHE read is also allowed, by
 * name, because an empty recents list is true rather than invented.
 */
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import ts from "typescript";

const READ_NAMES = new Set([
    "getValue", "getState", "serialize", "getData", "getSelected", "toJSON",
    "getConfig", "getContent", "getItems", "getRows", "getText", "getSettings",
    "getSelection", "getValues", "getAllValues",
    // Added 2026-10-18. An allowlist only sees the names someone
    // remembered to add, and `toHtml` was missing, so
    // markdownrenderer's `buildFallbackHandle` — a function whose own
    // name admits what it is — returned `{ toHtml, render }` past this
    // gate for as long as the gate has existed.
    "toHtml", "toMarkdown", "getHtml", "getMarkdown",
]);

/* Functions whose name admits they fabricate, so a primitive return counts.
 *
 * `default` is DELIBERATELY ABSENT. It flagged seven comparators and
 * serializers — `defaultCompare` returning 1/-1 for a null operand is a sort
 * function doing its job, not a fabrication. In practice `defaultX` names
 * "the built-in implementation of X", while `fallbackX` names "a value used
 * when the real one is unavailable". Only the second is this gate's concern,
 * and `fallbackDefault` — the worst instance ADR-148 found — matches on
 * `fallback` anyway. */
const FALLBACK_NAME = /fallback|stub|dummy|placeholder/i;

/** Reads of a cache may honestly be empty — an empty recents list is true. */
const CACHE_NAME = /recent|cache|history|suggestion/i;

/*
 * FIFTH SHAPE (DEBT-GATE-2, 2026-10-18). A reader returns a plausible
 * SCALAR because its backing object is missing.
 *
 *     public getValue(): string
 *     {
 *         if (this.cmView) { return this.getCMDoc(); }
 *         return "";                      // the lie
 *     }
 *
 * Two things hid this from the four shapes above. The stand-in is a
 * string rather than an object with read methods, and it is the
 * fall-through of a PRESENCE test rather than the body of an absence
 * guard, so `failureContext` could not see it either way round.
 *
 * WHY THE GUARD DECIDES, NOT THE LITERAL. `return ""` is honest far
 * more often than not. A picker with no date selected, a layout with
 * no gap set, a connector with no endpoints — all answer with the
 * empty representation and all are true. Classifying the 38 candidates
 * by what the `if` tests separated them cleanly: 33 guard on DATA and
 * are correct, 5 guard on INFRASTRUCTURE, and 4 of those 5 were live
 * defects. A reader whose BACKING OBJECT is absent cannot answer at
 * all, and "" is indistinguishable from a real empty answer.
 */
const INFRA_FIELD =
    /^(cm\w*|view|instance|root\w*|container\w*|editor|el|ctx|canvas|engine|vditor|renderer|handle|widget|chart)$/i;

/** Literals a reader may honestly return when there is nothing to report. */
const HONEST_LITERAL = new Set(["null", "undefined", "false", "[]", "{}", "0", "-1", "NaN"]);

/** Function names that promise an answer rather than an action. */
const READER_NAME = /^(get|read|to|compute|resolve|find|query|fetch|extract|parse|current|value)/i;

/** The identifier an `if` tests, reduced to its last path segment. */
function guardSubject(expr)
{
    const text = expr.getText().replace(/^!/, "").trim();
    const path = (text.match(/^[\w.]+/) ?? [""])[0];
    return path.split(".").filter((x) => x !== "this").pop() ?? "";
}

/** `x`, `this.x` or `a && b` — a test that something IS there. */
function isPresenceTest(expr)
{
    if (!expr) { return false; }
    if (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr)) { return true; }
    if (ts.isBinaryExpression(expr)
        && expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
    {
        return isPresenceTest(expr.left) && isPresenceTest(expr.right);
    }
    return false;
}

/**
 * The infrastructure field whose absence this return answers for, or
 * null when the guard is about data and the answer is honest.
 */
function fabricatedOnAbsentBacking(node)
{
    // `if (!backing) { return "" }`
    for (let p = node.parent; p; p = p.parent)
    {
        if (ts.isIfStatement(p) && isAbsenceTest(p.expression))
        {
            let c = node;
            while (c.parent && c.parent !== p) { c = c.parent; }
            if (c === p.thenStatement)
            {
                const on = guardSubject(p.expression);
                return INFRA_FIELD.test(on) ? on : null;
            }
        }
        if (ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p)
            || ts.isFunctionExpression(p)) { break; }
    }

    // `if (backing) { return real } return "";`
    const block = node.parent;
    if (!block || !ts.isBlock(block)) { return null; }

    const i = block.statements.indexOf(node);
    if (i < 1) { return null; }

    const prev = block.statements[i - 1];
    if (!ts.isIfStatement(prev) || prev.elseStatement) { return null; }
    if (!isPresenceTest(prev.expression)) { return null; }
    if (!/\breturn\b/.test(prev.thenStatement.getText())) { return null; }

    const on = guardSubject(prev.expression);
    return INFRA_FIELD.test(on) ? on : null;
}

const violations = [];

function isAbsenceTest(expr)
{
    if (!expr) { return false; }

    // !x
    if (ts.isPrefixUnaryExpression(expr)
        && expr.operator === ts.SyntaxKind.ExclamationToken)
    {
        return true;
    }

    // x == null / x === undefined / x === null
    if (ts.isBinaryExpression(expr))
    {
        const op = expr.operatorToken.kind;
        const isEq = op === ts.SyntaxKind.EqualsEqualsToken
            || op === ts.SyntaxKind.EqualsEqualsEqualsToken;

        if (isEq)
        {
            const side = expr.right.getText();
            if (side === "null" || side === "undefined") { return true; }
        }

        // a || b — check both halves
        if (op === ts.SyntaxKind.BarBarToken)
        {
            return isAbsenceTest(expr.left) || isAbsenceTest(expr.right);
        }
    }

    return false;
}

/** Walk up from a return to see whether it sits in a failure branch. */
function failureContext(node)
{
    for (let p = node.parent; p; p = p.parent)
    {
        if (ts.isCatchClause(p)) { return "catch"; }

        if (ts.isIfStatement(p) && isAbsenceTest(p.expression))
        {
            // only the THEN branch is the failure path
            let c = node;
            while (c.parent && c.parent !== p) { c = c.parent; }
            if (c === p.thenStatement) { return "absence guard"; }
        }

        if (ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p)
            || ts.isFunctionExpression(p))
        {
            break;
        }
    }

    return null;
}

function enclosingName(node)
{
    for (let p = node.parent; p; p = p.parent)
    {
        if ((ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p))
            && p.name)
        {
            return p.name.getText();
        }
    }
    return "";
}

function readMethodsIn(objectLiteral)
{
    const found = [];

    for (const prop of objectLiteral.properties)
    {
        const name = prop.name && prop.name.getText
            ? prop.name.getText().replace(/['"]/g, "")
            : "";

        if (!READ_NAMES.has(name)) { continue; }

        // A read that THROWS is a refusal, which is what we want.
        const body = prop.getText();
        if (/\bthrow\b/.test(body)) { continue; }

        found.push(name);
    }

    return found;
}

function visit(node, file)
{
    if (ts.isReturnStatement(node) && node.expression)
    {
        const backing = fabricatedOnAbsentBacking(node);
        const fnName = enclosingName(node);
        const literal = node.expression.getText();

        if (backing && READER_NAME.test(fnName) && !CACHE_NAME.test(fnName)
            && !HONEST_LITERAL.has(literal) && ts.isLiteralExpression(node.expression))
        {
            violations.push({
                file: file.fileName,
                line: file.getLineAndCharacterOfPosition(node.getStart()).line + 1,
                fn: fnName,
                where: `branch where \`${backing}\` is absent`,
                detail: `answers \`${literal.slice(0, 32)}\`, which is what a real `
                    + "empty answer looks like, so the caller cannot tell them apart",
            });
        }

        // A function whose own name admits it is a stand-in counts as
        // a failure context, the same way it already does for the
        // ASSIGNMENT shape below. Without this, `buildFallbackHandle`
        // returning `{ toHtml, render }` as its whole body is invisible:
        // the return sits in no catch and no absence guard, because
        // the branch was taken by the caller.
        const fn0 = enclosingName(node);
        const named = FALLBACK_NAME.test(fn0) && !CACHE_NAME.test(fn0);

        // The name counts as a context for an OBJECT WITH READ METHODS
        // only. A stand-in builder returning a DOM element is a view,
        // and those were reviewed under ADR-148. A stand-in builder
        // returning something a caller will READ is the defect, and it
        // sits in no catch and no absence guard because the caller
        // took the branch.
        const where = failureContext(node)
            || (named && ts.isObjectLiteralExpression(node.expression)
                ? "stand-in builder" : null);

        if (where)
        {
            const fn = fn0;
            const expr = node.expression;
            const line = file.getLineAndCharacterOfPosition(node.getStart()).line + 1;

            if (ts.isObjectLiteralExpression(expr))
            {
                const reads = readMethodsIn(expr);
                if (reads.length > 0)
                {
                    violations.push({
                        file: file.fileName, line, fn, where,
                        detail: `returns an object exposing ${reads.join(", ")}`,
                    });
                }
            }
            else if (FALLBACK_NAME.test(fn) && !CACHE_NAME.test(fn))
            {
                const text = expr.getText();
                const honest = ["null", "undefined", "false", "[]", "{}"];

                if (!honest.includes(text) && !/^\s*$/.test(text))
                {
                    violations.push({
                        file: file.fileName, line, fn, where,
                        detail: `fabricates \`${text.slice(0, 44)}\``,
                    });
                }
            }
        }
    }

    // FOURTH SHAPE (FALLBACK-1, 2026-10-16). The fabrication is ASSIGNED
    // rather than returned, and the failure branch is in the CALLER:
    //
    //     catch { this.fallback(wrap, value); }          // failure branch
    //
    //     private fallback(wrap, value) {
    //         this.instance = { getValue: () => inp.value };   // the lie
    //     }
    //
    // Every probe above anchors on a `return` inside a lexical failure
    // context, so all ten SpineMap adapters walked past them for as long as
    // this gate has existed. An assignment of a read-bearing object literal
    // is flagged
    // when it sits in a failure branch, or in a function whose own name
    // admits it is a stand-in.
    if (ts.isBinaryExpression(node)
        && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && ts.isObjectLiteralExpression(node.right))
    {
        const fn = enclosingName(node);
        const where = failureContext(node)
            || (FALLBACK_NAME.test(fn) ? "stand-in builder" : null);

        if (where && !CACHE_NAME.test(fn))
        {
            const reads = readMethodsIn(node.right);

            if (reads.length > 0)
            {
                const line = file.getLineAndCharacterOfPosition(
                    node.getStart()).line + 1;

                violations.push({
                    file: file.fileName, line, fn, where,
                    detail: `assigns an object exposing ${reads.join(", ")}`,
                });
            }
        }
    }

    ts.forEachChild(node, (c) => visit(c, file));
}

const files = globSync("components/*/*.ts")
    .concat(globSync("runtime/**/*.ts"))
    .filter((f) => !/\.(test|manifest|conformance)\.ts$/.test(f));

if (files.length === 0)
{
    console.log("  FAIL: no component sources found — the glob is wrong, "
        + "which is a false pass rather than an empty fleet");
    process.exit(1);
}

for (const path of files)
{
    const source = ts.createSourceFile(
        path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
    visit(source, source);
}

if (violations.length > 0)
{
    console.log(`  FAIL: ${violations.length} failure branch(es) produce `
        + `something readable\n`);

    for (const v of violations)
    {
        console.log(`    ${v.file}:${v.line}`);
        console.log(`      ${v.fn || "(anonymous)"} — inside a ${v.where}, `
            + `${v.detail}`);
    }

    console.log("\n  A component that could not do its job must refuse, not");
    console.log("  answer. Throw, or return a sentinel the caller must");
    console.log("  handle. See specs/2026-10-04-no-fabricated-reads.prd.md.");
    process.exit(1);
}

console.log(`  PASS: ${files.length} sources — no failure branch produces `
    + `a readable stand-in`);
