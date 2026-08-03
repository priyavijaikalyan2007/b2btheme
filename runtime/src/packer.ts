/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 3f1c8ad6-7b40-4c19-9a5e-2d6f0b83c714
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Packer
 * 📜 PURPOSE: Resolves layout INTENT into canvas coordinates. A model authors
 *    "main, wide" and never a pixel; the packer turns that into a rectangle,
 *    deterministically, flowing around anything the user has placed by hand.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[DynamicCanvas]], [[Document]]
 * ⚡ FLOW: [CanvasDocument] -> [packDocument()] -> [Map<nodeId, PackedRect>]
 * 🔒 SECURITY: Pure geometry over validated input; no DOM, no side effects.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-packer
// @entrypoint

import {
    PACK_GUTTER,
    REGION_ORIGIN_X,
    SIZE_HINT_HEIGHT,
    SIZE_HINT_WIDTH,
} from "./constants";

import type {
    CanvasDocument,
    CanvasNode,
    Region,
    SizeHint,
} from "./types";

// ============================================================================
// TYPES
// ============================================================================

/** A resolved rectangle in canvas coordinates. */
export interface PackedRect
{
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    readonly z: number;
}

/** Width available to a region's shelf before it wraps. */
const REGION_WIDTH: Readonly<Record<Region, number>> =
{
    main: 1120,
    side: 420,
    detail: 1120,
    strip: 1120,
    overlay: 1120,
};

/** Base stacking order per region. Overlay always wins. */
const REGION_Z: Readonly<Record<Region, number>> =
{
    main: 1,
    side: 1,
    detail: 1,
    strip: 2,
    overlay: 100,
};

/** Vertical origin per region, keeping regions clear of one another. */
const REGION_ORIGIN_Y: Readonly<Record<Region, number>> =
{
    main: 0,
    side: 0,
    detail: 0,
    strip: 0,
    overlay: 0,
};

// ============================================================================
// PUBLIC
// ============================================================================

/**
 * Resolves every node's placement into a rectangle.
 *
 * Nodes with `fixed` placement are honoured exactly and treated as obstacles;
 * nodes with `intent` placement are packed around them. Ordering is pinned
 * first, then by node id, so an identical document always yields an identical
 * layout — which is what makes placement testable.
 *
 * @param doc - The document to lay out.
 * @returns Rectangles keyed by node id.
 */
export function packDocument(
    doc: CanvasDocument): Map<string, PackedRect>
{
    const out = new Map<string, PackedRect>();
    const nodes = Object.values(doc.nodes);
    const obstacles: PackedRect[] = [];

    for (const node of nodes)
    {
        if (node.placement.kind === "fixed")
        {
            const rect = fixedRect(node);
            out.set(node.id, rect);
            obstacles.push(rect);
        }
    }

    const shelves = new Map<Region, Shelf>();

    for (const node of orderForPacking(nodes))
    {
        if (node.placement.kind !== "intent")
        {
            continue;
        }

        const rect = placeIntent(node, shelves, obstacles);
        out.set(node.id, rect);
        obstacles.push(rect);
    }

    return out;
}

// ============================================================================
// INTERNALS
// ============================================================================

/** Cursor tracking the current row within one region. */
interface Shelf
{
    x: number;
    y: number;
    rowHeight: number;
}

/**
 * Reads a fixed placement straight through.
 *
 * @param node - A node whose placement is fixed.
 * @returns Its rectangle.
 */
function fixedRect(node: CanvasNode): PackedRect
{
    const p = node.placement as Extract<CanvasNode["placement"], { kind: "fixed" }>;

    return { x: p.x, y: p.y, w: p.w, h: p.h, z: p.z };
}

/**
 * Orders nodes for packing: pinned first, then by id.
 *
 * The id tie-break is what makes the result independent of insertion order,
 * which in turn is what lets a test assert an exact layout.
 *
 * @param nodes - Every node in the document.
 * @returns Intent-placed nodes in deterministic order.
 */
