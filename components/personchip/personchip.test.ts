/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e
 *
 * ⚓ TESTS: PersonChip
 * Vitest unit tests for the PersonChip component.
 * Covers: factory, avatar (image/initials), name display, status dot,
 * clickable, setName, setEmail, avatarOnly, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    PersonChip,
    createPersonChip,
} from "./personchip";
import type { PersonChipOptions } from "./personchip";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<PersonChipOptions>
): PersonChipOptions
{
    return {
        name: "Jane Doe",
        email: "jane@example.com",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "personchip-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("PersonChip factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const chip = new PersonChip(makeOptions());
        expect(chip).toBeDefined();
        expect(chip.getElement()).toBeInstanceOf(HTMLElement);
        chip.destroy();
    });

    test("createPersonChip_ReturnsInstance", () =>
    {
        const chip = createPersonChip(makeOptions());
        expect(chip).toBeInstanceOf(PersonChip);
        chip.destroy();
    });
});

// ============================================================================
// AVATAR
// ============================================================================

describe("PersonChip avatar", () =>
{
    test("WithAvatarUrl_RendersImage", () =>
    {
        const chip = new PersonChip(makeOptions({
            avatarUrl: "https://example.com/avatar.png",
        }));
        const el = chip.getElement();
        const img = el.querySelector("img");
        expect(img).not.toBeNull();
        expect(img?.src).toContain("avatar.png");
        chip.destroy();
    });

    test("WithoutAvatarUrl_RendersInitials", () =>
    {
        const chip = new PersonChip(makeOptions({ name: "Jane Doe" }));
        const el = chip.getElement();
        const avatar = el.querySelector(".personchip-avatar");
        expect(avatar?.textContent).toContain("JD");
        chip.destroy();
    });

    test("SingleName_RendersFirstTwoChars", () =>
    {
        const chip = new PersonChip(makeOptions({ name: "Jane" }));
        const el = chip.getElement();
        const avatar = el.querySelector(".personchip-avatar");
        expect(avatar?.textContent).toContain("JA");
        chip.destroy();
    });
});

// ============================================================================
// NAME DISPLAY
// ============================================================================

describe("PersonChip name display", () =>
{
    test("DefaultMode_ShowsNameText", () =>
    {
        const chip = new PersonChip(makeOptions({ name: "John Smith" }));
        const el = chip.getElement();
        const nameEl = el.querySelector(".personchip-name");
        expect(nameEl?.textContent).toBe("John Smith");
        chip.destroy();
    });

    test("AvatarOnly_HidesName", () =>
    {
        const chip = new PersonChip(makeOptions({ avatarOnly: true }));
        const el = chip.getElement();
        const nameEl = el.querySelector(".personchip-name");
        expect(nameEl).toBeNull();
        chip.destroy();
    });
});

// ============================================================================
// STATUS DOT
// ============================================================================

describe("PersonChip status", () =>
{
    test("WithStatus_RendersStatusDot", () =>
    {
        const chip = new PersonChip(makeOptions({ status: "online" }));
        const el = chip.getElement();
        const dot = el.querySelector(".personchip-status");
        expect(dot).not.toBeNull();
        chip.destroy();
    });

    test("WithoutStatus_NoStatusDot", () =>
    {
        const chip = new PersonChip(makeOptions());
        const el = chip.getElement();
        const dot = el.querySelector(".personchip-status");
        expect(dot).toBeNull();
        chip.destroy();
    });
});

// ============================================================================
// MUTATORS
// ============================================================================

describe("PersonChip mutators", () =>
{
    test("SetName_UpdatesNameText", () =>
    {
        const chip = new PersonChip(makeOptions());
        chip.setName("Alice Wonderland");
        const nameEl = chip.getElement().querySelector(".personchip-name");
        expect(nameEl?.textContent).toBe("Alice Wonderland");
        chip.destroy();
    });
});

// ============================================================================
// CLICKABLE
// ============================================================================

