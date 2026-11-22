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
 *    API's Parse call returns: groups joined by `and` or `or`, `not`, filters,
 *    free text, searches inside a relationship (`where`), conditions on a
 *    link, and variables. The search bar edits the same query as text, and the
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
 * WHAT IT CANNOT EDIT IT KEEPS (UI_EXPERIENCE.md section 5.7). A parameter,
 * a value it has no editor for, a key with no facet, a variable or a
 * nested search on a key that is not a relationship, and `return` are
 * shown read-only, kept in place, and reported exactly as they came.
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
    /**
     * The key links to an item or a person, such as `rel.created_by` or `created_by` (spec section 9). A
     * condition on it can be "the same item as" another, which writes a variable, can have a search inside it
     * with `where`, and, with `link`, conditions on the link. Its values are item ids, as `resource` values.
     */
    relationship?: boolean;
    /** The link's own fields, for `link ( … )` on this key: provenance, confidence, at, and its properties. */
    link?: ExpressionBuilderFacet[];
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
    "where": "has one where",
};

/** What a person reads for an operator between two variables. */
const COMPARE_LABELS: Record<string, string> = {
    "equals": "is the same item as", "not-equals": "is not the same item as",
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
//
// SCOPES. Inside `link ( … )` the keys are the link's own fields, which the
// relationship's facet lists in `link`. Everywhere else, including inside a
// `where`, they are the builder's facets. A group says which: `linkOf` names
// the relationship key whose link fields apply.

export interface Span { start: number; end: number }

/** A step from a row: a child's index in a group, or into a condition's `where` or `link` group. */
export type Step = number | "where" | "link";

interface RowBase
{
    /** How many `not`s wrap the row. Two are kept as two, not dropped. */
    nots: number;
    /** Where the row's text is in the bar, from the last parse that matches what the builder holds. */
    span?: Span;
}

export interface GroupRow extends RowBase
{
    kind: "group";
    op: "and" | "or";
    children: Row[];
    /** Set inside `link ( … )`: the relationship key whose link fields its rows use. */
    linkOf?: string;
    /**
     * A group a person made or changed. It draws a solid bracket where the precedence already gives the same
     * reading, so a group the person sees does not vanish (spec 4.3). The tree is the same without it.
     */
    bracket?: true;
}

export interface FilterRow extends RowBase
{
    kind: "filter";
    key: string;
    /** An operator word, or "where" for a search inside the item at the other end. */
    op: string;
    /** As the inputs hold them. */
    values: string[];
    /** The value each came from, so an edited date keeps its zone. */
    original: Array<QueryValue | undefined>;
    /** The variable the row's value is, without its `?`, for "the same item as" another row. */
    variable?: string;
    /** The search inside, while the operator is "where". Kept when it changes, so nothing is lost. */
    where?: GroupRow;
    /** Conditions on the link itself. */
    link?: GroupRow;
}

export interface TextRow extends RowBase { kind: "text"; phrase: string }

/** Two variables compared, such as `?approver not-equals ?doer`. */
export interface CompareRow extends RowBase { kind: "compare"; left: string; op: string; right: string }

/** A part of the query the builder cannot edit, kept as it came, with what it is. */
export interface KeptRow extends RowBase { kind: "kept"; node: QueryNode; what: string }

export type Row = GroupRow | FilterRow | TextRow | CompareRow | KeptRow;

type Facets = Map<string, ExpressionBuilderFacet>;

/** A facet list by lower-case key. */
export function facetMap(list: ExpressionBuilderFacet[]): Facets
{
    return new Map(list.map((f) => [f.key.toLowerCase(), f]));
}

/** The facets a group's rows use: a relationship's link fields inside its `link`, else the builder's. */
function scopeOf(facets: Facets, linkOf: string | undefined): Facets
{
    return linkOf ? facetMap(facets.get(linkOf.toLowerCase())?.link ?? []) : facets;
}

/** A copy of a node without its spans, as the builder reports every node. */
function withoutSpans(node: QueryNode): QueryNode
{
    return JSON.parse(JSON.stringify(node, (k, v) => (k === "span" ? undefined : v)));
}

/**
 * A value as the input holds it, or null when the builder has no editor for it on this facet. A value on a
 * relationship key is an item's id, which the API's binder writes as `resource`.
 */
function valueText(v: QueryValue, facet: ExpressionBuilderFacet): string | null
{
    const t = facet.valueType;
    if (facet.relationship && v.resource !== undefined) { return v.resource; }
    if ((t === "text" || t === "enum") && v.text !== undefined) { return v.text; }
    if (t === "number" && v.number !== undefined) { return String(v.number); }
    if (t === "boolean" && v.boolean !== undefined) { return String(v.boolean); }
    if (t === "date" && v.date !== undefined && v.time === undefined) { return v.date; }
    return null;
}

/** Why a node is kept as it came, or null when the builder can edit it. */
function keptWhy(node: QueryNode, scope: Facets, inLink: boolean): string | null
{
    const facet = scope.get((node.key ?? "").toLowerCase());
    const takesLinks = !!facet?.relationship && !inLink;

    if (node.kind === "nested")
    {
        return takesLinks ? null : "A search inside " + (node.key ?? "a key") + ", which is not a relationship key";
    }
    if (node.kind === "compare")
    {
        const ok = !inLink && node.left?.var !== undefined && node.right?.var !== undefined && !!node.op
            && opWord(node.op) !== null;
        return ok ? null : "A comparison this builder has no editor for";
    }
    if (node.kind !== "filter") { return "A part of the query of the kind " + node.kind; }
    if (!facet) { return "A filter on " + (node.key ?? "a key") + ", which has no facet"; }
    if (node.link && !takesLinks) { return "A filter with a link condition on a key that takes none"; }
    if (!node.op || !opWord(node.op)) { return "A filter with the operator " + (node.op ?? "(none)"); }

    const values = node.values ?? (node.value ? [node.value] : []);
    if (values.some((v) => v.param !== undefined)) { return "A filter on a parameter"; }
    if (values.some((v) => v.var !== undefined))
    {
        // A variable stands alone after `equals`, on a key that links to an item or a person (spec section 9).
        const alone = takesLinks && opWord(node.op) === "equals" && values.length === 1;
        return alone ? null : "A filter on a variable this builder has no editor for";
    }
    if (values.some((v) => valueText(v, facet) === null))
    {
        return "A filter with a value this builder has no editor for";
    }
    return null;
}

/** A node as a group: itself when it is one, with no `not`, else in a group of its own. */
function groupOf(node: QueryNode | undefined, facets: Facets, linkOf: string | undefined): GroupRow
{
    const empty: GroupRow = { kind: "group", op: "and", nots: 0, children: [], ...(linkOf ? { linkOf } : {}) };
    if (!node) { return empty; }

    const row = rowOf(node, facets, linkOf);
    if (row.kind === "group" && row.nots === 0) { return row; }
    return { ...empty, children: [row], span: row.span };
}

/** The rows of a node, in the scope `linkOf` names. A row of `not`s around a node counts them. */
export function rowOf(node: QueryNode, facets: Facets, linkOf?: string): Row
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
        return { kind: "group", op: node.kind, nots, span, ...(linkOf ? { linkOf } : {}),
            children: (node.children ?? []).map((c) => rowOf(c, facets, linkOf)) };
    }
    if (node.kind === "text" && node.phrase !== undefined)
    {
        return { kind: "text", phrase: node.phrase, nots, span };
    }

    const scope = scopeOf(facets, linkOf);
    const why = keptWhy(node, scope, !!linkOf);
    if (why !== null) { return { kind: "kept", node: withoutSpans(node), what: why, nots, span }; }

    if (node.kind === "compare")
    {
        return { kind: "compare", left: node.left!.var!, op: opWord(node.op!)!, right: node.right!.var!, nots, span };
    }

    const facet = scope.get(node.key!.toLowerCase())!;
    const link = node.link ? { link: groupOf(node.link, facets, facet.key) } : {};
    if (node.kind === "nested")
    {
        return { kind: "filter", key: facet.key, op: "where", values: [], original: [], nots, span,
            where: groupOf(node.where, facets, undefined), ...link };
    }

    const values = node.values ?? (node.value ? [node.value] : []);
    const variable = values[0]?.var;
    if (variable !== undefined)
    {
        return { kind: "filter", key: facet.key, op: "equals", values: [""], original: [undefined], variable,
            nots, span, ...link };
    }
    return { kind: "filter", key: facet.key, op: opWord(node.op!)!, nots, span, ...link,
        values: values.map((v) => valueText(v, facet)!), original: values.map((v) => ({ ...v })) };
}

