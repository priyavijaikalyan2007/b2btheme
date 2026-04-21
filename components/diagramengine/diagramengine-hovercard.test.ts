/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: DiagramEngine × HoverCard (ADR-126)
 * Integration tests covering objectHoverCardMode, renderObjectHoverCard,
 * renderConnectorHoverCard, tool-state suppression, and resilience when
 * the HoverCard component is absent.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createDiagramEngine } from "./diagramengine";
import { createHoverCard } from "../hovercard/hovercard";

let container: HTMLDivElement;

function setupContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "de-hc-" + Math.random().toString(36).slice(2, 8);
    el.style.width = "800px";
    el.style.height = "600px";
    document.body.appendChild(el);
    return el;
}

function dispatchMouseMove(svg: SVGElement, x: number, y: number): void
{
    svg.dispatchEvent(new MouseEvent("mousemove", {
        bubbles: true,
        clientX: x,
        clientY: y,
    }));
}

beforeEach(() =>
{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).createHoverCard = createHoverCard;
    container = setupContainer();
});

afterEach(() =>
{
    document.querySelectorAll(".hovercard").forEach((n) => n.remove());
    container.remove();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).createHoverCard;
    vi.useRealTimers();
});

describe("DiagramEngine hover card — default mode is 'off'", () =>
{
    test("pointermove over an object does not create a hover card", () =>
    {
        vi.useFakeTimers();
        const engine = createDiagramEngine(container, {});
        engine.addObject({
            id: "o1",
            presentation: { bounds: { x: 100, y: 100, width: 200, height: 100 } },
        });
        const svg = container.querySelector("svg")!;

        dispatchMouseMove(svg, 200, 150);
        vi.advanceTimersByTime(400);

        expect(document.querySelector(".hovercard")).toBeNull();

        engine.destroy();
    });
});

describe("DiagramEngine hover card — objectHoverCardMode: 'builtin'", () =>
{
    test("hovering an object shows a card with extracted content", () =>
    {
        vi.useFakeTimers();
        const engine = createDiagramEngine(container, {
            objectHoverCardMode: "builtin",
        });
        engine.addObject({
            id: "o1",
            semantic: {
                type: "uml.class",
                data: { className: "OrderService", methods: 12 },
                tags: ["service"],
            },
            presentation: { bounds: { x: 100, y: 100, width: 200, height: 100 } },
        });
        const svg = container.querySelector("svg")!;

        dispatchMouseMove(svg, 200, 150);
        vi.advanceTimersByTime(400);

        const card = document.querySelector(".hovercard");
        expect(card).not.toBeNull();
        const title = card?.querySelector(".hovercard-title")?.textContent ?? "";
        expect(title.length).toBeGreaterThan(0);
        const keys = Array.from(
            card?.querySelectorAll(".hovercard-property-key") ?? []
        ).map((k) => k.textContent);
        expect(keys).toContain("className");

        engine.destroy();
    });

    test("pointermove over empty canvas hides the card", () =>
    {
        vi.useFakeTimers();
        const engine = createDiagramEngine(container, {
            objectHoverCardMode: "builtin",
        });
        engine.addObject({
            id: "o1",
            presentation: { bounds: { x: 100, y: 100, width: 200, height: 100 } },
        });
        const svg = container.querySelector("svg")!;

        dispatchMouseMove(svg, 200, 150);
        vi.advanceTimersByTime(400);
        expect(document.querySelector(".hovercard-open")).not.toBeNull();

        dispatchMouseMove(svg, 600, 500);
        vi.advanceTimersByTime(200);
        expect(document.querySelector(".hovercard-open")).toBeNull();

        engine.destroy();
    });
});

