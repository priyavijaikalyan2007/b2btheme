/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: CommentOverlay
 * Spec-based tests for the CommentOverlay positioned comment bubbles component.
 * Tests cover: factory function, options/defaults, DOM structure, ARIA,
 * handle methods (addPin/removePin/destroy), callbacks, keyboard, edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createCommentOverlay } from "./commentoverlay";
import type {
    CommentOverlayOptions,
    CommentPinData,
    MentionUser,
    CommentThread,
    CommentData,
    CommentOverlay,
} from "./commentoverlay";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

const testUser: MentionUser = {
    id: "user1",
    name: "Test User",
    email: "test@example.com",
};

function makeComment(id: string, text: string): CommentData
{
    return {
        id,
        author: testUser,
        text,
        createdAt: new Date().toISOString(),
        edited: false,
        mentions: [],
    };
}

function makeThread(id: string): CommentThread
{
    return {
        id,
        rootComment: makeComment(`${id}-root`, "Root comment"),
        replies: [],
        resolved: false,
    };
}

function makePin(id: string, anchor: HTMLElement): CommentPinData
{
    return {
        id,
        anchorElement: anchor,
        offsetX: 10,
        offsetY: 10,
        thread: makeThread(`thread-${id}`),
    };
}

function defaultOptions(overrides?: Partial<CommentOverlayOptions>): CommentOverlayOptions
{
    return {
        container,
        currentUser: testUser,
        ...overrides,
    };
}

