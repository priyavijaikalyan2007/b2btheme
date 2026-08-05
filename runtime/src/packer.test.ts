/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DynamicUIRuntime — deterministic shelf packer.
 * Covers PRD §9.2 (placement intent, then coordinates) and plan Phase 11.
 */

import { describe, test, expect } from "vitest";

import { packDocument, type PackedRect } from "./packer";
import { fold } from "./document";

import type {
    CanvasNode,
    CanvasPatch,
    PatchOp,
    Placement,
    Region,
    SizeHint,
} from "./types";

// ============================================================================
// HELPERS
// ============================================================================

function node(
    id: string,
    placement: Placement,
    pinned = false,
    anchor: CanvasNode["anchor"] = { kind: "canvas" }): CanvasNode
{
    return {
        id,
        component: "grid",
        placement,
        options: {},
        source: null,
        state: {},
        anchor,
        provenance: { turnId: "t1", lastTouched: 1 },
        pinned,
        grants: [],
    };
}

function intent(region: Region, size: SizeHint): Placement
{
    return { kind: "intent", region, size };
}

function docOf(nodes: CanvasNode[]) {
    const ops: PatchOp[] = nodes.map((n) => ({ op: "addNode" as const, node: n }));
    const patch: CanvasPatch = { turnId: "t1", revision: 1, ops };
    return fold([patch]);
}

function overlaps(a: PackedRect, b: PackedRect): boolean
{
    return a.x < b.x + b.w && b.x < a.x + a.w
        && a.y < b.y + b.h && b.y < a.y + a.h;
}

// ============================================================================
// DETERMINISM
// ============================================================================

describe("packDocument — determinism", () =>
{
    test("produces the same layout for the same document", () =>
    {
        const doc = docOf([
            node("a", intent("main", "standard")),
            node("b", intent("main", "wide")),
            node("c", intent("side", "compact")),
        ]);

        expect(packDocument(doc)).toEqual(packDocument(doc));
    });

    test("is independent of node insertion order", () =>
    {
        const a = node("a", intent("main", "standard"));
        const b = node("b", intent("main", "wide"));

        const first = packDocument(docOf([a, b]));
        const second = packDocument(docOf([b, a]));

        expect(first.get("a")).toEqual(second.get("a"));
        expect(first.get("b")).toEqual(second.get("b"));
    });

    test("packs every node in the document", () =>
    {
        const doc = docOf([
            node("a", intent("main", "standard")),
            node("b", intent("side", "compact")),
        ]);

        expect([...packDocument(doc).keys()].sort()).toEqual(["a", "b"]);
    });

    test("an empty document packs to nothing", () =>
    {
        expect(packDocument(docOf([])).size).toBe(0);
    });
});

// ============================================================================
// NON-OVERLAP
// ============================================================================

describe("packDocument — non-overlap", () =>
{
    test("packed nodes never overlap", () =>
    {
        const doc = docOf([
            node("a", intent("main", "standard")),
            node("b", intent("main", "standard")),
            node("c", intent("main", "wide")),
            node("d", intent("main", "compact")),
            node("e", intent("main", "tall")),
        ]);

        const rects = [...packDocument(doc).values()];

        for (let i = 0; i < rects.length; i++)
        {
            for (let j = i + 1; j < rects.length; j++)
            {
                expect(
                    overlaps(rects[i], rects[j]),
                    `rect ${i} overlaps rect ${j}`)
                    .toBe(false);
            }
        }
    });

    test("regions do not collide with each other", () =>
    {
        const doc = docOf([
            node("m", intent("main", "full")),
            node("s", intent("side", "standard")),
        ]);

        const packed = packDocument(doc);

        expect(overlaps(packed.get("m")!, packed.get("s")!)).toBe(false);
    });

    test("wraps to a new shelf when a row is full", () =>
    {
        const many = Array.from({ length: 6 }, (_, i) =>
            node(`n${i}`, intent("main", "wide")));

        const rects = [...packDocument(docOf(many)).values()];
        const rows = new Set(rects.map((r) => r.y));

        expect(rows.size).toBeGreaterThan(1);
    });
});

// ============================================================================
// FIXED PLACEMENT
// ============================================================================

