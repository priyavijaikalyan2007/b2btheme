/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: FacetSearch
 * 📜 PURPOSE: Facet-aware search bar with structured key:value query parsing,
 *    inline chips, context-sensitive autocomplete, async value loading,
 *    recent search history, and full ARIA combobox pattern.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer] -> [new FacetSearch()] -> [show()] -> [DOM search bar]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/** Value type for a facet definition. */
export type FacetValueType = "text" | "enum" | "date" | "number" | "boolean";

/** Size variant for the search bar. */
export type FacetSearchSize = "sm" | "default" | "lg";

/**
 * A facet value: a plain string, or a stored value with the label a person reads, such as
 * { value: "thinker.session", label: "Brainstorm Session" }. The chip and the dropdown show the label, and the
 * query reports the value.
 */
export type FacetValue = string | { value: string; label: string };

/** Defines a single searchable facet. */
export interface FacetDefinition
{
    key: string;
    label: string;
    valueType: FacetValueType;
    values?: FacetValue[];
    loadValues?: (query: string) => Promise<FacetValue[]>;
    icon?: string;
    multiple?: boolean;
    defaultOperator?: ":" | "!:" | ">" | "<" | ">=" | "<=";
    operators?: string[];
    color?: string;
    valuePlaceholder?: string;
}

/** A single parsed facet from the query string. */
export interface ParsedFacet
{
    key: string;
    operator: string;
    /** What getQuery(), getValue() and onSearch report. */
    value: string;
    /** What the chip shows, when the value has a known label. */
    label?: string;
    negated: boolean;
}

/**
 * The language the bar reads and writes. "facet" is today's `key:value` syntax. "query" is the apps' query
 * language (knobbyio/apps#379), whose meaning the host's Parse call decides.
 */
export type FacetSearchSyntax = "facet" | "query";

/** A value in a query-language tree, in the shape the apps' Parse call writes. */
export interface QueryValue
{
    text?: string;
    number?: number;
    boolean?: boolean;
    /** YYYY-MM-DD, with `time` and `zone` when the query has them. */
    date?: string;
    time?: string;
    zone?: string;
    /** A time in UTC, such as 2026-11-01T03:30:00Z. */
    instant?: string;
    /** A relative date: an anchor such as "today" or "now", and an ISO 8601 duration such as "-P30D". */
    relative?: { anchor: string; duration: string };
    resource?: string;
    var?: string;
    param?: string;
}

/** A node of a query-language tree, as the apps' Parse call returns it. `span` indexes the parsed text. */
export interface QueryNode
{
    kind: string;
    children?: QueryNode[];
    child?: QueryNode;
    phrase?: string;
    key?: string;
    /** The operator's name, such as "Equals", "In" or "OnOrAfter". */
    op?: string;
    value?: QueryValue;
    values?: QueryValue[];
    link?: QueryNode;
    where?: QueryNode;
    span?: { start: number; end: number };
}

/** A query-language tree: its root, and the variables after `return`. */
export interface QueryTree
{
    root?: QueryNode;
    return?: string[];
}

/** An error or a warning from the API's Parse call. */
export interface QueryDiagnostic
{
    code: string;
    title: string;
    detail: string;
    suggestion?: string;
    /** Where it is in the text Parse read, in UTF-16 units, up to but not including `end`. Absent with no place. */
    start?: number;
    end?: number;
}

/** The API's answer to Parse for `text`, the bar's value the host sent it. */
export interface QueryParse
{
    text: string;
    /** Absent when there are errors. */
    tree?: QueryTree;
    errors?: QueryDiagnostic[];
    warnings?: QueryDiagnostic[];
}

/** A diagnostic, and where the bar shows it: on chips, by index, and on a range of the input. */
interface Problem
{
    diagnostic: QueryDiagnostic;
    severity: "error" | "warning";
    chips: number[];
    input?: { start: number; end: number };
}

/** Where each part of the bar's value comes from: chips, then the input, which `start` maps to `lead`. */
interface QueryLayout
{
    text: string;
    parts: Array<{ start: number; end: number; chips: number[]; values: Array<{ start: number; end: number }> }>;
    input: { start: number; length: number; lead: number } | null;
}

/** A top-level node `setParsed` split out, by its span in the old text: its chips, or its place in the input. */
interface SplitNode
{
    start: number;
    end: number;
    chips: number[];
    /** Where its text begins in the new input, and how far its span sits inside that, past a `(`. */
    rest?: { at: number; shift: number; length: number };
}

/** A chip, and with `syntax: "query"` the value as the standard spelling writes it, when it came from a tree. */
interface Chip extends ParsedFacet
{
    literal?: string;
}

/** Structured result of parsing the search bar input. */
export interface FacetSearchQuery
{
    text: string;
    facets: ParsedFacet[];
    raw: string;
}

/** Configuration options for FacetSearch. */
export interface FacetSearchOptions
{
    /** The facets the user can search by (key, label, value type). Required; pass [] for free-text only. */
    facets: FacetDefinition[];
    /** Initial query string, parsed into chips and free text, e.g. "status:open hello". Default: empty. */
    value?: string;
    /** Placeholder text of the input. Default: "Search...". */
    placeholder?: string;
    /** Turns recognised key:value pairs into removable chips. Default: true. */
    showFacetChips?: boolean;
    /** Lists recent submitted searches in the dropdown when the input is empty. Default: false. */
    showHistory?: boolean;
    /** Most recent searches kept when showHistory is on. Default: 10. */
    maxHistory?: number;
    /** Pressing Enter submits the search (fires onSearch and the "search" channel). Default: true. */
    submitOnEnter?: boolean;
    /** Clears the chips and input after each submitted search. Default: false. */
    clearOnSubmit?: boolean;
    /** Size variant: "sm", "default" or "lg". Default: "default". */
    size?: FacetSearchSize;
    /** Starts the search bar disabled (input not editable). Default: false. */
    disabled?: boolean;
    /** Extra CSS class added to the root element. Default: none. */
    cssClass?: string;
    /**
     * The language the bar reads and writes. "facet" (default) is today's `key:value` syntax. "query" is the
     * apps' query language: the bar never parses typed text itself, the host passes the API's parse with
     * `setParsed`, and the bar writes its chips in the language's standard spelling.
     */
    syntax?: FacetSearchSyntax;
    onSearch?: (query: FacetSearchQuery) => void;
    onChange?: (value: string) => void;
    onFacetAdd?: (key: string, value: string) => void;
    onFacetRemove?: (key: string) => void;
    onClear?: () => void;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[FacetSearch]";
const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;
// LOG-6. Read per call, never captured. A const freezes the flag at script
// evaluation, so a console toggle on a live page did nothing. The semantics
// match isGlobalFlagSet in logutility.ts: unset means "decide from the host"
// for debug and "off" for trace. See FRONTEND_LOGGING.md section 1.3.
function _dbg(): boolean
{
    const f = window.__ebt_debug_logging;
    return f === undefined ? LOCAL_HOSTS.test(location.hostname) : !!f;
}
function _trc(): boolean { return !!window.__ebt_trace_logging; }
function logInfo(...a: unknown[]): void
{
    _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}
function logWarn(...a: unknown[]): void
{
    _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a);
}
function logError(...a: unknown[]): void
{
    _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a);
}
function logDebug(...a: unknown[]): void
{
    _lu ? _lu.debug(...a) : _dbg() && console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}
function logTrace(...a: unknown[]): void
{
    _lu ? _lu.trace(...a) : _trc() && console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a);
}

// LOG-4a DECLARES ALL FIVE SHIMS IN EVERY COMPONENT, used or not, so a
// developer adding a log line never has to wire one up. `noUnusedLocals`
// is on (UNUSED-1), and this reference is what says that uniformity is
// deliberate rather than an oversight. Deleting a shim to silence the
// compiler is the wrong repair: `dynamicVerboseShims` holds the logDebug
// and logTrace population as a floor, and the preamble is the contract
// FRONTEND_LOGGING.md section 1.1 states.
void [logInfo, logWarn, logError, logDebug, logTrace];

const OPERATORS = [">=", "<=", "!:", ">", "<", ":"];

// ============================================================================
// THE QUERY LANGUAGE (#204, knobbyio/apps#379)
// ============================================================================
//
// The API decides what a query means. These write the chips the bar holds in
// the language's standard spelling, as the apps' StandardPrinter does, and
// nothing here reads typed text.

/** The word form of each operator, as the standard spelling writes it. */
const QUERY_OP_WORDS = new Set([
    "equals", "not-equals", "greater-than", "greater-or-equal", "less-than", "less-or-equal",
    "after", "before", "on", "on-or-after", "on-or-before", "in", "contains", "starts-with", "ends-with",
    "descendant-of", "is", "is-not", "exists", "missing",
]);

/** Operators a chip on one key can join into `key in (…)`: today's default `:`, `equals` and `in`. */
const JOINS_INTO_IN = new Set([":", "equals", "in"]);

// What the dropdown offers in the query language. These only choose a suggestion. What the text means is
// still the API's to say.

/** What stands between a key and its value, written apart: the words, short forms and symbols (spec §6). */
const QUERY_VALUE_OPS = new Set([...QUERY_OP_WORDS].filter((w) => w !== "exists" && w !== "missing")
    .concat(["eq", "neq", "gt", "gte", "geq", "lt", "lte", "leq", "=", "!=", "!:", ">", ">=", "<", "<="]));

/** A key with its operator joined on, and the value typed so far, such as `-type:no` or `amount>=5`. */
const QUERY_JOINED_KEY = /^-?([^\s:!<>=@]+)(?:>=|<=|!=|!:|>|<|=|:)(.*)$/;

/** A zone typed after a date, a time or a relative date, such as `2026-11-15@kol`, `-7d@` or `today@kol`. */
const QUERY_DATE_ZONE = /(?:\d(?:mo|[hdwy])?|now|today|yesterday)@([^@]*)$/i;

/** Whether the text before the caret ends inside a quote, and where its last unclosed bracket is, or -1. */
function queryCaretScan(before: string): { inQuote: boolean; open: number }
{
    const open: number[] = [];
    let inQuote = false;

    for (let i = 0; i < before.length; i++)
    {
        const ch = before[i];

        if (inQuote)
        {
            if (ch === "\\") { i++; }
            else if (ch === '"') { inQuote = false; }
        }
        else if (ch === '"') { inQuote = true; }
        else if (ch === "(") { open.push(i); }
        else if (ch === ")") { open.pop(); }
    }
    return { inQuote, open: open.length > 0 ? open[open.length - 1] : -1 };
}

/** Whether [s, e) meets [a, b). An empty range meets a part it touches, so it can mark the end of a part. */
function meets(s: number, e: number, a: number, b: number): boolean
{
    return (s === e) ? (s >= a && s <= b) : (s < b && e > a);
}

