/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 50fef56f-96f9-4cc0-835c-cff8832c090f
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Document
 * 📜 PURPOSE: The CanvasDocument scene format — validation with literate,
 *    path-named errors, and the pure patch fold that materialises a document
 *    from an append-only log. History scrubbing and branching fall out of the
 *    fold rather than needing machinery of their own.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[WiringEngine]], [[DynamicCanvas]]
 * ⚡ FLOW: [host patch log] -> [fold()] -> [CanvasDocument] -> [canvas]
 * 🔒 SECURITY: Documents are untrusted input. validateDocument() runs before
 *    any factory is resolved, and applyPatch({validate:true}) is atomic — a
 *    rejected patch never partially applies.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-document
// @entrypoint

import {
    CARDINALITY_POLICIES,
    FANOUT_CEILING,
    REGIONS,
    SCHEMA_VERSION,
    SIZE_HINTS,
} from "./constants";

import {
    enumIssue,
    formatIssues,
    issue,
    result,
    typeIssue,
    type ValidationIssue,
    type ValidationResult,
} from "./errors";

import { isFiniteNumber, isIdentifier, isObject } from "./predicates";

import type {
    Binding,
    CanvasDocument,
    CanvasNode,
    CanvasPatch,
    Viewport,
} from "./types";

/** Every legal PatchOp discriminator. */
const PATCH_OPS: readonly string[] =
[
    "setMeta", "addNode", "removeNode", "updateNode",
    "addBinding", "removeBinding", "setViewport",
];

// ============================================================================
// CONSTRUCTION
// ============================================================================

/**
 * Builds an empty, valid document at revision zero.
 *
 * @param id          - Canvas identifier.
 * @param workspaceId - Owning workspace identifier.
 * @param title       - Optional display title.
 * @returns A new empty document.
 */
export function createEmptyDocument(
    id: string,
    workspaceId: string,
    title = "Untitled canvas"): CanvasDocument
{
    return {
        schemaVersion: SCHEMA_VERSION as 1,
        id,
        workspaceId,
        title,
        nodes: {},
        bindings: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        turnId: "",
        revision: 0,
    };
}

// ============================================================================
// VALIDATION — HEADER
// ============================================================================

/**
 * Validates the scalar header fields of a document.
 *
 * @param doc    - The candidate document.
 * @param issues - Accumulator appended to in place.
 */
function validateHeader(
    doc: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    if (doc.schemaVersion !== SCHEMA_VERSION)
    {
        issues.push(issue(
            "schemaVersion",
            `Found ${String(doc.schemaVersion)}, but this runtime reads version ${SCHEMA_VERSION}.`,
            `Set schemaVersion to ${SCHEMA_VERSION}, or migrate the document.`));
    }

    for (const key of ["id", "workspaceId"])
    {
        if (!isIdentifier(doc[key]))
        {
            issues.push(typeIssue(key, "a non-empty string", doc[key]));
        }
    }

    if (typeof doc.title !== "string")
    {
        issues.push(typeIssue("title", "a string", doc.title));
    }

    if (!isFiniteNumber(doc.revision) || doc.revision < 0)
    {
        issues.push(typeIssue("revision", "a revision number of zero or more", doc.revision));
    }

    validateViewport(doc.viewport, "viewport", issues);
}

/**
 * Validates a viewport object.
 *
 * @param value  - The candidate viewport.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateViewport(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!isObject(value))
    {
        issues.push(typeIssue(path, "a viewport object", value));
        return;
    }

    for (const key of ["x", "y", "zoom"] as const)
    {
        if (!isFiniteNumber(value[key]))
        {
            issues.push(typeIssue(`${path}.${key}`, "a number", value[key]));
        }
    }
}

// ============================================================================
// VALIDATION — NODES
// ============================================================================

/**
 * Validates every node in the document, including key/id agreement and
 * anchor targets.
 *
 * @param doc    - The candidate document.
 * @param issues - Accumulator appended to in place.
 */
function validateNodes(
    doc: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    const nodes = doc.nodes;

    if (!isObject(nodes))
    {
        issues.push(typeIssue("nodes", "an object keyed by node id", nodes));
        return;
    }

    const ids = new Set(Object.keys(nodes));

    for (const [key, value] of Object.entries(nodes))
    {
        validateNode(key, value, ids, issues);
    }
}

