/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: DiagramEngine — Per-Edge Stroke Rendering
 * Tests for the per-edge (per-side) border stroke feature.
 * Covers: renderPerEdgeStroke, per-edge integration in renderShapeContent,
 * gradient edge strokes, dash patterns, and visibility toggling.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createDiagramEngine } from "./diagramengine";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;
let engine: ReturnType<typeof createDiagramEngine>;

function setup(): void
{
    container = document.createElement("div");
    container.id = "test-de-" + Math.random().toString(36).substring(2, 8);
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
    engine = createDiagramEngine(container.id, {});
}

function teardown(): void
{
    container.remove();
}

function getObjectGroup(id: string): Element | null
{
    return container.querySelector(`[data-id="${id}"]`);
}

// ============================================================================
// PER-EDGE STROKE RENDERING
// ============================================================================

describe("DiagramEngine — Per-Edge Stroke", () =>
{
    beforeEach(() => { setup(); });
    afterEach(() => { teardown(); });

    test("rectangle without perEdgeStroke renders uniform stroke", () =>
    {
        engine.addObject({
            id: "rect-uniform",
            presentation: {
                shape: "rectangle",
                bounds: { x: 10, y: 10, width: 100, height: 60 },
                style: {
                    fill: { type: "solid", color: "#ffffff" },
                    stroke: { color: "#000000", width: 2 }
                },
                layer: "default"
            }
        });

        const g = getObjectGroup("rect-uniform");

        expect(g).not.toBeNull();

        const rect = g!.querySelector("rect");

        expect(rect).not.toBeNull();
        expect(rect!.getAttribute("stroke")).toBe("#000000");
        expect(rect!.getAttribute("stroke-width")).toBe("2");

        // No per-edge lines should be present
        const lines = g!.querySelectorAll("line");

        expect(lines.length).toBe(0);
    });

    test("rectangle with perEdgeStroke renders per-side lines", () =>
    {
        engine.addObject({
            id: "rect-per-edge",
            presentation: {
                shape: "rectangle",
                bounds: { x: 10, y: 10, width: 100, height: 60 },
                style: {
                    fill: { type: "solid", color: "#ffffff" },
                    stroke: { color: "#000000", width: 2 },
                    perEdgeStroke: {
                        top: { visible: true, color: "#ff0000", width: 3 },
                        right: { visible: true, color: "#00ff00", width: 2 },
                        bottom: { visible: true, color: "#0000ff", width: 1 },
                        left: { visible: true, color: "#ff00ff", width: 2 }
                    }
                },
                layer: "default"
            }
        });

        const g = getObjectGroup("rect-per-edge");

        expect(g).not.toBeNull();

        // The main rect should have stroke suppressed
        const rect = g!.querySelector("rect");

        expect(rect).not.toBeNull();
        expect(rect!.getAttribute("stroke")).toBe("none");

        // Should have 4 per-edge lines
        const lines = g!.querySelectorAll("line");

        expect(lines.length).toBe(4);

        // Top line: red, width 3
        const topLine = lines[0];

        expect(topLine.getAttribute("stroke")).toBe("#ff0000");
        expect(topLine.getAttribute("stroke-width")).toBe("3");

        // Bottom line: blue, width 1
        const bottomLine = lines[2];

        expect(bottomLine.getAttribute("stroke")).toBe("#0000ff");
        expect(bottomLine.getAttribute("stroke-width")).toBe("1");
    });

    test("hidden sides are not rendered", () =>
    {
        engine.addObject({
            id: "rect-partial",
            presentation: {
                shape: "rectangle",
                bounds: { x: 10, y: 10, width: 100, height: 60 },
                style: {
                    fill: { type: "solid", color: "#ffffff" },
                    stroke: { color: "#000000", width: 2 },
                    perEdgeStroke: {
                        top: { visible: true, color: "#ff0000", width: 2 },
                        right: { visible: false, color: "#00ff00", width: 2 },
                        bottom: { visible: true, color: "#0000ff", width: 2 },
                        // left omitted — should not render
                    }
                },
                layer: "default"
            }
        });

        const g = getObjectGroup("rect-partial");
        const lines = g!.querySelectorAll("line");

        // Only top and bottom are visible
        expect(lines.length).toBe(2);
    });

    test("per-edge sides inherit fallback stroke values", () =>
    {
        engine.addObject({
            id: "rect-fallback",
            presentation: {
                shape: "rectangle",
                bounds: { x: 10, y: 10, width: 100, height: 60 },
                style: {
                    fill: { type: "solid", color: "#ffffff" },
                    stroke: { color: "#333333", width: 2, dashPattern: [4, 2] },
                    perEdgeStroke: {
                        top: { visible: true },
                        right: { visible: true, color: "#ff0000" },
                        bottom: { visible: true },
                        left: { visible: true }
                    }
                },
                layer: "default"
            }
        });

        const g = getObjectGroup("rect-fallback");
        const lines = g!.querySelectorAll("line");

        expect(lines.length).toBe(4);

        // Top line should inherit fallback stroke color and width
        const topLine = lines[0];

        expect(topLine.getAttribute("stroke")).toBe("#333333");
        expect(topLine.getAttribute("stroke-width")).toBe("2");
        expect(topLine.getAttribute("stroke-dasharray")).toBe("4 2");

        // Right line has explicit color override
        const rightLine = lines[1];

        expect(rightLine.getAttribute("stroke")).toBe("#ff0000");
    });

    test("per-edge with dash pattern on individual side", () =>
    {
        engine.addObject({
            id: "rect-dash",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 80, height: 40 },
                style: {
                    fill: { type: "solid", color: "#ffffff" },
                    stroke: { color: "#000", width: 1 },
                    perEdgeStroke: {
                        top: { visible: true, dashPattern: [6, 3] },
                        bottom: { visible: true, dashPattern: [2, 2] }
                    }
                },
                layer: "default"
            }
        });

        const g = getObjectGroup("rect-dash");
        const lines = g!.querySelectorAll("line");

        expect(lines.length).toBe(2);
        expect(lines[0].getAttribute("stroke-dasharray")).toBe("6 3");
        expect(lines[1].getAttribute("stroke-dasharray")).toBe("2 2");
    });

    test("per-edge with gradient stroke creates defs", () =>
    {
        engine.addObject({
            id: "rect-grad",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 100, height: 50 },
                style: {
                    fill: { type: "solid", color: "#ffffff" },
                    stroke: { color: "#000", width: 1 },
                    perEdgeStroke: {
                        top: {
                            visible: true,
                            color: {
                                type: "linear",
                                stops: [
                                    { offset: 0, color: "#ff0000" },
                                    { offset: 1, color: "#0000ff" }
                                ],
                                angle: 0
                            },
                            width: 3
                        }
                    }
                },
                layer: "default"
            }
        });

        const g = getObjectGroup("rect-grad");
        const lines = g!.querySelectorAll("line");

        expect(lines.length).toBe(1);

        // The gradient line should reference a URL-based stroke
        const strokeAttr = lines[0].getAttribute("stroke") || "";

        expect(strokeAttr).toMatch(/^url\(#edge-grad-top-/);

        // A linearGradient should exist in the SVG defs
        const gradients = g!.querySelectorAll("linearGradient");

        expect(gradients.length).toBeGreaterThanOrEqual(1);
    });

    test("per-edge line coordinates match bounds (local space)", () =>
    {
        engine.addObject({
            id: "rect-coords",
            presentation: {
                shape: "rectangle",
                bounds: { x: 20, y: 30, width: 200, height: 100 },
                style: {
                    fill: { type: "solid", color: "#ffffff" },
                    stroke: { color: "#000", width: 1 },
                    perEdgeStroke: {
                        top: { visible: true, color: "#000", width: 1 },
                        right: { visible: true, color: "#000", width: 1 },
                        bottom: { visible: true, color: "#000", width: 1 },
                        left: { visible: true, color: "#000", width: 1 }
                    }
                },
                layer: "default"
            }
        });

        const g = getObjectGroup("rect-coords");
        const lines = g!.querySelectorAll("line");

        expect(lines.length).toBe(4);

        // renderShapeContent uses local coords (0,0,w,h)
        // Top: (0,0) -> (200,0)
        expect(lines[0].getAttribute("x1")).toBe("0");
        expect(lines[0].getAttribute("y1")).toBe("0");
        expect(lines[0].getAttribute("x2")).toBe("200");
        expect(lines[0].getAttribute("y2")).toBe("0");

        // Right: (200,0) -> (200,100)
        expect(lines[1].getAttribute("x1")).toBe("200");
        expect(lines[1].getAttribute("y1")).toBe("0");
        expect(lines[1].getAttribute("x2")).toBe("200");
        expect(lines[1].getAttribute("y2")).toBe("100");

        // Bottom: (0,100) -> (200,100)
        expect(lines[2].getAttribute("x1")).toBe("0");
        expect(lines[2].getAttribute("y1")).toBe("100");
        expect(lines[2].getAttribute("x2")).toBe("200");
        expect(lines[2].getAttribute("y2")).toBe("100");

        // Left: (0,0) -> (0,100)
        expect(lines[3].getAttribute("x1")).toBe("0");
        expect(lines[3].getAttribute("y1")).toBe("0");
        expect(lines[3].getAttribute("x2")).toBe("0");
        expect(lines[3].getAttribute("y2")).toBe("100");
    });

    test("non-box shape with perEdgeStroke still renders per-edge lines", () =>
    {
        // The engine does not restrict per-edge to box shapes — that policy
        // is enforced by the consuming app via borderTier
        engine.addObject({
            id: "ellipse-edge",
            presentation: {
                shape: "ellipse",
                bounds: { x: 0, y: 0, width: 80, height: 60 },
                style: {
                    fill: { type: "solid", color: "#ffffff" },
                    stroke: { color: "#000", width: 1 },
                    perEdgeStroke: {
                        top: { visible: true, color: "#ff0000", width: 2 }
                    }
                },
                layer: "default"
            }
        });

        const g = getObjectGroup("ellipse-edge");

        expect(g).not.toBeNull();

        // Uniform stroke should be suppressed
        const ellipse = g!.querySelector("ellipse");

        expect(ellipse!.getAttribute("stroke")).toBe("none");

        const lines = g!.querySelectorAll("line");

        expect(lines.length).toBe(1);
    });
});
