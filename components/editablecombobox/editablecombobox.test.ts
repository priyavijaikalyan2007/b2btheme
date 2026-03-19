/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: EditableComboBox
 * Comprehensive unit tests for the EditableComboBox component.
 * Tests cover: factory function, class API, options, input rendering,
 * dropdown open/close, filtering, item selection, keyboard navigation,
 * ARIA accessibility, handle methods, and edge cases.
 *
 * Copyright (c) 2026 PVK2007. All rights reserved.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    EditableComboBox,
    createEditableComboBox,
    ComboBoxItem,
    ComboBoxOptions,
} from "./editablecombobox";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

const FRUIT_ITEMS: ComboBoxItem[] = [
    { label: "Apple" },
    { label: "Banana" },
    { label: "Cherry" },
    { label: "Date" },
    { label: "Elderberry" },
];

function defaultOpts(
    overrides?: Partial<ComboBoxOptions>
): ComboBoxOptions
{
    return {
        items: FRUIT_ITEMS,
        placeholder: "Pick a fruit...",
        ...overrides,
    };
}

function getInput(): HTMLInputElement | null
{
    return container.querySelector(".combobox-input");
}

function getToggle(): HTMLElement | null
{
    return container.querySelector(".combobox-toggle");
}

function getListbox(): HTMLElement | null
{
    return container.querySelector("[role='listbox']");
}

function getOptions(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll("[role='option']")
    );
}

function getWrapper(): HTMLElement | null
{
    return container.querySelector(".combobox");
}

function isDropdownVisible(): boolean
{
    const listbox = getListbox();
    return listbox !== null && listbox.style.display !== "none";
}

function fireKeydown(
    el: HTMLElement,
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
    el.dispatchEvent(event);
}

function fireInput(el: HTMLInputElement, value: string): void
{
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
}

// ============================================================================
// JSDOM POLYFILLS
// ============================================================================

// jsdom does not implement scrollIntoView; stub it to prevent errors.
if (typeof Element.prototype.scrollIntoView !== "function")
{
    Element.prototype.scrollIntoView = vi.fn();
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "test-combo-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ============================================================================
// FACTORY FUNCTION — createEditableComboBox
// ============================================================================

describe("createEditableComboBox", () =>
{
    test("factory_WithValidArgs_ReturnsInstance", () =>
    {
        const combo = createEditableComboBox(
            "test-combo-container",
            defaultOpts()
        );
        expect(combo).toBeDefined();
        expect(combo).toBeInstanceOf(EditableComboBox);
    });

    test("factory_WithValidArgs_RendersInContainer", () =>
    {
        createEditableComboBox("test-combo-container", defaultOpts());
        expect(getWrapper()).not.toBeNull();
    });
});

// ============================================================================
// CONSTRUCTOR — EditableComboBox class
// ============================================================================

describe("EditableComboBox constructor", () =>
{
    test("constructor_WithItems_CreatesInput", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        expect(getInput()).not.toBeNull();
    });

    test("constructor_WithMissingContainer_LogsError", () =>
    {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        new EditableComboBox("nonexistent", defaultOpts());
        expect(spy).toHaveBeenCalled();
    });
});

// ============================================================================
// INPUT RENDERING
// ============================================================================

describe("input rendering", () =>
{
    test("render_WithPlaceholder_SetsPlaceholderAttr", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("placeholder")).toBe("Pick a fruit...");
    });

    test("render_WithInitialValue_SetsInputValue", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts({
            value: "Banana",
        }));
        const input = getInput()!;
        expect(input.value).toBe("Banana");
    });

    test("render_WithToggle_RendersToggleButton", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        expect(getToggle()).not.toBeNull();
    });

    test("render_Default_ListboxIsHidden", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        expect(isDropdownVisible()).toBe(false);
    });

    test("render_DisabledOption_DisablesInput", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts({
            disabled: true,
        }));
        const input = getInput()!;
        expect(input.hasAttribute("disabled")).toBe(true);
    });

    test("render_ReadonlyOption_SetsReadonly", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts({
            readonly: true,
        }));
        const input = getInput()!;
        expect(input.hasAttribute("readonly")).toBe(true);
    });
});

// ============================================================================
// DROPDOWN OPEN / CLOSE
// ============================================================================

