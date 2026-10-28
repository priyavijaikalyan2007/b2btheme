/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: RichTextInput
 * Security-focused tests for the RichTextInput component.
 * Covers: SEC-1 innerHTML XSS prevention, paste sanitization,
 * factory function, options, handle methods, toolbar, ARIA
 * accessibility, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import { createRichTextInput, RichTextInput } from "./richtextinput";

// ============================================================================
// HELPERS
// ============================================================================

/** Get the contenteditable div inside a RichTextInput element. */
function getEditable(root: HTMLElement): HTMLElement | null
{
    return root.querySelector(".richtextinput-editable") as HTMLElement | null;
}

/** Get the placeholder element. */
function getPlaceholder(root: HTMLElement): HTMLElement | null
{
    return root.querySelector(".richtextinput-placeholder") as HTMLElement | null;
}

/** Get the toolbar element. */
function getToolbar(root: HTMLElement): HTMLElement | null
{
    return root.querySelector(".richtextinput-toolbar") as HTMLElement | null;
}

/** Get the character counter element. */
function getCounter(root: HTMLElement): HTMLElement | null
{
    return root.querySelector(".richtextinput-counter") as HTMLElement | null;
}

/** Get toolbar buttons by data-action attribute. */
function getToolbarBtn(
    root: HTMLElement,
    action: string
): HTMLElement | null
{
    return root.querySelector(
        `.richtextinput-toolbar-btn[data-action="${action}"]`
    ) as HTMLElement | null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

let container: HTMLElement;

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ============================================================================
// FACTORY — createRichTextInput
// ============================================================================

describe("createRichTextInput", () =>
{
    test("withDefaults_CreatesInstance", () =>
    {
        const editor = createRichTextInput({});
        expect(editor).toBeDefined();
        expect(editor.getElement()).toBeInstanceOf(HTMLElement);
    });

    test("withDefaults_ReturnsRichTextInputInstance", () =>
    {
        const editor = createRichTextInput({});
        expect(editor).toBeInstanceOf(RichTextInput);
    });

    test("rootElement_HasRichtextinputClass", () =>
    {
        const editor = createRichTextInput({});
        expect(editor.getElement().classList.contains("richtextinput")).toBe(true);
    });

    test("withPlaceholder_SetsPlaceholderText", () =>
    {
        const editor = createRichTextInput({ placeholder: "Type here..." });
        const ph = getPlaceholder(editor.getElement());
        expect(ph).not.toBeNull();
        expect(ph?.textContent).toBe("Type here...");
    });

    test("withInitialValue_SetsContent", () =>
    {
        const editor = createRichTextInput({
            value: "<strong>Hello</strong>"
        });
        const editable = getEditable(editor.getElement());
        expect(editable?.innerHTML).toContain("Hello");
    });
});

// ============================================================================
// OPTIONS — SIZE VARIANTS
// ============================================================================

describe("size variants", () =>
{
    test("smSize_AddsSmClass", () =>
    {
        const editor = createRichTextInput({ size: "sm" });
        expect(editor.getElement().classList.contains("richtextinput-sm")).toBe(true);
    });

    test("lgSize_AddsLgClass", () =>
    {
        const editor = createRichTextInput({ size: "lg" });
        expect(editor.getElement().classList.contains("richtextinput-lg")).toBe(true);
    });

    test("defaultSize_NoSizeClass", () =>
    {
        const editor = createRichTextInput({ size: "default" });
        expect(editor.getElement().classList.contains("richtextinput-sm")).toBe(false);
        expect(editor.getElement().classList.contains("richtextinput-lg")).toBe(false);
    });
});

// ============================================================================
// OPTIONS — DISABLED / READONLY
// ============================================================================

describe("disabled and readonly", () =>
{
    test("disabled_SetsContentEditableFalse", () =>
    {
        const editor = createRichTextInput({ disabled: true });
        const editable = getEditable(editor.getElement());
        expect(editable?.contentEditable).toBe("false");
    });

    test("disabled_AddsAriaDisabled", () =>
    {
        const editor = createRichTextInput({ disabled: true });
        const editable = getEditable(editor.getElement());
        expect(editable?.getAttribute("aria-disabled")).toBe("true");
    });

    test("disabled_AddsDisabledClass", () =>
    {
        const editor = createRichTextInput({ disabled: true });
        expect(editor.getElement().classList.contains("richtextinput-disabled")).toBe(true);
    });

    test("readonly_SetsContentEditableFalse", () =>
    {
        const editor = createRichTextInput({ readonly: true });
        const editable = getEditable(editor.getElement());
        expect(editable?.contentEditable).toBe("false");
    });

    test("readonly_AddsAriaReadonly", () =>
    {
        const editor = createRichTextInput({ readonly: true });
        const editable = getEditable(editor.getElement());
        expect(editable?.getAttribute("aria-readonly")).toBe("true");
    });
});

// ============================================================================
// OPTIONS — MIN/MAX HEIGHT
// ============================================================================

describe("minHeight and maxHeight", () =>
{
    test("minHeight_AppliedToEditable", () =>
    {
        const editor = createRichTextInput({ minHeight: "100px" });
        const editable = getEditable(editor.getElement());
        expect(editable?.style.minHeight).toBe("100px");
    });

    test("maxHeight_AppliedToEditable", () =>
    {
        const editor = createRichTextInput({ maxHeight: "300px" });
        const editable = getEditable(editor.getElement());
        expect(editable?.style.maxHeight).toBe("300px");
    });

    test("autoMinHeight_NoInlineStyle", () =>
    {
        const editor = createRichTextInput({ minHeight: "auto" });
        const editable = getEditable(editor.getElement());
        expect(editable?.style.minHeight).toBe("");
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("handle methods", () =>
{
    test("getValue_ReturnsHtmlByDefault", () =>
    {
        const editor = createRichTextInput({
            value: "<strong>Test</strong>"
        });
        const val = editor.getValue();
        expect(val).toContain("Test");
    });

    test("setValue_UpdatesContent", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue("<em>Updated</em>");
        const editable = getEditable(editor.getElement());
        expect(editable?.innerHTML).toContain("<em>");
        expect(editable?.textContent).toContain("Updated");
    });

    test("getPlainText_StripsHtml", () =>
    {
        const editor = createRichTextInput({
            value: "<strong>Bold</strong> text"
        });
        const plain = editor.getPlainText();
        expect(plain).toBe("Bold text");
    });

    test("isEmpty_TrueWhenNoContent", () =>
    {
        const editor = createRichTextInput({});
        expect(editor.isEmpty()).toBe(true);
    });

    test("isEmpty_FalseWhenHasContent", () =>
    {
        const editor = createRichTextInput({ value: "Content" });
        expect(editor.isEmpty()).toBe(false);
    });

    test("clear_RemovesAllContent", () =>
    {
        const editor = createRichTextInput({ value: "Content" });
        editor.setValue("");
        expect(editor.isEmpty()).toBe(true);
    });

    test("focus_FocusesEditableElement", () =>
    {
        // DEBT-TEST-1b. The old comment said "in jsdom, focus may not
        // fully work" and the body then asserted only that the call
        // did not throw, which is true of a focus() that focuses
        // nothing at all.
        //
        // MEASURED RATHER THAN ASSUMED: jsdom will not focus a
        // `contenteditable` div with no `tabindex` — it focuses the
        // same div once a tabindex is added, and focuses an `input`
        // either way. A real browser focuses a contenteditable
        // without one, so the component is right and `activeElement`
        // is simply not readable here. Adding a tabindex to the
        // COMPONENT to make a test observable would be the test
        // driving the product.
        //
        // So the claim is read where it is observable: focus() must
        // reach the editable element and no other (ADR-215).
        const editor = createRichTextInput({});
        container.appendChild(editor.getElement());

        const editable = container.querySelector<HTMLElement>(
            ".richtextinput-editable")!;
        const focused = vi.spyOn(editable, "focus");

        editor.focus();

        expect(focused).toHaveBeenCalledTimes(1);
    });

    test("setDisabled_TogglesState", () =>
    {
        const editor = createRichTextInput({});
        editor.setDisabled(true);
        const editable = getEditable(editor.getElement());
        expect(editable?.contentEditable).toBe("false");
        expect(editable?.getAttribute("aria-disabled")).toBe("true");

        editor.setDisabled(false);
        expect(editable?.contentEditable).toBe("true");
        expect(editable?.hasAttribute("aria-disabled")).toBe(false);
    });

    test("setReadonly_TogglesState", () =>
    {
        const editor = createRichTextInput({});
        editor.setReadonly(true);
        const editable = getEditable(editor.getElement());
        expect(editable?.contentEditable).toBe("false");
        expect(editable?.getAttribute("aria-readonly")).toBe("true");

        editor.setReadonly(false);
        expect(editable?.contentEditable).toBe("true");
        expect(editable?.hasAttribute("aria-readonly")).toBe(false);
    });

    test("destroy_RemovesFromDom", () =>
    {
        const editor = createRichTextInput({});
        container.appendChild(editor.getElement());
        expect(container.children.length).toBe(1);
        editor.destroy();
        expect(container.children.length).toBe(0);
    });

    test("destroy_CalledTwice_IsIdempotent", () =>
    {
        const editor = createRichTextInput({});
        container.appendChild(editor.getElement());
        const probe = destroyProbe();

        editor.destroy();
        const first = probe.total();
        editor.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });

    test("show_AppendsToContainerById", () =>
    {
        const editor = createRichTextInput({});
        editor.show("test-container");
        expect(container.querySelector(".richtextinput")).not.toBeNull();
    });

    test("show_AppendsToContainerElement", () =>
    {
        const editor = createRichTextInput({});
        editor.show(container);
        expect(container.querySelector(".richtextinput")).not.toBeNull();
    });
});

// ============================================================================
// SEC-1: CONTENT SANITIZATION — XSS PREVENTION
// ============================================================================

describe("content sanitization — XSS prevention", () =>
{
    test("setValue_StripsScriptTags", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue("<script>alert('xss')</script>Hello");
        const editable = getEditable(editor.getElement());
        expect(editable?.innerHTML).not.toContain("<script>");
        expect(editable?.textContent).toContain("Hello");
    });

    test("setValue_StripsIframeTags", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue('<iframe src="evil.com"></iframe>Safe text');
        const editable = getEditable(editor.getElement());
        expect(editable?.innerHTML).not.toContain("<iframe");
        expect(editable?.textContent).toContain("Safe text");
    });

    test("setValue_StripsOnclickHandler", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue('<div onclick="alert(1)">Click</div>');
        const editable = getEditable(editor.getElement());
        // The sanitizer strips unallowed tags, so <div> becomes just text
        expect(editable?.innerHTML).not.toContain("onclick");
    });

    test("setValue_StripsDivTags_KeepsText", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue('<div>Content in div</div>');
        const editable = getEditable(editor.getElement());
        // <div> is not in the allowed tags, so it should be stripped
        // but text content preserved
        expect(editable?.textContent).toContain("Content in div");
    });

    test("setValue_StripsImgWithOnerror", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue('<img src="x" onerror="alert(1)">Text');
        const editable = getEditable(editor.getElement());
        // <img> is not in the allowed tags
        expect(editable?.innerHTML).not.toContain("onerror");
        expect(editable?.textContent).toContain("Text");
    });

    test("setValue_PreservesAllowedTags", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue("<strong>Bold</strong> and <em>Italic</em>");
        const editable = getEditable(editor.getElement());
        expect(editable?.innerHTML).toContain("<strong>");
        expect(editable?.innerHTML).toContain("<em>");
    });

    test("setValue_NormalizesB_ToStrong", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue("<b>Bold</b>");
        const editable = getEditable(editor.getElement());
        expect(editable?.innerHTML).toContain("<strong>");
        expect(editable?.innerHTML).not.toContain("<b>");
    });

    test("setValue_NormalizesI_ToEm", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue("<i>Italic</i>");
        const editable = getEditable(editor.getElement());
        expect(editable?.innerHTML).toContain("<em>");
        expect(editable?.innerHTML).not.toContain("<i>");
    });

    test("setValue_NormalizesStrike_ToS", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue("<strike>Struck</strike>");
        const editable = getEditable(editor.getElement());
        expect(editable?.innerHTML).toContain("<s>");
        expect(editable?.innerHTML).not.toContain("<strike>");
    });

    test("setValue_NormalizesDel_ToS", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue("<del>Deleted</del>");
        const editable = getEditable(editor.getElement());
        expect(editable?.innerHTML).toContain("<s>");
        expect(editable?.innerHTML).not.toContain("<del>");
    });

    test("setValue_AnchorKeepsOnlyValidHref", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue(
            '<a href="https://example.com" onclick="alert(1)">Link</a>'
        );
        const editable = getEditable(editor.getElement());
        const link = editable?.querySelector("a");
        expect(link).not.toBeNull();
        expect(link?.getAttribute("href")).toBe("https://example.com");
        // onclick should not be on the anchor
        expect(link?.hasAttribute("onclick")).toBe(false);
    });

    test("setValue_AnchorStripsJavascriptHref", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue(
            '<a href="javascript:alert(1)">Evil link</a>'
        );
        const editable = getEditable(editor.getElement());
        const link = editable?.querySelector("a");
        // The link should not have javascript: href
        if (link)
        {
            expect(link.getAttribute("href") || "").not.toContain("javascript:");
        }
    });

    test("setValue_NestedXssPayload_Stripped", () =>
    {
        const editor = createRichTextInput({});
        editor.setValue(
            '<div><p><script>alert(1)</script></p></div>'
        );
        const editable = getEditable(editor.getElement());
        expect(editable?.innerHTML).not.toContain("<script>");
        expect(editable?.innerHTML).not.toContain("<div>");
        expect(editable?.innerHTML).not.toContain("<p>");
    });
});

