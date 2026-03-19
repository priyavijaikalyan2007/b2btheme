/**
 * TESTS: ConfirmDialog
 * Comprehensive unit tests for the ConfirmDialog confirmation modal.
 * Tests cover: factory function, class API, options, DOM structure,
 * confirm/cancel callbacks, keyboard (Escape cancels), ARIA accessibility,
 * backdrop click, variants, and edge cases.
 *
 * Copyright (c) 2026 PVK2007. All rights reserved.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    ConfirmDialog,
    showConfirmDialog,
    showDangerConfirmDialog,
    ConfirmDialogOptions,
} from "./confirmdialog";

// ============================================================================
// HELPERS
// ============================================================================

function getBackdrop(): HTMLElement | null
{
    return document.querySelector(".confirmdialog-backdrop");
}

function getDialog(): HTMLElement | null
{
    return document.querySelector(".confirmdialog");
}

function getConfirmButton(): HTMLElement | null
{
    return document.querySelector(".confirmdialog-confirm");
}

function getCancelButton(): HTMLElement | null
{
    return document.querySelector(".confirmdialog-cancel");
}

function getCloseButton(): HTMLElement | null
{
    return document.querySelector(".confirmdialog-close");
}

function getTitleEl(): HTMLElement | null
{
    return document.querySelector(".confirmdialog-title");
}

function getMessageEl(): HTMLElement | null
{
    return document.querySelector(".confirmdialog-message");
}

function fireKeydown(
    key: string,
    extra?: Partial<KeyboardEventInit>
): void
{
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...extra,
    });
    document.dispatchEvent(event);
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
});

afterEach(() =>
{
    // Clean up any lingering dialogs
    const backdrops = document.querySelectorAll(".confirmdialog-backdrop");
    backdrops.forEach((b) => b.remove());
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ============================================================================
// FACTORY — ConfirmDialog class
// ============================================================================

describe("ConfirmDialog constructor", () =>
{
    test("constructor_WithMessage_CreatesInstance", () =>
    {
        const dialog = new ConfirmDialog({
            message: "Are you sure?",
        });
        expect(dialog).toBeDefined();
        expect(dialog).toBeInstanceOf(ConfirmDialog);
    });

    test("constructor_WithEmptyMessage_LogsError", () =>
    {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        new ConfirmDialog({ message: "" });
        expect(spy).toHaveBeenCalled();
    });
});

// ============================================================================
// CONVENIENCE FUNCTION — showConfirmDialog
// ============================================================================

describe("showConfirmDialog", () =>
{
    test("showConfirmDialog_ReturnsPromise", () =>
    {
        const result = showConfirmDialog({
            message: "Proceed?",
        });
        expect(result).toBeInstanceOf(Promise);
        // Clean up by cancelling
        fireKeydown("Escape");
    });

    test("showConfirmDialog_MountsDialogInBody", () =>
    {
        showConfirmDialog({ message: "Test" });
        expect(getBackdrop()).not.toBeNull();
        // Clean up
        fireKeydown("Escape");
    });
});

// ============================================================================
// CONVENIENCE FUNCTION — showDangerConfirmDialog
// ============================================================================

describe("showDangerConfirmDialog", () =>
{
    test("showDangerConfirmDialog_UsesDangerVariant", () =>
    {
        showDangerConfirmDialog("Delete this?");
        const dialog = getDialog()!;
        expect(
            dialog.classList.contains("confirmdialog-danger")
        ).toBe(true);
        fireKeydown("Escape");
    });

    test("showDangerConfirmDialog_HasDeleteLabel", () =>
    {
        showDangerConfirmDialog("Delete this?");
        const btn = getConfirmButton()!;
        expect(btn.textContent).toBe("Delete");
        fireKeydown("Escape");
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("show_CreatesBackdropAndDialog", () =>
    {
        showConfirmDialog({ message: "Test" });
        expect(getBackdrop()).not.toBeNull();
        expect(getDialog()).not.toBeNull();
        fireKeydown("Escape");
    });

    test("show_RendersHeaderBodyFooter", () =>
    {
        showConfirmDialog({ message: "Test" });
        expect(
            document.querySelector(".confirmdialog-header")
        ).not.toBeNull();
        expect(
            document.querySelector(".confirmdialog-body")
        ).not.toBeNull();
        expect(
            document.querySelector(".confirmdialog-footer")
        ).not.toBeNull();
        fireKeydown("Escape");
    });

    test("show_WithTitle_DisplaysTitleText", () =>
    {
        showConfirmDialog({
            title: "Confirm Delete",
            message: "Are you sure?",
        });
        const title = getTitleEl()!;
        expect(title.textContent).toBe("Confirm Delete");
        fireKeydown("Escape");
    });

    test("show_DefaultTitle_IsConfirm", () =>
    {
        showConfirmDialog({ message: "Proceed?" });
        const title = getTitleEl()!;
        expect(title.textContent).toBe("Confirm");
        fireKeydown("Escape");
    });

    test("show_DisplaysMessageText", () =>
    {
        showConfirmDialog({ message: "This action is irreversible." });
        const msg = getMessageEl()!;
        expect(msg.textContent).toBe("This action is irreversible.");
        fireKeydown("Escape");
    });

    test("show_WithCloseButton_RendersXButton", () =>
    {
        showConfirmDialog({ message: "Test" });
        expect(getCloseButton()).not.toBeNull();
        fireKeydown("Escape");
    });
});

// ============================================================================
// CONFIRM / CANCEL CALLBACKS
// ============================================================================

describe("confirm/cancel callbacks", () =>
{
    test("clickConfirm_ResolvesTrue", async () =>
    {
        const promise = showConfirmDialog({
            message: "Proceed?",
        });
        const btn = getConfirmButton()!;
        btn.click();
        const result = await promise;
        expect(result).toBe(true);
    });

    test("clickCancel_ResolvesFalse", async () =>
    {
        const promise = showConfirmDialog({
            message: "Proceed?",
        });
        const btn = getCancelButton()!;
        btn.click();
        const result = await promise;
        expect(result).toBe(false);
    });

    test("clickConfirm_FiresOnConfirmCallback", async () =>
    {
        const onConfirm = vi.fn();
        const promise = showConfirmDialog({
            message: "Proceed?",
            onConfirm,
        });
        getConfirmButton()!.click();
        await promise;
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    test("clickCancel_FiresOnCancelCallback", async () =>
    {
        const onCancel = vi.fn();
        const promise = showConfirmDialog({
            message: "Proceed?",
            onCancel,
        });
        getCancelButton()!.click();
        await promise;
        expect(onCancel).toHaveBeenCalledOnce();
    });

    test("clickClose_ResolvesFalse", async () =>
    {
        const promise = showConfirmDialog({
            message: "Proceed?",
        });
        getCloseButton()!.click();
        const result = await promise;
        expect(result).toBe(false);
    });

    test("confirmButton_RemovesDialogFromDom", async () =>
    {
        const promise = showConfirmDialog({
            message: "Proceed?",
        });
        getConfirmButton()!.click();
        await promise;
        expect(getBackdrop()).toBeNull();
    });

    test("cancelButton_RemovesDialogFromDom", async () =>
    {
        const promise = showConfirmDialog({
            message: "Proceed?",
        });
        getCancelButton()!.click();
        await promise;
        expect(getBackdrop()).toBeNull();
    });
});

// ============================================================================
// KEYBOARD — ESCAPE
// ============================================================================

describe("keyboard Escape", () =>
{
    test("escape_ResolvesFalse", async () =>
    {
        const promise = showConfirmDialog({
            message: "Proceed?",
        });
        fireKeydown("Escape");
        const result = await promise;
        expect(result).toBe(false);
    });

    test("escape_RemovesDialog", async () =>
    {
        const promise = showConfirmDialog({
            message: "Proceed?",
        });
        fireKeydown("Escape");
        await promise;
        expect(getBackdrop()).toBeNull();
    });

    test("escape_FiresOnCancelCallback", async () =>
    {
        const onCancel = vi.fn();
        const promise = showConfirmDialog({
            message: "Proceed?",
            onCancel,
        });
        fireKeydown("Escape");
        await promise;
        expect(onCancel).toHaveBeenCalledOnce();
    });
});

// ============================================================================
// ARIA ACCESSIBILITY
// ============================================================================

describe("ARIA attributes", () =>
{
    test("dialog_HasAlertDialogRole", () =>
    {
        showConfirmDialog({ message: "Test" });
        const dialog = getDialog()!;
        expect(dialog.getAttribute("role")).toBe("alertdialog");
        fireKeydown("Escape");
    });

    test("dialog_HasAriaModal", () =>
    {
        showConfirmDialog({ message: "Test" });
        const dialog = getDialog()!;
        expect(dialog.getAttribute("aria-modal")).toBe("true");
        fireKeydown("Escape");
    });

    test("dialog_HasAriaLabelledby", () =>
    {
        showConfirmDialog({ message: "Test" });
        const dialog = getDialog()!;
        const labelledBy = dialog.getAttribute("aria-labelledby");
        expect(labelledBy).toBeTruthy();
        // Referenced element should exist
        const titleEl = document.querySelector(`#${labelledBy}`);
        expect(titleEl).not.toBeNull();
        fireKeydown("Escape");
    });

    test("dialog_HasAriaDescribedby", () =>
    {
        showConfirmDialog({ message: "Test" });
        const dialog = getDialog()!;
        const describedBy = dialog.getAttribute("aria-describedby");
        expect(describedBy).toBeTruthy();
        // Referenced element should exist
        const msgEl = document.querySelector(`#${describedBy}`);
        expect(msgEl).not.toBeNull();
        fireKeydown("Escape");
    });

    test("closeButton_HasAriaLabel", () =>
    {
        showConfirmDialog({ message: "Test" });
        const btn = getCloseButton()!;
        expect(btn.getAttribute("aria-label")).toBe("Close");
        fireKeydown("Escape");
    });
});

// ============================================================================
// VARIANTS
// ============================================================================

describe("variants", () =>
{
    test("dangerVariant_HasDangerClass", () =>
    {
        showConfirmDialog({
            message: "Delete?",
            variant: "danger",
        });
        const dialog = getDialog()!;
        expect(
            dialog.classList.contains("confirmdialog-danger")
        ).toBe(true);
        fireKeydown("Escape");
    });

    test("warningVariant_HasWarningClass", () =>
    {
        showConfirmDialog({
            message: "Caution?",
            variant: "warning",
        });
        const dialog = getDialog()!;
        expect(
            dialog.classList.contains("confirmdialog-warning")
        ).toBe(true);
        fireKeydown("Escape");
    });

    test("infoVariant_HasInfoClass", () =>
    {
        showConfirmDialog({
            message: "Note",
            variant: "info",
        });
        const dialog = getDialog()!;
        expect(
            dialog.classList.contains("confirmdialog-info")
        ).toBe(true);
        fireKeydown("Escape");
    });

    test("dangerVariant_UsesDangerButton", () =>
    {
        showConfirmDialog({
            message: "Delete?",
            variant: "danger",
        });
        const btn = getConfirmButton()!;
        expect(btn.classList.contains("btn-danger")).toBe(true);
        fireKeydown("Escape");
    });

    test("defaultVariant_UsesPrimaryButton", () =>
    {
        showConfirmDialog({ message: "Proceed?" });
        const btn = getConfirmButton()!;
        expect(btn.classList.contains("btn-primary")).toBe(true);
        fireKeydown("Escape");
    });
});

// ============================================================================
// OPTIONS — showCancel, labels
// ============================================================================

describe("options", () =>
{
    test("showCancel_False_HidesCancelButton", () =>
    {
        showConfirmDialog({
            message: "OK only",
            showCancel: false,
        });
        expect(getCancelButton()).toBeNull();
        fireKeydown("Escape");
    });

    test("confirmLabel_CustomText_SetsButtonText", () =>
    {
        showConfirmDialog({
            message: "Proceed?",
            confirmLabel: "Yes, do it",
        });
        const btn = getConfirmButton()!;
        expect(btn.textContent).toBe("Yes, do it");
        fireKeydown("Escape");
    });

    test("cancelLabel_CustomText_SetsButtonText", () =>
    {
        showConfirmDialog({
            message: "Proceed?",
            cancelLabel: "No thanks",
        });
        const btn = getCancelButton()!;
        expect(btn.textContent).toBe("No thanks");
        fireKeydown("Escape");
    });
});

// ============================================================================
// BACKDROP CLICK
// ============================================================================

describe("backdrop click", () =>
{
    test("backdropClick_WhenEnabled_ResolvesFalse", async () =>
    {
        const promise = showConfirmDialog({
            message: "Click outside?",
            closeOnBackdrop: true,
        });
        const backdrop = getBackdrop()!;
        backdrop.click();
        const result = await promise;
        expect(result).toBe(false);
    });
});
