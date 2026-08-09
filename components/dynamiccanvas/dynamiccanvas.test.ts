/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DynamicCanvas — node chrome state.
 *
 * Regression cover for a bug the browser found: the pin handler closed over
 * the node captured when its frame was BUILT, so `!node.pinned` was always
 * true. A node could be pinned and never unpinned, and the icon never changed.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";

import { createDynamicCanvas } from "./dynamiccanvas";
import type { DynamicCanvasOptions } from "./dynamiccanvas";
import * as runtime from "../../runtime/src/registry";
import { createEmptyDocument } from "../../runtime/src/document";
import { packDocument } from "../../runtime/src/packer";
import { createWiringEngine } from "../../runtime/src/wiring";
import { createLifecycleManager } from "../../runtime/src/lifecycle";
import {
    applyPatch, fold,
} from "../../runtime/src/document";
import { createStickyNote } from "../stickynote/stickynote";
import { STICKYNOTE_MANIFEST } from "../stickynote/stickynote.manifest";
import { createAnnotation } from "../annotation/annotation";
import { ANNOTATION_MANIFEST } from "../annotation/annotation.manifest";

import type { CanvasPatch } from "../../runtime/src/types";

/*
 * The canvas declares its own structural patch type — it consumes the
 * runtime as a global, so it cannot import the real one (ADR-028). Read the
 * emitted shape off the callback rather than restating it here.
 */
type EmittedPatch = Parameters<NonNullable<DynamicCanvasOptions["onPatch"]>>[0];

let host: HTMLDivElement;

beforeEach(() =>
{
    runtime.clearRegistry();
    runtime.registerComponent(STICKYNOTE_MANIFEST);
    runtime.registerComponent(ANNOTATION_MANIFEST);

    // DynamicCanvas consumes the runtime as a global, exactly as in a browser.
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

function noteNode(id: string)
{
    return {
        id,
        component: "stickynote",
        placement: { kind: "intent" as const, region: "main" as const,
                     size: "compact" as const },
        options: { text: "hello" },
        source: null,
        state: {},
        anchor: { kind: "canvas" as const },
        provenance: { turnId: "t1", lastTouched: 1 },
        pinned: false,
        grants: [],
    };
}

function seed(): CanvasPatch
{
    return {
        turnId: "t1", revision: 1,
        ops: [{ op: "addNode", node: noteNode("n1") }],
    };
}

/** Clicks an element the way a user would, with client coordinates. */
function clickAt(el: Element, x: number, y: number): void
{
    el.dispatchEvent(new MouseEvent("click", {
        bubbles: true, cancelable: true, clientX: x, clientY: y,
    }));
}

describe("DynamicCanvas — click-to-place", () =>
{
    test("placement is disarmed until the host arms it", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {});
        canvas.apply(seed());

        expect(canvas.isPlacing()).toBe(false);

        // A click while disarmed must add nothing.
        clickAt(host.querySelector(".dyncanvas-body")!, 40, 40);
        expect(Object.keys(canvas.getDocument().nodes)).toEqual(["n1"]);

        canvas.destroy();
    });

    test("a click on a node anchors the placed component to that node", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {});
        canvas.apply(seed());

        canvas.startPlacement({ options: { label: "Check this" } });
        expect(canvas.isPlacing()).toBe(true);

        clickAt(host.querySelector(".dyncanvas-body")!, 40, 40);

        const nodes = canvas.getDocument().nodes;
        const placed = Object.values(nodes).find((n) => n.id !== "n1")!;

        expect(placed, "nothing was placed").toBeTruthy();
        expect(placed.component).toBe("annotation");
        expect(placed.anchor).toMatchObject({ kind: "node", nodeId: "n1" });
        expect(placed.options).toEqual({ label: "Check this" });

        // Placement is a one-shot gesture, not a mode that sticks.
        expect(canvas.isPlacing()).toBe(false);

        canvas.destroy();
    });

    test("a click on bare canvas records fixed coordinates", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {});
        canvas.apply(seed());

        canvas.startPlacement({});
        clickAt(host.querySelector(".dyncanvas")!, 120, 90);

        const placed = Object.values(canvas.getDocument().nodes)
            .find((n) => n.id !== "n1")!;

        expect(placed.anchor).toEqual({ kind: "canvas" });
        expect(placed.placement.kind).toBe("fixed");

        canvas.destroy();
    });

    test("the placement reaches the host as a patch it can persist", () =>
    {
        const seen: EmittedPatch[] = [];
        const canvas = createDynamicCanvas("canvas-host",
            { onPatch: (p) => seen.push(p) });

        canvas.apply(seed());
        canvas.startPlacement({});
        clickAt(host.querySelector(".dyncanvas-body")!, 40, 40);

        // Persisting is the app's job; producing something persistable is not.
        const ops = seen.flatMap((p) => p.ops).filter((o) => o.op === "addNode");

        expect(ops).toHaveLength(1);
        expect(JSON.parse(JSON.stringify(ops[0]))).toEqual(ops[0]);

        canvas.destroy();
    });

    test("onPlaced reports the id and anchor the click resolved to", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {});
        canvas.apply(seed());

        let reported: { id: string; anchor: Record<string, unknown> } | null = null;

        canvas.startPlacement({
            onPlaced: (id, anchor) => { reported = { id, anchor }; },
        });
        clickAt(host.querySelector(".dyncanvas-body")!, 40, 40);

        expect(reported).not.toBeNull();
        expect(canvas.getDocument().nodes[reported!.id]).toBeTruthy();

        canvas.destroy();
    });

    test("Escape disarms without placing anything", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {});
        canvas.apply(seed());

        canvas.startPlacement({});
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

        expect(canvas.isPlacing()).toBe(false);

        clickAt(host.querySelector(".dyncanvas-body")!, 40, 40);
        expect(Object.keys(canvas.getDocument().nodes)).toEqual(["n1"]);

        canvas.destroy();
    });

    test("cancelPlacement disarms", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {});

        canvas.startPlacement({});
        canvas.cancelPlacement();

        expect(canvas.isPlacing()).toBe(false);
        canvas.destroy();
    });

    test("an armed click does not reach the component underneath", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {});
        canvas.apply(seed());

        let reachedComponent = false;

        host.querySelector(".dyncanvas-body")!
            .addEventListener("click", () => { reachedComponent = true; });

        canvas.startPlacement({});
        clickAt(host.querySelector(".dyncanvas-body")!, 40, 40);

        // Clicking a grid row to annotate it must not also select that row.
        expect(reachedComponent).toBe(false);

        canvas.destroy();
    });

    test("a placed annotation restores from the patch log alone", () =>
    {
        const seen: EmittedPatch[] = [];
        const first = createDynamicCanvas("canvas-host",
            { onPatch: (p) => seen.push(p) });

        first.apply(seed());
        first.startPlacement({ options: { label: "Restored" } });
        clickAt(host.querySelector(".dyncanvas-body")!, 40, 40);

        const before = first.getDocument().nodes;
        first.destroy();

        // Everything the app stored: the seed patch plus what the canvas
        // emitted. Nothing else may be needed to reconstruct the scene.
        const second = createDynamicCanvas("canvas-host", {});
        second.load([seed(), ...seen]);

        expect(second.getDocument().nodes).toEqual(before);

        second.destroy();
    });
});

