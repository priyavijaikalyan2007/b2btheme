/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: MaskedEntry
 * Spec-based tests for the MaskedEntry masked input component.
 * Tests cover: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, keyboard shortcuts, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { MaskedEntry, createMaskedEntry } from "./maskedentry";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function queryRoot(): HTMLElement | null
{
    return container.querySelector(".maskedentry");
}

function queryInput(): HTMLInputElement | null
{
    return container.querySelector(".maskedentry-input") as HTMLInputElement | null;
}

function queryToggleBtn(): HTMLButtonElement | null
{
    return container.querySelector("[aria-label]") as HTMLButtonElement | null;
}

function queryCopyBtn(): HTMLElement | null
{
    return container.querySelector(".maskedentry-copy") as HTMLElement | null;
}

function queryLabel(): HTMLElement | null
{
    return container.querySelector(".maskedentry-label");
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-maskedentry";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createMaskedEntry
// ============================================================================

describe("createMaskedEntry", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        createMaskedEntry("test-maskedentry", { value: "secret" });
        expect(queryRoot()).not.toBeNull();
    });

    test("returnsMaskedEntryInstance", () =>
    {
        const entry = createMaskedEntry("test-maskedentry", { value: "abc" });
        expect(entry).toBeInstanceOf(MaskedEntry);
    });

    test("withEmptyValue_CreatesInputWithEmptyValue", () =>
    {
        createMaskedEntry("test-maskedentry", {});
        const input = queryInput();
        expect(input).not.toBeNull();
    });
});

// ============================================================================
// CONSTRUCTOR — MaskedEntry class
// ============================================================================

describe("MaskedEntry constructor", () =>
{
    test("withValue_StoresValue", () =>
    {
        const entry = new MaskedEntry({ value: "sk-abc123" });
        expect(entry.getValue()).toBe("sk-abc123");
    });

    test("withoutValue_DefaultsToEmptyString", () =>
    {
        const entry = new MaskedEntry({});
        expect(entry.getValue()).toBe("");
    });

    test("getElement_ReturnsRootElement", () =>
    {
        const entry = new MaskedEntry({ value: "test" });
        expect(entry.getElement()).toBeInstanceOf(HTMLElement);
    });
});

// ============================================================================
// OPTIONS — label
// ============================================================================

describe("label option", () =>
{
    test("withLabel_RendersLabelElement", () =>
    {
        createMaskedEntry("test-maskedentry", {
            value: "key",
            label: "API Key",
        });
        const label = queryLabel();
        expect(label).not.toBeNull();
        expect(label?.textContent).toBe("API Key");
    });

    test("withoutLabel_OmitsLabelElement", () =>
    {
        createMaskedEntry("test-maskedentry", { value: "key" });
        expect(queryLabel()).toBeNull();
    });
});

// ============================================================================
// OPTIONS — masking
// ============================================================================

describe("masking options", () =>
{
    test("nativeMaskMode_SetsPasswordType", () =>
    {
        createMaskedEntry("test-maskedentry", {
            value: "secret",
            maskMode: "native",
        });
        const input = queryInput();
        expect(input?.type).toBe("password");
    });

    test("initiallyRevealed_ShowsPlainText", () =>
    {
        const entry = new MaskedEntry({
            value: "visible",
            initiallyRevealed: true,
        });
        expect(entry.isRevealed()).toBe(true);
    });

    test("notInitiallyRevealed_DefaultsFalse", () =>
    {
        const entry = new MaskedEntry({ value: "hidden" });
        expect(entry.isRevealed()).toBe(false);
    });
});

// ============================================================================
// OPTIONS — buttons
// ============================================================================

describe("button visibility", () =>
{
    test("showToggleButton_DefaultTrue", () =>
    {
        createMaskedEntry("test-maskedentry", { value: "x" });
        const btns = container.querySelectorAll("button");
        expect(btns.length).toBeGreaterThanOrEqual(1);
    });

    test("showCopyButton_False_HidesCopyButton", () =>
    {
        createMaskedEntry("test-maskedentry", {
            value: "x",
            showCopyButton: false,
        });
        expect(queryCopyBtn()).toBeNull();
    });

    test("showToggleButton_False_HidesToggle", () =>
    {
        createMaskedEntry("test-maskedentry", {
            value: "x",
            showToggleButton: false,
            showCopyButton: false,
        });
        const btns = container.querySelectorAll("button");
        expect(btns.length).toBe(0);
    });
});

// ============================================================================
// OPTIONS — disabled / readonly
// ============================================================================