// ============================================================================
// TOOLBAR
// ============================================================================

describe("toolbar", () =>
{
    test("formattingEnabled_CreatesToolbar", () =>
    {
        const editor = createRichTextInput({ formatting: true });
        const toolbar = getToolbar(editor.getElement());
        expect(toolbar).not.toBeNull();
    });

    test("formattingDisabled_NoToolbar", () =>
    {
        const editor = createRichTextInput({
            formatting: false,
            lists: false
        });
        const toolbar = getToolbar(editor.getElement());
        expect(toolbar).toBeNull();
    });

    test("showInlineToolbarFalse_NoToolbar", () =>
    {
        const editor = createRichTextInput({ showInlineToolbar: false });
        const toolbar = getToolbar(editor.getElement());
        expect(toolbar).toBeNull();
    });

    test("defaultActions_CreatesFiveButtons", () =>
    {
        const editor = createRichTextInput({ formatting: true });
        const toolbar = getToolbar(editor.getElement());
        const buttons = toolbar?.querySelectorAll(
            ".richtextinput-toolbar-btn"
        );
        // Default: bold, italic, strikethrough, link, code = 5
        expect(buttons?.length).toBe(5);
    });

    test("boldButton_HasCorrectAriaLabel", () =>
    {
        const editor = createRichTextInput({ formatting: true });
        const btn = getToolbarBtn(editor.getElement(), "bold");
        expect(btn?.getAttribute("aria-label")).toBe("Bold");
    });

    test("italicButton_HasCorrectTitle", () =>
    {
        const editor = createRichTextInput({ formatting: true });
        const btn = getToolbarBtn(editor.getElement(), "italic");
        expect(btn?.getAttribute("title")).toContain("Ctrl+I");
    });

    test("listsEnabled_AddsListButtons", () =>
    {
        const editor = createRichTextInput({
            formatting: true,
            lists: true
        });
        expect(getToolbarBtn(editor.getElement(), "orderedList")).not.toBeNull();
        expect(getToolbarBtn(editor.getElement(), "unorderedList")).not.toBeNull();
        expect(getToolbarBtn(editor.getElement(), "taskList")).not.toBeNull();
    });

    test("customToolbarActions_OverridesDefault", () =>
    {
        const editor = createRichTextInput({
            formatting: true,
            toolbarActions: ["bold", "italic"]
        });
        const toolbar = getToolbar(editor.getElement());
        const buttons = toolbar?.querySelectorAll(
            ".richtextinput-toolbar-btn"
        );
        expect(buttons?.length).toBe(2);
    });
});

