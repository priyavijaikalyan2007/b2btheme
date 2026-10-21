/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a
 *
 * ⚓ TESTS: GraphCanvas
 * Vitest unit tests for the GraphCanvas component.
 * Covers: factory, node/edge management, selection, zoom, layout,
 * export, mode, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import { createGraphCanvas } from "./graphcanvas";
import type
{
    GraphCanvasOptions,
    GraphNode,
    GraphEdge,
    GraphCanvas,
} from "./graphcanvas";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeNodes(): GraphNode[]
{
    return [
        { id: "n1", label: "Node A", type: "entity" },
        { id: "n2", label: "Node B", type: "entity" },
        { id: "n3", label: "Node C", type: "relationship" },
    ];
}

function makeEdges(): GraphEdge[]
{
    return [
        { id: "e1", sourceId: "n1", targetId: "n2", type: "has", label: "has" },
        { id: "e2", sourceId: "n2", targetId: "n3", type: "related", label: "related" },
    ];
}

function makeOptions(
    overrides?: Partial<GraphCanvasOptions>
): GraphCanvasOptions
{
    return {
        container,
        nodes: makeNodes(),
        edges: makeEdges(),
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "graph-test-container";
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("GraphCanvas factory", () =>
{
    test("createGraphCanvas_ValidOptions_ReturnsHandle", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        expect(canvas).toBeDefined();
        expect(typeof canvas.destroy).toBe("function");
        canvas.destroy();
    });

    test("createGraphCanvas_EmptyGraph_Works", () =>
    {
        const canvas = createGraphCanvas(makeOptions({
            nodes: [],
            edges: [],
        }));
        expect(canvas.getNodes().length).toBe(0);
        expect(canvas.getEdges().length).toBe(0);
        canvas.destroy();
    });
});

// ============================================================================
// NODE MANAGEMENT
// ============================================================================

describe("GraphCanvas nodes", () =>
{
    test("GetNodes_ReturnsAllNodes", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        expect(canvas.getNodes().length).toBe(3);
        canvas.destroy();
    });

    test("AddNode_IncreasesCount", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        canvas.addNode({ id: "n4", label: "Node D", type: "entity" });
        expect(canvas.getNodes().length).toBe(4);
        canvas.destroy();
    });

    test("RemoveNode_DecreasesCount", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        canvas.removeNode("n3");
        expect(canvas.getNodes().length).toBe(2);
        canvas.destroy();
    });

    test("UpdateNode_ChangesLabel", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        canvas.updateNode("n1", { label: "Updated A" });
        const node = canvas.getNodes().find(n => n.id === "n1");
        expect(node?.label).toBe("Updated A");
        canvas.destroy();
    });
});

// ============================================================================
// EDGE MANAGEMENT
// ============================================================================

describe("GraphCanvas edges", () =>
{
    test("GetEdges_ReturnsAllEdges", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        expect(canvas.getEdges().length).toBe(2);
        canvas.destroy();
    });

    test("AddEdge_IncreasesCount", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        canvas.addEdge({
            id: "e3",
            sourceId: "n1",
            targetId: "n3",
            type: "links",
        });
        expect(canvas.getEdges().length).toBe(3);
        canvas.destroy();
    });

    test("RemoveEdge_DecreasesCount", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        canvas.removeEdge("e2");
        expect(canvas.getEdges().length).toBe(1);
        canvas.destroy();
    });
});

// ============================================================================
// SELECTION
// ============================================================================

describe("GraphCanvas selection", () =>
{
    test("GetSelectedNodes_InitiallyEmpty", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        expect(canvas.getSelectedNodes().length).toBe(0);
        canvas.destroy();
    });

    test("SelectNode_AddsToSelection", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        canvas.selectNode("n1");
        expect(canvas.getSelectedNodes().length).toBe(1);
        canvas.destroy();
    });

    test("ClearSelection_EmptiesSelection", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        canvas.selectNode("n1");
        canvas.clearSelection();
        expect(canvas.getSelectedNodes().length).toBe(0);
        canvas.destroy();
    });
});

// ============================================================================
// ZOOM
// ============================================================================

describe("GraphCanvas zoom", () =>
{
    test("GetZoomLevel_ReturnsNumber", () =>
    {
        const canvas = createGraphCanvas(makeOptions());

        // NaN is a number. A fresh canvas is at 1:1, and the sibling
        // case below moves it, so this pins the starting point.
        expect(canvas.getZoomLevel()).toBe(1);

        canvas.destroy();
    });

    test("SetZoomLevel_ChangesZoom", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        canvas.setZoomLevel(2.0);
        expect(canvas.getZoomLevel()).toBeCloseTo(2.0, 1);
        canvas.destroy();
    });
});

// ============================================================================
// DATA
// ============================================================================

describe("GraphCanvas setData", () =>
{
    test("SetData_ReplacesAllNodesAndEdges", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        canvas.setData(
            [{ id: "x1", label: "X", type: "t" }],
            []
        );
        expect(canvas.getNodes().length).toBe(1);
        expect(canvas.getEdges().length).toBe(0);
        canvas.destroy();
    });
});

// ============================================================================
// MODE
// ============================================================================

describe("GraphCanvas mode", () =>
{
    // The DEFAULT mode is the fact in the title, and "truthy" was
    // true of every mode this component has.
    test("GetMode_ReturnsDefaultMode", () =>
    {
        const canvas = createGraphCanvas(makeOptions());

        expect(canvas.getMode()).toBe("schema");
        canvas.destroy();
    });
});

// ============================================================================
// EXPORT
// ============================================================================

describe("GraphCanvas export", () =>
{
    test("ExportJSON_ReturnsNodesAndEdges", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        const data = canvas.exportJSON();
        expect(data.nodes.length).toBe(3);
        expect(data.edges.length).toBe(2);
        canvas.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("GraphCanvas destroy", () =>
{
    test("Destroy_DoesNotThrow", () =>
    {
        // DEBT-TEST-1b. The sibling below covers idempotency; what
        // this one owes is that destroy REMOVED something. A canvas
        // that returned without touching the DOM would also not
        // throw (ADR-215).
        // There is no getElement() on this handle, so the host
        // container is the subject: mounting fills it and destroy has
        // to empty it.
        const canvas = createGraphCanvas(makeOptions());

        expect(container.children.length).toBeGreaterThan(0);

        canvas.destroy();

        expect(container.children.length).toBe(0);
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const canvas = createGraphCanvas(makeOptions());
        const probe = destroyProbe();

        canvas.destroy();
        const first = probe.total();
        canvas.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });
});