function orderForPacking(nodes: readonly CanvasNode[]): CanvasNode[]
{
    return nodes
        .filter((n) => n.placement.kind === "intent")
        .slice()
        .sort((a, b) =>
        {
            if (a.pinned !== b.pinned)
            {
                return a.pinned ? -1 : 1;
            }

            return a.id.localeCompare(b.id);
        });
}

/**
 * Places one intent-placed node on its region's shelf, wrapping when the row
 * is full and stepping down past any obstacle it would collide with.
 *
 * @param node      - The node to place.
 * @param shelves   - Per-region cursors, mutated in place.
 * @param obstacles - Rectangles already occupied.
 * @returns The node's rectangle.
 */
function placeIntent(
    node: CanvasNode,
    shelves: Map<Region, Shelf>,
    obstacles: readonly PackedRect[]): PackedRect
{
    const p = node.placement as Extract<CanvasNode["placement"], { kind: "intent" }>;
    const shelf = shelfFor(p.region, shelves);
    const size = sizeOf(p.region, p.size);

    if (shelf.x + size.w > REGION_ORIGIN_X[p.region] + REGION_WIDTH[p.region])
    {
        wrap(shelf, p.region);
    }

    let rect: PackedRect = {
        x: shelf.x, y: shelf.y, w: size.w, h: size.h, z: REGION_Z[p.region],
    };

    rect = avoid(rect, obstacles, p.region);

    shelf.x = rect.x + rect.w + PACK_GUTTER;
    shelf.y = rect.y;
    shelf.rowHeight = Math.max(shelf.rowHeight, rect.h);

    return rect;
}

/**
 * Returns the cursor for a region, creating it at the region origin.
 *
 * @param region  - The region.
 * @param shelves - Cursor map, mutated in place.
 * @returns The cursor.
 */
function shelfFor(
    region: Region,
    shelves: Map<Region, Shelf>): Shelf
{
    let shelf = shelves.get(region);

    if (!shelf)
    {
        shelf = {
            x: REGION_ORIGIN_X[region],
            y: REGION_ORIGIN_Y[region],
            rowHeight: 0,
        };
        shelves.set(region, shelf);
    }

    return shelf;
}

/**
 * Moves a cursor to the start of the next row.
 *
 * @param shelf  - Cursor, mutated in place.
 * @param region - The region it belongs to.
 */
function wrap(shelf: Shelf, region: Region): void
{
    shelf.x = REGION_ORIGIN_X[region];
    shelf.y += shelf.rowHeight + PACK_GUTTER;
    shelf.rowHeight = 0;
}

/**
 * Steps a rectangle down past anything it collides with.
 *
 * A user who has dragged a node has expressed an intent the packer must never
 * override, so hand-placed nodes act as obstacles rather than being moved.
 *
 * @param rect      - Candidate rectangle.
 * @param obstacles - Rectangles already occupied.
 * @param region    - Region being packed, for the wrap origin.
 * @returns A rectangle clear of every obstacle.
 */
function avoid(
    rect: PackedRect,
    obstacles: readonly PackedRect[],
    region: Region): PackedRect
{
    let current = rect;
    let guard = 0;

    while (guard++ < 200)
    {
        const hit = obstacles.find((o) => intersects(current, o));

        if (!hit)
        {
            return current;
        }

        current = {
            ...current,
            x: REGION_ORIGIN_X[region],
            y: hit.y + hit.h + PACK_GUTTER,
        };
    }

    return current;
}

/**
 * Axis-aligned rectangle intersection.
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns True when they overlap.
 */
function intersects(a: PackedRect, b: PackedRect): boolean
{
    return a.x < b.x + b.w && b.x < a.x + a.w
        && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Resolves a size hint to pixels, clamped to the region width.
 *
 * @param region - Region being packed.
 * @param hint   - Declared size hint.
 * @returns Width and height in canvas pixels.
 */
function sizeOf(
    region: Region,
    hint: SizeHint): { w: number; h: number }
{
    return {
        w: Math.min(SIZE_HINT_WIDTH[hint], REGION_WIDTH[region]),
        h: SIZE_HINT_HEIGHT[hint],
    };
}
