/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DynamicUIRuntime — CanvasDocument validation, patch fold, history.
 * Covers PRD §5 (CanvasDocument) and plan Phase 1.
 */

import { describe, test, expect } from "vitest";

import {
    applyPatch,
    branch,
    createEmptyDocument,
    fold,
    foldTo,
    validateDocument,
    validatePatch,
} from "./document";

import type { Binding, CanvasNode, CanvasPatch } from "./types";

// ============================================================================
// HELPERS
// ============================================================================

function node(id: string, component = "datagrid"): CanvasNode
{
    return {
        id,
        component,
        placement: { kind: "intent", region: "main", size: "standard" },
        options: {},
        source: null,
        state: {},
        anchor: { kind: "canvas" },
        provenance: { turnId: "t1", lastTouched: 1 },
        pinned: false,
        grants: [],
    };
}

function binding(id: string, from: string, to: string): Binding
{
    return {
        id,
        from: { node: from, channel: "selection" },
        to: { node: to, slot: "rows" },
        cardinality: "replace",
    };
}

function patch(revision: number, ops: CanvasPatch["ops"]): CanvasPatch
{
    return { turnId: `t${revision}`, revision, ops };
}

// ============================================================================
// EMPTY DOCUMENT
// ============================================================================

describe("createEmptyDocument", () =>
{
    test("produces a valid document", () =>
    {
        const doc = createEmptyDocument("c1", "w1");

        expect(validateDocument(doc).ok).toBe(true);
    });

    test("starts at revision zero with no nodes", () =>
    {
        const doc = createEmptyDocument("c1", "w1");

        expect(doc.revision).toBe(0);
        expect(Object.keys(doc.nodes)).toHaveLength(0);
        expect(doc.bindings).toHaveLength(0);
    });
});

// ============================================================================
// DOCUMENT VALIDATION
// ============================================================================

describe("validateDocument", () =>
{
    test("accepts a document with nodes and bindings", () =>
    {
        const doc = fold([
            patch(1, [
                { op: "addNode", node: node("a") },
                { op: "addNode", node: node("b") },
                { op: "addBinding", binding: binding("x", "a", "b") },
            ]),
        ]);

        expect(validateDocument(doc).ok).toBe(true);
    });

    test("rejects a non-object document", () =>
    {
        const res = validateDocument(null);

        expect(res.ok).toBe(false);
        expect(res.issues[0].path).toBe("$");
    });

    test("rejects an unsupported schema version", () =>
    {
        const doc = { ...createEmptyDocument("c1", "w1"), schemaVersion: 99 };
        const res = validateDocument(doc);

        expect(res.ok).toBe(false);
        expect(res.issues.some((i) => i.path === "schemaVersion")).toBe(true);
    });

    test("rejects an unknown placement region and names the path", () =>
    {
        const bad = {
            ...node("a"),
            placement: { kind: "intent", region: "nowhere", size: "standard" },
        };
        const doc = { ...createEmptyDocument("c1", "w1"), nodes: { a: bad } };
        const res = validateDocument(doc);

        expect(res.ok).toBe(false);
        expect(res.issues.some(
            (i) => i.path === "nodes.a.placement.region")).toBe(true);
    });

    test("rejects a node whose key does not match its id", () =>
    {
        const doc = {
            ...createEmptyDocument("c1", "w1"),
            nodes: { wrongkey: node("a") },
        };
        const res = validateDocument(doc);

        expect(res.ok).toBe(false);
        expect(res.issues.some((i) => i.path === "nodes.wrongkey.id")).toBe(true);
    });

    test("rejects a binding referencing an unknown source node", () =>
    {
        const doc = fold([patch(1, [{ op: "addNode", node: node("b") }])]);
        const withBad = { ...doc, bindings: [binding("x", "ghost", "b")] };
        const res = validateDocument(withBad);

        expect(res.ok).toBe(false);
        expect(res.issues.some(
            (i) => i.path === "bindings.x.from.node")).toBe(true);
    });

    test("rejects a binding referencing an unknown target node", () =>
    {
        const doc = fold([patch(1, [{ op: "addNode", node: node("a") }])]);
        const withBad = { ...doc, bindings: [binding("x", "a", "ghost")] };
        const res = validateDocument(withBad);

        expect(res.ok).toBe(false);
        expect(res.issues.some((i) => i.path === "bindings.x.to.node")).toBe(true);
    });

    test("rejects a node anchored to an unknown node", () =>
    {
        const anchored: CanvasNode = {
            ...node("a"),
            anchor: { kind: "node", nodeId: "ghost" },
        };
        const doc = { ...createEmptyDocument("c1", "w1"), nodes: { a: anchored } };
        const res = validateDocument(doc);

        expect(res.ok).toBe(false);
        expect(res.issues.some(
            (i) => i.path === "nodes.a.anchor.nodeId")).toBe(true);
    });

    test("rejects a fanout cap above the ceiling", () =>
    {
        const doc = fold([
            patch(1, [
                { op: "addNode", node: node("a") },
                { op: "addNode", node: node("b") },
            ]),
        ]);
        const withBad = {
            ...doc,
            bindings: [{ ...binding("x", "a", "b"), cardinality: "fanout" as const, maxFanout: 9999 }],
        };
        const res = validateDocument(withBad);

        expect(res.ok).toBe(false);
        expect(res.issues.some(
            (i) => i.path === "bindings.x.maxFanout")).toBe(true);
    });

    test("collects every issue rather than stopping at the first", () =>
    {
        const doc = {
            ...createEmptyDocument("c1", "w1"),
            schemaVersion: 42,
            viewport: { x: 0, y: 0, zoom: "big" },
        };
        const res = validateDocument(doc);

        expect(res.issues.length).toBeGreaterThan(1);
    });
});

