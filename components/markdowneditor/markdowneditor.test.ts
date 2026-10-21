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
import { destroyProbe } from "../../tests/destroy-probe";
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
    // `new MarkdownEditor(...)` cannot return undefined, so this
    // held for every options object the class accepts. The block
    // below already covers the render, so the claim left is that
    // the editor was handed its STARTING VALUE -- the one option
    // that has to survive construction to be of any use.
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const editor = new MarkdownEditor(container, makeOptions({
            value: "# Starting content",
        }));

        expect(editor.getValue()).toBe("# Starting content");
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

        // "" is a string too, and "" is what a broken editor returns.
        // The value the caller passed in is the thing being claimed.
        expect(editor.getValue()).toBe("# Test");

        editor.destroy();
    });

    // "Value roundtrip depends on Vditor mock" was offered as the
    // reason not to assert the roundtrip, and MockVditor above does
    // exactly the roundtrip -- `setValue` stores and `getValue`
    // returns. The dependency is the test's own, so there is
    // nothing to be cautious about.
    test("SetValue_UpdatesContent", () =>
    {
        const editor = new MarkdownEditor(container, makeOptions({
            value: "# Before",
        }));

        editor.setValue("## Updated");

        expect(editor.getValue()).toBe("## Updated");
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
        const probe = destroyProbe();

        editor.destroy();
        const first = probe.total();
        editor.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });
});

// ===========================================================================
// ADR-149: Vditor must not fetch its engine from a public CDN
// ===========================================================================

describe("vditorCdn", () =>
{
    test("InitVditor_SetsCdnToThisOrigin_NotUnpkg", () =>
    {
        // Vditor lazily fetches lute (its markdown engine), the icon set,
        // the language pack and every optional renderer as script tags it
        // injects itself. Left at its default that is executable code from
        // unpkg.com, arriving on a page that may be showing an admin
        // session. The `cdn` option is the only thing that redirects it.
        let captured: Record<string, unknown> | null = null;

        (window as unknown as Record<string, unknown>).Vditor =
            function (this: unknown, _id: string, opts: Record<string, unknown>)
            {
                captured = opts;
                return {
                    getValue: () => "",
                    getHTML: () => "",
                    destroy: () => {},
                    disabled: () => {},
                };
            };

        const editor = new MarkdownEditor(container, makeOptions({ mode: "wysiwyg" }));

        expect(captured).not.toBeNull();

        const cdn = String((captured as unknown as Record<string, unknown>).cdn ?? "");

        expect(cdn).toContain("/lib/vditor-");
        expect(cdn).not.toContain("unpkg.com");
        expect(cdn).not.toContain("jsdelivr");

        editor.destroy();
        delete (window as unknown as Record<string, unknown>).Vditor;
    });
});
