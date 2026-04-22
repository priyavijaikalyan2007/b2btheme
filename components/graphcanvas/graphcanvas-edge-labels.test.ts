/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 *
 * ⚓ TESTS: GraphCanvas — edge label density & collision avoidance
 * Covers: edgeLabelDensity = 'all' | 'hub-compact' | 'none',
 *         hubDegreeThreshold, short-label derivation, hover channel intact,
 *         backward compat with showEdgeLabels: false.
 * See: specs/2026-04-21-graphcanvas-edge-label-stacking-at-hubs.md
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createGraphCanvas } from "./graphcanvas";
import type
{
    GraphCanvasOptions,
    GraphNode,
    GraphEdge,
    GraphCanvas
} from "./graphcanvas";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

/** Hub: n0 at center, 6 neighbors n1..n6, each edge labeled. */
function hubNodes(): GraphNode[]
{
    return [
        { id: "n0", label: "Hub", type: "entity", x: 400, y: 300 },
        { id: "n1", label: "A", type: "entity", x: 200, y: 250 },
        { id: "n2", label: "B", type: "entity", x: 210, y: 280 },
        { id: "n3", label: "C", type: "entity", x: 220, y: 310 },
        { id: "n4", label: "D", type: "entity", x: 230, y: 340 },
        { id: "n5", label: "E", type: "entity", x: 240, y: 360 },
        { id: "n6", label: "F", type: "entity", x: 250, y: 380 }
    ];
}

function hubEdges(): GraphEdge[]
{
    return [
        { id: "e1", sourceId: "n0", targetId: "n1", type: "rel", label: "Mirrors" },
        { id: "e2", sourceId: "n0", targetId: "n2", type: "rel", label: "Is Part Of" },
        { id: "e3", sourceId: "n0", targetId: "n3", type: "rel", label: "Sourced From" },
        { id: "e4", sourceId: "n0", targetId: "n4", type: "rel", label: "Described By" },
        { id: "e5", sourceId: "n0", targetId: "n5", type: "rel", label: "References" },
        { id: "e6", sourceId: "n0", targetId: "n6", type: "rel", label: "Has Member" }
    ];
}

/** Sparse: 3 nodes, 2 edges (every endpoint is low-degree). */
function sparseNodes(): GraphNode[]
{
    return [
        { id: "s1", label: "S1", type: "e", x: 100, y: 100 },
        { id: "s2", label: "S2", type: "e", x: 300, y: 100 },
        { id: "s3", label: "S3", type: "e", x: 500, y: 100 }
    ];
}

function sparseEdges(): GraphEdge[]
{
    return [
        { id: "se1", sourceId: "s1", targetId: "s2", type: "rel", label: "Mirrors" },
        { id: "se2", sourceId: "s2", targetId: "s3", type: "rel", label: "Sourced From" }
    ];
}

function makeOptions(
    overrides: Partial<GraphCanvasOptions>
): GraphCanvasOptions
{
    return {
        container,
        layout: "force",
        ...overrides
    };
}

function labelsOf(canvas: GraphCanvas): string[]
{
    void canvas;
    const texts = container.querySelectorAll<SVGTextElement>("g.gc-edge text.gc-edge-label");
    return Array.from(texts).map(t => t.textContent ?? "");
}

beforeEach(() =>
{
    container = document.createElement("div");
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// edgeLabelDensity = 'none'
// ============================================================================

describe("GraphCanvas edge labels — density 'none'", () =>
{
    test("EdgeLabelDensityNone_HidesAllLabels", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: hubNodes(),
            edges: hubEdges(),
            edgeLabelDensity: "none"
        }));
        expect(labelsOf(canvas).length).toBe(0);
        canvas.destroy();
    });

    test("ShowEdgeLabelsFalse_StillForcesNone_BackwardCompat", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: hubNodes(),
            edges: hubEdges(),
            showEdgeLabels: false,
            edgeLabelDensity: "all"
        }));
        expect(labelsOf(canvas).length).toBe(0);
        canvas.destroy();
    });
});

// ============================================================================
// edgeLabelDensity = 'all'
// ============================================================================