/** The root row of a tree: always a group, so a person can add beside a single filter. */
export function rootOf(tree: QueryTree, facets: Facets): GroupRow
{
    if (!tree.root) { return { kind: "group", op: "and", nots: 0, children: [] }; }

    const row = rowOf(tree.root, facets);
    if (row.kind === "group" && row.nots === 0) { return row; }
    return { kind: "group", op: "and", nots: 0, children: [row], span: row.span };
}

/** Every row, depth first, with its path: the children of groups, then a condition's link and where groups. */
export function* allRows(row: Row, path: Step[] = []): Generator<{ row: Row; path: Step[] }>
{
    yield { row, path };
    if (row.kind === "group")
    {
        for (let i = 0; i < row.children.length; i += 1) { yield* allRows(row.children[i], [...path, i]); }
    }
    else if (row.kind === "filter")
    {
        if (row.link) { yield* allRows(row.link, [...path, "link"]); }
        if (row.where) { yield* allRows(row.where, [...path, "where"]); }
    }
}

/** The variable names in a node, as many times as it uses each. */
function nodeVariables(node: unknown, out: string[]): string[]
{
    if (Array.isArray(node)) { node.forEach((n) => nodeVariables(n, out)); }
    else if (node && typeof node === "object")
    {
        for (const [k, v] of Object.entries(node))
        {
            if (k === "var" && typeof v === "string") { out.push(v); }
            else { nodeVariables(v, out); }
        }
    }
    return out;
}

/**
 * How many times the query uses each variable. Rule 1 of spec section 9: a variable appears at least twice,
 * and `return` counts as one use. So a row with a variable used once is a draft, which the tree leaves out.
 */
export function variableUses(root: GroupRow, ret: string[]): Map<string, number>
{
    const uses = new Map<string, number>();
    const add = (name: string): void => { uses.set(name, (uses.get(name) ?? 0) + 1); };

    // Only what the tree can hold: a search inside counts while its operator is "where", as the tree has it.
    const visit = (row: Row): void =>
    {
        if (row.kind === "group") { row.children.forEach(visit); }
        else if (row.kind === "compare") { [row.left, row.right].filter(Boolean).forEach(add); }
        else if (row.kind === "kept") { nodeVariables(row.node, []).forEach(add); }
        else if (row.kind === "filter")
        {
            // setOp and a new key clear a variable, so a row holds one only after `equals`.
            if (row.variable) { add(row.variable); }
            if (row.link) { visit(row.link); }
            if (row.where && row.op === "where") { visit(row.where); }
        }
    };
    ret.forEach(add);
    visit(root);
    return uses;
}

