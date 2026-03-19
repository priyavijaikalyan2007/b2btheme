/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Toast
 * Spec-based tests for the Toast notification component.
 * Tests cover: factory functions, variants, options, handle methods,
 * keyboard navigation, queue management, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    showToast,
    showInfoToast,
    showSuccessToast,
    showWarningToast,
    showErrorToast,
    clearAllToasts,
    configureToasts,
} from "./toast";

// ============================================================================
// HELPERS
// ============================================================================

function getContainer(): HTMLElement | null
{
    return document.querySelector(".pvk-toast-container");
}

function getToasts(): HTMLElement[]
{
    return Array.from(
        document.querySelectorAll(".pvk-toast:not(.pvk-toast-exiting)")
    );
}

function getToastBody(toast: HTMLElement): string
{
    const body = toast.querySelector(".pvk-toast-body");
    return body?.textContent ?? "";
}

function getCloseBtn(toast: HTMLElement): HTMLElement | null
{
    return toast.querySelector(".pvk-toast-close") as HTMLElement | null;
}

function getProgressBar(toast: HTMLElement): HTMLElement | null
{
    return toast.querySelector(".pvk-toast-progress-fill") as HTMLElement | null;
}

function getActionBtn(toast: HTMLElement): HTMLElement | null
{
    return toast.querySelector(".pvk-toast-action") as HTMLElement | null;
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
    clearAllToasts();
    vi.advanceTimersByTime(500);
    vi.useRealTimers();
});

// ============================================================================
// FACTORY FUNCTION — showToast
// ============================================================================

describe("showToast", () =>
{
    test("withValidMessage_CreatesContainerInBody", () =>
    {
        showToast({ message: "Hello" });
        const container = getContainer();
        expect(container).not.toBeNull();
        expect(container?.parentElement).toBe(document.body);
    });

    test("withValidMessage_ReturnsHandleWithElement", () =>
    {
        const handle = showToast({ message: "Test" });
        expect(handle).toBeDefined();
        expect(handle.element).toBeInstanceOf(HTMLElement);
    });

    test("withValidMessage_RendersMessageText", () =>
    {
        const h = showToast({ message: "Notification text" });
        expect(getToastBody(h.element)).toBe("Notification text");
    });

    test("withTitle_RendersTitle", () =>
    {
        const h = showToast({ message: "Body", title: "Heading" });
        const title = h.element.querySelector(".pvk-toast-title");
        expect(title).not.toBeNull();
        expect(title?.textContent).toBe("Heading");
    });

    test("withoutTitle_OmitsTitleElement", () =>
    {
        const h = showToast({ message: "Body only" });
        const title = h.element.querySelector(".pvk-toast-title");
        expect(title).toBeNull();
    });
});

// ============================================================================
// VARIANTS
// ============================================================================

describe("showToast variants", () =>
{
    test("defaultVariant_IsInfo", () =>
    {
        const h = showToast({ message: "Test" });
        expect(h.element.classList.contains("pvk-toast-info")).toBe(true);
    });

    test("successVariant_SetsSuccessClass", () =>
    {
        const h = showToast({ message: "Test", variant: "success" });
        expect(h.element.classList.contains("pvk-toast-success")).toBe(true);
    });

    test("warningVariant_SetsWarningClass", () =>
    {
        const h = showToast({ message: "Test", variant: "warning" });
        expect(h.element.classList.contains("pvk-toast-warning")).toBe(true);
    });

    test("errorVariant_SetsErrorClass", () =>
    {
        const h = showToast({ message: "Test", variant: "error" });
        expect(h.element.classList.contains("pvk-toast-error")).toBe(true);
    });

    test("errorVariant_SetsAlertRole", () =>
    {
        const h = showToast({ message: "Test", variant: "error" });
        expect(h.element.getAttribute("role")).toBe("alert");
    });

    test("infoVariant_SetsStatusRole", () =>
    {
        const h = showToast({ message: "Test", variant: "info" });
        expect(h.element.getAttribute("role")).toBe("status");
    });
});

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

describe("convenience functions", () =>
{
    test("showInfoToast_CreatesInfoVariant", () =>
    {
        const h = showInfoToast("Info message");
        expect(h.element.classList.contains("pvk-toast-info")).toBe(true);
    });

    test("showSuccessToast_CreatesSuccessVariant", () =>
    {
        const h = showSuccessToast("Success message");
        expect(h.element.classList.contains("pvk-toast-success")).toBe(true);
    });

    test("showWarningToast_CreatesWarningVariant", () =>
    {
        const h = showWarningToast("Warning message");
        expect(h.element.classList.contains("pvk-toast-warning")).toBe(true);
    });

    test("showErrorToast_CreatesErrorVariant", () =>
    {
        const h = showErrorToast("Error message");
        expect(h.element.classList.contains("pvk-toast-error")).toBe(true);
    });
});

// ============================================================================
// OPTIONS — DISMISSIBLE
// ============================================================================

describe("dismissible option", () =>
{
    test("defaultTrue_ShowsCloseButton", () =>
    {
        const h = showToast({ message: "Test" });
        expect(getCloseBtn(h.element)).not.toBeNull();
    });

    test("false_HidesCloseButton", () =>
    {
        const h = showToast({ message: "Test", dismissible: false });
        expect(getCloseBtn(h.element)).toBeNull();
    });
});

// ============================================================================
// OPTIONS — PROGRESS BAR
// ============================================================================

describe("progress bar", () =>
{
    test("defaultTrue_ShowsProgressBar", () =>
    {
        const h = showToast({ message: "Test" });
        expect(getProgressBar(h.element)).not.toBeNull();
    });

    test("false_HidesProgressBar", () =>
    {
        const h = showToast({ message: "Test", showProgress: false });
        expect(getProgressBar(h.element)).toBeNull();
    });
});

