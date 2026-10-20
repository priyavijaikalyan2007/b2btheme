/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b
 *
 * ⚓ TESTS: DockLayout
 * Vitest unit tests for the DockLayout component.
 * Covers: factory, slot mounting, DOM structure, show/hide, destroy,
 *         toolbar resize observer.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    DockLayout,
    createDockLayout,
} from "./docklayout";
import type { DockLayoutOptions } from "./docklayout";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<DockLayoutOptions>
): DockLayoutOptions
{
    return {
        id: "test-dock",
        container,
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "dock-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("DockLayout factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const layout = new DockLayout(makeOptions());
        expect(layout).toBeDefined();
        expect(layout.getRootElement()).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });

    test("createDockLayout_ShowsImmediately", () =>
    {
        const layout = createDockLayout(makeOptions());
        expect(layout.isVisible()).toBe(true);
        layout.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DockLayout DOM structure", () =>
{
    test("RootElement_HasDockLayoutClass", () =>
    {
        const layout = new DockLayout(makeOptions());
        layout.show();
        const root = layout.getRootElement()!;
        expect(root.classList.contains("dock-layout")).toBe(true);
        layout.destroy();
    });

    test("RootElement_HasCorrectId", () =>
    {
        const layout = new DockLayout(makeOptions({ id: "my-dock" }));
        layout.show();
        expect(layout.getRootElement()?.id).toBe("my-dock");
        layout.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("DockLayout lifecycle", () =>
{
    test("Show_MakesVisible", () =>
    {
        const layout = new DockLayout(makeOptions());
        layout.show();
        expect(layout.isVisible()).toBe(true);
        layout.destroy();
    });

    test("Hide_RemovesFromDOM", () =>
    {
        const layout = new DockLayout(makeOptions());
        layout.show();
        layout.hide();
        expect(layout.isVisible()).toBe(false);
        layout.destroy();
    });

    test("Destroy_NullifiesRootElement", () =>
    {
        const layout = new DockLayout(makeOptions());
        layout.show();
        layout.destroy();
        expect(layout.getRootElement()).toBeNull();
    });
});

// ============================================================================
// TOOLBAR RESIZE OBSERVER
// ============================================================================

describe("DockLayout toolbar resize observer", () =>
{
    let mockObserve: ReturnType<typeof vi.fn>;
    let mockDisconnect: ReturnType<typeof vi.fn>;
    let capturedCallback: ResizeObserverCallback | null;
    let origResizeObserver: typeof ResizeObserver | undefined;

    beforeEach(() =>
    {
        mockObserve = vi.fn();
        mockDisconnect = vi.fn();
        capturedCallback = null;
        origResizeObserver = (globalThis as any).ResizeObserver;

        (globalThis as any).ResizeObserver = class
        {
            constructor(cb: ResizeObserverCallback)
            {
                capturedCallback = cb;
            }
            observe = mockObserve;
            unobserve = vi.fn();
            disconnect = mockDisconnect;
        };
    });

    afterEach(() =>
    {
        if (origResizeObserver)
        {
            (globalThis as any).ResizeObserver = origResizeObserver;
        }
        else
        {
            delete (globalThis as any).ResizeObserver;
        }
    });

    test("Show_ObservesToolbarCell", () =>
    {
        const layout = new DockLayout(makeOptions());
        layout.show();

        const root = layout.getRootElement()!;
        const toolbarCell = root.querySelector(".dock-layout-toolbar");
        expect(mockObserve).toHaveBeenCalledWith(toolbarCell);

        layout.destroy();
    });

    test("ToolbarCellResize_FiresOnLayoutChange", () =>
    {
        const changeSpy = vi.fn();
        const layout = createDockLayout(makeOptions({
            onLayoutChange: changeSpy,
        }));

        changeSpy.mockClear();
        capturedCallback!([], {} as ResizeObserver);

        expect(changeSpy).toHaveBeenCalledTimes(1);
        layout.destroy();
    });

    test("Destroy_DisconnectsToolbarObserver", () =>
    {
        const layout = createDockLayout(makeOptions());
        layout.destroy();

        expect(mockDisconnect).toHaveBeenCalled();
    });

    test("Hide_DisconnectsToolbarObserver", () =>
    {
        const layout = createDockLayout(makeOptions());
        layout.hide();

        expect(mockDisconnect).toHaveBeenCalled();
        layout.destroy();
    });
});

// ============================================================================
// PLAIN HTMLElement MOUNTING (ADR-118)
// ============================================================================

describe("DockLayout plain HTMLElement mounting", () =>
{
    test("setToolbar_PlainHTMLElement_AppendsToToolbarCell", () =>
    {
        const layout = new DockLayout(makeOptions());
        layout.show();
        const el = document.createElement("div");
        el.textContent = "My Toolbar";

        layout.setToolbar(el);

        const root = layout.getRootElement()!;
        const cell = root.querySelector(".dock-layout-toolbar");
        expect(cell?.contains(el)).toBe(true);
        layout.destroy();
    });

    test("setLeftSidebar_PlainHTMLElement_AppendsToLeftCell", () =>
    {
        const layout = new DockLayout(makeOptions());
        layout.show();
        const el = document.createElement("nav");
        el.textContent = "Sidebar";

        layout.setLeftSidebar(el);

        const root = layout.getRootElement()!;
        const cell = root.querySelector(".dock-layout-left");
        expect(cell?.contains(el)).toBe(true);
        layout.destroy();
    });

    test("setStatusBar_PlainHTMLElement_AppendsToStatusCell", () =>
    {
        const layout = new DockLayout(makeOptions());
        layout.show();
        const el = document.createElement("footer");
        el.textContent = "Status";

        layout.setStatusBar(el);

        const root = layout.getRootElement()!;
        const cell = root.querySelector(".dock-layout-status");
        expect(cell?.contains(el)).toBe(true);
        layout.destroy();
    });
});

// ============================================================================
// DEBT-DL-1 — a slot component is handed a cell that is IN the document
// ============================================================================

describe("DockLayout slot attachment (DEBT-DL-1)", () =>
{
    /**
     * A slot that resolves its container by id, which is what the
     * library convention asks of a factory and what Ribbon does.
     * `getElementById` only finds elements the DOCUMENT contains, so
     * this records whether the cell was attached when it was handed over.
     */
    function idResolvingSlot(seen: { connected: boolean | null })
    {
        return {
            show(cell: HTMLElement)
            {
                if (!cell.id) { cell.id = "dl1-probe-cell"; }
                seen.connected = document.getElementById(cell.id) !== null;
            },
            hide() { /* not exercised */ },
            destroy() { /* not exercised */ },
        };
    }

    test("aSlotFromOptions_IsMountedAfterTheGridIsInTheDocument", () =>
    {
        // The constructor route. `mountInitialSlots()` runs from the
        // constructor and `show()` is what appends the grid, so this
        // slot used to be handed a detached cell and the DockLayout
        // demo page threw on every load.
        const seen = { connected: null as boolean | null };
        const layout = new DockLayout(
            makeOptions({ toolbar: idResolvingSlot(seen) }));

        expect(seen.connected).toBeNull();

        layout.show();

        expect(seen.connected).toBe(true);
        layout.destroy();
    });

    test("aSlotSetBeforeShow_IsAlsoDeferred", () =>
    {
        // The route the obvious fix would have missed. Deferring only
        // the initial slots leaves this one mounting into a detached
        // cell, so the guarantee would hold on one path of two.
        const seen = { connected: null as boolean | null };
        const layout = new DockLayout(makeOptions());

        layout.setToolbar(idResolvingSlot(seen));

        expect(seen.connected).toBeNull();

        layout.show();

        expect(seen.connected).toBe(true);
        layout.destroy();
    });

    test("aSlotSetAfterShow_MountsImmediately", () =>
    {
        // The control. Once the grid is in the document there is
        // nothing to wait for, and a deferral that never flushed would
        // leave this slot unmounted forever.
        const seen = { connected: null as boolean | null };
        const layout = new DockLayout(makeOptions());
        layout.show();

        layout.setToolbar(idResolvingSlot(seen));

        expect(seen.connected).toBe(true);
        layout.destroy();
    });

    test("aSlotReplacedBeforeShow_MountsOnlyTheReplacement", () =>
    {
        // The queue is keyed by cell. Without that, both the discarded
        // slot and its replacement would mount into the same cell.
        const mounted: string[] = [];
        const slot = (name: string) => ({
            show() { mounted.push(name); },
            hide() { /* not exercised */ },
            destroy() { /* not exercised */ },
        });
        const layout = new DockLayout(makeOptions({ toolbar: slot("first") }));

        layout.setToolbar(slot("second"));
        layout.show();

        // The Map key is what dedupes this one, not the delete in
        // clearCell — verified by mutation. The case the delete is
        // actually for is the test below.
        expect(mounted).toEqual(["second"]);
        layout.destroy();
    });

    test("aSlotClearedBeforeShow_NeverMounts", () =>
    {
        // `setToolbar(null)` clears the cell and sets no replacement,
        // so nothing overwrites the queued entry. Without the delete in
        // clearCell the discarded slot still mounts at show(), which is
        // a component the host removed appearing anyway.
        const mounted: string[] = [];
        const layout = new DockLayout(makeOptions({
            toolbar: {
                show() { mounted.push("discarded"); },
                hide() { /* not exercised */ },
                destroy() { /* not exercised */ },
            },
        }));

        layout.setToolbar(null);
        layout.show();

        expect(mounted).toEqual([]);
        layout.destroy();
    });
});