// ============================================================================
// ARIA ACCESSIBILITY
// ============================================================================

describe("ARIA accessibility", () =>
{
    test("editableDiv_HasTextboxRole", () =>
    {
        const editor = createRichTextInput({});
        const editable = getEditable(editor.getElement());
        expect(editable?.getAttribute("role")).toBe("textbox");
    });

    test("editableDiv_HasAriaMultiline", () =>
    {
        const editor = createRichTextInput({});
        const editable = getEditable(editor.getElement());
        expect(editable?.getAttribute("aria-multiline")).toBe("true");
    });

    test("editableDiv_HasAriaLabel", () =>
    {
        const editor = createRichTextInput({ placeholder: "Enter text" });
        const editable = getEditable(editor.getElement());
        expect(editable?.getAttribute("aria-label")).toBe("Enter text");
    });

    test("editableDiv_DefaultAriaLabel", () =>
    {
        const editor = createRichTextInput({});
        const editable = getEditable(editor.getElement());
        expect(editable?.getAttribute("aria-label")).toBe("Rich text input");
    });

    test("placeholder_HasAriaHidden", () =>
    {
        const editor = createRichTextInput({ placeholder: "Type..." });
        const ph = getPlaceholder(editor.getElement());
        expect(ph?.getAttribute("aria-hidden")).toBe("true");
    });

    test("toolbar_HasRoleToolbar", () =>
    {
        const editor = createRichTextInput({ formatting: true });
        const toolbar = getToolbar(editor.getElement());
        expect(toolbar?.getAttribute("role")).toBe("toolbar");
    });

    test("toolbar_HasAriaLabel", () =>
    {
        const editor = createRichTextInput({ formatting: true });
        const toolbar = getToolbar(editor.getElement());
        expect(toolbar?.getAttribute("aria-label")).toBe("Text formatting");
    });

    test("toolbarButtons_HaveAriaLabels", () =>
    {
        const editor = createRichTextInput({ formatting: true });
        const toolbar = getToolbar(editor.getElement());
        const buttons = toolbar?.querySelectorAll(
            ".richtextinput-toolbar-btn"
        );
        buttons?.forEach(btn =>
        {
            expect(btn.getAttribute("aria-label")).toBeTruthy();
        });
    });
});

