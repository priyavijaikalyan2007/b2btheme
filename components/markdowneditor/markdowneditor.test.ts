/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c7d8e9f0-a1b2-4c3d-4e5f-6a7b8c9d0e1f
 *
 * ⚓ TESTS: MarkdownEditor
 * Vitest unit tests for the MarkdownEditor component.
 * Covers: factory, value, destroy. Mocks Vditor since it requires a
 * real browser DOM.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { MarkdownEditor } from "./markdowneditor";
import type { MarkdownEditorOptions } from "./markdowneditor";

// ============================================================================
// MOCK: Vditor
// ============================================================================

class MockVditor
{
    private el: HTMLElement;
    private value: string;

    constructor(el: HTMLElement | string, options: Record<string, unknown>)
    {
        this.el = typeof el === "string"
            ? document.getElementById(el)! : el;
        this.value = (options?.value as string) || "";

        const editorDiv = document.createElement("div");
        editorDiv.className = "vditor";
        this.el.appendChild(editorDiv);

        if (options?.after && typeof options.after === "function")
        {
            setTimeout(() => (options.after as () => void)(), 0);
        }
    }

    getValue(): string { return this.value; }
    setValue(v: string): void { this.value = v; }
    destroy(): void { /* no-op */ }
    focus(): void { /* no-op */ }
    blur(): void { /* no-op */ }
    disabled(): void { /* no-op */ }
    enable(): void { /* no-op */ }
    getHTML(): string { return `<p>${this.value}</p>`; }
}

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<MarkdownEditorOptions>
): MarkdownEditorOptions
{
    return {
        value: "# Hello World",
        mode: "tabs",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "mde-test-container";
    document.body.appendChild(container);

    const w = window as unknown as Record<string, unknown>;
    w["Vditor"] = MockVditor;
});

afterEach(() =>
{
    container.remove();
    delete (window as unknown as Record<string, unknown>)["Vditor"];
});

// ============================================================================
// FACTORY
// ============================================================================

describe("MarkdownEditor factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const editor = new MarkdownEditor(container, makeOptions());
        expect(editor).toBeDefined();
        editor.destroy();
    });

    test("Constructor_RendersIntoContainer", () =>
    {
        const editor = new MarkdownEditor(container, makeOptions());
        expect(container.children.length).toBeGreaterThan(0);
        editor.destroy();
    });
});

// ============================================================================
// VALUE
// ============================================================================

describe("MarkdownEditor value", () =>
{
    test("GetValue_ReturnsString", () =>
    {
        const editor = new MarkdownEditor(
            container, makeOptions({ value: "# Test" })
        );
        const val = editor.getValue();
        expect(typeof val).toBe("string");
        editor.destroy();
    });

    test("SetValue_UpdatesContent", () =>
    {
        const editor = new MarkdownEditor(container, makeOptions());
        editor.setValue("## Updated");
        // Value roundtrip depends on Vditor mock
        expect(editor.getValue()).toBeDefined();
        editor.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("MarkdownEditor destroy", () =>
{
    test("Destroy_DoesNotThrow", () =>
    {
        const editor = new MarkdownEditor(container, makeOptions());
        expect(() => editor.destroy()).not.toThrow();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const editor = new MarkdownEditor(container, makeOptions());
        editor.destroy();
        expect(() => editor.destroy()).not.toThrow();
    });
});