describe("GraphCanvas edge labels — density 'all'", () =>
{
    test("EdgeLabelDensityAll_RendersFullLabelsForEveryEdge", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: sparseNodes(),
            edges: sparseEdges(),
            edgeLabelDensity: "all"
        }));
        const labels = labelsOf(canvas);
        expect(labels.sort()).toEqual(["Mirrors", "Sourced From"]);
        canvas.destroy();
    });

    test("EdgeLabelDensityAll_OnHub_StillRendersFullText", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: hubNodes(),
            edges: hubEdges(),
            edgeLabelDensity: "all"
        }));
        const labels = labelsOf(canvas);
        expect(labels).toContain("Mirrors");
        expect(labels).toContain("Sourced From");
        expect(labels.length).toBe(6);
        canvas.destroy();
    });
});

// ============================================================================
// edgeLabelDensity = 'hub-compact' (default)
// ============================================================================

describe("GraphCanvas edge labels — density 'hub-compact'", () =>
{
    test("HubCompactDefault_WhenNoDensityOptionProvided", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: hubNodes(),
            edges: hubEdges()
        }));
        const labels = labelsOf(canvas);
        expect(labels).not.toContain("Sourced From");
        expect(labels).toContain("SF");
        canvas.destroy();
    });

    test("HubCompact_MultiWordLabel_UsesWordInitials", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: hubNodes(),
            edges: hubEdges(),
            edgeLabelDensity: "hub-compact"
        }));
        const labels = labelsOf(canvas);
        expect(labels).toContain("SF");
        expect(labels).toContain("IPO");
        expect(labels).toContain("DB");
        expect(labels).toContain("HM");
        canvas.destroy();
    });

    test("HubCompact_SingleWordLabel_UsesFirstTwoChars", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: hubNodes(),
            edges: hubEdges(),
            edgeLabelDensity: "hub-compact"
        }));
        const labels = labelsOf(canvas);
        expect(labels).toContain("MI");
        expect(labels).toContain("RE");
        canvas.destroy();
    });

    test("HubCompact_SparseGraph_KeepsFullLabels", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: sparseNodes(),
            edges: sparseEdges(),
            edgeLabelDensity: "hub-compact"
        }));
        const labels = labelsOf(canvas);
        expect(labels.sort()).toEqual(["Mirrors", "Sourced From"]);
        canvas.destroy();
    });

    test("HubCompact_ThresholdOption_RaisedAboveDegree_KeepsFullLabels", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: hubNodes(),
            edges: hubEdges(),
            edgeLabelDensity: "hub-compact",
            hubDegreeThreshold: 10
        }));
        const labels = labelsOf(canvas);
        expect(labels).toContain("Mirrors");
        expect(labels).toContain("Sourced From");
        canvas.destroy();
    });

    test("HubCompact_ShortLabelHasCompactClass", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: hubNodes(),
            edges: hubEdges(),
            edgeLabelDensity: "hub-compact"
        }));
        const shortTexts = container.querySelectorAll<SVGTextElement>(
            "g.gc-edge text.gc-edge-label.gc-edge-label-compact"
        );
        expect(shortTexts.length).toBe(6);
        canvas.destroy();
    });
});

// ============================================================================
// Hover channel intact
// ============================================================================

describe("GraphCanvas edge labels — hover channel", () =>
{
    test("HubCompact_MouseEnter_FiresOnEdgeHoverWithFullEdge", () =>
    {
        let hoveredId: string | null | undefined;
        const canvas = createGraphCanvas(makeOptions({
            nodes: hubNodes(),
            edges: hubEdges(),
            edgeLabelDensity: "hub-compact",
            onEdgeHover: (edge) => { hoveredId = edge?.id; }
        }));
        const group = container.querySelector<SVGGElement>(
            'g.gc-edge[data-edge-id="e3"]'
        );
        expect(group).not.toBeNull();
        group!.dispatchEvent(new MouseEvent("mouseenter"));
        expect(hoveredId).toBe("e3");
        canvas.destroy();
    });
});

// ============================================================================
// Collision avoidance (density 'all')
// ============================================================================

describe("GraphCanvas edge labels — collision avoidance", () =>
{
    test("DensityAll_HubGraph_LabelsAtDistinctXYPairs", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: hubNodes(),
            edges: hubEdges(),
            edgeLabelDensity: "all"
        }));
        const texts = container.querySelectorAll<SVGTextElement>(
            "g.gc-edge text.gc-edge-label"
        );
        const positions = new Set<string>();
        for (const t of Array.from(texts))
        {
            const key = `${t.getAttribute("x")}|${t.getAttribute("y")}`;
            positions.add(key);
        }
        // Every label should land at a different (x, y) after stepping.
        expect(positions.size).toBe(texts.length);
        canvas.destroy();
    });
});
