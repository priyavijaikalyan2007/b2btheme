/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: WorkspaceShell — chrome for the workspace tier: canvas tabs, pins,
 * and the history scrubber. Covers PRD §12.1 and plan Phase 12.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";

import { createWorkspaceShell, type WorkspaceShellHandle } from "./workspaceshell";

// ============================================================================
// HARNESS
// ============================================================================

let host: HTMLDivElement;
let shell: WorkspaceShellHandle | null = null;

const CANVASES = [
    { id: "c1", title: "Project status", pinned: true },
    { id: "c2", title: "Action items", pinned: false },
    { id: "c3", title: "Decisions", pinned: false },
];

beforeEach(() =>
{
    host = document.createElement("div");
    host.id = `shell-host-${Math.random().toString(36).slice(2, 8)}`;
    document.body.appendChild(host);
});

afterEach(() =>
{
    shell?.destroy();
    shell = null;
    host.remove();
});

function make(options = {}): WorkspaceShellHandle
{
    shell = createWorkspaceShell(host.id, options);
    return shell;
}

function tabs(): HTMLElement[]
{
    return Array.from(host.querySelectorAll(".workspaceshell-tab"));
}

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("WorkspaceShell — lifecycle", () =>
{
    test("renders into the host", () =>
    {
        make();

        expect(host.querySelector(".workspaceshell")).toBeTruthy();
    });

    test("throws a literate error for a missing container", () =>
    {
        expect(() => createWorkspaceShell("no-such-host", {}))
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

    test("exposes a content region for the canvas to mount into", () =>
    {
        const handle = make();

        expect(handle.getContentElement()).toBeTruthy();
        expect(handle.getContentElement()!.id).toBeTruthy();
    });
});

// ============================================================================
// CANVAS TABS
// ============================================================================

describe("WorkspaceShell — canvas tabs", () =>
{
    test("setData fills the canvases slot", () =>
    {
        make().setData("canvases", CANVASES);

        expect(tabs()).toHaveLength(3);
    });

    test("renders titles with textContent, never as markup", () =>
    {
        make().setData("canvases", [
            { id: "x", title: "<img src=x onerror=alert(1)>" },
        ]);

        expect(host.querySelector("img")).toBeNull();
        expect(host.textContent).toContain("<img src=x onerror=alert(1)>");
    });

    test("pinned canvases sort before unpinned ones", () =>
    {
        make().setData("canvases", [
            { id: "a", title: "Plain", pinned: false },
            { id: "b", title: "Pinned", pinned: true },
        ]);

        expect(tabs()[0].textContent).toContain("Pinned");
    });

    test("marks the active canvas", () =>
    {
        const handle = make({ activeCanvasId: "c2" });

        handle.setData("canvases", CANVASES);

        const active = host.querySelector(".workspaceshell-tab-active");

        expect(active?.textContent).toContain("Action items");
    });

    test("selecting a tab emits it", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("selectCanvas", (v) => seen.push(v));
        handle.setData("canvases", CANVASES);
        tabs()[1].click();

        expect(seen).toHaveLength(1);
    });

    test("selecting a tab makes it active", () =>
    {
        const handle = make();

        handle.setData("canvases", CANVASES);
        tabs()[2].click();

        expect(handle.getActiveCanvasId()).toBe(tabs()[2].getAttribute("data-canvas-id"));
    });

    test("pin toggles emit separately from selection", () =>
    {
        const selected: unknown[] = [];
        const pinned: unknown[] = [];
        const handle = make();

        handle.on("selectCanvas", (v) => selected.push(v));
        handle.on("pinCanvas", (v) => pinned.push(v));
        handle.setData("canvases", CANVASES);

        (host.querySelector(".workspaceshell-pin") as HTMLButtonElement).click();

        expect(pinned).toHaveLength(1);
        expect(selected).toHaveLength(0);
    });

    test("closing a canvas emits separately", () =>
    {
        const closed: unknown[] = [];
        const handle = make();

        handle.on("closeCanvas", (v) => closed.push(v));
        handle.setData("canvases", CANVASES);

        (host.querySelector(".workspaceshell-close") as HTMLButtonElement).click();

        expect(closed).toHaveLength(1);
    });

    test("the new-canvas control emits", () =>
    {
        const created: unknown[] = [];
        const handle = make();

        handle.on("newCanvas", (v) => created.push(v));
        (host.querySelector(".workspaceshell-new") as HTMLButtonElement).click();

        expect(created).toHaveLength(1);
    });
});

// ============================================================================
// HISTORY SCRUBBER
// ============================================================================

describe("WorkspaceShell — history", () =>
{
    test("hidden until a revision range is supplied", () =>
    {
        make();

        expect(host.querySelector(".workspaceshell-scrubber")).toBeNull();
    });

    test("appears once the host reports a revision range", () =>
    {
        make().setRevisionRange(0, 12);

        expect(host.querySelector(".workspaceshell-scrubber")).toBeTruthy();
    });

    test("scrubbing emits the requested revision", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("scrub", (v) => seen.push(v));
        handle.setRevisionRange(0, 12);

        const slider = host.querySelector(
            ".workspaceshell-scrubber input") as HTMLInputElement;
        slider.value = "7";
        slider.dispatchEvent(new Event("input", { bubbles: true }));

        expect(seen).toEqual([7]);
    });

    test("the scrubber is labelled", () =>
    {
        make().setRevisionRange(0, 5);

        const slider = host.querySelector(".workspaceshell-scrubber input");

        expect(slider?.getAttribute("aria-label")).toBeTruthy();
    });
});

// ============================================================================
// SURFACE CONTRACT
// ============================================================================

describe("WorkspaceShell — Surface contract", () =>
{
    test("getState returns only the declared keys", () =>
    {
        const keys = Object.keys(make().getState()).sort();

        expect(keys).toEqual(["activeCanvasId", "revision"]);
    });

    test("getState is JSON-serialisable", () =>
    {
        const state = make().getState();

        expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    });

    test("state round-trips the active canvas", () =>
    {
        const handle = make();

        handle.setData("canvases", CANVASES);
        tabs()[2].click();

        const captured = handle.getState();
        tabs()[0].click();
        handle.setState(captured);

        expect(handle.getState()).toEqual(captured);
    });

    test("fires the constructor callback FIRST, then subscribers", () =>
    {
        const order: string[] = [];

        shell = createWorkspaceShell(host.id, {
            onSelectCanvas: () => order.push("legacy"),
        });
        shell.on("selectCanvas", () => order.push("channel"));
        shell.setData("canvases", CANVASES);

        tabs()[0].click();

        expect(order).toEqual(["legacy", "channel"]);
    });

    test("on returns a working unsubscribe", () =>
    {
        const seen: unknown[] = [];
        const handle = make();
        const off = handle.on("newCanvas", (v) => seen.push(v));

        (host.querySelector(".workspaceshell-new") as HTMLButtonElement).click();
        off();
        (host.querySelector(".workspaceshell-new") as HTMLButtonElement).click();

        expect(seen).toHaveLength(1);
    });
});
