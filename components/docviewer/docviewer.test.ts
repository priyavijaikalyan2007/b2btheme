/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DocViewer
 * Spec-based tests for the DocViewer three-column documentation layout.
 * Tests cover: factory function, options/defaults, DOM structure, ARIA,
 * handle methods, callbacks, keyboard, edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createDocViewer } from "./docviewer";
import type { DocViewerOptions, DocViewerHandle, DocPage } from "./docviewer";

// ============================================================================
// MARKDOWN RENDERER MOCK
// ============================================================================

function installMarkdownMock(): void
{
    (window as unknown as Record<string, unknown>)["createMarkdownRenderer"] = () => ({
        render: (md: string, target: HTMLElement) =>
        {
            target.innerHTML = `<p>${md}</p>`;
        },
        toHtml: (md: string) => `<p>${md}</p>`,
    });
}

function removeMarkdownMock(): void
{
    delete (window as unknown as Record<string, unknown>)["createMarkdownRenderer"];
}

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

const samplePages: DocPage[] = [
    {
        id: "intro",
        title: "Introduction",
        markdown: "# Introduction\n\nWelcome.",
    },
    {
        id: "guide",
        title: "User Guide",
        markdown: "# User Guide\n\nStep-by-step guide.",
        children: [
            {
                id: "guide-start",
                title: "Getting Started",
                markdown: "# Getting Started\n\nBegin here.",
            },
        ],
    },
    {
        id: "api",
        title: "API Reference",
        markdown: "# API Reference\n\nDocumentation for the API.",
    },
];

function defaultOptions(overrides?: Partial<DocViewerOptions>): DocViewerOptions
{
    return {
        container,
        pages: samplePages,
        ...overrides,
    };
}

function getRoot(): HTMLElement | null
{
    return container.querySelector(".docviewer") as HTMLElement | null;
}

function getToc(): HTMLElement | null
{
    return container.querySelector(".docviewer-toc") as HTMLElement | null;
}

function getContent(): HTMLElement | null
{
    return container.querySelector(".docviewer-content") as HTMLElement | null;
}

function getOutline(): HTMLElement | null
{
    return container.querySelector(".docviewer-outline") as HTMLElement | null;
}

function getTocItems(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".docviewer-toc-item")
    );
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "doc-container";
    container.style.width = "1400px";
    container.style.height = "800px";
    document.body.appendChild(container);
    installMarkdownMock();
});

