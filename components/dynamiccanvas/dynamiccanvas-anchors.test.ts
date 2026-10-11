/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 6ae3c287-ba02-49d1-857f-b36977b1ad85
 */
/**
 * ⚓ TESTS: DynamicCanvas content anchors (ADR-161)
 *
 * These tests cover the STATE MACHINE around the host's anchor resolver: how
 * often it is called, what is remembered between calls, and when an anchored
 * node is marked orphaned. They do not assert pixel positions. jsdom reports
 * every bounding rectangle as zero, so a position assertion here would pass
 * against any arithmetic at all, including none. The geometry is measured in
 * `tests/dynamic-ui.spec.ts`, in a real browser (insight 6.45).
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

import { createDynamicCanvas } from "./dynamiccanvas";
import * as runtime from "../../runtime/src/registry";
import {
    applyPatch, createEmptyDocument, fold,
} from "../../runtime/src/document";
import { packDocument } from "../../runtime/src/packer";
import { createWiringEngine } from "../../runtime/src/wiring";
import { createLifecycleManager } from "../../runtime/src/lifecycle";
import { createStickyNote } from "../stickynote/stickynote";
import { STICKYNOTE_MANIFEST } from "../stickynote/stickynote.manifest";
import { createAnnotation } from "../annotation/annotation";
import { ANNOTATION_MANIFEST } from "../annotation/annotation.manifest";

import type { CanvasPatch } from "../../runtime/src/types";

const ORPHANED = "dyncanvas-overlay-orphaned";

let host: HTMLDivElement;

beforeEach(() =>
{
    runtime.clearRegistry();
    runtime.registerComponent(STICKYNOTE_MANIFEST);
    runtime.registerComponent(ANNOTATION_MANIFEST);

    (window as unknown as Record<string, unknown>).EnterpriseRuntime = {
        createEmptyDocument, applyPatch, fold, packDocument,
        getManifest: runtime.getManifest,
        lookupFactory: runtime.lookupFactory,
        createWiringEngine, createLifecycleManager,
    };
    (window as unknown as Record<string, unknown>).createStickyNote =
        createStickyNote;
    (window as unknown as Record<string, unknown>).createAnnotation =
        createAnnotation;

    host = document.createElement("div");
    host.id = "canvas-host";
    document.body.appendChild(host);
});

afterEach(() =>
{
    host.remove();
});

/** The content-bearing node a comment is attached to. */
function contentNode(id: string)
{
    return {
        id,
        component: "stickynote",
        placement: { kind: "intent" as const, region: "main" as const,
                     size: "compact" as const },
        options: { text: "the paragraph being discussed" },
        source: null,
        state: {},
        anchor: { kind: "canvas" as const },
        provenance: { turnId: "t1", lastTouched: 1 },
        pinned: false,
        grants: [],
    };
}

/** A comment attached to content rather than to a coordinate. */
function commentNode(id: string, entityId: string, selector?: unknown)
{
    return {
        id,
        component: "annotation",
        placement: { kind: "intent" as const, region: "main" as const,
                     size: "compact" as const },
        options: { label: "Check this" },
        source: null,
        state: {},
        anchor: selector === undefined
            ? { kind: "entity" as const, entityId }
            : { kind: "entity" as const, entityId, selector },
        provenance: { turnId: "t1", lastTouched: 1 },
        pinned: false,
        grants: [],
    };
}

function seed(selector?: unknown): CanvasPatch
{
    return {
        turnId: "t1", revision: 1,
        ops: [
            { op: "addNode", node: contentNode("grid") },
            { op: "addNode", node: commentNode("c1", "row-4823", selector) },
        ],
    };
}

/** The element inside the content node that the host would resolve to. */
function contentElement(): HTMLElement
{
    const body = host.querySelector(
        "[data-node-id='grid'] .dyncanvas-body") as HTMLElement;

    expect(body, "the content node did not mount").toBeTruthy();

    const row = document.createElement("div");

    row.textContent = "row 4823";
    body.appendChild(row);

    return row;
}

function frameOf(nodeId: string): HTMLElement
{
    return host.querySelector(`[data-node-id='${nodeId}']`) as HTMLElement;
}