// ============================================================================
// OPTIONS — DURATION
// ============================================================================

describe("auto-dismiss", () =>
{
    test("defaultDuration_StartsExitAfter5000ms", () =>
    {
        const h = showToast({ message: "Test" });
        // Not exiting yet
        expect(h.element.classList.contains("pvk-toast-exiting")).toBe(false);

        // Advance past default 5000ms duration
        vi.advanceTimersByTime(5100);
        // Should now be in exit animation
        expect(h.element.classList.contains("pvk-toast-exiting")).toBe(true);
    });

    test("zeroDuration_PersistsIndefinitely", () =>
    {
        const h = showToast({ message: "Test", duration: 0 });
        vi.advanceTimersByTime(60000);
        expect(h.element.classList.contains("pvk-toast-exiting")).toBe(false);
    });
});

// ============================================================================
// OPTIONS — ACTION BUTTON
// ============================================================================

describe("action button", () =>
{
    test("withActionLabel_RendersButton", () =>
    {
        const h = showToast({ message: "Test", actionLabel: "Undo" });
        const btn = getActionBtn(h.element);
        expect(btn).not.toBeNull();
        expect(btn?.textContent).toBe("Undo");
    });

    test("withoutActionLabel_NoButton", () =>
    {
        const h = showToast({ message: "Test" });
        expect(getActionBtn(h.element)).toBeNull();
    });

    test("actionCallback_FiresOnClick", () =>
    {
        const onAction = vi.fn();
        const h = showToast({
            message: "Test",
            actionLabel: "Undo",
            onAction,
        });
        const btn = getActionBtn(h.element)!;
        btn.click();
        expect(onAction).toHaveBeenCalledOnce();
    });
});

// ============================================================================
// OPTIONS — CALLBACKS
// ============================================================================

describe("onDismiss callback", () =>
{
    test("firesWhenDismissedProgrammatically", () =>
    {
        const onDismiss = vi.fn();
        const handle = showToast({ message: "Test", onDismiss });
        handle.dismiss();
        vi.advanceTimersByTime(500);
        expect(onDismiss).toHaveBeenCalledOnce();
    });
});

// ============================================================================
// HANDLE — dismiss()
// ============================================================================

describe("handle.dismiss()", () =>
{
    test("addExitingClass", () =>
    {
        const handle = showToast({ message: "Test", duration: 0 });
        handle.dismiss();
        expect(handle.element.classList.contains("pvk-toast-exiting")).toBe(true);
    });

    test("calledTwice_IsIdempotent", () =>
    {
        const onDismiss = vi.fn();
        const handle = showToast({ message: "Test", duration: 0, onDismiss });
        handle.dismiss();
        handle.dismiss();
        vi.advanceTimersByTime(500);
        expect(onDismiss).toHaveBeenCalledOnce();
    });
});

// ============================================================================
// clearAllToasts
// ============================================================================

describe("clearAllToasts", () =>
{
    test("dismissesAllVisibleToasts", () =>
    {
        const h1 = showToast({ message: "One", duration: 0 });
        const h2 = showToast({ message: "Two", duration: 0 });
        const h3 = showToast({ message: "Three", duration: 0 });

        clearAllToasts();
        vi.advanceTimersByTime(500);

        expect(h1.element.classList.contains("pvk-toast-exiting")).toBe(true);
        expect(h2.element.classList.contains("pvk-toast-exiting")).toBe(true);
        expect(h3.element.classList.contains("pvk-toast-exiting")).toBe(true);
    });
});

// ============================================================================
// CONTAINER CONFIGURATION
// ============================================================================

describe("configureToasts", () =>
{
    test("setsContainerPosition", () =>
    {
        configureToasts({ position: "bottom-left" });
        showToast({ message: "Test" });
        // Find the container that has the position class
        const containers = document.querySelectorAll(".pvk-toast-container");
        const hasPosition = Array.from(containers).some(
            (c) => c.classList.contains("pvk-toast-container-bottom-left")
        );
        expect(hasPosition).toBe(true);
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("containerHasAriaLiveRegion", () =>
    {
        const h = showToast({ message: "Test" });
        // The toast's parent container should have aria-live
        const container = h.element.parentElement;
        expect(container?.getAttribute("aria-live")).toBe("polite");
        expect(container?.getAttribute("role")).toBe("region");
    });

    test("closeButtonHasAriaLabel", () =>
    {
        const h = showToast({ message: "Test" });
        const btn = getCloseBtn(h.element);
        expect(btn?.getAttribute("aria-label")).toBeTruthy();
    });
});

// ============================================================================
// ICON
// ============================================================================

describe("icon", () =>
{
    test("defaultIcon_MatchesVariant", () =>
    {
        const h = showToast({ message: "Test", variant: "success" });
        const icon = h.element.querySelector(".pvk-toast-icon");
        expect(icon).not.toBeNull();
        expect(icon?.classList.contains("bi-check-circle-fill")).toBe(true);
    });

    test("customIcon_OverridesDefault", () =>
    {
        const h = showToast({ message: "Test", icon: "bi-bell" });
        const icon = h.element.querySelector(".pvk-toast-icon");
        expect(icon?.classList.contains("bi-bell")).toBe(true);
    });
});

// ============================================================================
// PERFORMANCE
// ============================================================================

describe("performance", () =>
{
    test("rapidFire100Toasts_NoExceptions", () =>
    {
        expect(() =>
        {
            for (let i = 0; i < 100; i++)
            {
                showToast({ message: `Toast ${i}` });
            }
        }).not.toThrow();
    });
});
