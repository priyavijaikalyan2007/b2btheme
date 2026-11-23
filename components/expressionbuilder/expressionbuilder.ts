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
 *    host keeps the two in step with the API's Parse and Print calls. It
 *    shows the query as a grid of rows, like the Azure Boards query editor
 *    (#237): each row joins the row above with And or Or, and a group is a
 *    bracket beside its rows.
 * 🔗 RELATES: [[FacetSearch]], [[QueryLanguage]], [[GestureRecognizer]]
 * ⚡ FLOW: [host Parse] -> [setParsed(tree)] -> [levels] -> [grid] -> [person
 *          edits a level] -> [onChange(tree)] -> [host Print] -> [FacetSearch.setValue]
 * ----------------------------------------------------------------------------
 *
 * THE API DECIDES WHAT A QUERY MEANS. The builder only holds a tree. It
 * reports a tree that Print accepts: a row a person has not finished is a
 * draft, shown and marked, and left out of the tree until it is complete.
 *
 * WHAT IT CANNOT EDIT IT KEEPS (UI_EXPERIENCE.md section 5.7). A parameter,
 * a value it has no editor for, a key with no facet, a variable or a
 * nested search on a key that is not a relationship, and `return` are
 * shown read-only, kept in place, and reported exactly as they came. In
 * part 1 of the grid, a search inside, a link condition, "the same item as"
 * and a comparison are read-only too (spec section 5.5).
 *
 * THE TREE IS THE MODEL. The grid is a view of it: each group's level of
 * items, and each edit a change to a level, written back into the tree
 * (specs/expressionbuilder-grid.prd.md section 4).
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
    group: "Alt+G",
    ungroup: "Alt+Shift+G",
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
// LEVEL EDITS (pure, on the model, spec sections 4.5 and 5)
// ============================================================================
//
// Each edit reads a level, changes its items, and writes it back through
// `edited`, so each group a person changes keeps its bracket (spec 4.3).

/** Writes a level a person changed. A group, not the root, takes the mark, so it stays a group (spec 4.3). */
function edited(root: GroupRow, group: GroupRow, items: Item[]): void
{
    if (group !== root) { group.bracket = true; }
    setLevel(group, items);
}

/** Changes one item's join. */
export function setJoin(root: GroupRow, path: ItemPath, join: Join): void
{
    const { level, items, index } = itemAt(root, path);
    items[index].join = join;
    edited(root, level, items);
}

/** Sets the join of every item inside a group but its first. */
export function setGroupJoins(root: GroupRow, path: ItemPath, join: Join): void
{
    const group = itemAt(root, path).item.row as GroupRow;
    const inner = levelOf(group);
    inner.forEach((it, i) => { if (i > 0) { it.join = join; } });
    edited(root, group, inner);
}

/** Puts items next to each other in a marked group, which takes the first one's join. Returns its path. */
export function groupItems(root: GroupRow, level: ItemPath, start: number, end: number): ItemPath
{
    const parent = levelAt(root, level);
    const items = levelOf(parent);
    const inner = items.slice(start, end + 1);
    const group: GroupRow = { kind: "group", op: "and", nots: 0, children: [], bracket: true,
        ...(parent.linkOf ? { linkOf: parent.linkOf } : {}) };
    setLevel(group, inner);
    items.splice(start, inner.length, { row: group, join: inner[0].join });
    edited(root, parent, items);
    return itemPathOf(root, group)!;
}

/** Puts a group's items in its place, its join on the first. A group with `not` keeps it, so this refuses one. */
export function ungroupItem(root: GroupRow, path: ItemPath): boolean
{
    const { level, items, index, item } = itemAt(root, path);
    if (item.row.kind !== "group" || item.row.nots > 0) { return false; }

    const inner = levelOf(item.row);
    if (inner.length > 0) { inner[0].join = item.join; }
    items.splice(index, 1, ...inner);
    edited(root, level, items);
    return true;
}

/** Adds a row at a place, joined with `and`. Above the first item, the old first takes the `and`. */
export function insertItem(root: GroupRow, at: Place, row: Row): ItemPath
{
    const level = levelAt(root, at.level);
    const items = levelOf(level);
    if (at.index === 0 && items.length > 0) { items[0].join = "and"; }
    items.splice(at.index, 0, { row, join: "and" });
    edited(root, level, items);
    return itemPathOf(root, row)!;
}

/**
 * After a move or a remove: a group left with no items goes, and one left with one item and no `not` is
 * ungrouped, because a bracket around one row means nothing. Its parent is then tidied the same way.
 */
function tidy(root: GroupRow, group: GroupRow): void
{
    if (group === root) { return; }
    const path = itemPathOf(root, group)!;
    const { level, items, index } = itemAt(root, path);
    const inner = levelOf(group);

    if (inner.length === 0) { items.splice(index, 1); }
    else if (inner.length === 1 && group.nots === 0) { items[index] = { row: inner[0].row, join: items[index].join }; }
    else { return; }
    edited(root, level, items);
    tidy(root, level);
}

/** Removes rows and groups, a group with its rows, and tidies each level they leave. */
export function removeItems(root: GroupRow, rows: Row[]): void
{
    const left = new Set<GroupRow>();
    for (const row of rows)
    {
        // A row inside a group removed before it went with that group.
        const path = itemPathOf(root, row);
        if (!path) { continue; }
        const { level, items, index } = itemAt(root, path);
        items.splice(index, 1);
        edited(root, level, items);
        left.add(level);
    }
    // A level that a later remove took with its group needs no tidy.
    left.forEach((g) => { if (g === root || itemPathOf(root, g)) { tidy(root, g); } });
}

/** Whether a move cannot go to a place: into itself or a group inside it, across a link's edge, or nowhere. */
export function refuses(root: GroupRow, level: ItemPath, start: number, end: number, to: Place): boolean
{
    const from = levelAt(root, level);
    const into = levelAt(root, to.level);
    const moved = levelOf(from).slice(start, end + 1);
    const inside = moved.some((m) => m.row.kind === "group"
        && Array.from(allRows(m.row)).some((r) => r.row === into));

    return inside || (from.linkOf ?? "") !== (into.linkOf ?? "")
        || (from === into && to.index >= start && to.index <= end + 1);
}

/**
 * Moves items next to each other in a level to a place, by spec 4.5, and returns the first one's new path, or
 * null when the move is refused. `to.index` is the place in its level as it stands before the move.
 */
export function moveItems(root: GroupRow, level: ItemPath, start: number, end: number, to: Place): ItemPath | null
{
    if (refuses(root, level, start, end, to)) { return null; }

    const from = levelAt(root, level);
    const into = levelAt(root, to.level);
    const items = levelOf(from);
    const moved = items.slice(start, end + 1);
    const rest = items.filter((_it, i) => i < start || i > end);
    // The groups a person sees stay groups, so the indices of `to` hold while the items move (spec 4.3).
    for (const g of [from, into, ...moved.map((m) => m.row)])
    {
        if (g.kind === "group" && g !== root) { g.bracket = true; }
    }

    if (from === into)
    {
        const before = items[to.index];
        rest.splice(before ? rest.indexOf(before) : rest.length, 0, ...moved);
        if (rest[0] !== items[0])
        {
            items[0].join = rest[0].join;
            rest[0].join = "and";
        }
        edited(root, from, rest);
        return itemPathOf(root, moved[0].row);
    }

    edited(root, from, rest);
    const target = levelOf(into);
    if (to.index === 0)
    {
        if (target.length > 0) { target[0].join = target[1]?.join ?? "and"; }
        moved[0].join = "and";
    }
    else { moved[0].join = (target[to.index] ?? target[target.length - 1]).join; }
    target.splice(to.index, 0, ...moved);
    edited(root, into, target);
    tidy(root, from);
    return itemPathOf(root, moved[0].row);
}

/** Why the grid shows a row read-only in part 1, or null when it edits it (spec 5.5). */
export function readOnlyWhy(row: Row, facets: Facets): string | null
{
    if (row.kind === "kept") { return row.what; }
    if (row.kind === "compare") { return "A comparison of two items"; }
    if (row.kind !== "filter") { return null; }
    const label = facets.get(row.key.toLowerCase())?.label ?? row.key;
    if (row.op === "where") { return label + " has one where"; }
    if (row.link) { return label + " with conditions on its link"; }
    if (row.variable !== undefined) { return label + " is the same item as another row"; }
    return null;
}

/**
 * Where Move up or Move down takes items, one place in the grid (spec 5.3): past the item beside them, into a
 * group beside them, or out at a group's edge. Null at the top or the bottom of the grid.
 */
export function moveTarget(root: GroupRow, level: ItemPath, start: number, end: number, by: -1 | 1): Place | null
{
    const items = levelOf(levelAt(root, level));
    const next = (by < 0) ? start - 1 : end + 1;
    const beside = items[next];
    if (beside && beside.row.kind === "group")
    {
        return { level: [...level, next], index: (by < 0) ? levelOf(beside.row).length : 0 };
    }
    if (beside) { return { level, index: (by < 0) ? next : next + 1 }; }
    if (level.length === 0) { return null; }

    const out = level[level.length - 1];
    return { level: level.slice(0, -1), index: (by < 0) ? out : out + 1 };
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

/** A problem from Parse or Print, on the row whose line shows it, or above the grid. */
interface Placed { diagnostic: QueryDiagnostic; severity: "error" | "warning"; row: Row | null }

/** Where the focus goes after an edit: a toolbar button while it is on, else a control on a row's line. */
interface Focus { row?: Row; role?: string; tool?: string }

/** Items next to each other in one level. */
interface ItemRun { level: ItemPath; start: number; end: number }

/** What a line needs to know about the levels it is in, from the top. */
interface LineContext
{
    path: ItemPath;
    /** For each depth, whether the item there is the last of its level. */
    ends: boolean[];
    /** For each depth, the run of two or more the item there is in, or null. */
    runs: Array<Run | null>;
}

/** What a read-only row adds, so a person knows where to change it. */
const EDIT_IN_BAR = ". Edit this in the search bar.";
const NOT_UNGROUP = "A group with Not cannot be ungrouped, because that would change what it means";
const MOVE_OFF = "Check rows next to each other to move them";

/** The toolbar's buttons, which act on the checked items (spec 5.3), with the key binding each has. */
const TOOLS: Array<{ role: string; label: string; icon: string; action?: string }> = [
    { role: "tool-group", label: "Group", icon: "bi-bounding-box", action: "group" },
    { role: "tool-ungroup", label: "Ungroup", icon: "bi-box-arrow-up-left", action: "ungroup" },
    { role: "tool-up", label: "Move up", icon: "bi-arrow-up", action: "moveUp" },
    { role: "tool-down", label: "Move down", icon: "bi-arrow-down", action: "moveDown" },
    { role: "tool-remove", label: "Remove", icon: "bi-trash" },
];

/** A group's label for a screen reader, such as "Group of 2 rows, joined with or". */
function groupLabel(items: Item[]): string
{
    const joins = Array.from(new Set(items.slice(1).map((it) => it.join)));
    const n = items.length;
    const joined = (joins.length > 0) ? ", joined with " + joins.join(" and ") : "";
    return `Group of ${n} ${n === 1 ? "row" : "rows"}` + joined;
}

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
    private gestures: { cancel(): void; destroy(): void } | null = null;
    /** Each line drawn, by its row, and back, in the order drawn. Rebuilt by each render. */
    private readonly lineOf = new Map<Row, HTMLElement>();
    private readonly rowOfLine = new Map<HTMLElement, Row>();
    /** The checked rows and groups. A tree that means the same keeps them (spec section 8). */
    private readonly checked = new Set<Row>();
    /** How many bracket columns the grid has, as drawn. */
    private depth = 1;
    /** The open ⋯ menu, its button, and what removes its listener. */
    private menu: { el: HTMLElement; button: HTMLElement; off: () => void } | null = null;
    /** The row or group being dragged, and where it would land. */
    private dragging: Row | null = null;
    private dropAt: Place | null = null;
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
                this.checked.clear();
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
        this.problems = found.map((f) => ({ ...f, row: this.rowFor(f.diagnostic) }));
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
        this.closeMenu(false);
        this.dragClear("destroy");
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

    /** The deepest row the grid shows whose text holds a problem, or null to show it above the grid. */
    private rowFor(d: QueryDiagnostic): Row | null
    {
        if (d.start === undefined || d.end === undefined) { return null; }

        // Depth first, so the last row that holds it is the deepest. The root is shown above the grid.
        let best: Row | null = null;
        for (const { row, path } of allRows(this.root))
        {
            const holds = !!row.span && row.span.start <= d.start && d.end <= row.span.end;
            if (path.length > 0 && holds && this.lineOf.has(row)) { best = row; }
        }
        return best;
    }

    // ── Changes ──

    /**
     * After an edit: drops the problems, whose places no longer hold, and reports the tree when what it means
     * changed. A draft, or a new group around rows, changes nothing it means, so it reports nothing.
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

    /** Makes one edit, logs it, redraws with the focus where it says, and announces it. */
    private act(kind: string, path: ItemPath, change: () => Focus | void, message?: string | (() => string)): void
    {
        logDebug("Edit:", kind, "at", path.join(".") || "the top");
        const focus = change();
        this.edit(focus || undefined);
        if (message) { this.announce(typeof message === "string" ? message : message()); }
    }

    /** Redraws, puts the focus where `focus` says, or on the same control of the same row, and reports a change. */
    private edit(focus?: Focus): void
    {
        const target = focus ?? this.focusNow();
        this.render();
        this.focusOn(target);
        this.changed();
    }

    /** The control that holds the focus, as a row and a role, to find again after a redraw. */
    private focusNow(): Focus
    {
        const active = document.activeElement as HTMLElement | null;
        const line = active?.closest<HTMLElement>(`.${CLS}-line`);
        const row = line ? this.rowOfLine.get(line) : undefined;
        const role = active?.getAttribute("data-role") ?? undefined;
        if (row) { return { row, role }; }
        if (role && active?.closest(`.${CLS}-footer`)) { return { tool: role }; }
        return {};
    }

    /** Focuses a toolbar button while it is on, else the role on the row's line, else that line's check box. */
    private focusOn(focus: Focus): void
    {
        const tool = focus.tool ? this.toolButton(focus.tool) : null;
        if (tool && !tool.disabled)
        {
            tool.focus();
            return;
        }
        const line = focus.row ? this.lineOf.get(focus.row) : undefined;
        if (!line) { return; }
        const own = focus.role ? line.querySelector<HTMLElement>(`[data-role="${focus.role}"]:not([disabled])`) : null;
        (own ?? line.querySelector<HTMLElement>("[data-role=check]")!).focus();
    }

    private toolButton(role: string): HTMLButtonElement | null
    {
        return this.el?.querySelector<HTMLButtonElement>(`.${CLS}-footer [data-role="${role}"]`) ?? null;
    }

    /** A line's number, from 1, in the order drawn, a group's line too (spec 7.3). */
    private lineNumber(row: Row): number
    {
        return Array.from(this.lineOf.keys()).indexOf(row) + 1;
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
            onDragCancel: () => this.dragClear("cancel"),
        });
    }

    private render(): void
    {
        if (!this.body) { return; }
        this.closeMenu(false);
        while (this.body.firstChild) { this.body.removeChild(this.body.firstChild); }
        this.lineOf.clear();
        this.rowOfLine.clear();
        this.uses = variableUses(this.root, this.ret);
        this.depth = levelDepth(this.root);

        if (this.ret.length > 0)
        {
            this.body.appendChild(createElement("div", [`${CLS}-kept`, `${CLS}-return`],
                "Returns " + this.ret.map((r) => "?" + r).join(", ") + EDIT_IN_BAR));
        }
        const grid = createElement("div", [`${CLS}-grid`]);
        // It scrolls sideways on a narrow screen, so it has a stable name (ADR-162).
        setAttr(grid, "data-dui-region", "expressionbuilder:grid");
        grid.style.setProperty("--eb-depth", String(this.depth));
        grid.appendChild(this.renderLevel(this.root, { path: [], ends: [], runs: [] }));
        this.body.append(grid, this.renderFooter());

        for (const row of Array.from(this.checked))
        {
            if (!this.lineOf.has(row)) { this.checked.delete(row); }
        }
        this.updateToolbar();
        this.renderProblems();
    }

    /** A level as a list: a line for each item, and a group's own level under its line. */
    private renderLevel(group: GroupRow, outer: LineContext): HTMLElement
    {
        const list = createElement("ol", [`${CLS}-level`]);
        setAttr(list, "data-level", outer.path.join("."));
        const items = levelOf(group);
        const runs = runsOf(items);
        if (outer.path.length > 0) { setAttr(list, "aria-label", groupLabel(items)); }

        const numbers: number[] = [];
        items.forEach((item, i) =>
        {
            const run = runs.find((r) => r.start <= i && i <= r.end)!;
            const ctx: LineContext = {
                path: [...outer.path, i],
                ends: [...outer.ends, i === items.length - 1],
                runs: [...outer.runs, (runs.length > 1 && run.end > run.start) ? run : null],
            };
            const li = createElement("li", [`${CLS}-item`]);
            li.appendChild(this.renderLine(item, ctx));
            numbers[i] = this.lineOf.size;
            const together = (ctx.runs[ctx.runs.length - 1] && i > run.start)
                ? ", read together with row " + numbers[run.start] : "";
            setAttr(li, "aria-label", this.lineLabel(item, i === 0, numbers[i]) + together);
            if (item.row.kind === "group") { li.appendChild(this.renderLevel(item.row, ctx)); }
            list.appendChild(li);
        });
        return list;
    }

    /** One line of the grid: handle, check box, brackets, join, the row's own columns, and its actions. */
    private renderLine(item: Item, ctx: LineContext): HTMLElement
    {
        const { row } = item;
        const line = createElement("div", [`${CLS}-line`, `${CLS}-line-${row.kind}`]);
        setAttr(line, "data-item", ctx.path.join("."));
        this.lineOf.set(row, line);
        this.rowOfLine.set(line, row);

        line.append(this.dragHandle(), this.checkBox(row, this.lineOf.size),
            ...this.brackets(ctx, row.kind === "group"), this.joinCell(item, ctx));
        if (row.kind === "group") { line.appendChild(this.groupControl(row, ctx.path)); }
        else { this.cells(line, row); }
        line.appendChild(this.actions(row));
        return line;
    }

    /** What a line reads to a screen reader, such as "Row 3: or not, Assigned to is me". */
    private lineLabel(item: Item, first: boolean, n: number): string
    {
        const head = [first ? "" : item.join, item.row.nots % 2 === 1 ? "not" : ""].filter(Boolean).join(" ");
        return `Row ${n}: ` + (head ? head + ", " : "") + this.summary(item.row);
    }

    private summary(row: Row): string
    {
        if (row.kind === "group") { return "a group"; }
        if (row.kind === "text") { return "has the words " + row.phrase; }
        if (row.kind === "kept") { return row.what; }
        const why = readOnlyWhy(row, this.facets);
        if (why) { return why; }
        const f = row as FilterRow;
        const facet = this.facets.get(f.key.toLowerCase());
        if (!facet) { return "a new condition"; }
        return [facet.label, OP_LABELS[f.op] ?? f.op, ...f.values.filter((v) => v.trim() !== "")].join(" ");
    }

    private checkBox(row: Row, n: number): HTMLElement
    {
        const label = createElement("label", [`${CLS}-check`]);
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "form-check-input";
        setAttr(input, "data-role", "check");
        setAttr(input, "aria-label", "Check row " + n);
        input.checked = this.checked.has(row);
        input.disabled = !!this.opts.disabled;
        input.addEventListener("change", () =>
        {
            if (input.checked) { this.checked.add(row); }
            else { this.checked.delete(row); }
            this.updateToolbar();
        });
        label.appendChild(input);
        return label;
    }

    /**
     * One cell for each bracket column. Column j belongs to the level at depth j: a solid bracket for the group
     * whose rows are that level, and a dashed one for a run of `and` items inside an `or` there.
     */
    private brackets(ctx: LineContext, group: boolean): HTMLElement[]
    {
        const d = ctx.path.length - 1;
        const last = (k: number): boolean => ctx.ends.slice(k).every(Boolean);
        const cells: HTMLElement[] = [];
        for (let j = 0; j < this.depth; j += 1)
        {
            const cell = createElement("span", [`${CLS}-bracket`]);
            setAttr(cell, "data-depth", String(j));
            if (j >= 1 && j <= d)
            {
                cell.classList.add(`${CLS}-bracket-solid`);
                if (!group && last(j)) { cell.classList.add(`${CLS}-bracket-end`); }
            }
            if (group && j === d + 1) { cell.classList.add(`${CLS}-bracket-solid`, `${CLS}-bracket-start`); }

            const run = (j <= d) ? ctx.runs[j] : null;
            if (run)
            {
                cell.classList.add(`${CLS}-run`);
                if (j === d && ctx.path[j] === run.start)
                {
                    cell.classList.add(`${CLS}-run-start`);
                    cell.appendChild(this.makeGroupButton(ctx.path.slice(0, -1), run));
                }
                if (ctx.path[j] === run.end && last(j + 1) && !(group && j === d))
                {
                    cell.classList.add(`${CLS}-run-end`);
                }
            }
            cells.push(cell);
        }
        return cells;
    }

    /** Turns a dashed run into a group of its own, which changes nothing it means (spec 5.2). */
    private makeGroupButton(level: ItemPath, run: Run): HTMLButtonElement
    {
        const b = this.button("make-group", "Make a group of the rows read together", "bi-bounding-box", "");
        b.addEventListener("click", () => this.act("make-group", [...level, run.start], () =>
        {
            const path = groupItems(this.root, level, run.start, run.end);
            return { row: itemAt(this.root, path).item.row };
        }, "Grouped"));
        return b;
    }

    /** The join to the item above, but on a level's first item, and Not. */
    private joinCell(item: Item, ctx: LineContext): HTMLElement
    {
        const cell = createElement("span", [`${CLS}-join`]);
        if (ctx.path[ctx.path.length - 1] > 0)
        {
            const join = this.select("join", [["and", "And"], ["or", "Or"]], item.join, "Join with the row above");
            join.addEventListener("change", () => this.act("join", ctx.path,
                () => setJoin(this.root, ctx.path, join.value as Join)));
            cell.appendChild(join);
        }
        cell.appendChild(this.notToggle(item.row, ctx.path));
        return cell;
    }

    /** A group's own control: how its items join, Mixed while they differ, and Ungroup. */
    private groupControl(group: GroupRow, path: ItemPath): HTMLElement
    {
        const cell = createElement("span", [`${CLS}-group-control`]);
        const joins = new Set(levelOf(group).slice(1).map((it) => it.join));
        const mixed = joins.size > 1;
        const options: Array<[string, string]> = [["and", "And"], ["or", "Or"]];
        if (mixed) { options.push(["mixed", "Mixed"]); }
        const op = this.select("group-op", options, mixed ? "mixed" : (Array.from(joins)[0] ?? "and"),
            "How the rows in the group join");
        if (mixed) { op.querySelector<HTMLOptionElement>('option[value="mixed"]')!.disabled = true; }
        op.addEventListener("change", () => this.act("group-op", path,
            () => setGroupJoins(this.root, path, op.value as Join)));

        const ungroup = this.button("ungroup", "Ungroup", "bi-box-arrow-up-left", "Ungroup");
        if (group.nots > 0)
        {
            ungroup.disabled = true;
            ungroup.title = NOT_UNGROUP;
        }
        ungroup.addEventListener("click", () => this.ungroup(group));
        cell.append(op, ungroup);
        return cell;
    }

    /** The key, operator and value columns of a row that is not a group. */
    private cells(line: HTMLElement, row: Exclude<Row, GroupRow>): void
    {
        if (row.kind === "kept")
        {
            line.appendChild(createElement("span", [`${CLS}-cell`, `${CLS}-readonly`, `${CLS}-kept`],
                row.what + EDIT_IN_BAR));
            return;
        }
        const key = createElement("span", [`${CLS}-cell`, `${CLS}-cell-key`]);
        const op = createElement("span", [`${CLS}-cell`, `${CLS}-cell-op`]);
        const value = createElement("span", [`${CLS}-cell`, `${CLS}-cell-value`]);
        const why = readOnlyWhy(row, this.facets);

        if (why) { this.readOnlyCells(row, key, op, value, why); }
        else if (row.kind === "text") { this.renderText(line, key, value, row); }
        else { this.renderFilter(line, key, op, value, row as FilterRow); }
        line.append(key, op, value);
    }

    /** A row part 1 shows but does not edit, as text in its columns (spec 5.5). */
    private readOnlyCells(row: Row, key: HTMLElement, op: HTMLElement, value: HTMLElement, why: string): void
    {
        value.title = why;
        if (row.kind === "compare")
        {
            key.textContent = "?" + row.left;
            op.textContent = COMPARE_LABELS[row.op] ?? OP_LABELS[row.op] ?? row.op;
            value.textContent = "?" + row.right + EDIT_IN_BAR;
            return;
        }
        const f = row as FilterRow;
        key.textContent = this.facets.get(f.key.toLowerCase())?.label ?? f.key;
        op.textContent = OP_LABELS[f.op] ?? f.op;
        const what = (f.op === "where") ? "a search inside"
            : (f.variable !== undefined) ? "the same item as ?" + f.variable : f.values.join(", ");
        value.textContent = what + (f.link ? ", with conditions on its link" : "") + EDIT_IN_BAR;
    }

    private renderFilter(line: HTMLElement, keyCell: HTMLElement, opCell: HTMLElement, valueCell: HTMLElement,
        row: FilterRow): void
    {
        const facet = this.facets.get(row.key.toLowerCase());
        const keys = Array.from(this.facets.values()).map((f): [string, string] => [f.key, f.label]);
        const key = this.select("key", [["", "Choose a key"], ...keys], row.key, "Key");
        key.addEventListener("change", () =>
        {
            const next = this.facets.get(key.value.toLowerCase());
            row.key = next?.key ?? "";
            row.op = next ? facetOps(next)[0] : "";
            row.values = [];
            row.original = [];
            row.variable = row.where = row.link = undefined;
            if (next) { setOp(row, row.op); }
            this.act("key", itemPathOf(this.root, row)!, () => ({ row, role: "key" }));
        });
        keyCell.appendChild(key);
        if (!facet)
        {
            line.classList.add(`${CLS}-row-draft`);
            return;
        }

        // An operator the facet does not list stays on offer for this row, so a parse is never changed.
        const offered = facetOps(facet);
        const ops = offered.includes(row.op) ? offered : [row.op, ...offered];
        const op = this.select("op", ops.map((o): [string, string] => [o, OP_LABELS[o] ?? o]), row.op, "Operator");
        op.addEventListener("change", () =>
        {
            setOp(row, op.value);
            this.act("op", itemPathOf(this.root, row)!, () => ({ row, role: "op" }));
        });
        opCell.appendChild(op);

        const values = createElement("span", [`${CLS}-values`]);
        row.values.forEach((_v, i) => values.appendChild(this.valueInput(row, facet, i)));
        if (arity(row.op) === "many")
        {
            const more = this.button("add-value", "Add a value", "bi-plus", "Value");
            more.addEventListener("click", () =>
            {
                row.values.push("");
                row.original.push(undefined);
                this.edit({ row, role: `value-${row.values.length - 1}` });
            });
            values.appendChild(more);
        }
        valueCell.appendChild(values);

        const draft = this.draftReason(row, facet);
        if (draft)
        {
            line.classList.add(`${CLS}-row-draft`);
            valueCell.appendChild(createElement("span", [`${CLS}-draft`], draft));
        }
    }

    /** What a condition still needs, or null when it is complete. */
    private draftReason(row: FilterRow, facet: ExpressionBuilderFacet): string | null
    {
        if (isComplete(row, facet, this.uses)) { return null; }
        return (row.variable !== undefined) ? `Needs a second use of ?${row.variable}` : "Needs a value";
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
            this.act("value", itemPathOf(this.root, row)!, () => ({ row, role }));
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
            this.edit({ row, role: "add-value" });
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

    private renderText(line: HTMLElement, keyCell: HTMLElement, valueCell: HTMLElement, row: TextRow): void
    {
        keyCell.appendChild(createElement("span", [`${CLS}-label`], "Has the words"));
        const input = document.createElement("input");
        input.type = "text";
        input.className = `form-control form-control-sm ${CLS}-value`;
        input.value = row.phrase;
        input.disabled = !!this.opts.disabled;
        setAttr(input, "data-role", "phrase");
        setAttr(input, "aria-label", "Words to search for");
        input.addEventListener("input", () => { row.phrase = input.value; });
        input.addEventListener("change", () =>
        {
            row.phrase = input.value;
            this.act("words", itemPathOf(this.root, row)!, () => ({ row, role: "phrase" }));
        });
        valueCell.appendChild(input);
        if (!row.phrase.trim())
        {
            line.classList.add(`${CLS}-row-draft`);
            valueCell.appendChild(createElement("span", [`${CLS}-draft`], "Needs words"));
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

    /** The drag handle: a pointer accelerator. Move up and Move down make every move a drag makes. */
    private dragHandle(): HTMLElement
    {
        const handle = createElement("span", [`${CLS}-drag`]);
        setAttr(handle, "aria-hidden", "true");
        setAttr(handle, "title", "Drag to move");
        handle.appendChild(createElement("i", ["bi", "bi-grip-vertical"]));
        return handle;
    }

    private notToggle(row: Row, path: ItemPath): HTMLButtonElement
    {
        const on = row.nots % 2 === 1;
        const b = this.button("not", on ? "Not: on" : "Not: off", "bi-slash-circle", "Not");
        setAttr(b, "aria-pressed", String(on));
        if (on) { b.classList.add("active"); }
        b.addEventListener("click", () => this.act("not", path, () =>
        {
            row.nots = (row.nots > 0) ? row.nots - 1 : 1;
            // A group a person changed stays a group, even where it now reads the same as its level (spec 4.3).
            if (row.kind === "group") { row.bracket = true; }
        }, () => (row.nots % 2 ? "Not on" : "Not off")));
        return b;
    }

    /** Remove, and the ⋯ menu with the rest. */
    private actions(row: Row): HTMLElement
    {
        const cell = createElement("span", [`${CLS}-actions`]);
        const remove = this.button("remove", (row.kind === "group") ? "Remove this group" : "Remove this row",
            "bi-x-lg", "");
        remove.addEventListener("click", () => this.removeRows([row]));
        const more = this.button("more", "More actions", "bi-three-dots", "");
        setAttr(more, "aria-haspopup", "menu");
        setAttr(more, "aria-expanded", "false");
        more.addEventListener("click", () =>
        {
            if (this.menu?.button === more) { this.closeMenu(true); }
            else { this.openMenu(more, row); }
        });
        cell.append(remove, more);
        return cell;
    }

    /** The ⋯ menu: insert above, and Move up and Move down. */
    private openMenu(button: HTMLElement, row: Row): void
    {
        this.closeMenu(false);
        const path = itemPathOf(this.root, row)!;
        const level = path.slice(0, -1);
        const index = path[path.length - 1];
        const run = { level, start: index, end: index };
        const move = (by: -1 | 1): (() => void) | null => moveTarget(this.root, level, index, index, by)
            ? () => this.moveRun(run, by, { row, role: "more" }) : null;
        const entries: Array<[string, string, (() => void) | null]> = [
            ["insert-filter", "Insert condition above", () => this.insert({ level, index }, "filter")],
            ["insert-text", "Insert words above", () => this.insert({ level, index }, "text")],
            ["up", "Move up", move(-1)],
            ["down", "Move down", move(1)],
        ];

        const menu = createElement("div", [`${CLS}-menu`]);
        setAttr(menu, "role", "menu");
        setAttr(menu, "aria-label", "Row actions");
        for (const [role, label, run] of entries)
        {
            const item = createElement("button", [`${CLS}-menu-item`], label) as HTMLButtonElement;
            item.type = "button";
            setAttr(item, "role", "menuitem");
            setAttr(item, "data-role", role);
            item.disabled = !run;
            if (run)
            {
                item.addEventListener("click", () =>
                {
                    this.closeMenu(false);
                    run();
                });
            }
            menu.appendChild(item);
        }

        // A press outside the menu closes it. The ⋯ button's own click toggles it. The grid scrolls sideways on a
        // narrow screen, so the menu is fixed under its button, and a scroll closes it.
        const outside = (e: PointerEvent): void =>
        {
            const target = e.target as Node;
            if (!menu.contains(target) && !button.contains(target)) { this.closeMenu(false); }
        };
        const scrolled = (): void => this.closeMenu(false);
        document.addEventListener("pointerdown", outside, true);
        const at = button.getBoundingClientRect();
        menu.style.top = at.bottom + "px";
        menu.style.left = at.right + "px";
        button.parentElement!.appendChild(menu);
        setAttr(button, "aria-expanded", "true");
        this.menu = { el: menu, button, off: () =>
        {
            document.removeEventListener("pointerdown", outside, true);
            window.removeEventListener("scroll", scrolled, true);
        } };
        menu.querySelector<HTMLButtonElement>("button:not([disabled])")!.focus({ preventScroll: true });
        // After the focus, so the focus itself never closes the menu.
        window.addEventListener("scroll", scrolled, true);
        logDebug("Menu opened at", path.join("."));
    }

    private closeMenu(refocus: boolean): void
    {
        if (!this.menu) { return; }
        const { el, button, off } = this.menu;
        this.menu = null;
        off();
        el.remove();
        setAttr(button, "aria-expanded", "false");
        if (refocus) { button.focus(); }
    }

    /** ↑ and ↓ between the menu's items that are on. */
    private menuKey(e: KeyboardEvent): void
    {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") { return; }
        e.preventDefault();
        const items = Array.from(this.menu!.el.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
        const at = items.indexOf(document.activeElement as HTMLButtonElement);
        const by = (e.key === "ArrowUp") ? -1 : 1;
        items[(at + by + items.length) % items.length].focus();
    }

    /** The footer: Add condition and Add words, and the toolbar. */
    private renderFooter(): HTMLElement
    {
        const footer = createElement("div", [`${CLS}-footer`]);
        const adds = createElement("span", [`${CLS}-adds`]);
        const filter = this.button("add-filter", "Add condition", "bi-plus-lg", "Add condition");
        filter.addEventListener("click", () => this.insert({ level: [], index: levelOf(this.root).length }, "filter"));
        const text = this.button("add-text", "Add words", "bi-fonts", "Add words");
        text.addEventListener("click", () => this.insert({ level: [], index: levelOf(this.root).length }, "text"));
        adds.append(filter, text);

        const tools = createElement("span", [`${CLS}-toolbar`]);
        setAttr(tools, "role", "group");
        setAttr(tools, "aria-label", "Act on the checked rows");
        for (const t of TOOLS)
        {
            const b = this.button(t.role, t.label, t.icon, t.label);
            b.addEventListener("click", () => this.tool(t.role));
            tools.appendChild(b);
        }
        footer.append(adds, tools);
        return footer;
    }

    // ── The checked items and the toolbar ──

    /** The checked items, in the order drawn, and the run they make when they sit next to each other in a level. */
    private selection(): { rows: Row[]; run: ItemRun | null }
    {
        const rows: Row[] = [];
        const paths: ItemPath[] = [];
        for (const [line, row] of this.rowOfLine)
        {
            if (!this.checked.has(row)) { continue; }
            rows.push(row);
            paths.push(parseItemPath(line.getAttribute("data-item")!));
        }
        if (paths.length === 0) { return { rows, run: null }; }

        const level = paths[0].slice(0, -1);
        const indices = paths.map((p) => p[p.length - 1]);
        const together = paths.every((p) => p.slice(0, -1).join(".") === level.join("."))
            && indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
        return { rows, run: together ? { level, start: indices[0], end: indices[indices.length - 1] } : null };
    }

    /** Turns each toolbar button on or off for the checked items, with a title that says why (spec 5.3). */
    private updateToolbar(): void
    {
        if (!this.el) { return; }
        const { rows, run } = this.selection();
        const one = (rows.length === 1 && rows[0].kind === "group") ? rows[0] : null;
        const up = !!run && !!moveTarget(this.root, run.level, run.start, run.end, -1);
        const down = !!run && !!moveTarget(this.root, run.level, run.start, run.end, 1);
        const state: Record<string, [boolean, string]> = {
            "tool-group": [!!run && run.end > run.start, "Check two or more rows next to each other to group them"],
            "tool-ungroup": [!!one && one.nots === 0, one ? NOT_UNGROUP : "Check one group to ungroup it"],
            "tool-up": [up, run ? "The rows are at the top" : MOVE_OFF],
            "tool-down": [down, run ? "The rows are at the bottom" : MOVE_OFF],
            "tool-remove": [rows.length > 0, "Check the rows to remove"],
        };
        for (const t of TOOLS)
        {
            const [on, off] = state[t.role];
            const b = this.toolButton(t.role)!;
            b.disabled = !!this.opts.disabled || !on;
            b.title = on ? t.label + (t.action ? ` (${this.binding(t.action)})` : "") : off;
        }
    }

    private binding(action: string): string
    {
        return this.opts.keyBindings?.[action] ?? DEFAULT_KEY_BINDINGS[action];
    }

    private tool(role: string): void
    {
        const { rows, run } = this.selection();
        if (role === "tool-remove") { this.removeRows(rows); return; }
        if (role === "tool-ungroup") { this.ungroup(rows[0] as GroupRow); return; }
        if (!run) { return; }
        if (role === "tool-group") { this.groupRun(run); return; }
        this.moveRun(run, (role === "tool-up") ? -1 : 1, { tool: role });
    }

    // ── Actions ──

    /** Adds a draft condition or words at a place, joined with And (spec 5.4). */
    private insert(at: Place, kind: "filter" | "text"): void
    {
        const row: Row = (kind === "text") ? { kind: "text", phrase: "", nots: 0 }
            : { kind: "filter", key: "", op: "", values: [], original: [], nots: 0 };
        this.act("insert-" + kind, [...at.level, at.index], () =>
        {
            insertItem(this.root, at, row);
            return { row, role: (kind === "text") ? "phrase" : "key" };
        }, (kind === "text") ? "Words added" : "Condition added");
    }

    /** Moves a run of items one place, by Move up or Move down, and announces the row they land on. */
    private moveRun(run: ItemRun, by: -1 | 1, focus: Focus): void
    {
        const to = moveTarget(this.root, run.level, run.start, run.end, by);
        if (!to) { return; }
        const first = levelOf(levelAt(this.root, run.level))[run.start].row;
        this.act((by < 0) ? "move-up" : "move-down", [...run.level, run.start], () =>
        {
            moveItems(this.root, run.level, run.start, run.end, to);
            return { ...focus, row: first };
        }, () => "Moved to row " + this.lineNumber(first));
    }

    /** Groups the checked run. The new group is checked in place of the items it took (spec 5.3). */
    private groupRun(run: ItemRun): void
    {
        if (run.end <= run.start) { return; }
        const items = levelOf(levelAt(this.root, run.level)).slice(run.start, run.end + 1);
        this.act("group", [...run.level, run.start], () =>
        {
            const group = itemAt(this.root, groupItems(this.root, run.level, run.start, run.end)).item.row;
            items.forEach((it) => this.checked.delete(it.row));
            this.checked.add(group);
            return { row: group };
        }, "Grouped");
    }

    /** Puts a group's items back in its place, and focuses the first. A group with Not keeps them. */
    private ungroup(group: GroupRow): void
    {
        if (group.nots > 0) { return; }
        const path = itemPathOf(this.root, group)!;
        const first = levelOf(group)[0]?.row;
        this.act("ungroup", path, () =>
        {
            ungroupItem(this.root, path);
            this.checked.delete(group);
            return first ? { row: first } : undefined;
        }, "Ungrouped");
    }

    /** Removes rows and groups, and focuses the next line, or the one before, or Add condition (spec 6). */
    private removeRows(rows: Row[]): void
    {
        if (rows.length === 0) { return; }
        const order = Array.from(this.lineOf.keys());
        const gone = new Set(rows.flatMap((r) => Array.from(allRows(r), (x) => x.row)));
        const at = order.findIndex((r) => gone.has(r));
        this.act("remove", itemPathOf(this.root, rows[0])!, () =>
        {
            removeItems(this.root, rows);
            rows.forEach((r) => this.checked.delete(r));
            const near = [...order.slice(at), ...order.slice(0, at).reverse()]
                .find((r) => !gone.has(r) && itemPathOf(this.root, r) !== null);
            return near ? { row: near } : { tool: "add-filter" };
        }, "Removed");
    }

    // ── Keyboard ──

    private onKeydown(e: KeyboardEvent): void
    {
        // Escape closes the ⋯ menu and stops there. With nothing open, it reaches the dialog (spec 7.1).
        if (e.key === "Escape")
        {
            if (!this.menu) { return; }
            e.preventDefault();
            e.stopPropagation();
            this.closeMenu(true);
            return;
        }
        if (this.opts.disabled) { return; }
        const target = e.target as HTMLElement;
        if (this.menu?.el.contains(target))
        {
            this.menuKey(e);
            return;
        }

        const line = target.closest<HTMLElement>(`.${CLS}-line`);
        const row = line ? this.rowOfLine.get(line) : undefined;
        const role = target.getAttribute("data-role") ?? undefined;
        const arrow = e.key === "ArrowUp" || e.key === "ArrowDown";
        // A select reads the arrow keys itself, so they step through the grid from a check box only (spec 6).
        if (row && role === "check" && arrow && !e.altKey && !e.ctrlKey && !e.metaKey)
        {
            e.preventDefault();
            this.stepCheck(row, (e.key === "ArrowUp") ? -1 : 1, e.shiftKey);
            return;
        }
        for (const action of ["group", "ungroup", "moveUp", "moveDown"])
        {
            if (!this.matches(e, action)) { continue; }
            e.preventDefault();
            this.keyAction(action, row, role);
            return;
        }
    }

    /** The focus to the check box of the line above or below, or, with Shift, the checks of the level grow. */
    private stepCheck(row: Row, by: -1 | 1, extend: boolean): void
    {
        if (!extend)
        {
            const lines = Array.from(this.lineOf.values());
            const next = lines[lines.indexOf(this.lineOf.get(row)!) + by];
            next?.querySelector<HTMLElement>("[data-role=check]")!.focus();
            return;
        }
        const { items, index } = itemAt(this.root, itemPathOf(this.root, row)!);
        const other = items[index + by];
        if (!other) { return; }
        for (const r of [row, other.row])
        {
            this.checked.add(r);
            this.lineOf.get(r)!.querySelector<HTMLInputElement>("[data-role=check]")!.checked = true;
        }
        this.updateToolbar();
        this.lineOf.get(other.row)!.querySelector<HTMLElement>("[data-role=check]")!.focus();
    }

    /** A key's action, on the checked items, or on the item whose line holds the focus when none is checked. */
    private keyAction(action: string, row: Row | undefined, role: string | undefined): void
    {
        let { rows, run } = this.selection();
        if (rows.length === 0 && row)
        {
            const p = itemPathOf(this.root, row)!;
            rows = [row];
            run = { level: p.slice(0, -1), start: p[p.length - 1], end: p[p.length - 1] };
        }
        if (action === "ungroup")
        {
            if (rows.length === 1 && rows[0].kind === "group") { this.ungroup(rows[0]); }
            return;
        }
        if (!run) { return; }
        if (action === "group") { this.groupRun(run); return; }
        this.moveRun(run, (action === "moveUp") ? -1 : 1, { role });
    }

    private matches(e: KeyboardEvent, action: string): boolean
    {
        const parts = this.binding(action).split("+");
        const key = parts[parts.length - 1];
        // Alt changes the letter a key sends on macOS, so a letter is read by the key's place.
        const hit = /^[a-z]$/i.test(key) ? e.code === "Key" + key.toUpperCase() : e.key === key;
        return hit && e.altKey === parts.includes("Alt") && e.ctrlKey === parts.includes("Ctrl")
            && e.shiftKey === parts.includes("Shift") && e.metaKey === parts.includes("Meta");
    }

    // ── Drag ──

    /** Escape ends a drag wherever the focus is, and stops there (spec 5.6, 7.1). */
    private readonly dragKey = (e: KeyboardEvent): void =>
    {
        if (e.key !== "Escape" || !this.dragging) { return; }
        e.preventDefault();
        e.stopPropagation();
        this.gestures!.cancel();
    };

    private dragStart(e: PointerEvent): void
    {
        const line = (e.target as Element).closest<HTMLElement>(`.${CLS}-line`)!;
        this.closeMenu(false);
        this.dragging = this.rowOfLine.get(line)!;
        line.classList.add(`${CLS}-dragging`);
        document.addEventListener("keydown", this.dragKey, true);
        logDebug("Drag started at", line.getAttribute("data-item"));
    }

    /** Marks where the item would land, or nothing where a drop is refused. */
    private dragMove(x: number, y: number): void
    {
        if (!this.dragging) { return; }
        this.clearMarks();
        const from = itemPathOf(this.root, this.dragging)!;
        const i = from[from.length - 1];
        const place = this.placeAt(x, y);
        this.dropAt = (place && !refuses(this.root, from.slice(0, -1), i, i, place)) ? place : null;
        logTrace("Drag at", Math.round(x), Math.round(y), "to",
            this.dropAt ? this.dropAt.level.join(".") + "@" + this.dropAt.index : "nowhere");
        if (this.dropAt) { this.markPlace(this.dropAt); }
    }

    private dragEnd(): void
    {
        const row = this.dragging;
        const to = this.dropAt;
        this.dragClear("drop");
        if (!row || !to) { return; }

        const from = itemPathOf(this.root, row)!;
        const i = from[from.length - 1];
        this.act("drag", from, () =>
        {
            moveItems(this.root, from.slice(0, -1), i, i, to);
            return { row };
        }, () => "Moved to row " + this.lineNumber(row));
    }

    private dragClear(why: string): void
    {
        if (this.dragging) { logDebug("Drag ended:", why); }
        document.removeEventListener("keydown", this.dragKey, true);
        this.clearMarks();
        this.el?.querySelectorAll(`.${CLS}-dragging`).forEach((n) => n.classList.remove(`${CLS}-dragging`));
        this.dragging = null;
        this.dropAt = null;
    }

    /**
     * The place under a point (spec 5.6): before a line's item in its top half, first in a group under its line's
     * bottom half, and after a row in its bottom half. Where levels end on that line, the bracket column under the
     * pointer picks the level. Under the footer, the end of the top level.
     */
    private placeAt(x: number, y: number): Place | null
    {
        const under = document.elementFromPoint(x, y);
        if (!under || !this.el?.contains(under)) { return null; }
        if (under.closest(`.${CLS}-footer`)) { return { level: [], index: levelOf(this.root).length }; }
        const line = under.closest<HTMLElement>(`.${CLS}-line`);
        if (!line) { return null; }

        const p = parseItemPath(line.getAttribute("data-item")!);
        const d = p.length - 1;
        const box = line.getBoundingClientRect();
        if (y < box.top + box.height / 2) { return { level: p.slice(0, -1), index: p[d] }; }
        if (line.classList.contains(`${CLS}-line-group`)) { return { level: p, index: 0 }; }

        // The levels that end on this line: this row's, and each one above while it is the last of its level.
        let m = d;
        const isLast = (k: number): boolean => p[k] === levelOf(levelAt(this.root, p.slice(0, k))).length - 1;
        while (m > 0 && isLast(m)) { m -= 1; }

        const cells = Array.from(line.querySelectorAll<HTMLElement>(`.${CLS}-bracket`));
        const over = cells.findIndex((c) =>
        {
            const r = c.getBoundingClientRect();
            return x >= r.left && x < r.right;
        });
        const right = cells.length === 0 || x >= cells[cells.length - 1].getBoundingClientRect().right;
        const j = right ? d : (over < 0) ? m : Math.min(Math.max(over, m), d);
        return { level: p.slice(0, j), index: p[j] + 1 };
    }

    /** Draws the drop line before an item, or after a level's last line, from the place's bracket column. */
    private markPlace(place: Place): void
    {
        const items = levelOf(levelAt(this.root, place.level));
        const depth = String(place.level.length);
        if (place.index < items.length)
        {
            const line = this.lineOf.get(items[place.index].row)!;
            line.classList.add(`${CLS}-drop-before`);
            line.style.setProperty("--eb-drop-depth", depth);
            return;
        }
        // After the level's last line: the last line inside its last item.
        let last: Row | undefined = items[items.length - 1]?.row;
        while (last?.kind === "group" && levelOf(last).length > 0)
        {
            const inner = levelOf(last);
            last = inner[inner.length - 1].row;
        }
        if (!last)
        {
            this.el!.querySelector(`.${CLS}-level`)!.classList.add(`${CLS}-drop-end`);
            return;
        }
        const line = this.lineOf.get(last)!;
        line.classList.add(`${CLS}-drop-after`);
        line.style.setProperty("--eb-drop-depth", depth);
    }

    private clearMarks(): void
    {
        this.el?.querySelectorAll(`.${CLS}-drop-before, .${CLS}-drop-after, .${CLS}-drop-end`).forEach((n) =>
        {
            n.classList.remove(`${CLS}-drop-before`, `${CLS}-drop-after`, `${CLS}-drop-end`);
            (n as HTMLElement).style.removeProperty("--eb-drop-depth");
        });
    }

    // ── Problems ──

    /** Shows each problem on its row's line, and the rest above the grid, and announces a new set once. */
    private renderProblems(): void
    {
        if (!this.el || !this.message) { return; }
        this.el.querySelectorAll(`.${CLS}-problem`).forEach((n) => n.remove());
        this.el.querySelectorAll(`.${CLS}-has-error, .${CLS}-has-warning`).forEach((n) =>
            n.classList.remove(`${CLS}-has-error`, `${CLS}-has-warning`));
        while (this.message.firstChild) { this.message.removeChild(this.message.firstChild); }

        const lineOf = (p: Placed): HTMLElement | null => (p.row ? this.lineOf.get(p.row) ?? null : null);
        const above = this.problems.filter((p) => !lineOf(p));
        for (const p of this.problems)
        {
            const line = lineOf(p);
            if (line)
            {
                line.classList.add(`${CLS}-has-${p.severity}`);
                line.appendChild(this.problemLine(p));
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