/**
 * Validates one node.
 *
 * @param key    - The key the node is filed under.
 * @param value  - The candidate node.
 * @param ids    - Every node id in the document, for anchor resolution.
 * @param issues - Accumulator appended to in place.
 */
function validateNode(
    key: string,
    value: unknown,
    ids: ReadonlySet<string>,
    issues: ValidationIssue[]): void
{
    const path = `nodes.${key}`;

    if (!isObject(value))
    {
        issues.push(typeIssue(path, "a node object", value));
        return;
    }

    if (value.id !== key)
    {
        issues.push(issue(
            `${path}.id`,
            `Node id ${String(value.id)} does not match the key it is filed under.`,
            `Set id to "${key}", or move the node to key "${String(value.id)}".`));
    }

    if (!isIdentifier(value.component))
    {
        issues.push(typeIssue(`${path}.component`, "a component name", value.component));
    }

    if (typeof value.pinned !== "boolean")
    {
        issues.push(typeIssue(`${path}.pinned`, "a boolean", value.pinned));
    }

    validatePlacement(value.placement, `${path}.placement`, issues);
    validateAnchor(value.anchor, `${path}.anchor`, ids, issues);
    validateSource(value.source, `${path}.source`, issues);
}

/**
 * Validates a placement, which is either layout intent or fixed coordinates.
 *
 * @param value  - The candidate placement.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validatePlacement(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!isObject(value))
    {
        issues.push(typeIssue(path, "a placement object", value));
        return;
    }

    if (value.kind === "intent")
    {
        validateEnum(value.region, `${path}.region`, REGIONS, issues);
        validateEnum(value.size, `${path}.size`, SIZE_HINTS, issues);
        return;
    }

    if (value.kind === "fixed")
    {
        for (const key of ["x", "y", "w", "h", "z"] as const)
        {
            if (!isFiniteNumber(value[key]))
            {
                issues.push(typeIssue(`${path}.${key}`, "a number", value[key]));
            }
        }
        return;
    }

    issues.push(enumIssue(`${path}.kind`, value.kind, ["intent", "fixed"]));
}

/**
 * Validates an anchor and resolves a node anchor against the document.
 *
 * @param value  - The candidate anchor.
 * @param path   - JSON path for error reporting.
 * @param ids    - Every node id in the document.
 * @param issues - Accumulator appended to in place.
 */
function validateAnchor(
    value: unknown,
    path: string,
    ids: ReadonlySet<string>,
    issues: ValidationIssue[]): void
{
    if (!isObject(value))
    {
        issues.push(typeIssue(path, "an anchor object", value));
        return;
    }

    if (value.kind === "canvas")
    {
        return;
    }

    if (value.kind === "node")
    {
        if (!ids.has(String(value.nodeId)))
        {
            issues.push(issue(
                `${path}.nodeId`,
                `Anchored to node "${String(value.nodeId)}", which is not in this document.`,
                "Anchor to an existing node, or use an entity or canvas anchor."));
        }

        validateSpot(value, path, issues);
        return;
    }

    if (value.kind === "entity")
    {
        if (!isIdentifier(value.entityId))
        {
            issues.push(typeIssue(`${path}.entityId`, "an entity id", value.entityId));
        }
        return;
    }

    issues.push(enumIssue(`${path}.kind`, value.kind, ["canvas", "node", "entity"]));
}

/**
 * Validates the optional spot and scrolling-region index on a node anchor.
 *
 * These come from a pointer gesture, but a document may equally be authored by
 * a model — and a NaN fraction reaching the packer produces a mark at no
 * coordinates at all rather than an error anyone can see.
 *
 * @param anchor - The node anchor.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateSpot(
    anchor: Record<string, unknown>,
    path: string,
    issues: ValidationIssue[]): void
{
    if (anchor.spot !== undefined)
    {
        const spot = anchor.spot;

        if (!isObject(spot) || !isFraction(spot.x) || !isFraction(spot.y))
        {
            issues.push(typeIssue(
                `${path}.spot`,
                "a spot { x, y } with both between 0 and 1",
                spot));
        }
    }

    if (anchor.within !== undefined
        && !(typeof anchor.within === "number"
            && Number.isInteger(anchor.within) && anchor.within >= 0))
    {
        issues.push(typeIssue(
            `${path}.within`,
            "a scrolling-region index (a non-negative integer)",
            anchor.within));
    }
}

/** True for a finite number within 0..1. */
function isFraction(value: unknown): boolean
{
    return typeof value === "number" && Number.isFinite(value)
        && value >= 0 && value <= 1;
}