/** A relative date's ISO 8601 duration, such as -P30D or PT6H. */
const QUERY_DURATION = /^(-?)P(T?)(\d+)([HDWMY])$/;

/** The language's unit for each duration unit: hours, days, weeks, months and years. */
const QUERY_UNITS: Record<string, string> = { H: "h", D: "d", W: "w", M: "mo", Y: "y" };

/** An operator's word from its name in the tree, such as "OnOrAfter" to "on-or-after"; null when unknown. */
function queryOpWord(name: string): string | null
{
    const word = (name === "Equals") ? "equals"
        : (name === "NotEquals") ? "not-equals"
            : name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

    return QUERY_OP_WORDS.has(word) ? word : null;
}

/** Quotes text as the language does: a backslash is written \\ and a quote \", backslashes first. */
function quoteQueryText(text: string): string
{
    return '"' + text.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

/** A relative date as the language writes it, such as -30d, +2mo, now or today, without its zone. */
function relativeQueryText(relative: { anchor: string; duration: string }): string | null
{
    if (relative.anchor === "today" || relative.anchor === "yesterday") { return relative.anchor; }

    const m = QUERY_DURATION.exec(relative.duration);

    if (!m) { return null; }
    if (Number(m[3]) === 0) { return "now"; }
    return (m[1] === "-" ? "-" : "+") + m[3] + QUERY_UNITS[m[4]];
}

/** A tree value as the standard spelling writes it; null for a form this bar does not know. */
function queryValueText(v: QueryValue): string | null
{
    const zone = (v.zone !== undefined) ? "@" + v.zone : "";

    if (v.text !== undefined) { return quoteQueryText(v.text); }
    if (v.number !== undefined) { return String(v.number); }
    if (v.boolean !== undefined) { return v.boolean ? "true" : "false"; }
    if (v.date !== undefined) { return v.date + (v.time !== undefined ? "T" + v.time : "") + zone; }
    if (v.instant !== undefined) { return v.instant; }
    if (v.relative !== undefined)
    {
        const text = relativeQueryText(v.relative);
        return (text === null) ? null : text + zone;
    }
    if (v.resource !== undefined) { return quoteQueryText(v.resource); }
    if (v.var !== undefined) { return "?" + v.var; }
    if (v.param !== undefined) { return "$" + v.param; }
    return null;
}

/**
 * Whether typed text has an `or` outside quotes and brackets. Only `and`, `or` and `not` are reserved in
 * the language, so such text must be bracketed beside the chips, or `or` would take the chips into it.
 */
function hasTopLevelOr(text: string): boolean
{
    let depth = 0;

    for (let i = 0; i < text.length; i++)
    {
        const ch = text[i];

        if (ch === '"') { i = skipQuoted(text, i) - 1; }
        else if (ch === "(") { depth++; }
        else if (ch === ")") { depth = Math.max(0, depth - 1); }
        else if (depth === 0 && /^or(?![\w.\/-])/i.test(text.slice(i, i + 3))
            && (i === 0 || /[\s()]/.test(text[i - 1]))) { return true; }
    }
    return false;
}
let instanceCounter = 0;

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    "moveDown": "ArrowDown",
    "moveUp": "ArrowUp",
    "enter": "Enter",
    "escape": "Escape",
    "backspace": "Backspace",
    "tab": "Tab",
    "home": "Home",
    "end": "End",
};


/**
 * Pick a foreground that stays readable on an arbitrary background.
 *
 * ADR-153. Caller-supplied colours cannot be vetted at build time, and a
 * fixed `#fff` fails on anything pale — a yellow tag rendered white-on-yellow
 * at 1.9:1. Choosing by relative luminance guarantees at least 4.5 against
 * one of the two extremes for any input.
 *
 * Duplicated per component on purpose: each is bundled as a standalone IIFE
 * and cannot import a shared module.
 */
function readableOn(background: string): string
{
    const hex = background.trim().replace("#", "");

    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex))
    {
        return "#ffffff";   // not a hex we can read; keep the previous default
    }

    const full = hex.length === 3
        ? hex.split("").map(function (c) { return c + c; }).join("")
        : hex;

    const channel = function (v: number): number
    {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    const r = channel(parseInt(full.slice(0, 2), 16));
    const g = channel(parseInt(full.slice(2, 4), 16));
    const b = channel(parseInt(full.slice(4, 6), 16));
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Contrast against white is (1.05)/(L+0.05); against black
    // (L+0.05)/0.05. They cross at L ~= 0.179.
    //
    // DEBT-VR-11: this returned `#0f172a`, which is NOT an extreme —
    // L = 0.0088, not 0. Swept over the greyscale, the best of white
    // and #0f172a bottoms out at 4.23 on #7b7b7b, so the guarantee
    // above was false for every mid-tone fill. Measured on the live
    // timeline: #1c7ed6 gave 4.25, #845ef7 gave 4.26. With true black
    // the worst case over the whole range is 4.61.
    return luminance > 0.179 ? "#000000" : "#ffffff";
}

// ============================================================================
// HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// PARSER — standalone pure function
// ============================================================================

/** Parse a raw query string into structured facets + free text. */
export function parseFacetQuery(
    raw: string, facetDefs: FacetDefinition[]): FacetSearchQuery
{
    const keyMap = new Map<string, FacetDefinition>();
    for (const fd of facetDefs)
    {
        keyMap.set(fd.key.toLowerCase(), fd);
    }

    const facets: ParsedFacet[] = [];
    const freeTextParts: string[] = [];
    const tokens = tokenize(raw);

    for (const token of tokens)
    {
        const parsed = parseToken(token, keyMap);
        if (parsed)
        {
            facets.push(parsed);
        }
        else
        {
            freeTextParts.push(token);
        }
    }

    return {
        text: freeTextParts.join(" ").trim(),
        facets,
        raw
    };
}

/** Tokenize raw input into space-separated tokens, respecting quotes. */
function tokenize(raw: string): string[]
{
    const tokens: string[] = [];
    let i = 0;
    let current = "";

    while (i < raw.length)
    {
        const ch = raw[i];
        if (ch === " " && current.length > 0)
        {
            tokens.push(current);
            current = "";
            i++;
        }
        else if (ch === " ")
        {
            i++;
        }
        else if (ch === '"')
        {
            current += readQuoted(raw, i);
            i = skipQuoted(raw, i);
        }
        else
        {
            current += ch;
            i++;
        }
    }

    if (current.length > 0) { tokens.push(current); }
    return tokens;
}

/** Read a quoted string starting at position i (including quotes). */
function readQuoted(raw: string, i: number): string
{
    let result = '"';
    let j = i + 1;
    while (j < raw.length)
    {
        // Inside quotes, \" and \\ are escapes, kept whole here and read by stripQuotes. A backslash before
        // anything else is itself.
        if (raw[j] === '\\' && j + 1 < raw.length && (raw[j + 1] === '"' || raw[j + 1] === '\\'))
        {
            result += raw[j] + raw[j + 1];
            j += 2;
        }
        else if (raw[j] === '"')
        {
            result += '"';
            j++;
            break;
        }
        else
        {
            result += raw[j];
            j++;
        }
    }
    return result;
}

/** Return position after a quoted string. */
function skipQuoted(raw: string, i: number): number
{
    let j = i + 1;
    while (j < raw.length)
    {
        // The same two escapes readQuoted keeps: \" and \\.
        if (raw[j] === '\\' && j + 1 < raw.length && (raw[j + 1] === '"' || raw[j + 1] === '\\'))
        {
            j += 2;
        }
        else if (raw[j] === '"')
        {
            return j + 1;
        }
        else
        {
            j++;
        }
    }
    return j;
}

/** Try to parse a single token as a facet. Returns null if not a facet. */
function parseToken(
    token: string,
    keyMap: Map<string, FacetDefinition>): ParsedFacet | null
{
    let negated = false;
    let t = token;

    if (t.startsWith("-") && t.length > 1)
    {
        negated = true;
        t = t.substring(1);
    }

    for (const op of OPERATORS)
    {
        const idx = t.indexOf(op);
        if (idx <= 0) { continue; }

        const key = t.substring(0, idx).toLowerCase();
        if (!keyMap.has(key)) { continue; }

        let value = t.substring(idx + op.length);
        value = stripQuotes(value);

        if (value.length === 0) { return null; }

        return { key, operator: op, value, negated };
    }

    return null;
}

/**
 * What a chip shows: `key:value` for today's operators, `equals` and `in`, and `key word value` for any
 * other word form of the query language, such as `created_at on-or-after 2026-11-01`.
 */
function chipDisplay(facet: ParsedFacet): string
{
    const op = facet.operator;
    const shown = (op === "equals" || op === "in") ? ":" : /^[a-z]/.test(op) ? " " + op + " " : op;
    return (facet.negated ? "-" : "") + facet.key + shown + (facet.label ?? facet.value);
}