describe("PersonChip clickable", () =>
{
    test("Clickable_HasTabindex", () =>
    {
        const chip = new PersonChip(makeOptions({
            clickable: true,
            onClick: vi.fn(),
        }));
        const el = chip.getElement();
        expect(el.getAttribute("tabindex")).toBe("0");
        chip.destroy();
    });

    test("OnClick_FiresCallback", () =>
    {
        const onClick = vi.fn();
        const chip = new PersonChip(makeOptions({
            clickable: true,
            onClick,
        }));
        chip.getElement().click();
        expect(onClick).toHaveBeenCalled();
        chip.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("PersonChip destroy", () =>
{
    test("Destroy_ThrowsOnGetElement", () =>
    {
        const chip = new PersonChip(makeOptions());
        chip.destroy();
        expect(() => chip.getElement()).toThrow();
    });
});

// ============================================================================
// SURFACE CONTRACT (B4): additive on("click"), getState/setState and setData.
// onClick keeps firing first, exactly once.
// ============================================================================

describe("surface contract (B4)", () =>
{
    function pressKey(el: HTMLElement, key: string): void
    {
        el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    }

    test("on(click)_Click_HearsNameAndEmail_AfterOnClick", () =>
    {
        const order: string[] = [];
        const chip = createPersonChip(makeOptions({
            clickable: true,
            onClick: () => order.push("option"),
        }));
        const heard = vi.fn((payload: unknown) => { order.push("channel"); return payload; });
        chip.on("click", heard);

        chip.getElement().click();

        expect(order).toEqual(["option", "channel"]);
        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith({ name: "Jane Doe", email: "jane@example.com" });
        chip.destroy();
    });

    test("on(click)_KeyboardEnterAndSpace_Hears_AfterOnClick", () =>
    {
        const order: string[] = [];
        const chip = createPersonChip(makeOptions({
            clickable: true,
            onClick: () => order.push("option"),
        }));
        chip.on("click", () => order.push("channel"));

        pressKey(chip.getElement(), "Enter");
        pressKey(chip.getElement(), " ");
        pressKey(chip.getElement(), "a");

        expect(order).toEqual(["option", "channel", "option", "channel"]);
        chip.destroy();
    });

    test("on(click)_WithoutOnClick_StillEmits", () =>
    {
        const heard = vi.fn();
        const chip = createPersonChip(makeOptions({ clickable: true }));
        chip.on("click", heard);

        chip.getElement().click();
        pressKey(chip.getElement(), "Enter");

        expect(heard).toHaveBeenCalledTimes(2);
        expect(heard).toHaveBeenCalledWith({ name: "Jane Doe", email: "jane@example.com" });
        chip.destroy();
    });

    test("on(click)_Href_WithoutOnClick_EmitsAndDoesNotPreventNavigation", () =>
    {
        const heard = vi.fn();
        const chip = createPersonChip(makeOptions({ href: "#profile" }));
        chip.on("click", heard);

        const event = new MouseEvent("click", { bubbles: true, cancelable: true });
        chip.getElement().dispatchEvent(event);

        expect(heard).toHaveBeenCalledTimes(1);
        expect(event.defaultPrevented).toBe(false);
        chip.destroy();
    });

    test("on(click)_NotClickable_NeverEmits", () =>
    {
        const heard = vi.fn();
        const chip = createPersonChip(makeOptions());
        chip.on("click", heard);

        chip.getElement().click();
        pressKey(chip.getElement(), "Enter");

        expect(heard).not.toHaveBeenCalled();
        chip.destroy();
    });

    test("on(click)_NoEmail_OmitsTheKey", () =>
    {
        const heard = vi.fn();
        const chip = createPersonChip({ name: "Jane Doe", clickable: true });
        chip.on("click", heard);

        chip.getElement().click();

        const payload = heard.mock.calls[0][0] as Record<string, unknown>;
        expect(payload).toEqual({ name: "Jane Doe" });
        expect("email" in payload).toBe(false);
        chip.destroy();
    });

    test("on(click)_PayloadIsPlainJson", () =>
    {
        const heard = vi.fn();
        const chip = createPersonChip(makeOptions({ clickable: true }));
        chip.on("click", heard);

        chip.getElement().click();

        const payload = heard.mock.calls[0][0];
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        chip.destroy();
    });

    test("on(click)_HandlerMutation_DoesNotReachOtherHandlersOrChip", () =>
    {
        const second = vi.fn();
        const chip = createPersonChip(makeOptions({ clickable: true }));
        chip.on("click", (p) => { (p as Record<string, unknown>).name = "mutated"; });
        chip.on("click", second);

        chip.getElement().click();

        expect(second).toHaveBeenCalledWith({ name: "Jane Doe", email: "jane@example.com" });
        chip.destroy();
    });

    test("on(click)_ThrowingHandler_DoesNotStopOthers", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const second = vi.fn();
        const chip = createPersonChip(makeOptions({ clickable: true }));
        chip.on("click", () => { throw new Error("boom"); });
        chip.on("click", second);

        chip.getElement().click();

        expect(second).toHaveBeenCalledTimes(1);
        errorSpy.mockRestore();
        chip.destroy();
    });

    test("on(click)_Unsubscribe_StopsDelivery", () =>
    {
        const heard = vi.fn();
        const chip = createPersonChip(makeOptions({ clickable: true }));
        const off = chip.on("click", heard);

        chip.getElement().click();
        off();
        chip.getElement().click();

        expect(heard).toHaveBeenCalledTimes(1);
        chip.destroy();
    });

    test("on_UnknownChannel_ThrowsNamingValidChannels", () =>
    {
        const chip = createPersonChip(makeOptions());

        expect(() => chip.on("bogus", () => undefined)).toThrow('"click"');
        chip.destroy();
    });

    test("setData_Throws", () =>
    {
        const chip = createPersonChip(makeOptions());

        expect(() => chip.setData("name", "x")).toThrow("PersonChip");
        expect(() => chip.setData("name", "x")).toThrow("no data slots");
        expect(() => chip.setData("name", "x")).toThrow("setName");
        chip.destroy();
    });

    test("getState_SetState_HaveNoStateKeys", () =>
    {
        const chip = createPersonChip(makeOptions());
        const before = chip.getElement().outerHTML;

        expect(chip.getState()).toEqual({});
        chip.setState({ name: "Someone Else" });

        expect(chip.getState()).toEqual({});
        expect(chip.getElement().outerHTML).toBe(before);
        chip.destroy();
    });

    test("destroy_ClearsHandlers", () =>
    {
        const heard = vi.fn();
        const chip = createPersonChip(makeOptions({ clickable: true }));
        const el = chip.getElement();
        chip.on("click", heard);

        chip.destroy();
        el.click();

        expect(heard).not.toHaveBeenCalled();
    });
});