describe("packDocument — fixed placement", () =>
{
    test("honours explicit coordinates exactly", () =>
    {
        const fixed: Placement = {
            kind: "fixed", x: 900, y: 700, w: 300, h: 200, z: 5,
        };
        const doc = docOf([node("f", fixed)]);

        expect(packDocument(doc).get("f")).toEqual(
            { x: 900, y: 700, w: 300, h: 200, z: 5 });
    });

    test("flows packed nodes around a fixed obstacle", () =>
    {
        const fixed: Placement = {
            kind: "fixed", x: 0, y: 0, w: 400, h: 300, z: 1,
        };
        const doc = docOf([
            node("obstacle", fixed),
            node("a", intent("main", "standard")),
            node("b", intent("main", "standard")),
        ]);

        const packed = packDocument(doc);
        const obstacle = packed.get("obstacle")!;

        for (const id of ["a", "b"])
        {
            expect(
                overlaps(packed.get(id)!, obstacle),
                `${id} overlaps the user-placed node`)
                .toBe(false);
        }
    });

    test("a fixed node keeps its position regardless of others", () =>
    {
        const fixed: Placement = {
            kind: "fixed", x: 50, y: 50, w: 200, h: 200, z: 1,
        };

        const alone = packDocument(docOf([node("f", fixed)]));
        const crowded = packDocument(docOf([
            node("f", fixed),
            node("a", intent("main", "wide")),
            node("b", intent("main", "wide")),
        ]));

        expect(crowded.get("f")).toEqual(alone.get("f"));
    });
});

// ============================================================================
// SIZE AND REGION
// ============================================================================

describe("packDocument — sizing", () =>
{
    test("a wide node is wider than a compact one", () =>
    {
        const doc = docOf([
            node("compact", intent("main", "compact")),
            node("wide", intent("main", "wide")),
        ]);

        const packed = packDocument(doc);

        expect(packed.get("wide")!.w)
            .toBeGreaterThan(packed.get("compact")!.w);
    });

    test("a tall node is taller than a standard one", () =>
    {
        const doc = docOf([
            node("standard", intent("main", "standard")),
            node("tall", intent("main", "tall")),
        ]);

        const packed = packDocument(doc);

        expect(packed.get("tall")!.h)
            .toBeGreaterThan(packed.get("standard")!.h);
    });

    test("side region starts right of the main region", () =>
    {
        const doc = docOf([
            node("m", intent("main", "standard")),
            node("s", intent("side", "standard")),
        ]);

        const packed = packDocument(doc);

        expect(packed.get("s")!.x).toBeGreaterThan(packed.get("m")!.x);
    });

    test("overlay nodes sit above everything else", () =>
    {
        const doc = docOf([
            node("m", intent("main", "standard")),
            node("o", intent("overlay", "compact")),
        ]);

        const packed = packDocument(doc);

        expect(packed.get("o")!.z).toBeGreaterThan(packed.get("m")!.z);
    });
});

// ============================================================================
// PINNING
// ============================================================================

describe("packDocument — pinned nodes", () =>
{
    test("pinned nodes are packed before unpinned ones", () =>
    {
        const doc = docOf([
            node("plain", intent("main", "standard")),
            node("pinned", intent("main", "standard"), true),
        ]);

        const packed = packDocument(doc);

        expect(packed.get("pinned")!.x)
            .toBeLessThanOrEqual(packed.get("plain")!.x);
    });
});

// ============================================================================
// CANVAS WIDTH (REGRESSION)
// ============================================================================

describe("packDocument — canvas width", () =>
{
    test("a side-region node lands inside a narrow canvas", () =>
    {
        // Region origins were once fixed constants, putting `side` at x=1160.
        // On a narrower canvas the node mounted correctly and rendered
        // off-screen: no error, nothing visible, nothing logged.
        const doc = docOf([node("s", intent("side", "compact"))]);
        const rect = packDocument(doc, { width: 900 }).get("s")!;

        expect(rect.x + rect.w).toBeLessThanOrEqual(900);
    });

    test("side collapses onto main when the canvas is too narrow for both", () =>
    {
        const doc = docOf([
            node("m", intent("main", "compact")),
            node("s", intent("side", "compact")),
        ]);

        const packed = packDocument(doc, { width: 500 });

        expect(packed.get("s")!.x).toBe(packed.get("m")!.x);
        expect(packed.get("s")!.x + packed.get("s")!.w)
            .toBeLessThanOrEqual(500);
    });

    test("every node stays within the canvas at several widths", () =>
    {
        const doc = docOf([
            node("a", intent("main", "wide")),
            node("b", intent("side", "compact")),
            node("c", intent("main", "standard")),
            node("d", intent("side", "standard")),
        ]);

        for (const width of [480, 700, 1000, 1400, 1920])
        {
            for (const [id, r] of packDocument(doc, { width }))
            {
                expect(
                    r.x + r.w,
                    `${id} overflows a ${width}px canvas`)
                    .toBeLessThanOrEqual(width);
            }
        }
    });

    test("a wider canvas still separates main from side", () =>
    {
        const doc = docOf([
            node("m", intent("main", "compact")),
            node("s", intent("side", "compact")),
        ]);

        const packed = packDocument(doc, { width: 1600 });

        expect(packed.get("s")!.x).toBeGreaterThan(packed.get("m")!.x);
    });
});

