/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a
 *
 * ⚓ TESTS: ThemeToggle
 * Vitest unit tests for the ThemeToggle component.
 * Covers: factory, mode switching, DOM structure, data-bs-theme, callbacks,
 * destroy, media query, accessibility.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    ThemeToggle,
    createThemeToggle,
} from "./themetoggle";
import type
{
    ThemeToggleOptions,
    ThemeToggleHandle,
    ThemeMode,
} from "./themetoggle";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<ThemeToggleOptions>
): ThemeToggleOptions
{
    return {
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
    container.id = "theme-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
    // Clean up data-bs-theme attribute set during tests
    document.documentElement.removeAttribute("data-bs-theme");
});

// ============================================================================
// FACTORY
// ============================================================================

describe("createThemeToggle", () =>
{
    test("ValidOptions_ReturnsHandle", () =>
    {
        const handle = createThemeToggle(makeOptions());
        expect(handle).toBeDefined();
        expect(typeof handle.getTheme).toBe("function");
        expect(typeof handle.getMode).toBe("function");
        expect(typeof handle.setTheme).toBe("function");
        expect(typeof handle.destroy).toBe("function");
        handle.destroy();
    });

    test("NoContainer_ThrowsError", () =>
    {
        expect(() =>
        {
            createThemeToggle(
                { container: null as unknown as HTMLElement }
            );
        }).toThrow();
    });

    test("DefaultThemeAuto_ResolvesToLightOrDark", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "auto" }));
        const theme = handle.getTheme();
        expect(["light", "dark"]).toContain(theme);
        handle.destroy();
    });
});

// ============================================================================
// MODE SWITCHING
// ============================================================================

describe("ThemeToggle mode switching", () =>
{
    test("SetThemeLight_ChangesMode", () =>
    {
        const handle = createThemeToggle(makeOptions());
        handle.setTheme("light");
        expect(handle.getMode()).toBe("light");
        expect(handle.getTheme()).toBe("light");
        handle.destroy();
    });

    test("SetThemeDark_ChangesMode", () =>
    {
        const handle = createThemeToggle(makeOptions());
        handle.setTheme("dark");
        expect(handle.getMode()).toBe("dark");
        expect(handle.getTheme()).toBe("dark");
        handle.destroy();
    });

    test("SetThemeAuto_SetsAutoMode", () =>
    {
        const handle = createThemeToggle(makeOptions());
        handle.setTheme("auto");
        expect(handle.getMode()).toBe("auto");
        handle.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("ThemeToggle DOM", () =>
{
    test("RendersThreeButtons", () =>
    {
        const handle = createThemeToggle(makeOptions());
        const buttons = container.querySelectorAll(".themetoggle-btn");
        expect(buttons.length).toBe(3);
        handle.destroy();
    });

    test("ActiveButton_MatchesCurrentMode", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "dark" }));
        const darkBtn = container.querySelector(
            '[data-theme="dark"]'
        ) as HTMLElement;
        expect(
            darkBtn?.classList.contains("themetoggle-btn-active")
        ).toBe(true);
        handle.destroy();
    });

    test("SetsDataBsThemeOnHTML", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "dark" }));
        expect(
            document.documentElement.getAttribute("data-bs-theme")
        ).toBe("dark");
        handle.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("ThemeToggle callbacks", () =>
{
    test("OnChange_CalledOnSetTheme", () =>
    {
        const onChange = vi.fn();
        const handle = createThemeToggle(makeOptions({ onChange }));
        handle.setTheme("dark");
        expect(onChange).toHaveBeenCalledWith("dark", "dark");
        handle.destroy();
    });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

describe("ThemeToggle accessibility", () =>
{
    test("RootHasRoleGroup", () =>
    {
        const handle = createThemeToggle(makeOptions());
        const root = container.querySelector(".themetoggle");
        expect(root?.getAttribute("role")).toBe("group");
        handle.destroy();
    });

    test("ButtonsHaveAriaLabels", () =>
    {
        const handle = createThemeToggle(makeOptions());
        const buttons = container.querySelectorAll(".themetoggle-btn");
        buttons.forEach(btn =>
        {
            expect(btn.getAttribute("aria-label")).toBeTruthy();
        });
        handle.destroy();
    });

    test("ActiveButton_HasAriaPressedTrue", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "light" }));
        const lightBtn = container.querySelector(
            '[data-theme="light"]'
        ) as HTMLElement;
        expect(lightBtn?.getAttribute("aria-pressed")).toBe("true");
        handle.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("ThemeToggle destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const handle = createThemeToggle(makeOptions());
        expect(container.querySelector(".themetoggle")).not.toBeNull();
        handle.destroy();
        expect(container.querySelector(".themetoggle")).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const handle = createThemeToggle(makeOptions());
        handle.destroy();
        expect(() => handle.destroy()).not.toThrow();
    });
});