/** A name for a new variable, from the key it first stands for, such as `?created_by`, and unused so far. */
export function newVariable(key: string, taken: Set<string>): string
{
    let base = (key.split(".").pop() ?? "item").replace(/[^\p{L}\p{N}_]/gu, "_");
    if (!/^[\p{L}_]/u.test(base)) { base = "_" + base; }
    let name = base;
    for (let n = 2; taken.has(name); n += 1) { name = base + n; }
    return name;
}

/** Whether a filter row has what its operator needs, so Print accepts it. "where" is decided by its rows. */
export function isComplete(row: FilterRow, facet: ExpressionBuilderFacet | undefined,
    uses: Map<string, number> = new Map()): boolean
{
    if (!facet || !row.op) { return false; }
    if (row.op === "where") { return true; }
    if (row.variable !== undefined) { return row.op === "equals" && (uses.get(row.variable) ?? 0) >= 2; }

    const filled = row.values.filter((v) => v.trim() !== "");
    const fits = (v: string): boolean =>
        (facet.relationship) ? true
            : (facet.valueType === "number") ? v.trim() !== "" && Number.isFinite(Number(v))
                : (facet.valueType === "date") ? /^\d{4}-\d{2}-\d{2}$/.test(v)
                    : (facet.valueType === "boolean") ? v === "true" || v === "false" : true;

    switch (arity(row.op))
    {
        case "none": return true;
        case "many": return filled.length > 0 && filled.every(fits);
        default: return filled.length === 1 && fits(filled[0]);
    }
}

/** A value from what the input holds. A date keeps the zone of the one it came from; an item's id is a resource. */
function valueOf(text: string, original: QueryValue | undefined, facet: ExpressionBuilderFacet): QueryValue
{
    if (facet.relationship) { return { resource: text }; }
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

/** What building a tree needs: the facets, the variables' uses, and the rows that made nodes, in text order. */
interface Build { facets: Facets; uses: Map<string, number>; order: Row[] }

/**
 * A row's node in a scope, or null for a draft or an empty group, which the tree leaves out. Each row that
 * makes a node joins `order` before the rows inside it, as its text comes before theirs:
 * `key link ( … ) where ( … )`.
 */
function nodeIn(row: Row, b: Build, scope: Facets): QueryNode | null
{
    if (row.kind === "group")
    {
        const inner = row.linkOf ? scopeOf(b.facets, row.linkOf) : scope;
        const children = row.children.map((c) => nodeIn(c, b, inner)).filter((n): n is QueryNode => n !== null);
        return (children.length === 0) ? null : negate({ kind: row.op, children }, row.nots);
    }

    const at = b.order.length;
    b.order.push(row);
    const node = leafNode(row, b, scope);
    if (!node) { b.order.length = at; }
    return node ? negate(node, row.nots) : null;
}

/** A where or link group's node: a group of one, with no `not`, is that one, as Print writes it. */
function bare(node: QueryNode | null, group: GroupRow): QueryNode | null
{
    return (node && group.nots === 0 && node.children?.length === 1) ? node.children[0] : node;
}

/** The node of a row that is not a group, without its `not`s. */
function leafNode(row: Exclude<Row, GroupRow>, b: Build, scope: Facets): QueryNode | null
{
    if (row.kind === "text") { return row.phrase.trim() ? { kind: "text", phrase: row.phrase.trim() } : null; }
    if (row.kind === "kept") { return withoutSpans(row.node); }
    if (row.kind === "compare")
    {
        const ok = row.left && row.right && row.left !== row.right && row.op;
        return ok ? { kind: "compare", left: { var: row.left }, op: opName(row.op), right: { var: row.right } } : null;
    }

    const facet = scope.get(row.key.toLowerCase());
    if (!facet) { return null; }

    const link = (row.link && facet.relationship) ? bare(nodeIn(row.link, b, scope), row.link) : null;
    const withLink = (node: QueryNode): QueryNode => (link ? { ...node, link } : node);

    if (row.op === "where")
    {
        const where = row.where ? bare(nodeIn(row.where, b, b.facets), row.where) : null;
        return where ? withLink({ kind: "nested", key: row.key, where }) : null;
    }
    if (!isComplete(row, facet, b.uses)) { return null; }

    const node: QueryNode = { kind: "filter", key: row.key, op: opName(row.op) };
    if (row.variable !== undefined) { node.value = { var: row.variable }; }
    else
    {
        const values = row.values.filter((v) => v.trim() !== "").map((v, i) => valueOf(v, row.original[i], facet));
        if (arity(row.op) === "many") { node.values = values; }
        else if (arity(row.op) === "one") { node.value = values[0]; }
    }
    return withLink(node);
}

/** A row's node, or null for a draft or an empty group. */
export function nodeOf(row: Row, facets: Facets, uses: Map<string, number> = new Map()): QueryNode | null
{
    return nodeIn(row, { facets, uses, order: [] }, facets);
}

/** The tree the rows make, and the rows that made its nodes, in the order of their text. */
export function buildTree(root: GroupRow, facets: Facets, ret: string[] = []): { tree: QueryTree; order: Row[] }
{
    const b: Build = { facets, uses: variableUses(root, ret), order: [] };
    const tree: QueryTree = {};
    const node = nodeIn(root, b, facets);

    if (node && root.nots === 0 && node.children?.length === 1) { tree.root = node.children[0]; }
    else if (node) { tree.root = node; }
    if (ret.length > 0) { tree.return = [...ret]; }
    return { tree, order: b.order };
}

/** The tree the rows make. A root group of one node, with no `not`, is that node. */
export function treeOf(root: GroupRow, facets: Facets, ret?: string[]): QueryTree
{
    return buildTree(root, facets, ret).tree;
}

/** A copy with each object's keys in order, so two trees compare the same whichever order their fields came. */
function canonical(v: unknown): unknown
{
    if (Array.isArray(v)) { return v.map(canonical); }
    if (v && typeof v === "object")
    {
        return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical((v as Record<string, unknown>)[k])]));
    }
    return v;
}

