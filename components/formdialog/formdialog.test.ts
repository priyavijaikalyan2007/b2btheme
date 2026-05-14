/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: FormDialog
 * Spec-based tests for the FormDialog modal form builder component.
 * Tests cover: factory function, options/defaults, DOM structure, ARIA,
 * handle methods (getValue/setValue/destroy), callbacks, keyboard, edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createFormDialog } from "./formdialog";
import type { FormDialogOptions, FormFieldDef, FormDialog } from "./formdialog";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function defaultOptions(overrides?: Partial<FormDialogOptions>): FormDialogOptions
{
    return {
        title: "Test Form",
        fields: [
            { name: "username", label: "Username", type: "text" },
        ],
        onSubmit: vi.fn(),
        ...overrides,
    };
}

function getDialog(): HTMLElement | null
{
    return document.querySelector(".formdialog");
}

function getBackdrop(): HTMLElement | null
{
    return document.querySelector(".formdialog-backdrop");
}

function getTitle(el: HTMLElement): string
{
    const t = el.querySelector(".formdialog-title");
    return t?.textContent ?? "";
}

function getInput(el: HTMLElement, name: string): HTMLInputElement | null
{
    return el.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
}

function getSubmitBtn(el: HTMLElement): HTMLElement | null
{
    return el.querySelector(".formdialog-btn-submit") as HTMLElement | null;
}

function getCancelBtn(el: HTMLElement): HTMLElement | null
{
    return el.querySelector(".formdialog-btn-cancel") as HTMLElement | null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    const dialogs = document.querySelectorAll(".formdialog-overlay");
    dialogs.forEach((d) => d.remove());
    container.remove();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

describe("createFormDialog", () =>
{
    test("withValidOptions_ReturnsHandleObject", () =>
    {
        const handle = createFormDialog(defaultOptions());
        expect(handle).toBeDefined();
        expect(typeof handle.show).toBe("function");
        expect(typeof handle.close).toBe("function");
        expect(typeof handle.destroy).toBe("function");
        handle.destroy();
    });

    test("withValidOptions_ReturnsGetElementMethod", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        const el = handle.getElement();
        expect(el).toBeInstanceOf(HTMLElement);
        handle.destroy();
    });

    test("withValidOptions_ProvidesGetValueSetValue", () =>
    {
        const handle = createFormDialog(defaultOptions());
        expect(typeof handle.getValue).toBe("function");
        expect(typeof handle.setValue).toBe("function");
        handle.destroy();
    });
});

// ============================================================================
// OPTIONS & DEFAULTS
// ============================================================================

