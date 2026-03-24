/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: GraphMinimap
 * Spec-based tests for the GraphMinimap overview widget.
 * Tests cover: creation, refresh rendering, viewport rectangle,
 * click-to-pan, drag-to-pan, show/hide, collapse/expand, destroy,
 * edge threshold, and error handling.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    createGraphMinimap,
    GraphCanvasHandle,
    GraphMinimapOptions,
    GraphMinimap,
} from "./graphminimap";

// ============================================================================
// MOCK GRAPH CANVAS
// ============================================================================

/** Creates a mock GraphCanvasHandle with controllable data. */
function createMockCanvas(overrides?: Partial<GraphCanvasHandle>): GraphCanvasHandle
{
    const listeners: Record<string, Function[]> = {};

    return {
        getNodes: () => [
            { id: "n1", x: 100, y: 100, color: "#ff0000" },
            { id: "n2", x: 200, y: 200 },
            { id: "n3", x: 300, y: 100 },
        ],
        getEdges: () => [
            { source: "n1", target: "n2" },
            { source: "n2", target: "n3" },
        ],
        getViewport: () => ({
            x: 50, y: 50, zoom: 1, width: 400, height: 300,
        }),
        panTo: vi.fn(),
        on: (event: string, callback: Function) =>
        {
            if (!listeners[event])
            {
                listeners[event] = [];
            }
            listeners[event].push(callback);
        },
        off: (event: string, callback: Function) =>
        {
            if (listeners[event])
            {
                listeners[event] = listeners[event].filter(cb => cb !== callback);
            }
        },
        ...overrides,
    };
}

