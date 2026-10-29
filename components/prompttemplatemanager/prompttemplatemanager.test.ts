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
    test("showInMissingContainer_Throws", () =>
    {
        // ERR-1. This case asserted the defect: a container that is
        // not there used to be logged and walked past. AGENTS.md
        // calls that returning a null object.
        const mgr = new PromptTemplateManager(makeOptions());
        expect(() => mgr.show("nonexistent")).toThrow(/was not found/);
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

    test("selectNonexistentTemplate_RefusesAndNamesIt", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");

        // ADR-200. The previous selection stayed highlighted and
        // `onSelect` never fired, so the caller saw a manager that had
        // ignored it.
        expect(() => mgr.selectTemplate("nonexistent"))
            .toThrow(/no template with id "nonexistent"/);
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

// ============================================================================
// SURFACE CONTRACT (additive, readiness step 2 B7)
// ============================================================================

describe("surface contract (B7)", () =>
{
    /** Lets the microtasks after an awaited host callback run. */
    async function settle(): Promise<void>
    {
        for (let i = 0; i < 5; i++) { await Promise.resolve(); }
    }

    function el<T extends HTMLElement>(selector: string): T
    {
        const found = container.querySelector<T>(selector);
        if (!found) { throw new Error(`No element matches ${selector}`); }
        return found;
    }

    function listItem(id: string): HTMLElement
    {
        return el(`.promptmanager-list-item[data-template-id="${id}"]`);
    }

    test("on(select)_ListClick_HearsTheId_AfterOnSelect", () =>
    {
        const order: unknown[] = [];
        const mgr = createPromptTemplateManager(
            makeOptions({ onSelect: (t) => order.push(["legacy", t.id]) }), "test-promptmgr");
        order.length = 0;
        mgr.on("select", (p) => order.push(["select", p]));

        listItem("t2").click();

        expect(order).toEqual([["legacy", "t2"], ["select", "t2"]]);
        mgr.destroy();
    });

    test("on(select)_FiresWithoutOnSelect", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        const seen: unknown[] = [];
        mgr.on("select", (p) => seen.push(p));

        mgr.selectTemplate("t2");

        expect(seen).toEqual(["t2"]);
        mgr.destroy();
    });

    test("on(save)_HearsACopyOfTheSavedTemplate_AfterOnSave", async () =>
    {
        const order: unknown[] = [];
        const mgr = createPromptTemplateManager(makeOptions({
            onSave: async (t) => { order.push(["legacy", t.id]); return { ...t, author: "server" }; },
        }), "test-promptmgr");
        mgr.on("save", (p) => order.push(["save", p]));

        el(".promptmanager-btn-save").click();
        expect(order).toEqual([["legacy", "t1"]]);
        await settle();

        expect(order).toHaveLength(2);
        expect(order[1]).toEqual(["save", expect.objectContaining({ id: "t1", name: "Greeting", version: 1,
            author: "server" })]);
        mgr.destroy();
    });

    test("on(save)_FiresSynchronouslyWithoutOnSave_AndPayloadIsAJsonCopy", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions({ templates: [makeTemplate({ id: "t1",
            name: "Greeting", metadata: { secret: 1 } })] }), "test-promptmgr");
        const seen: Record<string, unknown>[] = [];
        mgr.on("save", (p) => seen.push(p as Record<string, unknown>));

        el<HTMLInputElement>(".promptmanager-name-input").value = "Hello there";
        el(".promptmanager-name-input").dispatchEvent(new Event("input"));
        container.querySelector(".promptmanager")!.dispatchEvent(
            new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true }));

        expect(seen).toHaveLength(1);
        expect(seen[0]).toEqual(expect.objectContaining({ id: "t1", name: "Hello there", version: 1 }));
        expect(seen[0]).not.toHaveProperty("metadata");
        (seen[0].tags as string[]).push("mutated");
        expect(mgr.getTemplates()[0].tags).toEqual(["greeting"]);
        mgr.destroy();
    });

    test("on(save)_SilentWhenOnSaveRejects", async () =>
    {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const mgr = createPromptTemplateManager(makeOptions({
            onSave: () => Promise.reject(new Error("backend down")),
        }), "test-promptmgr");
        const seen: unknown[] = [];
        mgr.on("save", (p) => seen.push(p));

        el(".promptmanager-btn-save").click();
        await settle();

        expect(seen).toEqual([]);
        errSpy.mockRestore();
        mgr.destroy();
    });

    test("on(delete)_HearsTheId_AfterOnDelete_OnceDeleted", async () =>
    {
        const order: unknown[] = [];
        const mgr = createPromptTemplateManager(makeOptions({
            onDelete: async (id) => { order.push(["legacy", id]); return true; },
        }), "test-promptmgr");
        mgr.on("delete", (p) => order.push(["delete", p, mgr.getTemplates().length]));

        el(".promptmanager-btn-delete").click();
        await settle();

        expect(order).toEqual([["legacy", "t1"], ["delete", "t1", 1]]);
        mgr.destroy();
    });

    test("on(delete)_FiresWithoutOnDelete_AndNotWhenVetoed", async () =>
    {
        const plain = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        const seen: unknown[] = [];
        plain.on("delete", (p) => seen.push(p));
        plain.deleteTemplate("t2");
        expect(seen).toEqual(["t2"]);
        plain.destroy();

        const vetoing = createPromptTemplateManager(makeOptions({ onDelete: async () => false }), "test-promptmgr");
        const vetoed: unknown[] = [];
        vetoing.on("delete", (p) => vetoed.push(p));
        vetoing.deleteTemplate("t1");
        await settle();
        expect(vetoed).toEqual([]);
        expect(vetoing.getTemplates()).toHaveLength(2);
        vetoing.destroy();
    });

    test("on(duplicate)_HearsTheNewTemplate_AfterOnDuplicate", async () =>
    {
        const order: unknown[] = [];
        const mgr = createPromptTemplateManager(makeOptions({
            onDuplicate: async (t) => { order.push(["legacy", t.name]); return { ...t, id: "server-id" }; },
        }), "test-promptmgr");
        mgr.on("duplicate", (p) => order.push(["duplicate", p]));

        el(".promptmanager-btn-duplicate").click();
        await settle();

        expect(order).toEqual([["legacy", "Greeting (Copy)"],
            ["duplicate", expect.objectContaining({ id: "server-id", name: "Greeting (Copy)", version: 1 })]]);
        mgr.destroy();
    });

    test("on(duplicate)_FiresWithoutOnDuplicate_WithTheLocalId", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        const seen: Record<string, unknown>[] = [];
        mgr.on("duplicate", (p) => seen.push(p as Record<string, unknown>));

        mgr.duplicateTemplate("t1");

        expect(seen).toHaveLength(1);
        expect(seen[0].name).toBe("Greeting (Copy)");
        expect(mgr.getTemplates().map((t) => t.id)).toContain(seen[0].id);
        mgr.destroy();
    });

    test("on_Unsubscribe_StopsDelivery_AndAThrowingHandlerIsIsolated", () =>
    {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        const seen: unknown[] = [];
        mgr.on("select", () => { throw new Error("bad subscriber"); });
        const off = mgr.on("select", (p) => seen.push(p));

        mgr.selectTemplate("t2");
        off();
        mgr.selectTemplate("t1");

        expect(seen).toEqual(["t2"]);
        expect(mgr.getSelectedTemplate()?.id).toBe("t1");
        errSpy.mockRestore();
        mgr.destroy();
    });

    test("on_UnknownChannel_Throws_AndDestroyClearsHandlers", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        expect(() => mgr.on("use", () => undefined)).toThrow(/unknown channel/);

        const seen: unknown[] = [];
        mgr.on("select", (p) => seen.push(p));
        mgr.destroy();
        mgr.selectTemplate("t2");
        expect(seen).toEqual([]);
    });

    test("setData(templates)_KeepsTheSelection_AndIsSilent", () =>
    {
        const onSelect = vi.fn();
        const mgr = createPromptTemplateManager(makeOptions({ onSelect }), "test-promptmgr");
        mgr.selectTemplate("t2");
        onSelect.mockClear();
        const seen: unknown[] = [];
        for (const c of ["select", "save", "delete", "duplicate"]) { mgr.on(c, (p) => seen.push([c, p])); }

        mgr.setData("templates", [makeTemplate({ id: "t0", name: "Intro" }),
            makeTemplate({ id: "t2", name: "Farewell v2", content: "Bye {{name}}." })]);

        expect(mgr.getTemplates().map((t) => t.id)).toEqual(["t0", "t2"]);
        expect(mgr.getSelectedTemplate()?.name).toBe("Farewell v2");
        expect(el<HTMLInputElement>(".promptmanager-name-input").value).toBe("Farewell v2");
        expect(listItem("t2").getAttribute("aria-selected")).toBe("true");
        expect(onSelect).not.toHaveBeenCalled();
        expect(seen).toEqual([]);
        mgr.destroy();
    });

    test("setData(templates)_SelectedIdGone_SelectsTheFirstSilently", () =>
    {
        const onSelect = vi.fn();
        const mgr = createPromptTemplateManager(makeOptions({ onSelect }), "test-promptmgr");
        onSelect.mockClear();

        mgr.setData("templates", [makeTemplate({ id: "t9", name: "Other" })]);
        expect(mgr.getSelectedTemplate()?.id).toBe("t9");

        mgr.setData("templates", []);
        expect(mgr.getSelectedTemplate()).toBeNull();
        expect(onSelect).not.toHaveBeenCalled();
        mgr.destroy();
    });

    test("setData(templates)_KeepsFilledVariablesPreviewAndSearch", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        const input = el<HTMLInputElement>('.promptmanager-variable-input[data-variable="name"]');
        input.value = "Ada";
        input.dispatchEvent(new Event("input"));
        el(".promptmanager-btn-preview").click();
        el<HTMLInputElement>(".promptmanager-search-input").value = "greet";

        mgr.setData("templates", [makeTemplate({ id: "t1", name: "Greeting v2" }),
            makeTemplate({ id: "t3", name: "New one", category: "Support", tags: [] })]);

        expect(listItem("t1").style.display).toBe("");
        expect(listItem("t3").style.display).toBe("none");

        expect(el<HTMLInputElement>('.promptmanager-variable-input[data-variable="name"]').value).toBe("Ada");
        expect(el(".promptmanager-preview-panel").style.display).toBe("");
        expect(el(".promptmanager-preview-panel").textContent).toContain("Hello Ada");
        expect(mgr.getState()).toEqual({ selected: "t1", variables: { t1: { name: "Ada" } }, preview: true });
        mgr.destroy();
    });

    test("setData(templates)_KeepsAnUnsavedEdit_AndItsMarker_WhileNewRowsAppear", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        const editor = el<HTMLTextAreaElement>(".promptmanager-editor");
        el<HTMLInputElement>(".promptmanager-name-input").value = "Draft";
        el(".promptmanager-name-input").dispatchEvent(new Event("input"));
        editor.value = "Draft body {{name}}";
        editor.dispatchEvent(new Event("input"));
        expect(listItem("t1").classList.contains("promptmanager-list-item-dirty")).toBe(true);

        mgr.setData("templates", [makeTemplate({ id: "tB", name: "New B" }),
            makeTemplate({ id: "t1", name: "From agent", content: "Agent body" })]);

        expect(mgr.getTemplates().map((t) => [t.id, t.name])).toEqual([["tB", "New B"], ["t1", "Draft"]]);
        expect(mgr.getTemplates()[1].content).toBe("Draft body {{name}}");
        expect(el<HTMLInputElement>(".promptmanager-name-input").value).toBe("Draft");
        expect(editor.value).toBe("Draft body {{name}}");
        expect(listItem("t1").classList.contains("promptmanager-list-item-dirty")).toBe(true);
        expect(listItem("tB").classList.contains("promptmanager-list-item-dirty")).toBe(false);
        expect(mgr.getSelectedTemplate()?.id).toBe("t1");
        mgr.destroy();
    });

    test("setData(templates)_DropsADirtyTemplateTheListLeavesOut_WithItsMarker", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        el<HTMLInputElement>(".promptmanager-name-input").value = "Draft";
        el(".promptmanager-name-input").dispatchEvent(new Event("input"));

        mgr.setData("templates", [makeTemplate({ id: "t2", name: "Farewell v2" })]);
        expect(mgr.getTemplates().map((t) => t.id)).toEqual(["t2"]);
        expect(listItem("t2").classList.contains("promptmanager-list-item-dirty")).toBe(false);

        // t1 returning later is the agent's row, with no marker: its dirty state left with it.
        mgr.setData("templates", [makeTemplate({ id: "t1", name: "Back" }), makeTemplate({ id: "t2", name: "F" })]);
        expect(mgr.getTemplates()[0].name).toBe("Back");
        expect(listItem("t1").classList.contains("promptmanager-list-item-dirty")).toBe(false);
        mgr.destroy();
    });

    test("setData_UnknownSlotOrNonArray_Throws", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        expect(() => mgr.setData("rows", [])).toThrow(/unknown slot "rows"/);
        expect(() => mgr.setData("templates", { id: "t1" })).toThrow(/array/);
        expect(mgr.getTemplates()).toHaveLength(2);
        mgr.destroy();
    });

    test("setTemplates_IsUnchanged_ResetsToTheFirstAndFiresOnSelect", () =>
    {
        const onSelect = vi.fn();
        const mgr = createPromptTemplateManager(makeOptions({ onSelect }), "test-promptmgr");
        mgr.selectTemplate("t2");
        onSelect.mockClear();
        const seen: unknown[] = [];
        mgr.on("select", (p) => seen.push(p));

        mgr.setTemplates([makeTemplate({ id: "t1", name: "A" }), makeTemplate({ id: "t2", name: "B" })]);

        expect(mgr.getSelectedTemplate()?.id).toBe("t1");
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(seen).toEqual(["t1"]);
        mgr.destroy();
    });

    test("getState_ReportsSelectedVariablesAndPreview_AsJson", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        expect(mgr.getState()).toEqual({ selected: "t1", variables: {}, preview: false });

        const input = el<HTMLInputElement>('.promptmanager-variable-input[data-variable="place"]');
        input.value = "Paris";
        input.dispatchEvent(new Event("input"));
        const state = mgr.getState();
        (state.variables as Record<string, Record<string, string>>).t1.place = "mutated";

        expect(mgr.getState()).toEqual({ selected: "t1", variables: { t1: { place: "Paris" } }, preview: false });
        mgr.destroy();
    });

    test("setState_RestoresSilently_AndRoundTrips", () =>
    {
        const onSelect = vi.fn();
        const mgr = createPromptTemplateManager(makeOptions({ onSelect }), "test-promptmgr");
        onSelect.mockClear();
        const seen: unknown[] = [];
        mgr.on("select", (p) => seen.push(p));
        const state = { selected: "t2", variables: { t2: { name: "Bob" } }, preview: true };

        mgr.setState(state);

        expect(mgr.getState()).toEqual(state);
        expect(listItem("t2").getAttribute("aria-selected")).toBe("true");
        expect(el<HTMLInputElement>('.promptmanager-variable-input[data-variable="name"]').value).toBe("Bob");
        expect(el(".promptmanager-preview-panel").textContent).toBe("Goodbye Bob.");
        expect(onSelect).not.toHaveBeenCalled();
        expect(seen).toEqual([]);

        mgr.setState(mgr.getState());
        expect(mgr.getState()).toEqual(state);

        mgr.setState({ preview: false });
        expect(mgr.getState()).toEqual({ ...state, preview: false });
        mgr.destroy();
    });

    test("setState_UnknownSelectedOrWrongTypes_Throw", () =>
    {
        const mgr = createPromptTemplateManager(makeOptions(), "test-promptmgr");
        expect(() => mgr.setState({ selected: "nope" })).toThrow(/no template with id "nope"/);
        expect(() => mgr.setState({ preview: "yes" })).toThrow(/preview/);
        expect(() => mgr.setState({ variables: [] })).toThrow(/variables/);
        expect(() => mgr.setState({ variables: { t1: "Ada" } })).toThrow(/variables/);
        expect(mgr.getState().selected).toBe("t1");

        mgr.setState({ selected: null });
        expect(mgr.getSelectedTemplate()).toBeNull();
        mgr.destroy();
    });
});