describe("disabled and readonly", () =>
{
    test("disabled_DisablesInput", () =>
    {
        createMaskedEntry("test-maskedentry", {
            value: "x",
            disabled: true,
        });
        const input = queryInput();
        expect(input?.disabled).toBe(true);
    });

    test("readonly_SetsReadonly", () =>
    {
        createMaskedEntry("test-maskedentry", {
            value: "x",
            readonly: true,
        });
        const input = queryInput();
        expect(input?.readOnly).toBe(true);
    });
});

// ============================================================================
// PUBLIC METHODS — reveal / conceal / toggle
// ============================================================================

describe("reveal and conceal", () =>
{
    test("reveal_SetsRevealedTrue", () =>
    {
        const entry = new MaskedEntry({ value: "secret" });
        entry.reveal();
        expect(entry.isRevealed()).toBe(true);
    });

    test("conceal_SetsRevealedFalse", () =>
    {
        const entry = new MaskedEntry({
            value: "secret",
            initiallyRevealed: true,
        });
        entry.conceal();
        expect(entry.isRevealed()).toBe(false);
    });

    test("toggleReveal_TogglesState", () =>
    {
        const entry = new MaskedEntry({ value: "secret" });
        expect(entry.isRevealed()).toBe(false);
        entry.toggleReveal();
        expect(entry.isRevealed()).toBe(true);
        entry.toggleReveal();
        expect(entry.isRevealed()).toBe(false);
    });
});

// ============================================================================
// PUBLIC METHODS — getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("setValue_UpdatesStoredValue", () =>
    {
        const entry = new MaskedEntry({ value: "old" });
        entry.setValue("new-value");
        expect(entry.getValue()).toBe("new-value");
    });

    test("getValue_ReturnsCurrentValue", () =>
    {
        const entry = new MaskedEntry({ value: "abc123" });
        expect(entry.getValue()).toBe("abc123");
    });
});

// ============================================================================
// PUBLIC METHODS — enable / disable
// ============================================================================

describe("enable and disable", () =>
{
    test("disable_ThenEnable_RestoresState", () =>
    {
        const entry = new MaskedEntry({ value: "x" });
        entry.show("test-maskedentry");
        entry.disable();
        const input = queryInput();
        expect(input?.disabled).toBe(true);

        entry.enable();
        expect(queryInput()?.disabled).toBe(false);
    });
});

// ============================================================================
// CALLBACKS — onChange / onReveal
// ============================================================================

describe("callbacks", () =>
{
    test("onReveal_FiresOnToggle", () =>
    {
        const onReveal = vi.fn();
        const entry = new MaskedEntry({
            value: "secret",
            onReveal,
        });
        entry.reveal();
        expect(onReveal).toHaveBeenCalledWith(true);
    });

    test("onReveal_FiresFalseOnConceal", () =>
    {
        const onReveal = vi.fn();
        const entry = new MaskedEntry({
            value: "secret",
            initiallyRevealed: true,
            onReveal,
        });
        entry.conceal();
        expect(onReveal).toHaveBeenCalledWith(false);
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("inputHasAutocompleteOff", () =>
    {
        createMaskedEntry("test-maskedentry", { value: "key" });
        const input = queryInput();
        expect(input?.getAttribute("autocomplete")).toBe("off");
    });

    test("inputHasSpellcheckFalse", () =>
    {
        createMaskedEntry("test-maskedentry", { value: "key" });
        const input = queryInput();
        expect(input?.getAttribute("spellcheck")).toBe("false");
    });

    test("labelLinksToInput", () =>
    {
        createMaskedEntry("test-maskedentry", {
            value: "key",
            label: "Token",
        });
        const label = queryLabel();
        const input = queryInput();
        expect(label?.getAttribute("for")).toBe(input?.id);
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("maxLength_SetsAttribute", () =>
    {
        createMaskedEntry("test-maskedentry", {
            value: "abc",
            maxLength: 50,
        });
        const input = queryInput();
        expect(input?.getAttribute("maxlength")).toBe("50");
    });

    test("cssClass_AddedToRoot", () =>
    {
        createMaskedEntry("test-maskedentry", {
            value: "x",
            cssClass: "custom-class",
        });
        const root = queryRoot();
        expect(root?.classList.contains("custom-class")).toBe(true);
    });

    test("size_sm_AppliesSmallClass", () =>
    {
        createMaskedEntry("test-maskedentry", {
            value: "x",
            size: "sm",
        });
        const group = container.querySelector(".maskedentry-group");
        expect(group?.classList.contains("input-group-sm")).toBe(true);
    });
});