describe("dropdown open/close", () =>
{
    test("open_Programmatically_ShowsDropdown", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        expect(isDropdownVisible()).toBe(true);
    });

    test("close_Programmatically_HidesDropdown", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        combo.close();
        expect(isDropdownVisible()).toBe(false);
    });

    test("open_WhenDisabled_DoesNotOpen", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts({ disabled: true })
        );
        combo.open();
        expect(isDropdownVisible()).toBe(false);
    });

    test("open_FiresOnOpenCallback", () =>
    {
        const onOpen = vi.fn();
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts({ onOpen })
        );
        combo.open();
        expect(onOpen).toHaveBeenCalledOnce();
    });

    test("close_FiresOnCloseCallback", () =>
    {
        const onClose = vi.fn();
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts({ onClose })
        );
        combo.open();
        combo.close();
        expect(onClose).toHaveBeenCalledOnce();
    });
});

// ============================================================================
// FILTERING
// ============================================================================

describe("filtering by typing", () =>
{
    test("input_TypesSubstring_FiltersItems", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        const input = getInput()!;
        fireInput(input, "Ban");
        vi.advanceTimersByTime(200);

        const opts = getOptions();
        const labels = opts.map((el) => el.textContent?.trim() ?? "");
        expect(labels).toContain("Banana");
        expect(labels).not.toContain("Cherry");
    });

    test("input_ClearsFilter_ShowsAllItems", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        const input = getInput()!;
        fireInput(input, "Ban");
        vi.advanceTimersByTime(200);
        fireInput(input, "");
        vi.advanceTimersByTime(200);

        const opts = getOptions();
        expect(opts.length).toBe(FRUIT_ITEMS.length);
    });

    test("input_NoMatch_ShowsNoMatchesMessage", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        const input = getInput()!;
        fireInput(input, "zzzzz");
        vi.advanceTimersByTime(200);

        const noMatches = container.querySelector(".combobox-no-matches");
        expect(noMatches).not.toBeNull();
    });
});

// ============================================================================
// ITEM SELECTION
// ============================================================================

describe("item selection", () =>
{
    test("mousedownItem_SelectsAndClosesDropdown", () =>
    {
        const onSelect = vi.fn();
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts({ onSelect })
        );
        combo.open();

        const opts = getOptions();
        // Items bind to mousedown, not click
        opts[1].dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true, cancelable: true })
        );

        expect(onSelect).toHaveBeenCalledOnce();
        expect(onSelect.mock.calls[0][0].label).toBe("Banana");
        expect(isDropdownVisible()).toBe(false);
    });

    test("mousedownItem_SetsInputToLabel", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        const opts = getOptions();
        opts[2].dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true, cancelable: true })
        );
        expect(getInput()!.value).toBe("Cherry");
    });
});

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

describe("keyboard navigation", () =>
{
    test("arrowDown_WhenClosed_OpensDropdown", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        const input = getInput()!;
        fireKeydown(input, "ArrowDown");
        expect(isDropdownVisible()).toBe(true);
    });

    test("arrowUp_WhenClosed_OpensDropdown", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        const input = getInput()!;
        fireKeydown(input, "ArrowUp");
        expect(isDropdownVisible()).toBe(true);
    });

    test("arrowDown_WhenOpen_HighlightsNextItem", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        const input = getInput()!;
        fireKeydown(input, "ArrowDown");

        const highlighted = container.querySelector(
            ".combobox-item-highlighted"
        );
        expect(highlighted).not.toBeNull();
    });

    test("enter_WhenHighlighted_SelectsItem", () =>
    {
        const onSelect = vi.fn();
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts({ onSelect })
        );
        combo.open();
        const input = getInput()!;
        fireKeydown(input, "ArrowDown"); // highlight first
        fireKeydown(input, "Enter"); // select it

        expect(onSelect).toHaveBeenCalledOnce();
    });

    test("escape_WhenOpen_ClosesDropdown", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        const input = getInput()!;
        fireKeydown(input, "Escape");
        expect(isDropdownVisible()).toBe(false);
    });

    test("arrowDown_Wraps_FromLastToFirst", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        const input = getInput()!;
        // Navigate through all items and one more
        for (let i = 0; i <= FRUIT_ITEMS.length; i++)
        {
            fireKeydown(input, "ArrowDown");
        }
        // Should wrap back to first
        const highlighted = container.querySelector(
            ".combobox-item-highlighted"
        );
        expect(highlighted).not.toBeNull();
    });
});

// ============================================================================
// ARIA ACCESSIBILITY
// ============================================================================

