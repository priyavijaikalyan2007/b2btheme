/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: Annotation — callout, arrow and highlight overlays for the canvas.
 * The second component built only against the public Surface contract
 * (plan Phase 13, PRD §15.2).
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";

import { createAnnotation, type AnnotationHandle } from "./annotation";

// ============================================================================
// HARNESS
// ============================================================================

let host: HTMLDivElement;
let annotation: AnnotationHandle | null = null;

beforeEach(() =>
{
    host = document.createElement("div");
    host.id = `annot-host-${Math.random().toString(36).slice(2, 8)}`;
    document.body.appendChild(host);
});

afterEach(() =>
{
    annotation?.destroy();
    annotation = null;
    host.remove();
});

function make(options = {}): AnnotationHandle
{
    annotation = createAnnotation(host.id, options);
    return annotation;
}

/**
 * An annotation in its EXPANDED state.
 *
 * The resting state is a marker — an annotation is a mark on something, and
 * twenty expanded callouts would bury what they annotate. Tests about drawn
 * content therefore have to open it first.
 */
function makeOpen(options = {}): AnnotationHandle
{
    return make({ ...options, expanded: true });
}

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("Annotation — lifecycle", () =>
{
    test("renders into the host", () =>
    {
        make();

        expect(host.querySelector(".annotation")).toBeTruthy();
    });

    test("rests as a marker, not an expanded callout", () =>
    {
        make({ label: "Largest table" });

        expect(host.querySelector(".annotation-marker")).toBeTruthy();
        expect(host.querySelector("svg")).toBeNull();
    });

    test("throws a literate error for a missing container", () =>
    {
        expect(() => createAnnotation("no-such-host", {})).toThrow(/no-such-host/);
    });

    test("destroy removes all DOM", () =>
    {
        make().destroy();

        expect(host.children).toHaveLength(0);
    });

    test("destroy is idempotent", () =>
    {
        const handle = make();
        handle.destroy();

        expect(() => handle.destroy()).not.toThrow();
    });

    test("renders an SVG rather than a canvas element", () =>
    {
        makeOpen();

        // A canvas context would make the component resource-holding and
        // change its budget class; an SVG keeps it trivial.
        expect(host.querySelector("svg")).toBeTruthy();
        expect(host.querySelector("canvas")).toBeNull();
    });
});

// ============================================================================
// KINDS
// ============================================================================

describe("Annotation — kinds", () =>
{
    test("defaults to a callout", () =>
    {
        expect(make().getState().kind).toBe("callout");
    });

    test("renders an arrow with a line", () =>
    {
        makeOpen({ kind: "arrow" });

        expect(host.querySelector("line")).toBeTruthy();
    });

    test("renders a highlight with a rect", () =>
    {
        makeOpen({ kind: "highlight" });

        expect(host.querySelector("rect")).toBeTruthy();
    });

    test("renders a callout with text", () =>
    {
        makeOpen({ kind: "callout", label: "Look here" });

        expect(host.textContent).toContain("Look here");
    });

    test("falls back to callout for an unknown kind", () =>
    {
        expect(make({ kind: "hologram" }).getState().kind).toBe("callout");
    });

    test("label is set as text, never as markup", () =>
    {
        makeOpen({ label: "<b>bold</b>" });

        expect(host.querySelector("b")).toBeNull();
        expect(host.textContent).toContain("<b>bold</b>");
    });
});

// ============================================================================
// SURFACE CONTRACT
// ============================================================================

describe("Annotation — Surface contract", () =>
{
    test("setData fills the label slot", () =>
    {
        makeOpen().setData("label", "Updated");

        expect(host.textContent).toContain("Updated");
    });

    test("setData ignores an unknown slot", () =>
    {
        const handle = make();

        expect(() => handle.setData("nope", 1)).not.toThrow();
    });

    test("getState returns only the declared keys", () =>
    {
        const keys = Object.keys(make().getState()).sort();

        expect(keys).toEqual(["color", "kind", "label"]);
    });

    test("getState is JSON-serialisable", () =>
    {
        const state = make({ label: "x" }).getState();

        expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    });

    test("setState round-trips a captured state", () =>
    {
        const handle = make({ label: "first", kind: "arrow" });
        const captured = handle.getState();

        handle.setData("label", "second");
        handle.setState(captured);

        expect(handle.getState()).toEqual(captured);
    });

    test("setState can change the kind and re-render", () =>
    {
        const handle = makeOpen({ kind: "callout" });

        handle.setState({ kind: "highlight" });

        expect(host.querySelector("rect")).toBeTruthy();
    });

    test("on returns a working unsubscribe", () =>
    {
        const seen: unknown[] = [];
        const handle = make();
        const off = handle.on("change", (v) => seen.push(v));

        handle.setData("label", "one");
        off();
        handle.setData("label", "two");

        expect(seen).toHaveLength(1);
    });

    test("fires the constructor callback FIRST, then subscribers", () =>
    {
        const order: string[] = [];

        annotation = createAnnotation(host.id, {
            onChange: () => order.push("legacy"),
        });
        annotation.on("change", () => order.push("channel"));

        annotation.setData("label", "x");

        expect(order).toEqual(["legacy", "channel"]);
    });
});

