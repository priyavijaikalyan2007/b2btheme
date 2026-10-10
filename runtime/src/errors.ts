/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c7a639ca-49d8-4d70-85e2-6bcad5583808
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Errors
 * 📜 PURPOSE: Literate error construction for the Dynamic UI layer. Every
 *    validation failure names the offending JSON path, states what was found,
 *    what was expected, and what the author should do about it.
 * 🔗 RELATES: [[DocumentValidate]], [[Registry]], [[LiterateErrors]]
 * ⚡ FLOW: [validator/registry] -> [issue()] -> [ValidationIssue[]] -> [host UI]
 * 🔒 SECURITY: Messages embed untrusted values via JSON.stringify and are
 *    rendered with textContent by consumers — never as HTML.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-errors

import { LOG_PREFIX } from "./constants";

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single validation failure. Carries enough structure that a host can
 * render it as a literate error without re-parsing a message string.
 */
export interface ValidationIssue
{
    /** JSON path to the offending value, e.g. "nodes.n1.placement.region". */
    readonly path: string;

    /** What is wrong, in one sentence. */
    readonly problem: string;

    /** What the author should do instead. */
    readonly remedy: string;
}

/** Outcome of validating a document, patch, or manifest. */
export interface ValidationResult
{
    readonly ok: boolean;
    readonly issues: readonly ValidationIssue[];
}

// ============================================================================
// CONSTRUCTION
// ============================================================================

/**
 * Builds a validation issue.
 *
 * @param path    - JSON path to the offending value.
 * @param problem - What is wrong, in one sentence.
 * @param remedy  - What the author should do instead.
 * @returns The issue.
 */
export function issue(
    path: string,
    problem: string,
    remedy: string): ValidationIssue
{
    return { path, problem, remedy };
}

/**
 * Builds an issue for a value outside a closed vocabulary.
 *
 * @param path    - JSON path to the offending value.
 * @param found   - The value that was supplied.
 * @param allowed - Every legal value.
 * @returns The issue, listing the legal values.
 */
export function enumIssue(
    path: string,
    found: unknown,
    allowed: readonly string[]): ValidationIssue
{
    return issue(
        path,
        `Found ${describe(found)}, which is not a recognised value.`,
        `Use one of: ${allowed.join(", ")}.`);
}

/**
 * Builds an issue for a missing or wrongly typed required field.
 *
 * @param path     - JSON path to the offending value.
 * @param expected - Human-readable description of the expected type.
 * @param found    - The value that was supplied.
 * @returns The issue.
 */
export function typeIssue(
    path: string,
    expected: string,
    found: unknown): ValidationIssue
{
    // `expected` carries its own article — "a non-empty string", "an array of
    // intent verbs" — because it reads correctly after "Expected". Putting
    // "a valid" in front of it here produced "Supply a valid a non-empty
    // string", in every one of the 20-odd call sites, in text consumers see.
    return issue(
        path,
        `Expected ${expected} but found ${describe(found)}.`,
        `Supply ${expected} at "${path}".`);
}

/**
 * Renders a value for inclusion in an error message, truncating long output
 * so a large payload cannot flood the message.
 *
 * @param value - The value to describe.
 * @returns A short, safe description.
 */
export function describe(value: unknown): string
{
    if (value === undefined)
    {
        return "nothing";
    }

    if (value === null)
    {
        return "null";
    }

    const rendered = safeStringify(value);

    return rendered.length > 64
        ? `${rendered.slice(0, 61)}...`
        : rendered;
}

/**
 * Stringifies a value without throwing on cycles or exotic types.
 *
 * @param value - The value to stringify.
 * @returns A string representation, never a thrown error.
 */
function safeStringify(value: unknown): string
{
    try
    {
        return JSON.stringify(value) ?? String(value);
    }
    catch
    {
        return Object.prototype.toString.call(value);
    }
}

// ============================================================================
// RESULTS
// ============================================================================

/** A passing validation result. */
export function valid(): ValidationResult
{
    return { ok: true, issues: [] };
}

/**
 * Builds a validation result from a list of issues.
 *
 * @param issues - Every issue found. An empty list yields a passing result.
 * @returns The result.
 */
export function result(issues: readonly ValidationIssue[]): ValidationResult
{
    return { ok: issues.length === 0, issues };
}

/**
 * Formats a validation result as a single human-readable message, suitable
 * for a thrown Error or a literate error dialog body.
 *
 * @param res     - The validation result to format.
 * @param subject - What was being validated, e.g. "canvas document".
 * @returns A multi-line message. Empty string when the result passed.
 */
export function formatIssues(
    res: ValidationResult,
    subject: string): string
{
    if (res.ok)
    {
        return "";
    }

    const lines = res.issues.map(
        (i) => `  • ${i.path}: ${i.problem} ${i.remedy}`);

    return `${LOG_PREFIX} Invalid ${subject} `
        + `(${res.issues.length} issue${res.issues.length === 1 ? "" : "s"}):\n`
        + lines.join("\n");
}
