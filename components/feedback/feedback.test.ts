/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 *
 * ⚓ TESTS: Feedback
 * One call per rating in both commit modes, locking and reset, honest saving
 * (busy, lock on resolve, error and kept input on reject), the comment panel,
 * stars by keyboard, the summary, Copy, state, and option checks.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createFeedback, showFeedbackDialog } from "./feedback";
import type { FeedbackData, FeedbackHandle, FeedbackOptions } from "./feedback";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;
let handle: FeedbackHandle | null;

/** A save the test settles by hand. */
function deferredSave()
{
    const calls: { targetId: string; feedback: FeedbackData }[] = [];
    let settle: { resolve: () => void; reject: (e: Error) => void } | null = null;
    const onFeedback = vi.fn((targetId: string, feedback: FeedbackData) =>
    {
        calls.push({ targetId, feedback });
        return new Promise<void>((resolve, reject) => { settle = { resolve, reject }; });
    });

    return {
        calls,
        onFeedback,
        resolve: async () => { settle!.resolve(); await Promise.resolve(); await Promise.resolve(); },
        reject: async (msg: string) => { settle!.reject(new Error(msg)); await Promise.resolve(); await Promise.resolve(); },
    };
}

function make(overrides: Partial<FeedbackOptions> = {}): FeedbackHandle
{
    handle = createFeedback({ container, targetId: "gen-1", onFeedback: () => Promise.resolve(), showReport: false,
        ...overrides });
    return handle;
}

const q = <T extends HTMLElement = HTMLButtonElement>(sel: string) => container.querySelector<T>(sel)!;
const qa = (sel: string) => [...container.querySelectorAll<HTMLButtonElement>(sel)];

beforeEach(() =>
{
    container = document.createElement("div");
    document.body.appendChild(container);
    handle = null;
});