/** Creates default options with a fresh container and mock canvas. */
function createTestOptions(overrides?: Partial<GraphMinimapOptions>): GraphMinimapOptions
{
    const container = document.createElement("div");

    container.id = "minimap-host";
    document.body.appendChild(container);

    return {
        container,
        graphCanvas: createMockCanvas(),
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

let minimap: GraphMinimap | null = null;

afterEach(() =>
{
    if (minimap)
    {
        minimap.destroy();
        minimap = null;
    }

    // Clean up any leftover containers
    const host = document.getElementById("minimap-host");
    if (host)
    {
        host.remove();
    }

    document.body.innerHTML = "";
});

// ============================================================================
// CREATION
// ============================================================================

describe("createGraphMinimap", () =>
{
    test("withValidOptions_CreatesWrapperInContainer", () =>
    {
        // Arrange
        const opts = createTestOptions();

        // Act
        minimap = createGraphMinimap(opts);

        // Assert
        const wrapper = opts.container.querySelector(".graphminimap");
        expect(wrapper).not.toBeNull();
    });

    test("withValidOptions_RendersSvgElement", () =>
    {
        // Arrange
        const opts = createTestOptions();

        // Act
        minimap = createGraphMinimap(opts);

        // Assert
        const svg = opts.container.querySelector("svg");
        expect(svg).not.toBeNull();
        expect(svg?.getAttribute("class")).toContain("graphminimap-svg");
    });

    test("withValidOptions_RendersToggleButton", () =>
    {
        // Arrange
        const opts = createTestOptions();

        // Act
        minimap = createGraphMinimap(opts);

        // Assert
        const toggle = opts.container.querySelector(".graphminimap-toggle");
        expect(toggle).not.toBeNull();
        expect(toggle?.getAttribute("aria-label")).toBe("Toggle minimap");
    });

    test("withValidOptions_SetsAriaRoleOnWrapper", () =>
    {
        // Arrange
        const opts = createTestOptions();

        // Act
        minimap = createGraphMinimap(opts);

        // Assert
        const wrapper = opts.container.querySelector(".graphminimap");
        expect(wrapper?.getAttribute("role")).toBe("img");
        expect(wrapper?.getAttribute("aria-label")).toContain("Graph minimap");
    });

    test("withCustomDimensions_SetsSvgWidthAndHeight", () =>
    {
        // Arrange
        const opts = createTestOptions({ width: 300, height: 200 });

        // Act
        minimap = createGraphMinimap(opts);

        // Assert
        const svg = opts.container.querySelector("svg");
        expect(svg?.getAttribute("width")).toBe("300");
        expect(svg?.getAttribute("height")).toBe("200");
    });

    test("withNoContainer_ThrowsError", () =>
    {
        // Arrange & Act & Assert
        expect(() =>
        {
            createGraphMinimap({
                container: null as unknown as HTMLElement,
                graphCanvas: createMockCanvas(),
            });
        }).toThrow("GraphMinimap requires a container element");
    });

    test("withNoGraphCanvas_ThrowsError", () =>
    {
        // Arrange
        const container = document.createElement("div");

        // Act & Assert
        expect(() =>
        {
            createGraphMinimap({
                container,
                graphCanvas: null as unknown as GraphCanvasHandle,
            });
        }).toThrow("GraphMinimap requires a graphCanvas handle");
    });
});

// ============================================================================
// REFRESH RENDERING
// ============================================================================

describe("refresh", () =>
{
    test("refresh_RendersNodeCirclesForEachNode", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act
        minimap.refresh();

        // Assert — 3 nodes in mock data
        const circles = opts.container.querySelectorAll("circle");
        expect(circles.length).toBe(3);
    });

    test("refresh_RendersEdgeLinesForEachEdge", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act
        minimap.refresh();

        // Assert — 2 edges in mock data
        const lines = opts.container.querySelectorAll("line");
        expect(lines.length).toBe(2);
    });

    test("refresh_UsesNodeColorIfProvided", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act
        minimap.refresh();

        // Assert — first node has explicit color "#ff0000"
        const firstCircle = opts.container.querySelector("circle");
        expect(firstCircle?.getAttribute("fill")).toBe("#ff0000");
    });

    test("refresh_UsesDefaultNodeColorWhenNoColorProvided", () =>
    {
        // Arrange
        const opts = createTestOptions({ nodeColor: "#aabbcc" });
        minimap = createGraphMinimap(opts);

        // Act
        minimap.refresh();

        // Assert — second node has no explicit color, falls back to nodeColor
        const circles = opts.container.querySelectorAll("circle");
        expect(circles[1]?.getAttribute("fill")).toBe("#aabbcc");
    });

    test("refresh_ClearsPreviousRendering", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act — refresh twice
        minimap.refresh();
        minimap.refresh();

        // Assert — should not double the nodes
        const circles = opts.container.querySelectorAll("circle");
        expect(circles.length).toBe(3);
    });

    test("refresh_WithNoNodes_SetsDefaultViewBox", () =>
    {
        // Arrange
        const emptyCanvas = createMockCanvas({
            getNodes: () => [],
            getEdges: () => [],
        });
        const opts = createTestOptions({ graphCanvas: emptyCanvas });
        minimap = createGraphMinimap(opts);

        // Act
        minimap.refresh();

        // Assert
        const svg = opts.container.querySelector("svg");
        const viewBox = svg?.getAttribute("viewBox");
        expect(viewBox).toBeDefined();
    });

    test("refresh_SetsViewBoxBasedOnNodeBounds", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act
        minimap.refresh();

        // Assert — viewBox should contain the node bounds
        const svg = opts.container.querySelector("svg");
        const viewBox = svg?.getAttribute("viewBox") ?? "";
        const parts = viewBox.split(" ").map(Number);
        // minX=100-20=80, minY=100-20=80, width=220+40=260, height=100+40=140
        expect(parts[0]).toBe(80);
        expect(parts[1]).toBe(80);
    });
});

// ============================================================================
// VIEWPORT RECTANGLE
// ============================================================================