// ============================================================================
// CYCLE DETECTION
// ============================================================================

describe("validateDocument — cycles", () =>
{
    test("rejects a two-node binding loop", () =>
    {
        const doc = fold([
            patch(1, [
                { op: "addNode", node: node("a") },
                { op: "addNode", node: node("b") },
                { op: "addBinding", binding: binding("x", "a", "b") },
                { op: "addBinding", binding: binding("y", "b", "a") },
            ]),
        ]);
        const res = validateDocument(doc);

        expect(res.ok).toBe(false);
        expect(res.issues.some((i) => i.problem.includes("cycle"))).toBe(true);
    });

    test("rejects a three-node binding loop", () =>
    {
        const doc = fold([
            patch(1, [
                { op: "addNode", node: node("a") },
                { op: "addNode", node: node("b") },
                { op: "addNode", node: node("c") },
                { op: "addBinding", binding: binding("x", "a", "b") },
                { op: "addBinding", binding: binding("y", "b", "c") },
                { op: "addBinding", binding: binding("z", "c", "a") },
            ]),
        ]);

        expect(validateDocument(doc).ok).toBe(false);
    });

    test("accepts a diamond, which is not a cycle", () =>
    {
        const doc = fold([
            patch(1, [
                { op: "addNode", node: node("a") },
                { op: "addNode", node: node("b") },
                { op: "addNode", node: node("c") },
                { op: "addNode", node: node("d") },
                { op: "addBinding", binding: binding("w", "a", "b") },
                { op: "addBinding", binding: binding("x", "a", "c") },
                { op: "addBinding", binding: binding("y", "b", "d") },
                { op: "addBinding", binding: binding("z", "c", "d") },
            ]),
        ]);

        expect(validateDocument(doc).ok).toBe(true);
    });

    test("rejects a self-binding", () =>
    {
        const doc = fold([
            patch(1, [
                { op: "addNode", node: node("a") },
                { op: "addBinding", binding: binding("x", "a", "a") },
            ]),
        ]);

        expect(validateDocument(doc).ok).toBe(false);
    });
});

// ============================================================================
// PATCH APPLICATION
// ============================================================================

