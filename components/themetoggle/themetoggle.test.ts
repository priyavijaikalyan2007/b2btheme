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
import { destroyProbe } from "../../tests/destroy-probe";
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
        const probe = destroyProbe();

        handle.destroy();
        const first = probe.total();
        handle.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });
});

// ============================================================================
// SURFACE CONTRACT (B4)
// ============================================================================

describe("surface contract (B4)", () =>
{
    function clickMode(mode: ThemeMode): void
    {
        container.querySelector<HTMLElement>(`[data-theme="${mode}"]`)!
            .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }

    test("OnChange_ClickingAButton_DeliversThemeAndMode", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "light" }));
        const heard = vi.fn();
        handle.on("change", heard);

        clickMode("dark");

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith({ theme: "dark", mode: "dark" });
        handle.destroy();
    });

    test("OnChange_LegacyOnChangeFiresFirstAndOnce_ThenChannel", () =>
    {
        const order: string[] = [];
        const handle = createThemeToggle(makeOptions({
            defaultTheme: "light",
            onChange: (theme, mode) => order.push(`option:${theme}:${mode}`),
        }));
        handle.on("change", (p) => order.push(`channel:${JSON.stringify(p)}`));

        clickMode("dark");

        expect(order).toEqual(["option:dark:dark", `channel:${JSON.stringify({ theme: "dark", mode: "dark" })}`]);
        handle.destroy();
    });

    test("OnChange_WithoutLegacyOnChange_StillEmits", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "light" }));
        const heard = vi.fn();
        handle.on("change", heard);

        clickMode("dark");

        expect(heard).toHaveBeenCalledTimes(1);
        handle.destroy();
    });

    test("OnChange_SetTheme_Emits", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "light" }));
        const heard = vi.fn();
        handle.on("change", heard);

        handle.setTheme("dark");

        expect(heard).toHaveBeenCalledWith({ theme: "dark", mode: "dark" });
        handle.destroy();
    });

    test("OnChange_NotEmittedOnConstruction", () =>
    {
        const onChange = vi.fn();
        const handle = createThemeToggle(makeOptions({ onChange }));
        const heard = vi.fn();
        handle.on("change", heard);

        expect(onChange).not.toHaveBeenCalled();
        expect(heard).not.toHaveBeenCalled();
        handle.destroy();
    });

    test("OnChange_OsPreferenceChangeInAutoMode_Emits", () =>
    {
        const original = window.matchMedia;
        let listener: ((e: MediaQueryListEvent) => void) | null = null;
        window.matchMedia = ((query: string) => ({
            matches: false,
            media: query,
            addEventListener: (_t: string, l: (e: MediaQueryListEvent) => void) => { listener = l; },
            removeEventListener: () => { listener = null; },
        })) as unknown as typeof window.matchMedia;

        try
        {
            const order: string[] = [];
            const handle = createThemeToggle(makeOptions({
                defaultTheme: "auto",
                onChange: () => order.push("option"),
            }));
            handle.on("change", (p) => order.push(JSON.stringify(p)));

            listener!({ matches: true } as MediaQueryListEvent);

            expect(order).toEqual(["option", JSON.stringify({ theme: "dark", mode: "auto" })]);
            handle.destroy();
        }
        finally
        {
            window.matchMedia = original;
        }
    });

    test("OnChange_Unsubscribe_StopsDelivery", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "light" }));
        const heard = vi.fn();
        const off = handle.on("change", heard);

        clickMode("dark");
        off();
        clickMode("light");

        expect(heard).toHaveBeenCalledTimes(1);
        handle.destroy();
    });

    test("OnChange_ThrowingHandler_DoesNotStopOthers", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "light" }));
        const second = vi.fn();
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        handle.on("change", () => { throw new Error("boom"); });
        handle.on("change", second);

        clickMode("dark");

        expect(second).toHaveBeenCalledTimes(1);
        errorSpy.mockRestore();
        handle.destroy();
    });

    test("OnChange_HandlerMutatingPayload_DoesNotAffectNextHandler", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "light" }));
        const seen: unknown[] = [];
        handle.on("change", (p) => { (p as { theme: string }).theme = "mutated"; });
        handle.on("change", (p) => seen.push(p));

        clickMode("dark");

        expect(seen).toEqual([{ theme: "dark", mode: "dark" }]);
        expect(handle.getTheme()).toBe("dark");
        handle.destroy();
    });

    test("OnChange_PayloadIsPlainJson", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "light" }));
        let payload: unknown;
        handle.on("change", (p) => { payload = p; });

        clickMode("dark");

        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        handle.destroy();
    });

    test("Destroy_ClearsHandlers", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "light" }));
        const heard = vi.fn();
        handle.on("change", heard);

        handle.destroy();
        handle.setTheme("dark");

        expect(heard).not.toHaveBeenCalled();
    });

    test("On_UnknownChannel_ThrowsNamingValidChannels", () =>
    {
        const handle = createThemeToggle(makeOptions());

        expect(() => handle.on("bogus", () => undefined)).toThrow(/change/);
        handle.destroy();
    });

    test("SetData_Throws", () =>
    {
        const handle = createThemeToggle(makeOptions());

        expect(() => handle.setData("mode", "dark")).toThrow(/no data slots/);
        expect(() => handle.setData("mode", "dark")).toThrow(/setTheme/);
        handle.destroy();
    });

    test("GetState_SetState_RoundTripMode", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "light" }));
        const captured = handle.getState();
        expect(captured).toEqual({ mode: "light" });

        handle.setTheme("dark");
        expect(handle.getState()).toEqual({ mode: "dark" });

        handle.setState(captured);
        expect(handle.getMode()).toBe("light");
        expect(handle.getTheme()).toBe("light");
        handle.destroy();
    });

    test("SetState_WithoutMode_DoesNothing", () =>
    {
        const handle = createThemeToggle(makeOptions({ defaultTheme: "dark" }));

        handle.setState({});

        expect(handle.getMode()).toBe("dark");
        handle.destroy();
    });
});