describe("DiagramEngine hover card — objectHoverCardMode: 'custom'", () =>
{
    test("renderObjectHoverCard returning HoverCardContent is rendered", () =>
    {
        vi.useFakeTimers();
        const engine = createDiagramEngine(container, {
            objectHoverCardMode: "custom",
            renderObjectHoverCard: (obj) =>
                ({ title: `Custom ${obj.id}`, subtitle: "overridden" }),
        });
        engine.addObject({
            id: "o1",
            presentation: { bounds: { x: 100, y: 100, width: 200, height: 100 } },
        });
        const svg = container.querySelector("svg")!;

        dispatchMouseMove(svg, 200, 150);
        vi.advanceTimersByTime(400);

        expect(document.querySelector(".hovercard-title")?.textContent)
            .toBe("Custom o1");
        expect(document.querySelector(".hovercard-subtitle")?.textContent)
            .toBe("overridden");

        engine.destroy();
    });

    test("renderObjectHoverCard returning null suppresses the card", () =>
    {
        vi.useFakeTimers();
        const engine = createDiagramEngine(container, {
            objectHoverCardMode: "custom",
            renderObjectHoverCard: () => null,
        });
        engine.addObject({
            id: "o1",
            presentation: { bounds: { x: 100, y: 100, width: 200, height: 100 } },
        });
        const svg = container.querySelector("svg")!;

        dispatchMouseMove(svg, 200, 150);
        vi.advanceTimersByTime(400);

        expect(document.querySelector(".hovercard-open")).toBeNull();

        engine.destroy();
    });

    test("custom string renderer stays as textContent (XSS safe)", () =>
    {
        vi.useFakeTimers();
        const engine = createDiagramEngine(container, {
            objectHoverCardMode: "custom",
            renderObjectHoverCard: () => "<img src=x onerror=alert(1)>",
        });
        engine.addObject({
            id: "o1",
            presentation: { bounds: { x: 100, y: 100, width: 200, height: 100 } },
        });
        const svg = container.querySelector("svg")!;

        dispatchMouseMove(svg, 200, 150);
        vi.advanceTimersByTime(400);

        const plain = document.querySelector<HTMLElement>(".hovercard-body-plain");
        expect(plain?.textContent).toBe("<img src=x onerror=alert(1)>");
        expect(plain?.querySelector("img")).toBeNull();

        engine.destroy();
    });
});

describe("DiagramEngine hover card — tool-state suppression", () =>
{
    test("no card when active tool is not 'select'", () =>
    {
        vi.useFakeTimers();
        const engine = createDiagramEngine(container, {
            objectHoverCardMode: "builtin",
        });
        engine.addObject({
            id: "o1",
            presentation: { bounds: { x: 100, y: 100, width: 200, height: 100 } },
        });
        engine.setActiveTool("draw");
        const svg = container.querySelector("svg")!;

        dispatchMouseMove(svg, 200, 150);
        vi.advanceTimersByTime(400);

        expect(document.querySelector(".hovercard-open")).toBeNull();

        engine.destroy();
    });

    test("no card during an active drag; card reappears after mouseup", () =>
    {
        vi.useFakeTimers();
        const engine = createDiagramEngine(container, {
            objectHoverCardMode: "builtin",
        });
        engine.addObject({
            id: "o1",
            presentation: { bounds: { x: 100, y: 100, width: 200, height: 100 } },
        });
        const svg = container.querySelector("svg")!;

        // Start a drag by pressing on the object (select tool starts "move").
        svg.dispatchEvent(new MouseEvent("mousedown", {
            bubbles: true, clientX: 200, clientY: 150, button: 0,
        }));
        // Move while dragging — isInteracting() === true should suppress.
        dispatchMouseMove(svg, 240, 160);
        vi.advanceTimersByTime(400);
        expect(document.querySelector(".hovercard-open")).toBeNull();

        // Release the drag.
        svg.dispatchEvent(new MouseEvent("mouseup", {
            bubbles: true, clientX: 240, clientY: 160, button: 0,
        }));
        // Next mousemove is no longer mid-interaction → card should appear.
        dispatchMouseMove(svg, 240, 160);
        vi.advanceTimersByTime(400);
        expect(document.querySelector(".hovercard-open")).not.toBeNull();

        engine.destroy();
    });
});

describe("DiagramEngine hover card — resilience", () =>
{
    test("no throws when HoverCard factory is not loaded", () =>
    {
        vi.useFakeTimers();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).createHoverCard;
        const engine = createDiagramEngine(container, {
            objectHoverCardMode: "builtin",
        });
        engine.addObject({
            id: "o1",
            presentation: { bounds: { x: 100, y: 100, width: 200, height: 100 } },
        });
        const svg = container.querySelector("svg")!;

        expect(() =>
        {
            dispatchMouseMove(svg, 200, 150);
            vi.advanceTimersByTime(400);
        }).not.toThrow();
        expect(document.querySelector(".hovercard")).toBeNull();

        engine.destroy();
    });

    test("destroy() removes the shared hover card from the DOM", () =>
    {
        vi.useFakeTimers();
        const engine = createDiagramEngine(container, {
            objectHoverCardMode: "builtin",
        });
        engine.addObject({
            id: "o1",
            presentation: { bounds: { x: 100, y: 100, width: 200, height: 100 } },
        });
        const svg = container.querySelector("svg")!;

        dispatchMouseMove(svg, 200, 150);
        vi.advanceTimersByTime(400);
        expect(document.querySelector(".hovercard")).not.toBeNull();

        engine.destroy();

        expect(document.querySelector(".hovercard")).toBeNull();
    });
});
