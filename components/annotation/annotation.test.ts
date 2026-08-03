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
        make();

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
        make({ kind: "arrow" });

        expect(host.querySelector("line")).toBeTruthy();
    });

    test("renders a highlight with a rect", () =>
    {
        make({ kind: "highlight" });

        expect(host.querySelector("rect")).toBeTruthy();
    });

    test("renders a callout with text", () =>
    {
        make({ kind: "callout", label: "Look here" });

        expect(host.textContent).toContain("Look here");
    });

    test("falls back to callout for an unknown kind", () =>
    {
        expect(make({ kind: "hologram" }).getState().kind).toBe("callout");
    });

    test("label is set as text, never as markup", () =>
    {
        make({ label: "<b>bold</b>" });

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
        make().setData("label", "Updated");

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
        const handle = make({ kind: "callout" });

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
        make({ label: "Revenue spike" });

        const svg = host.querySelector("svg");

        expect(svg?.getAttribute("aria-label")).toContain("Revenue spike");
    });

    test("an unlabelled annotation is hidden from assistive tech", () =>
    {
        make({ kind: "highlight" });

        const svg = host.querySelector("svg");

        expect(svg?.getAttribute("aria-hidden")).toBe("true");
    });
});
