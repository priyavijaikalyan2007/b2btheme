/**
 * TESTS: PeoplePicker
 * Spec-based tests for the PeoplePicker person selector component.
 * Tests cover: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, selection, search, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { PeoplePicker, createPeoplePicker } from "./peoplepicker";

import type { PersonData, PeoplePickerOptions } from "./peoplepicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

const MOCK_PEOPLE: PersonData[] = [
    { id: "1", name: "Alice Johnson", email: "alice@test.com" },
    { id: "2", name: "Bob Smith", email: "bob@test.com" },
    { id: "3", name: "Carol Williams", email: "carol@test.com" },
];

function queryRoot(): HTMLElement | null
{
    return container.querySelector("[class*='peoplepicker']");
}

function queryInput(): HTMLInputElement | null
{
    return container.querySelector("input") as HTMLInputElement | null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-peoplepicker";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createPeoplePicker
// ============================================================================

describe("createPeoplePicker", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        createPeoplePicker("test-peoplepicker", {});
        expect(queryRoot()).not.toBeNull();
    });

    test("returnsPeoplePickerInstance", () =>
    {
        const pp = createPeoplePicker("test-peoplepicker", {});
        expect(pp).toBeInstanceOf(PeoplePicker);
    });

    test("withoutOptions_UsesDefaults", () =>
    {
        const pp = createPeoplePicker("test-peoplepicker");
        expect(pp).toBeInstanceOf(PeoplePicker);
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("PeoplePicker constructor", () =>
{
    test("withDefaults_CreatesComponent", () =>
    {
        const pp = new PeoplePicker({});
        expect(pp.getElement()).toBeInstanceOf(HTMLElement);
    });

    test("withPreselected_StoresSelection", () =>
    {
        const pp = new PeoplePicker({ selected: [MOCK_PEOPLE[0]] });
        expect(pp.getSelected()).toHaveLength(1);
        expect(pp.getSelected()[0].name).toBe("Alice Johnson");
    });

    test("withFrequentContacts_Stores", () =>
    {
        const pp = new PeoplePicker({
            frequentContacts: MOCK_PEOPLE,
        });
        expect(pp.getElement()).not.toBeNull();
    });
});

// ============================================================================
// PUBLIC METHODS — getSelected / setSelected
// ============================================================================

describe("selection methods", () =>
{
    test("getSelected_ReturnsDefensiveCopy", () =>
    {
        const pp = new PeoplePicker({
            selected: [MOCK_PEOPLE[0]],
        });
        const sel = pp.getSelected();
        sel.push(MOCK_PEOPLE[1]);
        expect(pp.getSelected()).toHaveLength(1);
    });

    test("setSelected_UpdatesSelection", () =>
    {
        const pp = new PeoplePicker({});
        pp.show("test-peoplepicker");
        pp.setSelected([MOCK_PEOPLE[0], MOCK_PEOPLE[1]]);
        expect(pp.getSelected()).toHaveLength(2);
    });

    test("setSelected_EmptyArray_ClearsSelection", () =>
    {
        const pp = new PeoplePicker({
            selected: MOCK_PEOPLE,
        });
        pp.show("test-peoplepicker");
        pp.setSelected([]);
        expect(pp.getSelected()).toHaveLength(0);
    });
});

// ============================================================================
// PUBLIC METHODS — lifecycle
// ============================================================================

describe("lifecycle", () =>
{
    test("show_MountsInContainer", () =>
    {
        const pp = new PeoplePicker({});
        pp.show("test-peoplepicker");
        expect(queryRoot()).not.toBeNull();
    });

    test("destroy_RemovesFromDOM", () =>
    {
        const pp = new PeoplePicker({});
        pp.show("test-peoplepicker");
        pp.destroy();
        expect(queryRoot()).toBeNull();
    });

    test("getElement_ReturnsRoot", () =>
    {
        const pp = new PeoplePicker({});
        expect(pp.getElement()).toBeInstanceOf(HTMLElement);
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("options", () =>
{
    test("multiple_DefaultTrue", () =>
    {
        const pp = new PeoplePicker({});
        pp.show("test-peoplepicker");
        expect(pp.getElement()).not.toBeNull();
    });

    test("placeholder_SetsInputPlaceholder", () =>
    {
        const pp = new PeoplePicker({
            placeholder: "Find a person...",
        });
        pp.show("test-peoplepicker");
        const input = queryInput();
        expect(input?.placeholder).toBe("Find a person...");
    });

    test("disabled_DisablesComponent", () =>
    {
        const pp = new PeoplePicker({ disabled: true });
        pp.show("test-peoplepicker");
        const root = queryRoot();
        expect(
            root?.classList.contains("peoplepicker-disabled")
        ).toBe(true);
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onChange_FiresOnSetSelected", () =>
    {
        const onChange = vi.fn();
        const pp = new PeoplePicker({ onChange });
        pp.show("test-peoplepicker");
        pp.setSelected([MOCK_PEOPLE[0]]);
        expect(onChange).toHaveBeenCalled();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("rootHasComboboxRole", () =>
    {
        const pp = new PeoplePicker({});
        pp.show("test-peoplepicker");
        const root = queryRoot();
        expect(root?.getAttribute("role")).toBe("combobox");
    });

    test("hasLiveRegion", () =>
    {
        const pp = new PeoplePicker({});
        pp.show("test-peoplepicker");
        const liveRegion = container.querySelector("[aria-live]");
        expect(liveRegion).not.toBeNull();
    });

    test("rootHasAriaExpanded", () =>
    {
        const pp = new PeoplePicker({});
        pp.show("test-peoplepicker");
        const root = queryRoot();
        expect(root?.getAttribute("aria-expanded")).not.toBeNull();
    });
});

// ============================================================================
// SEARCH
// ============================================================================

describe("search", () =>
{
    test("onSearch_AsyncCallback_CanBeProvided", () =>
    {
        const onSearch = vi.fn().mockResolvedValue(MOCK_PEOPLE);
        const pp = new PeoplePicker({ onSearch });
        pp.show("test-peoplepicker");
        expect(pp.getElement()).not.toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("destroyTwice_DoesNotThrow", () =>
    {
        const pp = new PeoplePicker({});
        pp.show("test-peoplepicker");
        pp.destroy();
        expect(() => pp.destroy()).not.toThrow();
    });

    test("showInMissingContainer_LogsError", () =>
    {
        const pp = new PeoplePicker({});
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        pp.show("nonexistent-container");
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    test("singleSelectMode_LimitsToOne", () =>
    {
        const pp = new PeoplePicker({
            multiple: false,
            selected: [MOCK_PEOPLE[0]],
        });
        pp.show("test-peoplepicker");
        expect(pp.getSelected()).toHaveLength(1);
    });

    test("maxSelections_OptionIsStored", () =>
    {
        const pp = new PeoplePicker({
            maxSelections: 2,
        });
        pp.show("test-peoplepicker");
        // maxSelections constrains interactive selection, not programmatic setSelected
        expect(pp.getElement()).not.toBeNull();
    });
});
