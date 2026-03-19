/**
 * TESTS: Tagger
 * Spec-based tests for the Tagger tag input component.
 * Tests cover: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, validation, taxonomy, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { Tagger, createTagger } from "./tagger";

import type { TagItem, TagCategory, TaggerOptions } from "./tagger";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

const MOCK_TAXONOMY: TagCategory[] = [
    {
        id: "priority",
        label: "Priority",
        color: "#c92a2a",
        values: ["High", "Medium", "Low"],
    },
    {
        id: "status",
        label: "Status",
        color: "#2b8a3e",
        values: ["Open", "In Progress", "Closed"],
    },
];

function queryRoot(): HTMLElement | null
{
    return container.querySelector("[class*='tagger']");
}

function queryInput(): HTMLInputElement | null
{
    return container.querySelector("input") as HTMLInputElement | null;
}

function queryChips(): HTMLElement[]
{
    return Array.from(container.querySelectorAll("[class*='tagger-chip']"));
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-tagger";
    document.body.appendChild(container);

    // Polyfill CSS.escape for jsdom (not natively available)
    if (typeof CSS === "undefined" || !CSS.escape)
    {
        (globalThis as Record<string, unknown>).CSS = {
            escape: (s: string) => s.replace(
                /([^\w-])/g, "\\$1"
            ),
        };
    }
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createTagger
// ============================================================================

describe("createTagger", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        createTagger("test-tagger");
        expect(queryRoot()).not.toBeNull();
    });

    test("returnsTaggerInstance", () =>
    {
        const tagger = createTagger("test-tagger");
        expect(tagger).toBeInstanceOf(Tagger);
    });

    test("withOptions_PassesConfig", () =>
    {
        const tagger = createTagger("test-tagger", {
            placeholder: "Add tags...",
        });
        expect(tagger.getTags()).toHaveLength(0);
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("Tagger constructor", () =>
{
    test("withoutOptions_CreatesEmpty", () =>
    {
        const tagger = new Tagger({});
        expect(tagger.getTags()).toHaveLength(0);
    });

    test("withInitialTags_PrePopulates", () =>
    {
        const tagger = new Tagger({
            tags: [
                { value: "JavaScript" },
                { value: "TypeScript" },
            ],
        });
        expect(tagger.getTags()).toHaveLength(2);
    });

    test("getElement_ReturnsRoot", () =>
    {
        const tagger = new Tagger({});
        expect(tagger.getElement()).toBeInstanceOf(HTMLElement);
    });
});

// ============================================================================
// PUBLIC METHODS — addTag / removeTag / clearTags
// ============================================================================

describe("tag management", () =>
{
    test("addTag_AddsToList", () =>
    {
        const tagger = new Tagger({});
        tagger.show("test-tagger");
        const result = tagger.addTag({ value: "React" });
        expect(result).toBe(true);
        expect(tagger.getTags()).toHaveLength(1);
    });

    test("addTag_DuplicateRejected_ReturnsFalse", () =>
    {
        const tagger = new Tagger({
            tags: [{ value: "React" }],
        });
        tagger.show("test-tagger");
        const result = tagger.addTag({ value: "React" });
        expect(result).toBe(false);
    });

    test("addTag_EmptyValue_ReturnsFalse", () =>
    {
        const tagger = new Tagger({});
        tagger.show("test-tagger");
        const result = tagger.addTag({ value: "   " });
        expect(result).toBe(false);
    });

    test("removeTag_ExistingTag_ReturnsTrue", () =>
    {
        const tagger = new Tagger({
            tags: [{ value: "React" }],
        });
        tagger.show("test-tagger");
        expect(tagger.removeTag("React")).toBe(true);
        expect(tagger.getTags()).toHaveLength(0);
    });

    test("removeTag_NonExistent_ReturnsFalse", () =>
    {
        const tagger = new Tagger({});
        tagger.show("test-tagger");
        expect(tagger.removeTag("Nothing")).toBe(false);
    });

    test("clearTags_RemovesAll", () =>
    {
        const tagger = new Tagger({
            tags: [
                { value: "A" },
                { value: "B" },
                { value: "C" },
            ],
        });
        tagger.show("test-tagger");
        tagger.clearTags();
        expect(tagger.getTags()).toHaveLength(0);
    });

    test("hasTag_ReturnsTrue", () =>
    {
        const tagger = new Tagger({
            tags: [{ value: "React" }],
        });
        expect(tagger.hasTag("React")).toBe(true);
    });

    test("hasTag_ReturnsFalse", () =>
    {
        const tagger = new Tagger({});
        expect(tagger.hasTag("React")).toBe(false);
    });
});

// ============================================================================
// PUBLIC METHODS — getTags / setTags
// ============================================================================

describe("getTags and setTags", () =>
{
    test("getTags_ReturnsDefensiveCopy", () =>
    {
        const tagger = new Tagger({ tags: [{ value: "X" }] });
        const tags = tagger.getTags();
        tags.push({ value: "Y" });
        expect(tagger.getTags()).toHaveLength(1);
    });

    test("setTags_ReplacesAll", () =>
    {
        const tagger = new Tagger({ tags: [{ value: "Old" }] });
        tagger.show("test-tagger");
        tagger.setTags([{ value: "New1" }, { value: "New2" }]);
        expect(tagger.getTags()).toHaveLength(2);
        expect(tagger.hasTag("Old")).toBe(false);
    });
});

// ============================================================================
// PUBLIC METHODS — lifecycle
// ============================================================================

describe("lifecycle", () =>
{
    test("show_MountsInContainer", () =>
    {
        const tagger = new Tagger({});
        tagger.show("test-tagger");
        expect(queryRoot()).not.toBeNull();
    });

    test("hide_RemovesFromDOM", () =>
    {
        const tagger = new Tagger({});
        tagger.show("test-tagger");
        tagger.hide();
        expect(queryRoot()).toBeNull();
    });

    test("destroy_FullCleanup", () =>
    {
        const tagger = new Tagger({});
        tagger.show("test-tagger");
        tagger.destroy();
        expect(queryRoot()).toBeNull();
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const tagger = new Tagger({});
        tagger.destroy();
        expect(() => tagger.destroy()).not.toThrow();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onAdd_FiresWhenTagAdded", () =>
    {
        const onAdd = vi.fn();
        const tagger = new Tagger({ onAdd });
        tagger.show("test-tagger");
        tagger.addTag({ value: "React" });
        expect(onAdd).toHaveBeenCalled();
        expect(onAdd.mock.calls[0][0].value).toBe("React");
    });

    test("onRemove_FiresWhenTagRemoved", () =>
    {
        const onRemove = vi.fn();
        const tagger = new Tagger({
            tags: [{ value: "React" }],
            onRemove,
        });
        tagger.show("test-tagger");
        tagger.removeTag("React");
        expect(onRemove).toHaveBeenCalled();
    });

    test("onChange_FiresOnAnyChange", () =>
    {
        const onChange = vi.fn();
        const tagger = new Tagger({ onChange });
        tagger.show("test-tagger");
        tagger.addTag({ value: "Test" });
        expect(onChange).toHaveBeenCalled();
    });
});

// ============================================================================
// TAXONOMY
// ============================================================================

describe("taxonomy", () =>
{
    test("withTaxonomy_CategoriesAvailable", () =>
    {
        const tagger = new Tagger({ taxonomy: MOCK_TAXONOMY });
        tagger.show("test-tagger");
        expect(tagger.getElement()).not.toBeNull();
    });

    test("getTagsByCategory_FiltersCorrectly", () =>
    {
        const tagger = new Tagger({
            taxonomy: MOCK_TAXONOMY,
            tags: [
                { value: "High", category: "priority" },
                { value: "Open", category: "status" },
            ],
        });
        const priorityTags = tagger.getTagsByCategory("priority");
        expect(priorityTags).toHaveLength(1);
        expect(priorityTags[0].value).toBe("High");
    });
});

// ============================================================================
// VALIDATION
// ============================================================================

describe("validation", () =>
{
    test("validator_RejectsInvalid", () =>
    {
        const tagger = new Tagger({
            validator: (v) => v.length >= 2 ? true : "Too short",
        });
        tagger.show("test-tagger");
        const result = tagger.addTag({ value: "X" });
        expect(result).toBe(false);
    });

    test("validator_AcceptsValid", () =>
    {
        const tagger = new Tagger({
            validator: (v) => v.length >= 2 ? true : "Too short",
        });
        tagger.show("test-tagger");
        const result = tagger.addTag({ value: "Valid" });
        expect(result).toBe(true);
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("hasLiveRegion", () =>
    {
        const tagger = new Tagger({});
        tagger.show("test-tagger");
        const liveRegion = container.querySelector("[aria-live]");
        expect(liveRegion).not.toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("maxTags_PreventsExcess", () =>
    {
        const tagger = new Tagger({ maxTags: 2 });
        tagger.show("test-tagger");
        tagger.addTag({ value: "A" });
        tagger.addTag({ value: "B" });
        tagger.addTag({ value: "C" });
        expect(tagger.getTags().length).toBeLessThanOrEqual(2);
    });

    test("showInMissingContainer_LogsError", () =>
    {
        const tagger = new Tagger({});
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        tagger.show("nonexistent-id");
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    test("disabledState_PreventsAddTag", () =>
    {
        const tagger = new Tagger({ disabled: true });
        tagger.show("test-tagger");
        const result = tagger.addTag({ value: "Nope" });
        expect(result).toBe(false);
    });
});