/**
 * Validates a data source, enforcing that a frozen source carries a snapshot.
 *
 * @param value  - The candidate source, or null.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateSource(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (value === null || value === undefined)
    {
        return;
    }

    if (!isObject(value))
    {
        issues.push(typeIssue(path, "a data source object or null", value));
        return;
    }

    if (!isObject(value.query))
    {
        issues.push(typeIssue(`${path}.query`, "a query object", value.query));
    }

    if (value.dataMode !== "live" && value.dataMode !== "frozen")
    {
        issues.push(enumIssue(`${path}.dataMode`, value.dataMode, ["live", "frozen"]));
    }

    if (value.dataMode === "frozen" && !("snapshot" in value))
    {
        issues.push(issue(
            `${path}.snapshot`,
            "A frozen source carries no snapshot, so it cannot be restored.",
            "Capture a snapshot when freezing, or set dataMode to \"live\"."));
    }
}

// ============================================================================
// VALIDATION — BINDINGS
// ============================================================================

/**
 * Validates every binding, resolving both endpoints against the node set.
 *
 * @param doc    - The candidate document.
 * @param issues - Accumulator appended to in place.
 */
function validateBindings(
    doc: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    const bindings = doc.bindings;

    if (!Array.isArray(bindings))
    {
        issues.push(typeIssue("bindings", "an array of bindings", bindings));
        return;
    }

    const ids = isObject(doc.nodes) ? new Set(Object.keys(doc.nodes)) : new Set<string>();
    const seen = new Set<string>();

    for (let i = 0; i < bindings.length; i++)
    {
        validateBinding(bindings[i], i, ids, seen, issues);
    }
}

/**
 * Validates one binding.
 *
 * @param value  - The candidate binding.
 * @param index  - Array index, used when the binding has no usable id.
 * @param ids    - Every node id in the document.
 * @param seen   - Binding ids already encountered, for duplicate detection.
 * @param issues - Accumulator appended to in place.
 */
function validateBinding(
    value: unknown,
    index: number,
    ids: ReadonlySet<string>,
    seen: Set<string>,
    issues: ValidationIssue[]): void
{
    if (!isObject(value))
    {
        issues.push(typeIssue(`bindings.${index}`, "a binding object", value));
        return;
    }

    const id = isIdentifier(value.id) ? value.id : String(index);
    const path = `bindings.${id}`;

    if (!isIdentifier(value.id))
    {
        issues.push(typeIssue(`${path}.id`, "a non-empty string", value.id));
    }
    else if (seen.has(value.id))
    {
        issues.push(issue(
            `${path}.id`,
            `Binding id "${value.id}" appears more than once.`,
            "Give every binding a unique id."));
    }

    seen.add(id);

    validateEndpoint(value.from, `${path}.from`, "channel", ids, issues);
    validateEndpoint(value.to, `${path}.to`, "slot", ids, issues);
    validateEnum(value.cardinality, `${path}.cardinality`, CARDINALITY_POLICIES, issues);
    validateFanout(value.maxFanout, `${path}.maxFanout`, issues);
}

/**
 * Validates one end of a binding.
 *
 * @param value   - The candidate endpoint.
 * @param path    - JSON path for error reporting.
 * @param portKey - "channel" for a source, "slot" for a target.
 * @param ids     - Every node id in the document.
 * @param issues  - Accumulator appended to in place.
 */
function validateEndpoint(
    value: unknown,
    path: string,
    portKey: "channel" | "slot",
    ids: ReadonlySet<string>,
    issues: ValidationIssue[]): void
{
    if (!isObject(value))
    {
        issues.push(typeIssue(path, "an endpoint object", value));
        return;
    }

    if (!ids.has(String(value.node)))
    {
        issues.push(issue(
            `${path}.node`,
            `References node "${String(value.node)}", which is not in this document.`,
            "Bind to a node that exists, or add the node in the same patch."));
    }

    if (!isIdentifier(value[portKey]))
    {
        issues.push(typeIssue(`${path}.${portKey}`, `a ${portKey} name`, value[portKey]));
    }
}

