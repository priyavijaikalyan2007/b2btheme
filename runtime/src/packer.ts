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

/** Tuning for one packing pass. */
export interface PackOptions
{
    /**
     * Visible canvas width in canvas pixels. Region geometry follows it, so a
     * narrow canvas never strands a node in an off-screen region.
     */
    readonly width?: number;

    /**
     * Reports whether a component presents as an overlay.
     *
     * Supplied by the host because the packer holds no registry. An overlay is
     * never an obstacle and never displaces anything, regardless of what it is
     * anchored to.
     */
    readonly isOverlay?: (component: string) => boolean;
}

/** A resolved rectangle in canvas coordinates. */
export interface PackedRect
{
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    readonly z: number;
}

/** Canvas width assumed when the caller does not supply one. */
const DEFAULT_CANVAS_WIDTH = 1600;

/** Edge length of an anchored overlay marker, in canvas pixels. */
const MARKER_SIZE = 30;

/** Stacking offset that lifts an overlay above whatever it annotates. */
const OVERLAY_Z_LIFT = 10;

/** Narrowest canvas at which a side region is still worth reserving. */
const SIDE_REGION_MIN_CANVAS = 900;

/** Fraction of the canvas the main region takes when a side region exists. */
const MAIN_FRACTION = 0.68;

/** Geometry of every region for one canvas width. */
interface RegionGeometry
{
    readonly width: Readonly<Record<Region, number>>;
    readonly originX: Readonly<Record<Region, number>>;
}

/**
 * Computes region geometry for the available canvas width.
 *
 * Region origins used to be fixed constants, which put the side region at
 * x=1160 regardless of how wide the canvas actually was. On a narrower canvas
 * anything placed there mounted correctly and rendered off-screen — no error,
 * nothing visible, which is the worst kind of failure. Geometry now follows
 * the canvas, and below SIDE_REGION_MIN_CANVAS the side region collapses onto
 * main so nothing can be stranded.
 *
 * @param canvasWidth - Visible canvas width in canvas pixels.
 * @returns Width and origin for every region.
 */
function geometryFor(canvasWidth: number): RegionGeometry
{
    const usable = Math.max(320, canvasWidth - PACK_GUTTER * 2);
    const hasSide = usable >= SIDE_REGION_MIN_CANVAS;

    const mainWidth = hasSide
        ? Math.floor(usable * MAIN_FRACTION)
        : usable;
    const sideWidth = hasSide
        ? usable - mainWidth - PACK_GUTTER
        : usable;
    const sideOrigin = hasSide ? mainWidth + PACK_GUTTER : 0;

    return {
        width: {
            main: mainWidth,
            side: sideWidth,
            detail: mainWidth,
            strip: usable,
            overlay: usable,
        },
        originX: {
            main: 0,
            side: sideOrigin,
            detail: 0,
            strip: 0,
            overlay: 0,
        },
    };
}

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
    doc: CanvasDocument,
    options: PackOptions = {}): Map<string, PackedRect>
{
    const isOverlayComponent = options.isOverlay ?? (() => false);

    const geometry = geometryFor(options.width ?? DEFAULT_CANVAS_WIDTH);

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

        if (isAnchoredOverlay(node, doc) || isOverlayComponent(node.component))
        {
            continue;
        }

        const rect = placeIntent(node, shelves, obstacles, geometry);
        out.set(node.id, rect);
        obstacles.push(rect);
    }

    placeOverlays(doc, out, geometry, isOverlayComponent);

    return out;
}

/**
 * True when a node is an overlay bound to another node.
 *
 * An overlay ANNOTATES its target: it sits on top of it, and it must not
 * displace anything. A sticky note is unbound and behaves like any other
 * widget; an annotation attached to a grid is not a widget at all, it is a
 * mark on that grid. Treating the two the same made twenty annotations
 * rearrange the whole canvas.
 *
 * @param node - The node to classify.
 * @param doc  - The document, used to confirm the target exists.
 * @returns Whether the node is an anchored overlay.
 */
function isAnchoredOverlay(node: CanvasNode, doc: CanvasDocument): boolean
{
    return node.anchor.kind === "node"
        && Boolean(doc.nodes[node.anchor.nodeId]);
}