describe("viewport rectangle", () =>
{
    test("refresh_RendersViewportRectangle", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act
        minimap.refresh();

        // Assert
        const rect = opts.container.querySelector(".graphminimap-viewport");
        expect(rect).not.toBeNull();
        expect(rect?.getAttribute("x")).toBe("50");
        expect(rect?.getAttribute("y")).toBe("50");
    });

    test("refresh_ViewportRectHasSemiTransparentFill", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act
        minimap.refresh();

        // Assert
        const rect = opts.container.querySelector(".graphminimap-viewport");
        expect(rect?.getAttribute("fill")).toContain("rgba");
    });

    test("refresh_ViewportRectHasSolidBorder", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act
        minimap.refresh();

        // Assert
        const rect = opts.container.querySelector(".graphminimap-viewport");
        expect(rect?.getAttribute("stroke")).toBe("#3b82f6");
        expect(rect?.getAttribute("stroke-width")).toBe("2");
    });

    test("withCustomViewportColors_UsesProvidedColors", () =>
    {
        // Arrange
        const opts = createTestOptions({
            viewportColor: "rgba(255, 0, 0, 0.2)",
            viewportBorderColor: "#ff0000",
        });

        // Act
        minimap = createGraphMinimap(opts);

        // Assert
        const rect = opts.container.querySelector(".graphminimap-viewport");
        expect(rect?.getAttribute("fill")).toBe("rgba(255, 0, 0, 0.2)");
        expect(rect?.getAttribute("stroke")).toBe("#ff0000");
    });
});

// ============================================================================
// CLICK TO PAN
// ============================================================================

describe("click to pan", () =>
{
    test("mousedownOnSvg_CallsPanToOnGraphCanvas", () =>
    {
        // Arrange
        const mockCanvas = createMockCanvas();
        const opts = createTestOptions({ graphCanvas: mockCanvas });
        minimap = createGraphMinimap(opts);

        const svg = opts.container.querySelector("svg") as SVGSVGElement;

        // Mock getBoundingClientRect for consistent coordinates
        vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
            left: 0, top: 0, width: 200, height: 150,
            right: 200, bottom: 150, x: 0, y: 0, toJSON: () => {},
        });

        // Act — click at centre of SVG
        const event = new MouseEvent("mousedown", {
            clientX: 100, clientY: 75, bubbles: true,
        });
        svg.dispatchEvent(event);

        // Assert
        expect(mockCanvas.panTo).toHaveBeenCalled();
    });
});

// ============================================================================
// SHOW / HIDE
// ============================================================================

describe("show and hide", () =>
{
    test("hide_SetsDisplayNone", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act
        minimap.hide();

        // Assert
        const wrapper = opts.container.querySelector(".graphminimap") as HTMLElement;
        expect(wrapper.style.display).toBe("none");
    });

    test("show_ResetsDisplay", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);
        minimap.hide();

        // Act
        minimap.show();

        // Assert
        const wrapper = opts.container.querySelector(".graphminimap") as HTMLElement;
        expect(wrapper.style.display).toBe("");
    });

    test("toggle_SwitchesBetweenVisibleAndHidden", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act & Assert — initially visible
        expect(minimap.isVisible()).toBe(true);

        minimap.toggle();
        expect(minimap.isVisible()).toBe(false);

        minimap.toggle();
        expect(minimap.isVisible()).toBe(true);
    });

    test("isVisible_ReturnsTrueByDefault", () =>
    {
        // Arrange
        const opts = createTestOptions();

        // Act
        minimap = createGraphMinimap(opts);

        // Assert
        expect(minimap.isVisible()).toBe(true);
    });
});

// ============================================================================
// COLLAPSE / EXPAND
// ============================================================================

describe("collapse and expand", () =>
{
    test("withCollapsedTrue_SvgIsHiddenOnCreation", () =>
    {
        // Arrange & Act
        const opts = createTestOptions({ collapsed: true });
        minimap = createGraphMinimap(opts);

        // Assert
        const svg = opts.container.querySelector("svg") as SVGSVGElement;
        expect(svg.style.display).toBe("none");
    });

    test("clickToggle_CollapsesExpandedMinimap", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);
        const toggleBtn = opts.container.querySelector(".graphminimap-toggle") as HTMLElement;

        // Act
        toggleBtn.click();

        // Assert
        const svg = opts.container.querySelector("svg") as SVGSVGElement;
        expect(svg.style.display).toBe("none");
    });

    test("clickToggleTwice_ReExpandsMinimap", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);
        const toggleBtn = opts.container.querySelector(".graphminimap-toggle") as HTMLElement;

        // Act
        toggleBtn.click();
        toggleBtn.click();

        // Assert
        const svg = opts.container.querySelector("svg") as SVGSVGElement;
        expect(svg.style.display).toBe("");
    });

    test("toggleButton_SetsAriaExpandedAttribute", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);
        const toggleBtn = opts.container.querySelector(".graphminimap-toggle") as HTMLElement;

        // Assert — initially expanded
        expect(toggleBtn.getAttribute("aria-expanded")).toBe("true");

        // Act
        toggleBtn.click();

        // Assert — now collapsed
        expect(toggleBtn.getAttribute("aria-expanded")).toBe("false");
    });
});