describe("DynamicCanvas — pin toggles both ways", () =>
{
    test("pinning then unpinning returns the node to unpinned", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {});
        canvas.apply(seed());

        const pin = host.querySelector(
            '[data-role="pin"]') as HTMLButtonElement;

        expect(pin, "pin control should exist").toBeTruthy();

        pin.click();
        expect(canvas.getDocument().nodes.n1.pinned).toBe(true);

        // The bug: the handler read a stale node, so this pinned again.
        host.querySelector<HTMLButtonElement>('[data-role="pin"]')!.click();
        expect(canvas.getDocument().nodes.n1.pinned).toBe(false);

        canvas.destroy();
    });

    test("the pinned class follows the node state", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {});
        canvas.apply(seed());

        const pin = () => host.querySelector<HTMLButtonElement>(
            '[data-role="pin"]')!;
        const frame = () => host.querySelector(".dyncanvas-frame")!;

        pin().click();
        expect(frame().classList.contains("dyncanvas-frame-pinned")).toBe(true);

        pin().click();
        expect(frame().classList.contains("dyncanvas-frame-pinned")).toBe(false);

        canvas.destroy();
    });

    test("the pin icon follows the node state", () =>
    {
        const canvas = createDynamicCanvas("canvas-host", {});
        canvas.apply(seed());

        const icon = () => host.querySelector('[data-role="pin"] i')!;
        const pin = () => host.querySelector<HTMLButtonElement>(
            '[data-role="pin"]')!;

        expect(icon().className).toBe("bi-pin");

        pin().click();
        expect(icon().className).toBe("bi-pin-fill");

        pin().click();
        expect(icon().className).toBe("bi-pin");

        canvas.destroy();
    });
});