/**
 * Positions every anchored overlay against its target.
 *
 * Runs last, reads the already-packed rectangles, and adds NOTHING to the
 * obstacle list — which is what guarantees an annotation never moves the thing
 * it annotates, or anything near it.
 *
 * Several overlays on one target fan along its top edge rather than stacking
 * on top of each other.
 *
 * @param doc - The document being laid out.
 * @param out - Packed rectangles, mutated in place.
 */
function placeOverlays(
    doc: CanvasDocument,
    out: Map<string, PackedRect>,
    geometry: RegionGeometry,
    isOverlayComponent: (component: string) => boolean): void
{
    const perTarget = new Map<string, number>();
    let free = 0;

    for (const node of Object.values(doc.nodes).slice()
        .sort((a, b) => a.id.localeCompare(b.id)))
    {
        const anchored = isAnchoredOverlay(node, doc);

        if (!anchored && !isOverlayComponent(node.component))
        {
            continue;
        }

        if (anchored)
        {
            const targetId = (node.anchor as { nodeId: string }).nodeId;
            const target = out.get(targetId);

            if (target)
            {
                const index = perTarget.get(targetId) ?? 0;
                perTarget.set(targetId, index + 1);
                out.set(node.id, overlayRect(target, index));
                continue;
            }
        }

        // An unanchored overlay still floats rather than being packed: it
        // marches along the top of the main region without pushing anything.
        out.set(node.id, freeOverlayRect(geometry, free));
        free += 1;
    }
}

/**
 * Places an overlay that is not bound to any node.
 *
 * @param geometry - Region geometry for the current canvas width.
 * @param index    - Position among unanchored overlays.
 * @returns The overlay's rectangle.
 */
function freeOverlayRect(
    geometry: RegionGeometry,
    index: number): PackedRect
{
    const step = MARKER_SIZE + 8;
    const perRow = Math.max(1, Math.floor(geometry.width.main / step));

    return {
        x: geometry.originX.main + (index % perRow) * step,
        y: Math.floor(index / perRow) * step,
        w: MARKER_SIZE,
        h: MARKER_SIZE,
        z: 50,
    };
}

/**
 * Computes an overlay's rectangle from its target's.
 *
 * Markers sit inside the target's top-right corner and march leftwards, so
 * they read as belonging to it without covering its content.
 *
 * @param target - The target's packed rectangle.
 * @param index  - Position among overlays sharing this target.
 * @returns The overlay's rectangle.
 */
function overlayRect(target: PackedRect, index: number): PackedRect
{
    const step = MARKER_SIZE + 4;
    const perRow = Math.max(1, Math.floor(target.w / step));
    const column = index % perRow;
    const row = Math.floor(index / perRow);

    return {
        x: target.x + target.w - step * (column + 1),
        y: target.y + row * step,
        w: MARKER_SIZE,
        h: MARKER_SIZE,
        z: target.z + OVERLAY_Z_LIFT,
    };
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
    obstacles: readonly PackedRect[],
    geometry: RegionGeometry): PackedRect
{
    const p = node.placement as Extract<CanvasNode["placement"], { kind: "intent" }>;
    const shelf = shelfFor(p.region, shelves, geometry);
    const size = sizeOf(p.region, p.size, geometry);

    if (shelf.x + size.w
        > geometry.originX[p.region] + geometry.width[p.region])
    {
        wrap(shelf, p.region, geometry);
    }

    let rect: PackedRect = {
        x: shelf.x, y: shelf.y, w: size.w, h: size.h, z: REGION_Z[p.region],
    };

    rect = avoid(rect, obstacles, p.region, geometry);

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
    shelves: Map<Region, Shelf>,
    geometry: RegionGeometry): Shelf
{
    let shelf = shelves.get(region);

    if (!shelf)
    {
        shelf = {
            x: geometry.originX[region],
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
function wrap(shelf: Shelf, region: Region, geometry: RegionGeometry): void
{
    shelf.x = geometry.originX[region];
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
    region: Region,
    geometry: RegionGeometry): PackedRect
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
            x: geometry.originX[region],
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
    hint: SizeHint,
    geometry: RegionGeometry): { w: number; h: number }
{
    return {
        w: Math.min(SIZE_HINT_WIDTH[hint], geometry.width[region]),
        h: SIZE_HINT_HEIGHT[hint],
    };
}