function getOverlay(): HTMLElement | null
{
    return container.querySelector(".commentoverlay-container");
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "comment-container";
    container.style.position = "relative";
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

describe("createCommentOverlay", () =>
{
    test("withValidOptions_ReturnsOverlayInstance", () =>
    {
        const overlay = createCommentOverlay("comment-container", defaultOptions());
        expect(overlay).toBeDefined();
        expect(typeof overlay.addPin).toBe("function");
        expect(typeof overlay.destroy).toBe("function");
        overlay.destroy();
    });

    test("withValidOptions_CreatesOverlayElement", () =>
    {
        const overlay = createCommentOverlay("comment-container", defaultOptions());
        const el = getOverlay();
        expect(el).not.toBeNull();
        overlay.destroy();
    });

    // THE TITLE HAS THE CONTRACT BACKWARDS, and that is the fact
    // worth pinning. `createCommentOverlay` resolves `containerId`
    // and then OVERWRITES `options.container` with what it found, so
    // a container passed in the options is ignored whenever the
    // factory is used. Handing the two different elements is the
    // only way to say which one wins.
    test("withContainerInOptions_UsesTheNamedContainerInstead", () =>
    {
        const ignored = document.createElement("div");
        document.body.appendChild(ignored);

        const overlay = createCommentOverlay("comment-container",
            defaultOptions({ container: ignored }));

        expect(overlay.getElement().parentElement).toBe(container);
        expect(ignored.children).toHaveLength(0);

        overlay.destroy();
        ignored.remove();
    });
});

// ============================================================================
// OPTIONS & DEFAULTS
// ============================================================================

describe("CommentOverlay options", () =>
{
    // "Stores" is only a claim because the list is read back when
    // somebody types `@`. There is no getter, so the dropdown is
    // the observable: open a thread, type into its reply box, and
    // read the names that come up. Typing "@A" also shows the list
    // is FILTERED rather than merely held, which is the difference
    // between storing it and using it.
    test("withMentionUsers_StoresMentionList", () =>
    {
        const users: MentionUser[] = [
            { id: "u1", name: "Alice" },
            { id: "u2", name: "Bob" },
        ];
        const anchor = document.createElement("div");
        container.appendChild(anchor);
        const overlay = createCommentOverlay("comment-container", defaultOptions({
            mentionUsers: users,
            pins: [makePin("mention-pin", anchor)],
        }));

        overlay.openThread("mention-pin");
        const ta = document.querySelector("textarea")!;
        ta.value = "@A";
        ta.selectionStart = 2;
        ta.dispatchEvent(new Event("input", { bubbles: true }));

        expect([...document.querySelectorAll(
            ".commentoverlay-mention-dropdown .commentoverlay-mention-name")]
            .map((n) => n.textContent)).toEqual(["Alice"]);

        overlay.destroy();
    });

    test("withInitialPins_AddsAllPins", () =>
    {
        const anchor = document.createElement("div");
        container.appendChild(anchor);
        const pins: CommentPinData[] = [
            makePin("p1", anchor),
            makePin("p2", anchor),
        ];
        const overlay = createCommentOverlay("comment-container", defaultOptions({
            pins,
        }));
        const all = overlay.getAllPins();
        expect(all.length).toBe(2);
        overlay.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("CommentOverlay DOM structure", () =>
{
    test("creates_OverlayElementInContainer", () =>
    {
        const overlay = createCommentOverlay("comment-container", defaultOptions());
        expect(getOverlay()).not.toBeNull();
        overlay.destroy();
    });

    test("creates_SVGLayerForConnectors", () =>
    {
        const overlay = createCommentOverlay("comment-container", defaultOptions({
            showConnectors: true,
        }));
        const svg = container.querySelector("svg");
        expect(svg).not.toBeNull();
        overlay.destroy();
    });
});

// ============================================================================
// ARIA
// ============================================================================

describe("CommentOverlay ARIA", () =>
{
    test("overlay_HasLiveRegion", () =>
    {
        const overlay = createCommentOverlay("comment-container", defaultOptions());
        const live = container.querySelector("[aria-live]");
        expect(live).not.toBeNull();
        overlay.destroy();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("CommentOverlay handle methods", () =>
{
    test("addPin_IncreasesPinCount", () =>
    {
        const overlay = createCommentOverlay("comment-container", defaultOptions());
        const anchor = document.createElement("div");
        container.appendChild(anchor);
        overlay.addPin(makePin("new-pin", anchor));
        expect(overlay.getAllPins().length).toBe(1);
        overlay.destroy();
    });

    test("removePin_DecreasesPinCount", () =>
    {
        const anchor = document.createElement("div");
        container.appendChild(anchor);
        const overlay = createCommentOverlay("comment-container", defaultOptions({
            pins: [makePin("removable", anchor)],
        }));
        expect(overlay.getAllPins().length).toBe(1);
        overlay.removePin("removable");
        expect(overlay.getAllPins().length).toBe(0);
        overlay.destroy();
    });

    test("getAllPins_ReturnsEmptyArrayInitially", () =>
    {
        const overlay = createCommentOverlay("comment-container", defaultOptions());
        expect(overlay.getAllPins()).toEqual([]);
        overlay.destroy();
    });

    test("resolveThread_MarksThreadResolved", () =>
    {
        const anchor = document.createElement("div");
        container.appendChild(anchor);
        const pin = makePin("resolve-pin", anchor);
        const overlay = createCommentOverlay("comment-container", defaultOptions({
            pins: [pin],
        }));
        overlay.resolveThread(pin.thread.id, testUser);
        const pins = overlay.getAllPins();
        expect(pins[0].thread.resolved).toBe(true);
        overlay.destroy();
    });

    test("unresolveThread_MarksThreadUnresolved", () =>
    {
        const anchor = document.createElement("div");
        container.appendChild(anchor);
        const pin = makePin("unresolve-pin", anchor);
        pin.thread.resolved = true;
        const overlay = createCommentOverlay("comment-container", defaultOptions({
            pins: [pin],
        }));
        overlay.unresolveThread(pin.thread.id);
        const pins = overlay.getAllPins();
        expect(pins[0].thread.resolved).toBe(false);
        overlay.destroy();
    });

    test("destroy_CleansUpPins", () =>
    {
        const anchor = document.createElement("div");
        container.appendChild(anchor);
        const overlay = createCommentOverlay("comment-container", defaultOptions({
            pins: [makePin("cleanup-pin", anchor)],
        }));
        overlay.destroy();
        expect(getOverlay()).toBeNull();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("CommentOverlay callbacks", () =>
{
    test("onPinCreate_PinAddedSuccessfully", () =>
    {
        const onPinCreate = vi.fn();
        const overlay = createCommentOverlay("comment-container", defaultOptions({
            onPinCreate,
        }));
        const anchor = document.createElement("div");
        container.appendChild(anchor);
        const pin = makePin("callback-pin", anchor);
        overlay.addPin(pin);
        // onPinCreate is only fired during interactive placement, not on addPin
        // Verify the pin was added programmatically
        expect(overlay.getAllPins().length).toBe(1);
        expect(overlay.getAllPins()[0].id).toBe("callback-pin");
        overlay.destroy();
    });

    test("onPinDelete_PinRemovedSuccessfully", () =>
    {
        const onPinDelete = vi.fn();
        const anchor = document.createElement("div");
        container.appendChild(anchor);
        const overlay = createCommentOverlay("comment-container", defaultOptions({
            onPinDelete,
            pins: [makePin("deletable", anchor)],
        }));
        overlay.removePin("deletable");
        // onPinDelete is only fired via the UI dismiss button (handleDismiss),
        // not through the programmatic removePin API.
        // Verify the pin was removed programmatically.
        expect(overlay.getAllPins().length).toBe(0);
        overlay.destroy();
    });
});

// ============================================================================
// PLACEMENT MODE
// ============================================================================

describe("CommentOverlay placement mode", () =>
{
    test("enterPlacementMode_ActivatesMode", () =>
    {
        const overlay = createCommentOverlay("comment-container", defaultOptions());
        overlay.enterPlacementMode();
        const el = getOverlay();
        expect(el?.classList.contains("commentoverlay-placement-mode")).toBe(true);
        overlay.exitPlacementMode();
        overlay.destroy();
    });

    test("exitPlacementMode_DeactivatesMode", () =>
    {
        const overlay = createCommentOverlay("comment-container", defaultOptions());
        overlay.enterPlacementMode();
        overlay.exitPlacementMode();
        const el = getOverlay();
        expect(el?.classList.contains("commentoverlay-placement-mode")).toBe(false);
        overlay.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("CommentOverlay edge cases", () =>
{
    test("addDuplicatePin_DoesNotDuplicate", () =>
    {
        const anchor = document.createElement("div");
        container.appendChild(anchor);
        const pin = makePin("dup", anchor);
        const overlay = createCommentOverlay("comment-container", defaultOptions());
        overlay.addPin(pin);
        overlay.addPin(pin);
        expect(overlay.getAllPins().length).toBe(1);
        overlay.destroy();
    });

    test("removeNonexistentPin_DoesNotThrow", () =>
    {
        const overlay = createCommentOverlay("comment-container", defaultOptions());
        expect(() => overlay.removePin("doesnotexist")).not.toThrow();
        overlay.destroy();
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const overlay = createCommentOverlay("comment-container", defaultOptions());
        expect(() =>
        {
            overlay.destroy();
            overlay.destroy();
        }).not.toThrow();
    });
});
