/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: c5d8e3b2-7f1a-4c4b-ae6d-3g2e8b9c4d07
 * Created: 2026-03-19
 */

/**
 * Tests: TimezonePicker
 * Comprehensive Vitest unit tests for the TimezonePicker component.
 * Covers: factory, options, getValue/setValue, getOffset, dropdown,
 * search filtering, enable/disable, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import {
    TimezonePicker,
    createTimezonePicker,
    searchTimezones,
    timezoneMatches,
} from "./timezonepicker";
import type { TimezonePickerOptions } from "./timezonepicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-timezonepicker-container";
    document.body.appendChild(el);
    return el;
}

function removeContainer(): void
{
    if (container && container.parentNode)
    {
        container.parentNode.removeChild(container);
    }
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = createContainer();
    // jsdom does not implement scrollIntoView; stub it globally.
    Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() =>
{
    removeContainer();
});

// ============================================================================
// FACTORY — createTimezonePicker
// ============================================================================

describe("createTimezonePicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createTimezonePicker("test-timezonepicker-container");
        expect(picker).toBeInstanceOf(TimezonePicker);
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createTimezonePicker("test-timezonepicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithTimezone_SetsInitialValue", () =>
    {
        const picker = createTimezonePicker("test-timezonepicker-container", {
            timezone: "UTC",
        });
        expect(picker.getValue()).toBe("UTC");
        picker.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("TimezonePicker constructor", () =>
{
    test("Constructor_DefaultTimezone_IsUTC", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        expect(picker.getValue()).toBe("UTC");
        picker.destroy();
    });

    test("Constructor_WithTimezone_SetsValue", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            timezone: "America/New_York",
        });
        expect(picker.getValue()).toBe("America/New_York");
        picker.destroy();
    });

    test("Constructor_Disabled_AppliesClass", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            disabled: true,
        });
        const wrapper = container.querySelector(".timezonepicker");
        expect(
            wrapper?.classList.contains("timezonepicker-disabled")
        ).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("TimezonePicker options", () =>
{
    test("Options_SizeSm_AppliesSizeClass", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            size: "sm",
        });
        const wrapper = container.querySelector(".timezonepicker");
        expect(
            wrapper?.classList.contains("timezonepicker-sm")
        ).toBe(true);
        picker.destroy();
    });

    test("Options_Readonly_SetsInputReadonly", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            readonly: true,
        });
        const input = container.querySelector("input") as HTMLInputElement;
        expect(input?.readOnly).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// INPUT RENDERING
// ============================================================================

describe("input rendering", () =>
{
    test("Render_CreatesInputElement", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        const input = container.querySelector("input");
        expect(input).not.toBeNull();
        picker.destroy();
    });

    test("Render_InputShowsTimezoneValue", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            timezone: "UTC",
        });
        const input = container.querySelector("input") as HTMLInputElement;
        expect(input?.value).toContain("UTC");
        picker.destroy();
    });
});

// ============================================================================
// getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_Default_ReturnsUTC", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        expect(picker.getValue()).toBe("UTC");
        picker.destroy();
    });

    test("setValue_ValidTimezone_UpdatesValue", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        picker.setValue("America/Chicago");
        expect(picker.getValue()).toBe("America/Chicago");
        picker.destroy();
    });

    test("setValue_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", {
            onChange,
        });
        picker.setValue("Europe/London");
        expect(onChange).toHaveBeenCalledWith("Europe/London");
        picker.destroy();
    });

    test("setValue_DifferentTimezone_UpdatesInput", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        picker.setValue("Asia/Tokyo");
        const input = container.querySelector("input") as HTMLInputElement;
        expect(input?.value).toContain("Asia/Tokyo");
        picker.destroy();
    });
});

// ============================================================================
// UTC OFFSET DISPLAY
// ============================================================================

describe("getOffset", () =>
{
    // The comment said "UTC should have a GMT-related string" and the
    // body asked whether a string had been returned at all --
    // `getTimezoneOffset` returns "" from its catch, and "" is
    // defined.
    test("getOffset_UTC_ReturnsGMTString", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            timezone: "UTC",
        });

        expect(picker.getOffset()).toBe("GMT+0");
        picker.destroy();
    });

    test("getOffset_AfterSetValue_ReflectsNewTimezone", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        const before = picker.getOffset();

        picker.setValue("America/New_York");
        const after = picker.getOffset();

        // The name claims the offset REFLECTS the new zone, and the
        // body checked it was a string. The change is the claim.
        //
        // Not asserted as a literal: New York is GMT-4 in summer and
        // GMT-5 in winter, and a test that hardcodes one fails for
        // half the year. That is the clock-dependent flake that had
        // dynamicformswitcher accusing a component of leaking a
        // password, so the shape is worth avoiding on purpose.
        expect(before).toBe("GMT+0");
        expect(after).toMatch(/^GMT-[45]$/);
        expect(after).not.toBe(before);

        picker.destroy();
    });
});

// ============================================================================
// DROPDOWN
// ============================================================================

describe("dropdown open/close", () =>
{
    test("open_OpensDropdown", () =>
    {
        const onOpen = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", {
            onOpen,
        });
        picker.open();
        expect(onOpen).toHaveBeenCalled();
        picker.close();
        picker.destroy();
    });

    test("close_ClosesDropdown", () =>
    {
        const onClose = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", {
            onClose,
        });
        picker.open();
        picker.close();
        expect(onClose).toHaveBeenCalled();
        picker.destroy();
    });

    test("open_WhenDisabled_DoesNotOpen", () =>
    {
        const onOpen = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", {
            disabled: true,
            onOpen,
        });
        picker.open();
        expect(onOpen).not.toHaveBeenCalled();
        picker.destroy();
    });
});

// ============================================================================
// ENABLE / DISABLE
// ============================================================================

describe("enable and disable", () =>
{
    test("disable_AddsDisabledClass", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        picker.disable();
        const wrapper = container.querySelector(".timezonepicker");
        expect(
            wrapper?.classList.contains("timezonepicker-disabled")
        ).toBe(true);
        picker.destroy();
    });

    test("enable_RemovesDisabledClass", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", {
            disabled: true,
        });
        picker.enable();
        const wrapper = container.querySelector(".timezonepicker");
        expect(
            wrapper?.classList.contains("timezonepicker-disabled")
        ).toBe(false);
        picker.destroy();
    });

    test("disable_ClosesOpenDropdown", () =>
    {
        const onClose = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", {
            onClose,
        });
        picker.open();
        picker.disable();
        expect(onClose).toHaveBeenCalled();
        picker.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesFromDOM", () =>
    {
        const picker = createTimezonePicker("test-timezonepicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(container.querySelector(".timezonepicker")).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        const probe = destroyProbe();

        picker.destroy();
        const first = probe.total();
        picker.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });
});

// ============================================================================
// ZONE SEARCH -- shared with FacetSearch (#206), current names (#213)
// ============================================================================

describe("zone search", () =>
{
    /** The name this runtime lists India's zone by: the old one in Chrome and Node, the current one elsewhere. */
    const INDIA = Intl.supportedValuesOf("timeZone").find((z) => z === "Asia/Calcutta" || z === "Asia/Kolkata")!;

    test.each([
        ["the name, in any case", "America/Los_Angeles", "AMERICA/LOS"],
        ["the city with a space", "America/Los_Angeles", "los angeles"],
        ["the city with a hyphen", "America/Los_Angeles", "los-angeles"],
        ["the offset, as before", "America/Los_Angeles", "gmt-8"],
        ["the current name of an old one", "Asia/Calcutta", "kolkata"],
        ["the old name itself, as before", "Asia/Calcutta", "calcutta"],
        ["a hyphen in the name itself", "America/Port-au-Prince", "port-au"],
    ])("timezoneMatches finds a zone by %s", (_name, tz, query) =>
    {
        expect(timezoneMatches(tz, "GMT-8", query)).toBe(true);
    });

    test("timezoneMatches leaves a zone that does not hold the query", () =>
    {
        expect(timezoneMatches("Asia/Calcutta", "GMT+5:30", "tokyo")).toBe(false);
    });

    test("searchTimezones gives current names, the cities that start with the query first, with offsets", () =>
    {
        const found = searchTimezones("kol");

        // Asia/Srednekolymsk holds `kol` too, but its city does not start with it.
        expect(found.map((z) => z.zone).slice(0, 2)).toEqual(["Asia/Kolkata", "Asia/Srednekolymsk"]);
        expect(found[0].offset).toBe(new Intl.DateTimeFormat("en-US", { timeZone: INDIA, timeZoneName: "shortOffset" })
            .formatToParts(new Date()).find((p) => p.type === "timeZoneName")!.value);
        expect(searchTimezones("kyiv").map((z) => z.zone)).toEqual(["Europe/Kyiv"]);
        // The browser lists America/Guadeloupe first, but the cities that start with `ade` come first.
        expect(searchTimezones("ade").map((z) => z.zone)).toEqual(["Asia/Aden", "Australia/Adelaide",
            "America/Guadeloupe", "Atlantic/Madeira", "Europe/Belgrade"]);
    });

    test("the picker's own search finds an old name by its current one, and keeps the name it lists", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");
        picker.open();
        const search = container.querySelector<HTMLInputElement>(".timezonepicker-search input")!;

        search.value = "Kolkata";
        search.dispatchEvent(new Event("input", { bubbles: true }));

        const shown = Array.from(container.querySelectorAll<HTMLElement>("[data-tz]"))
            .filter((el) => el.style.display !== "none").map((el) => el.getAttribute("data-tz"));
        expect(new Set(shown)).toEqual(new Set([INDIA]));
        picker.destroy();
    });
});

