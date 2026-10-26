/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 5fb74b86-c199-4b84-9050-cbbccd59a8bd
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / Values
 * 📜 PURPOSE: Pure helpers at the A2UI boundary: reading a binding's path,
 *    telling dynamic props from literals, the same-component guard, and the
 *    Date <-> ISO 8601 conversion the data model needs (spec §4.2, §5.5).
 * 🔗 RELATES: [[A2uiAdapter]]
 * ⚡ FLOW: [raw prop | data-model value] -> [helpers] -> [element]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-values

import type { ComponentContextLike } from "./types";

/** The result of reading a data-model value into a component option. */
export type WireResult = { ok: true; value: unknown } | { ok: false; reason: string };

/**
 * The path of a `{path}` DataBinding, or undefined for anything else.
 *
 * @param raw - A raw component property.
 */
export function bindingPath(raw: unknown): string | undefined
{
    if (typeof raw !== "object" || raw === null) { return undefined; }

    const path = (raw as { path?: unknown }).path;

    return typeof path === "string" ? path : undefined;
}

/**
 * True for a DataBinding (`{path}`) or a FunctionCall (`{call}`), the two
 * forms web_core resolves through subscribeDynamicValue.
 *
 * @param raw - A raw component property.
 */
export function isDynamic(raw: unknown): boolean
{
    if (bindingPath(raw) !== undefined) { return true; }

    return typeof raw === "object" && raw !== null && typeof (raw as { call?: unknown }).call === "string";
}

/**
 * True when two contexts describe the same component. Lit hands the element a
 * new context on every parent render and Angular on every prop update; this
 * is web_core's module-private bindsSameComponent, reimplemented (spec §4.2).
 *
 * @param a - The current context.
 * @param b - The newly assigned context.
 */
export function sameComponent(a: ComponentContextLike, b: ComponentContextLike): boolean
{
    if (a === b) { return true; }

    const x = a.dataContext;
    const y = b.dataContext;

    return a.componentModel === b.componentModel && a.surfaceComponents === b.surfaceComponents && a.theme === b.theme
        && x.surface === y.surface && x.dataModel === y.dataModel && x.path === y.path
        && x.explicitIndex === y.explicitIndex && x.parent === y.parent;
}

/**
 * Reads a data-model value into an option value.
 *
 * @param value  - The resolved value.
 * @param isDate - True when the prop's literal arm is a date-time string.
 * @returns The option value, or the reason it is not one.
 */
export function fromWire(value: unknown, isDate: boolean): WireResult
{
    if (!isDate) { return { ok: true, value }; }

    if (typeof value === "string" && !Number.isNaN(Date.parse(value))) { return { ok: true, value: new Date(value) }; }

    return { ok: false, reason: `expected an ISO 8601 date-time string, got ${JSON.stringify(value)}` };
}

/**
 * Converts a component value for the data model: Dates become ISO 8601
 * strings, through arrays and plain objects.
 *
 * @param value - A component value or event payload.
 */
export function toWire(value: unknown): unknown
{
    if (value instanceof Date) { return value.toISOString(); }

    if (Array.isArray(value)) { return value.map(toWire); }

    if (isPlainObject(value))
    {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toWire(v)]));
    }

    return value;
}

/**
 * True when two values are equal in wire form.
 *
 * @param a - First value.
 * @param b - Second value.
 */
export function sameValue(a: unknown, b: unknown): boolean
{
    return JSON.stringify(toWire(a)) === JSON.stringify(toWire(b));
}

function isPlainObject(value: unknown): value is Record<string, unknown>
{
    if (typeof value !== "object" || value === null) { return false; }

    const proto = Object.getPrototypeOf(value);

    return proto === Object.prototype || proto === null;
}