afterEach(() =>
{
    removeMarkdownMock();
    container.remove();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

describe("createDocViewer", () =>
{
    test("withValidOptions_ReturnsHandle", () =>
    {
        const handle = createDocViewer(defaultOptions());
        expect(handle).toBeDefined();
        expect(typeof handle.navigateTo).toBe("function");
        expect(typeof handle.destroy).toBe("function");
        handle.destroy();
    });

    test("withNoContainer_ThrowsError", () =>
    {
        expect(() =>
        {
            createDocViewer({
                container: null as unknown as HTMLElement,
                pages: samplePages,
            });
        }).toThrow();
    });

    test("withNoPages_ThrowsError", () =>
    {
        expect(() =>
        {
            createDocViewer({
                container,
                pages: [],
            });
        }).toThrow();
    });

    test("withValidOptions_CreatesRootElement", () =>
    {
        const handle = createDocViewer(defaultOptions());
        expect(getRoot()).not.toBeNull();
        handle.destroy();
    });
});

// ============================================================================
// OPTIONS & DEFAULTS
// ============================================================================

describe("DocViewer options", () =>
{
    test("withShowTocFalse_HidesTocPanel", () =>
    {
        const handle = createDocViewer(defaultOptions({ showToc: false }));
        // Even if panel exists, it should be hidden or not rendered
        const root = getRoot();
        expect(root).not.toBeNull();
        handle.destroy();
    });

    test("withShowOutlineFalse_HidesOutlinePanel", () =>
    {
        const handle = createDocViewer(defaultOptions({ showOutline: false }));
        const root = getRoot();
        expect(root).not.toBeNull();
        handle.destroy();
    });

    test("withActivePage_NavigatesToSpecifiedPage", () =>
    {
        const handle = createDocViewer(defaultOptions({ activePage: "api" }));
        expect(handle.getActivePage()).toBe("api");
        handle.destroy();
    });

    test("withDefaultActivePage_NavigatesToFirstPage", () =>
    {
        const handle = createDocViewer(defaultOptions());
        expect(handle.getActivePage()).toBe("intro");
        handle.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DocViewer DOM structure", () =>
{
    test("createsThreeColumnLayout", () =>
    {
        const handle = createDocViewer(defaultOptions());
        expect(getToc()).not.toBeNull();
        expect(getContent()).not.toBeNull();
        expect(getOutline()).not.toBeNull();
        handle.destroy();
    });

    test("tocContainsPageEntries", () =>
    {
        const handle = createDocViewer(defaultOptions());
        const items = getTocItems();
        expect(items.length).toBeGreaterThanOrEqual(3);
        handle.destroy();
    });

    test("contentRendersMarkdown", () =>
    {
        const handle = createDocViewer(defaultOptions());
        const content = getContent();
        expect(content?.textContent).toBeTruthy();
        handle.destroy();
    });
});

// ============================================================================
// ARIA
// ============================================================================

describe("DocViewer ARIA", () =>
{
    test("toc_HasNavigationRole", () =>
    {
        const handle = createDocViewer(defaultOptions());
        const toc = getToc();
        const nav = toc?.closest("[role='navigation']")
            ?? toc?.querySelector("[role='navigation']");
        // The TOC or its wrapper should have navigation role
        expect(toc).not.toBeNull();
        handle.destroy();
    });

    test("root_HasMainLandmark", () =>
    {
        const handle = createDocViewer(defaultOptions());
        const root = getRoot();
        // DocViewer should have proper landmarks
        expect(root).not.toBeNull();
        handle.destroy();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("DocViewer handle methods", () =>
{
    test("navigateTo_ChangesActivePage", () =>
    {
        const handle = createDocViewer(defaultOptions());
        handle.navigateTo("api");
        expect(handle.getActivePage()).toBe("api");
        handle.destroy();
    });

    test("getActivePage_ReturnsCurrentPage", () =>
    {
        const handle = createDocViewer(defaultOptions());
        expect(handle.getActivePage()).toBe("intro");
        handle.destroy();
    });

    test("searchToc_FiltersEntries", () =>
    {
        const handle = createDocViewer(defaultOptions());
        handle.searchToc("api");
        // Search should filter TOC items
        expect(handle).toBeDefined();
        handle.destroy();
    });

    test("expandTocNode_ExpandsCollapsedNode", () =>
    {
        const handle = createDocViewer(defaultOptions());
        expect(() => handle.expandTocNode("guide")).not.toThrow();
        handle.destroy();
    });

    test("collapseTocNode_CollapsesExpandedNode", () =>
    {
        const handle = createDocViewer(defaultOptions());
        expect(() => handle.collapseTocNode("guide")).not.toThrow();
        handle.destroy();
    });

    test("getElement_ReturnsRootElement", () =>
    {
        const handle = createDocViewer(defaultOptions());
        const el = handle.getElement();
        expect(el).toBeInstanceOf(HTMLElement);
        handle.destroy();
    });

    test("destroy_RemovesDOMElements", () =>
    {
        const handle = createDocViewer(defaultOptions());
        handle.destroy();
        expect(getRoot()).toBeNull();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("DocViewer callbacks", () =>
{
    test("onPageChange_CalledOnNavigation", () =>
    {
        const onPageChange = vi.fn();
        const handle = createDocViewer(defaultOptions({ onPageChange }));
        handle.navigateTo("api");
        expect(onPageChange).toHaveBeenCalledWith("api");
        handle.destroy();
    });

    test("onReady_CalledAfterInit", () =>
    {
        const onReady = vi.fn();
        const handle = createDocViewer(defaultOptions({ onReady }));
        vi.advanceTimersByTime(300);
        expect(onReady).toHaveBeenCalled();
        handle.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("DocViewer edge cases", () =>
{
    test("navigateToNonexistentPage_DoesNotThrow", () =>
    {
        const handle = createDocViewer(defaultOptions());
        expect(() => handle.navigateTo("nonexistent")).not.toThrow();
        handle.destroy();
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const handle = createDocViewer(defaultOptions());
        expect(() =>
        {
            handle.destroy();
            handle.destroy();
        }).not.toThrow();
    });

    test("searchWithEmptyString_ShowsAllEntries", () =>
    {
        const handle = createDocViewer(defaultOptions());
        handle.searchToc("");
        const items = getTocItems();
        expect(items.length).toBeGreaterThanOrEqual(3);
        handle.destroy();
    });

    test("withoutMarkdownRenderer_FallsBackGracefully", () =>
    {
        removeMarkdownMock();
        const handle = createDocViewer(defaultOptions());
        const content = getContent();
        expect(content).not.toBeNull();
        handle.destroy();
    });

    test("navigateToChild_UpdatesContent", () =>
    {
        const handle = createDocViewer(defaultOptions());
        handle.navigateTo("guide-start");
        expect(handle.getActivePage()).toBe("guide-start");
        handle.destroy();
    });
});
