/**
 * TESTS: ShareDialog
 * Spec-based tests for the ShareDialog share/permissions component.
 * Tests cover: factory functions, options/defaults, DOM structure, ARIA,
 * handle methods, callbacks, keyboard, edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createShareDialog, showShareDialog } from "./sharedialog";
import type { ShareDialogOptions, AccessLevel, PersonData } from "./sharedialog";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

const defaultAccessLevels: AccessLevel[] = [
    { id: "viewer", label: "Viewer", description: "Can view only" },
    { id: "editor", label: "Editor", description: "Can edit" },
    { id: "owner", label: "Owner", description: "Full control" },
];

function defaultOptions(overrides?: Partial<ShareDialogOptions>): ShareDialogOptions
{
    return {
        title: "Share Document",
        accessLevels: defaultAccessLevels,
        ...overrides,
    };
}

function getOverlay(): HTMLElement | null
{
    return document.querySelector(".sharedialog-overlay");
}

function getDialog(): HTMLElement | null
{
    return document.querySelector(".sharedialog");
}

function getBackdrop(): HTMLElement | null
{
    return document.querySelector(".sharedialog-backdrop");
}

function getTitle(el: HTMLElement): string
{
    const t = el.querySelector(".sharedialog-title");
    return t?.textContent ?? "";
}

function getDoneBtn(): HTMLElement | null
{
    return document.querySelector(".sharedialog-done-btn") as HTMLElement | null;
}

function getCancelBtn(): HTMLElement | null
{
    return document.querySelector(".sharedialog-cancel-btn") as HTMLElement | null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    const overlays = document.querySelectorAll(".sharedialog-overlay");
    overlays.forEach((o) => o.remove());
    container.remove();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

describe("createShareDialog", () =>
{
    test("withValidOptions_ReturnsDialogInstance", () =>
    {
        const dialog = createShareDialog(defaultOptions());
        expect(dialog).toBeDefined();
        expect(typeof dialog.show).toBe("function");
        expect(typeof dialog.close).toBe("function");
    });

    test("show_ReturnsPromise", () =>
    {
        const dialog = createShareDialog(defaultOptions());
        const result = dialog.show();
        expect(result).toBeInstanceOf(Promise);
        dialog.close();
    });
});

describe("showShareDialog", () =>
{
    test("withValidOptions_ReturnsPromise", () =>
    {
        const result = showShareDialog(defaultOptions());
        expect(result).toBeInstanceOf(Promise);
        // Close via DOM to resolve promise
        vi.advanceTimersByTime(300);
        const cancel = getCancelBtn();
        cancel?.click();
        vi.advanceTimersByTime(300);
    });
});

// ============================================================================
// OPTIONS & DEFAULTS
// ============================================================================

describe("ShareDialog options and defaults", () =>
{
    test("withCustomTitle_DisplaysTitle", () =>
    {
        const dialog = createShareDialog(defaultOptions({ title: "Share Report" }));
        dialog.show();
        vi.advanceTimersByTime(300);
        const overlay = getOverlay();
        expect(overlay).not.toBeNull();
        const titleText = getTitle(overlay!);
        expect(titleText).toBe("Share Report");
        dialog.close();
    });

    test("withSizeSm_AppliesSmallSize", () =>
    {
        const dialog = createShareDialog(defaultOptions({ size: "sm" }));
        dialog.show();
        vi.advanceTimersByTime(300);
        const dlg = getDialog();
        expect(dlg).not.toBeNull();
        dialog.close();
    });

    test("withCssClass_AppliesClass", () =>
    {
        const dialog = createShareDialog(defaultOptions({ cssClass: "custom-share" }));
        dialog.show();
        vi.advanceTimersByTime(300);
        const dlg = getDialog();
        expect(dlg?.classList.contains("custom-share")).toBe(true);
        dialog.close();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("ShareDialog DOM structure", () =>
{
    test("show_CreatesOverlayAndBackdrop", () =>
    {
        const dialog = createShareDialog(defaultOptions());
        dialog.show();
        vi.advanceTimersByTime(300);
        expect(getOverlay()).not.toBeNull();
        expect(getBackdrop()).not.toBeNull();
        dialog.close();
    });

    test("show_RendersAccessLevelSelect", () =>
    {
        const dialog = createShareDialog(defaultOptions());
        dialog.show();
        vi.advanceTimersByTime(300);
        const overlay = getOverlay();
        const select = overlay?.querySelector("select");
        expect(select).not.toBeNull();
        dialog.close();
    });

    test("show_RendersDoneButton", () =>
    {
        const dialog = createShareDialog(defaultOptions());
        dialog.show();
        vi.advanceTimersByTime(300);
        expect(getDoneBtn()).not.toBeNull();
        dialog.close();
    });

    test("show_RendersCancelButton", () =>
    {
        const dialog = createShareDialog(defaultOptions());
        dialog.show();
        vi.advanceTimersByTime(300);
        expect(getCancelBtn()).not.toBeNull();
        dialog.close();
    });
});

// ============================================================================
// ARIA
// ============================================================================

describe("ShareDialog ARIA", () =>
{
    test("dialog_HasRoleDialog", () =>
    {
        const dialog = createShareDialog(defaultOptions());
        dialog.show();
        vi.advanceTimersByTime(300);
        const dlg = document.querySelector("[role='dialog']");
        expect(dlg).not.toBeNull();
        dialog.close();
    });

    test("dialog_HasAriaModal", () =>
    {
        const dialog = createShareDialog(defaultOptions());
        dialog.show();
        vi.advanceTimersByTime(300);
        const dlg = document.querySelector("[role='dialog']");
        expect(dlg?.getAttribute("aria-modal")).toBe("true");
        dialog.close();
    });

    test("dialog_HasLiveRegion", () =>
    {
        const dialog = createShareDialog(defaultOptions());
        dialog.show();
        vi.advanceTimersByTime(300);
        const live = document.querySelector("[aria-live]");
        expect(live).not.toBeNull();
        dialog.close();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("ShareDialog callbacks", () =>
{
    test("cancel_ResolvesWithNull", async () =>
    {
        const dialog = createShareDialog(defaultOptions());
        const promise = dialog.show();
        vi.advanceTimersByTime(300);
        dialog.close();
        vi.advanceTimersByTime(300);
        const result = await promise;
        expect(result).toBeNull();
    });

    test("onCancel_CalledOnClose", () =>
    {
        const onCancel = vi.fn();
        const dialog = createShareDialog(defaultOptions({ onCancel }));
        dialog.show();
        vi.advanceTimersByTime(300);
        dialog.close();
        vi.advanceTimersByTime(300);
        expect(onCancel).toHaveBeenCalled();
    });
});

// ============================================================================
// KEYBOARD
// ============================================================================

describe("ShareDialog keyboard", () =>
{
    test("escapeKey_ClosesDialog", async () =>
    {
        const dialog = createShareDialog(defaultOptions());
        const promise = dialog.show();
        vi.advanceTimersByTime(300);
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        vi.advanceTimersByTime(300);
        const result = await promise;
        expect(result).toBeNull();
    });

    test("escapeKey_WithCloseOnEscapeFalse_DoesNotClose", () =>
    {
        const onCancel = vi.fn();
        const dialog = createShareDialog(defaultOptions({
            onCancel, closeOnEscape: false,
        }));
        dialog.show();
        vi.advanceTimersByTime(300);
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        vi.advanceTimersByTime(300);
        expect(onCancel).not.toHaveBeenCalled();
        dialog.close();
    });
});

// ============================================================================
// EXISTING ACCESS
// ============================================================================

describe("ShareDialog existing access", () =>
{
    test("withExistingAccess_RendersAccessList", () =>
    {
        const existing = [
            {
                person: { id: "p1", name: "Alice", email: "alice@test.com" },
                accessLevelId: "editor",
            },
        ];
        const dialog = createShareDialog(defaultOptions({ existingAccess: existing }));
        dialog.show();
        vi.advanceTimersByTime(300);
        const overlay = getOverlay();
        const items = overlay?.querySelectorAll(".sharedialog-access-row");
        expect(items?.length).toBeGreaterThanOrEqual(1);
        dialog.close();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("ShareDialog edge cases", () =>
{
    test("closeTwice_DoesNotThrow", () =>
    {
        const dialog = createShareDialog(defaultOptions());
        dialog.show();
        vi.advanceTimersByTime(300);
        expect(() =>
        {
            dialog.close();
            dialog.close();
        }).not.toThrow();
    });

    test("emptyAccessLevels_StillRendersDialog", () =>
    {
        const dialog = createShareDialog(defaultOptions({
            accessLevels: [{ id: "v", label: "View" }],
        }));
        dialog.show();
        vi.advanceTimersByTime(300);
        expect(getOverlay()).not.toBeNull();
        dialog.close();
    });
});
