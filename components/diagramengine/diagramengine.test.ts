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

    test("gradient fill creates linearGradient defs and url reference", () =>
    {
        engine.addObject({
            id: "rect-gradient-fill",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 100, height: 50 },
                style: {
                    fill: {
                        type: "gradient",
                        gradient: {
                            type: "linear",
                            angle: 90,
                            stops: [
                                { offset: 0, color: "rgba(255, 0, 0, 0.8)" },
                                { offset: 1, color: "rgba(0, 0, 255, 1)" }
                            ]
                        }
                    },
                    stroke: { color: "#000", width: 1 }
                },
                layer: "default",
            }
        });

        const g = getObjectGroup("rect-gradient-fill");

        expect(g).not.toBeNull();

        // Should have a linearGradient defined
        const gradient = g!.querySelector("linearGradient");

        expect(gradient).not.toBeNull();

        // Should have 2 stops
        const stops = gradient!.querySelectorAll("stop");

        expect(stops.length).toBe(2);

        // First stop: rgb colour + opacity
        expect(stops[0].getAttribute("stop-color")).toBe("rgb(255, 0, 0)");
        expect(stops[0].getAttribute("stop-opacity")).toBe("0.8");

        // Second stop: rgb colour, opacity 1 (no stop-opacity attr needed)
        expect(stops[1].getAttribute("stop-color")).toBe("rgb(0, 0, 255)");

        // Rect fill should reference the gradient
        const rect = g!.querySelector("rect");
        const fill = rect!.getAttribute("fill") || "";

        expect(fill).toMatch(/^url\(#grad-/);
    });

    test("gradient stroke creates linearGradient defs and url reference", () =>
    {
        engine.addObject({
            id: "rect-gradient-stroke",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 100, height: 50 },
                style: {
                    fill: { type: "solid", color: "#fff" },
                    stroke: {
                        color: {
                            type: "linear",
                            angle: 0,
                            stops: [
                                { offset: 0, color: "#ff0000" },
                                { offset: 1, color: "#0000ff" }
                            ]
                        },
                        width: 2
                    }
                },
                layer: "default"
            }
        });

        const g = getObjectGroup("rect-gradient-stroke");

        expect(g).not.toBeNull();

        // Should have a linearGradient for the stroke
        const gradient = g!.querySelector("linearGradient");

        expect(gradient).not.toBeNull();

        // Rect stroke should reference the gradient
        const rect = g!.querySelector("rect");
        const stroke = rect!.getAttribute("stroke") || "";

        expect(stroke).toMatch(/^url\(#stroke-grad-/);
    });

    test("gradient fill with radial type creates radialGradient", () =>
    {
        engine.addObject({
            id: "ellipse-radial-fill",
            presentation: {
                shape: "ellipse",
                bounds: { x: 0, y: 0, width: 80, height: 60 },
                style: {
                    fill: {
                        type: "gradient",
                        gradient: {
                            type: "radial",
                            center: { x: 0.3, y: 0.4 },
                            radius: 0.7,
                            stops: [
                                { offset: 0, color: "#ffffff" },
                                { offset: 1, color: "#000000" }
                            ]
                        }
                    },
                    stroke: { color: "#000", width: 1 }
                },
                layer: "default",
            }
        });

        const g = getObjectGroup("ellipse-radial-fill");
        const gradient = g!.querySelector("radialGradient");

        expect(gradient).not.toBeNull();
        expect(gradient!.querySelectorAll("stop").length).toBe(2);

        const ellipse = g!.querySelector("ellipse");

        expect(ellipse!.getAttribute("fill")).toMatch(/^url\(#grad-/);
    });

    test("gradient fill defs are inside the parent g element", () =>
    {
        engine.addObject({
            id: "rect-defs-location",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 100, height: 50 },
                style: {
                    fill: {
                        type: "gradient",
                        gradient: {
                            type: "linear",
                            angle: 0,
                            stops: [
                                { offset: 0, color: "#ff0000" },
                                { offset: 1, color: "#0000ff" }
                            ]
                        }
                    },
                    stroke: { color: "#000", width: 1 }
                },
                layer: "default",
            }
        });

        const g = getObjectGroup("rect-defs-location");

        // The defs should be inside the object's group, not orphaned
        const defs = g!.querySelector("defs");

        expect(defs).not.toBeNull();
        expect(defs!.parentElement).not.toBeNull();
    });

    test("gradient fill with 3+ stops renders all stops", () =>
    {
        engine.addObject({
            id: "rect-3stops",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 100, height: 50 },
                style: {
                    fill: {
                        type: "gradient",
                        gradient: {
                            type: "linear",
                            angle: 45,
                            stops: [
                                { offset: 0, color: "#ff0000" },
                                { offset: 0.5, color: "#00ff00" },
                                { offset: 1, color: "#0000ff" }
                            ]
                        }
                    },
                    stroke: { color: "#000", width: 1 }
                },
                layer: "default",
            }
        });

        const g = getObjectGroup("rect-3stops");
        const stops = g!.querySelectorAll("stop");

        expect(stops.length).toBe(3);
        expect(stops[0].getAttribute("offset")).toBe("0");
        expect(stops[1].getAttribute("offset")).toBe("0.5");
        expect(stops[2].getAttribute("offset")).toBe("1");
    });

    test("hex colour stops render without stop-opacity", () =>
    {
        engine.addObject({
            id: "rect-hex-stops",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 100, height: 50 },
                style: {
                    fill: {
                        type: "gradient",
                        gradient: {
                            type: "linear",
                            angle: 0,
                            stops: [
                                { offset: 0, color: "#ff0000" },
                                { offset: 1, color: "#0000ff" }
                            ]
                        }
                    },
                    stroke: { color: "#000", width: 1 }
                },
                layer: "default",
            }
        });

        const g = getObjectGroup("rect-hex-stops");
        const stops = g!.querySelectorAll("stop");

        expect(stops.length).toBe(2);
        expect(stops[0].getAttribute("stop-color")).toBe("#ff0000");
        expect(stops[0].getAttribute("stop-opacity")).toBeNull();
    });

    test("gradient fill on diamond shape works", () =>
    {
        engine.addObject({
            id: "diamond-gradient",
            presentation: {
                shape: "diamond",
                bounds: { x: 0, y: 0, width: 80, height: 60 },
                style: {
                    fill: {
                        type: "gradient",
                        gradient: {
                            type: "linear",
                            angle: 90,
                            stops: [
                                { offset: 0, color: "#ff0000" },
                                { offset: 1, color: "#0000ff" }
                            ]
                        }
                    },
                    stroke: { color: "#000", width: 1 }
                },
                layer: "default",
            }
        });

        const g = getObjectGroup("diamond-gradient");

        expect(g!.querySelector("linearGradient")).not.toBeNull();
        expect(g!.querySelector("path")!.getAttribute("fill")).toMatch(/^url\(#grad-/);
    });

    test("gradient fill on triangle shape works", () =>
    {
        engine.addObject({
            id: "triangle-gradient",
            presentation: {
                shape: "triangle",
                bounds: { x: 0, y: 0, width: 80, height: 60 },
                style: {
                    fill: {
                        type: "gradient",
                        gradient: {
                            type: "linear",
                            angle: 180,
                            stops: [
                                { offset: 0, color: "#00ff00" },
                                { offset: 1, color: "#ff00ff" }
                            ]
                        }
                    },
                    stroke: { color: "#000", width: 1 }
                },
                layer: "default",
            }
        });

        const g = getObjectGroup("triangle-gradient");

        expect(g!.querySelector("linearGradient")).not.toBeNull();
    });

    test("updating object fill from solid to gradient re-renders with gradient", () =>
    {
        engine.addObject({
            id: "rect-update-to-gradient",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 100, height: 50 },
                style: {
                    fill: { type: "solid", color: "#ff0000" },
                    stroke: { color: "#000", width: 1 }
                },
                layer: "default",
            }
        });

        // Verify initially solid
        let g = getObjectGroup("rect-update-to-gradient");
        let rect = g!.querySelector("rect");

        expect(rect!.getAttribute("fill")).toBe("#ff0000");

        // Update to gradient
        engine.updateObject("rect-update-to-gradient", {
            presentation: {
                style: {
                    fill: {
                        type: "gradient",
                        gradient: {
                            type: "linear",
                            angle: 90,
                            stops: [
                                { offset: 0, color: "#00ff00" },
                                { offset: 1, color: "#0000ff" }
                            ]
                        }
                    },
                    stroke: { color: "#000", width: 1 }
                }
            }
        });

        // Re-query after update (element is re-rendered)
        g = getObjectGroup("rect-update-to-gradient");
        rect = g!.querySelector("rect");

        expect(rect!.getAttribute("fill")).toMatch(/^url\(#grad-/);
        expect(g!.querySelector("linearGradient")).not.toBeNull();
    });

    test("complex: radial fill + per-edge borders + gradient text", () =>
    {
        engine.addObject({
            id: "complex-combo",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 180, height: 120 },
                style: {
                    fill: {
                        type: "gradient",
                        gradient: {
                            type: "radial",
                            center: { x: 0.3, y: 0.3 }, radius: 0.8,
                            stops: [
                                { offset: 0, color: "rgba(255,255,255,0.95)" },
                                { offset: 1, color: "rgba(100,150,220,0.4)" }
                            ]
                        }
                    },
                    perEdgeStroke: {
                        top: { visible: true, color: "#1c7ed6", width: 3 },
                        bottom: { visible: true, color: "#dc2626", width: 3 },
                        left: { visible: false },
                        right: {
                            visible: true,
                            color: {
                                type: "linear",
                                stops: [
                                    { offset: 0, color: "#52b788" },
                                    { offset: 1, color: "#f59e0b" }
                                ],
                                angle: 90
                            },
                            width: 4
                        }
                    }
                },
                textContent: {
                    runs: [
                        { text: "Solid ", color: "#1c7ed6" },
                        {
                            text: "Gradient ",
                            color: {
                                type: "linear", angle: 0,
                                stops: [
                                    { offset: 0, color: "#F83600" },
                                    { offset: 1, color: "#FE8C00" }
                                ]
                            }
                        },
                        { text: "Alpha", color: "rgba(111,66,193,0.5)" }
                    ],
                    overflow: "visible", verticalAlign: "middle",
                    horizontalAlign: "center", padding: 8
                },
                layer: "default",
            }
        });

        const g = getObjectGroup("complex-combo");

        expect(g).not.toBeNull();

        // Radial gradient fill present
        expect(g!.querySelector("radialGradient")).not.toBeNull();

        const rect = g!.querySelector("rect");

        expect(rect!.getAttribute("fill")).toMatch(/^url\(#grad-/);

        // Uniform stroke suppressed (perEdgeStroke active)
        expect(rect!.getAttribute("stroke")).toBe("none");

        // Per-edge lines: top, bottom, right visible; left hidden
        const lines = g!.querySelectorAll("line");

        expect(lines.length).toBe(3);

        // Top = solid blue
        expect(lines[0].getAttribute("stroke")).toBe("#1c7ed6");
        expect(lines[0].getAttribute("stroke-width")).toBe("3");

        // Right = gradient stroke (url reference)
        expect(lines[1].getAttribute("stroke")).toMatch(/^url\(#edge-grad-/);

        // Bottom = solid red
        expect(lines[2].getAttribute("stroke")).toBe("#dc2626");

        // Text with 3 runs
        const spans = g!.querySelectorAll("span");

        expect(spans.length).toBeGreaterThanOrEqual(3);

        // First span: solid colour
        const span0Style = spans[0].getAttribute("style") || "";

        expect(span0Style).toContain("color: #1c7ed6");

        // Second span: gradient text (background-clip: text)
        const span1Style = spans[1].getAttribute("style") || "";

        expect(span1Style).toContain("background-clip: text");
        expect(span1Style).toContain("color: transparent");
        expect(span1Style).toContain("linear-gradient");

        // Third span: rgba alpha colour
        const span2Style = spans[2].getAttribute("style") || "";

        expect(span2Style).toContain("rgba(111,66,193,0.5)");
    });

    test("text along path renders SVG textPath element", () =>
    {
        engine.addObject({
            id: "textpath-demo",
            presentation: {
                shape: "rectangle",
                bounds: { x: 0, y: 0, width: 300, height: 100 },
                style: {
                    fill: { type: "none" },
                    stroke: { color: "#000", width: 1 }
                },
                textContent: {
                    runs: [{ text: "Hello Curved World!", fontSize: 18, bold: true }],
                    overflow: "visible",
                    verticalAlign: "middle",
                    horizontalAlign: "center",
                    padding: 0,
                    textPath: {
                        path: "M 0,80 Q 150,0 300,80",
                        startOffset: 0.5,
                        textAnchor: "middle"
                    }
                },
                layer: "default",
            }
        });

        const g = getObjectGroup("textpath-demo");

        expect(g).not.toBeNull();

        // Should use SVG <text> + <textPath>, not foreignObject
        expect(g!.querySelector("text")).not.toBeNull();
        expect(g!.querySelector("textPath")).not.toBeNull();
        expect(g!.querySelector("foreignObject")).toBeNull();

        const tp = g!.querySelector("textPath")!;

        expect(tp.getAttribute("href")).toMatch(/^#de-tp-/);
        expect(tp.getAttribute("startOffset")).toBe("50%");

        const tspan = tp.querySelector("tspan");

        expect(tspan).not.toBeNull();
        expect(tspan!.textContent).toBe("Hello Curved World!");
        expect(tspan!.getAttribute("font-weight")).toBe("bold");
    });
});