// ============================================================================
// COMPACT FORM (#208)
// ============================================================================

describe("compact", () =>
{
    const button = (): HTMLButtonElement => container.querySelector(".timezonepicker-compact-button")!;
    const open = (): boolean => button().getAttribute("aria-expanded") === "true";

    test("is one button with the city and offset, and no field, hint or help", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container",
            { compact: true, timezone: "America/Los_Angeles" });

        expect(container.querySelector(".timezonepicker-input")).toBeNull();
        expect(container.querySelector(".timezonepicker-hint")).toBeNull();
        expect(button().querySelector(".timezonepicker-compact-city")!.textContent).toBe("Los Angeles");
        expect(button().querySelector(".timezonepicker-compact-offset")!.textContent).toBe(picker.getOffset());
        expect(button().getAttribute("aria-label")).toBe("Time zone: America/Los_Angeles, " + picker.getOffset());
        expect(button().getAttribute("aria-haspopup")).toBe("listbox");
        picker.destroy();
    });

    test("names a zone the browser lists by an old name by its current one, and keeps the value", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container",
            { compact: true, timezone: "Asia/Calcutta" });

        expect(button().querySelector(".timezonepicker-compact-city")!.textContent).toBe("Kolkata");
        expect(picker.getValue()).toBe("Asia/Calcutta");
        picker.destroy();
    });

    test.each([
        ["a click", () => button().click()],
        ["Enter", () => button().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))],
        ["ArrowDown", () => button().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))],
    ])("%s opens the dropdown, and Escape closes it", (_name, press) =>
    {
        const onOpen = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", { compact: true, onOpen });

        press();
        expect(open()).toBe(true);
        expect(onOpen).toHaveBeenCalledTimes(1);

        button().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        expect(open()).toBe(false);
        picker.destroy();
    });

    test("a choice rewrites the button and fires onChange", () =>
    {
        const onChange = vi.fn();
        const picker = new TimezonePicker("test-timezonepicker-container", { compact: true, onChange });

        button().click();
        // An option chooses on mousedown, so the input keeps focus.
        container.querySelector("[data-tz='Asia/Tokyo']")!
            .dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

        expect(onChange).toHaveBeenCalledWith("Asia/Tokyo");
        expect(button().querySelector(".timezonepicker-compact-city")!.textContent).toBe("Tokyo");
        expect(open()).toBe(false);
        picker.setValue("Europe/Paris");
        expect(button().querySelector(".timezonepicker-compact-city")!.textContent).toBe("Paris");
        picker.destroy();
    });

    test("disable and enable reach the button", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container", { compact: true, disabled: true });

        expect(button().disabled).toBe(true);
        picker.enable();
        expect(button().disabled).toBe(false);
        picker.disable();
        expect(button().disabled).toBe(true);
        picker.destroy();
    });

    test("the default form is unchanged", () =>
    {
        const picker = new TimezonePicker("test-timezonepicker-container");

        expect(container.querySelector(".timezonepicker-compact-button")).toBeNull();
        expect(container.querySelector(".timezonepicker-input")).not.toBeNull();
        picker.destroy();
    });
});