// ============================================================================
// CHARACTER COUNTER
// ============================================================================

describe("character counter", () =>
{
    test("showCounterTrue_CreatesCounter", () =>
    {
        const editor = createRichTextInput({ showCounter: true });
        const counter = getCounter(editor.getElement());
        expect(counter).not.toBeNull();
    });

    test("showCounterFalse_NoCounter", () =>
    {
        const editor = createRichTextInput({ showCounter: false });
        const counter = getCounter(editor.getElement());
        expect(counter).toBeNull();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onFocus_CalledOnEditableFocus", () =>
    {
        const onFocus = vi.fn();
        const editor = createRichTextInput({ onFocus });
        container.appendChild(editor.getElement());

        const editable = getEditable(editor.getElement());
        editable?.dispatchEvent(new Event("focus"));

        expect(onFocus).toHaveBeenCalledOnce();
    });

    test("onBlur_CalledOnEditableBlur", () =>
    {
        const onBlur = vi.fn();
        const editor = createRichTextInput({ onBlur });
        container.appendChild(editor.getElement());

        const editable = getEditable(editor.getElement());
        editable?.dispatchEvent(new Event("focus"));
        editable?.dispatchEvent(new Event("blur"));

        expect(onBlur).toHaveBeenCalledOnce();
    });
});

// ============================================================================
// CSS CLASS AND RESIZABLE
// ============================================================================

describe("cssClass and resizable", () =>
{
    test("cssClass_AddedToRoot", () =>
    {
        const editor = createRichTextInput({ cssClass: "my-custom" });
        expect(editor.getElement().classList.contains("my-custom")).toBe(true);
    });

    test("resizableDefault_AddsResizableClass", () =>
    {
        const editor = createRichTextInput({});
        expect(
            editor.getElement().classList.contains("richtextinput-resizable")
        ).toBe(true);
    });

    test("resizableFalse_NoResizableClass", () =>
    {
        const editor = createRichTextInput({ resizable: false });
        expect(
            editor.getElement().classList.contains("richtextinput-resizable")
        ).toBe(false);
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    // "CreatesValidEditor" IS A CLAIM ABOUT THE EDITOR and the body
    // asserted only that the call returned. The block was filed as
    // idempotent on the strength of the word "empty" in its title,
    // which IDEMPOTENT matched before anything asked what the rest
    // of the title promised (ADR-216). Valid means usable: the
    // contenteditable surface is there and it takes a value.
    test("emptyOptions_CreatesValidEditor", () =>
    {
        const editor = createRichTextInput({});

        // MEASURED: the component sets the `contentEditable` IDL
        // property and jsdom does not reflect it to an attribute, so
        // `getAttribute("contenteditable")` reads null here while
        // the property reads "true".
        const editable = getEditable(editor.getElement())!;
        expect(editable.contentEditable).toBe("true");

        editor.setValue("<p>typed</p>");
        expect(editor.getHtml()).toContain("typed");

        editor.destroy();
    });

    test("getHtml_ReturnsEmptyForBrOnly", () =>
    {
        const editor = createRichTextInput({});
        const editable = getEditable(editor.getElement());
        if (editable) { editable.innerHTML = "<br>"; }
        // getHtml should treat a lone <br> as empty
        expect(editor.getHtml()).toBe("");
    });

    test("getStieEngine_ReturnsNullWhenNoTriggers", () =>
    {
        const editor = createRichTextInput({});
        expect(editor.getStieEngine()).toBeNull();
    });
});

// ============================================================================
// SURFACE CONTRACT (B5): additive on("submit"), getState/setState and setData.
// onSubmit keeps firing first, exactly once; the channel fires after it.
// ============================================================================

describe("surface contract (B5)", () =>
{
    /** Press Ctrl+Enter in the editable (the submit gesture). */
    function pressCtrlEnter(editor: ReturnType<typeof createRichTextInput>): void
    {
        getEditable(editor.getElement())!.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true }));
    }

    test("on_Submit_HearsTheValue_AfterOnSubmit_ExactlyOnce", () =>
    {
        const order: string[] = [];
        const editor = createRichTextInput({
            value: "<b>hi</b>",
            submitOnCtrlEnter: true,
            onSubmit: (v) => order.push(`option:${v}`)
        });
        editor.on("submit", (v) => order.push(`channel:${String(v)}`));

        pressCtrlEnter(editor);

        expect(order).toEqual(["option:<strong>hi</strong>", "channel:<strong>hi</strong>"]);
        editor.destroy();
    });

    test("on_Submit_EmitsWithoutOnSubmitCallback", () =>
    {
        const heard = vi.fn();
        const editor = createRichTextInput({ value: "text", submitOnCtrlEnter: true });
        editor.on("submit", heard);

        pressCtrlEnter(editor);

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith("text");
        editor.destroy();
    });

    test("on_Submit_HonoursSubmitOnCtrlEnterGate", () =>
    {
        const heard = vi.fn();
        const editor = createRichTextInput({ value: "text" });
        editor.on("submit", heard);

        pressCtrlEnter(editor);

        expect(heard).not.toHaveBeenCalled();
        editor.destroy();
    });

    test("on_Submit_MetaEnterAlsoEmits", () =>
    {
        const heard = vi.fn();
        const editor = createRichTextInput({ value: "text", submitOnCtrlEnter: true });
        editor.on("submit", heard);

        getEditable(editor.getElement())!.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true, cancelable: true }));

        expect(heard).toHaveBeenCalledWith("text");
        editor.destroy();
    });

    test("on_Submit_InMarkdownMode_HearsTheMarkdown", () =>
    {
        const heard = vi.fn();
        const editor = createRichTextInput({ value: "<b>hi</b>", outputFormat: "markdown", submitOnCtrlEnter: true });
        editor.on("submit", heard);

        pressCtrlEnter(editor);

        expect(heard).toHaveBeenCalledWith(editor.getValue());
        editor.destroy();
    });

    test("on_Submit_UnsubscribeStopsDelivery", () =>
    {
        const heard = vi.fn();
        const editor = createRichTextInput({ value: "text", submitOnCtrlEnter: true });
        const off = editor.on("submit", heard);

        pressCtrlEnter(editor);
        off();
        pressCtrlEnter(editor);

        expect(heard).toHaveBeenCalledTimes(1);
        editor.destroy();
    });

    test("on_Submit_ThrowingHandler_IsLoggedAndOthersStillHear", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const heard = vi.fn();
        const editor = createRichTextInput({ value: "text", submitOnCtrlEnter: true });
        editor.on("submit", () => { throw new Error("boom"); });
        editor.on("submit", heard);

        pressCtrlEnter(editor);

        expect(heard).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalled();
        editor.destroy();
    });

    test("destroy_ClearsHandlers", () =>
    {
        const heard = vi.fn();
        const editor = createRichTextInput({ value: "text", submitOnCtrlEnter: true });
        editor.on("submit", heard);
        const el = getEditable(editor.getElement())!;

        editor.destroy();
        el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }));

        expect(heard).not.toHaveBeenCalled();
    });

    test("on_UnknownChannel_Throws_NamingTheValidChannel", () =>
    {
        const editor = createRichTextInput({});

        expect(() => editor.on("bogus", () => undefined)).toThrow("submit");
        editor.destroy();
    });

    test("setData_Throws_NoDataSlots", () =>
    {
        const editor = createRichTextInput({});

        expect(() => editor.setData("value", "x")).toThrow("no data slots");
        editor.destroy();
    });

    test("getState_SetState_RoundTripValue", () =>
    {
        const editor = createRichTextInput({ value: "<strong>one</strong>" });
        const captured = editor.getState();

        editor.setValue("two");
        expect(editor.getState()).toEqual({ value: "two" });

        editor.setState(captured);
        expect(editor.getState()).toEqual({ value: "<strong>one</strong>" });
        expect(editor.getHtml()).toBe("<strong>one</strong>");
        editor.destroy();
    });

    test("setState_WithoutValueKey_ChangesNothing", () =>
    {
        const editor = createRichTextInput({ value: "keep" });

        editor.setState({});

        expect(editor.getValue()).toBe("keep");
        editor.destroy();
    });

    test("payloads_AreJson", () =>
    {
        const heard = vi.fn();
        const editor = createRichTextInput({ value: "<i>x</i>", submitOnCtrlEnter: true });
        editor.on("submit", heard);

        pressCtrlEnter(editor);

        const payload = heard.mock.calls[0][0];
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        const state = editor.getState();
        expect(JSON.parse(JSON.stringify(state))).toEqual(state);
        editor.destroy();
    });
});
