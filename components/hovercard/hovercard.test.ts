/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: HoverCard
 * Spec-based tests covering the contract defined in specs/hovercard.prd.md.
 * Groups: factory + handle shape, default renderer, escape hatch, positioning
 * math, lifecycle/timers, dismissal triggers, a11y, attachHoverCard.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
    attachHoverCard,
    computePosition,
    createHoverCard,
    HoverCardContent,
    HoverCardHandle,
    renderCardContent,
    resolveAnchorRect,
} from "./hovercard";

// ============================================================================
// HELPERS
// ============================================================================

function makeAnchor(x = 100, y = 100, w = 40, h = 20): HTMLElement
{
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
    document.body.appendChild(el);
    // jsdom doesn't layout; stub getBoundingClientRect for positioning tests.
    el.getBoundingClientRect = () => ({
        x, y, left: x, top: y, right: x + w, bottom: y + h,
        width: w, height: h, toJSON: () => ({}),
    });
    return el;
}

function cleanupHoverCards(): void
{
    document.querySelectorAll(".hovercard").forEach((n) => n.remove());
    document.querySelectorAll("[aria-describedby^='hovercard-']").forEach((n) => n.removeAttribute("aria-describedby"));
}

beforeEach(() =>
{
    document.body.innerHTML = "";
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
});

