/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Created: 2026-11-17
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ExpressionBuilder
 * 📜 PURPOSE: A visual editor for a query in the apps' query language, for
 *    people who would rather not type one (#207). It edits the tree that the
 *    API's Parse call returns: groups joined by `and` or `or`, `not`, filters
 *    and free text. The search bar edits the same query as text, and the
 *    host keeps the two in step with the API's Parse and Print calls.
 * 🔗 RELATES: [[FacetSearch]], [[QueryLanguage]], [[GestureRecognizer]]
 * ⚡ FLOW: [host Parse] -> [setParsed(tree)] -> [rows] -> [person edits]
 *          -> [onChange(tree)] -> [host Print] -> [FacetSearch.setValue]
 * ----------------------------------------------------------------------------
 *
 * THE API DECIDES WHAT A QUERY MEANS. The builder only holds a tree. It
 * reports a tree that Print accepts: a row a person has not finished is a
 * draft, shown and marked, and left out of the tree until it is complete.
 *
 * WHAT THIS VERSION CANNOT EDIT IT KEEPS (UI_EXPERIENCE.md section 5.7). A
 * nested search, a `link`, a comparison of variables, a variable or other
 * value it has no editor for, a key with no facet, and `return` are shown
 * read-only, kept in place, and reported exactly as they came.
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[ExpressionBuilder]";

const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;
// LOG-6. Read per call, never captured. See FRONTEND_LOGGING.md section 1.3.
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

// LOG-4a: the shim preamble is uniform across components; see InlineToolbar.
void [logInfo, logWarn, logError, logDebug, logTrace];

const CLS = "expressionbuilder";

/** The default key bindings. Each moves the row that holds the focus. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    moveUp: "Alt+ArrowUp",
    moveDown: "Alt+ArrowDown",
};

// ============================================================================
// TYPES
// ============================================================================
//
// The tree's types are written out here, not imported: components ship as
// separate scripts and never import one another. They are the shapes of the
// apps' Parse and Print calls, as FacetSearch reads them.

/** A value in the tree. One field is set. */
export interface QueryValue
{
    text?: string;
    number?: number;
    boolean?: boolean;
    date?: string;
    time?: string;
    zone?: string;
    instant?: string;
    relative?: { anchor: string; duration: string };
    resource?: string;
    var?: string;
    param?: string;
}

/** A node of the tree. `op` is a name, such as "OnOrAfter". */
export interface QueryNode
{
    kind: string;
    children?: QueryNode[];
    child?: QueryNode;
    phrase?: string;
    key?: string;
    op?: string;
    value?: QueryValue;
    values?: QueryValue[];
    link?: QueryNode;
    where?: QueryNode;
    left?: QueryValue;
    right?: QueryValue;
    span?: { start: number; end: number };
}

/** A tree, as Parse returns it and Print takes it. */
export interface QueryTree
{
    root?: QueryNode;
    return?: string[];
}

/** An error or a warning from Parse or Print. */
export interface QueryDiagnostic
{
    code: string;
    title: string;
    detail: string;
    suggestion?: string;
    start?: number;
    end?: number;
}

/** A key a filter can use. The same shape as FacetSearch's FacetDefinition, so a host passes one list to both. */
export interface ExpressionBuilderFacet
{
    key: string;
    label: string;
    valueType: "text" | "enum" | "date" | "number" | "boolean";
    values?: Array<string | { value: string; label: string }>;
    loadValues?: (query: string) => Promise<Array<string | { value: string; label: string }>>;
    /** The operators a filter on this key may use: words such as "on-or-after", or the bar's symbols. */
    operators?: string[];
}

export interface ExpressionBuilderOptions
{
    /** The keys a filter can use. */
    facets: ExpressionBuilderFacet[];
    /** The query to start with, as Parse returns it. */
    tree?: QueryTree;
    /** Fired with the new tree when the person changes what the query means. The tree always prints. */
    onChange?: (tree: QueryTree) => void;
    disabled?: boolean;
    cssClass?: string;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

/** What createExpressionBuilder returns. */
export interface ExpressionBuilderHandle
{
    /** The query as a tree that Print accepts: no drafts, no spans. */
    getTree(): QueryTree;
    /**
     * Applies the API's answer to Parse or Print. A tree that means what the builder holds keeps the rows, so a
     * person typing in a value loses nothing. Another tree replaces them. Each error and warning shows on the row
     * whose text it is in, or above the rows.
     */
    setParsed(parsed: { tree?: QueryTree; errors?: QueryDiagnostic[]; warnings?: QueryDiagnostic[] }): void;
    focus(): void;
    enable(): void;
    disable(): void;
    getElement(): HTMLElement | null;
    destroy(): void;
}

// ============================================================================
// OPERATORS
// ============================================================================

/** The word form of each operator the builder offers (spec section 6). */
const OP_WORDS = [
    "equals", "not-equals", "greater-than", "greater-or-equal", "less-than", "less-or-equal",
    "after", "before", "on", "on-or-after", "on-or-before", "in", "contains", "starts-with", "ends-with",
    "descendant-of", "is", "is-not", "exists", "missing",
];

/** The operators that fit each value type, in the order a person reads them. */
const OPS_BY_TYPE: Record<ExpressionBuilderFacet["valueType"], string[]> = {
    text: ["equals", "not-equals", "contains", "starts-with", "ends-with", "in", "exists", "missing"],
    enum: ["equals", "not-equals", "in", "exists", "missing"],
    number: ["equals", "not-equals", "greater-than", "greater-or-equal", "less-than", "less-or-equal", "in",
        "exists", "missing"],
    date: ["on", "after", "before", "on-or-after", "on-or-before", "exists", "missing"],
    boolean: ["is", "is-not", "exists", "missing"],
};

/**
 * The bar's symbols and the short forms, as words. `:` is read as `equals`: it means the key's default, which
 * only the API knows, so a key whose default is `descendant-of` lists that word.
 */
const SYMBOL_WORDS: Record<string, string> = {
    ":": "equals", "=": "equals", "eq": "equals", "!:": "not-equals", "!=": "not-equals", "neq": "not-equals",
    ">": "greater-than", "gt": "greater-than", ">=": "greater-or-equal", "gte": "greater-or-equal",
    "geq": "greater-or-equal", "<": "less-than", "lt": "less-than", "<=": "less-or-equal", "lte": "less-or-equal",
    "leq": "less-or-equal",
};

/** What a person reads for each operator. */
const OP_LABELS: Record<string, string> = {
    "equals": "is", "not-equals": "is not", "greater-than": "is more than", "greater-or-equal": "is at least",
    "less-than": "is less than", "less-or-equal": "is at most", "after": "is after", "before": "is before",
    "on": "is on", "on-or-after": "is on or after", "on-or-before": "is on or before", "in": "is one of",
    "contains": "contains", "starts-with": "starts with", "ends-with": "ends with", "descendant-of": "is within",
    "is": "is", "is-not": "is not", "exists": "has a value", "missing": "has no value",
};

/** The tree's name for an operator word, such as "on-or-after" to "OnOrAfter". */
export function opName(word: string): string
{
    return word.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
}

/** The word for an operator name, such as "OnOrAfter" to "on-or-after", or null when it is not one. */
export function opWord(name: string): string | null
{
    const word = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    return OP_WORDS.includes(word) ? word : null;
}

/** The operators a facet's filter may use: its own list as words, else those of its value type. */
export function facetOps(facet: ExpressionBuilderFacet): string[]
{
    if (!facet.operators) { return OPS_BY_TYPE[facet.valueType]; }

    const words: string[] = [];
    for (const op of facet.operators)
    {
        const word = OP_WORDS.includes(op) ? op : SYMBOL_WORDS[op];
        if (!word)
        {
            throw new Error(`${LOG_PREFIX} The facet "${facet.key}" lists the operator "${op}", which is not one `
                + "of the language's. Use a word such as on-or-after, or a symbol such as >=.");
        }
        if (!words.includes(word)) { words.push(word); }
    }
    return words;
}

/** How many values an operator takes: none, one, or one or more. */
function arity(op: string): "none" | "one" | "many"
{
    if (op === "exists" || op === "missing") { return "none"; }
    return (op === "in") ? "many" : "one";
}

// ============================================================================
// THE MODEL
// ============================================================================
//
// The rows a person edits. A row is kept apart from the tree because a
// draft has no place in a tree that must print, and because a `not` is a
// toggle on a row rather than a box of its own.

export interface Span { start: number; end: number }

interface RowBase
{
    /** How many `not`s wrap the row. Two are kept as two, not dropped. */
    nots: number;
    /** Where the row's text is in the bar, from the last parse that matches what the builder holds. */
    span?: Span;
}

export interface GroupRow extends RowBase { kind: "group"; op: "and" | "or"; children: Row[] }

export interface FilterRow extends RowBase
{
    kind: "filter";
    key: string;
    op: string;
    /** As the inputs hold them. */
    values: string[];
    /** The value each came from, so an edited date keeps its zone. */
    original: Array<QueryValue | undefined>;
}

export interface TextRow extends RowBase { kind: "text"; phrase: string }

/** A part of the query this version cannot edit, kept as it came, with what it is. */
export interface KeptRow extends RowBase { kind: "kept"; node: QueryNode; what: string }

export type Row = GroupRow | FilterRow | TextRow | KeptRow;

/** A copy of a node without its spans, as the builder reports every node. */
function withoutSpans(node: QueryNode): QueryNode
{
    return JSON.parse(JSON.stringify(node, (k, v) => (k === "span" ? undefined : v)));
}

/** A value as the input holds it, or null when the builder has no editor for it on this facet. */
function valueText(v: QueryValue, facet: ExpressionBuilderFacet): string | null
{
    const t = facet.valueType;
    if ((t === "text" || t === "enum") && v.text !== undefined) { return v.text; }
    if (t === "number" && v.number !== undefined) { return String(v.number); }
    if (t === "boolean" && v.boolean !== undefined) { return String(v.boolean); }
    if (t === "date" && v.date !== undefined && v.time === undefined) { return v.date; }
    return null;
}

/** Why a node is kept as it came, or null when the builder can edit it. */
function keptWhy(node: QueryNode, facets: Map<string, ExpressionBuilderFacet>): string | null
{
    if (node.kind === "nested") { return "A search inside " + (node.key ?? "a key"); }
    if (node.kind === "compare") { return "A comparison of two variables"; }
    if (node.kind !== "filter") { return "A part of the query of the kind " + node.kind; }
    if (node.link) { return "A filter with a link condition"; }

    const facet = facets.get((node.key ?? "").toLowerCase());
    if (!facet) { return "A filter on " + (node.key ?? "a key") + ", which has no facet"; }
    if (!node.op || !opWord(node.op)) { return "A filter with the operator " + (node.op ?? "(none)"); }

    const values = node.values ?? (node.value ? [node.value] : []);
    if (values.some((v) => v.var !== undefined || v.param !== undefined)) { return "A filter on a variable"; }
    if (values.some((v) => valueText(v, facet) === null)) { return "A filter with a value this builder has no "
        + "editor for"; }
    return null;
}

/** The rows of a node. A row of `not`s around a node counts them. */
export function rowOf(node: QueryNode, facets: Map<string, ExpressionBuilderFacet>): Row
{
    const span = node.span;
    let nots = 0;
    while (node.kind === "not" && node.child)
    {
        nots += 1;
        node = node.child;
    }

    if (node.kind === "and" || node.kind === "or")
    {
        return { kind: "group", op: node.kind, nots, span,
            children: (node.children ?? []).map((c) => rowOf(c, facets)) };
    }
    if (node.kind === "text" && node.phrase !== undefined)
    {
        return { kind: "text", phrase: node.phrase, nots, span };
    }

    const why = keptWhy(node, facets);
    if (why !== null) { return { kind: "kept", node: withoutSpans(node), what: why, nots, span }; }

    const facet = facets.get(node.key!.toLowerCase())!;
    const values = node.values ?? (node.value ? [node.value] : []);
    return { kind: "filter", key: facet.key, op: opWord(node.op!)!, nots, span,
        values: values.map((v) => valueText(v, facet)!), original: values.map((v) => ({ ...v })) };
}

/** The root row of a tree: always a group, so a person can add beside a single filter. */
export function rootOf(tree: QueryTree, facets: Map<string, ExpressionBuilderFacet>): GroupRow
{
    if (!tree.root) { return { kind: "group", op: "and", nots: 0, children: [] }; }

    const row = rowOf(tree.root, facets);
    if (row.kind === "group" && row.nots === 0) { return row; }
    return { kind: "group", op: "and", nots: 0, children: [row], span: row.span };
}

/** Whether a filter row has what its operator needs, so Print accepts it. */
export function isComplete(row: FilterRow, facet: ExpressionBuilderFacet | undefined): boolean
{
    if (!facet || !row.op) { return false; }

    const filled = row.values.filter((v) => v.trim() !== "");
    const fits = (v: string): boolean =>
        (facet.valueType === "number") ? v.trim() !== "" && Number.isFinite(Number(v))
            : (facet.valueType === "date") ? /^\d{4}-\d{2}-\d{2}$/.test(v)
                : (facet.valueType === "boolean") ? v === "true" || v === "false" : true;

    switch (arity(row.op))
    {
        case "none": return true;
        case "many": return filled.length > 0 && filled.every(fits);
        default: return filled.length === 1 && fits(filled[0]);
    }
}

/** A value from what the input holds. A date keeps the zone of the one it came from. */
function valueOf(text: string, original: QueryValue | undefined, facet: ExpressionBuilderFacet): QueryValue
{
    switch (facet.valueType)
    {
        case "number": return { number: Number(text) };
        case "boolean": return { boolean: text === "true" };
        // A new date is read in the page's zone, which the host sends with Print.
        case "date": return original?.zone ? { date: text, zone: original.zone } : { date: text };
        default: return { text };
    }
}

/** Wraps a node in a row's `not`s. */
function negate(node: QueryNode, nots: number): QueryNode
{
    for (let i = 0; i < nots; i += 1) { node = { kind: "not", child: node }; }
    return node;
}

/** A row's node, or null for a draft or an empty group, which the tree leaves out. */
export function nodeOf(row: Row, facets: Map<string, ExpressionBuilderFacet>): QueryNode | null
{
    let node: QueryNode | null = null;

    if (row.kind === "group")
    {
        const children = row.children.map((c) => nodeOf(c, facets)).filter((n): n is QueryNode => n !== null);
        node = (children.length === 0) ? null : { kind: row.op, children };
    }
    else if (row.kind === "text")
    {
        node = row.phrase.trim() ? { kind: "text", phrase: row.phrase.trim() } : null;
    }
    else if (row.kind === "kept")
    {
        node = withoutSpans(row.node);
    }
    else
    {
        const facet = facets.get(row.key.toLowerCase());
        if (facet && isComplete(row, facet))
        {
            const values = row.values.filter((v) => v.trim() !== "").map((v, i) => valueOf(v, row.original[i], facet));
            node = { kind: "filter", key: row.key, op: opName(row.op) };
            if (arity(row.op) === "many") { node.values = values; }
            else if (arity(row.op) === "one") { node.value = values[0]; }
        }
    }
    return node ? negate(node, row.nots) : null;
}

/** The tree the rows make. A root group of one node, with no `not`, is that node. */
export function treeOf(root: GroupRow, facets: Map<string, ExpressionBuilderFacet>, ret?: string[]): QueryTree
{
    const tree: QueryTree = {};
    const node = nodeOf(root, facets);

    if (node && root.nots === 0 && node.children?.length === 1) { tree.root = node.children[0]; }
    else if (node) { tree.root = node; }
    if (ret && ret.length > 0) { tree.return = [...ret]; }
    return tree;
}

/**
 * A node in the form that says only what it means: no spans, a group of one is that one, and a group inside
 * a group of the same kind joins it. Print writes both forms the same way, so a tree that comes back from
 * the bar compares equal to the one the builder sent.
 */
export function meaning(node: QueryNode | undefined): unknown
{
    if (!node) { return null; }
    if (node.kind === "not" && node.child) { return { kind: "not", child: meaning(node.child) }; }
    if (node.kind === "and" || node.kind === "or")
    {
        const children: unknown[] = [];
        for (const child of node.children ?? [])
        {
            const c = meaning(child) as { kind?: string; children?: unknown[] };
            if (c && c.kind === node.kind && c.children) { children.push(...c.children); }
            else { children.push(c); }
        }
        return (children.length === 1) ? children[0] : { kind: node.kind, children };
    }
    return withoutSpans(node);
}

/** The leaves of a node in order, each with the span of the outermost `not` around it, else its own. */
function leafSpans(node: QueryNode, outer?: Span): Array<Span | undefined>
{
    if (node.kind === "not" && node.child) { return leafSpans(node.child, outer ?? node.span); }
    if (node.kind === "and" || node.kind === "or")
    {
        return (node.children ?? []).flatMap((c) => leafSpans(c));
    }
    return [outer ?? node.span];
}

/** The rows the tree holds, in order, which are the leaves a parse of the same meaning has. */
function leafRows(row: Row, facets: Map<string, ExpressionBuilderFacet>): Row[]
{
    if (row.kind === "group") { return row.children.flatMap((c) => leafRows(c, facets)); }
    return nodeOf(row, facets) ? [row] : [];
}

/** Gives each group the span that covers its rows', once its rows have theirs. */
function spanGroups(row: Row): Span | undefined
{
    if (row.kind !== "group") { return row.span; }

    const spans = row.children.map(spanGroups).filter((s): s is Span => s !== undefined);
    row.span = (spans.length === 0) ? undefined
        : { start: Math.min(...spans.map((s) => s.start)), end: Math.max(...spans.map((s) => s.end)) };
    return row.span;
}

/** Clears every span, once the bar's text no longer matches the rows. */
function clearSpans(row: Row): void
{
    row.span = undefined;
    if (row.kind === "group") { row.children.forEach(clearSpans); }
}

// ============================================================================
// EDITS (pure, on the model)
// ============================================================================

/** The row at a path of child indices from the root, and its parent group. */
export function rowAt(root: GroupRow, path: number[]): { row: Row; parent: GroupRow | null; index: number }
{
    let row: Row = root;
    let parent: GroupRow | null = null;
    let index = -1;
    for (const i of path)
    {
        parent = row as GroupRow;
        index = i;
        row = parent.children[i];
    }
    return { row, parent, index };
}

/** Moves a row one place up or down among its group's rows. Returns its new path, or null when it cannot. */
export function moveRow(root: GroupRow, path: number[], by: -1 | 1): number[] | null
{
    const { parent, index } = rowAt(root, path);
    const to = index + by;
    if (!parent || to < 0 || to >= parent.children.length) { return null; }

    [parent.children[index], parent.children[to]] = [parent.children[to], parent.children[index]];
    return [...path.slice(0, -1), to];
}

/** Puts a row in a new `and` group of its own, in its place. Returns the group's path. */
export function wrapRow(root: GroupRow, path: number[]): number[]
{
    const { row, parent, index } = rowAt(root, path);
    if (!parent) { return path; }

    parent.children[index] = { kind: "group", op: "and", nots: 0, children: [row] };
    return path;
}

/** Puts a group's rows in its place. A group with `not` keeps it, so this refuses one. */
export function unwrapRow(root: GroupRow, path: number[]): boolean
{
    const { row, parent, index } = rowAt(root, path);
    if (!parent || row.kind !== "group" || row.nots > 0) { return false; }

    parent.children.splice(index, 1, ...row.children);
    return true;
}

/** Removes a row. */
export function removeRow(root: GroupRow, path: number[]): void
{
    const { parent, index } = rowAt(root, path);
    if (parent) { parent.children.splice(index, 1); }
}

/** Whether `inner` is `outer` or inside it, so a drag cannot put a group in itself. */
function isWithin(inner: number[], outer: number[]): boolean
{
    return outer.length <= inner.length && outer.every((v, i) => inner[i] === v);
}

/** The path of a row, found by the row itself. */
export function pathOfRow(root: GroupRow, target: Row): number[] | null
{
    if (root === target) { return []; }
    for (let i = 0; i < root.children.length; i += 1)
    {
        const child = root.children[i];
        if (child === target) { return [i]; }
        if (child.kind === "group")
        {
            const inner = pathOfRow(child, target);
            if (inner) { return [i, ...inner]; }
        }
    }
    return null;
}

/**
 * Moves a row to a place in a group: the group's path, and the index the row takes there as the group stands
 * before the move. Returns the row's new path, or null when the group is the row or inside it.
 */
export function moveRowTo(root: GroupRow, from: number[], toGroup: number[], toIndex: number): number[] | null
{
    if (isWithin(toGroup, from)) { return null; }

    const { row, parent, index } = rowAt(root, from);
    const group = rowAt(root, toGroup).row;
    if (!parent || group.kind !== "group") { return null; }

    // The row it goes before, found again once the row has left its place.
    const before = group.children[toIndex];
    parent.children.splice(index, 1);
    const at = (before === undefined) ? group.children.length
        : (before === row) ? index : group.children.indexOf(before);
    group.children.splice(at, 0, row);
    return pathOfRow(root, row);
}

/** Sets a filter's operator, and fits its values to it: none, one, or a list. */
export function setOp(row: FilterRow, op: string): void
{
    row.op = op;
    const kind = arity(op);
    if (kind === "none") { row.values = []; row.original = []; }
    else if (kind === "one")
    {
        row.values = [row.values[0] ?? ""];
        row.original = [row.original[0]];
    }
    else if (row.values.length === 0) { row.values = [""]; row.original = [undefined]; }
}

// ============================================================================
// THE COMPONENT
// ============================================================================

function createElement(tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text !== undefined) { el.textContent = text; }
    return el;
}

function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/** A problem from Parse or Print, on a row by its path, or above the rows. */
interface Placed { diagnostic: QueryDiagnostic; severity: "error" | "warning"; path: number[] | null }

let instanceCounter = 0;

export class ExpressionBuilder implements ExpressionBuilderHandle
{
    private readonly opts: ExpressionBuilderOptions;
    private readonly id: string;
    private readonly facets = new Map<string, ExpressionBuilderFacet>();
    private root: GroupRow;
    private ret: string[] = [];
    /** What the last tree the builder reported or took means, to tell a change from an echo. */
    private meant: string;
    private problems: Placed[] = [];
    private announced = "";
    private destroyed = false;

    private el: HTMLElement | null = null;
    private body: HTMLElement | null = null;
    private message: HTMLElement | null = null;
    private live: HTMLElement | null = null;
    private gestures: { destroy(): void } | null = null;
    private dragFrom: number[] | null = null;
    private dropAt: { group: number[]; index: number } | null = null;
    /** Counts the value lists, so each has its own id. */
    private lists = 0;

    constructor(containerId: string, options: ExpressionBuilderOptions)
    {
        if (typeof window.createGestureRecognizer !== "function")
        {
            // TOUCH_EXPERIENCE.md section 9, item 3: drags go through the shared recognizer.
            throw new Error(`${LOG_PREFIX} The builder drags rows with window.createGestureRecognizer, which the `
                + "GestureRecognizer component publishes. Load gesturerecognizer.js before this one.");
        }
        const container = document.getElementById(containerId);
        if (!container)
        {
            throw new Error(`${LOG_PREFIX} Container "${containerId}" was not found. Insert the element first.`);
        }

        if (!Array.isArray(options?.facets))
        {
            throw new Error(`${LOG_PREFIX} options.facets is required: the keys a condition can use, as the list `
                + "FacetSearch takes.");
        }

        this.opts = options;
        this.id = "expressionbuilder-" + (++instanceCounter);
        for (const f of options.facets)
        {
            facetOps(f);
            this.facets.set(f.key.toLowerCase(), f);
        }
        this.root = rootOf(options.tree ?? {}, this.facets);
        this.ret = [...(options.tree?.return ?? [])];
        this.meant = JSON.stringify(meaning(treeOf(this.root, this.facets).root));

        this.build(container);
        this.render();
        logInfo("Initialized with", options.facets.length, "facets");
    }

    // ── Public API ──

    getTree(): QueryTree
    {
        return treeOf(this.root, this.facets, this.ret);
    }

    setParsed(parsed: { tree?: QueryTree; errors?: QueryDiagnostic[]; warnings?: QueryDiagnostic[] }): void
    {
        if (this.destroyed) { return; }

        if (parsed.tree)
        {
            const incoming = JSON.stringify(meaning(parsed.tree.root));
            if (incoming === this.meant && JSON.stringify(parsed.tree.return ?? []) === JSON.stringify(this.ret))
            {
                // The same query, back from the bar. The rows stay, so nothing a person is typing is lost,
                // and they take the parse's spans for placing its problems.
                this.adoptSpans(parsed.tree);
            }
            else
            {
                this.root = rootOf(parsed.tree, this.facets);
                this.ret = [...(parsed.tree.return ?? [])];
                this.meant = incoming;
                this.render();
                logDebug("A new tree replaced the rows");
            }
        }
        else
        {
            // No tree: the bar's text has errors, and its spans are not the rows'.
            clearSpans(this.root);
        }

        const found = [
            ...(parsed.errors ?? []).map((diagnostic) => ({ diagnostic, severity: "error" as const })),
            ...(parsed.warnings ?? []).map((diagnostic) => ({ diagnostic, severity: "warning" as const })),
        ];
        this.problems = found.map((f) => ({ ...f, path: this.rowFor(f.diagnostic) }));
        this.renderProblems();
    }

    focus(): void
    {
        this.el?.querySelector<HTMLElement>("select, input, button:not([disabled])")?.focus();
    }

    enable(): void
    {
        if (this.destroyed) { return; }
        this.opts.disabled = false;
        this.render();
    }

    disable(): void
    {
        if (this.destroyed) { return; }
        this.opts.disabled = true;
        this.render();
    }

    getElement(): HTMLElement | null { return this.el; }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.gestures?.destroy();
        this.gestures = null;
        this.el?.remove();
        this.el = this.body = this.message = this.live = null;
        logInfo("Destroyed");
    }

    // ── Spans and problems ──

    /** Gives the rows the spans of a parse that means what they do, leaf by leaf, then their groups. */
    private adoptSpans(tree: QueryTree): void
    {
        clearSpans(this.root);
        // The two mean the same, so they have the same leaves in the same order.
        const spans = tree.root ? leafSpans(tree.root) : [];
        leafRows(this.root, this.facets).forEach((r, i) => { r.span = spans[i]; });
        spanGroups(this.root);
    }

    /** The path of the deepest row whose text holds a problem, or null to show it above the rows. */
    private rowFor(d: QueryDiagnostic): number[] | null
    {
        if (d.start === undefined || d.end === undefined) { return null; }

        let best: number[] | null = null;
        const visit = (row: Row, path: number[]): void =>
        {
            if (row.span && row.span.start <= d.start! && d.end! <= row.span.end) { best = path; }
            if (row.kind === "group") { row.children.forEach((c, i) => visit(c, [...path, i])); }
        };
        this.root.children.forEach((c, i) => visit(c, [i]));
        return best;
    }

    // ── Changes ──

    /**
     * After an edit: drops the problems, whose places no longer hold, and reports the tree when what it means
     * changed. A draft, or a new group around one row, changes nothing it means, so it reports nothing.
     */
    private changed(): void
    {
        clearSpans(this.root);
        this.problems = [];
        this.renderProblems();

        const tree = this.getTree();
        const meant = JSON.stringify(meaning(tree.root));
        if (meant === this.meant) { return; }
        this.meant = meant;
        logDebug("The query changed");
        this.opts.onChange?.(tree);
    }

    /** Redraws, keeps the focus on the same control of the same row, and reports any change. */
    private edit(focusPath?: number[], focusRole?: string): void
    {
        const active = document.activeElement as HTMLElement | null;
        const path = focusPath ?? this.pathOf(active);
        const role = focusRole ?? active?.getAttribute("data-role") ?? null;
        this.render();
        if (path) { this.focusRow(path, role); }
        this.changed();
    }

    private pathOf(el: Element | null): number[] | null
    {
        const row = el?.closest<HTMLElement>("[data-path]");
        if (!row || !this.el?.contains(row)) { return null; }
        const p = row.getAttribute("data-path")!;
        return p === "" ? [] : p.split(".").map(Number);
    }

    private focusRow(path: number[], role: string | null): void
    {
        const row = this.el?.querySelector<HTMLElement>(`[data-path="${path.join(".")}"]`);
        if (!row) { return; }
        const own = (sel: string): HTMLElement | null =>
            Array.from(row.querySelectorAll<HTMLElement>(sel)).find((e) => e.closest("[data-path]") === row) ?? null;
        const target = (role ? own(`[data-role="${role}"]:not([disabled])`) : null)
            ?? own("select, input, button:not([disabled])");
        target?.focus();
    }

    private announce(msg: string): void
    {
        if (!this.live) { return; }
        this.live.textContent = "";
        requestAnimationFrame(() => { if (this.live) { this.live.textContent = msg; } });
    }

    // ── DOM ──

    private build(container: HTMLElement): void
    {
        this.el = createElement("div", [CLS]);
        setAttr(this.el, "id", this.id);
        setAttr(this.el, "role", "group");
        setAttr(this.el, "aria-label", "Query builder");
        if (this.opts.cssClass) { this.el.classList.add(this.opts.cssClass); }

        this.message = createElement("div", [`${CLS}-message`]);
        this.message.hidden = true;
        this.body = createElement("div", [`${CLS}-body`]);
        this.live = createElement("div", ["visually-hidden"]);
        setAttr(this.live, "role", "status");
        setAttr(this.live, "aria-live", "polite");

        this.el.append(this.message, this.body, this.live);
        this.el.addEventListener("keydown", (e) => this.onKeydown(e));
        container.appendChild(this.el);

        // One recognizer for every drag handle. A press anywhere else is the browser's.
        this.gestures = window.createGestureRecognizer!(this.el, {
            accept: (e: PointerEvent) => !this.opts.disabled
                && !!(e.target as Element | null)?.closest(`.${CLS}-drag`),
            onDragStart: (g) => this.dragStart(g.event),
            onDragMove: (g) => this.dragMove(g.x, g.y),
            onDragEnd: () => this.dragEnd(),
            onDragCancel: () => this.dragClear(),
        });
    }

    private render(): void
    {
        if (!this.body) { return; }
        while (this.body.firstChild) { this.body.removeChild(this.body.firstChild); }

        if (this.ret.length > 0)
        {
            this.body.appendChild(createElement("div", [`${CLS}-kept`, `${CLS}-return`],
                "Returns " + this.ret.map((r) => "?" + r).join(", ") + ". Edit this in the search bar."));
        }
        this.body.appendChild(this.renderGroup(this.root, []));
        this.renderProblems();
    }

    private renderRow(row: Row, path: number[]): HTMLElement
    {
        if (row.kind === "group") { return this.renderGroup(row, path); }

        const el = createElement("div", [`${CLS}-row`, `${CLS}-row-${row.kind}`]);
        setAttr(el, "data-path", path.join("."));
        setAttr(el, "role", "group");
        el.appendChild(this.dragHandle());
        el.appendChild(this.notToggle(row));

        if (row.kind === "filter") { this.renderFilter(el, row); }
        else if (row.kind === "text") { this.renderText(el, row); }
        else
        {
            el.appendChild(createElement("span", [`${CLS}-kept`], row.what + ". Edit this in the search bar."));
            setAttr(el, "aria-label", row.what);
        }
        el.appendChild(this.rowTools(path, false));
        return el;
    }

    private renderGroup(row: GroupRow, path: number[]): HTMLElement
    {
        const isRoot = path.length === 0;
        const el = createElement("div", [`${CLS}-group`]);
        setAttr(el, "data-path", path.join("."));
        setAttr(el, "role", "group");
        setAttr(el, "aria-label", (row.op === "and" ? "All of these" : "Any of these") + (row.nots % 2 ? ", not" : ""));
        if (path.length % 2 === 1) { el.classList.add(`${CLS}-group-odd`); }

        const head = createElement("div", [`${CLS}-group-head`]);
        if (!isRoot) { head.appendChild(this.dragHandle()); }
        head.appendChild(this.notToggle(row));

        const op = this.select("op", [["and", "All of these"], ["or", "Any of these"]], row.op, "How the rows join");
        op.addEventListener("change", () =>
        {
            row.op = (op as HTMLSelectElement).value as "and" | "or";
            this.edit(path, "op");
        });
        head.appendChild(op);

        for (const [kind, label, icon] of [["filter", "Condition", "bi-funnel"], ["text", "Words", "bi-fonts"],
            ["group", "Group", "bi-collection"]])
        {
            const add = this.button(`add-${kind}`, "Add " + label.toLowerCase(), icon, label);
            add.addEventListener("click", () => this.add(row, path, kind as "filter" | "text" | "group"));
            head.appendChild(add);
        }
        if (!isRoot) { head.appendChild(this.rowTools(path, true)); }
        el.appendChild(head);

        const list = createElement("div", [`${CLS}-rows`]);
        setAttr(list, "data-group", path.join("."));
        row.children.forEach((c, i) => list.appendChild(this.renderRow(c, [...path, i])));
        if (row.children.length === 0)
        {
            list.appendChild(createElement("div", [`${CLS}-empty`], "No rows yet. Add a condition, words or a group."));
        }
        el.appendChild(list);
        return el;
    }

    private renderFilter(el: HTMLElement, row: FilterRow): void
    {
        const facet = this.facets.get(row.key.toLowerCase());
        const keys = this.opts.facets.map((f): [string, string] => [f.key, f.label]);
        const key = this.select("key", [["", "Choose a key"], ...keys], row.key, "Key");
        key.addEventListener("change", () =>
        {
            const next = this.facets.get((key as HTMLSelectElement).value.toLowerCase());
            row.key = next?.key ?? "";
            row.op = next ? facetOps(next)[0] : "";
            row.values = [];
            row.original = [];
            if (next) { setOp(row, row.op); }
            this.edit(undefined, "key");
        });
        el.appendChild(key);
        if (!facet) { el.classList.add(`${CLS}-row-draft`); return; }

        // An operator the facet does not list stays on offer for this row, so a parse is never changed.
        const ops = facetOps(facet).includes(row.op) ? facetOps(facet) : [row.op, ...facetOps(facet)];
        const op = this.select("op", ops.map((o): [string, string] => [o, OP_LABELS[o] ?? o]), row.op, "Operator");
        op.addEventListener("change", () =>
        {
            setOp(row, (op as HTMLSelectElement).value);
            this.edit(undefined, "op");
        });
        el.appendChild(op);

        const values = createElement("span", [`${CLS}-values`]);
        row.values.forEach((_v, i) => values.appendChild(this.valueInput(row, facet, i)));
        if (arity(row.op) === "many")
        {
            const more = this.button("add-value", "Add a value", "bi-plus", "Value");
            more.addEventListener("click", () =>
            {
                row.values.push("");
                row.original.push(undefined);
                this.edit(undefined, `value-${row.values.length - 1}`);
            });
            values.appendChild(more);
        }
        el.appendChild(values);

        if (!isComplete(row, facet))
        {
            el.classList.add(`${CLS}-row-draft`);
            el.appendChild(createElement("span", [`${CLS}-draft`], "Needs a value"));
        }
    }

    /** An input for one value, by the facet's type. Typing changes the row; the query changes on commit. */
    private valueInput(row: FilterRow, facet: ExpressionBuilderFacet, i: number): HTMLElement
    {
        const role = `value-${i}`;
        const label = facet.label + (row.values.length > 1 ? " value " + (i + 1) : " value");
        let input: HTMLInputElement | HTMLSelectElement;

        if (facet.valueType === "boolean")
        {
            input = this.select(role, [["", "Choose"], ["true", "true"], ["false", "false"]], row.values[i], label);
        }
        else if (facet.valueType === "enum" && facet.values && !facet.loadValues)
        {
            const options = facet.values.map((v): [string, string] =>
                (typeof v === "string") ? [v, v] : [v.value, v.label]);
            input = this.select(role, [["", "Choose"], ...options], row.values[i], label);
        }
        else
        {
            input = document.createElement("input");
            input.type = (facet.valueType === "date") ? "date" : (facet.valueType === "number") ? "number" : "text";
            input.className = `form-control form-control-sm ${CLS}-value`;
            input.value = row.values[i];
            setAttr(input, "data-role", role);
            setAttr(input, "aria-label", label);
            input.disabled = !!this.opts.disabled;
        }

        input.addEventListener("input", () => { row.values[i] = input.value; });
        input.addEventListener("change", () =>
        {
            row.values[i] = input.value;
            this.edit(undefined, role);
        });

        const wrap = createElement("span", [`${CLS}-value-item`]);
        wrap.appendChild(input);
        if (input instanceof HTMLInputElement && (facet.values || facet.loadValues))
        {
            wrap.appendChild(this.suggestValues(input, facet));
        }
        if (arity(row.op) !== "many" || row.values.length === 1) { return wrap; }

        const remove = this.button(`remove-${i}`, "Remove " + label, "bi-x", "");
        remove.addEventListener("click", () =>
        {
            row.values.splice(i, 1);
            row.original.splice(i, 1);
            this.edit(undefined, "add-value");
        });
        wrap.appendChild(remove);
        return wrap;
    }

    /** The list a value input suggests from as a person types: a facet's `values`, or its `loadValues` answers. */
    private suggestValues(input: HTMLInputElement, facet: ExpressionBuilderFacet): HTMLDataListElement
    {
        const list = document.createElement("datalist");
        list.id = `${this.id}-values-${++this.lists}`;
        setAttr(input, "list", list.id);
        const fill = (values: ExpressionBuilderFacet["values"] = []): void =>
        {
            while (list.firstChild) { list.removeChild(list.firstChild); }
            for (const v of values)
            {
                const option = document.createElement("option");
                option.value = (typeof v === "string") ? v : v.value;
                if (typeof v !== "string") { option.label = v.label; }
                list.appendChild(option);
            }
        };
        fill(facet.values);
        if (facet.loadValues)
        {
            const load = facet.loadValues;
            input.addEventListener("input", () =>
            {
                load(input.value).then(fill).catch((err) => logError("Failed to load values:", err));
            });
        }
        return list;
    }

    private renderText(el: HTMLElement, row: TextRow): void
    {
        el.appendChild(createElement("span", [`${CLS}-label`], "Has the words"));
        const input = document.createElement("input");
        input.type = "text";
        input.className = `form-control form-control-sm ${CLS}-value`;
        input.value = row.phrase;
        input.disabled = !!this.opts.disabled;
        setAttr(input, "data-role", "phrase");
        setAttr(input, "aria-label", "Words to search for");
        input.addEventListener("input", () => { row.phrase = input.value; });
        input.addEventListener("change", () => { row.phrase = input.value; this.edit(undefined, "phrase"); });
        el.appendChild(input);
        if (!row.phrase.trim())
        {
            el.classList.add(`${CLS}-row-draft`);
            el.appendChild(createElement("span", [`${CLS}-draft`], "Needs words"));
        }
    }

    private select(role: string, options: Array<[string, string]>, value: string, label: string): HTMLSelectElement
    {
        const select = document.createElement("select");
        select.className = `form-select form-select-sm ${CLS}-select`;
        setAttr(select, "data-role", role);
        setAttr(select, "aria-label", label);
        for (const [v, text] of options)
        {
            const option = document.createElement("option");
            option.value = v;
            option.textContent = text;
            select.appendChild(option);
        }
        select.value = value;
        select.disabled = !!this.opts.disabled;
        return select;
    }

    private button(role: string, label: string, icon: string, text: string): HTMLButtonElement
    {
        const b = createElement("button",
            ["btn", "btn-sm", "btn-outline-secondary", `${CLS}-button`]) as HTMLButtonElement;
        b.type = "button";
        setAttr(b, "data-role", role);
        setAttr(b, "aria-label", label);
        setAttr(b, "title", label);
        const i = createElement("i", ["bi", icon]);
        setAttr(i, "aria-hidden", "true");
        b.appendChild(i);
        if (text) { b.appendChild(createElement("span", [`${CLS}-button-text`], text)); }
        b.disabled = !!this.opts.disabled;
        return b;
    }

    /** The drag handle: a pointer accelerator. The buttons beside it do every move by keyboard and tap. */
    private dragHandle(): HTMLElement
    {
        const handle = createElement("span", [`${CLS}-drag`]);
        setAttr(handle, "aria-hidden", "true");
        setAttr(handle, "title", "Drag to move");
        const i = createElement("i", ["bi", "bi-grip-vertical"]);
        handle.appendChild(i);
        return handle;
    }

    private notToggle(row: Row): HTMLButtonElement
    {
        const on = row.nots % 2 === 1;
        const b = this.button("not", on ? "Not: on" : "Not: off", "bi-slash-circle", "Not");
        setAttr(b, "aria-pressed", String(on));
        if (on) { b.classList.add("active"); }
        b.addEventListener("click", () =>
        {
            row.nots = (row.nots > 0) ? row.nots - 1 : 1;
            this.announce(row.nots % 2 ? "Not on" : "Not off");
            this.edit(undefined, "not");
        });
        return b;
    }

    private rowTools(path: number[], group: boolean): HTMLElement
    {
        const tools = createElement("span", [`${CLS}-tools`]);
        const parent = rowAt(this.root, path.slice(0, -1)).row as GroupRow;
        const index = path[path.length - 1];
        const actions: Array<[string, string, string, () => void, boolean]> = [
            ["up", "Move up", "bi-arrow-up", () => this.move(path, -1), index > 0],
            ["down", "Move down", "bi-arrow-down", () => this.move(path, 1), index < parent.children.length - 1],
            ["wrap", "Put in a group", "bi-collection", () => this.wrap(path), true],
        ];
        if (group)
        {
            const row = rowAt(this.root, path).row as GroupRow;
            actions.push(["unwrap", "Take the rows out of this group", "bi-box-arrow-up-left",
                () => this.unwrap(path), row.nots === 0]);
        }
        actions.push(["remove", group ? "Remove this group" : "Remove this row", "bi-trash", () => this.remove(path),
            true]);

        for (const [role, label, icon, act, enabled] of actions)
        {
            const b = this.button(role, label, icon, "");
            if (!enabled) { b.disabled = true; }
            b.addEventListener("click", act);
            tools.appendChild(b);
        }
        return tools;
    }

    // ── Actions ──

    private add(group: GroupRow, path: number[], kind: "filter" | "text" | "group"): void
    {
        const row: Row = (kind === "group") ? { kind: "group", op: "and", nots: 0, children: [] }
            : (kind === "text") ? { kind: "text", phrase: "", nots: 0 }
                : { kind: "filter", key: "", op: "", values: [], original: [], nots: 0 };
        group.children.push(row);
        this.announce(kind === "group" ? "Group added" : kind === "text" ? "Words added" : "Condition added");
        this.edit([...path, group.children.length - 1],
            kind === "filter" ? "key" : kind === "text" ? "phrase" : "op");
    }

    private move(path: number[], by: -1 | 1): void
    {
        const to = moveRow(this.root, path, by);
        if (!to) { return; }
        this.announce(by < 0 ? "Moved up" : "Moved down");
        this.edit(to, by < 0 ? "up" : "down");
    }

    private wrap(path: number[]): void
    {
        wrapRow(this.root, path);
        this.announce("Put in a group");
        this.edit(path, "op");
    }

    private unwrap(path: number[]): void
    {
        if (!unwrapRow(this.root, path)) { return; }
        this.announce("Group taken apart");
        this.edit(path);
    }

    private remove(path: number[]): void
    {
        const parentPath = path.slice(0, -1);
        removeRow(this.root, path);
        this.announce("Removed");
        const parent = rowAt(this.root, parentPath).row as GroupRow;
        const next = Math.min(path[path.length - 1], parent.children.length - 1);
        // The focus goes to the row that took its place, else to the group's own controls.
        this.edit(next >= 0 ? [...parentPath, next] : parentPath, next >= 0 ? undefined : "add-filter");
    }

    // ── Keyboard ──

    private onKeydown(e: KeyboardEvent): void
    {
        if (this.opts.disabled) { return; }
        const path = this.pathOf(e.target as Element);
        if (!path || path.length === 0) { return; }

        for (const by of [-1, 1] as const)
        {
            const action = (by < 0) ? "moveUp" : "moveDown";
            if (this.matches(e, action))
            {
                e.preventDefault();
                const role = (e.target as HTMLElement).getAttribute("data-role") ?? undefined;
                const to = moveRow(this.root, path, by);
                if (!to) { return; }
                this.announce(by < 0 ? "Moved up" : "Moved down");
                this.edit(to, role);
                return;
            }
        }
    }

    private matches(e: KeyboardEvent, action: string): boolean
    {
        const combo = this.opts.keyBindings?.[action] ?? DEFAULT_KEY_BINDINGS[action];
        const parts = combo.split("+");
        const key = parts[parts.length - 1];
        return e.key === key && e.altKey === parts.includes("Alt") && e.ctrlKey === parts.includes("Ctrl")
            && e.shiftKey === parts.includes("Shift") && e.metaKey === parts.includes("Meta");
    }

    // ── Drag ──

    private dragStart(e: PointerEvent): void
    {
        this.dragFrom = this.pathOf(e.target as Element);
        if (!this.dragFrom || this.dragFrom.length === 0) { this.dragFrom = null; return; }
        this.el?.querySelector(`[data-path="${this.dragFrom.join(".")}"]`)?.classList.add(`${CLS}-dragging`);
        logDebug("Drag started at", this.dragFrom.join("."));
    }

    /** Finds where the row would go: before or after the row under the pointer, or into an empty group. */
    private dragMove(x: number, y: number): void
    {
        if (!this.dragFrom || !this.el) { return; }
        logTrace("drag move:", Math.round(x), Math.round(y));
        this.el.querySelectorAll(`.${CLS}-drop-before, .${CLS}-drop-after, .${CLS}-drop-into`).forEach((n) =>
            n.classList.remove(`${CLS}-drop-before`, `${CLS}-drop-after`, `${CLS}-drop-into`));
        this.dropAt = null;

        const under = document.elementFromPoint(x, y);
        const list = under?.closest<HTMLElement>(`.${CLS}-rows`);
        if (!list || !this.el.contains(list)) { return; }

        const groupPath = list.getAttribute("data-group")!;
        const group = groupPath === "" ? [] : groupPath.split(".").map(Number);
        const target = under?.closest<HTMLElement>(`.${CLS}-row, .${CLS}-group`);
        let index = (rowAt(this.root, group).row as GroupRow).children.length;
        let mark: HTMLElement = list;
        let cls = `${CLS}-drop-into`;

        if (target && target.parentElement === list)
        {
            const box = target.getBoundingClientRect();
            const after = y > box.top + box.height / 2;
            const i = Number(target.getAttribute("data-path")!.split(".").pop());
            index = after ? i + 1 : i;
            mark = target;
            cls = after ? `${CLS}-drop-after` : `${CLS}-drop-before`;
        }
        if (isWithin(group, this.dragFrom)) { return; }
        this.dropAt = { group, index };
        mark.classList.add(cls);
    }

    private dragEnd(): void
    {
        const from = this.dragFrom;
        const at = this.dropAt;
        this.dragClear();
        if (!from || !at) { return; }

        const to = moveRowTo(this.root, from, at.group, at.index);
        if (!to) { return; }
        this.announce("Moved");
        this.edit(to, "up");
    }

    private dragClear(): void
    {
        this.el?.querySelectorAll(`.${CLS}-dragging, .${CLS}-drop-before, .${CLS}-drop-after, .${CLS}-drop-into`)
            .forEach((n) => n.classList.remove(`${CLS}-dragging`, `${CLS}-drop-before`, `${CLS}-drop-after`,
                `${CLS}-drop-into`));
        this.dragFrom = null;
        this.dropAt = null;
    }

    // ── Problems ──

    /** Shows each problem on its row, and the rest above the rows, and announces a new set once. */
    private renderProblems(): void
    {
        if (!this.el || !this.message) { return; }
        this.el.querySelectorAll(`.${CLS}-problem`).forEach((n) => n.remove());
        this.el.querySelectorAll(`.${CLS}-has-error, .${CLS}-has-warning`).forEach((n) =>
            n.classList.remove(`${CLS}-has-error`, `${CLS}-has-warning`));
        while (this.message.firstChild) { this.message.removeChild(this.message.firstChild); }

        const above = this.problems.filter((p) => !p.path || !this.rowEl(p.path));
        for (const p of this.problems)
        {
            const row = p.path ? this.rowEl(p.path) : null;
            const line = this.problemLine(p);
            if (row)
            {
                row.classList.add(`${CLS}-has-${p.severity}`);
                row.appendChild(line);
            }
        }
        above.forEach((p) => this.message!.appendChild(this.problemLine(p)));
        this.message.hidden = above.length === 0;

        const codes = this.problems.map((p) => p.severity + ":" + p.diagnostic.code).join(" ");
        if (this.problems.length > 0 && codes !== this.announced)
        {
            this.announced = codes;
            const n = this.problems.length;
            this.announce(n + (n === 1 ? " problem" : " problems") + " in the query. "
                + this.problemText(this.problems[0].diagnostic));
        }
    }

    private rowEl(path: number[]): HTMLElement | null
    {
        return this.el?.querySelector<HTMLElement>(`[data-path="${path.join(".")}"]`) ?? null;
    }

    private problemText(d: QueryDiagnostic): string
    {
        return [d.title + (/[.!?]$/.test(d.title) ? "" : "."), d.detail, d.suggestion ?? ""].filter(Boolean).join(" ");
    }

    private problemLine(p: Placed): HTMLElement
    {
        const line = createElement("div", [`${CLS}-problem`, `${CLS}-problem-${p.severity}`]);
        const icon = createElement("span", [`${CLS}-problem-icon`]);
        setAttr(icon, "aria-hidden", "true");
        icon.appendChild(createElement("i", ["bi",
            p.severity === "error" ? "bi-exclamation-circle-fill" : "bi-exclamation-triangle-fill"]));
        line.append(icon, createElement("span", ["visually-hidden"], p.severity === "error" ? "Error: " : "Warning: "),
            createElement("span", [`${CLS}-problem-text`], this.problemText(p.diagnostic)));
        return line;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/** Creates an ExpressionBuilder in the element with `containerId`. */
export function createExpressionBuilder(containerId: string, options: ExpressionBuilderOptions): ExpressionBuilderHandle
{
    return new ExpressionBuilder(containerId, options);
}

if (typeof window !== "undefined")
{
    window["createExpressionBuilder"] = createExpressionBuilder;
}