/**
 * A node in the form that says only what it means: no spans, a group of one is that one, and a group inside
 * a group of the same kind joins it, at every depth, inside `not`, `where` and `link` too. Print writes both
 * forms the same way, so a tree that comes back from the bar compares equal to the one the builder sent.
 */
export function meaning(node: QueryNode | undefined): unknown
{
    if (!node) { return null; }
    if (node.kind === "and" || node.kind === "or")
    {
        const children: unknown[] = [];
        for (const child of node.children ?? [])
        {
            const c = meaning(child) as { kind?: string; children?: unknown[] };
            if (c && c.kind === node.kind && c.children) { children.push(...c.children); }
            else { children.push(c); }
        }
        return (children.length === 1) ? children[0] : { children, kind: node.kind };
    }

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node))
    {
        if (k === "span") { continue; }
        out[k] = (k === "child" || k === "where" || k === "link") ? meaning(v as QueryNode) : canonical(v);
    }
    return canonical(out);
}

/**
 * The span of each node that is not a group, in the order of its text: itself, then its `link`, then its
 * `where`. A node under `not`s takes the outermost `not`'s span. Its order is `buildTree`'s.
 */
function spanOrder(node: QueryNode, outer?: Span): Array<Span | undefined>
{
    if (node.kind === "not" && node.child) { return spanOrder(node.child, outer ?? node.span); }
    if (node.kind === "and" || node.kind === "or") { return (node.children ?? []).flatMap((c) => spanOrder(c)); }
    return [outer ?? node.span, ...(node.link ? spanOrder(node.link) : []),
        ...(node.kind === "nested" && node.where ? spanOrder(node.where) : [])];
}

/** Gives each group the span that covers its rows', once its rows have theirs, at every depth. */
function spanGroups(row: Row): Span | undefined
{
    if (row.kind === "filter")
    {
        if (row.link) { spanGroups(row.link); }
        if (row.where) { spanGroups(row.where); }
    }
    if (row.kind !== "group") { return row.span; }

    const spans = row.children.map(spanGroups).filter((s): s is Span => s !== undefined);
    row.span = (spans.length === 0) ? undefined
        : { start: Math.min(...spans.map((s) => s.start)), end: Math.max(...spans.map((s) => s.end)) };
    return row.span;
}

/** Clears every span, once the bar's text no longer matches the rows. */
function clearSpans(root: Row): void
{
    for (const { row } of allRows(root)) { row.span = undefined; }
}

// ============================================================================
// LEVELS: the grid's view of the tree (spec section 4)
// ============================================================================
//
// A level is a group's items, in order: rows, and groups drawn with a solid
// bracket. Each item joins the one above it with `and` or `or`. The first
// item's join is not shown and does not count. A group that reads the same
// as its parent's level joins that level, so the grid shows only the groups
// the meaning needs, and the ones a person made.

/** How an item joins the item above it. */
export type Join = "and" | "or";

/** A row, or a group with a solid bracket, in a level. */
export interface Item { row: Row; join: Join }

/** An item's index in each level, from the top. A group's level is inside its item. */
export type ItemPath = number[];

/** Where items can go: before the item at `index` of a level, or at its end. */
export interface Place { level: ItemPath; index: number }

/** Items next to each other, by their first and last index. */
export interface Run { start: number; end: number }

/** A group whose items join its parent's level: same op, or an `and` run in an `or`, with no `not` or mark. */
function joinsLevel(child: Row, parent: GroupRow): child is GroupRow
{
    return child.kind === "group" && child.nots === 0 && !child.bracket
        && (child.op === parent.op || (parent.op === "or" && child.op === "and"));
}

/** A group's level, by spec 4.1. */
export function levelOf(group: GroupRow): Item[]
{
    const items: Item[] = [];
    const visit = (g: GroupRow, first: Join): void =>
    {
        g.children.forEach((c, i) =>
        {
            const join = (i === 0) ? first : g.op;
            if (joinsLevel(c, g)) { visit(c, join); }
            else { items.push({ row: c, join: (items.length === 0) ? "and" : join }); }
        });
    };
    visit(group, "and");
    return items;
}

/** Each run of a level: split at each item joined with `or`. */
export function runsOf(items: Item[]): Run[]
{
    const runs: Run[] = [];
    items.forEach((it, i) =>
    {
        if (i === 0 || it.join === "or") { runs.push({ start: i, end: i }); }
        else { runs[runs.length - 1].end = i; }
    });
    return runs;
}

/**
 * Writes a level back into its group, by spec 4.2: one run is an `and` group, more are an `or` of runs, and a
 * run of two or more is an `and` group of its own. The group keeps its `not`s, mark, link key and span.
 */
export function setLevel(group: GroupRow, items: Item[]): void
{
    const runs = runsOf(items).map((r) => items.slice(r.start, r.end + 1).map((it) => it.row));
    if (runs.length <= 1)
    {
        group.op = "and";
        group.children = runs[0] ?? [];
        return;
    }
    group.op = "or";
    group.children = runs.map((rows): Row => (rows.length === 1) ? rows[0] : { kind: "group", op: "and", nots: 0,
        children: rows, ...(group.linkOf ? { linkOf: group.linkOf } : {}) });
}

