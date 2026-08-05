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

import type { CanvasPatch } from "../../runtime/src/types";

let host: HTMLDivElement;

beforeEach(() =>
{
    runtime.clearRegistry();
    runtime.registerComponent(STICKYNOTE_MANIFEST);

    // DynamicCanvas consumes the runtime as a global, exactly as in a browser.
    (window as unknown as Record<string, unknown>).EnterpriseRuntime = {
        createEmptyDocument, applyPatch, fold, packDocument,
        getManifest: runtime.getManifest,
        lookupFactory: runtime.lookupFactory,
        createWiringEngine, createLifecycleManager,
    };
    (window as unknown as Record<string, unknown>).createStickyNote =
        createStickyNote;

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