describe("applyPatch", () =>
{
    test("adds a node and advances the revision", () =>
    {
        const doc = createEmptyDocument("c1", "w1");
        const next = applyPatch(doc, patch(1, [{ op: "addNode", node: node("a") }]));

        expect(next.revision).toBe(1);
        expect(next.nodes.a).toBeDefined();
    });

    test("does not mutate the input document", () =>
    {
        const doc = createEmptyDocument("c1", "w1");

        applyPatch(doc, patch(1, [{ op: "addNode", node: node("a") }]));

        expect(Object.keys(doc.nodes)).toHaveLength(0);
        expect(doc.revision).toBe(0);
    });

    test("removes a node", () =>
    {
        const doc = fold([patch(1, [{ op: "addNode", node: node("a") }])]);
        const next = applyPatch(doc, patch(2, [{ op: "removeNode", id: "a" }]));

        expect(next.nodes.a).toBeUndefined();
    });

    test("removing a node also removes bindings that reference it", () =>
    {
        const doc = fold([
            patch(1, [
                { op: "addNode", node: node("a") },
                { op: "addNode", node: node("b") },
                { op: "addBinding", binding: binding("x", "a", "b") },
            ]),
        ]);
        const next = applyPatch(doc, patch(2, [{ op: "removeNode", id: "a" }]));

        expect(next.bindings).toHaveLength(0);
        expect(validateDocument(next).ok).toBe(true);
    });

    test("removing a node re-anchors nodes anchored to it", () =>
    {
        const child: CanvasNode = {
            ...node("b"),
            anchor: { kind: "node", nodeId: "a" },
        };
        const doc = fold([
            patch(1, [
                { op: "addNode", node: node("a") },
                { op: "addNode", node: child },
            ]),
        ]);
        const next = applyPatch(doc, patch(2, [{ op: "removeNode", id: "a" }]));

        expect(next.nodes.b.anchor.kind).toBe("canvas");
        expect(validateDocument(next).ok).toBe(true);
    });

    test("updates a node by merging changes", () =>
    {
        const doc = fold([patch(1, [{ op: "addNode", node: node("a") }])]);
        const next = applyPatch(doc, patch(2, [
            { op: "updateNode", id: "a", changes: { pinned: true } },
        ]));

        expect(next.nodes.a.pinned).toBe(true);
        expect(next.nodes.a.component).toBe("datagrid");
    });

    test("ignores an update to a node that does not exist", () =>
    {
        const doc = createEmptyDocument("c1", "w1");
        const next = applyPatch(doc, patch(1, [
            { op: "updateNode", id: "ghost", changes: { pinned: true } },
        ]));

        expect(Object.keys(next.nodes)).toHaveLength(0);
    });

    test("replaces a binding when one with the same id is added", () =>
    {
        const doc = fold([
            patch(1, [
                { op: "addNode", node: node("a") },
                { op: "addNode", node: node("b") },
                { op: "addBinding", binding: binding("x", "a", "b") },
                {
                    op: "addBinding",
                    binding: { ...binding("x", "a", "b"), cardinality: "fanout" as const },
                },
            ]),
        ]);

        expect(doc.bindings).toHaveLength(1);
        expect(doc.bindings[0].cardinality).toBe("fanout");
    });

    test("applies setViewport and setMeta", () =>
    {
        const doc = createEmptyDocument("c1", "w1");
        const next = applyPatch(doc, patch(1, [
            { op: "setViewport", viewport: { x: 10, y: 20, zoom: 2 } },
            { op: "setMeta", title: "Renamed" },
        ]));

        expect(next.viewport).toEqual({ x: 10, y: 20, zoom: 2 });
        expect(next.title).toBe("Renamed");
    });

    test("carries the patch turnId onto the document", () =>
    {
        const doc = createEmptyDocument("c1", "w1");
        const next = applyPatch(doc, patch(7, []));

        expect(next.turnId).toBe("t7");
    });
});

// ============================================================================
// PATCH VALIDATION
// ============================================================================