/**
 * Validates a fanout cap against the hard ceiling.
 *
 * @param value  - The candidate cap, or undefined.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateFanout(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (value === undefined)
    {
        return;
    }

    if (!isFiniteNumber(value) || value < 1)
    {
        issues.push(typeIssue(path, "a positive number", value));
        return;
    }

    if (value > FANOUT_CEILING)
    {
        issues.push(issue(
            path,
            `A cap of ${value} exceeds the ceiling of ${FANOUT_CEILING}.`,
            `Lower maxFanout to ${FANOUT_CEILING} or less — an unbounded fanout `
            + "can mount arbitrarily many components."));
    }
}

/**
 * Validates a value against a closed vocabulary.
 *
 * @param value   - The candidate value.
 * @param path    - JSON path for error reporting.
 * @param allowed - Every legal value.
 * @param issues  - Accumulator appended to in place.
 */
function validateEnum(
    value: unknown,
    path: string,
    allowed: readonly string[],
    issues: ValidationIssue[]): void
{
    if (typeof value !== "string" || !allowed.includes(value))
    {
        issues.push(enumIssue(path, value, allowed));
    }
}

// ============================================================================
// VALIDATION — CYCLES
// ============================================================================

/**
 * Detects propagation cycles in the binding graph.
 *
 * A cycle is authored easily — `a.selection -> b.subject` alongside
 * `b.selection -> a.subject` — and must fail loudly at validation rather than
 * silently at runtime.
 *
 * @param doc    - The candidate document.
 * @param issues - Accumulator appended to in place.
 */
function detectCycles(
    doc: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    const bindings = Array.isArray(doc.bindings) ? doc.bindings : [];
    const edges = buildAdjacency(bindings as readonly Binding[]);
    const state = new Map<string, "open" | "done">();

    for (const from of edges.keys())
    {
        const cycle = walk(from, edges, state, []);

        if (cycle.length > 0)
        {
            issues.push(issue(
                "bindings",
                `Bindings form a propagation cycle: ${cycle.join(" -> ")}.`,
                "Remove one binding in the loop, or introduce a transform that "
                + "terminates the chain."));
            return;
        }
    }
}

/**
 * Builds a node-to-node adjacency map from the binding list.
 *
 * @param bindings - Every binding in the document.
 * @returns Adjacency keyed by source node id.
 */
function buildAdjacency(
    bindings: readonly Binding[]): Map<string, Set<string>>
{
    const edges = new Map<string, Set<string>>();

    for (const b of bindings)
    {
        if (!isObject(b) || !isObject(b.from) || !isObject(b.to))
        {
            continue;
        }

        const from = String(b.from.node);
        const to = String(b.to.node);

        if (!edges.has(from))
        {
            edges.set(from, new Set());
        }

        edges.get(from)!.add(to);
    }

    return edges;
}

/**
 * Depth-first walk marking nodes open on the way down, returning the cycle
 * path when it re-enters an open node.
 *
 * @param at    - Node currently being visited.
 * @param edges - Adjacency map.
 * @param state - Visit state shared across walks.
 * @param path  - Nodes on the current descent.
 * @returns The cycle path, or an empty array when none was found.
 */
function walk(
    at: string,
    edges: ReadonlyMap<string, Set<string>>,
    state: Map<string, "open" | "done">,
    path: readonly string[]): readonly string[]
{
    const seen = state.get(at);

    if (seen === "done")
    {
        return [];
    }

    if (seen === "open")
    {
        const start = path.indexOf(at);

        return [...path.slice(start === -1 ? 0 : start), at];
    }

    state.set(at, "open");

    for (const next of edges.get(at) ?? [])
    {
        const cycle = walk(next, edges, state, [...path, at]);

        if (cycle.length > 0)
        {
            return cycle;
        }
    }

    state.set(at, "done");
    return [];
}

// ============================================================================
// PUBLIC — VALIDATION
// ============================================================================

/**
 * Validates a candidate canvas document in full.
 *
 * Runs every stage and collects all issues rather than stopping at the first,
 * so an author sees the complete picture in one pass.
 *
 * @param doc - The candidate document, from any source.
 * @returns The validation result.
 */
