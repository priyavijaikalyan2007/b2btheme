/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: GraphCanvas × HoverCard (ADR-125)
 * Integration tests covering tooltipMode, renderNodeTooltip, renderEdgeTooltip,
 * and the shared HoverCard handle. Requires the HoverCard factory to be
 * published to window.createHoverCard (IIFE runtime convention).
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createGraphCanvas } from "./graphcanvas";
import type { GraphCanvasOptions, GraphNode } from "./graphcanvas";
import { createHoverCard } from "../hovercard/hovercard";

let container: HTMLElement;

function mkOpts(overrides?: Partial<GraphCanvasOptions>): GraphCanvasOptions
{
    const node: GraphNode = {
        id: "n1",
        label: "Users",
        type: "entity",
        status: "active",
        icon: "bi-people",
        color: "#2563eb",
        description: "All registered users in the tenant.",
        properties: { count: 1024, tier: "gold" },
    };
    return {
        container,
        nodes: [node, { id: "n2", label: "Orders", type: "entity" }],
        edges: [{ id: "e1", sourceId: "n1", targetId: "n2", type: "has", label: "has" }],
        ...overrides,
    };
}

function hoverFirstNode(): void
{
    const nodes = document.querySelectorAll<SVGElement>(".gc-node");
    const first = nodes[0];
    if (!first) { throw new Error("no node rendered"); }
    first.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
}

beforeEach(() =>
{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).createHoverCard = createHoverCard;
    container = document.createElement("div");
    container.style.cssText = "width:800px;height:600px;";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.querySelectorAll(".hovercard").forEach((n) => n.remove());
    container.remove();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).createHoverCard;
    vi.useRealTimers();
});

describe("GraphCanvas hover card — builtin mode (default)", () =>
{
    test("hovering a node opens a hover card with title, subtitle, badge, properties, description", () =>
    {
        vi.useFakeTimers();
        const canvas = createGraphCanvas(mkOpts());
        hoverFirstNode();
        vi.advanceTimersByTime(300);

        const card = document.querySelector(".hovercard");
        expect(card).not.toBeNull();
        expect(card?.querySelector(".hovercard-title")?.textContent).toBe("Users");
        expect(card?.querySelector(".hovercard-badge")?.className).toContain("bg-success");
        expect(card?.querySelector(".hovercard-description")?.textContent).toContain("registered users");
        const rows = card?.querySelectorAll(".hovercard-property");
        expect((rows?.length ?? 0)).toBeGreaterThanOrEqual(2);

        canvas.destroy();
    });

    test("destroying the canvas also destroys the shared HoverCard", () =>
    {
        vi.useFakeTimers();
        const canvas = createGraphCanvas(mkOpts());
        hoverFirstNode();
        vi.advanceTimersByTime(300);
        expect(document.querySelector(".hovercard")).not.toBeNull();

        canvas.destroy();
        expect(document.querySelector(".hovercard")).toBeNull();
    });
});

describe("GraphCanvas hover card — tooltipMode: \"off\"", () =>
{
    test("suppresses the card but still fires onNodeHover", () =>
    {
        vi.useFakeTimers();
        const spy = vi.fn();
        const canvas = createGraphCanvas(mkOpts({ tooltipMode: "off", onNodeHover: spy }));
        hoverFirstNode();
        vi.advanceTimersByTime(300);
        expect(document.querySelector(".hovercard")).toBeNull();
        expect(spy).toHaveBeenCalled();
        canvas.destroy();
    });
});

describe("GraphCanvas hover card — tooltipMode: \"custom\"", () =>
{
    test("callback returning null suppresses the card for that node", () =>
    {
        vi.useFakeTimers();
        const canvas = createGraphCanvas(mkOpts({
            tooltipMode: "custom",
            renderNodeTooltip: () => null,
        }));
        hoverFirstNode();
        vi.advanceTimersByTime(300);
        expect(document.querySelector(".hovercard-open")).toBeNull();
        canvas.destroy();
    });

    test("callback returning GraphHoverCardContent is rendered via the default layout", () =>
    {
        vi.useFakeTimers();
        const canvas = createGraphCanvas(mkOpts({
            tooltipMode: "custom",
            renderNodeTooltip: (n) => ({ title: `Custom ${n.label}`, subtitle: "overridden" }),
        }));
        hoverFirstNode();
        vi.advanceTimersByTime(300);
        const title = document.querySelector(".hovercard-title")?.textContent;
        expect(title).toBe("Custom Users");
        canvas.destroy();
    });

    test("callback returning a string is placed as textContent (no HTML injection)", () =>
    {
        vi.useFakeTimers();
        const canvas = createGraphCanvas(mkOpts({
            tooltipMode: "custom",
            renderNodeTooltip: () => "<img src=x onerror=alert(1)>",
        }));
        hoverFirstNode();
        vi.advanceTimersByTime(300);
        const plain = document.querySelector<HTMLElement>(".hovercard-body-plain");
        expect(plain?.textContent).toBe("<img src=x onerror=alert(1)>");
        expect(plain?.querySelector("img")).toBeNull();
        canvas.destroy();
    });
});

describe("GraphCanvas hover card — resilience", () =>
{
    test("gracefully skips when HoverCard component is not loaded", () =>
    {
        vi.useFakeTimers();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).createHoverCard;
        const canvas = createGraphCanvas(mkOpts());
        expect(() => { hoverFirstNode(); vi.advanceTimersByTime(300); }).not.toThrow();
        expect(document.querySelector(".hovercard")).toBeNull();
        canvas.destroy();
    });
});