afterEach(() =>
{
    cleanupHoverCards();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY + HANDLE SHAPE
// ============================================================================

describe("createHoverCard — handle", () =>
{
    test("returns a handle with all documented methods", () =>
    {
        const hc = createHoverCard();

        expect(typeof hc.show).toBe("function");
        expect(typeof hc.hide).toBe("function");
        expect(typeof hc.update).toBe("function");
        expect(typeof hc.reposition).toBe("function");
        expect(typeof hc.isOpen).toBe("function");
        expect(typeof hc.getElement).toBe("function");
        expect(typeof hc.destroy).toBe("function");

        hc.destroy();
    });

    test("isOpen is false before first show", () =>
    {
        const hc = createHoverCard();
        expect(hc.isOpen()).toBe(false);
        hc.destroy();
    });

    test("getElement returns a role=tooltip element with a generated id", () =>
    {
        const hc = createHoverCard();
        const el = hc.getElement();
        expect(el.getAttribute("role")).toBe("tooltip");
        expect(el.id).toMatch(/^hovercard-\d+$/);
        hc.destroy();
    });

    test("destroy removes the card and blocks further getElement calls", () =>
    {
        const hc = createHoverCard();
        hc.getElement();
        hc.destroy();
        expect(document.querySelector(".hovercard")).toBeNull();
        expect(() => hc.getElement()).toThrow();
    });
});

// ============================================================================
// DEFAULT RENDERER
// ============================================================================

describe("renderCardContent — declarative path", () =>
{
    test("omits header when no title/subtitle/icon", () =>
    {
        const body = renderCardContent({}, 5);
        expect(body.querySelector(".hovercard-header")).toBeNull();
    });

    test("renders title and subtitle via textContent", () =>
    {
        const body = renderCardContent({ title: "Users", subtitle: "entity" }, 5);
        const title = body.querySelector(".hovercard-title");
        const sub = body.querySelector(".hovercard-subtitle");
        expect(title?.textContent).toBe("Users");
        expect(sub?.textContent).toBe("entity");
    });

    test("iconColor applies as currentColor source", () =>
    {
        const body = renderCardContent({ title: "X", icon: "bi-diagram-3", iconColor: "#f00" }, 5);
        const icon = body.querySelector<HTMLElement>(".hovercard-icon");
        expect(icon?.style.color).toBe("rgb(255, 0, 0)");
        expect(icon?.querySelector("i")?.className).toBe("bi-diagram-3");
    });

    test("renders badge with mapped variant class", () =>
    {
        const body = renderCardContent({ title: "X", badge: { text: "active", variant: "success" } }, 5);
        const badge = body.querySelector(".hovercard-badge");
        expect(badge?.className).toContain("bg-success");
        expect(badge?.textContent).toBe("active");
    });

    test("truncates properties at maxProperties and shows +N more", () =>
    {
        const props = Array.from({ length: 8 }, (_, i) => ({ key: `k${i}`, value: `v${i}` }));
        const body = renderCardContent({ title: "X", properties: props }, 3);
        const rows = body.querySelectorAll(".hovercard-property");
        const more = body.querySelector(".hovercard-property-more");
        expect(rows.length).toBe(3);
        expect(more?.textContent).toBe("+5 more");
    });

    test("ellipsizes property values above 160 chars; stores full value in title attr", () =>
    {
        const long = "x".repeat(200);
        const body = renderCardContent({ title: "X", properties: [{ key: "k", value: long }] }, 5);
        const val = body.querySelector<HTMLElement>(".hovercard-property-value");
        expect(val?.textContent?.endsWith("\u2026")).toBe(true);
        expect(val?.getAttribute("title")).toBe(long);
    });

    test("description uses textContent (no HTML injection)", () =>
    {
        const body = renderCardContent({ title: "X", description: "<script>alert(1)</script>" }, 5);
        const desc = body.querySelector(".hovercard-description");
        expect(desc?.innerHTML).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    });

    test("footer accepts a string or an HTMLElement", () =>
    {
        const strBody = renderCardContent({ title: "X", footer: "last edit 2h ago" }, 5);
        expect(strBody.querySelector(".hovercard-footer")?.textContent).toBe("last edit 2h ago");

        const custom = document.createElement("a");
        custom.textContent = "open";
        const elBody = renderCardContent({ title: "X", footer: custom }, 5);
        expect(elBody.querySelector(".hovercard-footer a")).toBe(custom);
    });
});

// ============================================================================
// ESCAPE HATCH
// ============================================================================

describe("show — escape hatch (HTMLElement / string)", () =>
{
    test("string content is placed via textContent, never innerHTML", () =>
    {
        const hc = createHoverCard({ openDelay: 0 });
        vi.useFakeTimers();
        hc.show(makeAnchor(), "<img src=x onerror=alert(1)>");
        vi.advanceTimersByTime(10);
        const plain = hc.getElement().querySelector<HTMLElement>(".hovercard-body-plain");
        expect(plain?.textContent).toBe("<img src=x onerror=alert(1)>");
        expect(plain?.querySelector("img")).toBeNull();
        hc.destroy();
    });

    test("HTMLElement content is appended directly", () =>
    {
        const node = document.createElement("section");
        node.textContent = "custom";
        const hc = createHoverCard({ openDelay: 0 });
        vi.useFakeTimers();
        hc.show(makeAnchor(), node);
        vi.advanceTimersByTime(10);
        expect(hc.getElement().querySelector("section")).toBe(node);
        hc.destroy();
    });
});

// ============================================================================
// POSITIONING MATH
// ============================================================================

describe("computePosition — pure", () =>
{
    const card = { width: 280, height: 160 };
    const viewport = { width: 1280, height: 800 };

    test("auto chooses bottom when there is room", () =>
    {
        const res = computePosition(
            { x: 100, y: 100, width: 40, height: 20 },
            card, "auto", "center", 8, viewport
        );
        expect(res.placement).toBe("bottom");
        expect(res.y).toBeGreaterThan(100);
    });

    test("auto falls back to top when bottom overflows", () =>
    {
        const res = computePosition(
            { x: 100, y: 760, width: 40, height: 20 },
            card, "auto", "center", 8, viewport
        );
        expect(res.placement).toBe("top");
    });

    test("clamps horizontally when anchor is near left edge", () =>
    {
        const res = computePosition(
            { x: 0, y: 400, width: 10, height: 10 },
            card, "bottom", "start", 8, viewport
        );
        expect(res.x).toBeGreaterThanOrEqual(8);
    });

    test("clamps horizontally when anchor is near right edge", () =>
    {
        const res = computePosition(
            { x: 1270, y: 400, width: 10, height: 10 },
            card, "bottom", "end", 8, viewport
        );
        expect(res.x + card.width).toBeLessThanOrEqual(viewport.width - 8);
    });

    test("right placement chosen when explicitly requested and room exists", () =>
    {
        const res = computePosition(
            { x: 100, y: 400, width: 40, height: 20 },
            card, "right", "center", 8, viewport
        );
        expect(res.placement).toBe("right");
        expect(res.x).toBe(148);
    });
});

describe("resolveAnchorRect", () =>
{
    test("handles HTMLElement via getBoundingClientRect", () =>
    {
        const el = makeAnchor(40, 60, 100, 20);
        const r = resolveAnchorRect(el);
        expect(r).toEqual({ x: 40, y: 60, width: 100, height: 20 });
    });

    test("handles plain xywh object", () =>
    {
        const r = resolveAnchorRect({ x: 1, y: 2, width: 3, height: 4 });
        expect(r).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    });

    test("handles SVGElement (GraphCanvas / DiagramEngine anchors)", () =>
    {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        svg.appendChild(g);
        document.body.appendChild(svg);
        g.getBoundingClientRect = () => ({
            x: 120, y: 80, left: 120, top: 80, right: 180, bottom: 120,
            width: 60, height: 40, toJSON: () => ({})
        });
        const r = resolveAnchorRect(g);
        expect(r).toEqual({ x: 120, y: 80, width: 60, height: 40 });
        svg.remove();
    });
});

// ============================================================================
// LIFECYCLE + TIMERS
// ============================================================================

describe("show / hide — timers", () =>
{
    test("show waits for openDelay before becoming visible", () =>
    {
        vi.useFakeTimers();
        const hc = createHoverCard({ openDelay: 250, closeDelay: 100 });
        hc.show(makeAnchor(), { title: "X" });
        expect(hc.isOpen()).toBe(false);
        vi.advanceTimersByTime(249);
        expect(hc.isOpen()).toBe(false);
        vi.advanceTimersByTime(2);
        expect(hc.isOpen()).toBe(true);
        hc.destroy();
    });

    test("hide waits for closeDelay before disappearing", () =>
    {
        vi.useFakeTimers();
        const hc = createHoverCard({ openDelay: 0, closeDelay: 100 });
        hc.show(makeAnchor(), { title: "X" });
        vi.advanceTimersByTime(5);
        expect(hc.isOpen()).toBe(true);
        hc.hide();
        vi.advanceTimersByTime(50);
        expect(hc.isOpen()).toBe(true);
        vi.advanceTimersByTime(60);
        expect(hc.isOpen()).toBe(false);
        hc.destroy();
    });

    test("show during close-pending cancels the close", () =>
    {
        vi.useFakeTimers();
        const hc = createHoverCard({ openDelay: 0, closeDelay: 100 });
        hc.show(makeAnchor(), { title: "X" });
        vi.advanceTimersByTime(5);
        hc.hide();
        hc.show(makeAnchor(200, 200), { title: "Y" });
        vi.advanceTimersByTime(200);
        expect(hc.isOpen()).toBe(true);
        hc.destroy();
    });

    test("update on open card replaces body in place (no flash)", () =>
    {
        vi.useFakeTimers();
        const hc = createHoverCard({ openDelay: 0 });
        hc.show(makeAnchor(), { title: "A" });
        vi.advanceTimersByTime(5);
        const rootBefore = hc.getElement();
        hc.update({ title: "B" });
        expect(hc.getElement()).toBe(rootBefore);
        expect(rootBefore.querySelector(".hovercard-title")?.textContent).toBe("B");
        hc.destroy();
    });
});

// ============================================================================
// DISMISSAL TRIGGERS
// ============================================================================

describe("dismissal triggers", () =>
{
    function openCard(): HoverCardHandle
    {
        vi.useFakeTimers();
        const hc = createHoverCard({ openDelay: 0, closeDelay: 0 });
        hc.show(makeAnchor(), { title: "X" });
        vi.advanceTimersByTime(5);
        return hc;
    }

    test("Escape key hides the card immediately", () =>
    {
        const hc = openCard();
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        vi.advanceTimersByTime(5);
        expect(hc.isOpen()).toBe(false);
        hc.destroy();
    });

    test("native contextmenu event hides the card", () =>
    {
        const hc = openCard();
        document.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
        vi.advanceTimersByTime(5);
        expect(hc.isOpen()).toBe(false);
        hc.destroy();
    });

    test("custom hovercard:yield event hides the card", () =>
    {
        const hc = openCard();
        document.dispatchEvent(new CustomEvent("hovercard:yield"));
        vi.advanceTimersByTime(5);
        expect(hc.isOpen()).toBe(false);
        hc.destroy();
    });

    test("window resize hides the card", () =>
    {
        const hc = openCard();
        window.dispatchEvent(new Event("resize"));
        vi.advanceTimersByTime(5);
        expect(hc.isOpen()).toBe(false);
        hc.destroy();
    });

    test("destroy removes all listeners so later events don't throw", () =>
    {
        const hc = openCard();
        hc.destroy();
        expect(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))).not.toThrow();
        expect(() => document.dispatchEvent(new MouseEvent("contextmenu"))).not.toThrow();
    });
});