/** The group of the level at an item path. The root's level is at []. */
export function levelAt(root: GroupRow, level: ItemPath): GroupRow
{
    let group = root;
    for (const i of level) { group = levelOf(group)[i].row as GroupRow; }
    return group;
}

/** The item at a path, with its level, the level's items and its index there. */
export function itemAt(root: GroupRow, path: ItemPath): { level: GroupRow; items: Item[]; index: number; item: Item }
{
    const level = levelAt(root, path.slice(0, -1));
    const items = levelOf(level);
    const index = path[path.length - 1];
    return { level, items, index, item: items[index] };
}

/** The item path of a row or a group, found by the row itself, or null when the grid does not show it. */
export function itemPathOf(root: GroupRow, row: Row, at: ItemPath = []): ItemPath | null
{
    const items = levelOf(root);
    for (let i = 0; i < items.length; i += 1)
    {
        const here = [...at, i];
        if (items[i].row === row) { return here; }
        const inner = items[i].row;
        const found = (inner.kind === "group") ? itemPathOf(inner, row, here) : null;
        if (found) { return found; }
    }
    return null;
}

/** How many bracket columns a group's grid needs: one for its level, and one for each level of groups in it. */
export function levelDepth(group: GroupRow): number
{
    const inner = levelOf(group).map((it) => (it.row.kind === "group" ? levelDepth(it.row) : 0));
    return 1 + Math.max(0, ...inner);
}

/** An item path from its text in the page, such as "2.0". */
export function parseItemPath(text: string): ItemPath
{
    return (text === "") ? [] : text.split(".").map(Number);
}

// ============================================================================
// EDITS (pure, on the model)
// ============================================================================

/**
 * The row at a path from the root, and the group it sits in with its index there. A `where` or `link` group
 * sits in a condition, not a group, so its parent is null, and it does not move.
 */
export function rowAt(root: GroupRow, path: Step[]): { row: Row; parent: GroupRow | null; index: number }
{
    let row: Row = root;
    let parent: GroupRow | null = null;
    let index = -1;
    for (const step of path)
    {
        if (typeof step === "number")
        {
            parent = row as GroupRow;
            index = step;
            row = parent.children[step];
        }
        else
        {
            row = (row as FilterRow)[step]!;
            parent = null;
            index = -1;
        }
    }
    return { row, parent, index };
}

/** A path from its text in the page, such as "0.where.1". */
export function parsePath(text: string): Step[]
{
    return text === "" ? [] : text.split(".").map((t) => (/^\d+$/.test(t) ? Number(t) : t as "where" | "link"));
}

/** Moves a row one place up or down among its group's rows. Returns its new path, or null when it cannot. */
export function moveRow(root: GroupRow, path: Step[], by: -1 | 1): Step[] | null
{
    const { parent, index } = rowAt(root, path);
    const to = index + by;
    if (!parent || to < 0 || to >= parent.children.length) { return null; }

    [parent.children[index], parent.children[to]] = [parent.children[to], parent.children[index]];
    return [...path.slice(0, -1), to];
}

/** Puts a row in a new `and` group of its own, in its place and its scope. Returns the group's path. */
export function wrapRow(root: GroupRow, path: Step[]): Step[]
{
    const { row, parent, index } = rowAt(root, path);
    if (!parent) { return path; }

    parent.children[index] = { kind: "group", op: "and", nots: 0, children: [row],
        ...(parent.linkOf ? { linkOf: parent.linkOf } : {}) };
    return path;
}

/** Puts a group's rows in its place. A group with `not` keeps it, so this refuses one. */
export function unwrapRow(root: GroupRow, path: Step[]): boolean
{
    const { row, parent, index } = rowAt(root, path);
    if (!parent || row.kind !== "group" || row.nots > 0) { return false; }

    parent.children.splice(index, 1, ...row.children);
    return true;
}

/** Removes a row. */
export function removeRow(root: GroupRow, path: Step[]): void
{
    const { parent, index } = rowAt(root, path);
    if (parent) { parent.children.splice(index, 1); }
}

/** Whether `inner` is `outer` or inside it, so a drag cannot put a group in itself. */
function isWithin(inner: Step[], outer: Step[]): boolean
{
    return outer.length <= inner.length && outer.every((v, i) => inner[i] === v);
}

/** The path of a row, found by the row itself. */
export function pathOfRow(root: GroupRow, target: Row): Step[] | null
{
    for (const { row, path } of allRows(root))
    {
        if (row === target) { return path; }
    }
    return null;
}

/**
 * Moves a row to a place in a group: the group's path, and the index the row takes there as the group stands
 * before the move. Returns the row's new path, or null when the group is the row or inside it, or uses other
 * keys: a link's fields and the builder's facets do not mix.
 */
export function moveRowTo(root: GroupRow, from: Step[], toGroup: Step[], toIndex: number): Step[] | null
{
    if (isWithin(toGroup, from)) { return null; }

    const { row, parent, index } = rowAt(root, from);
    const group = rowAt(root, toGroup).row;
    if (!parent || group.kind !== "group" || (parent.linkOf ?? "") !== (group.linkOf ?? "")) { return null; }

    // The row it goes before, found again once the row has left its place.
    const before = group.children[toIndex];
    parent.children.splice(index, 1);
    const at = (before === undefined) ? group.children.length
        : (before === row) ? index : group.children.indexOf(before);
    group.children.splice(at, 0, row);
    return pathOfRow(root, row);
}

/**
 * Sets a filter's operator, and fits its values to it: none, one, or a list. A variable stands only after
 * `equals`. The search inside is kept when the operator changes, so changing back loses nothing.
 */