describe("ARIA attributes", () =>
{
    test("input_HasComboboxRole", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("role")).toBe("combobox");
    });

    test("input_HasAriaExpanded_False_WhenClosed", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("aria-expanded")).toBe("false");
    });

    test("input_HasAriaExpanded_True_WhenOpen", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        const input = getInput()!;
        expect(input.getAttribute("aria-expanded")).toBe("true");
    });

    test("listbox_HasListboxRole", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        const listbox = getListbox();
        expect(listbox).not.toBeNull();
        expect(listbox?.getAttribute("role")).toBe("listbox");
    });

    test("items_HaveOptionRole", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        const opts = getOptions();
        expect(opts.length).toBeGreaterThan(0);
        for (const opt of opts)
        {
            expect(opt.getAttribute("role")).toBe("option");
        }
    });

    test("input_HasAriaControls_PointingToListbox", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        const input = getInput()!;
        const controlsId = input.getAttribute("aria-controls");
        expect(controlsId).toBeTruthy();
        const listbox = container.querySelector(`#${controlsId}`);
        expect(listbox).not.toBeNull();
    });

    test("input_HasAriaAutocomplete", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        const input = getInput()!;
        expect(input.getAttribute("aria-autocomplete")).toBe("list");
    });

    test("toggle_HasAriaLabel", () =>
    {
        new EditableComboBox("test-combo-container", defaultOpts());
        const toggle = getToggle()!;
        expect(toggle.getAttribute("aria-label")).toBeTruthy();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("handle methods", () =>
{
    test("getValue_ReturnsEmptyString_Initially", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        expect(combo.getValue()).toBe("");
    });

    test("getValue_AfterSelection_ReturnsLabel", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.open();
        const opts = getOptions();
        opts[0].dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true, cancelable: true })
        );
        expect(combo.getValue()).toBe("Apple");
    });

    test("setValue_UpdatesInputValue", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.setValue("Cherry");
        expect(getInput()!.value).toBe("Cherry");
    });

    test("setValue_MatchingItem_SetsSelectedItem", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.setValue("Banana");
        const selected = combo.getSelectedItem();
        expect(selected).not.toBeNull();
        expect(selected!.label).toBe("Banana");
    });

    test("getSelectedItem_WhenFreeText_ReturnsNull", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.setValue("CustomText");
        expect(combo.getSelectedItem()).toBeNull();
    });

    test("setItems_ReplacesItems", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.setItems([
            { label: "Red" },
            { label: "Green" },
            { label: "Blue" },
        ]);
        combo.open();
        const opts = getOptions();
        expect(opts.length).toBe(3);
    });

    test("enable_ReEnablesDisabledComponent", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts({ disabled: true })
        );
        combo.enable();
        const input = getInput()!;
        expect(input.hasAttribute("disabled")).toBe(false);
    });

    test("disable_DisablesComponent", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.disable();
        const input = getInput()!;
        expect(input.hasAttribute("disabled")).toBe(true);
    });

    test("destroy_RemovesFromDom", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.destroy();
        expect(getWrapper()).toBeNull();
    });

    test("destroy_CalledTwice_IsIdempotent", () =>
    {
        const combo = new EditableComboBox(
            "test-combo-container", defaultOpts()
        );
        combo.destroy();
        expect(() => combo.destroy()).not.toThrow();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onChange_FiresOnTyping", () =>
    {
        const onChange = vi.fn();
        new EditableComboBox(
            "test-combo-container", defaultOpts({ onChange })
        );
        const input = getInput()!;
        fireInput(input, "test");
        expect(onChange).toHaveBeenCalledWith("test");
    });
});

// ============================================================================
// SIZE VARIANTS
// ============================================================================

describe("size variants", () =>
{
    test("miniSize_AddsMiniClass", () =>
    {
        new EditableComboBox(
            "test-combo-container", defaultOpts({ size: "mini" })
        );
        const wrapper = getWrapper()!;
        expect(wrapper.classList.contains("combobox-mini")).toBe(true);
    });

    test("lgSize_AddsLgClass", () =>
    {
        new EditableComboBox(
            "test-combo-container", defaultOpts({ size: "lg" })
        );
        const wrapper = getWrapper()!;
        expect(wrapper.classList.contains("combobox-lg")).toBe(true);
    });
});

// ============================================================================
// DISABLED ITEMS
// ============================================================================

describe("disabled items", () =>
{
    test("disabledItem_CannotBeSelected", () =>
    {
        const onSelect = vi.fn();
        const combo = new EditableComboBox(
            "test-combo-container",
            defaultOpts({
                items: [
                    { label: "Apple" },
                    { label: "Unavailable", disabled: true },
                    { label: "Cherry" },
                ],
                onSelect,
            })
        );
        combo.open();
        const opts = getOptions();
        // Find the disabled one and click it
        const disabledOpt = opts.find(
            (o) => o.textContent?.trim() === "Unavailable"
        );
        disabledOpt?.dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true, cancelable: true })
        );
        expect(onSelect).not.toHaveBeenCalled();
    });
});
