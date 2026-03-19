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