export function validateDocument(doc: unknown): ValidationResult
{
    if (!isObject(doc))
    {
        return result([typeIssue("$", "a canvas document object", doc)]);
    }

    const issues: ValidationIssue[] = [];

    validateHeader(doc, issues);
    validateNodes(doc, issues);
    validateBindings(doc, issues);

    if (issues.length === 0)
    {
        detectCycles(doc, issues);
    }

    return result(issues);
}

/**
 * Validates a patch against the document it will be applied to.
 *
 * Checks revision continuity and op shape first; only when those pass does it
 * dry-run the fold and validate the resulting document.
 *
 * @param patch - The candidate patch.
 * @param doc   - The document the patch applies to.
 * @returns The validation result.
 */
export function validatePatch(
    patch: unknown,
    doc: CanvasDocument): ValidationResult
{
    if (!isObject(patch))
    {
        return result([typeIssue("$", "a patch object", patch)]);
    }

    const issues = validatePatchShape(patch, doc);

    if (issues.length > 0)
    {
        return result(issues);
    }

    const next = reduceOps(doc, patch as unknown as CanvasPatch);

    return validateDocument(next);
}

/**
 * Validates a patch's own fields without applying it.
 *
 * @param patch - The candidate patch.
 * @param doc   - The document the patch applies to.
 * @returns Every issue found in the patch's shape.
 */
function validatePatchShape(
    patch: Record<string, unknown>,
    doc: CanvasDocument): ValidationIssue[]
{
    const issues: ValidationIssue[] = [];

    if (!isIdentifier(patch.turnId))
    {
        issues.push(typeIssue("turnId", "a non-empty string", patch.turnId));
    }

    if (patch.revision !== doc.revision + 1)
    {
        issues.push(issue(
            "revision",
            `Patch revision ${String(patch.revision)} does not follow document `
            + `revision ${doc.revision}.`,
            `Set revision to ${doc.revision + 1}, or reload the canvas — another `
            + "writer may have advanced it."));
    }

    if (!Array.isArray(patch.ops))
    {
        issues.push(typeIssue("ops", "an array of operations", patch.ops));
        return issues;
    }

    patch.ops.forEach((op: unknown, i: number) =>
    {
        if (!isObject(op) || typeof op.op !== "string" || !PATCH_OPS.includes(op.op))
        {
            issues.push(enumIssue(
                `ops.${i}.op`,
                isObject(op) ? op.op : op,
                PATCH_OPS));
        }
    });

    return issues;
}

// ============================================================================
// PUBLIC — FOLD
// ============================================================================

/** Options for applyPatch. */
export interface ApplyOptions
{
    /** Validate before applying, and throw when the patch is rejected. */
    readonly validate?: boolean;
}

/**
 * Applies a patch, returning a new document. Pure — the input is never
 * mutated, and a rejected patch never partially applies.
 *
 * @param doc   - The document to apply onto.
 * @param patch - The patch to apply.
 * @param opts  - Set validate to reject invalid patches with a thrown error.
 * @returns The resulting document.
 * @throws Error when validate is set and the patch is invalid.
 */
export function applyPatch(
    doc: CanvasDocument,
    patch: CanvasPatch,
    opts: ApplyOptions = {}): CanvasDocument
{
    if (opts.validate)
    {
        const res = validatePatch(patch, doc);

        if (!res.ok)
        {
            throw new Error(formatIssues(res, "canvas patch"));
        }
    }

    return reduceOps(doc, patch);
}

/**
 * Folds a patch's operations onto a document.
 *
 * @param doc   - The document to apply onto.
 * @param patch - The patch to apply.
 * @returns The resulting document.
 */
