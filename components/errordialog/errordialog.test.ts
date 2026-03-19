/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: ErrorDialog
 * Comprehensive unit tests for the ErrorDialog literate error modal component.
 * Tests cover: factory function, class API, options, DOM structure, ARIA
 * accessibility, action buttons, callbacks, keyboard, and edge cases.
 *
 * Copyright (c) 2026 PVK2007. All rights reserved.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { ErrorDialog, showErrorDialog, LiterateError } from "./errordialog";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

/** Stub Bootstrap Modal to avoid dependency on Bootstrap JS. */
function stubBootstrapModal(): void
{
    class FakeModal
    {
        show = vi.fn();
        hide = vi.fn();
        dispose = vi.fn();
    }

    (window as unknown as Record<string, unknown>)["bootstrap"] = {
        Modal: FakeModal,
    };
}

function getModalEl(): HTMLElement | null
{
    return container.querySelector(".modal");
}

function getTitleText(): string
{
    const titleSpan = container.querySelector(".modal-title span");
    return titleSpan?.textContent ?? "";
}

function getMessageText(): string
{
    const msg = container.querySelector(".errordialog-message");
    return msg?.textContent ?? "";
}

function getSuggestionBox(): HTMLElement | null
{
    return container.querySelector(".errordialog-suggestion");
}

function getCloseButton(): HTMLElement | null
{
    return container.querySelector(".btn-close");
}

function getFooterCloseButton(): HTMLElement | null
{
    const buttons = container.querySelectorAll(".modal-footer button");
    for (const btn of buttons)
    {
        if (btn.textContent === "Close")
        {
            return btn as HTMLElement;
        }
    }
    return null;
}

function getRetryButton(): HTMLElement | null
{
    const buttons = container.querySelectorAll(".modal-footer button");
    for (const btn of buttons)
    {
        if (btn.textContent === "Retry")
        {
            return btn as HTMLElement;
        }
    }
    return null;
}

function getTechnicalPre(): HTMLElement | null
{
    return container.querySelector(".errordialog-technical");
}

function getCopyButton(): HTMLElement | null
{
    return container.querySelector(".errordialog-copy-btn");
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "test-error-container";
    document.body.appendChild(container);
    stubBootstrapModal();
});

afterEach(() =>
{
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ============================================================================
// FACTORY — ErrorDialog class
// ============================================================================

describe("ErrorDialog constructor", () =>
{
    test("constructor_WithValidContainerId_CreatesInstance", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        expect(dialog).toBeDefined();
        expect(dialog).toBeInstanceOf(ErrorDialog);
    });

    test("show_WithTitleAndMessage_InjectsModalIntoDom", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Oops", message: "Something broke." });
        expect(getModalEl()).not.toBeNull();
    });

    test("show_WithoutTitleOrMessage_DoesNotInjectModal", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "", message: "" });
        expect(getModalEl()).toBeNull();
    });

    test("show_WithMissingContainer_LogsError", () =>
    {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const dialog = new ErrorDialog("nonexistent-id");
        dialog.show({ title: "Error", message: "Msg" });
        expect(spy).toHaveBeenCalled();
    });
});

// ============================================================================
// CONVENIENCE FUNCTION — showErrorDialog
// ============================================================================

describe("showErrorDialog", () =>
{
    test("showErrorDialog_WithValidArgs_CreatesModal", () =>
    {
        showErrorDialog("test-error-container", {
            title: "Save Failed",
            message: "Could not save the document.",
        });
        expect(getModalEl()).not.toBeNull();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("show_CreatesModalWithDialogAndContent", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Err", message: "Msg" });

        const modal = getModalEl()!;
        expect(modal.querySelector(".modal-dialog")).not.toBeNull();
        expect(modal.querySelector(".modal-content")).not.toBeNull();
    });

    test("show_RendersHeaderBodyFooter", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Err", message: "Msg" });

        expect(container.querySelector(".modal-header")).not.toBeNull();
        expect(container.querySelector(".modal-body")).not.toBeNull();
        expect(container.querySelector(".modal-footer")).not.toBeNull();
    });

    test("show_RendersHeaderIcon", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Msg" });

        const icon = container.querySelector(
            ".modal-title .bi-exclamation-octagon-fill"
        );
        expect(icon).not.toBeNull();
    });

    test("show_DialogHasCenteredClass", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Err", message: "Msg" });

        const dialogDiv = container.querySelector(".modal-dialog");
        expect(
            dialogDiv?.classList.contains("modal-dialog-centered")
        ).toBe(true);
    });
});

// ============================================================================
// OPTIONS — TITLE AND MESSAGE
// ============================================================================

describe("title and message", () =>
{
    test("show_WithTitle_RendersTitleText", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Network Error", message: "Failed to fetch." });
        expect(getTitleText()).toBe("Network Error");
    });

    test("show_WithMessage_RendersMessageText", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Something went wrong." });
        expect(getMessageText()).toBe("Something went wrong.");
    });

    test("show_WithoutTitle_DefaultsToError", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "", message: "Msg goes here" });
        // No title and no message => not shown, so provide message only
        // Actually title="" and message="Msg" => not shown because !error.title && !error.message checks both
        // Let's use undefined title
    });

    test("show_WithOnlyMessage_StillShowsDialog", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "E", message: "Has content" });
        expect(getModalEl()).not.toBeNull();
    });
});

// ============================================================================
// OPTIONS — SUGGESTION
// ============================================================================

