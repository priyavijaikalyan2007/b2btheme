/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: ChatDock — the bottom-docked conversation surface for a dynamic UI.
 * Covers PRD §12.2 and plan Phase 12.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";

import { createChatDock, type ChatDockHandle } from "./chatdock";

// ============================================================================
// HARNESS
// ============================================================================

let host: HTMLDivElement;
let dock: ChatDockHandle | null = null;

const TURNS = [
    { id: "t1", role: "user", text: "show me the tables", revision: 1 },
    { id: "t2", role: "assistant", text: "Here are four tables.", revision: 1 },
    { id: "t3", role: "user", text: "details for orders", revision: 2 },
];

beforeEach(() =>
{
    host = document.createElement("div");
    host.id = `dock-host-${Math.random().toString(36).slice(2, 8)}`;
    document.body.appendChild(host);
});

afterEach(() =>
{
    dock?.destroy();
    dock = null;
    host.remove();
});

function make(options = {}): ChatDockHandle
{
    dock = createChatDock(host.id, options);
    return dock;
}

function input(): HTMLInputElement
{
    return host.querySelector(".chatdock-input") as HTMLInputElement;
}

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("ChatDock — lifecycle", () =>
{
    test("renders into the host", () =>
    {
        make();

        expect(host.querySelector(".chatdock")).toBeTruthy();
    });

    test("throws a literate error for a missing container", () =>
    {
        expect(() => createChatDock("no-such-host", {})).toThrow(/no-such-host/);
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

    test("uses the supplied placeholder", () =>
    {
        make({ placeholder: "Ask anything" });

        expect(input().placeholder).toBe("Ask anything");
    });
});

// ============================================================================
// SUBMISSION
// ============================================================================

describe("ChatDock — submission", () =>
{
    test("emits the utterance on submit", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("submit", (v) => seen.push(v));
        input().value = "show me the tables";
        handle.submit();

        expect(seen).toEqual(["show me the tables"]);
    });

    test("fires the constructor callback FIRST, then subscribers", () =>
    {
        const order: string[] = [];

        dock = createChatDock(host.id, { onSubmit: () => order.push("legacy") });
        dock.on("submit", () => order.push("channel"));

        input().value = "x";
        dock.submit();

        expect(order).toEqual(["legacy", "channel"]);
    });

    test("clears the input after submitting", () =>
    {
        const handle = make();

        input().value = "something";
        handle.submit();

        expect(input().value).toBe("");
    });

    test("ignores an empty submission", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("submit", (v) => seen.push(v));
        input().value = "   ";
        handle.submit();

        expect(seen).toHaveLength(0);
    });

    test("Enter submits", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("submit", (v) => seen.push(v));
        input().value = "typed";
        input().dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", bubbles: true,
        }));

        expect(seen).toEqual(["typed"]);
    });

    test("the send button submits", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("submit", (v) => seen.push(v));
        input().value = "clicked";
        (host.querySelector(".chatdock-send") as HTMLButtonElement).click();

        expect(seen).toEqual(["clicked"]);
    });

    test("a busy dock refuses submissions", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("submit", (v) => seen.push(v));
        handle.setBusy(true);
        input().value = "while busy";
        handle.submit();

        expect(seen).toHaveLength(0);
        expect(input().disabled).toBe(true);
    });
});

// ============================================================================
// TURNS AND HISTORY
// ============================================================================

describe("ChatDock — turns", () =>
{
    test("setData fills the turns slot", () =>
    {
        make().setData("turns", TURNS);

        expect(host.querySelectorAll(".chatdock-turn")).toHaveLength(3);
    });

    test("renders turn text with textContent, never as markup", () =>
    {
        make().setData("turns", [
            { id: "x", role: "user", text: "<img src=x onerror=alert(1)>" },
        ]);

        expect(host.querySelector("img")).toBeNull();
        expect(host.textContent).toContain("<img src=x onerror=alert(1)>");
    });

    test("distinguishes user and assistant turns", () =>
    {
        make().setData("turns", TURNS);

        expect(host.querySelectorAll(".chatdock-turn-user")).toHaveLength(2);
        expect(host.querySelectorAll(".chatdock-turn-assistant")).toHaveLength(1);
    });

    test("setData ignores an unknown slot", () =>
    {
        const handle = make();

        expect(() => handle.setData("nope", 1)).not.toThrow();
    });

    test("selecting a turn emits it, so the host can scrub the canvas", () =>
    {
        const seen: unknown[] = [];
        const handle = make();

        handle.on("selectTurn", (v) => seen.push(v));
        handle.setData("turns", TURNS);

        (host.querySelectorAll(".chatdock-turn")[2] as HTMLElement).click();

        expect(seen).toEqual([TURNS[2]]);
    });

    test("branching from a turn emits separately from selecting it", () =>
    {
        const selected: unknown[] = [];
        const branched: unknown[] = [];
        const handle = make();

        handle.on("selectTurn", (v) => selected.push(v));
        handle.on("branch", (v) => branched.push(v));
        handle.setData("turns", TURNS);

        (host.querySelector(".chatdock-branch") as HTMLButtonElement).click();

        expect(branched).toHaveLength(1);
        expect(selected).toHaveLength(0);
    });
});

// ============================================================================
// SURFACE CONTRACT
// ============================================================================

describe("ChatDock — Surface contract", () =>
{
    test("getState returns only the declared keys", () =>
    {
        const keys = Object.keys(make().getState()).sort();

        expect(keys).toEqual(["draft", "historyOpen"]);
    });

    test("getState is JSON-serialisable", () =>
    {
        const state = make().getState();

        expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    });

    test("state round-trips a draft the user was midway through", () =>
    {
        const handle = make();

        input().value = "half-written thought";
        input().dispatchEvent(new Event("input", { bubbles: true }));

        const captured = handle.getState();
        input().value = "";
        handle.setState(captured);

        expect(input().value).toBe("half-written thought");
    });

    test("on returns a working unsubscribe", () =>
    {
        const seen: unknown[] = [];
        const handle = make();
        const off = handle.on("submit", (v) => seen.push(v));

        input().value = "one";
        handle.submit();
        off();
        input().value = "two";
        handle.submit();

        expect(seen).toHaveLength(1);
    });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

describe("ChatDock — accessibility", () =>
{
    test("the transcript is a live region", () =>
    {
        make();

        const log = host.querySelector(".chatdock-turns");

        expect(log?.getAttribute("aria-live")).toBe("polite");
        expect(log?.getAttribute("role")).toBe("log");
    });

    test("the input is labelled", () =>
    {
        make();

        expect(input().getAttribute("aria-label")).toBeTruthy();
    });

    test("controls are real buttons", () =>
    {
        make().setData("turns", TURNS);

        const send = host.querySelector(".chatdock-send");

        expect(send?.tagName).toBe("BUTTON");
        expect(send?.getAttribute("type")).toBe("button");
    });
});