// ============================================================================
// EDGE THRESHOLD
// ============================================================================

describe("edge threshold", () =>
{
    test("withOver500Nodes_SkipsEdgeRendering", () =>
    {
        // Arrange — generate 501 nodes
        const manyNodes = Array.from({ length: 501 }, (_, i) => ({
            id: `n${i}`, x: i * 10, y: i * 5,
        }));
        const mockCanvas = createMockCanvas({
            getNodes: () => manyNodes,
            getEdges: () => [{ source: "n0", target: "n1" }],
        });
        const opts = createTestOptions({ graphCanvas: mockCanvas });

        // Act
        minimap = createGraphMinimap(opts);
        minimap.refresh();

        // Assert — edges should be skipped
        const lines = opts.container.querySelectorAll("line");
        expect(lines.length).toBe(0);
    });

    test("withShowEdgesFalse_SkipsEdgeRendering", () =>
    {
        // Arrange
        const opts = createTestOptions({ showEdges: false });

        // Act
        minimap = createGraphMinimap(opts);
        minimap.refresh();

        // Assert
        const lines = opts.container.querySelectorAll("line");
        expect(lines.length).toBe(0);
    });

    test("withUnder500Nodes_RendersEdges", () =>
    {
        // Arrange — default mock has 3 nodes
        const opts = createTestOptions();

        // Act
        minimap = createGraphMinimap(opts);
        minimap.refresh();

        // Assert
        const lines = opts.container.querySelectorAll("line");
        expect(lines.length).toBe(2);
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesWrapperFromDom", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act
        minimap.destroy();

        // Assert
        const wrapper = opts.container.querySelector(".graphminimap");
        expect(wrapper).toBeNull();
        minimap = null;
    });

    test("destroy_UnsubscribesFromGraphCanvasEvents", () =>
    {
        // Arrange
        const mockCanvas = createMockCanvas();
        const offSpy = vi.spyOn(mockCanvas, "off");
        const opts = createTestOptions({ graphCanvas: mockCanvas });
        minimap = createGraphMinimap(opts);

        // Act
        minimap.destroy();

        // Assert
        expect(offSpy).toHaveBeenCalledWith("layoutComplete", expect.any(Function));
        minimap = null;
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act & Assert — double destroy should be safe
        minimap.destroy();
        expect(() => minimap!.destroy()).not.toThrow();
        minimap = null;
    });

    test("refresh_AfterDestroy_DoesNotThrow", () =>
    {
        // Arrange
        const opts = createTestOptions();
        minimap = createGraphMinimap(opts);

        // Act
        minimap.destroy();

        // Assert — refresh after destroy should be a no-op
        expect(() => minimap!.refresh()).not.toThrow();
        minimap = null;
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("withEdgeReferencingNonexistentNode_SkipsEdge", () =>
    {
        // Arrange — edge references a node that does not exist
        const mockCanvas = createMockCanvas({
            getEdges: () => [{ source: "n1", target: "missing" }],
        });
        const opts = createTestOptions({ graphCanvas: mockCanvas });

        // Act
        minimap = createGraphMinimap(opts);
        minimap.refresh();

        // Assert — the edge with the missing node should be skipped
        const lines = opts.container.querySelectorAll("line");
        expect(lines.length).toBe(0);
    });

    test("withCustomBackgroundColor_AppliesOnSvg", () =>
    {
        // Arrange
        const opts = createTestOptions({ backgroundColor: "#112233" });

        // Act
        minimap = createGraphMinimap(opts);

        // Assert
        const svg = opts.container.querySelector("svg") as SVGSVGElement;
        expect(svg.style.backgroundColor).toBe("rgb(17, 34, 51)");
    });
});
