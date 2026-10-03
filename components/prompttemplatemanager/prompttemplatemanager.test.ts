/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
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

    test("getSelectedTemplate_ReturnsFirstTemplateByDefault", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        // The component auto-selects the first template when shown
        const selected = mgr.getSelectedTemplate();
        expect(selected).not.toBeNull();
        expect(selected!.id).toBe("t1");
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

    test("getPreviewContent_WithAutoSelectedTemplate_ReturnsContent", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        // The component auto-selects the first template, so preview returns its content
        const preview = mgr.getPreviewContent();
        expect(preview).toContain("Hello");
        expect(preview).toContain("{{name}}");
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

// ============================================================================
// ADR-148: a failed host callback must never become the success path
// ============================================================================

describe("failedCallbacks", () =>
{
    test("Refresh_CallbackRejects_KeepsExistingTemplates", async () =>
    {
        // Before ADR-148: safeAsync(onLoadTemplates, []) turned a rejected
        // load into an empty array, which setTemplates() then wrote over the
        // user's list. That is the incident's mechanism — a failed READ
        // becoming an authoritative empty WRITE.
        const mgr = createPromptTemplateManager(
            makeOptions({
                onLoadTemplates: () => Promise.reject(new Error("backend down")),
            }),
            "test-promptmgr"
        );

        expect(mgr.getTemplates()).toHaveLength(2);

        await mgr.refresh();

        expect(mgr.getTemplates()).toHaveLength(2);

        mgr.destroy();
    });

    test("Refresh_CallbackRejects_LogsNoSuccess", async () =>
    {
        // Clause 1: a degraded component may never report success. This
        // logged `Refreshed: 0 templates` — the one line a human would read
        // said the load was fine.
        const infoSpy = vi.spyOn(console, "log").mockImplementation(() => {});
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const mgr = createPromptTemplateManager(
            makeOptions({
                onLoadTemplates: () => Promise.reject(new Error("backend down")),
            }),
            "test-promptmgr"
        );

        await mgr.refresh();

        const saidRefreshed = infoSpy.mock.calls
            .some((call) => call.join(" ").includes("Refreshed"));

        expect(saidRefreshed).toBe(false);
        expect(errSpy).toHaveBeenCalled();

        infoSpy.mockRestore();
        errSpy.mockRestore();
        mgr.destroy();
    });

    test("Duplicate_CallbackRejects_AddsNothing", async () =>
    {
        // A failed duplicate used to push the local copy, creating a
        // template the backend has never heard of.
        const mgr = createPromptTemplateManager(
            makeOptions({
                onDuplicate: () => Promise.reject(new Error("backend down")),
            }),
            "test-promptmgr"
        );

        const before = mgr.getTemplates().length;

        mgr.duplicateTemplate("t1");
        await Promise.resolve();
        await Promise.resolve();

        expect(mgr.getTemplates()).toHaveLength(before);

        mgr.destroy();
    });
});
