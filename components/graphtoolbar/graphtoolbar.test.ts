/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b
 *
 * ⚓ TESTS: GraphToolbar
 * Vitest unit tests for the GraphToolbar component.
 * Covers: factory, handle API, zoom label, grid snap, minimap,
 * undo/redo enable, layout, destroy.
 *
 * 📜 PURPOSE: ADR-203. NOTHING HERE HAD EVER MOUNTED GRAPHTOOLBAR ON THE
 * REAL TOOLBAR. The suite installed a stand-in whose `setToolState` had
 * an empty body, so every one of the five state setters routed into a
 * method that discarded its arguments, and every test asserted only
 * that the call did not throw. Eight of the nine blocks could not fail.
 *
 * Mounting the real component found the defect the stand-in hid:
 * `setToolState({ label })` never reached a `type: "label"` item, so the
 * zoom reading was frozen at its initial value. DEBT-TEST-1b.
 *
 * 🔗 RELATED: AGENTS.md "No Fallback Code", ADR-196, ADR-200, ADR-203
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createGraphToolbar } from "./graphtoolbar";
import type
{
    GraphToolbarOptions,
    GraphToolbarHandle,
} from "./graphtoolbar";

// Imported for the side effect alone: toolbar.ts assigns `window.Toolbar`
// and `window.createToolbar`, which is the pair GraphToolbar looks up.
import "../toolbar/toolbar";

// ============================================================================
// HELPERS
// ============================================================================

const CONTAINER_ID = "gt-test-container";

let container: HTMLElement;

/**
 * Toolbar demands Bootstrap's Tooltip whenever a tool declares a tooltip,
 * and every GraphToolbar button declares one. Bootstrap is a third-party
 * bundle rather than a component of this library, so a stub is the right
 * stand-in here. The same stub serves toolbar.test.ts. FALLBACK-5.
 */
interface TooltipStub { dispose(): void }

const bootstrapStub = {
    Tooltip: class implements TooltipStub
    {
        dispose(): void { /* no-op */ }
    }
};

function makeOptions(
    overrides?: Partial<GraphToolbarOptions>
): GraphToolbarOptions
{
    return {
        showZoomControls: true,
        showLayoutSelector: true,
        ...overrides,
    };
}

function mount(overrides?: Partial<GraphToolbarOptions>): GraphToolbarHandle
{
    return createGraphToolbar(makeOptions(overrides), CONTAINER_ID);
}

/** The rendered element for one tool id, or null when it is absent. */
function toolEl(id: string): HTMLElement | null
{
    return container.querySelector(`[data-tool-id="${id}"]`);
}

/** The clickable control inside a tool wrapper. */
function toolButton(id: string): HTMLElement
{
    const el = toolEl(id);
    if (el === null) { throw new Error(`tool "${id}" did not render`); }
    return el.tagName === "BUTTON" ? el : el.querySelector("button") as HTMLElement;
}

/** The live state Toolbar reports for one tool id. */
function toolState(handle: GraphToolbarHandle, id: string):
    { active: boolean; disabled: boolean; hidden: boolean }
{
    const tb = handle.toolbar as unknown as {
        getToolState(toolId: string): { active: boolean; disabled: boolean; hidden: boolean } | undefined;
    };
    const state = tb.getToolState(id);
    if (state === undefined) { throw new Error(`tool "${id}" is not registered`); }
    return state;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    (window as unknown as Record<string, unknown>)["bootstrap"] = bootstrapStub;
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
    delete (window as unknown as Record<string, unknown>)["bootstrap"];
});

// ============================================================================
// FACTORY
// ============================================================================

describe("createGraphToolbar", () =>
{
    test("ValidOptions_ReturnsHandle", () =>
    {
        const handle = mount();
        expect(handle).toBeDefined();
        expect(typeof handle.destroy).toBe("function");
        expect(typeof handle.setZoomLabel).toBe("function");
        handle.destroy();
    });

    test("ValidOptions_MountsTheRealToolbarIntoTheContainer", () =>
    {
        // The guard against this file sliding back to a stand-in: if the
        // real Toolbar is not what rendered, no tool element exists.
        const handle = mount();
        expect(container.querySelector(".toolbar")).not.toBeNull();
        expect(toolEl("gt-zoom-label")).not.toBeNull();
        handle.destroy();
    });
});

// ============================================================================
// HANDLE API
// ============================================================================

