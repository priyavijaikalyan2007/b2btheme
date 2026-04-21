/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: ActionItems × HoverCard (ADR-126)
 * Integration tests for itemHoverCardMode + renderItemHoverCard. Exercises
 * the default extractor, the custom renderer path, and cleanup on destroy.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createActionItems } from "./actionitems";
import type { ActionItemsOptions, ActionItem } from "./actionitems";
import { createHoverCard, attachHoverCard } from "../hovercard/hovercard";

let container: HTMLElement;

function makeItem(overrides?: Partial<ActionItem>): ActionItem
{
    return {
        id: "ai-1",
        index: 1,
        order: 1,
        content: "Review the Q2 architecture proposal",
        status: "in-progress",
        priority: "high",
        assignee: { id: "p1", name: "Priya" },
        dueDate: "2026-05-01",
        createdAt: "2026-04-10T12:00:00.000Z",
        updatedAt: "2026-04-19T12:00:00.000Z",
        commentCount: 3,
        tags: [
            { id: "t1", label: "architecture" },
            { id: "t2", label: "q2" },
        ],
        ...overrides,
    };
}

function mkOpts(
    overrides?: Partial<Omit<ActionItemsOptions, "container">>
): Omit<ActionItemsOptions, "container">
{
    return {
        items: [makeItem()],
        ...overrides,
    };
}

function hoverFirstRow(): HTMLElement
{
    const row = document.querySelector<HTMLElement>(".actionitems-item");
    if (!row) { throw new Error("no item row rendered"); }
    row.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    return row;
}

beforeEach(() =>
{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).createHoverCard = createHoverCard;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).attachHoverCard = attachHoverCard;
    container = document.createElement("div");
    container.id = "ai-hc-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.querySelectorAll(".hovercard").forEach((n) => n.remove());
    container.remove();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).createHoverCard;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).attachHoverCard;
    vi.useRealTimers();
});

describe("ActionItems hover card — builtin mode (default)", () =>
{
    test("hovering a row opens a card with full content as title and assignee as subtitle", () =>
    {
        vi.useFakeTimers();
        const handle = createActionItems(container, mkOpts());
        hoverFirstRow();
        vi.advanceTimersByTime(300);

        const card = document.querySelector(".hovercard");
        expect(card).not.toBeNull();
        expect(card?.querySelector(".hovercard-title")?.textContent)
            .toBe("Review the Q2 architecture proposal");
        expect(card?.querySelector(".hovercard-subtitle")?.textContent)
            .toBe("Priya");

        handle.destroy();
    });

    test("card includes a status badge and key properties", () =>
    {
        vi.useFakeTimers();
        const handle = createActionItems(container, mkOpts());
        hoverFirstRow();
        vi.advanceTimersByTime(300);

        const card = document.querySelector(".hovercard");
        expect(card?.querySelector(".hovercard-badge")?.textContent)
            .toContain("In Progress");

        const propKeys = Array.from(
            card?.querySelectorAll(".hovercard-property-key") ?? []
        ).map((k) => k.textContent ?? "");
        expect(propKeys).toContain("Due");
        expect(propKeys).toContain("Created");
        expect(propKeys).toContain("Updated");
        expect(propKeys).toContain("Comments");

        handle.destroy();
    });

    test("tag labels appear in the footer when present", () =>
    {
        vi.useFakeTimers();
        const handle = createActionItems(container, mkOpts());
        hoverFirstRow();
        vi.advanceTimersByTime(300);

        const footer = document.querySelector(".hovercard-footer");
        expect(footer?.textContent ?? "").toContain("architecture");
        expect(footer?.textContent ?? "").toContain("q2");

        handle.destroy();
    });

    test("unassigned items show 'Unassigned' subtitle", () =>
    {
        vi.useFakeTimers();
        const handle = createActionItems(
            container,
            mkOpts({ items: [makeItem({ assignee: undefined })] })
        );
        hoverFirstRow();
        vi.advanceTimersByTime(300);

        const card = document.querySelector(".hovercard");
        expect(card?.querySelector(".hovercard-subtitle")?.textContent)
            .toBe("Unassigned");

        handle.destroy();
    });
});

describe("ActionItems hover card — mode: 'off'", () =>
{
    test("no hover card is shown when disabled", () =>
    {
        vi.useFakeTimers();
        const handle = createActionItems(
            container,
            mkOpts({ itemHoverCardMode: "off" })
        );
        hoverFirstRow();
        vi.advanceTimersByTime(300);

        expect(document.querySelector(".hovercard-open")).toBeNull();

        handle.destroy();
    });
});

describe("ActionItems hover card — mode: 'custom'", () =>
{
    test("renderItemHoverCard returning HoverCardContent overrides the default", () =>
    {
        vi.useFakeTimers();
        const handle = createActionItems(container, mkOpts({
            itemHoverCardMode: "custom",
            renderItemHoverCard: (item) => ({
                title: `Custom: ${item.content}`,
                subtitle: "custom subtitle",
            }),
        }));
        hoverFirstRow();
        vi.advanceTimersByTime(300);

        expect(document.querySelector(".hovercard-title")?.textContent)
            .toBe("Custom: Review the Q2 architecture proposal");

        handle.destroy();
    });

    test("renderItemHoverCard returning null suppresses the card for that item", () =>
    {
        vi.useFakeTimers();
        const handle = createActionItems(container, mkOpts({
            itemHoverCardMode: "custom",
            renderItemHoverCard: () => null,
        }));
        hoverFirstRow();
        vi.advanceTimersByTime(300);

        expect(document.querySelector(".hovercard-open")).toBeNull();

        handle.destroy();
    });

    test("renderItemHoverCard returning a string is placed as textContent (XSS safe)", () =>
    {
        vi.useFakeTimers();
        const handle = createActionItems(container, mkOpts({
            itemHoverCardMode: "custom",
            renderItemHoverCard: () => "<img src=x onerror=alert(1)>",
        }));
        hoverFirstRow();
        vi.advanceTimersByTime(300);

        const plain = document.querySelector<HTMLElement>(".hovercard-body-plain");
        expect(plain?.textContent).toBe("<img src=x onerror=alert(1)>");
        expect(plain?.querySelector("img")).toBeNull();

        handle.destroy();
    });
});

describe("ActionItems hover card — lifecycle", () =>
{
    test("destroy() removes the shared hover card from the DOM", () =>
    {
        vi.useFakeTimers();
        const handle = createActionItems(container, mkOpts());
        hoverFirstRow();
        vi.advanceTimersByTime(300);
        expect(document.querySelector(".hovercard")).not.toBeNull();

        handle.destroy();

        expect(document.querySelector(".hovercard")).toBeNull();
    });

    test("is resilient when HoverCard factory is not loaded", () =>
    {
        vi.useFakeTimers();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).createHoverCard;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).attachHoverCard;

        const handle = createActionItems(container, mkOpts());
        expect(() =>
        {
            hoverFirstRow();
            vi.advanceTimersByTime(300);
        }).not.toThrow();
        expect(document.querySelector(".hovercard")).toBeNull();

        handle.destroy();
    });

    test("XSS: content with <script> stays as text in the title", () =>
    {
        vi.useFakeTimers();
        const handle = createActionItems(container, mkOpts({
            items: [makeItem({ content: "<script>alert(1)</script>" })],
        }));
        hoverFirstRow();
        vi.advanceTimersByTime(300);

        const title = document.querySelector<HTMLElement>(".hovercard-title");
        expect(title?.textContent).toBe("<script>alert(1)</script>");
        expect(title?.querySelector("script")).toBeNull();

        handle.destroy();
    });
});