// ============================================================================
// ANCHORING
// ============================================================================

describe("Annotation — anchoring", () =>
{
    test("defaults to a canvas anchor", () =>
    {
        expect(make().getAnchor()).toEqual({ kind: "canvas" });
    });

    test("accepts an entity anchor", () =>
    {
        const handle = make({ anchor: { kind: "entity", entityId: "table:orders" } });

        expect(handle.getAnchor()).toEqual({
            kind: "entity", entityId: "table:orders",
        });
    });

    test("setAnchor emits on the anchor channel", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("anchor", (v) => seen.push(v));
        handle.setAnchor({ kind: "node", nodeId: "n1" });

        expect(seen).toEqual([{ kind: "node", nodeId: "n1" }]);
    });

    test("rejects an unrecognised anchor kind", () =>
    {
        const handle = make();

        expect(() => handle.setAnchor({ kind: "nowhere" } as never))
            .toThrow(/anchor/i);
    });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

describe("Annotation — accessibility", () =>
{
    test("exposes the label as an accessible name", () =>
    {
        makeOpen({ label: "Revenue spike" });

        const svg = host.querySelector("svg");

        expect(svg?.getAttribute("aria-label")).toContain("Revenue spike");
    });

    test("an unlabelled annotation is hidden from assistive tech", () =>
    {
        makeOpen({ kind: "highlight" });

        const svg = host.querySelector("svg");

        expect(svg?.getAttribute("aria-hidden")).toBe("true");
    });
});

// ============================================================================
// COLLAPSE AND EXPAND
// ============================================================================

describe("Annotation — collapse and expand", () =>
{
    test("starts collapsed", () =>
    {
        expect(make().isExpanded()).toBe(false);
    });

    test("the marker carries the label as its accessible name", () =>
    {
        make({ label: "Revenue spike" });

        const marker = host.querySelector(".annotation-marker");

        expect(marker?.getAttribute("aria-label")).toBe("Revenue spike");
        expect(marker?.getAttribute("title")).toBe("Revenue spike");
    });

    test("clicking the marker expands it", () =>
    {
        const handle = make({ label: "x" });

        (host.querySelector(".annotation-marker") as HTMLButtonElement).click();

        expect(handle.isExpanded()).toBe(true);
        expect(host.querySelector("svg")).toBeTruthy();
    });

    test("expanding emits on the toggle channel", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("toggle", (v) => seen.push(v));
        handle.setExpanded(true);

        expect(seen).toEqual([true]);
    });

    test("fires the constructor callback FIRST on toggle", () =>
    {
        const order: string[] = [];

        annotation = createAnnotation(host.id, {
            onToggle: () => order.push("legacy"),
        });
        annotation.on("toggle", () => order.push("channel"));
        annotation.setExpanded(true);

        expect(order).toEqual(["legacy", "channel"]);
    });

    test("setting the same state twice emits once", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("toggle", (v) => seen.push(v));
        handle.setExpanded(true);
        handle.setExpanded(true);

        expect(seen).toHaveLength(1);
    });

    test("collapsing returns it to a marker", () =>
    {
        const handle = makeOpen({ label: "x" });

        handle.setExpanded(false);

        expect(host.querySelector(".annotation-marker")).toBeTruthy();
        expect(host.querySelector("svg")).toBeNull();
    });

    test("state survives a collapse and re-expand", () =>
    {
        const handle = makeOpen({ label: "kept", kind: "arrow" });
        const captured = handle.getState();

        handle.setExpanded(false);
        handle.setExpanded(true);

        expect(handle.getState()).toEqual(captured);
    });

    test("a brief hover does NOT expand it", async () =>
    {
        const handle = make();

        host.querySelector(".annotation")!
            .dispatchEvent(new Event("pointerenter", { bubbles: true }));

        await new Promise((r) => setTimeout(r, 120));

        // Sweeping across twenty annotations must open none of them.
        expect(handle.isExpanded()).toBe(false);
    });

    test("a sustained hover expands it", async () =>
    {
        const handle = make();

        host.querySelector(".annotation")!
            .dispatchEvent(new Event("pointerenter", { bubbles: true }));

        await new Promise((r) => setTimeout(r, 520));

        expect(handle.isExpanded()).toBe(true);
    });

    test("leaving before the dwell cancels the expansion", async () =>
    {
        const handle = make();
        const root = host.querySelector(".annotation")!;

        root.dispatchEvent(new Event("pointerenter", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 100));
        root.dispatchEvent(new Event("pointerleave", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 450));

        expect(handle.isExpanded()).toBe(false);
    });

    test("expandOnHover false leaves click as the only route", async () =>
    {
        const handle = make({ expandOnHover: false });

        host.querySelector(".annotation")!
            .dispatchEvent(new Event("pointerenter", { bubbles: true }));

        await new Promise((r) => setTimeout(r, 520));

        expect(handle.isExpanded()).toBe(false);

        (host.querySelector(".annotation-marker") as HTMLButtonElement).click();
        expect(handle.isExpanded()).toBe(true);
    });
});