describe("GraphToolbar handle", () =>
{
    test("SetZoomLabel_WritesThePercentageToTheLabel", () =>
    {
        const handle = mount();
        handle.setZoomLabel(150);
        expect(toolEl("gt-zoom-label")?.textContent).toBe("150%");
        handle.destroy();
    });

    test("TheZoomLabelIsALiveRegion_SoTheNewValueIsAnnounced", () =>
    {
        // DEBT-TB-1, closed. The PRD §8.2 has said since the component
        // shipped that a screen reader announces each zoom level, and
        // `buildLabelItem` set no `aria-live`, so it never did. The
        // text started changing only with ADR-203, which is what made
        // the missing announcement the next thing wrong.
        const handle = mount();
        const label = toolEl("gt-zoom-label");

        expect(label?.getAttribute("aria-live")).toBe("polite");
        expect(label?.getAttribute("aria-atomic")).toBe("true");

        // The region must be the element that SURVIVES the update, or
        // the announcement is attached to a node that is replaced.
        handle.setZoomLabel(150);

        expect(toolEl("gt-zoom-label")).toBe(label);
        expect(label?.textContent).toBe("150%");
        handle.destroy();
    });

    test("SetZoomLabel_RoundsToWholePercent", () =>
    {
        // The PRD documents the parameter as a percentage, so 99.6 is
        // 100% and not 1%. ADR-203 corrected three documents that showed
        // a fraction being passed here.
        const handle = mount();
        handle.setZoomLabel(149.6);
        expect(toolEl("gt-zoom-label")?.textContent).toBe("150%");
        handle.destroy();
    });

    test("SetZoomLabel_WithNaN_ShowsADashAndWarns", () =>
    {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const handle = mount();
        handle.setZoomLabel(Number.NaN);
        expect(toolEl("gt-zoom-label")?.textContent).toBe("—");
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
        handle.destroy();
    });

    test("SetGridSnapState_MarksTheToolActiveAndPressed", () =>
    {
        const handle = mount({ showGridSnap: true });
        handle.setGridSnapState(true);
        expect(toolState(handle, "gt-grid-snap").active).toBe(true);
        expect(toolButton("gt-grid-snap").getAttribute("aria-pressed")).toBe("true");
        handle.setGridSnapState(false);
        expect(toolState(handle, "gt-grid-snap").active).toBe(false);
        expect(toolButton("gt-grid-snap").getAttribute("aria-pressed")).toBe("false");
        handle.destroy();
    });

    test("SetUndoEnabled_False_DisablesTheTool", () =>
    {
        const handle = mount({ showUndo: true });
        handle.setUndoEnabled(false);
        expect(toolState(handle, "gt-undo").disabled).toBe(true);
        expect(toolEl("gt-undo")?.getAttribute("aria-disabled")).toBe("true");
        handle.setUndoEnabled(true);
        expect(toolState(handle, "gt-undo").disabled).toBe(false);
        expect(toolEl("gt-undo")?.hasAttribute("aria-disabled")).toBe(false);
        handle.destroy();
    });

    test("SetRedoEnabled_False_DisablesTheTool", () =>
    {
        const handle = mount({ showRedo: true });
        handle.setRedoEnabled(false);
        expect(toolState(handle, "gt-redo").disabled).toBe(true);
        handle.destroy();
    });

    test("SetDeleteEnabled_False_DisablesTheTool", () =>
    {
        const handle = mount({ showDelete: true });
        handle.setDeleteEnabled(false);
        expect(toolState(handle, "gt-delete").disabled).toBe(true);
        handle.destroy();
    });

    test("SetLayout_UnknownId_LeavesTheSelectorAlone", () =>
    {
        const handle = mount();
        const before = toolEl("gt-layout-select")?.textContent;
        handle.setLayout("no-such-layout");
        expect(toolEl("gt-layout-select")?.textContent).toBe(before);
        handle.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("GraphToolbar callbacks", () =>
{
    test("OnZoomIn_FiresWhenTheRenderedButtonIsClicked", () =>
    {
        // The claim the old block carried as a comment, never asserted:
        // "Callback is wired internally via Toolbar item click."
        const onZoomIn = vi.fn();
        const handle = mount({ onZoomIn });
        toolButton("gt-zoom-in").click();
        expect(onZoomIn).toHaveBeenCalledTimes(1);
        handle.destroy();
    });

    test("OnUndo_FiresOnTheKeyboardShortcut", () =>
    {
        const onUndo = vi.fn();
        const handle = mount({ showUndo: true, onUndo });
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "z", ctrlKey: true, bubbles: true,
        }));
        expect(onUndo).toHaveBeenCalledTimes(1);
        handle.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("GraphToolbar destroy", () =>
{
    test("Destroy_RemovesTheToolbarFromTheContainer", () =>
    {
        const handle = mount();
        expect(container.querySelector(".toolbar")).not.toBeNull();
        handle.destroy();
        expect(container.querySelector(".toolbar")).toBeNull();
    });

    test("Destroy_StopsTheKeyboardShortcuts", () =>
    {
        // What this proves is that the shortcuts stop, and NOT that the
        // listener was removed. destroy() sets the destroyed flag before
        // it calls removeEventListener, and the handler returns on that
        // flag, so deleting the removal leaves this test green. The leak
        // is not observable from here and the claim is not made.
        const onUndo = vi.fn();
        const handle = mount({ showUndo: true, onUndo });
        handle.destroy();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "z", ctrlKey: true, bubbles: true,
        }));
        expect(onUndo).not.toHaveBeenCalled();
    });

    test("Destroy_CalledTwice_LeavesTheContainerEmpty", () =>
    {
        const handle = mount();
        handle.destroy();
        handle.destroy();
        expect(container.querySelector(".toolbar")).toBeNull();
        expect(container.children.length).toBe(0);
    });
});