// ============================================================================
// attachHoverCard
// ============================================================================

describe("attachHoverCard", () =>
{
    test("mouseenter opens the card; mouseleave hides it; aria-describedby is wired", () =>
    {
        vi.useFakeTimers();
        const shared = createHoverCard({ openDelay: 0, closeDelay: 0 });
        const anchor = makeAnchor();
        const content: HoverCardContent = { title: "hi" };
        const detach = attachHoverCard(anchor, () => content, { shared });

        anchor.dispatchEvent(new MouseEvent("mouseenter"));
        vi.advanceTimersByTime(5);
        expect(shared.isOpen()).toBe(true);
        expect(anchor.getAttribute("aria-describedby")).toBe(shared.getElement().id);

        anchor.dispatchEvent(new MouseEvent("mouseleave"));
        vi.advanceTimersByTime(5);
        expect(shared.isOpen()).toBe(false);
        expect(anchor.getAttribute("aria-describedby")).toBeNull();

        detach();
        shared.destroy();
    });

    test("getContent returning null suppresses show", () =>
    {
        vi.useFakeTimers();
        const shared = createHoverCard({ openDelay: 0 });
        const anchor = makeAnchor();
        attachHoverCard(anchor, () => null, { shared });
        anchor.dispatchEvent(new MouseEvent("mouseenter"));
        vi.advanceTimersByTime(5);
        expect(shared.isOpen()).toBe(false);
        shared.destroy();
    });

    test("detach removes listeners and destroys owned handle", () =>
    {
        vi.useFakeTimers();
        const anchor = makeAnchor();
        const detach = attachHoverCard(anchor, () => ({ title: "x" }), { openDelay: 0 });
        detach();
        anchor.dispatchEvent(new MouseEvent("mouseenter"));
        vi.advanceTimersByTime(5);
        expect(document.querySelector(".hovercard-open")).toBeNull();
    });

    test("touch-primary device (matchMedia '(hover: none)') no-ops", () =>
    {
        const originalMatchMedia = window.matchMedia;
        window.matchMedia = ((q: string) => ({
            matches: q === "(hover: none)",
            media: q,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        })) as unknown as typeof window.matchMedia;

        try
        {
            const detach = attachHoverCard(makeAnchor(), () => ({ title: "x" }));
            detach();
            expect(document.querySelector(".hovercard")).toBeNull();
        }
        finally
        {
            window.matchMedia = originalMatchMedia;
        }
    });
});
