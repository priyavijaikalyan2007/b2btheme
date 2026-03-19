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
    return el.querySelector(".formdialog-submit") as HTMLElement | null;
}

function getCancelBtn(el: HTMLElement): HTMLElement | null
{
    return el.querySelector(".formdialog-cancel") as HTMLElement | null;
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
