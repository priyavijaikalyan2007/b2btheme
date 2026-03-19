/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b0c1d2e3-f4a5-4b6c-7d8e-9f0a1b2c3d4e
 *
 * ⚓ TESTS: BannerBar
 * Vitest unit tests for the BannerBar component.
 * Covers: factory, variants, message/title rendering, closable,
 * action button, show/hide, destroy, ARIA.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    BannerBar,
    createBannerBar,
} from "./bannerbar";
import type { BannerBarOptions } from "./bannerbar";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<BannerBarOptions>
): BannerBarOptions
{
    return {
        message: "Test banner message",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "banner-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
    // Clean up any banners appended to body
    document.querySelectorAll(".bannerbar").forEach(el => el.remove());
});

// ============================================================================
// FACTORY
// ============================================================================

describe("BannerBar factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const banner = new BannerBar(makeOptions());
        expect(banner).toBeDefined();
        banner.destroy();
    });

    test("createBannerBar_ShowsImmediately", () =>
    {
        const banner = createBannerBar(makeOptions());
        expect(banner.isVisible()).toBe(true);
        banner.destroy();
    });
});

// ============================================================================
// VARIANTS
// ============================================================================

describe("BannerBar variants", () =>
{
    test("InfoVariant_HasInfoClass", () =>
    {
        const banner = new BannerBar(makeOptions({ variant: "info" }));
        banner.show();
        const root = document.querySelector(".bannerbar");
        expect(root?.classList.contains("bannerbar-info")).toBe(true);
        banner.destroy();
    });

    test("WarningVariant_HasWarningClass", () =>
    {
        const banner = new BannerBar(makeOptions({ variant: "warning" }));
        banner.show();
        const root = document.querySelector(".bannerbar");
        expect(root?.classList.contains("bannerbar-warning")).toBe(true);
        banner.destroy();
    });

    test("CriticalVariant_HasCriticalClass", () =>
    {
        const banner = new BannerBar(makeOptions({ variant: "critical" }));
        banner.show();
        const root = document.querySelector(".bannerbar");
        expect(root?.classList.contains("bannerbar-critical")).toBe(true);
        banner.destroy();
    });

    test("SuccessVariant_HasSuccessClass", () =>
    {
        const banner = new BannerBar(makeOptions({ variant: "success" }));
        banner.show();
        const root = document.querySelector(".bannerbar");
        expect(root?.classList.contains("bannerbar-success")).toBe(true);
        banner.destroy();
    });
});

// ============================================================================
// MESSAGE & TITLE
// ============================================================================

describe("BannerBar content", () =>
{
    test("Message_RendersMessageText", () =>
    {
        const banner = new BannerBar(makeOptions({
            message: "System update available",
        }));
        banner.show();
        const msgEl = document.querySelector(".bannerbar-message");
        expect(msgEl?.textContent).toContain("System update available");
        banner.destroy();
    });

    test("WithTitle_RendersTitleText", () =>
    {
        const banner = new BannerBar(makeOptions({
            title: "Alert",
            message: "Something happened",
        }));
        banner.show();
        const titleEl = document.querySelector(".bannerbar-title");
        expect(titleEl?.textContent).toContain("Alert");
        banner.destroy();
    });
});

// ============================================================================
// CLOSABLE
// ============================================================================

describe("BannerBar closable", () =>
{
    test("ClosableTrue_HasCloseButton", () =>
    {
        const banner = new BannerBar(makeOptions({ closable: true }));
        banner.show();
        const closeBtn = document.querySelector(".bannerbar-close");
        expect(closeBtn).not.toBeNull();
        banner.destroy();
    });

    test("ClosableFalse_NoCloseButton", () =>
    {
        const banner = new BannerBar(makeOptions({ closable: false }));
        banner.show();
        const closeBtn = document.querySelector(".bannerbar-close");
        expect(closeBtn).toBeNull();
        banner.destroy();
    });
});

// ============================================================================
// ACTION BUTTON
// ============================================================================

describe("BannerBar action", () =>
{
    test("WithActionLabel_RendersActionButton", () =>
    {
        const banner = new BannerBar(makeOptions({
            actionLabel: "Learn More",
        }));
        banner.show();
        const action = document.querySelector(".bannerbar-action");
        expect(action).not.toBeNull();
        expect(action?.textContent).toContain("Learn More");
        banner.destroy();
    });

    test("OnAction_FiresCallback", () =>
    {
        const onAction = vi.fn();
        const banner = new BannerBar(makeOptions({
            actionLabel: "Click Me",
            onAction,
        }));
        banner.show();
        const action = document.querySelector(
            ".bannerbar-action"
        ) as HTMLElement;
        action?.click();
        expect(onAction).toHaveBeenCalled();
        banner.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("BannerBar lifecycle", () =>
{
    test("Show_MakesVisible", () =>
    {
        const banner = new BannerBar(makeOptions());
        banner.show();
        expect(banner.isVisible()).toBe(true);
        banner.destroy();
    });

    test("Destroy_RemovesBannerFromDOM", () =>
    {
        const banner = new BannerBar(makeOptions());
        banner.show();
        banner.destroy();
        expect(document.querySelector(".bannerbar")).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const banner = new BannerBar(makeOptions());
        banner.show();
        banner.destroy();
        expect(() => banner.destroy()).not.toThrow();
    });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

describe("BannerBar ARIA", () =>
{
    test("HasRoleAlert", () =>
    {
        const banner = new BannerBar(makeOptions());
        banner.show();
        const root = document.querySelector(".bannerbar");
        expect(root?.getAttribute("role")).toBe("alert");
        banner.destroy();
    });
});