describe("FormDialog options and defaults", () =>
{
    test("withDefaultSize_UsesMdSize", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        const el = handle.getElement();
        expect(el.querySelector(".formdialog-dialog")).toBeDefined();
        handle.destroy();
    });

    test("withCustomTitle_DisplaysTitle", () =>
    {
        const handle = createFormDialog(defaultOptions({ title: "My Custom Form" }));
        handle.show();
        vi.advanceTimersByTime(300);
        const el = handle.getElement();
        expect(getTitle(el)).toBe("My Custom Form");
        handle.destroy();
    });

    test("withSubmitLabel_DisplaysCustomLabel", () =>
    {
        const handle = createFormDialog(defaultOptions({ submitLabel: "Save" }));
        handle.show();
        vi.advanceTimersByTime(300);
        const submitBtn = getSubmitBtn(handle.getElement());
        expect(submitBtn?.textContent).toContain("Save");
        handle.destroy();
    });

    test("withCancelLabel_DisplaysCustomLabel", () =>
    {
        const handle = createFormDialog(defaultOptions({ cancelLabel: "Discard" }));
        handle.show();
        vi.advanceTimersByTime(300);
        const cancelBtn = getCancelBtn(handle.getElement());
        expect(cancelBtn?.textContent).toContain("Discard");
        handle.destroy();
    });

    test("withCssClass_AppliesCustomClass", () =>
    {
        const handle = createFormDialog(defaultOptions({ cssClass: "my-custom" }));
        handle.show();
        vi.advanceTimersByTime(300);
        const el = handle.getElement();
        expect(el.classList.contains("my-custom")).toBe(true);
        handle.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("FormDialog DOM structure", () =>
{
    test("show_CreatesOverlayWithBackdrop", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        const el = handle.getElement();
        expect(el.querySelector(".formdialog-backdrop")).not.toBeNull();
        handle.destroy();
    });

    test("show_RendersFieldInputs", () =>
    {
        const fields: FormFieldDef[] = [
            { name: "email", label: "Email", type: "email" },
            { name: "name", label: "Name", type: "text" },
        ];
        const handle = createFormDialog(defaultOptions({ fields }));
        handle.show();
        vi.advanceTimersByTime(300);
        const el = handle.getElement();
        expect(getInput(el, "email")).not.toBeNull();
        expect(getInput(el, "name")).not.toBeNull();
        handle.destroy();
    });

    test("withTextareaField_RendersTextareaElement", () =>
    {
        const fields: FormFieldDef[] = [
            { name: "desc", label: "Description", type: "textarea" },
        ];
        const handle = createFormDialog(defaultOptions({ fields }));
        handle.show();
        vi.advanceTimersByTime(300);
        const el = handle.getElement();
        const textarea = el.querySelector("textarea[name='desc']");
        expect(textarea).not.toBeNull();
        handle.destroy();
    });

    test("withSelectField_RendersSelectElement", () =>
    {
        const fields: FormFieldDef[] = [
            {
                name: "role", label: "Role", type: "select",
                options: [
                    { value: "admin", label: "Admin" },
                    { value: "user", label: "User" },
                ],
            },
        ];
        const handle = createFormDialog(defaultOptions({ fields }));
        handle.show();
        vi.advanceTimersByTime(300);
        const el = handle.getElement();
        const select = el.querySelector("select[name='role']");
        expect(select).not.toBeNull();
        handle.destroy();
    });
});

// ============================================================================
// ARIA ATTRIBUTES
// ============================================================================

describe("FormDialog ARIA", () =>
{
    test("dialog_HasRoleDialog", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        const el = handle.getElement();
        const dialog = el.querySelector("[role='dialog']");
        expect(dialog).not.toBeNull();
        handle.destroy();
    });

    test("dialog_HasAriaModal", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        const el = handle.getElement();
        const dialog = el.querySelector("[role='dialog']");
        expect(dialog?.getAttribute("aria-modal")).toBe("true");
        handle.destroy();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("FormDialog handle methods", () =>
{
    test("getValue_ReturnsFieldValue", () =>
    {
        const handle = createFormDialog(defaultOptions({
            fields: [
                { name: "test", label: "Test", type: "text", value: "hello" },
            ],
        }));
        handle.show();
        vi.advanceTimersByTime(300);
        expect(handle.getValue("test")).toBe("hello");
        handle.destroy();
    });

    test("setValue_UpdatesFieldValue", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        handle.setValue("username", "newvalue");
        expect(handle.getValue("username")).toBe("newvalue");
        handle.destroy();
    });

    test("getValues_ReturnsAllFieldValues", () =>
    {
        const fields: FormFieldDef[] = [
            { name: "a", label: "A", type: "text", value: "1" },
            { name: "b", label: "B", type: "text", value: "2" },
        ];
        const handle = createFormDialog(defaultOptions({ fields }));
        handle.show();
        vi.advanceTimersByTime(300);
        const values = handle.getValues();
        expect(values.a).toBe("1");
        expect(values.b).toBe("2");
        handle.destroy();
    });

    test("setTitle_UpdatesTitleText", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        handle.setTitle("Updated Title");
        const el = handle.getElement();
        expect(getTitle(el)).toBe("Updated Title");
        handle.destroy();
    });

    test("setLoading_DisablesSubmitButton", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        handle.setLoading(true);
        const submitBtn = getSubmitBtn(handle.getElement());
        expect(submitBtn?.hasAttribute("disabled")).toBe(true);
        handle.destroy();
    });

    test("isDirty_ReturnsFalseInitially", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        expect(handle.isDirty()).toBe(false);
        handle.destroy();
    });

    test("destroy_RemovesDialogFromDOM", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        handle.destroy();
        vi.advanceTimersByTime(300);
        expect(getDialog()).toBeNull();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("FormDialog callbacks", () =>
{
    test("onCancel_CalledOnCancelClick", () =>
    {
        const onCancel = vi.fn();
        const handle = createFormDialog(defaultOptions({ onCancel }));
        handle.show();
        vi.advanceTimersByTime(300);
        const cancelBtn = getCancelBtn(handle.getElement());
        cancelBtn?.click();
        vi.advanceTimersByTime(300);
        expect(onCancel).toHaveBeenCalled();
        handle.destroy();
    });

    test("onFieldChange_CalledOnInput", () =>
    {
        const onFieldChange = vi.fn();
        const handle = createFormDialog(defaultOptions({ onFieldChange }));
        handle.show();
        vi.advanceTimersByTime(300);
        const input = getInput(handle.getElement(), "username");
        if (input)
        {
            input.value = "typed";
            input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        expect(onFieldChange).toHaveBeenCalledWith("username", "typed");
        handle.destroy();
    });
});

// ============================================================================
// KEYBOARD
// ============================================================================

describe("FormDialog keyboard", () =>
{
    test("escapeKey_ClosesDialogByDefault", () =>
    {
        const onCancel = vi.fn();
        const handle = createFormDialog(defaultOptions({ onCancel }));
        handle.show();
        vi.advanceTimersByTime(300);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        vi.advanceTimersByTime(300);
        expect(onCancel).toHaveBeenCalled();
        handle.destroy();
    });

    test("escapeKey_WithCloseOnEscapeFalse_DoesNotClose", () =>
    {
        const onCancel = vi.fn();
        const handle = createFormDialog(defaultOptions({
            onCancel, closeOnEscape: false,
        }));
        handle.show();
        vi.advanceTimersByTime(300);
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        vi.advanceTimersByTime(300);
        expect(onCancel).not.toHaveBeenCalled();
        handle.destroy();
    });
});

// ============================================================================
// WIZARD / STEP MODE
// ============================================================================

describe("FormDialog wizard mode", () =>
{
    test("withSteps_StartsAtFirstStep", () =>
    {
        const handle = createFormDialog(defaultOptions({
            fields: undefined,
            steps: [
                { id: "s1", label: "Step 1", fields: [{ name: "a", label: "A", type: "text" }] },
                { id: "s2", label: "Step 2", fields: [{ name: "b", label: "B", type: "text" }] },
            ],
        }));
        handle.show();
        vi.advanceTimersByTime(300);
        expect(handle.getCurrentStep()).toBe(0);
        handle.destroy();
    });

    test("nextStep_AdvancesToSecondStep", () =>
    {
        const handle = createFormDialog(defaultOptions({
            fields: undefined,
            steps: [
                { id: "s1", label: "Step 1", fields: [{ name: "a", label: "A", type: "text" }] },
                { id: "s2", label: "Step 2", fields: [{ name: "b", label: "B", type: "text" }] },
            ],
        }));
        handle.show();
        vi.advanceTimersByTime(300);
        handle.nextStep();
        vi.advanceTimersByTime(300);
        expect(handle.getCurrentStep()).toBe(1);
        handle.destroy();
    });

    test("prevStep_GoesBackToPreviousStep", () =>
    {
        const handle = createFormDialog(defaultOptions({
            fields: undefined,
            steps: [
                { id: "s1", label: "Step 1", fields: [{ name: "a", label: "A", type: "text" }] },
                { id: "s2", label: "Step 2", fields: [{ name: "b", label: "B", type: "text" }] },
            ],
        }));
        handle.show();
        vi.advanceTimersByTime(300);
        handle.nextStep();
        vi.advanceTimersByTime(300);
        handle.prevStep();
        vi.advanceTimersByTime(300);
        expect(handle.getCurrentStep()).toBe(0);
        handle.destroy();
    });
});

// ============================================================================
// WIZARD STATE PERSISTENCE — guards against the apps-team-reported bug where
// toggle (and in general any field-type) state was lost across step navigation
// because the live DOM is destroyed on every step change. The cache MUST seed
// rebuilds and MUST be readable from getValues() from any step.
// ============================================================================

describe("FormDialog wizard state persistence", () =>
{
    function threeStepWizard(extra: FormFieldDef[] = []): FormDialog
    {
        return createFormDialog({
            title: "Wizard",
            stepTransition: "none",
            steps: [
                { id: "a", label: "A", fields: [
                    { name: "text_a", label: "Text A", type: "text" },
                ]},
                { id: "b", label: "B", fields: [
                    { name: "flag", label: "Flag", type: "toggle", checked: false },
                    { name: "pick", label: "Pick", type: "radio", options: [
                        { value: "x", label: "X" }, { value: "y", label: "Y" },
                    ]},
                    { name: "agree", label: "Agree", type: "checkbox" },
                    { name: "note", label: "Note", type: "textarea" },
                    ...extra,
                ]},
                { id: "c", label: "C", fields: [
                    { name: "review", label: "Review", type: "text" },
                ]},
            ],
            onSubmit: vi.fn(),
        });
    }

    test("toggle_PreservedAcrossStepNavigation", () =>
    {
        const handle = threeStepWizard();
        handle.show();
        vi.advanceTimersByTime(300);
        handle.nextStep();
        vi.advanceTimersByTime(300);
        const toggle = getInput(handle.getElement(), "flag")!;
        toggle.checked = true;
        toggle.dispatchEvent(new Event("change"));
        handle.nextStep();
        vi.advanceTimersByTime(300);
        expect(handle.getValues().flag).toBe("true");
        handle.prevStep();
        vi.advanceTimersByTime(300);
        const toggleAgain = getInput(handle.getElement(), "flag")!;
        expect(toggleAgain.checked).toBe(true);
        handle.destroy();
    });

    test("checkbox_PreservedAcrossStepNavigation", () =>
    {
        const handle = threeStepWizard();
        handle.show();
        vi.advanceTimersByTime(300);
        handle.nextStep();
        vi.advanceTimersByTime(300);
        const cb = getInput(handle.getElement(), "agree")!;
        cb.checked = true;
        cb.dispatchEvent(new Event("change"));
        handle.nextStep();
        vi.advanceTimersByTime(300);
        expect(handle.getValues().agree).toBe("true");
        handle.prevStep();
        vi.advanceTimersByTime(300);
        expect(getInput(handle.getElement(), "agree")!.checked).toBe(true);
        handle.destroy();
    });

    test("radio_PreservedAcrossStepNavigation", () =>
    {
        const handle = threeStepWizard();
        handle.show();
        vi.advanceTimersByTime(300);
        handle.nextStep();
        vi.advanceTimersByTime(300);
        const radio = handle.getElement().querySelector<HTMLInputElement>(
            'input[type="radio"][value="y"]')!;
        radio.checked = true;
        radio.dispatchEvent(new Event("change"));
        handle.nextStep();
        vi.advanceTimersByTime(300);
        expect(handle.getValues().pick).toBe("y");
        handle.prevStep();
        vi.advanceTimersByTime(300);
        const reread = handle.getElement().querySelector<HTMLInputElement>(
            'input[type="radio"][value="y"]')!;
        expect(reread.checked).toBe(true);
        handle.destroy();
    });

    test("text_PreservedAcrossStepNavigation", () =>
    {
        const handle = threeStepWizard();
        handle.show();
        vi.advanceTimersByTime(300);
        const textA = getInput(handle.getElement(), "text_a")!;
        textA.value = "hello";
        textA.dispatchEvent(new Event("input"));
        handle.nextStep();
        vi.advanceTimersByTime(300);
        expect(handle.getValues().text_a).toBe("hello");
        handle.nextStep();
        vi.advanceTimersByTime(300);
        expect(handle.getValues().text_a).toBe("hello");
        handle.prevStep();
        vi.advanceTimersByTime(300);
        handle.prevStep();
        vi.advanceTimersByTime(300);
        expect(getInput(handle.getElement(), "text_a")!.value).toBe("hello");
        handle.destroy();
    });

    test("textarea_PreservedAcrossStepNavigation", () =>
    {
        const handle = threeStepWizard();
        handle.show();
        vi.advanceTimersByTime(300);
        handle.nextStep();
        vi.advanceTimersByTime(300);
        const ta = handle.getElement().querySelector<HTMLTextAreaElement>(
            'textarea[name="note"]')!;
        ta.value = "scribble";
        ta.dispatchEvent(new Event("input"));
        handle.nextStep();
        vi.advanceTimersByTime(300);
        expect(handle.getValues().note).toBe("scribble");
        handle.prevStep();
        vi.advanceTimersByTime(300);
        const reread = handle.getElement().querySelector<HTMLTextAreaElement>(
            'textarea[name="note"]')!;
        expect(reread.value).toBe("scribble");
        handle.destroy();
    });

    test("setValue_FromInactiveStepIsAppliedOnReturn", () =>
    {
        const handle = threeStepWizard();
        handle.show();
        vi.advanceTimersByTime(300);
        // Step 0; set a field that lives on step 1.
        handle.setValue("flag", "true");
        handle.nextStep();
        vi.advanceTimersByTime(300);
        expect(getInput(handle.getElement(), "flag")!.checked).toBe(true);
        expect(handle.getValues().flag).toBe("true");
        handle.destroy();
    });

    test("getValues_ReturnsDeclaredDefaultsFromUnvisitedSteps", () =>
    {
        const handle = threeStepWizard();
        handle.show();
        vi.advanceTimersByTime(300);
        // Step 0 active; step 1 declares flag:false.
        expect(handle.getValues().flag).toBe("false");
        handle.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("FormDialog edge cases", () =>
{
    test("close_ThenShow_WorksNormally", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        handle.close();
        vi.advanceTimersByTime(300);
        handle.show();
        vi.advanceTimersByTime(300);
        const el = handle.getElement();
        expect(el).toBeDefined();
        handle.destroy();
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        expect(() =>
        {
            handle.destroy();
            handle.destroy();
        }).not.toThrow();
    });

    test("getValueForMissingField_ReturnsEmptyString", () =>
    {
        const handle = createFormDialog(defaultOptions());
        handle.show();
        vi.advanceTimersByTime(300);
        const val = handle.getValue("nonexistent");
        expect(val).toBe("");
        handle.destroy();
    });
});

// ============================================================================
// FIELD-TYPE EXPANSION (ADR-133)
// ============================================================================

describe("expandedFieldTypes", () =>
{
    function showWithFields(fields: FormFieldDef[]): FormDialog
    {
        const handle = createFormDialog({
            title: "Expanded",
            fields,
            onSubmit: vi.fn(),
        });
        handle.show();
        vi.advanceTimersByTime(300);
        return handle;
    }

    test("urlFieldRendersInputTypeUrl", () =>
    {
        const handle = showWithFields(
            [{ name: "u", label: "U", type: "url" }]);
        const dialog = handle.getElement();
        expect(getInput(dialog, "u")?.type).toBe("url");
        handle.destroy();
    });

    test("datetimeAndTimeFieldsRender", () =>
    {
        const handle = showWithFields([
            { name: "d", label: "D", type: "datetime" },
            { name: "t", label: "T", type: "time" },
        ]);
        const dialog = handle.getElement();
        expect(["datetime-local", "datetime"].includes(getInput(dialog, "d")!.type)).toBe(true);
        expect(getInput(dialog, "t")?.type).toBe("time");
        handle.destroy();
    });

    test("colorFieldRendersInputTypeColor", () =>
    {
        const handle = showWithFields(
            [{ name: "c", label: "C", type: "color", value: "#336699" }]);
        const dialog = handle.getElement();
        const input = getInput(dialog, "c");
        expect(input?.type).toBe("color");
        expect(handle.getValue("c")).toBe("#336699");
        handle.destroy();
    });

    test("radioFieldGetsSelectedValue", () =>
    {
        const handle = showWithFields([
            {
                name: "r", label: "R", type: "radio",
                options: [
                    { value: "a", label: "A" },
                    { value: "b", label: "B" },
                ],
                value: "a",
            },
        ]);
        const dialog = handle.getElement();
        expect(handle.getValue("r")).toBe("a");
        const bRadio = dialog.querySelector<HTMLInputElement>(
            'input[type="radio"][name="r"][value="b"]')!;
        bRadio.checked = true;
        bRadio.dispatchEvent(new Event("change", { bubbles: true }));
        expect(handle.getValue("r")).toBe("b");
        handle.destroy();
    });

    test("codeFieldRendersMonospaceTextarea", () =>
    {
        const handle = showWithFields(
            [{ name: "k", label: "K", type: "code", value: "{ a: 1 }" }]);
        const dialog = handle.getElement();
        const ta = dialog.querySelector<HTMLTextAreaElement>('textarea[name="k"]')!;
        expect(ta).not.toBeNull();
        expect(ta.classList.contains("formdialog-code")).toBe(true);
        expect(handle.getValue("k")).toBe("{ a: 1 }");
        handle.destroy();
    });

    test("richtextFieldRoundTripsViaMirror", () =>
    {
        const handle = showWithFields(
            [{ name: "x", label: "X", type: "richtext", value: "<b>hi</b>" }]);
        const dialog = handle.getElement();
        const editor = dialog.querySelector<HTMLElement>(".formdialog-richtext")!;
        expect(editor).not.toBeNull();
        expect(editor.innerHTML).toBe("<b>hi</b>");
        expect(handle.getValue("x")).toBe("<b>hi</b>");
        handle.destroy();
    });

    test("urlValidationRejectsBadUrl", () =>
    {
        const onSubmit = vi.fn();
        const handle = createFormDialog({
            title: "U",
            fields: [{ name: "u", label: "U", type: "url", required: true }],
            onSubmit,
        });
        handle.show();
        vi.advanceTimersByTime(300);
        handle.setValue("u", "not-a-url");
        const submit = getSubmitBtn(handle.getElement())!;
        submit.click();
        expect(onSubmit).not.toHaveBeenCalled();
        handle.destroy();
    });
});