/** Strip surrounding double quotes from a value. */
function stripQuotes(s: string): string
{
    if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"')
    {
        return s.substring(1, s.length - 1).replace(/\\(["\\])/g, "$1");
    }
    return s;
}

// ============================================================================
// DROPDOWN SUGGESTION TYPES
// ============================================================================

interface Suggestion
{
    type: "facet-key" | "facet-value" | "recent" | "zone";
    label: string;
    hint?: string;
    icon?: string;
    facetKey?: string;
    value?: string;
}

// ============================================================================
// CLASS: FacetSearch
// ============================================================================

/**
 * The FacetSearch surface a factory caller receives.
 *
 * PAT-1. `implements` below is what keeps this in step with the
 * class: remove a member there and the typecheck fails here. Adding
 * one to the class does NOT add it here, which is the point — a new
 * method is API when somebody writes it into this interface.
 */
export interface FacetSearchHandle
{
    show(containerId: string): void;
    hide(): void;
    destroy(): void;
    getElement(): HTMLElement | null;
    getValue(): string;
    setValue(value: string): void;
    getQuery(): FacetSearchQuery;
    clear(): void;
    focus(): void;
    /** Adds a chip; `label` is what it shows, else the value's known label, else the value. */
    addFacet(key: string, value: string, label?: string): void;
    /** Removes the chips on `key`; with `value`, only the chips on `key` with that value. */
    removeFacet(key: string, value?: string): void;
    /**
     * Records labels for a facet's values, learned after the bar was made, and relabels the chips that hold them
     * at once. Fires no onFacetAdd, onFacetRemove or onChange, because nothing the person chose has changed.
     */
    learnLabels(key: string, values: FacetValue[]): void;
    getFacets(): ParsedFacet[];
    /**
     * With `syntax: "query"`, applies the API's answer to Parse for `text`. From the tree, each top-level
     * filter on a known facet becomes a chip, one for each value, and the rest stays in the input as the text
     * it came from. Each error and warning marks the chips and the typed text it falls on, and the message
     * line under the bar says it. Returns true when it drew chips from the tree. Changes nothing and returns
     * false when `text` is no longer the bar's value, because a newer input wins. With no tree, or a tree it
     * cannot split, it keeps the text as typed, shows the errors and warnings, and returns false. Fires no
     * onChange or onFacetAdd, because the query means the same. Throws with any other syntax.
     */
    setParsed(parsed: QueryParse): boolean;
    enable(): void;
    disable(): void;

    /** The surface contract (additive): FacetSearch has no data slots, so this throws. */
    setData(slot: string, value: unknown): void;
    /** Subscribes to "search": a copy of the FacetSearchQuery that onSearch receives. Returns the unsubscribe. */
    on(channel: string, handler: (payload: unknown) => void): () => void;
    /** { value }: the query string getValue() returns. */
    getState(): Record<string, unknown>;
    /** Applies state.value through setValue() when present. */
    setState(state: Record<string, unknown>): void;
}

export class FacetSearch implements FacetSearchHandle
{
    private opts: FacetSearchOptions;
    private id: string;
    private root: HTMLElement | null = null;
    private bar: HTMLElement | null = null;
    private chipContainer: HTMLElement | null = null;
    private input: HTMLInputElement | null = null;
    private clearBtn: HTMLElement | null = null;
    private dropdown: HTMLElement | null = null;
    private liveRegion: HTMLElement | null = null;
    // `containerId` LEFT ON 2026-10-21 (UNUSED-1): `show()` resolves
    // the element and keeps THAT; the id it was resolved from had no
    // second reader.
    private destroyed = false;

    private facetMap: Map<string, FacetDefinition>;
    /** Known labels by lower-case facet key, then by value: from values, and from each loadValues answer. */
    private readonly knownLabels = new Map<string, Map<string, string>>();
    private chips: Chip[] = [];
    private recentSearches: string[] = [];
    private suggestions: Suggestion[] = [];
    private highlightIdx = -1;
    private dropdownOpen = false;
    private loadTimer: number | null = null;
    private parseTimer: number | null = null;
    private activeContext: "keys" | "values" | "recent" | "zones" | null = null;
    private activeFacetKey: string | null = null;
    private readonly searchHandlers = new Set<(payload: unknown) => void>();

    // -- the query language (#206) --
    /** The layer behind the input that underlines a problem's range, and the line under the bar that says it. */
    private marks: HTMLElement | null = null;
    private message: HTMLElement | null = null;
    private problems: Problem[] = [];
    /** The problem under the pointer, which the message line says before the one at the caret. */
    private hoveredProblem: number | null = null;
    /** The codes last announced, so a screen reader hears a set of problems once, not after each pause. */
    private announcedProblems = "";
    /** What the caret is in: the text a pick replaces, and how a value is written there. */
    private queryPartial = "";
    private queryValueAt: "list" | "in" | "value" = "value";
    private readonly queryListeners: Array<[string, EventListener]> = [];

    // -- bound handlers for cleanup --
    private boundInputHandler: ((e: Event) => void) | null = null;
    private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
    private boundFocusHandler: (() => void) | null = null;
    private boundBlurHandler: (() => void) | null = null;
    private boundClickOutside: ((e: MouseEvent) => void) | null = null;
    private boundDropdownClick: ((e: MouseEvent) => void) | null = null;

    constructor(options: FacetSearchOptions)
    {
        this.opts = Object.assign(
        {
            placeholder: "Search...",
            showFacetChips: true,
            showHistory: false,
            maxHistory: 10,
            submitOnEnter: true,
            clearOnSubmit: false,
            size: "default" as FacetSearchSize,
            disabled: false
        }, options);

        if (this.opts.syntax === "query" && typeof window.searchTimezones !== "function")
        {
            // The bar suggests zones with the picker's own search, so the two match a zone the same way.
            throw new Error(`${LOG_PREFIX} syntax: "query" suggests time zones with window.searchTimezones, `
                + "which the TimezonePicker component publishes. Load timezonepicker.js before this bar.");
        }

        this.id = "facetsearch-" + (++instanceCounter);
        this.facetMap = new Map();
        for (const fd of this.opts.facets)
        {
            this.facetMap.set(fd.key.toLowerCase(), fd);
            this.rememberLabels(fd.key, fd.values ?? []);
        }

        this.buildDOM();

        if (this.opts.value)
        {
            this.parseAndChipify(this.opts.value);
        }

        logInfo("Initialized with",
            this.opts.facets.length, "facet definitions");
    }

    // ====================================================================
    // LIFECYCLE
    // ====================================================================

    show(containerId: string): void
    {
        if (this.destroyed) { return; }
        const container = document.getElementById(containerId);
        if (!container)
        {
            // ERR-1. This logged and carried on, so the caller got a
            // handle to a component that was never mounted.
            throw new Error(
                `${LOG_PREFIX} Container "${containerId}" was not found. `
                + "Insert the element before showing it.");
        }
        container.appendChild(this.root!);
        this.attachListeners();
        logInfo("Shown in", containerId);
    }

    hide(): void
    {
        if (this.destroyed || !this.root) { return; }
        this.closeDropdown();
        this.detachListeners();
        if (this.root.parentElement)
        {
            this.root.parentElement.removeChild(this.root);
        }
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.hide();
        this.destroyed = true;
        this.root = null;
        this.bar = null;
        this.chipContainer = null;
        this.input = null;
        this.clearBtn = null;
        this.dropdown = null;
        this.liveRegion = null;
        this.marks = null;
        this.message = null;
        this.chips = [];
        this.problems = [];
        this.suggestions = [];
        this.searchHandlers.clear();
        if (this.loadTimer !== null) { clearTimeout(this.loadTimer); }
        if (this.parseTimer !== null) { clearTimeout(this.parseTimer); }
        logInfo("Destroyed");
    }

    getElement(): HTMLElement | null { return this.root; }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    getValue(): string
    {
        return this.buildRawFromChipsAndInput();
    }

    setValue(value: string): void
    {
        if (this.destroyed) { return; }
        this.dropProblems();
        this.chips = [];
        this.renderChips();
        this.parseAndChipify(value);
    }

    getQuery(): FacetSearchQuery
    {
        const raw = this.buildRawFromChipsAndInput();
        if (this.opts.syntax === "query")
        {
            // The API reads the query. The bar reports its chips as they are, and the rest as typed.
            return { text: this.input?.value.trim() ?? "", facets: this.getFacets(), raw };
        }
        const query = parseFacetQuery(raw, this.opts.facets);
        return { ...query, facets: query.facets.map((f) => this.withLabel(f)) };
    }

    clear(): void
    {
        if (this.destroyed) { return; }
        this.dropProblems();
        this.chips = [];
        if (this.input) { this.input.value = ""; }
        this.renderChips();
        this.updateClearBtnVisibility();
        this.closeDropdown();
        this.announce("All filters cleared");
        if (this.opts.onClear) { this.opts.onClear(); }
    }

    focus(): void
    {
        if (this.input) { this.input.focus(); }
    }

    addFacet(key: string, value: string, label?: string): void
    {
        if (this.destroyed || this.opts.disabled) { return; }
        const fd = this.facetMap.get(key.toLowerCase());
        if (!fd)
        {
            logWarn("Facet key not found:", key);
            return;
        }
        this.addChip(
        {
            key: fd.key,
            operator: fd.defaultOperator || ":",
            value,
            ...(label !== undefined ? { label } : {}),
            negated: false
        });
    }

    // ====================================================================
    // VALUE LABELS (apps report 2026-11-09)
    // ====================================================================

    /** Records each labelled value's label for `facetKey`, so a typed or restored chip can show it. */
    private rememberLabels(facetKey: string, values: FacetValue[]): void
    {
        const key = facetKey.toLowerCase();
        for (const v of values)
        {
            if (typeof v === "string") { continue; }
            let labels = this.knownLabels.get(key);
            if (!labels) { labels = new Map(); this.knownLabels.set(key, labels); }
            labels.set(v.value, v.label);
        }
    }

    /** The facet with its label: its own, else the value's known label, else none (the chip shows the value). */
    private withLabel<T extends ParsedFacet>(facet: T): T
    {
        if (facet.label !== undefined) { return facet; }
        const label = this.knownLabels.get(facet.key.toLowerCase())?.get(facet.value);
        return label === undefined ? facet : { ...facet, label };
    }

    /** A value's dropdown suggestion: its label, with the value as the hint when the two differ. */
    private valueSuggestion(fd: FacetDefinition, v: FacetValue): Suggestion
    {
        const value = typeof v === "string" ? v : v.value;
        const label = typeof v === "string" ? v : v.label;
        return { type: "facet-value", label, facetKey: fd.key, value,
            ...(label !== value ? { hint: value } : {}) };
    }

    removeFacet(key: string, value?: string): void
    {
        if (this.destroyed) { return; }
        this.removeChipByKey(key, value);
    }

    learnLabels(key: string, values: FacetValue[]): void
    {
        if (this.destroyed) { return; }
        const fd = this.facetMap.get(key.toLowerCase());
        if (!fd)
        {
            logWarn("Facet key not found:", key);
            return;
        }
        this.rememberLabels(fd.key, values);

        // A learned label replaces the one a chip shows, even one addFacet gave it: it is the newer answer.
        const labels = this.knownLabels.get(fd.key.toLowerCase());
        let relabelled = 0;
        this.chips = this.chips.map((c) =>
        {
            const label = c.key.toLowerCase() === fd.key.toLowerCase() ? labels?.get(c.value) : undefined;
            if (label === undefined || label === c.label) { return c; }
            relabelled++;
            return { ...c, label };
        });
        if (relabelled > 0) { this.renderChips(); }
        logDebug("Labels learned for", fd.key + ":", values.length, "values,", relabelled, "chips relabelled");
    }

    getFacets(): ParsedFacet[]
    {
        return this.chips.map(({ literal: _literal, ...facet }) => facet);
    }

    setParsed(parsed: QueryParse): boolean
    {
        if (this.opts.syntax !== "query")
        {
            throw new Error(`${LOG_PREFIX} setParsed: the bar reads the API's parse only with syntax: "query".`);
        }
        if (this.destroyed || !this.input) { return false; }
        if (parsed.text !== this.getValue())
        {
            logDebug("A parse of older text was dropped, because the newer input wins.");
            return false;
        }

        const found = [
            ...(parsed.errors ?? []).map((diagnostic) => ({ diagnostic, severity: "error" as const })),
            ...(parsed.warnings ?? []).map((diagnostic) => ({ diagnostic, severity: "warning" as const })),
        ];
        const split = parsed.tree ? this.splitTree(parsed.text, parsed.tree) : null;

        if (!split)
        {
            // The text stays as typed, so each problem is placed in the bar as it stands.
            const layout = this.queryLayout();
            this.showProblems(found.map((f) => this.placeInLayout(f.diagnostic, f.severity, layout)));
            return false;
        }

        this.chips = split.chips;
        this.input.value = split.rest;
        this.updateClearBtnVisibility();
        this.showProblems(found.map((f) => this.placeInSplit(f.diagnostic, f.severity, split.nodes)));
        logDebug("Parse applied:", split.chips.length, "chips,", found.length, "problems");
        return true;
    }

    /**
     * The tree's top-level nodes as chips and the rest as the text each came from, or null when it cannot be
     * split: a tree with no root or with `return`, or a node outside the chips with no span.
     */
    private splitTree(text: string, tree: QueryTree): { chips: Chip[]; rest: string; nodes: SplitNode[] } | null
    {
        const root = tree.root;
        if (!root || (tree.return?.length ?? 0) > 0) { return null; }

        const chips: Chip[] = [];
        const nodes: SplitNode[] = [];
        let rest = "";
        for (const node of (root.kind === "and") ? (root.children ?? []) : [root])
        {
            const made = this.chipsFromNode(node, chips);
            if (made)
            {
                if (node.span)
                {
                    nodes.push({ ...node.span, chips: made.map((_c, i) => chips.length + i) });
                }
                chips.push(...made);
                continue;
            }
            if (!node.span)
            {
                logDebug("A node outside the chips has no span, so the text stays as typed.");
                return null;
            }
            // A group's span leaves out its brackets, so they are written back.
            const group = node.kind === "and" || node.kind === "or";
            const piece = text.slice(node.span.start, node.span.end);
            const at = rest.length + (rest ? 1 : 0);
            rest += (rest ? " " : "") + (group ? "(" + piece + ")" : piece);
            nodes.push({ ...node.span, chips: [],
                rest: { at, shift: group ? 1 : 0, length: piece.length + (group ? 2 : 0) } });
        }
        return { chips, rest, nodes };
    }

    /** Where a problem falls once the tree is split: on the chips and the input text its old range meets. */
    private placeInSplit(diagnostic: QueryDiagnostic, severity: Problem["severity"], nodes: SplitNode[]): Problem
    {
        const problem: Problem = { diagnostic, severity, chips: [] };
        const { start: s, end: e } = diagnostic;
        if (s === undefined || e === undefined) { return problem; }

        for (const node of nodes)
        {
            // A group's brackets lie just outside its span, so they belong to it too.
            const shift = node.rest?.shift ?? 0;
            if (!meets(s, e, node.start - shift, node.end + shift)) { continue; }
            problem.chips.push(...node.chips);
            if (node.rest)
            {
                const rest = node.rest;
                const to = (i: number): number => rest.at + Math.min(Math.max(i - node.start + shift, 0), rest.length);
                // A range over several parts of the text covers them all, and the spaces between.
                problem.input = problem.input
                    ? { start: problem.input.start, end: to(e) } : { start: to(s), end: to(e) };
            }
        }
        return problem;
    }

    /** Where a problem falls in the bar as it stands, whose value is the text Parse read. */
    private placeInLayout(diagnostic: QueryDiagnostic, severity: Problem["severity"], layout: QueryLayout): Problem
    {
        const problem: Problem = { diagnostic, severity, chips: [] };
        const { start: s, end: e } = diagnostic;
        if (s === undefined || e === undefined) { return problem; }

        for (const part of layout.parts)
        {
            if (!meets(s, e, part.start, part.end)) { continue; }
            // In `key in (a, b)` a range on one value marks that value's chip, and the rest marks them all.
            const hit = part.chips.filter((_c, i) => meets(s, e, part.values[i].start, part.values[i].end));
            problem.chips.push(...(hit.length > 0 ? hit : part.chips));
        }

        const input = layout.input;
        if (input && meets(s, e, input.start, input.start + input.length))
        {
            const to = (i: number): number => input.lead + Math.min(Math.max(i - input.start, 0), input.length);
            problem.input = { start: to(s), end: to(e) };
        }
        return problem;
    }

    /** Shows a parse's problems, and announces them when their codes differ from the last set announced. */
    private showProblems(problems: Problem[]): void
    {
        this.problems = problems;
        this.hoveredProblem = null;
        this.renderChips();
        this.renderProblems();

        const codes = problems.map((p) => p.severity + ":" + p.diagnostic.code).join(" ");
        if (problems.length === 0 || codes === this.announcedProblems) { return; }
        this.announcedProblems = codes;

        const count = (n: number, word: string): string => n + " " + word + (n === 1 ? "" : "s");
        const errors = problems.filter((p) => p.severity === "error").length;
        const warnings = problems.length - errors;
        const counts = [errors > 0 ? count(errors, "error") : "", warnings > 0 ? count(warnings, "warning") : ""];
        this.announce(counts.filter(Boolean).join(" and ") + " in the query. " + this.problemSentence(problems[0]));
        logDebug("Problems shown:", codes);
    }

    /** Drops the problems, whose places no longer hold once the bar's value changes. The next parse brings more. */
    private dropProblems(): void
    {
        if (this.problems.length === 0) { return; }
        this.problems = [];
        this.hoveredProblem = null;
        this.renderChips();
        this.renderProblems();
    }

    /** Draws the underlines and the message line, and tells assistive technology whether the query has errors. */
    private renderProblems(): void
    {
        this.renderMarks();
        this.renderMessage();
        if (!this.input) { return; }
        if (this.problems.some((p) => p.severity === "error")) { setAttr(this.input, "aria-invalid", "true"); }
        else { this.input.removeAttribute("aria-invalid"); }
    }

    /**
     * Writes the input's text into the layer behind it, with each problem's range in a mark. A character takes
     * the first problem on it, which is an error when one is there, because errors come first. An empty range
     * is a mark of no width at its place.
     */
    private renderMarks(): void
    {
        if (!this.marks || !this.input) { return; }
        while (this.marks.firstChild) { this.marks.removeChild(this.marks.firstChild); }

        const value = this.input.value;
        const owner = new Array<number>(value.length).fill(-1);
        const points = new Map<number, number>();
        this.problems.forEach((p, i) =>
        {
            if (!p.input) { return; }
            if (p.input.start === p.input.end && !points.has(p.input.start)) { points.set(p.input.start, i); }
            for (let k = p.input.start; k < p.input.end; k++)
            {
                if (owner[k] < 0) { owner[k] = i; }
            }
        });

        const mark = (text: string, i: number): HTMLElement =>
        {
            const severity = this.problems[i].severity;
            const el = createElement("span", ["facetsearch-mark", "facetsearch-mark-" + severity], text);
            setAttr(el, "data-problem", String(i));
            if (!text) { el.classList.add("facetsearch-mark-empty"); }
            return el;
        };
        for (let k = 0; k <= value.length;)
        {
            if (points.has(k)) { this.marks.appendChild(mark("", points.get(k)!)); }
            if (k === value.length) { break; }
            let j = k + 1;
            while (j < value.length && owner[j] === owner[k] && !points.has(j)) { j++; }
            const text = value.slice(k, j);
            this.marks.appendChild(owner[k] < 0 ? document.createTextNode(text) : mark(text, owner[k]));
            k = j;
        }
        this.marks.scrollLeft = this.input.scrollLeft;
    }

    /** The problem the message line says: the one under the pointer, at the caret, else the first, an error if any. */
    private shownProblem(): number
    {
        if (this.hoveredProblem !== null) { return this.hoveredProblem; }
        // An input keeps a caret when it has no focus, but the person is not at it then.
        const caret = (this.input && document.activeElement === this.input) ? this.input.selectionStart : null;
        const at = (caret === null) ? -1
            : this.problems.findIndex((p) => p.input && p.input.start <= caret && caret <= p.input.end);
        // Errors come first, so the first problem is an error when there is one.
        return Math.max(at, 0);
    }

    /** A problem as one sentence: its title, what is wrong, and what to do. */
    private problemSentence(p: Problem): string
    {
        const { title, detail, suggestion } = p.diagnostic;
        return [title + (/[.!?]$/.test(title) ? "" : "."), detail, suggestion ?? ""].filter(Boolean).join(" ");
    }

    /** Writes the message line under the bar, which the input names with aria-describedby. */
    private renderMessage(): void
    {
        if (!this.message || !this.input) { return; }
        while (this.message.firstChild) { this.message.removeChild(this.message.firstChild); }
        this.message.classList.remove("facetsearch-message-error", "facetsearch-message-warning");

        if (this.problems.length === 0)
        {
            this.message.hidden = true;
            this.input.removeAttribute("aria-describedby");
            return;
        }

        const shown = this.shownProblem();
        const p = this.problems[shown];
        const error = p.severity === "error";
        this.message.hidden = false;
        this.message.classList.add("facetsearch-message-" + p.severity);

        // The color is on a span, because dark mode makes every icon inherit its color.
        const icon = createElement("span", ["facetsearch-message-icon"]);
        setAttr(icon, "aria-hidden", "true");
        icon.appendChild(createElement("i",
            ["bi", error ? "bi-exclamation-circle-fill" : "bi-exclamation-triangle-fill"]));
        this.message.appendChild(icon);
        this.message.appendChild(createElement("span", ["visually-hidden"], error ? "Error: " : "Warning: "));
        this.message.appendChild(createElement("span", ["facetsearch-message-text"], this.problemSentence(p)));
        if (this.problems.length > 1)
        {
            this.message.appendChild(createElement("span", ["facetsearch-message-count"],
                (shown + 1) + " of " + this.problems.length));
        }
        setAttr(this.input, "aria-describedby", this.message.id);
    }

    /** Shows the problem under the pointer, found by the marks' boxes, since the marks lie behind the input. */
    private hoverProblem(x: number, y: number): void
    {
        if (!this.marks || this.problems.length === 0) { return; }
        let found: number | null = null;
        for (const el of Array.from(this.marks.querySelectorAll<HTMLElement>(".facetsearch-mark")))
        {
            const r = el.getBoundingClientRect();
            // An empty mark has no width, so its underline's width is what the pointer can rest on.
            const right = Math.max(r.right, r.left + el.offsetHeight / 2);
            if (x >= r.left && x <= right && y >= r.top && y <= r.bottom)
            {
                found = Number(el.getAttribute("data-problem"));
                break;
            }
        }
        if (found === this.hoveredProblem) { return; }
        this.hoveredProblem = found;
        this.renderMessage();
    }

    /**
     * The chips for a top-level node, one for each value, or null when it stays text: anything but a filter
     * or a negated filter on a known facet, with no `link`, a value this bar can write, and room on its key.
     */
    private chipsFromNode(node: QueryNode, made: Chip[]): Chip[] | null
    {
        const negated = node.kind === "not";
        const f = negated ? node.child : node;
        if (!f || f.kind !== "filter" || f.link || !f.key || !f.op) { return null; }

        const fd = this.facetMap.get(f.key.toLowerCase());
        const op = queryOpWord(f.op);
        const values = f.values ?? (f.value ? [f.value] : []);
        if (!fd || !op || values.length === 0 || (op !== "in" && values.length > 1)) { return null; }

        const onKey = made.filter((c) => c.key === fd.key).length;
        if (!fd.multiple && onKey + values.length > 1) { return null; }

        const chips: Chip[] = [];
        for (const v of values)
        {
            const literal = queryValueText(v);
            if (literal === null) { return null; }
            chips.push(this.withLabel({ key: fd.key, operator: op, value: v.text ?? literal, negated, literal }));
        }
        return chips;
    }
    enable(): void
    {
        if (this.destroyed) { return; }
        this.opts.disabled = false;
        if (this.root)
        {
            this.root.classList.remove("facetsearch-disabled");
            this.root.removeAttribute("aria-disabled");
        }
        if (this.input) { this.input.disabled = false; }
    }

    disable(): void
    {
        if (this.destroyed) { return; }
        this.opts.disabled = true;
        if (this.root)
        {
            this.root.classList.add("facetsearch-disabled");
            this.root.setAttribute("aria-disabled", "true");
        }
        if (this.input) { this.input.disabled = true; }
        this.closeDropdown();
    }

    // ── Surface contract (additive, readiness step 2 B6) ──

    /** FacetSearch has no data slots; use setValue(), addFacet() or removeFacet(). */
    setData(slot: string, _value: unknown): void
    {
        throw new Error(
            `${LOG_PREFIX} setData("${slot}"): FacetSearch has no data slots. `
            + "Use setValue(), addFacet() or removeFacet().");
    }

    /** Subscribes to "search"; returns the unsubscribe. */
    on(channel: string, handler: (payload: unknown) => void): () => void
    {
        if (channel !== "search")
        {
            throw new Error(`${LOG_PREFIX} on("${channel}"): the only channel is "search".`);
        }

        this.searchHandlers.add(handler);

        return () => { this.searchHandlers.delete(handler); };
    }

    /** The query string. */
    getState(): Record<string, unknown>
    {
        return { value: this.getValue() };
    }

    /** Restores state captured by getState(). */
    setState(state: Record<string, unknown>): void
    {
        if ("value" in state) { this.setValue(state.value as string); }
    }

    /** Tells the "search" subscribers, each a fresh copy, one throwing handler not stopping the rest. */
    private emitSearch(query: FacetSearchQuery): void
    {
        for (const handler of this.searchHandlers)
        {
            try
            {
                handler({ text: query.text, facets: query.facets.map((f) => ({ ...f })), raw: query.raw });
            }
            catch (err)
            {
                logError("search handler threw:", err);
            }
        }
    }

    // ====================================================================
    // DOM BUILDING
    // ====================================================================

    private buildDOM(): void
    {
        this.root = createElement("div", ["facetsearch"]);
        setAttr(this.root, "role", "search");
        setAttr(this.root, "aria-label", "Search with filters");

        if (this.opts.size === "sm")
        {
            this.root.classList.add("facetsearch-sm");
        }
        else if (this.opts.size === "lg")
        {
            this.root.classList.add("facetsearch-lg");
        }
        if (this.opts.disabled)
        {
            this.root.classList.add("facetsearch-disabled");
            this.root.setAttribute("aria-disabled", "true");
        }
        if (this.opts.cssClass)
        {
            this.root.classList.add(this.opts.cssClass);
        }

        this.bar = createElement("div", ["facetsearch-bar"]);
        this.root.appendChild(this.bar);

        this.buildSearchIcon();
        this.buildChipContainer();
        this.buildInput();
        this.buildClearButton();
        this.buildMessage();
        this.buildDropdown();
        this.buildLiveRegion();
    }

    private buildSearchIcon(): void
    {
        const icon = createElement("i", ["bi", "bi-search", "facetsearch-icon"]);
        setAttr(icon, "aria-hidden", "true");
        this.bar!.appendChild(icon);
    }

    private buildChipContainer(): void
    {
        this.chipContainer = createElement("div", ["facetsearch-chips"]);
        setAttr(this.chipContainer, "role", "list");
        setAttr(this.chipContainer, "aria-label", "Active filters");
        this.bar!.appendChild(this.chipContainer);
    }

    private buildInput(): void
    {
        const input = document.createElement("input");
        input.type = "text";
        input.classList.add("facetsearch-input");
        setAttr(input, "role", "searchbox");
        setAttr(input, "aria-label", "Search");
        setAttr(input, "aria-expanded", "false");
        setAttr(input, "aria-controls", this.id + "-listbox");
        setAttr(input, "aria-activedescendant", "");
        setAttr(input, "aria-autocomplete", "list");
        setAttr(input, "aria-haspopup", "listbox");
        setAttr(input, "autocomplete", "off");
        input.placeholder = this.opts.placeholder || "Search...";
        if (this.opts.disabled) { input.disabled = true; }
        this.input = input;
        if (this.opts.syntax !== "query")
        {
            this.bar!.appendChild(input);
            return;
        }

        // An input cannot style a range of its text, so a layer behind it, with the same font, underlines each
        // problem's range. Its text is clear, and it scrolls with the input.
        const field = createElement("span", ["facetsearch-field"]);
        this.marks = createElement("div", ["facetsearch-marks"]);
        setAttr(this.marks, "aria-hidden", "true");
        field.appendChild(this.marks);
        field.appendChild(input);
        this.bar!.appendChild(field);
    }

    /** The line under the bar that says a parse's error or warning. The input names it while it has one. */
    private buildMessage(): void
    {
        if (this.opts.syntax !== "query") { return; }
        this.message = createElement("div", ["facetsearch-message"]);
        setAttr(this.message, "id", this.id + "-message");
        this.message.hidden = true;
        this.root!.appendChild(this.message);
    }

    private buildClearButton(): void
    {
        this.clearBtn = createElement("button", ["facetsearch-clear"]);
        setAttr(this.clearBtn, "type", "button");
        setAttr(this.clearBtn, "aria-label", "Clear search");
        const icon = createElement("i", ["bi", "bi-x-lg"]);
        setAttr(icon, "aria-hidden", "true");
        this.clearBtn.appendChild(icon);
        this.clearBtn.style.display = "none";
        this.clearBtn.addEventListener("click", () => this.clear());
        this.bar!.appendChild(this.clearBtn);
    }

    private buildDropdown(): void
    {
        this.dropdown = createElement("div", ["facetsearch-dropdown"]);
        // Canvas anchors name this region rather than counting it (ADR-162).
        this.dropdown.setAttribute("data-dui-region", "facetsearch:dropdown");
        setAttr(this.dropdown, "id", this.id + "-listbox");
        setAttr(this.dropdown, "role", "listbox");
        setAttr(this.dropdown, "aria-label", "Search suggestions");
        this.dropdown.style.display = "none";
        this.root!.appendChild(this.dropdown);
    }

    private buildLiveRegion(): void
    {
        this.liveRegion = createElement("div", ["visually-hidden"]);
        setAttr(this.liveRegion, "role", "status");
        setAttr(this.liveRegion, "aria-live", "polite");
        setAttr(this.liveRegion, "aria-atomic", "true");
        this.root!.appendChild(this.liveRegion);
    }

    // ====================================================================
    // CHIP MANAGEMENT
    // ====================================================================

    private addChip(added: ParsedFacet): void
    {
        const fd = this.facetMap.get(added.key.toLowerCase());
        if (!fd) { return; }
        const facet = this.withLabel(added);

        if (!fd.multiple)
        {
            this.chips = this.chips.filter(
                c => c.key.toLowerCase() !== facet.key.toLowerCase());
        }

        this.chips.push(facet);
        this.dropProblems();
        this.renderChips();
        this.updateClearBtnVisibility();

        const label = chipDisplay(facet);
        this.announce("Added filter: " + label);
        logInfo("Facet added:", label);

        if (this.opts.onFacetAdd)
        {
            this.opts.onFacetAdd(facet.key, facet.value);
        }
        if (this.opts.onChange)
        {
            this.opts.onChange(this.getValue());
        }
    }

    /** Removes the chips on `key`, or with `value` only those holding it; one onFacetRemove per call. */
    private removeChipByKey(key: string, value?: string): void
    {
        const before = this.chips.length;
        this.chips = this.chips.filter(
            c => c.key.toLowerCase() !== key.toLowerCase() || (value !== undefined && c.value !== value));
        if (this.chips.length < before)
        {
            this.dropProblems();
            this.renderChips();
            this.updateClearBtnVisibility();
            this.announce("Removed filter: " + key);
            logInfo("Facet removed:", key, value === undefined ? "" : value);
            if (this.opts.onFacetRemove)
            {
                this.opts.onFacetRemove(key);
            }
            if (this.opts.onChange)
            {
                this.opts.onChange(this.getValue());
            }
        }
    }

    private removeChipAtIndex(idx: number): void
    {
        if (idx < 0 || idx >= this.chips.length) { return; }
        const removed = this.chips.splice(idx, 1)[0];
        this.dropProblems();
        this.renderChips();
        this.updateClearBtnVisibility();
        this.announce("Removed filter: " + removed.key);
        if (this.opts.onFacetRemove)
        {
            this.opts.onFacetRemove(removed.key);
        }
        if (this.opts.onChange)
        {
            this.opts.onChange(this.getValue());
        }
    }

    private renderChips(): void
    {
        if (!this.chipContainer) { return; }
        while (this.chipContainer.firstChild) { this.chipContainer.removeChild(this.chipContainer.firstChild); }

        for (let i = 0; i < this.chips.length; i++)
        {
            const chip = this.buildChipElement(this.chips[i], i);
            this.chipContainer.appendChild(chip);
        }
    }

    private buildChipElement(
        facet: ParsedFacet, idx: number): HTMLElement
    {
        const chip = createElement("span", ["facetsearch-chip"]);
        setAttr(chip, "role", "listitem");
        setAttr(chip, "data-facet-key", facet.key);

        if (facet.negated)
        {
            chip.classList.add("facetsearch-chip-negated");
        }

        const fd = this.facetMap.get(facet.key.toLowerCase());
        if (fd && fd.color && !facet.negated)
        {
            chip.style.backgroundColor = fd.color;
            chip.style.borderColor = fd.color;
            chip.style.color = readableOn(fd.color);
        }

        if (fd && fd.icon)
        {
            const iconClasses = fd.icon.split(" ").concat(
                "facetsearch-chip-icon");
            const icon = createElement("i", iconClasses);
            setAttr(icon, "aria-hidden", "true");
            chip.appendChild(icon);
        }

        const text = createElement("span", ["facetsearch-chip-text"]);
        const display = chipDisplay(facet);
        text.textContent = display;
        // The title names the stored value too, when the chip shows a label for it.
        setAttr(text, "title", facet.label !== undefined && facet.label !== facet.value
            ? display + " (" + facet.value + ")" : display);
        chip.appendChild(text);

        // A problem on the chip marks it, an error before a warning. The message line says what it is.
        const on = this.problems.filter((p) => p.chips.includes(idx));
        const severity = on.some((p) => p.severity === "error") ? "error" : on.length > 0 ? "warning" : null;
        if (severity)
        {
            chip.classList.add("facetsearch-chip-" + severity);
            chip.appendChild(createElement("span", ["visually-hidden"], severity === "error"
                ? " (has an error)" : " (has a warning)"));
        }

        if (!this.opts.disabled)
        {
            const removeBtn = this.buildChipRemove(facet.key, idx);
            chip.appendChild(removeBtn);
        }

        return chip;
    }

    private buildChipRemove(key: string, idx: number): HTMLElement
    {
        const btn = createElement("button", ["facetsearch-chip-remove"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Remove " + key + " filter");
        setAttr(btn, "tabindex", "-1");
        const icon = createElement("i", ["bi", "bi-x"]);
        setAttr(icon, "aria-hidden", "true");
        btn.appendChild(icon);
        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.removeChipAtIndex(idx);
            if (this.input) { this.input.focus(); }
        });
        return btn;
    }

    // ====================================================================
    // INPUT PARSING & CHIPIFICATION
    // ====================================================================

    private parseAndChipify(raw: string): void
    {
        if (this.opts.syntax === "query")
        {
            // The bar never reads the language. The host's parse draws the chips (setParsed).
            this.chips = [];
            this.renderChips();
            if (this.input) { this.input.value = raw; }
            this.updateClearBtnVisibility();
            return;
        }
        if (!this.opts.showFacetChips)
        {
            if (this.input) { this.input.value = raw; }
            return;
        }

        const query = parseFacetQuery(raw, this.opts.facets);
        this.chips = query.facets.map((f) => this.withLabel(f));
        this.renderChips();
        if (this.input) { this.input.value = query.text; }
        this.updateClearBtnVisibility();
    }

    /** Re-parse input, extract new facets, leave free text. */
    private tryExtractFacets(): void
    {
        if (!this.input || !this.opts.showFacetChips || this.opts.syntax === "query") { return; }
        const text = this.input.value;
        const query = parseFacetQuery(text, this.opts.facets);

        if (query.facets.length > 0)
        {
            for (const f of query.facets) { this.addChip(f); }
            this.input.value = query.text;
        }
    }

    private buildRawFromChipsAndInput(): string
    {
        if (this.opts.syntax === "query") { return this.buildQueryText(); }
        const parts: string[] = [];
        for (const c of this.chips)
        {
            const prefix = c.negated ? "-" : "";
            // A value with a space or a quote is quoted. Inside the quotes a backslash is written \\ and a quote
            // \", the two escapes parseFacetQuery reads (apps report 2026-11-09). Before, a quote broke the value in
            // two, and a value ending in a backslash swallowed its closing quote.
            const val = /[\s"]/.test(c.value)
                ? '"' + c.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"' : c.value;
            parts.push(prefix + c.key + c.operator + val);
        }
        if (this.input && this.input.value.trim())
        {
            parts.push(this.input.value.trim());
        }
        return parts.join(" ");
    }

    /**
     * The chips in the query language, joined by `and`, then the typed text. Several chips on one key, from
     * `:`, `equals` or `in`, join into `key in (…)`, which means "either" (spec §6). A chip the bar made
     * keeps `:`, because only the API knows a key's default operator.
     */
    private buildQueryText(): string
    {
        return this.queryLayout().text;
    }

    /** The bar's value, and where each chip and the typed text sit in it, so Parse's ranges can be placed. */
    private queryLayout(): QueryLayout
    {
        const groups = new Map<string, number[]>();
        this.chips.forEach((c, i) =>
        {
            // A key is a word, so a space cannot be part of one.
            const id = c.key.toLowerCase() + (c.negated ? " not" : "");
            groups.set(id, [...(groups.get(id) ?? []), i]);
        });

        const layout: QueryLayout = { text: "", parts: [], input: null };
        const add = (piece: string): number =>
        {
            layout.text += (layout.text ? " and " : "");
            const start = layout.text.length;
            layout.text += piece;
            return start;
        };

        for (const group of groups.values())
        {
            const first = this.chips[group[0]];
            const joinable = group.filter((i) => JOINS_INTO_IN.has(this.chips[i].operator));
            const joined = joinable.length > 1 || joinable.some((i) => this.chips[i].operator === "in");
            const not = first.negated ? "not " : "";
            if (joined)
            {
                const head = not + first.key + " in (";
                const values: Array<{ start: number; end: number }> = [];
                let list = "";
                for (const i of joinable)
                {
                    list += (list ? ", " : "");
                    const literal = this.chipLiteral(this.chips[i]);
                    values.push({ start: head.length + list.length, end: head.length + list.length + literal.length });
                    list += literal;
                }
                const start = add(head + list + ")");
                layout.parts.push({ start, end: layout.text.length, chips: joinable,
                    values: values.map((v) => ({ start: start + v.start, end: start + v.end })) });
            }
            for (const i of group)
            {
                const c = this.chips[i];
                if (joined && JOINS_INTO_IN.has(c.operator)) { continue; }
                const word = /^[a-z]/.test(c.operator);
                const start = add(not + c.key + (word ? " " + c.operator + " " : c.operator) + this.chipLiteral(c));
                layout.parts.push({ start, end: layout.text.length, chips: [i],
                    values: [{ start, end: layout.text.length }] });
            }
        }

        const value = this.input?.value ?? "";
        const typed = value.trim();
        if (typed)
        {
            const bracket = layout.parts.length > 0 && hasTopLevelOr(typed);
            const start = add(bracket ? "(" + typed + ")" : typed) + (bracket ? 1 : 0);
            layout.input = { start, length: typed.length, lead: value.length - value.trimStart().length };
        }
        return layout;
    }

    /** A chip's value as the language writes it: from the tree, else by its facet's value type. */
    private chipLiteral(c: Chip): string
    {
        if (c.literal !== undefined) { return c.literal; }
        return this.valueLiteral(c.key, c.value);
    }

    /** A value as the language writes it for its facet: quoted, unless the facet holds numbers, dates or booleans. */
    private valueLiteral(key: string, value: string): string
    {
        const type = this.facetMap.get(key.toLowerCase())?.valueType;
        return (type === "number" || type === "date" || type === "boolean") ? value : quoteQueryText(value);
    }

    // ====================================================================
    // AUTOCOMPLETE CONTEXT DETECTION
    // ====================================================================

    /** Determine what kind of suggestions to show. */
    private detectContext(): void
    {
        if (!this.input) { return; }
        if (this.opts.syntax === "query")
        {
            this.detectQueryContext();
            return;
        }
        const text = this.input.value;

        if (text.length === 0)
        {
            this.activeContext = this.opts.showHistory
                ? "recent" : "keys";
            this.activeFacetKey = null;
            return;
        }

        // Check if we're in a key:value context
        for (const op of OPERATORS)
        {
            const idx = text.lastIndexOf(op);
            if (idx <= 0) { continue; }

            // Find the token start (last space before operator)
            let tokenStart = text.lastIndexOf(" ", idx - 1) + 1;
            let key = text.substring(tokenStart, idx).toLowerCase();
            if (key.startsWith("-")) { key = key.substring(1); }

            if (this.facetMap.has(key))
            {
                this.activeContext = "values";
                this.activeFacetKey = key;
                return;
            }
        }

        this.activeContext = "keys";
        this.activeFacetKey = null;
    }

    /**
     * What the caret is in, in the query language: a zone after a date or `zone:`, a value after a known key
     * and its operator, or else a key. This only chooses what to suggest. What the text means is the API's.
     */
    private detectQueryContext(): void
    {
        const input = this.input!;
        const before = input.value.slice(0, input.selectionStart ?? input.value.length);
        this.activeFacetKey = null;
        this.queryPartial = "";
        if (input.value.length === 0)
        {
            this.activeContext = this.opts.showHistory ? "recent" : "keys";
            return;
        }

        const scan = queryCaretScan(before);
        if (scan.inQuote)
        {
            this.activeContext = null;
            return;
        }

        const token = /[^\s(,]*$/.exec(before)![0];
        const zone = QUERY_DATE_ZONE.exec(token) ?? /^zone:(.*)$/i.exec(token);
        if (zone)
        {
            this.activeContext = "zones";
            this.queryPartial = zone[1];
            return;
        }

        const joined = QUERY_JOINED_KEY.exec(token);
        if (joined && this.facetMap.has(joined[1].toLowerCase()))
        {
            this.queryValuesOf(joined[1], joined[2], "value");
            return;
        }

        // In `key in (a, b`, the next value of `key`.
        const list = (scan.open < 0) ? null : /(?:^|[\s(])-?([^\s(]+)\s+in\s*$/i.exec(before.slice(0, scan.open));
        if (list && this.facetMap.has(list[1].toLowerCase()))
        {
            this.queryValuesOf(list[1], token, "list");
            return;
        }

        // In `key after 2026`, a value of `key`, whichever form its operator takes.
        const words = before.slice(0, before.length - token.length).trim().split(/\s+/);
        const op = (words[words.length - 1] ?? "").toLowerCase();
        const key = (words[words.length - 2] ?? "").replace(/^[(-]+/, "");
        if (QUERY_VALUE_OPS.has(op) && this.facetMap.has(key.toLowerCase()))
        {
            this.queryValuesOf(key, token, op === "in" ? "in" : "value");
            return;
        }

        this.activeContext = "keys";
        this.queryPartial = token.replace(/^-/, "");
    }

    /** Suggests values of `key`, for the `partial` typed so far, written as a value goes in at `at`. */
    private queryValuesOf(key: string, partial: string, at: "list" | "in" | "value"): void
    {
        this.activeContext = "values";
        this.activeFacetKey = key.toLowerCase();
        this.queryPartial = partial;
        this.queryValueAt = at;
    }

    /** Zones for the text after `@` or `zone:`, by the TimezonePicker's search. */
    private showZoneSuggestions(): void
    {
        this.suggestions = window.searchTimezones!(this.queryPartial).map(({ zone, offset }) =>
            ({ type: "zone" as const, label: zone, hint: offset, value: zone }));
        this.renderDropdown();
    }

    // ====================================================================
    // DROPDOWN — SUGGESTIONS
    // ====================================================================

    private openDropdown(): void
    {
        if (!this.dropdown || this.opts.disabled) { return; }
        this.dropdownOpen = true;
        this.dropdown.style.display = "";
        if (this.input)
        {
            setAttr(this.input, "aria-expanded", "true");
        }
    }

    private closeDropdown(): void
    {
        if (!this.dropdown) { return; }
        this.dropdownOpen = false;
        this.dropdown.style.display = "none";
        this.highlightIdx = -1;
        this.suggestions = [];
        if (this.input)
        {
            setAttr(this.input, "aria-expanded", "false");
            setAttr(this.input, "aria-activedescendant", "");
        }
    }

    private updateSuggestions(): void
    {
        this.detectContext();

        if (this.activeContext === "values" && this.activeFacetKey)
        {
            this.showValueSuggestions();
        }
        else if (this.activeContext === "keys")
        {
            this.showKeySuggestions();
        }
        else if (this.activeContext === "recent")
        {
            this.showRecentSuggestions();
        }
        else if (this.activeContext === "zones")
        {
            this.showZoneSuggestions();
        }
        else
        {
            this.closeDropdown();
        }
    }

    private showKeySuggestions(): void
    {
        if (!this.input) { return; }
        const text = this.input.value.trim().toLowerCase();
        // Get the last partial token
        const lastSpace = text.lastIndexOf(" ");
        const partial = (this.opts.syntax === "query") ? this.queryPartial.toLowerCase()
            : lastSpace >= 0 ? text.substring(lastSpace + 1) : text;

        const filtered = this.opts.facets.filter(fd =>
        {
            const lk = fd.key.toLowerCase();
            const ll = fd.label.toLowerCase();
            return lk.startsWith(partial) || ll.startsWith(partial);
        });

        this.suggestions = filtered.map(fd => ({
            type: "facet-key" as const,
            label: fd.label,
            hint: fd.key + ":",
            icon: fd.icon,
            facetKey: fd.key
        }));

        this.renderDropdown();
    }

    private showValueSuggestions(): void
    {
        if (!this.activeFacetKey || !this.input) { return; }
        const fd = this.facetMap.get(this.activeFacetKey);
        if (!fd) { return; }

        const text = this.input.value;
        const partial = (this.opts.syntax === "query") ? this.queryPartial : this.extractPartialValue(text);

        if (fd.loadValues)
        {
            this.scheduleAsyncLoad(fd, partial);
            return;
        }

        if (fd.values)
        {
            // A labelled value matches on its label or its value.
            const lower = partial.toLowerCase();
            const matches = fd.values.filter((v) => (typeof v === "string" ? [v] : [v.label, v.value])
                .some((t) => t.toLowerCase().includes(lower)));
            this.suggestions = matches.map((v) => this.valueSuggestion(fd, v));
            this.renderDropdown();
        }
    }

    private showRecentSuggestions(): void
    {
        if (this.recentSearches.length === 0)
        {
            this.closeDropdown();
            return;
        }

        this.suggestions = this.recentSearches.map(s => ({
            type: "recent" as const,
            label: s,
            icon: "bi bi-clock-history"
        }));
        this.renderDropdown();
    }

    private scheduleAsyncLoad(
        fd: FacetDefinition, query: string): void
    {
        if (this.loadTimer !== null) { clearTimeout(this.loadTimer); }

        this.loadTimer = window.setTimeout(() =>
        {
            this.showLoadingIndicator(fd.label);
            fd.loadValues!(query)
                .then(values =>
                {
                    this.rememberLabels(fd.key, values);
                    this.suggestions = values.map((v) => this.valueSuggestion(fd, v));
                    this.renderDropdown();
                    this.announce(values.length + " values loaded");
                })
                .catch(err =>
                {
                    logError("Failed to load values:", err);
                    this.showLoadError();
                });
        }, 200);
    }

    private showLoadingIndicator(facetLabel: string): void
    {
        if (!this.dropdown) { return; }
        while (this.dropdown.firstChild) { this.dropdown.removeChild(this.dropdown.firstChild); }
        const section = createElement("div", ["facetsearch-dropdown-section"]);
        const header = createElement("span",
            ["facetsearch-dropdown-header"], facetLabel + " values");
        setAttr(header, "aria-hidden", "true");
        section.appendChild(header);

        const loading = createElement("div", ["facetsearch-dropdown-loading"]);
        setAttr(loading, "role", "status");
        const spinIcon = createElement("i",
            ["bi", "bi-arrow-repeat", "facetsearch-dropdown-loading-icon"]);
        setAttr(spinIcon, "aria-hidden", "true");
        loading.appendChild(spinIcon);
        const loadText = createElement("span", [], "Loading...");
        loading.appendChild(loadText);
        section.appendChild(loading);

        this.dropdown.appendChild(section);
        this.openDropdown();
    }

    private showLoadError(): void
    {
        if (!this.dropdown) { return; }
        while (this.dropdown.firstChild) { this.dropdown.removeChild(this.dropdown.firstChild); }
        const msg = createElement("div",
            ["facetsearch-dropdown-empty"], "Failed to load values");
        this.dropdown.appendChild(msg);
        this.openDropdown();
    }

    private extractPartialValue(text: string): string
    {
        for (const op of OPERATORS)
        {
            const idx = text.lastIndexOf(op);
            if (idx >= 0)
            {
                return text.substring(idx + op.length);
            }
        }
        return "";
    }

    // ====================================================================
    // DROPDOWN — RENDERING
    // ====================================================================

    private renderDropdown(): void
    {
        if (!this.dropdown) { return; }
        while (this.dropdown.firstChild) { this.dropdown.removeChild(this.dropdown.firstChild); }
        this.highlightIdx = -1;

        if (this.suggestions.length === 0)
        {
            this.renderEmptyDropdown();
            return;
        }

        const section = createElement("div", ["facetsearch-dropdown-section"]);
        const headerText = this.getDropdownHeaderText();
        if (headerText)
        {
            const header = createElement("span",
                ["facetsearch-dropdown-header"], headerText);
            setAttr(header, "aria-hidden", "true");
            section.appendChild(header);
        }

        for (let i = 0; i < this.suggestions.length; i++)
        {
            const item = this.buildDropdownItem(this.suggestions[i], i);
            section.appendChild(item);
        }

        this.dropdown.appendChild(section);
        this.openDropdown();
        this.announce(this.suggestions.length + " suggestions available");
    }

    private renderEmptyDropdown(): void
    {
        if (!this.dropdown) { return; }
        const msg = createElement("div",
            ["facetsearch-dropdown-empty"], "No matching suggestions");
        this.dropdown.appendChild(msg);
        this.openDropdown();
        this.announce("No matching suggestions");
    }

    private getDropdownHeaderText(): string | null
    {
        if (this.suggestions.length === 0) { return null; }
        const type = this.suggestions[0].type;
        if (type === "facet-key") { return "Facets"; }
        if (type === "facet-value" && this.activeFacetKey)
        {
            const fd = this.facetMap.get(this.activeFacetKey);
            return fd ? fd.label + " values" : null;
        }
        if (type === "recent") { return "Recent"; }
        if (type === "zone") { return "Time zones"; }
        return null;
    }

    private buildDropdownItem(
        suggestion: Suggestion, idx: number): HTMLElement
    {
        const item = createElement("div", ["facetsearch-dropdown-item"]);
        setAttr(item, "role", "option");
        setAttr(item, "id", this.id + "-option-" + idx);
        setAttr(item, "aria-selected", "false");

        if (suggestion.icon)
        {
            const iconClasses = suggestion.icon.split(" ").concat(
                "facetsearch-dropdown-item-icon");
            const icon = createElement("i", iconClasses);
            setAttr(icon, "aria-hidden", "true");
            item.appendChild(icon);
        }

        const label = createElement("span",
            ["facetsearch-dropdown-item-label"], suggestion.label);
        item.appendChild(label);

        if (suggestion.hint)
        {
            const hint = createElement("span",
                ["facetsearch-dropdown-item-hint"], suggestion.hint);
            item.appendChild(hint);
        }

        return item;
    }

    // ====================================================================
    // DROPDOWN — HIGHLIGHT
    // ====================================================================

    private setHighlight(idx: number): void
    {
        if (!this.dropdown) { return; }
        const items = this.dropdown.querySelectorAll(
            ".facetsearch-dropdown-item");
        for (let i = 0; i < items.length; i++)
        {
            items[i].classList.toggle(
                "facetsearch-dropdown-item-highlighted", i === idx);
            setAttr(items[i] as HTMLElement, "aria-selected",
                i === idx ? "true" : "false");
        }
        this.highlightIdx = idx;
        if (this.input && idx >= 0)
        {
            setAttr(this.input, "aria-activedescendant",
                this.id + "-option-" + idx);
        }
        else if (this.input)
        {
            setAttr(this.input, "aria-activedescendant", "");
        }
    }

    private moveHighlight(direction: number): void
    {
        if (this.suggestions.length === 0) { return; }
        let next = this.highlightIdx + direction;
        if (next < 0) { next = this.suggestions.length - 1; }
        if (next >= this.suggestions.length) { next = 0; }
        this.setHighlight(next);
    }

    // ====================================================================
    // SELECTION
    // ====================================================================

    private selectHighlighted(): void
    {
        if (this.highlightIdx < 0 ||
            this.highlightIdx >= this.suggestions.length) { return; }

        const suggestion = this.suggestions[this.highlightIdx];
        this.selectSuggestion(suggestion);
    }

    private selectSuggestion(suggestion: Suggestion): void
    {
        if (!this.input) { return; }
        if (this.opts.syntax === "query")
        {
            this.selectQuerySuggestion(suggestion);
            return;
        }

        if (suggestion.type === "facet-key" && suggestion.facetKey)
        {
            // Replace the partial token with key:
            this.replaceLastToken(suggestion.facetKey + ":");
            this.closeDropdown();
            this.updateSuggestions();
        }
        else if (suggestion.type === "facet-value" &&
            suggestion.facetKey && suggestion.value)
        {
            const fd = this.facetMap.get(suggestion.facetKey.toLowerCase());
            const op = fd?.defaultOperator || ":";
            this.addChip(
            {
                key: suggestion.facetKey,
                operator: op,
                value: suggestion.value,
                ...(suggestion.label !== suggestion.value ? { label: suggestion.label } : {}),
                negated: false
            });
            this.removeLastTokenFromInput();
            this.closeDropdown();
            this.input.focus();
        }
        else if (suggestion.type === "recent")
        {
            this.parseAndChipify(suggestion.label);
            this.closeDropdown();
        }
    }

    /**
     * Writes a pick into the text at the caret, in place of what was typed of it. The host's next parse makes
     * a chip of a value, so the API decides what it is. A value after `in` opens a list for it.
     */
    private selectQuerySuggestion(suggestion: Suggestion): void
    {
        const input = this.input!;
        if (suggestion.type === "recent")
        {
            this.parseAndChipify(suggestion.label);
            this.closeDropdown();
            this.handleInput();
            return;
        }

        let insert = "";
        if (suggestion.type === "facet-key" && suggestion.facetKey) { insert = suggestion.facetKey + ":"; }
        else if (suggestion.type === "zone" && suggestion.value) { insert = suggestion.value + " "; }
        else if (suggestion.type === "facet-value" && suggestion.facetKey && suggestion.value !== undefined)
        {
            const literal = this.valueLiteral(suggestion.facetKey, suggestion.value);
            insert = (this.queryValueAt === "list") ? literal
                : (this.queryValueAt === "in") ? "(" + literal + ") " : literal + " ";
        }

        const caret = input.selectionStart ?? input.value.length;
        const from = caret - this.queryPartial.length;
        input.value = input.value.slice(0, from) + insert + input.value.slice(caret);
        input.setSelectionRange(from + insert.length, from + insert.length);
        this.closeDropdown();
        input.focus();
        this.handleInput();
    }

    /** Replace the last partial token in input with a new string. */
    private replaceLastToken(replacement: string): void
    {
        if (!this.input) { return; }
        const text = this.input.value;
        const lastSpace = text.lastIndexOf(" ");
        if (lastSpace >= 0)
        {
            this.input.value = text.substring(0, lastSpace + 1) + replacement;
        }
        else
        {
            this.input.value = replacement;
        }
    }

    /** Remove the last token (including key:value) from input. */
    private removeLastTokenFromInput(): void
    {
        if (!this.input) { return; }
        const text = this.input.value;
        const lastSpace = text.lastIndexOf(" ");
        if (lastSpace >= 0)
        {
            this.input.value = text.substring(0, lastSpace + 1);
        }
        else
        {
            this.input.value = "";
        }
    }

    // ====================================================================
    // EVENT LISTENERS
    // ====================================================================

    private attachListeners(): void
    {
        if (!this.input || !this.dropdown) { return; }

        this.boundInputHandler = () => this.handleInput();
        this.boundKeydownHandler = (e) => this.handleKeydown(e);
        this.boundFocusHandler = () => this.handleFocus();
        this.boundBlurHandler = () => this.handleBlur();
        this.boundClickOutside = (e) => this.handleClickOutside(e);
        this.boundDropdownClick = (e) => this.handleDropdownClick(e);

        this.input.addEventListener("input", this.boundInputHandler);
        this.input.addEventListener("keydown", this.boundKeydownHandler);
        this.input.addEventListener("focus", this.boundFocusHandler);
        this.input.addEventListener("blur", this.boundBlurHandler);
        document.addEventListener("pointerdown", this.boundClickOutside);
        this.dropdown.addEventListener("pointerdown", this.boundDropdownClick);
        if (this.opts.syntax === "query") { this.attachQueryListeners(this.input); }
    }

    /**
     * Keeps the underlines under the text as the input scrolls, and the message line on the problem under the
     * pointer, else the one at the caret, which a tap, a click or a key moves.
     */
    private attachQueryListeners(input: HTMLInputElement): void
    {
        const caretMoved = (): void =>
        {
            if (this.problems.length > 0 && this.hoveredProblem === null) { this.renderMessage(); }
        };
        this.queryListeners.push(
            ["scroll", () => { if (this.marks) { this.marks.scrollLeft = input.scrollLeft; } }],
            ["pointermove", (e) => this.hoverProblem((e as PointerEvent).clientX, (e as PointerEvent).clientY)],
            ["pointerleave", () =>
            {
                if (this.hoveredProblem === null) { return; }
                this.hoveredProblem = null;
                this.renderMessage();
            }],
            ["keyup", caretMoved], ["click", caretMoved], ["select", caretMoved]);
        for (const [type, listener] of this.queryListeners) { input.addEventListener(type, listener); }
    }

    private detachListeners(): void
    {
        if (this.input && this.boundInputHandler)
        {
            this.input.removeEventListener("input", this.boundInputHandler);
        }
        if (this.input && this.boundKeydownHandler)
        {
            this.input.removeEventListener("keydown", this.boundKeydownHandler);
        }
        if (this.input && this.boundFocusHandler)
        {
            this.input.removeEventListener("focus", this.boundFocusHandler);
        }
        if (this.input && this.boundBlurHandler)
        {
            this.input.removeEventListener("blur", this.boundBlurHandler);
        }
        if (this.boundClickOutside)
        {
            document.removeEventListener("pointerdown", this.boundClickOutside);
        }
        if (this.dropdown && this.boundDropdownClick)
        {
            this.dropdown.removeEventListener(
                "pointerdown", this.boundDropdownClick);
        }
        for (const [type, listener] of this.queryListeners) { this.input?.removeEventListener(type, listener); }
        this.queryListeners.length = 0;
    }

    // ====================================================================
    // KEY BINDING RESOLUTION
    // ====================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.opts.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    private matchesKeyCombo(
        e: KeyboardEvent, action: string
    ): boolean
    {
        const combo = this.resolveKeyCombo(action);
        if (!combo) { return false; }
        const parts = combo.split("+");
        const key = parts[parts.length - 1];
        const needCtrl = parts.includes("Ctrl");
        const needShift = parts.includes("Shift");
        const needAlt = parts.includes("Alt");
        return e.key === key
            && e.ctrlKey === needCtrl
            && e.shiftKey === needShift
            && e.altKey === needAlt;
    }

    // ====================================================================
    // EVENT HANDLERS
    // ====================================================================

    private handleInput(): void
    {
        logTrace("input handler");
        this.dropProblems();
        this.updateClearBtnVisibility();

        if (this.parseTimer !== null) { clearTimeout(this.parseTimer); }
        this.parseTimer = window.setTimeout(() =>
        {
            this.updateSuggestions();
        }, 50);

        if (this.opts.onChange)
        {
            this.opts.onChange(this.getValue());
        }
    }

    private handleKeydown(e: KeyboardEvent): void
    {
        logTrace("keydown handler:", { key: e.key.length > 1 ? e.key : "(char)", ctrl: e.ctrlKey });
        if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault();
            if (!this.dropdownOpen) { this.updateSuggestions(); }
            else { this.moveHighlight(1); }
        }
        else if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault();
            if (!this.dropdownOpen) { this.updateSuggestions(); }
            else { this.moveHighlight(-1); }
        }
        else if (this.matchesKeyCombo(e, "enter"))
        {
            e.preventDefault();
            this.handleEnter();
        }
        else if (this.matchesKeyCombo(e, "escape"))
        {
            if (this.dropdownOpen)
            {
                e.preventDefault();
                this.closeDropdown();
            }
        }
        else if (this.matchesKeyCombo(e, "backspace"))
        {
            this.handleBackspace();
        }
        else if (this.matchesKeyCombo(e, "tab"))
        {
            if (this.dropdownOpen && this.highlightIdx >= 0)
            {
                this.selectHighlighted();
            }
            this.closeDropdown();
        }
        else if (this.matchesKeyCombo(e, "home"))
        {
            if (this.dropdownOpen && this.suggestions.length > 0)
            {
                e.preventDefault();
                this.setHighlight(0);
            }
        }
        else if (this.matchesKeyCombo(e, "end"))
        {
            if (this.dropdownOpen && this.suggestions.length > 0)
            {
                e.preventDefault();
                this.setHighlight(this.suggestions.length - 1);
            }
        }
    }

    private handleEnter(): void
    {
        if (this.dropdownOpen && this.highlightIdx >= 0)
        {
            this.selectHighlighted();
            return;
        }

        // Try to extract facets from current input
        this.tryExtractFacets();

        if (this.opts.submitOnEnter)
        {
            const query = this.getQuery();
            this.addToHistory(query.raw);
            logInfo("Search submitted:", query.raw);
            if (this.opts.onSearch) { this.opts.onSearch(query); }
            this.emitSearch(query);
            if (this.opts.clearOnSubmit) { this.clear(); }
        }

        this.closeDropdown();
    }

    private handleBackspace(): void
    {
        if (!this.input) { return; }

        if (this.input.selectionStart === 0 &&
            this.input.selectionEnd === 0 &&
            this.chips.length > 0)
        {
            this.removeChipAtIndex(this.chips.length - 1);
        }
    }

    private handleFocus(): void
    {
        if (this.root)
        {
            this.root.classList.add("facetsearch-focused");
        }
        this.updateSuggestions();
    }

    private handleBlur(): void
    {
        if (this.root)
        {
            this.root.classList.remove("facetsearch-focused");
        }
        // Delay to allow dropdown click to register
        setTimeout(() =>
        {
            if (!this.input || document.activeElement !== this.input)
            {
                this.closeDropdown();
            }
        }, 200);
    }

    private handleClickOutside(e: MouseEvent): void
    {
        if (this.root && !this.root.contains(e.target as Node))
        {
            this.closeDropdown();
        }
    }

    private handleDropdownClick(e: MouseEvent): void
    {
        e.preventDefault(); // Keep focus on input
        const target = (e.target as HTMLElement).closest(
            ".facetsearch-dropdown-item") as HTMLElement | null;
        if (!target) { return; }

        const id = target.getAttribute("id") || "";
        const match = id.match(/option-(\d+)$/);
        if (match)
        {
            const idx = parseInt(match[1], 10);
            if (idx >= 0 && idx < this.suggestions.length)
            {
                this.selectSuggestion(this.suggestions[idx]);
            }
        }
    }

    // ====================================================================
    // HISTORY
    // ====================================================================

    private addToHistory(raw: string): void
    {
        if (!this.opts.showHistory) { return; }
        const trimmed = raw.trim();
        if (!trimmed) { return; }

        const index = this.recentSearches.indexOf(trimmed);
        if (index >= 0) { this.recentSearches.splice(index, 1); }

        this.recentSearches.unshift(trimmed);

        const max = this.opts.maxHistory || 10;
        if (this.recentSearches.length > max)
        {
            this.recentSearches.pop();
        }
    }

    // ====================================================================
    // UI HELPERS
    // ====================================================================

    private updateClearBtnVisibility(): void
    {
        if (!this.clearBtn) { return; }
        const hasContent = this.chips.length > 0 ||
            (this.input && this.input.value.trim().length > 0);
        this.clearBtn.style.display = hasContent ? "" : "none";
    }

    private announce(msg: string): void
    {
        if (!this.liveRegion) { return; }
        this.liveRegion.textContent = "";
        requestAnimationFrame(() =>
        {
            if (this.liveRegion) { this.liveRegion.textContent = msg; }
        });
    }
}

// ============================================================================
// FACTORY + GLOBAL EXPORTS
// ============================================================================

/** Create, show, and return a FacetSearch instance. */
export function createFacetSearch(
    containerId: string, options: FacetSearchOptions): FacetSearchHandle
{
    // ERR-2. AGENTS.md: a missing option throws, it does not
    // get a silent default. This used to reach the field and
    // crash a frame later with a TypeError that names the line
    // rather than the thing the caller left out. Absent means
    // undefined, so an empty array or a zero is present.
    if (options.facets === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.facets is required. `
            + "Pass it when creating the FacetSearch.");
    }

    const fs = new FacetSearch(options);
    fs.show(containerId);
    return fs;
}

window["createFacetSearch"] =
    createFacetSearch;
window["parseFacetQuery"] =
    parseFacetQuery;
