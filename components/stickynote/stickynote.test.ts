/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: StickyNote — a first-class canvas citizen built only against the
 * public Surface contract, as the proof that the contract is sufficient for a
 * component written after it (plan Phase 13, PRD §15.1).
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";

import { createStickyNote, type StickyNoteHandle } from "./stickynote";

// ============================================================================
// HARNESS
// ============================================================================

let host: HTMLDivElement;
let note: StickyNoteHandle | null = null;

beforeEach(() =>
{
    host = document.createElement("div");
    host.id = `sticky-host-${Math.random().toString(36).slice(2, 8)}`;
    document.body.appendChild(host);
});

afterEach(() =>
{
    note?.destroy();
    note = null;
    host.remove();
});

function make(options = {}): StickyNoteHandle
{
    note = createStickyNote(host.id, options);
    return note;
}

function textarea(): HTMLTextAreaElement
{
    return host.querySelector("textarea") as HTMLTextAreaElement;
}

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("StickyNote — lifecycle", () =>
{
    test("renders into the host", () =>
    {
        make();

        expect(host.querySelector(".stickynote")).toBeTruthy();
    });

    test("throws a literate error for a missing container", () =>
    {
        expect(() => createStickyNote("no-such-host", {}))
            .toThrow(/no-such-host/);
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

    test("seeds initial text from options", () =>
    {
        make({ text: "Remember this" });

        expect(textarea().value).toBe("Remember this");
    });

    test("renders text with textContent, never as markup", () =>
    {
        make({ text: "<img src=x onerror=alert(1)>" });

        expect(host.querySelector("img")).toBeNull();
        expect(textarea().value).toBe("<img src=x onerror=alert(1)>");
    });
});

// ============================================================================
// SURFACE CONTRACT
// ============================================================================

describe("StickyNote — Surface contract", () =>
{
    test("setData fills the text slot", () =>
    {
        make().setData("text", "From a binding");

        expect(textarea().value).toBe("From a binding");
    });

    test("setData ignores an unknown slot without throwing", () =>
    {
        const handle = make();

        expect(() => handle.setData("nope", 1)).not.toThrow();
    });

    test("setData coerces a non-string payload to text", () =>
    {
        make().setData("text", 42);

        expect(textarea().value).toBe("42");
    });

    test("getState returns only the declared keys", () =>
    {
        const state = make({ text: "x" }).getState();

        expect(Object.keys(state).sort()).toEqual(["collapsed", "color", "text"]);
    });

    test("getState is JSON-serialisable", () =>
    {
        const state = make({ text: "x" }).getState();

        expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    });

    test("setState restores a captured state", () =>
    {
        const handle = make({ text: "first" });
        const captured = handle.getState();

        handle.setData("text", "second");
        handle.setState(captured);

        expect(handle.getState()).toEqual(captured);
    });

    test("setState accepts a partial state", () =>
    {
        const handle = make({ text: "keep" });

        handle.setState({ color: "blue" });

        expect(handle.getState().text).toBe("keep");
        expect(handle.getState().color).toBe("blue");
    });

    test("on returns a working unsubscribe", () =>
    {
        const seen: unknown[] = [];
        const handle = make();
        const off = handle.on("change", (v) => seen.push(v));

        handle.setData("text", "one");
        off();
        handle.setData("text", "two");

        expect(seen).toHaveLength(1);
    });

    test("unsubscribing twice is harmless", () =>
    {
        const handle = make();
        const off = handle.on("change", () => undefined);

        off();

        expect(() => off()).not.toThrow();
    });

    test("one throwing handler does not starve the others", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("change", () => { throw new Error("boom"); });
        handle.on("change", (v) => seen.push(v));

        handle.setData("text", "delivered");

        expect(seen).toHaveLength(1);
    });
});

// ============================================================================
// CHANGE NOTIFICATION
// ============================================================================

describe("StickyNote — change channel", () =>
{
    test("fires the constructor callback FIRST, then subscribers", () =>
    {
        const order: string[] = [];

        note = createStickyNote(host.id, {
            onChange: () => order.push("legacy"),
        });
        note.on("change", () => order.push("channel"));

        note.setData("text", "x");

        expect(order).toEqual(["legacy", "channel"]);
    });

    test("emits the current text", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("change", (v) => seen.push(v));
        handle.setData("text", "hello");

        expect(seen).toEqual(["hello"]);
    });

    test("typing in the textarea emits on the channel", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("change", (v) => seen.push(v));

        const area = textarea();
        area.value = "typed";
        area.dispatchEvent(new Event("input", { bubbles: true }));

        expect(seen).toEqual(["typed"]);
    });
});

// ============================================================================
// ANCHORING
// ============================================================================

describe("StickyNote — anchoring", () =>
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

    test("accepts a node anchor", () =>
    {
        const handle = make({ anchor: { kind: "node", nodeId: "n1" } });

        expect(handle.getAnchor()).toEqual({ kind: "node", nodeId: "n1" });
    });

    test("setAnchor emits on the anchor channel", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("anchor", (v) => seen.push(v));
        handle.setAnchor({ kind: "entity", entityId: "table:orders" });

        expect(seen).toEqual([{ kind: "entity", entityId: "table:orders" }]);
    });

    test("rejects an unrecognised anchor kind", () =>
    {
        const handle = make();

        expect(() => handle.setAnchor(
            { kind: "elsewhere" } as never)).toThrow(/anchor/i);
    });
});

// ============================================================================
// PRESENTATION
// ============================================================================

describe("StickyNote — presentation", () =>
{
    test("applies a colour class from the palette", () =>
    {
        make({ color: "blue" });

        expect(host.querySelector(".stickynote-blue")).toBeTruthy();
    });

    test("falls back to the default colour for an unknown value", () =>
    {
        make({ color: "chartreuse" });

        expect(host.querySelector(".stickynote-yellow")).toBeTruthy();
    });

    test("collapse hides the body but keeps the note mounted", () =>
    {
        const handle = make({ text: "x" });

        handle.setState({ collapsed: true });

        expect(host.querySelector(".stickynote")).toBeTruthy();
        expect(host.querySelector(".stickynote-collapsed")).toBeTruthy();
    });

    test("read-only notes render a non-editable textarea", () =>
    {
        make({ readOnly: true, text: "fixed" });

        expect(textarea().readOnly).toBe(true);
    });

    test("exposes an accessible label", () =>
    {
        make();

        expect(textarea().getAttribute("aria-label")).toBeTruthy();
    });
});
