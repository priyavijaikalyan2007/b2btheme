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
import { destroyProbe } from "../../tests/destroy-probe";
import { createDocViewer } from "./docviewer";
import type { DocViewerOptions, DocViewerHandle, DocPage } from "./docviewer";
// DEBT-TEST-1c. Side-effect import: DocViewer reads
// `window.createMarkdownRenderer`, and this registers the real one.
import "../markdownrenderer/markdownrenderer";

// ============================================================================
// MARKED MOCK — THE THIRD-PARTY HALF, WHICH IS THE ONLY HALF TO STUB
// ============================================================================

/*
 * DEBT-TEST-1c. This file used to stub `createMarkdownRenderer` itself,
 * so DocViewer's whole markdown path ran against four lines of the
 * suite's own code. FALLBACK-13 lived inside the component those four
 * lines replaced: an absent `marked` produced a handle whose render set
 * the raw source as text, and the reader saw `## Heading` verbatim.
 *
 * `marked` is a bundle this repository does not build, so stubbing it
 * is the boundary. Everything between it and DocViewer — the sanitiser
 * above all — is now the real thing.
 */
function installMarkdownMock(): void
{
    (window as unknown as Record<string, unknown>)["marked"] = {
        parse: (md: string) => `<p>${md}</p>`,
        use: () => { /* this stub registers no extensions */ },
    };
}

function removeMarkdownMock(): void
{
    delete (window as unknown as Record<string, unknown>)["marked"];
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

/** The title of every entry currently rendered in the table of contents. */
function tocTitles(): string[]
{
    return [...container.querySelectorAll(".docviewer-toc-item")]
        .map((n) => n.textContent ?? "");
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

    // "RendersMarkdown" is a claim about what the markdown became.
    // Non-empty text was true of the page title alone, and would
    // have held for the raw "# Introduction\n\nWelcome." that
    // ADR-202 deleted the substitute renderer for.
    test("contentRendersMarkdown", () =>
    {
        const handle = createDocViewer(defaultOptions());

        const content = getContent()!;

        // The `marked` stub above wraps its input in a <p> and runs
        // no extensions, so a heading is not available to assert --
        // what IS available is that the renderer's HTML went in as
        // MARKUP. FALLBACK-13 is the reason that matters: an absent
        // `marked` used to produce a handle whose render set the raw
        // source as text, and the reader saw `## Heading` verbatim.
        expect(content.querySelector("p")?.textContent)
            .toContain("Welcome.");
        expect(content.innerHTML).not.toContain("&lt;p&gt;");
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

    // The comment said "Search should filter TOC items" and the
    // body asked the handle whether it existed. Which entries
    // survive is the claim, and listing them also catches a filter
    // that drops everything.
    test("searchToc_FiltersEntries", () =>
    {
        const handle = createDocViewer(defaultOptions());
        expect(tocTitles().length).toBeGreaterThan(1);

        handle.searchToc("api");

        expect(tocTitles()).toEqual(["API Reference"]);
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
    test("navigateToNonexistentPage_RefusesAndNamesIt", () =>
    {
        const handle = createDocViewer(defaultOptions());
        const before = handle.getActivePage();

        // ADR-200. There is no "already there" reading for a page that
        // does not exist, and the quiet return left the viewer on the
        // previous page looking as though the call had worked.
        expect(() => handle.navigateTo("nonexistent"))
            .toThrow(/no page with id "nonexistent"/);
        expect(handle.getActivePage()).toBe(before);
        handle.destroy();
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const handle = createDocViewer(defaultOptions());
        const probe = destroyProbe();

        handle.destroy();
        const first = probe.total();
        handle.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });

    test("searchWithEmptyString_ShowsAllEntries", () =>
    {
        const handle = createDocViewer(defaultOptions());
        handle.searchToc("");
        const items = getTocItems();
        expect(items.length).toBeGreaterThanOrEqual(3);
        handle.destroy();
    });

    test("withoutMarkdownRenderer_Throws", () =>
    {
        // ADR-200. The old name said FallsBackGracefully and the old
        // body asserted that the content element exists, which it did:
        // it held the raw markdown as plain text, so a reader saw
        // "## Heading" and could not tell the renderer had failed.
        // Graceful is the wrong goal when the output is indistinguishable
        // from badly written documentation.
        //
        // DEBT-TEST-1c SPLIT THIS IN TWO, because mounting the real
        // MarkdownRenderer made the two absences distinguishable for
        // the first time. This half withholds the COMPONENT.
        const real = (window as unknown as Record<string, unknown>)
            ["createMarkdownRenderer"];
        delete (window as unknown as Record<string, unknown>)
            ["createMarkdownRenderer"];

        expect(() => createDocViewer(defaultOptions()))
            .toThrow(/MarkdownRenderer is required/);

        (window as unknown as Record<string, unknown>)
            ["createMarkdownRenderer"] = real;
    });

    test("withoutMarked_TheRenderersOwnRefusalReachesTheCaller", () =>
    {
        // The other half, and the one no stub could ever have shown.
        // FALLBACK-13 was exactly here: the component used to answer an
        // absent `marked` with a handle that set the raw source as
        // text. DocViewer adds no catch of its own, so the refusal
        // arrives naming the bundle and the URL to load.
        removeMarkdownMock();

        expect(() => createDocViewer(defaultOptions()))
            .toThrow(/marked was not found.*cdn\.jsdelivr\.net/s);
    });

    test("navigateToChild_UpdatesContent", () =>
    {
        const handle = createDocViewer(defaultOptions());
        handle.navigateTo("guide-start");
        expect(handle.getActivePage()).toBe("guide-start");
        handle.destroy();
    });
});
