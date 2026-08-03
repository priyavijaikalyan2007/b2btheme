/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 8c41d70e-53b2-4a96-b8ef-7f0a2d951c63
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Predicates
 * 📜 PURPOSE: Type guards shared by the validators. Extracted because the
 *    browser bundle concatenates every runtime module into one scope, where
 *    two modules each defining `isObject` is a duplicate declaration — and
 *    because they were genuine copy-paste duplication in the source anyway.
 * 🔗 RELATES: [[Document]], [[Registry]]
 * ⚡ FLOW: [validators] -> [predicates]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-predicates

/**
 * True when the value is a non-null, non-array object.
 *
 * @param v - Candidate value.
 * @returns Whether it is a plain object.
 */
export function isObject(v: unknown): v is Record<string, unknown>
{
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * True when the value is a finite number.
 *
 * @param v - Candidate value.
 * @returns Whether it is a usable number.
 */
export function isFiniteNumber(v: unknown): v is number
{
    return typeof v === "number" && Number.isFinite(v);
}

/**
 * True when the value is a non-empty string.
 *
 * @param v - Candidate value.
 * @returns Whether it is a non-empty string.
 */
export function isNonEmptyString(v: unknown): v is string
{
    return typeof v === "string" && v.length > 0;
}

/**
 * True when the value is a usable identifier: a non-empty string free of
 * control characters.
 *
 * Control characters are rejected because the wiring engine composes node ids
 * and channel names into lookup keys with a NUL separator. An id carrying a
 * NUL could forge a key belonging to a different pair and silently deliver to
 * the wrong channel.
 *
 * @param v - Candidate value.
 * @returns Whether it is safe to use as an identifier.
 */
export function isIdentifier(v: unknown): v is string
{
    // eslint-disable-next-line no-control-regex
    return isNonEmptyString(v) && !/[\u0000-\u001F]/.test(v);
}