// ============================================================================
// ANCHORED OVERLAYS
// ============================================================================

describe("packDocument — anchored overlays", () =>
{
    /** A grid with an annotation anchored to it. */
    function anchoredDoc()
    {
        return docOf([
            node("target", intent("main", "wide")),
            node("pin", intent("main", "compact"), false,
                { kind: "node", nodeId: "target" }),
        ]);
    }

    test("an anchored node overlaps the node it annotates", () =>
    {
        const packed = packDocument(anchoredDoc(), { width: 1200 });
        const target = packed.get("target")!;
        const pin = packed.get("pin")!;

        // The whole point: it sits ON its target, not beside it.
        expect(overlaps(pin, target)).toBe(true);
    });

    test("an anchored node stacks above its target", () =>
    {
        const packed = packDocument(anchoredDoc(), { width: 1200 });

        expect(packed.get("pin")!.z)
            .toBeGreaterThan(packed.get("target")!.z);
    });

    test("an anchored node does NOT displace other nodes", () =>
    {
        // Same document with and without the annotation. Every other node
        // must land in exactly the same place — an annotation annotates, it
        // does not rearrange the canvas.
        const without = packDocument(docOf([
            node("target", intent("main", "wide")),
            node("other", intent("main", "standard")),
        ]), { width: 1200 });

        const withPin = packDocument(docOf([
            node("target", intent("main", "wide")),
            node("other", intent("main", "standard")),
            node("pin", intent("main", "compact"), false,
                { kind: "node", nodeId: "target" }),
        ]), { width: 1200 });

        expect(withPin.get("target")).toEqual(without.get("target"));
        expect(withPin.get("other")).toEqual(without.get("other"));
    });

    test("many anchored nodes still displace nothing", () =>
    {
        const base = [
            node("a", intent("main", "standard")),
            node("b", intent("main", "standard")),
        ];

        const pins = Array.from({ length: 20 }, (_, i) =>
            node(`p${i}`, intent("main", "compact"), false,
                { kind: "node", nodeId: i % 2 === 0 ? "a" : "b" }));

        const without = packDocument(docOf(base), { width: 1200 });
        const withPins = packDocument(docOf([...base, ...pins]), { width: 1200 });

        expect(withPins.get("a")).toEqual(without.get("a"));
        expect(withPins.get("b")).toEqual(without.get("b"));
    });

    test("anchored nodes on the same target fan out rather than stack", () =>
    {
        const doc = docOf([
            node("t", intent("main", "wide")),
            node("p1", intent("main", "compact"), false,
                { kind: "node", nodeId: "t" }),
            node("p2", intent("main", "compact"), false,
                { kind: "node", nodeId: "t" }),
        ]);

        const packed = packDocument(doc, { width: 1200 });

        expect(packed.get("p1")).not.toEqual(packed.get("p2"));
    });

    test("an anchor pointing at a missing node falls back to shelf packing", () =>
    {
        const doc = docOf([
            node("orphan", intent("main", "compact"), false,
                { kind: "node", nodeId: "gone" }),
        ]);

        // Must still be placed somewhere sane rather than dropped.
        expect(packDocument(doc, { width: 1200 }).get("orphan")).toBeDefined();
    });

    test("entity and canvas anchors are packed normally", () =>
    {
        const doc = docOf([
            node("e", intent("main", "compact"), false,
                { kind: "entity", entityId: "table:orders" }),
            node("c", intent("main", "compact")),
        ]);

        const packed = packDocument(doc, { width: 1200 });

        expect(overlaps(packed.get("e")!, packed.get("c")!)).toBe(false);
    });
});