afterEach(() =>
{
    handle?.destroy();
    container.remove();
    delete (window as { createFormDialog?: unknown }).createFormDialog;
    vi.useRealTimers();
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("options", () =>
{
    test("targetId, and exactly one of onFeedback and onSave, are required", () =>
    {
        expect(() => createFeedback({ container, targetId: "", onFeedback: () => Promise.resolve() }))
            .toThrow(/targetId is required/);
        expect(() => createFeedback({ container, targetId: "t", showReport: false })).toThrow(/neither was given/);
        expect(() => createFeedback({ container, targetId: "t", showReport: false, onFeedback: () => Promise.resolve(),
            onSave: () => Promise.resolve() })).toThrow(/both were given/);
    });

    test("a scale, max, commit or initial rating it cannot honour throws", () =>
    {
        expect(() => make({ scale: "hearts" as never })).toThrow(/use "thumbs" or "stars"/);
        expect(() => make({ scale: "stars", max: 7 as never })).toThrow(/use 5 or 10/);
        expect(() => make({ commit: "always" as never })).toThrow(/use "submit" or "once"/);
        expect(() => make({ scale: "stars", initial: { score: 6 } })).toThrow(/whole score from 1 to 5/);
        expect(() => make({ initial: { score: 3 } })).toThrow(/does not fit the thumbs scale/);
    });

    test("the Report button needs FormDialog on the page", () =>
    {
        expect(() => make({ showReport: true })).toThrow(/needs FormDialog/);
    });
});

// ============================================================================
// ONE CALL PER RATING
// ============================================================================

describe("commit: submit", () =>
{
    test("picks stay local until Submit; the last pick is the one sent, once", async () =>
    {
        const save = deferredSave();
        make({ onFeedback: save.onFeedback });

        expect(q(".feedback-submit").hidden).toBe(true);
        q(".feedback-positive").click();
        q(".feedback-negative").click();
        expect(save.onFeedback).not.toHaveBeenCalled();
        expect(q(".feedback-negative").getAttribute("aria-pressed")).toBe("true");
        expect(q(".feedback-positive").getAttribute("aria-pressed")).toBe("false");

        q(".feedback-submit").click();
        q(".feedback-submit").click();
        expect(save.onFeedback).toHaveBeenCalledTimes(1);
        expect(save.calls[0].targetId).toBe("gen-1");
        expect(save.calls[0].feedback).toMatchObject({ kind: "rating", sentiment: "negative" });
        expect(save.calls[0].feedback.timestamp).toBeInstanceOf(Date);
    });

    test("a comment goes in the same call, and a comment alone is allowed", async () =>
    {
        const save = deferredSave();
        make({ onFeedback: save.onFeedback });

        q(".feedback-comment").click();
        const text = q<HTMLTextAreaElement>(".feedback-textarea");
        text.value = "  Missed the second table.  ";
        text.dispatchEvent(new Event("input"));
        expect(q(".feedback-submit").hidden).toBe(false);

        q(".feedback-submit").click();
        expect(save.calls[0].feedback).toEqual({ kind: "rating", comment: "Missed the second table.",
            timestamp: expect.any(Date) });
    });

    test("stars send the score and the scale's maximum", () =>
    {
        const save = deferredSave();
        make({ onFeedback: save.onFeedback, scale: "stars", max: 10 });

        expect(qa(".feedback-star")).toHaveLength(10);
        qa(".feedback-star")[3].click();
        qa(".feedback-star")[2].click();
        q(".feedback-submit").click();

        expect(save.calls[0].feedback).toMatchObject({ kind: "rating", score: 3, maxScore: 10 });
        expect(qa(".feedback-star")[2].getAttribute("aria-checked")).toBe("true");
        expect(qa(".feedback-star").filter((b) => b.classList.contains("feedback-btn-active"))).toHaveLength(3);
    });
});

describe("commit: once", () =>
{
    test("the first pick is sent at once, and the control then locks", async () =>
    {
        const save = deferredSave();
        make({ onFeedback: save.onFeedback, commit: "once" });

        expect(container.querySelector(".feedback-comment")).toBeNull();
        expect(container.querySelector(".feedback-submit")).toBeNull();
        q(".feedback-positive").click();
        expect(save.onFeedback).toHaveBeenCalledTimes(1);
        expect(q(".feedback-negative").disabled).toBe(true);

        await save.resolve();
        q(".feedback-negative").click();
        expect(save.onFeedback).toHaveBeenCalledTimes(1);
        expect(q(".feedback-positive").getAttribute("aria-pressed")).toBe("true");
    });
});

// ============================================================================
// HONEST SAVING
// ============================================================================

describe("saving", () =>
{
    test("busy while pending; locked and announced only when it resolves", async () =>
    {
        const save = deferredSave();
        make({ onFeedback: save.onFeedback });

        q(".feedback-positive").click();
        q(".feedback-submit").click();
        expect(q(".feedback").getAttribute("aria-busy")).toBe("true");
        expect(q(".feedback-submit").disabled).toBe(true);
        expect(q(".feedback-status").textContent).toBe("");

        await save.resolve();
        expect(q(".feedback").getAttribute("aria-busy")).toBe("false");
        expect(q(".feedback").classList.contains("feedback-locked")).toBe(true);
        expect(q(".feedback-positive").disabled).toBe(true);
        expect(q(".feedback-submit").hidden).toBe(true);
        expect(q(".feedback-status").textContent).toBe("Saved");
        expect(handle!.getState()).toEqual({ saved: { sentiment: "positive" }, reported: false });
    });

    test("a rejection shows the error in place, keeps the pick and the text, and allows a retry", async () =>
    {
        const save = deferredSave();
        make({ onFeedback: save.onFeedback });

        q(".feedback-positive").click();
        q(".feedback-comment").click();
        q<HTMLTextAreaElement>(".feedback-textarea").value = "Good";
        q(".feedback-submit").click();
        await save.reject("network down");

        expect(q(".feedback-error").hidden).toBe(false);
        expect(q(".feedback-error").textContent).toBe("Could not save: network down");
        expect(q(".feedback-positive").getAttribute("aria-pressed")).toBe("true");
        expect(q<HTMLTextAreaElement>(".feedback-textarea").value).toBe("Good");
        expect(q(".feedback").classList.contains("feedback-locked")).toBe(false);
        expect(q(".feedback-status").textContent).toBe("");

        q(".feedback-submit").click();
        expect(save.onFeedback).toHaveBeenCalledTimes(2);
        await save.resolve();
        expect(q(".feedback-error").hidden).toBe(true);
    });

    test("onSave receives the same save as one object", async () =>
    {
        const onSave = vi.fn(() => Promise.resolve());
        make({ onFeedback: undefined, onSave });

        q(".feedback-positive").click();
        q(".feedback-submit").click();

        expect(onSave).toHaveBeenCalledWith({ targetId: "gen-1",
            feedback: { kind: "rating", sentiment: "positive", timestamp: expect.any(Date) } });
    });
});

// ============================================================================
// LOCKING AND RESET
// ============================================================================

describe("locking", () =>
{
    test("initial shows a stored rating, saved and locked; reset unlocks it", () =>
    {
        const save = deferredSave();
        make({ onFeedback: save.onFeedback, initial: { sentiment: "negative" } });

        expect(q(".feedback-negative").getAttribute("aria-pressed")).toBe("true");
        expect(q(".feedback-positive").disabled).toBe(true);
        expect(q(".feedback-comment").hidden).toBe(true);

        handle!.reset();
        expect(q(".feedback-negative").getAttribute("aria-pressed")).toBe("false");
        q(".feedback-positive").click();
        q(".feedback-submit").click();
        expect(save.onFeedback).toHaveBeenCalledTimes(1);
    });

    test("an empty rating is no rating", () =>
    {
        make({ initial: {} });
        expect(q(".feedback-positive").disabled).toBe(false);
    });

    test("setState restores the lock, so a rebuilt control takes no second rating", () =>
    {
        make();
        handle!.setState({ saved: { sentiment: "positive" }, reported: true });

        expect(q(".feedback-positive").disabled).toBe(true);
        expect(handle!.getState()).toEqual({ saved: { sentiment: "positive" }, reported: true });
    });

    test("setDisabled disables every control", () =>
    {
        make({ showCopy: true });
        handle!.setDisabled(true);
        expect(qa(".feedback-btn").every((b) => b.disabled)).toBe(true);
        handle!.setDisabled(false);
        expect(q(".feedback-positive").disabled).toBe(false);
    });
});

// ============================================================================
// COMMENT PANEL, STARS KEYBOARD
// ============================================================================

describe("comment panel", () =>
{
    test("Escape closes it, keeps the text and returns focus to Comment", () =>
    {
        make();
        const btn = q(".feedback-comment");
        btn.click();
        const text = q<HTMLTextAreaElement>(".feedback-textarea");
        expect(btn.getAttribute("aria-expanded")).toBe("true");
        expect(document.activeElement).toBe(text);

        text.value = "draft";
        text.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(q(".feedback-panel").hidden).toBe(true);
        expect(btn.getAttribute("aria-expanded")).toBe("false");
        expect(document.activeElement).toBe(btn);
        expect(text.value).toBe("draft");
    });
});

describe("stars by keyboard", () =>
{
    test("arrows, Home and End move focus without picking, so commit once sends nothing", () =>
    {
        const save = deferredSave();
        make({ onFeedback: save.onFeedback, scale: "stars", commit: "once" });
        const stars = qa(".feedback-star");
        expect(q(".feedback-stars").getAttribute("role")).toBe("radiogroup");
        expect(stars[2].getAttribute("aria-label")).toBe("3 of 5 stars");

        stars[0].focus();
        const key = (k: string) => q(".feedback-stars").dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
        key("ArrowRight");
        expect(document.activeElement).toBe(stars[1]);
        key("End");
        expect(document.activeElement).toBe(stars[4]);
        key("Home");
        expect(document.activeElement).toBe(stars[0]);
        expect(stars.map((s) => s.tabIndex)).toEqual([0, -1, -1, -1, -1]);
        expect(save.onFeedback).not.toHaveBeenCalled();
    });
});

// ============================================================================
// SUMMARY
// ============================================================================

describe("summary", () =>
{
    test("thumbs show each count, singular for one", () =>
    {
        make({ summary: { positive: 1, negative: 12 } });
        expect(qa(".feedback-summary").map((s) => s.textContent)).toEqual(["1 like", "12 dislikes"]);

        handle!.setSummary(null);
        expect(qa(".feedback-summary").every((s) => s.hidden)).toBe(true);
    });

    test("stars show the average to one decimal and the count", () =>
    {
        make({ scale: "stars", summary: { average: 4.26, count: 128 } });
        expect(q(".feedback-summary").textContent).toBe("4.3 (128 ratings)");
    });

    test("a summary of the other scale's shape throws", () =>
    {
        make();
        expect(() => handle!.setSummary({ average: 4, count: 2 })).toThrow(/not a thumbs summary/);
    });
});

// ============================================================================
// COPY, CHANNELS, TEARDOWN
// ============================================================================

describe("copy and teardown", () =>
{
    test("Copy calls onCopy first, then the copy channel, and shows copied for a moment", () =>
    {
        vi.useFakeTimers();
        const order: string[] = [];
        make({ showCopy: true, onCopy: (id) => order.push(`onCopy:${id}`) });
        handle!.on("copy", (p) => order.push(`channel:${(p as { targetId: string }).targetId}`));

        q(".feedback-copy").click();
        expect(order).toEqual(["onCopy:gen-1", "channel:gen-1"]);
        expect(q(".feedback-copy").getAttribute("aria-label")).toBe("Copied");
        vi.advanceTimersByTime(2000);
        expect(q(".feedback-copy").getAttribute("aria-label")).toBe("Copy");
    });

    test("an unknown channel throws, and destroy is idempotent", () =>
    {
        make();
        expect(() => handle!.on("feedback", () => undefined)).toThrow(/only channel is "copy"/);
        handle!.destroy();
        handle!.destroy();
        expect(container.querySelector(".feedback")).toBeNull();
        handle = null;
    });

    test("caller text is set as text, not markup", () =>
    {
        make({ labels: { positive: "<img src=x onerror=alert(1)>" }, summary: { positive: 2, negative: 0 },
            showComment: true });
        expect(container.querySelector("img")).toBeNull();
        expect(q(".feedback-positive").getAttribute("aria-label")).toBe("<img src=x onerror=alert(1)>");
    });
});

// ============================================================================
// DIALOG
// ============================================================================

describe("showFeedbackDialog", () =>
{
    test("needs FormDialog on the page", () =>
    {
        expect(() => showFeedbackDialog({ targetId: "t", onFeedback: () => Promise.resolve() }))
            .toThrow(/needs FormDialog/);
    });
});