describe("DynamicCanvas — the host resolves content anchors", () =>
{
    test("the resolver receives the anchor and the ANCHORED node's id", () =>
    {
        const resolver = vi.fn(() => null);
        const canvas = createDynamicCanvas(
            "canvas-host", { onResolveAnchor: resolver });

        canvas.apply(seed({ quote: "row 4823" }));

        expect(resolver).toHaveBeenCalled();

        const [anchor, nodeId] = resolver.mock.calls[0] as unknown as [
            Record<string, unknown>, string];

        // The id is the comment's, not the content's: a content anchor names
        // no target node, which is the whole reason the host must search.
        expect(nodeId).toBe("c1");
        expect(anchor).toMatchObject({
            kind: "entity",
            entityId: "row-4823",
            selector: { quote: "row 4823" },
        });

        canvas.destroy();
    });

    test("a resolved element is re-measured without asking the host again",
        () =>
        {
            let row: HTMLElement | null = null;
            const resolver = vi.fn(() => row);
            const canvas = createDynamicCanvas(
                "canvas-host", { onResolveAnchor: resolver });

            canvas.apply(seed());
            row = contentElement();

            // Second render: the host answers for the first time.
            canvas.apply({ turnId: "t2", revision: 2, ops: [] });

            const afterResolve = resolver.mock.calls.length;

            expect(afterResolve).toBeGreaterThan(0);
            expect(frameOf("c1").classList.contains(ORPHANED)).toBe(false);

            // A later render must reuse the element it already has. Without
            // this assertion the cache is untested: the refinement pass does
            // not resolve at all, so a scroll proves nothing about it.
            canvas.apply({ turnId: "t3", revision: 3, ops: [] });
            canvas.apply({ turnId: "t4", revision: 4, ops: [] });

            expect(resolver.mock.calls.length).toBe(afterResolve);

            // Scrolling refines overlay positions and must never resolve,
            // because a host resolver is a DOM query and one per frame is the
            // jank the refinement pass exists to avoid.
            const body = host.querySelector(
                "[data-node-id='grid'] .dyncanvas-body") as HTMLElement;

            body.dispatchEvent(new Event("scroll", { bubbles: true }));
            body.dispatchEvent(new Event("scroll", { bubbles: true }));

            expect(resolver.mock.calls.length).toBe(afterResolve);

            canvas.destroy();
        });

    test("content the host cannot find marks the note orphaned, and the note "
        + "stays in the document", () =>
    {
        const canvas = createDynamicCanvas(
            "canvas-host", { onResolveAnchor: () => null });

        canvas.apply(seed());

        const frame = frameOf("c1");

        expect(frame.classList.contains(ORPHANED)).toBe(true);

        // Orphaned and hidden are exclusive: hiding an orphan would discard
        // the one thing the state exists to say.
        expect(frame.classList.contains("dyncanvas-overlay-hidden")).toBe(false);
        expect(frame.getAttribute("data-anchor-state")).toBe("orphaned");

        // The state is not carried by colour alone (WCAG 1.4.1): there is a
        // real element for the description the frame points at.
        const noteId = frame.getAttribute("aria-describedby");

        expect(noteId).toBe("c1-orphaned");
        expect(frame.querySelector(`#${noteId}`)?.textContent)
            .toContain("cannot be found");

        // Three channels, not one: outline, glyph and sentence. The glyph is
        // an element with a Bootstrap Icons class, so the icon set owns the
        // codepoint rather than this stylesheet.
        expect(frame.querySelector(".dyncanvas-orphan-glyph")?.className)
            .toContain("bi-exclamation-triangle");

        // The decision this implements: a comment is never lost because the
        // data it discussed was deleted.
        expect(canvas.getDocument().nodes.c1).toBeTruthy();

        canvas.destroy();
    });

    test("no resolver configured is orphaned rather than an error", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {});

        expect(() => canvas.apply(seed())).not.toThrow();
        expect(frameOf("c1").classList.contains(ORPHANED)).toBe(true);
        expect(canvas.getDocument().nodes.c1).toBeTruthy();

        canvas.destroy();
    });

    test("a resolver that throws orphans the note instead of failing the "
        + "render", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {
            onResolveAnchor: () =>
            {
                throw new Error("host blew up");
            },
        });

        expect(() => canvas.apply(seed())).not.toThrow();
        expect(frameOf("c1").classList.contains(ORPHANED)).toBe(true);
        expect(frameOf("grid"), "the rest of the canvas still rendered")
            .toBeTruthy();

        canvas.destroy();
    });

    test("an element outside this canvas's frames is refused", () =>
    {
        const stray = document.createElement("div");

        document.body.appendChild(stray);

        const canvas = createDynamicCanvas(
            "canvas-host", { onResolveAnchor: () => stray });

        canvas.apply(seed());

        // Positioning against a frame that does not own the element would put
        // the note at a rectangle it has no relationship to.
        expect(frameOf("c1").classList.contains(ORPHANED)).toBe(true);

        canvas.destroy();
        stray.remove();
    });

    test("an element inside the anchored node's OWN frame is refused", () =>
    {
        // A regular component, not an overlay: an overlay's container carries
        // `dyncanvas-overlay` and never `dyncanvas-frame`, so an element
        // inside one is already unreachable as a content host. A content
        // anchor on a normal node is the case this rule exists for.
        let own: HTMLElement | null = null;
        const canvas = createDynamicCanvas(
            "canvas-host", { onResolveAnchor: () => own });

        canvas.apply({
            turnId: "t1", revision: 1,
            ops: [{
                op: "addNode",
                node: {
                    ...contentNode("self"),
                    anchor: { kind: "entity" as const, entityId: "row-1" },
                },
            }],
        });

        own = host.querySelector(
            "[data-node-id='self'] .dyncanvas-body") as HTMLElement;
        canvas.apply({ turnId: "t2", revision: 2, ops: [] });

        // Without this, the refusal below is untested: an unmounted node is
        // refused for being unmounted, whatever the own-frame rule says.
        expect(canvas.getMountedIds()).toContain("self");

        // Positioning a node against its own rectangle is a feedback loop,
        // not an anchor.
        expect(frameOf("self").classList.contains(ORPHANED)).toBe(true);

        canvas.destroy();
    });

    test("an element inside ANOTHER canvas's frame is refused", () =>
    {
        const other = document.createElement("div");

        other.id = "canvas-host-2";
        document.body.appendChild(other);

        const second = createDynamicCanvas("canvas-host-2", {});

        second.apply(seed());

        // Both canvases hold a node called "grid", and both frames carry the
        // same class. Matching on the class alone would position this note
        // against the OTHER canvas's content, using this canvas's rectangle.
        const strangerFrame = other.querySelector(
            "[data-node-id='grid'] .dyncanvas-body") as HTMLElement;

        expect(strangerFrame).toBeTruthy();

        const canvas = createDynamicCanvas(
            "canvas-host", { onResolveAnchor: () => strangerFrame });

        canvas.apply(seed());

        // Without this, matching on the class alone would be refused for the
        // wrong reason: an unmounted local "grid" is refused anyway.
        expect(canvas.getMountedIds()).toContain("grid");
        expect(frameOf("c1").classList.contains(ORPHANED)).toBe(true);

        canvas.destroy();
        second.destroy();
        other.remove();
    });

    test("the orphaned mark clears when the content comes back", () =>
    {
        let row: HTMLElement | null = null;
        const canvas = createDynamicCanvas(
            "canvas-host", { onResolveAnchor: () => row });

        canvas.apply(seed());
        expect(frameOf("c1").classList.contains(ORPHANED)).toBe(true);

        // The host finds it on a later pass. An orphan is a statement about
        // now, not a verdict.
        row = contentElement();
        canvas.apply({ turnId: "t2", revision: 2, ops: [] });

        const frame = frameOf("c1");

        expect(frame.classList.contains(ORPHANED)).toBe(false);
        expect(frame.hasAttribute("data-anchor-state")).toBe(false);
        expect(frame.hasAttribute("aria-describedby")).toBe(false);
        expect(frame.querySelector("#c1-orphaned")).toBeNull();
        expect(frame.querySelector(".dyncanvas-orphan-glyph")).toBeNull();

        canvas.destroy();
    });

    test("a note is NOT orphaned when the component holding its content is "
        + "merely not mounted", () =>
    {
        let row: HTMLElement | null = null;
        const resolver = vi.fn(() => row);
        const canvas = createDynamicCanvas(
            "canvas-host", { onResolveAnchor: resolver });

        canvas.apply(seed());
        row = contentElement();
        canvas.apply({ turnId: "t2", revision: 2, ops: [] });

        expect(frameOf("c1").classList.contains(ORPHANED)).toBe(false);

        // Without this, the pan below proves nothing: a node that was never
        // mounted is trivially not mounted afterwards.
        expect(canvas.getMountedIds()).toContain("grid");

        const settled = resolver.mock.calls.length;

        // Panning away demotes the content node, which destroys the component
        // and with it the resolved element. Nothing was deleted.
        canvas.panBy(-5000, -5000);

        expect(canvas.getMountedIds(), "the content node is still mounted")
            .not.toContain("grid");

        // The resolver is not asked, because its answer could only be null
        // for a reason that has nothing to do with the content. Asking and
        // believing the answer is how every comment on a grid turns orphaned
        // the moment a user pans away.
        expect(resolver.mock.calls.length).toBe(settled);
        expect(frameOf("c1").classList.contains(ORPHANED)).toBe(false);

        canvas.destroy();
    });

    test("a disconnected element re-asks the host", () =>
    {
        let row: HTMLElement | null = null;
        const resolver = vi.fn(() => row);
        const canvas = createDynamicCanvas(
            "canvas-host", { onResolveAnchor: resolver });

        canvas.apply(seed());
        row = contentElement();
        canvas.apply({ turnId: "t2", revision: 2, ops: [] });

        const settled = resolver.mock.calls.length;

        // The row is deleted from the component's DOM, which is what happens
        // when the underlying record goes away while the grid stays mounted.
        row.remove();
        canvas.apply({ turnId: "t3", revision: 3, ops: [] });

        expect(resolver.mock.calls.length).toBeGreaterThan(settled);
        expect(frameOf("c1").classList.contains(ORPHANED)).toBe(true);

        canvas.destroy();
    });
});