describe("validatePatch", () =>
{
    test("rejects a revision that does not follow the document", () =>
    {
        const doc = createEmptyDocument("c1", "w1");
        const res = validatePatch(patch(5, []), doc);

        expect(res.ok).toBe(false);
        expect(res.issues.some((i) => i.path === "revision")).toBe(true);
    });

    test("rejects an unknown op", () =>
    {
        const doc = createEmptyDocument("c1", "w1");
        const bad = { turnId: "t1", revision: 1, ops: [{ op: "detonate" }] };
        const res = validatePatch(bad, doc);

        expect(res.ok).toBe(false);
        expect(res.issues.some((i) => i.path === "ops.0.op")).toBe(true);
    });

    test("rejects a patch that would produce an invalid document", () =>
    {
        const doc = createEmptyDocument("c1", "w1");
        const res = validatePatch(
            patch(1, [{ op: "addBinding", binding: binding("x", "ghost", "b") }]),
            doc);

        expect(res.ok).toBe(false);
    });

    test("accepts a well-formed patch", () =>
    {
        const doc = createEmptyDocument("c1", "w1");
        const res = validatePatch(
            patch(1, [{ op: "addNode", node: node("a") }]), doc);

        expect(res.ok).toBe(true);
    });

    test("applyPatch throws on a patch that fails validation", () =>
    {
        const doc = createEmptyDocument("c1", "w1");

        expect(() => applyPatch(
            doc,
            patch(1, [{ op: "addBinding", binding: binding("x", "g", "h") }]),
            { validate: true })).toThrow();
    });

    test("a rejected patch leaves the document untouched", () =>
    {
        const doc = fold([patch(1, [{ op: "addNode", node: node("a") }])]);

        try
        {
            applyPatch(
                doc,
                patch(2, [
                    { op: "addNode", node: node("b") },
                    { op: "addBinding", binding: binding("x", "b", "ghost") },
                ]),
                { validate: true });
        }
        catch
        {
            // expected
        }

        expect(Object.keys(doc.nodes)).toEqual(["a"]);
    });
});

// ============================================================================
// FOLD AND HISTORY
// ============================================================================

describe("fold", () =>
{
    test("folding no patches yields an empty document", () =>
    {
        const doc = fold([]);

        expect(doc.revision).toBe(0);
        expect(Object.keys(doc.nodes)).toHaveLength(0);
    });

    test("is deterministic for the same patch list", () =>
    {
        const patches = [
            patch(1, [{ op: "addNode", node: node("a") }]),
            patch(2, [{ op: "addNode", node: node("b") }]),
            patch(3, [{ op: "removeNode", id: "a" }]),
        ];

        expect(fold(patches)).toEqual(fold(patches));
    });

    test("folds to the final revision", () =>
    {
        const doc = fold([
            patch(1, [{ op: "addNode", node: node("a") }]),
            patch(2, [{ op: "addNode", node: node("b") }]),
        ]);

        expect(doc.revision).toBe(2);
        expect(Object.keys(doc.nodes).sort()).toEqual(["a", "b"]);
    });

    test("a turn producing no ops still advances the revision", () =>
    {
        const doc = fold([
            patch(1, [{ op: "addNode", node: node("a") }]),
            patch(2, []),
        ]);

        expect(doc.revision).toBe(2);
        expect(doc.turnId).toBe("t2");
    });
});

describe("foldTo", () =>
{
    const patches = [
        patch(1, [{ op: "addNode", node: node("a") }]),
        patch(2, [{ op: "addNode", node: node("b") }]),
        patch(3, [{ op: "removeNode", id: "a" }]),
    ];

    test("rewinds history to an earlier revision", () =>
    {
        const doc = foldTo(patches, 2);

        expect(doc.revision).toBe(2);
        expect(Object.keys(doc.nodes).sort()).toEqual(["a", "b"]);
    });

    test("revision zero yields an empty document", () =>
    {
        expect(Object.keys(foldTo(patches, 0).nodes)).toHaveLength(0);
    });

    test("a revision beyond the log yields the full fold", () =>
    {
        expect(foldTo(patches, 99)).toEqual(fold(patches));
    });
});

describe("branch", () =>
{
    const patches = [
        patch(1, [{ op: "addNode", node: node("a") }]),
        patch(2, [{ op: "addNode", node: node("b") }]),
        patch(3, [{ op: "removeNode", id: "a" }]),
    ];

    test("returns the log prefix up to the branch point", () =>
    {
        expect(branch(patches, 2)).toHaveLength(2);
    });

    test("the branched log folds to the same state as foldTo", () =>
    {
        expect(fold(branch(patches, 2))).toEqual(foldTo(patches, 2));
    });

    test("does not mutate the source log", () =>
    {
        branch(patches, 1);

        expect(patches).toHaveLength(3);
    });
});
