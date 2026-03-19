/**
 * TESTS: PromptTemplateManager
 * Vitest unit tests for the PromptTemplateManager component.
 * Covers: factory, options, DOM structure, ARIA, template CRUD,
 * variable extraction, preview, callbacks, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    PromptTemplateManager,
    createPromptTemplateManager,
} from "./prompttemplatemanager";
import type
{
    PromptTemplateManagerOptions,
    PromptTemplate,
} from "./prompttemplatemanager";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeTemplate(overrides?: Partial<PromptTemplate>): PromptTemplate
{
    return {
        id: "tpl-" + Math.random().toString(36).slice(2, 6),
        name: "Test Template",
        content: "Hello {{name}}, welcome to {{place}}.",
        category: "General",
        tags: ["greeting"],
        ...overrides,
    };
}

function makeOptions(
    overrides?: Partial<PromptTemplateManagerOptions>
): PromptTemplateManagerOptions
{
    return {
        templates: [
            makeTemplate({ id: "t1", name: "Greeting" }),
            makeTemplate({ id: "t2", name: "Farewell", content: "Goodbye {{name}}." }),
        ],
        categories: ["General", "Support"],
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-promptmgr";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createPromptTemplateManager
// ============================================================================

describe("createPromptTemplateManager", () =>
{
    test("mountsInContainer", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        expect(container.children.length).toBeGreaterThan(0);
        mgr.destroy();
    });

    test("returnsPromptTemplateManagerInstance", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        expect(mgr).toBeInstanceOf(PromptTemplateManager);
        mgr.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rootElement_HasPromptmanagerClass", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        const root = container.querySelector(".promptmanager");
        expect(root).not.toBeNull();
        mgr.destroy();
    });

    test("rendersTemplateList", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        // Should list template names
        expect(container.textContent).toContain("Greeting");
        expect(container.textContent).toContain("Farewell");
        mgr.destroy();
    });

    test("rendersSearchInput", () =>
    {
        const mgr = createPromptTemplateManager(
            makeOptions({ showSearch: true }), "test-promptmgr"
        );
        const input = container.querySelector("input[type='search'], input[type='text']");
        expect(input).not.toBeNull();
        mgr.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("listHasListRole", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        const list = container.querySelector(
            "[role='list'], [role='listbox']"
        );
        expect(list).not.toBeNull();
        mgr.destroy();
    });
});

// ============================================================================
// PUBLIC API — TEMPLATE OPERATIONS
// ============================================================================

describe("template operations", () =>
{
    test("getTemplates_ReturnsAllTemplates", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        const templates = mgr.getTemplates();
        expect(templates.length).toBe(2);
        mgr.destroy();
    });

    test("setTemplates_ReplacesAll", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        mgr.setTemplates([makeTemplate({ id: "new-t", name: "New" })]);
        expect(mgr.getTemplates().length).toBe(1);
        mgr.destroy();
    });

    test("selectTemplate_SelectsById", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        mgr.selectTemplate("t1");
        const selected = mgr.getSelectedTemplate();
        expect(selected?.id).toBe("t1");
        mgr.destroy();
    });

    test("getSelectedTemplate_ReturnsNullWhenNoneSelected", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        const selected = mgr.getSelectedTemplate();
        expect(selected).toBeNull();
        mgr.destroy();
    });

    test("deleteTemplate_RemovesTemplate", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        mgr.deleteTemplate("t1");
        expect(mgr.getTemplates().length).toBe(1);
        mgr.destroy();
    });
});

// ============================================================================
// PREVIEW
// ============================================================================

describe("preview", () =>
{
    test("getPreviewContent_SubstitutesVariables", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        mgr.selectTemplate("t1");
        const preview = mgr.getPreviewContent({ name: "Alice", place: "Wonderland" });
        expect(preview).toContain("Alice");
        expect(preview).toContain("Wonderland");
        mgr.destroy();
    });

    test("getPreviewContent_NoSelection_ReturnsEmpty", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        const preview = mgr.getPreviewContent();
        expect(preview).toBe("");
        mgr.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("show_AppendsToContainer", () =>
    {
        const mgr = new PromptTemplateManager(makeOptions());
        mgr.show("test-promptmgr");
        expect(container.querySelector(".promptmanager")).not.toBeNull();
        mgr.destroy();
    });

    test("hide_RemovesFromDOM", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        mgr.hide();
        expect(container.querySelector(".promptmanager")).toBeNull();
        mgr.destroy();
    });

    test("destroy_NullifiesElement", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        mgr.destroy();
        expect(mgr.getElement()).toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("showInMissingContainer_LogsError", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const mgr = new PromptTemplateManager(makeOptions());
        mgr.show("nonexistent");
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
        mgr.destroy();
    });

    test("emptyTemplates_RendersWithoutCrash", () =>
    {
        const mgr = createPromptTemplateManager(
            makeOptions({ templates: [] }), "test-promptmgr"
        );
        expect(mgr.getElement()).not.toBeNull();
        mgr.destroy();
    });

    test("selectNonexistentTemplate_NoError", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        expect(() => mgr.selectTemplate("nonexistent")).not.toThrow();
        mgr.destroy();
    });
});