function reduceOps(
    doc: CanvasDocument,
    patch: CanvasPatch): CanvasDocument
{
    let nodes: Record<string, CanvasNode> = { ...doc.nodes };
    let bindings: Binding[] = [...doc.bindings];
    let viewport: Viewport = doc.viewport;
    let title = doc.title;
    let workspaceId = doc.workspaceId;

    for (const op of patch.ops ?? [])
    {
        switch (op.op)
        {
            case "setMeta":
                title = op.title ?? title;
                workspaceId = op.workspaceId ?? workspaceId;
                break;

            case "addNode":
                nodes[op.node.id] = op.node;
                break;

            case "removeNode":
                ({ nodes, bindings } = removeNode(nodes, bindings, op.id));
                break;

            case "updateNode":
                nodes = updateNode(nodes, op.id, op.changes);
                break;

            case "addBinding":
                bindings = upsertBinding(bindings, op.binding);
                break;

            case "removeBinding":
                bindings = bindings.filter((b) => b.id !== op.id);
                break;

            case "setViewport":
                viewport = op.viewport;
                break;
        }
    }

    return {
        ...doc,
        title,
        workspaceId,
        nodes,
        bindings,
        viewport,
        turnId: patch.turnId,
        revision: patch.revision,
    };
}

/**
 * Removes a node, dropping bindings that reference it and re-anchoring any
 * node anchored to it. This keeps the document valid by construction rather
 * than requiring the author to clean up after a removal.
 *
 * @param nodes    - Current node map.
 * @param bindings - Current binding list.
 * @param id       - Node to remove.
 * @returns The cleaned node map and binding list.
 */
function removeNode(
    nodes: Record<string, CanvasNode>,
    bindings: readonly Binding[],
    id: string): { nodes: Record<string, CanvasNode>; bindings: Binding[] }
{
    const next: Record<string, CanvasNode> = {};

    for (const [key, n] of Object.entries(nodes))
    {
        if (key === id)
        {
            continue;
        }

        next[key] = n.anchor.kind === "node" && n.anchor.nodeId === id
            ? { ...n, anchor: { kind: "canvas" } }
            : n;
    }

    return {
        nodes: next,
        bindings: bindings.filter(
            (b) => b.from.node !== id && b.to.node !== id),
    };
}

/**
 * Merges changes into an existing node. An update naming a node that is not
 * present is ignored rather than creating a partial node.
 *
 * @param nodes   - Current node map.
 * @param id      - Node to update.
 * @param changes - Fields to merge.
 * @returns The updated node map.
 */
function updateNode(
    nodes: Record<string, CanvasNode>,
    id: string,
    changes: Partial<CanvasNode>): Record<string, CanvasNode>
{
    const existing = nodes[id];

    if (!existing)
    {
        return nodes;
    }

    return { ...nodes, [id]: { ...existing, ...changes, id } };
}

/**
 * Adds a binding, replacing any existing binding with the same id so that
 * re-authoring a wire is idempotent.
 *
 * @param bindings - Current binding list.
 * @param binding  - The binding to add or replace.
 * @returns The updated binding list.
 */
function upsertBinding(
    bindings: readonly Binding[],
    binding: Binding): Binding[]
{
    const without = bindings.filter((b) => b.id !== binding.id);

    return [...without, binding];
}

// ============================================================================
// PUBLIC — HISTORY
// ============================================================================

/**
 * Materialises a document by folding a patch log.
 *
 * @param patches - The append-only log, in revision order.
 * @param base    - Optional starting document. Defaults to empty.
 * @returns The folded document.
 */
export function fold(
    patches: readonly CanvasPatch[],
    base?: CanvasDocument): CanvasDocument
{
    const start = base ?? createEmptyDocument("canvas", "workspace");

    return patches.reduce<CanvasDocument>(
        (doc, patch) => reduceOps(doc, patch),
        start);
}

/**
 * Folds the log up to and including a revision. This is history scrubbing —
 * restoring turn N is folding to revision N.
 *
 * @param patches  - The append-only log.
 * @param revision - Revision to stop at. Zero yields an empty document.
 * @param base     - Optional starting document.
 * @returns The document as of that revision.
 */
export function foldTo(
    patches: readonly CanvasPatch[],
    revision: number,
    base?: CanvasDocument): CanvasDocument
{
    return fold(patches.filter((p) => p.revision <= revision), base);
}

/**
 * Returns the log prefix up to a revision, ready to seed a new canvas. This
 * is branching — forking at turn N is copying the prefix.
 *
 * @param patches  - The append-only log.
 * @param revision - Revision to branch at.
 * @returns A new array containing the prefix. The source is not mutated.
 */
export function branch(
    patches: readonly CanvasPatch[],
    revision: number): CanvasPatch[]
{
    return patches.filter((p) => p.revision <= revision);
}