export function setOp(row: FilterRow, op: string): void
{
    row.op = op;
    if (op !== "equals") { row.variable = undefined; }
    if (op === "where")
    {
        row.values = [];
        row.original = [];
        row.where ??= { kind: "group", op: "and", nots: 0, children: [] };
        return;
    }
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
interface Placed { diagnostic: QueryDiagnostic; severity: "error" | "warning"; path: Step[] | null }

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
    private dragFrom: Step[] | null = null;
    private dropAt: { group: Step[]; index: number } | null = null;
    /** How many times the query uses each variable, and their names, as of the last draw. */
    private uses = new Map<string, number>();
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
            (f.link ?? []).forEach(facetOps);
            this.facets.set(f.key.toLowerCase(), f);
        }
        this.root = rootOf(options.tree ?? {}, this.facets);
        this.ret = [...(options.tree?.return ?? [])];
        this.meant = JSON.stringify(meaning(treeOf(this.root, this.facets, this.ret).root));

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
        // The two mean the same, so their nodes come in the same order, the order of their text.
        const spans = tree.root ? spanOrder(tree.root) : [];
        buildTree(this.root, this.facets, this.ret).order.forEach((r, i) => { r.span = spans[i]; });
        spanGroups(this.root);
    }

    /** The path of the deepest row whose text holds a problem, or null to show it above the rows. */
    private rowFor(d: QueryDiagnostic): Step[] | null
    {
        if (d.start === undefined || d.end === undefined) { return null; }

        // Depth first, so the last row that holds it is the deepest. The root is shown above the rows.
        let best: Step[] | null = null;
        for (const { row, path } of allRows(this.root))
        {
            if (path.length > 0 && row.span && row.span.start <= d.start && d.end <= row.span.end) { best = path; }
        }
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
    private edit(focusPath?: Step[], focusRole?: string): void
    {
        const active = document.activeElement as HTMLElement | null;
        const path = focusPath ?? this.pathOf(active);
        const role = focusRole ?? active?.getAttribute("data-role") ?? null;
        this.render();
        if (path) { this.focusRow(path, role); }
        this.changed();
    }

    private pathOf(el: Element | null): Step[] | null
    {
        const row = el?.closest<HTMLElement>("[data-path]");
        if (!row || !this.el?.contains(row)) { return null; }
        return parsePath(row.getAttribute("data-path")!);
    }

    private focusRow(path: Step[], role: string | null): void
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
        this.uses = variableUses(this.root, this.ret);

        if (this.ret.length > 0)
        {
            this.body.appendChild(createElement("div", [`${CLS}-kept`, `${CLS}-return`],
                "Returns " + this.ret.map((r) => "?" + r).join(", ") + ". Edit this in the search bar."));
        }
        this.body.appendChild(this.renderGroup(this.root, [], this.facets));
        this.renderProblems();
    }

    /** A row in a group, whose rows use the keys of `scope`. */
    private renderRow(row: Row, path: Step[], scope: Facets): HTMLElement
    {
        if (row.kind === "group") { return this.renderGroup(row, path, scope); }

        const el = createElement("div", [`${CLS}-row`, `${CLS}-row-${row.kind}`]);
        setAttr(el, "data-path", path.join("."));
        setAttr(el, "role", "group");
        el.appendChild(this.dragHandle());
        el.appendChild(this.notToggle(row));

        if (row.kind === "filter") { this.renderFilter(el, row, path, scope); }
        else if (row.kind === "text") { this.renderText(el, row); }
        else if (row.kind === "compare") { this.renderCompare(el, row); }
        else
        {
            el.appendChild(createElement("span", [`${CLS}-kept`], row.what + ". Edit this in the search bar."));
            setAttr(el, "aria-label", row.what);
        }
        el.appendChild(this.rowTools(path, false));
        return el;
    }

    /**
     * A group: the root, a group in a group, a condition's search inside (`where`), or its link conditions. Only
     * a group in a group moves, wraps and goes on its own; the others go with their condition.
     */
    private renderGroup(row: GroupRow, path: Step[], scope: Facets): HTMLElement
    {
        const last = path[path.length - 1];
        const place = (path.length === 0) ? "root" : (typeof last === "number") ? "child" : last;
        const inner = row.linkOf ? scopeOf(this.facets, row.linkOf) : scope;
        const el = createElement("div", [`${CLS}-group`, `${CLS}-group-${place}`]);
        setAttr(el, "data-path", path.join("."));
        setAttr(el, "role", "group");
        const what = (place === "where") ? "Where the item has " : (place === "link") ? "The link has " : "";
        setAttr(el, "aria-label", what + (row.op === "and" ? "all of these" : "any of these")
            + (row.nots % 2 ? ", not" : ""));
        if (path.filter((p) => typeof p === "number" || p === "where").length % 2 === 1)
        {
            el.classList.add(`${CLS}-group-odd`);
        }

        const head = createElement("div", [`${CLS}-group-head`]);
        if (place === "child") { head.appendChild(this.dragHandle()); }
        if (what) { head.appendChild(createElement("span", [`${CLS}-label`], what.trim())); }
        head.appendChild(this.notToggle(row));

        const op = this.select("op", [["and", "All of these"], ["or", "Any of these"]], row.op, "How the rows join");
        op.addEventListener("change", () =>
        {
            row.op = (op as HTMLSelectElement).value as "and" | "or";
            this.edit(path, "op");
        });
        head.appendChild(op);

        // A link's fields take no words and no variables, so a link group adds conditions and groups only.
        const adds: Array<[string, string, string]> = [["filter", "Condition", "bi-funnel"]];
        if (!row.linkOf) { adds.push(["text", "Words", "bi-fonts"]); }
        adds.push(["group", "Group", "bi-collection"]);
        if (!row.linkOf && this.uses.size >= 2) { adds.push(["compare", "Comparison", "bi-arrow-left-right"]); }
        for (const [kind, label, icon] of adds)
        {
            const add = this.button(`add-${kind}`, "Add " + label.toLowerCase(), icon, label);
            add.addEventListener("click", () => this.add(row, path, kind as "filter" | "text" | "group" | "compare"));
            head.appendChild(add);
        }
        if (place === "child") { head.appendChild(this.rowTools(path, true)); }
        if (place === "link")
        {
            const remove = this.button("remove-link", "Remove the link conditions", "bi-trash", "");
            remove.addEventListener("click", () =>
            {
                (rowAt(this.root, path.slice(0, -1)).row as FilterRow).link = undefined;
                this.announce("Link conditions removed");
                this.edit(path.slice(0, -1), "add-link");
            });
            head.appendChild(remove);
        }
        el.appendChild(head);

        const list = createElement("div", [`${CLS}-rows`]);
        setAttr(list, "data-group", path.join("."));
        row.children.forEach((c, i) => list.appendChild(this.renderRow(c, [...path, i], inner)));
        if (row.children.length === 0)
        {
            list.appendChild(createElement("div", [`${CLS}-empty`], "No rows yet. Add a condition."));
        }
        el.appendChild(list);
        return el;
    }

    private renderFilter(el: HTMLElement, row: FilterRow, path: Step[], scope: Facets): void
    {
        const inLink = scope !== this.facets;
        const facet = scope.get(row.key.toLowerCase());
        const keys = Array.from(scope.values()).map((f): [string, string] => [f.key, f.label]);
        const key = this.select("key", [["", "Choose a key"], ...keys], row.key, "Key");
        key.addEventListener("change", () =>
        {
            const next = scope.get((key as HTMLSelectElement).value.toLowerCase());
            row.key = next?.key ?? "";
            row.op = next ? facetOps(next)[0] : "";
            row.values = [];
            row.original = [];
            row.variable = row.where = row.link = undefined;
            if (next) { setOp(row, row.op); }
            this.edit(undefined, "key");
        });
        el.appendChild(key);
        if (!facet) { el.classList.add(`${CLS}-row-draft`); return; }

        // A relationship key also offers a search inside the item at its other end (spec section 9).
        const relationship = !!facet.relationship && !inLink;
        const offered = [...facetOps(facet), ...(relationship ? ["where"] : [])];
        // An operator the facet does not list stays on offer for this row, so a parse is never changed.
        const ops = offered.includes(row.op) ? offered : [row.op, ...offered];
        const op = this.select("op", ops.map((o): [string, string] => [o, OP_LABELS[o] ?? o]), row.op, "Operator");
        op.addEventListener("change", () =>
        {
            setOp(row, (op as HTMLSelectElement).value);
            this.edit(undefined, "op");
        });
        el.appendChild(op);

        if (relationship && row.op === "equals") { el.appendChild(this.sameAs(row)); }
        if (row.op !== "where" && row.variable === undefined)
        {
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
        }
        if (relationship && facet.link?.length && !row.link)
        {
            const add = this.button("add-link", "Add conditions on the link", "bi-link-45deg", "Link");
            add.addEventListener("click", () =>
            {
                row.link = { kind: "group", op: "and", nots: 0, children: [], linkOf: facet.key };
                this.announce("Link conditions added");
                this.edit([...path, "link"], "add-filter");
            });
            el.appendChild(add);
        }

        const draft = this.draftReason(row, facet);
        if (draft)
        {
            el.classList.add(`${CLS}-row-draft`);
            el.appendChild(createElement("span", [`${CLS}-draft`], draft));
        }

        // The link's conditions, then the search inside: the order of the text, `key link ( … ) where ( … )`.
        if (row.link) { el.appendChild(this.renderGroup(row.link, [...path, "link"], scope)); }
        if (row.op === "where") { el.appendChild(this.renderGroup(row.where!, [...path, "where"], this.facets)); }
    }

    /** What a condition still needs, or null when it is complete. */
    private draftReason(row: FilterRow, facet: ExpressionBuilderFacet): string | null
    {
        if (row.op === "where")
        {
            return nodeOf(row.where!, this.facets, this.uses) ? null : "Needs a condition inside";
        }
        if (isComplete(row, facet, this.uses)) { return null; }
        return (row.variable !== undefined) ? `Needs a second use of ?${row.variable}` : "Needs a value";
    }

    /**
     * The choice between a value and "the same item as" another condition (spec section 9). Choosing a condition
     * that has no variable yet makes one for both, named from its key. A variable stands only after `equals`.
     */
    private sameAs(row: FilterRow): HTMLSelectElement
    {
        const options: Array<[string, string]> = [["", "a value"]];
        for (const name of this.uses.keys())
        {
            options.push(["var:" + name, "the same item as ?" + name]);
        }
        for (const { row: other, path: at } of allRows(this.root))
        {
            if (other === row || other.kind !== "filter" || other.variable !== undefined) { continue; }
            const facet = this.facets.get(other.key.toLowerCase());
            const empty = other.values.every((v) => v.trim() === "");
            // A condition another can share a variable with: a relationship key, outside a link, with no value yet.
            const open = facet?.relationship && !at.includes("link") && empty && ["", "equals"].includes(other.op);
            if (!open) { continue; }
            const inside = at.includes("where") ? " (in a search inside)" : "";
            options.push(["row:" + at.join("."), "the same item as " + facet.label + inside]);
        }

        const select = this.select("same", options, row.variable ? "var:" + row.variable : "", "Value");
        select.addEventListener("change", () =>
        {
            const [kind, rest] = [select.value.slice(0, 4), select.value.slice(4)];
            if (kind === "var:") { row.variable = rest; }
            else if (kind === "row:")
            {
                const other = rowAt(this.root, parsePath(rest)).row as FilterRow;
                const name = newVariable(other.key, new Set(this.uses.keys()));
                other.op = "equals";
                other.values = [""];
                other.original = [undefined];
                other.variable = name;
                row.variable = name;
            }
            else { row.variable = undefined; }
            row.values = [""];
            row.original = [undefined];
            this.announce(row.variable ? "The same item as ?" + row.variable : "A value");
            this.edit(undefined, "same");
        });
        return select;
    }

    /** Two variables compared: the same item, or not. */
    private renderCompare(el: HTMLElement, row: CompareRow): void
    {
        const names = Array.from(this.uses.keys()).map((n): [string, string] => [n, "?" + n]);
        const side = (role: string, value: string, label: string, set: (v: string) => void): HTMLSelectElement =>
        {
            const known = names.some(([n]) => n === value);
            const s = this.select(role, [["", "Choose"], ...(known || !value ? [] : [[value, "?" + value]] as
                Array<[string, string]>), ...names], value, label);
            s.addEventListener("change", () => { set(s.value); this.edit(undefined, role); });
            return s;
        };
        el.appendChild(side("left", row.left, "First item", (v) => { row.left = v; }));

        const ops = Object.keys(COMPARE_LABELS).includes(row.op) ? Object.keys(COMPARE_LABELS)
            : [row.op, ...Object.keys(COMPARE_LABELS)];
        const op = this.select("op", ops.map((o): [string, string] => [o, COMPARE_LABELS[o] ?? OP_LABELS[o] ?? o]),
            row.op, "Comparison");
        op.addEventListener("change", () => { row.op = op.value; this.edit(undefined, "op"); });
        el.appendChild(op);
        el.appendChild(side("right", row.right, "Second item", (v) => { row.right = v; }));

        if (!row.left || !row.right || row.left === row.right)
        {
            el.classList.add(`${CLS}-row-draft`);
            el.appendChild(createElement("span", [`${CLS}-draft`], "Needs two different items"));
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

    private rowTools(path: Step[], group: boolean): HTMLElement
    {
        const tools = createElement("span", [`${CLS}-tools`]);
        const parent = rowAt(this.root, path.slice(0, -1)).row as GroupRow;
        const index = path[path.length - 1] as number;
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

    private add(group: GroupRow, path: Step[], kind: "filter" | "text" | "group" | "compare"): void
    {
        const linkOf = group.linkOf ? { linkOf: group.linkOf } : {};
        const row: Row = (kind === "group") ? { kind: "group", op: "and", nots: 0, children: [], ...linkOf }
            : (kind === "text") ? { kind: "text", phrase: "", nots: 0 }
                : (kind === "compare") ? { kind: "compare", left: "", op: "not-equals", right: "", nots: 0 }
                    : { kind: "filter", key: "", op: "", values: [], original: [], nots: 0 };
        group.children.push(row);
        this.announce({ group: "Group added", text: "Words added", compare: "Comparison added",
            filter: "Condition added" }[kind]);
        this.edit([...path, group.children.length - 1],
            { filter: "key", text: "phrase", group: "op", compare: "left" }[kind]);
    }

    private move(path: Step[], by: -1 | 1): void
    {
        const to = moveRow(this.root, path, by);
        if (!to) { return; }
        this.announce(by < 0 ? "Moved up" : "Moved down");
        this.edit(to, by < 0 ? "up" : "down");
    }

    private wrap(path: Step[]): void
    {
        wrapRow(this.root, path);
        this.announce("Put in a group");
        this.edit(path, "op");
    }

    private unwrap(path: Step[]): void
    {
        if (!unwrapRow(this.root, path)) { return; }
        this.announce("Group taken apart");
        this.edit(path);
    }

    private remove(path: Step[]): void
    {
        const parentPath = path.slice(0, -1);
        removeRow(this.root, path);
        this.announce("Removed");
        const parent = rowAt(this.root, parentPath).row as GroupRow;
        const next = Math.min(path[path.length - 1] as number, parent.children.length - 1);
        // The focus goes to the row that took its place, else to the group's own controls.
        this.edit(next >= 0 ? [...parentPath, next] : parentPath, next >= 0 ? undefined : "add-filter");
    }

    // ── Keyboard ──

    private onKeydown(e: KeyboardEvent): void
    {
        if (this.opts.disabled) { return; }
        const path = this.pathOf(e.target as Element);
        // Only a row in a group moves: not the root, and not a condition's where or link group.
        if (!path || typeof path[path.length - 1] !== "number") { return; }

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
        if (!this.dragFrom || typeof this.dragFrom[this.dragFrom.length - 1] !== "number")
        {
            this.dragFrom = null;
            return;
        }
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

        const group = parsePath(list.getAttribute("data-group")!);
        const target = under?.closest<HTMLElement>(`.${CLS}-row, .${CLS}-group`);
        const into = rowAt(this.root, group).row as GroupRow;
        const from = rowAt(this.root, this.dragFrom.slice(0, -1)).row as GroupRow;
        // A link's fields and the builder's facets do not mix, so a row stays among keys of its own kind.
        if ((into.linkOf ?? "") !== (from.linkOf ?? "")) { return; }
        let index = into.children.length;
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

    private rowEl(path: Step[]): HTMLElement | null
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