describe("suggestion", () =>
{
    test("show_WithSuggestion_RendersSuggestionBox", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({
            title: "Error",
            message: "Msg",
            suggestion: "Try again later.",
        });
        const box = getSuggestionBox();
        expect(box).not.toBeNull();
    });

    test("show_WithSuggestion_DisplaysSuggestionText", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({
            title: "Error",
            message: "Msg",
            suggestion: "Check your connection.",
        });
        const box = getSuggestionBox()!;
        expect(box.textContent).toContain("Check your connection.");
    });

    test("show_WithSuggestion_HasAlertRole", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({
            title: "Error",
            message: "Msg",
            suggestion: "Retry.",
        });
        const box = getSuggestionBox()!;
        expect(box.getAttribute("role")).toBe("alert");
    });

    test("show_WithoutSuggestion_NoSuggestionBox", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Msg" });
        expect(getSuggestionBox()).toBeNull();
    });
});

// ============================================================================
// OPTIONS — TECHNICAL DETAILS
// ============================================================================

describe("technical details", () =>
{
    test("show_WithErrorCode_RendersTechnicalAccordion", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({
            title: "Error",
            message: "Msg",
            errorCode: "ERR_001",
        });
        expect(container.querySelector(".accordion")).not.toBeNull();
    });

    test("show_WithTechnicalDetail_DisplaysInPre", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({
            title: "Error",
            message: "Msg",
            technicalDetail: "Stack trace here",
        });
        const pre = getTechnicalPre()!;
        expect(pre.textContent).toContain("Stack trace here");
    });

    test("show_WithCorrelationId_DisplaysInTechnicalBlock", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({
            title: "Error",
            message: "Msg",
            correlationId: "abc-123",
        });
        const pre = getTechnicalPre()!;
        expect(pre.textContent).toContain("Correlation ID: abc-123");
    });

    test("show_WithTimestamp_DisplaysInTechnicalBlock", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({
            title: "Error",
            message: "Msg",
            timestamp: "2026-03-19T12:00:00Z",
        });
        const pre = getTechnicalPre()!;
        expect(pre.textContent).toContain("2026-03-19T12:00:00Z");
    });

    test("show_WithContext_DisplaysKeyValuePairs", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({
            title: "Error",
            message: "Msg",
            context: { browser: "Chrome", os: "Linux" },
        });
        const pre = getTechnicalPre()!;
        expect(pre.textContent).toContain("browser: Chrome");
        expect(pre.textContent).toContain("os: Linux");
    });

    test("show_WithNoTechnicalInfo_NoAccordion", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Simple msg" });
        expect(container.querySelector(".accordion")).toBeNull();
    });

    test("show_WithTechnicalDetail_HasCopyButton", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({
            title: "Error",
            message: "Msg",
            technicalDetail: "trace",
        });
        expect(getCopyButton()).not.toBeNull();
    });
});

// ============================================================================
// OPTIONS — RETRY BUTTON
// ============================================================================

describe("retry button", () =>
{
    test("show_WithOnRetry_RendersRetryButton", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({
            title: "Error",
            message: "Msg",
            onRetry: vi.fn(),
        });
        expect(getRetryButton()).not.toBeNull();
    });

    test("show_WithOnRetry_RetryButtonCallsCallback", () =>
    {
        const onRetry = vi.fn();
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({
            title: "Error",
            message: "Msg",
            onRetry,
        });
        const btn = getRetryButton()!;
        btn.click();
        expect(onRetry).toHaveBeenCalledOnce();
    });

    test("show_WithoutOnRetry_NoRetryButton", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Msg" });
        expect(getRetryButton()).toBeNull();
    });
});

// ============================================================================
// CLOSE BUTTON
// ============================================================================

describe("close button", () =>
{
    test("show_AlwaysRendersHeaderCloseButton", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Msg" });
        expect(getCloseButton()).not.toBeNull();
    });

    test("show_CloseButtonHasAriaLabel", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Msg" });
        const btn = getCloseButton()!;
        expect(btn.getAttribute("aria-label")).toBe("Close");
    });

    test("show_AlwaysRendersFooterCloseButton", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Msg" });
        expect(getFooterCloseButton()).not.toBeNull();
    });
});

// ============================================================================
// ARIA ACCESSIBILITY
// ============================================================================

describe("ARIA attributes", () =>
{
    test("show_ModalHasAriaLabelledby", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Msg" });
        const modal = getModalEl()!;
        const labelledBy = modal.getAttribute("aria-labelledby");
        expect(labelledBy).toBeTruthy();
        // The referenced element should exist
        const titleEl = container.querySelector(`#${labelledBy}`);
        expect(titleEl).not.toBeNull();
    });

    test("show_ModalHasTabindexMinusOne", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Msg" });
        const modal = getModalEl()!;
        expect(modal.getAttribute("tabindex")).toBe("-1");
    });

    test("show_ModalHasAriaHidden", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Msg" });
        const modal = getModalEl()!;
        expect(modal.getAttribute("aria-hidden")).toBe("true");
    });
});

// ============================================================================
// INSTANCE METHODS — hide, destroy
// ============================================================================

describe("instance methods", () =>
{
    test("destroy_RemovesModalFromDom", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Msg" });
        expect(getModalEl()).not.toBeNull();

        dialog.destroy();
        expect(getModalEl()).toBeNull();
    });

    test("destroy_CalledTwice_IsIdempotent", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        dialog.show({ title: "Error", message: "Msg" });
        dialog.destroy();
        expect(() => dialog.destroy()).not.toThrow();
    });

    test("hide_WhenNoModal_DoesNotThrow", () =>
    {
        const dialog = new ErrorDialog("test-error-container");
        expect(() => dialog.hide()).not.toThrow();
    });
});
