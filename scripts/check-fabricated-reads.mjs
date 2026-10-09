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
 * A `return` that is lexically inside a failure context — a `catch` clause,
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
        const where = failureContext(node);

        if (where)
        {
            const fn = enclosingName(node);
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
    console.log(`  FAIL: ${violations.length} failure branch(es) return `
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

console.log(`  PASS: ${files.length} sources — no failure branch returns a `
    + `readable stand-in`);
