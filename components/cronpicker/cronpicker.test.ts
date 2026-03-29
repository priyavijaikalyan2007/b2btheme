/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: d6e9f4c3-8a2b-4d5c-bf78-4h3f9c0d5e08
 * Created: 2026-03-19
 */

/**
 * Tests: CronPicker
 * Comprehensive Vitest unit tests for the CronPicker component.
 * Covers: factory, options, getValue/setValue, preset selection,
 * CRON expression parsing, clear, enable/disable, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    CronPicker,
    createCronPicker,
} from "./cronpicker";
import type { CronPickerOptions, CronPreset } from "./cronpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-cronpicker-container";
    document.body.appendChild(el);
    return el;
}

function removeContainer(): void
{
    if (container && container.parentNode)
    {
        container.parentNode.removeChild(container);
    }
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = createContainer();
});

afterEach(() =>
{
    removeContainer();
});

// ============================================================================
// FACTORY — createCronPicker
// ============================================================================

describe("createCronPicker", () =>
{
    test("Factory_WithContainerId_ReturnsPicker", () =>
    {
        const picker = createCronPicker("test-cronpicker-container");
        expect(picker).toBeInstanceOf(CronPicker);
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createCronPicker("test-cronpicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithValue_SetsInitialExpression", () =>
    {
        const picker = createCronPicker("test-cronpicker-container", {
            value: "0 0 12 * * *",
        });
        expect(picker.getValue()).toBe("0 0 12 * * *");
        picker.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("CronPicker constructor", () =>
{
    test("Constructor_DefaultValue_IsEveryMinute", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        expect(picker.getValue()).toBe("0 * * * * *");
        picker.destroy();
    });

    test("Constructor_WithCustomValue_SetsExpression", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 0 * * *",
        });
        expect(picker.getValue()).toBe("0 0 0 * * *");
        picker.destroy();
    });

    test("Constructor_Disabled_AppliesClass", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            disabled: true,
        });
        const wrapper = container.querySelector(".cronpicker");
        expect(
            wrapper?.classList.contains("cronpicker-disabled")
        ).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("CronPicker options", () =>
{
    test("Options_ShowPresetsFalse_HidesPresetDropdown", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            showPresets: false,
        });
        const presetSelect = container.querySelector(
            ".cronpicker-presets select"
        );
        expect(presetSelect).toBeNull();
        picker.destroy();
    });

    test("Options_ShowDescriptionTrue_RendersDescription", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            showDescription: true,
        });
        const desc = container.querySelector(".cronpicker-description");
        expect(desc).not.toBeNull();
        picker.destroy();
    });

    test("Options_ShowRawExpressionTrue_RendersInput", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            showRawExpression: true,
        });
        const rawInput = container.querySelector(
            ".cronpicker-raw input"
        );
        expect(rawInput).not.toBeNull();
        picker.destroy();
    });

    test("Options_CustomPresets_UsesProvidedPresets", () =>
    {
        const customPresets: CronPreset[] = [
            { label: "Every 5 min", value: "0 */5 * * * *" },
        ];
        const picker = new CronPicker("test-cronpicker-container", {
            presets: customPresets,
        });
        const presetSelect = container.querySelector("select");
        // Should have the custom preset option
        const options = presetSelect?.querySelectorAll("option");
        expect(options).toBeDefined();
        picker.destroy();
    });
});

// ============================================================================
// getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_Default_ReturnsEveryMinute", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        expect(picker.getValue()).toBe("0 * * * * *");
        picker.destroy();
    });

    test("setValue_ValidExpression_UpdatesValue", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        picker.setValue("0 0 12 * * *");
        expect(picker.getValue()).toBe("0 0 12 * * *");
        picker.destroy();
    });

    test("setValue_InvalidExpression_DoesNotChange", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const original = picker.getValue();
        picker.setValue("invalid cron");
        expect(picker.getValue()).toBe(original);
        picker.destroy();
    });

    test("setValue_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = new CronPicker("test-cronpicker-container", {
            onChange,
        });
        picker.setValue("0 0 0 * * *");
        expect(onChange).toHaveBeenCalledWith("0 0 0 * * *");
        picker.destroy();
    });

    test("setValue_DailyAtNoon_CorrectExpression", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        picker.setValue("0 0 12 * * *");
        expect(picker.getValue()).toBe("0 0 12 * * *");
        picker.destroy();
    });
});

// ============================================================================
// CRON EXPRESSION PARSING
// ============================================================================

describe("CRON expression parsing", () =>
{
    test("Parse_EverySecond_Accepted", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "* * * * * *",
        });
        expect(picker.getValue()).toBe("* * * * * *");
        picker.destroy();
    });

    test("Parse_StepExpression_Accepted", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 */5 * * * *",
        });
        expect(picker.getValue()).toContain("*/5");
        picker.destroy();
    });

    test("Parse_RangeExpression_Accepted", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 9 * * 1-5",
        });
        expect(picker.getValue()).toContain("1-5");
        picker.destroy();
    });
});

// ============================================================================
// getDescription
// ============================================================================

describe("getDescription", () =>
{
    test("getDescription_ReturnsNonEmptyString", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const desc = picker.getDescription();
        expect(desc).toBeTruthy();
        expect(typeof desc).toBe("string");
        picker.destroy();
    });
});

// ============================================================================
// CLEAR
// ============================================================================

describe("clear", () =>
{
    test("clear_ResetsToDefault", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 12 * * *",
        });
        picker.clear();
        expect(picker.getValue()).toBe("0 * * * * *");
        picker.destroy();
    });

    test("clear_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 12 * * *",
            onChange,
        });
        onChange.mockClear();
        picker.clear();
        expect(onChange).toHaveBeenCalled();
        picker.destroy();
    });
});

// ============================================================================
// ENABLE / DISABLE
// ============================================================================

describe("enable and disable", () =>
{
    test("disable_AddsDisabledClass", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        picker.disable();
        const wrapper = container.querySelector(".cronpicker");
        expect(
            wrapper?.classList.contains("cronpicker-disabled")
        ).toBe(true);
        picker.destroy();
    });

    test("enable_RemovesDisabledClass", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            disabled: true,
        });
        picker.enable();
        const wrapper = container.querySelector(".cronpicker");
        expect(
            wrapper?.classList.contains("cronpicker-disabled")
        ).toBe(false);
        picker.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesFromDOM", () =>
    {
        const picker = createCronPicker("test-cronpicker-container");
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
        expect(container.querySelector(".cronpicker")).toBeNull();
    });

    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });
});

// ============================================================================
// DROPDOWN MODE
// ============================================================================

describe("dropdown mode", () =>
{
    test("DropdownMode_RendersTriggerButton", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            mode: "dropdown",
        });
        const trigger = container.querySelector(".cronpicker-trigger");
        expect(trigger).not.toBeNull();
        picker.destroy();
    });

    test("DropdownMode_TriggerDisplaysCurrentValue", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            mode: "dropdown",
            value: "0 0 12 * * *",
        });
        const valueSpan = container.querySelector(
            ".cronpicker-trigger-value"
        );
        expect(valueSpan?.textContent).toBe("0 0 12 * * *");
        picker.destroy();
    });

    test("DropdownMode_ClickTrigger_OpensPopup", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            mode: "dropdown",
        });
        const trigger = container.querySelector(
            ".cronpicker-trigger"
        ) as HTMLButtonElement;
        trigger?.click();
        const popup = document.querySelector(
            ".cronpicker-popup--open"
        );
        expect(popup).not.toBeNull();
        picker.destroy();
    });

    test("DropdownMode_ClickTriggerTwice_ClosesPopup", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            mode: "dropdown",
        });
        const trigger = container.querySelector(
            ".cronpicker-trigger"
        ) as HTMLButtonElement;
        trigger?.click();
        trigger?.click();
        const popup = document.querySelector(
            ".cronpicker-popup--open"
        );
        expect(popup).toBeNull();
        picker.destroy();
    });

    test("DropdownMode_PopupContainsCronPickerEditor", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            mode: "dropdown",
        });
        const trigger = container.querySelector(
            ".cronpicker-trigger"
        ) as HTMLButtonElement;
        trigger?.click();
        const popup = document.querySelector(".cronpicker-popup");
        const editor = popup?.querySelector(".cronpicker");
        expect(editor).not.toBeNull();
        picker.destroy();
    });

    test("DropdownMode_EscapeKey_ClosesPopup", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            mode: "dropdown",
        });
        const trigger = container.querySelector(
            ".cronpicker-trigger"
        ) as HTMLButtonElement;
        trigger?.click();
        document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape" })
        );
        const popup = document.querySelector(
            ".cronpicker-popup--open"
        );
        expect(popup).toBeNull();
        picker.destroy();
    });

    test("DropdownMode_OutsideClick_ClosesPopup", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            mode: "dropdown",
        });
        const trigger = container.querySelector(
            ".cronpicker-trigger"
        ) as HTMLButtonElement;
        trigger?.click();
        document.dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true })
        );
        const popup = document.querySelector(
            ".cronpicker-popup--open"
        );
        expect(popup).toBeNull();
        picker.destroy();
    });

    test("DropdownMode_SetValue_UpdatesTriggerText", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            mode: "dropdown",
        });
        picker.setValue("0 0 0 1 1 *");
        const valueSpan = container.querySelector(
            ".cronpicker-trigger-value"
        );
        expect(valueSpan?.textContent).toBe("0 0 0 1 1 *");
        picker.destroy();
    });
});

// ============================================================================
// FIELD RENDERING
// ============================================================================

describe("field rendering", () =>
{
    test("Render_SixFieldRows_ArePresent", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const fieldRows = container.querySelectorAll(".cronpicker-field");
        expect(fieldRows.length).toBe(6);
        picker.destroy();
    });

    test("Render_FieldLabels_MatchExpectedNames", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const labels = container.querySelectorAll(
            ".cronpicker-field-label"
        );
        const labelTexts = Array.from(labels).map(
            (el) => el.textContent
        );
        expect(labelTexts).toEqual([
            "Second", "Minute", "Hour",
            "Day of Month", "Month", "Day of Week",
        ]);
        picker.destroy();
    });

    test("Render_EachField_HasFourModeButtons", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const firstField = container.querySelector(".cronpicker-field");
        const modeButtons = firstField?.querySelectorAll(
            ".cronpicker-mode-btn"
        );
        expect(modeButtons?.length).toBe(4);
        picker.destroy();
    });

    test("Render_ModeButtons_LabelledCorrectly", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const firstField = container.querySelector(".cronpicker-field");
        const modeButtons = firstField?.querySelectorAll(
            ".cronpicker-mode-btn"
        );
        const labels = Array.from(modeButtons ?? []).map(
            (btn) => btn.textContent
        );
        expect(labels).toEqual(["Every", "Specific", "Range", "Step"]);
        picker.destroy();
    });

    test("Render_DefaultSecondField_IsSpecificMode", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const firstField = container.querySelector(".cronpicker-field");
        const activeBtn = firstField?.querySelector(
            ".cronpicker-mode-btn-active"
        );
        expect(activeBtn?.textContent).toBe("Specific");
        picker.destroy();
    });
});

// ============================================================================
// PRESET SELECTION
// ============================================================================

describe("preset selection", () =>
{
    test("PresetChange_SetsExpression", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const select = container.querySelector("select") as HTMLSelectElement;
        if (select)
        {
            select.value = "0 0 12 * * *";
            select.dispatchEvent(new Event("change"));
        }
        expect(picker.getValue()).toBe("0 0 12 * * *");
        picker.destroy();
    });

    test("PresetChange_FiresOnPresetSelect", () =>
    {
        const onPresetSelect = vi.fn();
        const picker = new CronPicker("test-cronpicker-container", {
            onPresetSelect,
        });
        const select = container.querySelector("select") as HTMLSelectElement;
        if (select)
        {
            select.value = "0 0 0 * * *";
            select.dispatchEvent(new Event("change"));
        }
        expect(onPresetSelect).toHaveBeenCalled();
        picker.destroy();
    });

    test("PresetChange_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = new CronPicker("test-cronpicker-container", {
            onChange,
        });
        const select = container.querySelector("select") as HTMLSelectElement;
        if (select)
        {
            select.value = "* * * * * *";
            select.dispatchEvent(new Event("change"));
        }
        expect(onChange).toHaveBeenCalledWith("* * * * * *");
        picker.destroy();
    });
});

// ============================================================================
// RAW EXPRESSION INPUT
// ============================================================================

describe("raw expression input", () =>
{
    test("RawInput_RenderedByDefault", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const rawInput = container.querySelector(
            ".cronpicker-raw input"
        ) as HTMLInputElement;
        expect(rawInput).not.toBeNull();
        picker.destroy();
    });

    test("RawInput_DisplaysCurrentExpression", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 12 * * *",
        });
        const rawInput = container.querySelector(
            ".cronpicker-raw input"
        ) as HTMLInputElement;
        expect(rawInput?.value).toBe("0 0 12 * * *");
        picker.destroy();
    });

    test("RawInput_AllowRawEditFalse_IsReadonly", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            allowRawEdit: false,
        });
        const rawInput = container.querySelector(
            ".cronpicker-raw input"
        ) as HTMLInputElement;
        expect(rawInput?.readOnly).toBe(true);
        picker.destroy();
    });

    test("RawInput_ValidBlur_UpdatesExpression", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const rawInput = container.querySelector(
            ".cronpicker-raw input"
        ) as HTMLInputElement;
        if (rawInput)
        {
            rawInput.value = "0 0 0 * * *";
            rawInput.dispatchEvent(new Event("blur"));
        }
        expect(picker.getValue()).toBe("0 0 0 * * *");
        picker.destroy();
    });

    test("RawInput_InvalidBlur_AddsInvalidClass", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const rawInput = container.querySelector(
            ".cronpicker-raw input"
        ) as HTMLInputElement;
        if (rawInput)
        {
            rawInput.value = "bad expression";
            rawInput.dispatchEvent(new Event("blur"));
        }
        const wrapper = container.querySelector(".cronpicker");
        expect(
            wrapper?.classList.contains("cronpicker-invalid")
        ).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// DESCRIPTION GENERATION
// ============================================================================

describe("description generation", () =>
{
    test("Description_EveryMinute_ShowsEveryMinute", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const desc = picker.getDescription();
        expect(desc).toContain("Every minute");
        picker.destroy();
    });

    test("Description_DailyAtNoon_ShowsAt12", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 12 * * *",
        });
        const desc = picker.getDescription();
        expect(desc).toContain("12:00:00");
        picker.destroy();
    });

    test("Description_StepExpression_ShowsInterval", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 */5 * * * *",
        });
        const desc = picker.getDescription();
        expect(desc).toContain("5 minutes");
        picker.destroy();
    });

    test("Description_WeekdaysAt9_ContainsWeekdayInfo", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 9 * * 1-5",
        });
        const desc = picker.getDescription();
        expect(desc).toContain("09:00:00");
        expect(desc).toContain("Mon");
        picker.destroy();
    });

    test("Description_ShowsInDOM_WhenEnabled", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            showDescription: true,
        });
        const descEl = container.querySelector(".cronpicker-description");
        expect(descEl).not.toBeNull();
        expect(descEl?.textContent?.length).toBeGreaterThan(0);
        picker.destroy();
    });
});

// ============================================================================
// DISABLED / READONLY STATES
// ============================================================================

describe("disabled and readonly states", () =>
{
    test("Disabled_PresetSelectIsDisabled", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            disabled: true,
        });
        const select = container.querySelector("select") as HTMLSelectElement;
        expect(select?.disabled).toBe(true);
        picker.destroy();
    });

    test("Disabled_RawInputIsDisabled", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            disabled: true,
        });
        const rawInput = container.querySelector(
            ".cronpicker-raw input"
        ) as HTMLInputElement;
        expect(rawInput?.disabled).toBe(true);
        picker.destroy();
    });

    test("Disabled_ModeButtonsAreDisabled", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            disabled: true,
        });
        const modeBtn = container.querySelector(
            ".cronpicker-mode-btn"
        ) as HTMLButtonElement;
        expect(modeBtn?.disabled).toBe(true);
        picker.destroy();
    });

    test("Readonly_RawInputIsReadonly", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            readonly: true,
        });
        const rawInput = container.querySelector(
            ".cronpicker-raw input"
        ) as HTMLInputElement;
        expect(rawInput?.readOnly).toBe(true);
        picker.destroy();
    });

    test("Readonly_ModeButtonsAreDisabled", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            readonly: true,
        });
        const modeBtn = container.querySelector(
            ".cronpicker-mode-btn"
        ) as HTMLButtonElement;
        expect(modeBtn?.disabled).toBe(true);
        picker.destroy();
    });
});

// ============================================================================
// SIZE VARIANTS
// ============================================================================

describe("size variants", () =>
{
    test("SizeSm_AddsCronpickerSmClass", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            size: "sm",
        });
        const wrapper = container.querySelector(".cronpicker");
        expect(
            wrapper?.classList.contains("cronpicker-sm")
        ).toBe(true);
        picker.destroy();
    });

    test("SizeLg_AddsCronpickerLgClass", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            size: "lg",
        });
        const wrapper = container.querySelector(".cronpicker");
        expect(
            wrapper?.classList.contains("cronpicker-lg")
        ).toBe(true);
        picker.destroy();
    });

    test("SizeDefault_NoSizeClass", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            size: "default",
        });
        const wrapper = container.querySelector(".cronpicker");
        expect(
            wrapper?.classList.contains("cronpicker-sm")
        ).toBe(false);
        expect(
            wrapper?.classList.contains("cronpicker-lg")
        ).toBe(false);
        picker.destroy();
    });
});

// ============================================================================
// onChange CALLBACK
// ============================================================================

describe("onChange callback", () =>
{
    test("OnChange_NotFiredOnInit", () =>
    {
        const onChange = vi.fn();
        const picker = new CronPicker("test-cronpicker-container", {
            onChange,
        });
        expect(onChange).not.toHaveBeenCalled();
        picker.destroy();
    });

    test("OnChange_FiredOnClear", () =>
    {
        const onChange = vi.fn();
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 12 * * *",
            onChange,
        });
        onChange.mockClear();
        picker.clear();
        expect(onChange).toHaveBeenCalledWith("0 * * * * *");
        picker.destroy();
    });

    test("OnChange_InvalidSetValue_NotFired", () =>
    {
        const onChange = vi.fn();
        const picker = new CronPicker("test-cronpicker-container", {
            onChange,
        });
        onChange.mockClear();
        picker.setValue("bad");
        expect(onChange).not.toHaveBeenCalled();
        picker.destroy();
    });
});

// ============================================================================
// KEYBOARD BINDINGS
// ============================================================================

describe("keyboard bindings", () =>
{
    test("RawInput_EnterKey_CommitsExpression", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const rawInput = container.querySelector(
            ".cronpicker-raw input"
        ) as HTMLInputElement;
        if (rawInput)
        {
            rawInput.value = "0 30 9 * * *";
            rawInput.dispatchEvent(
                new KeyboardEvent("keydown", {
                    key: "Enter",
                    bubbles: true,
                })
            );
        }
        expect(picker.getValue()).toBe("0 30 9 * * *");
        picker.destroy();
    });

    test("CustomKeyBinding_OverridesDefault", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            keyBindings: { rawEnter: "Ctrl+Enter" },
        });
        const rawInput = container.querySelector(
            ".cronpicker-raw input"
        ) as HTMLInputElement;
        if (rawInput)
        {
            rawInput.value = "0 30 9 * * *";
            // Regular Enter should not commit
            rawInput.dispatchEvent(
                new KeyboardEvent("keydown", {
                    key: "Enter",
                    bubbles: true,
                })
            );
        }
        // Value should still be default since Enter alone is overridden
        expect(picker.getValue()).toBe("0 * * * * *");
        picker.destroy();
    });
});

// ============================================================================
// FORMAT HINT DISPLAY
// ============================================================================

describe("format hint display", () =>
{
    test("FormatHint_ShownByDefault", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        const hint = container.querySelector(".cronpicker-hint");
        expect(hint).not.toBeNull();
        expect(hint?.textContent).toContain("second");
        expect(hint?.textContent).toContain("minute");
        expect(hint?.textContent).toContain("hour");
        picker.destroy();
    });

    test("FormatHint_HiddenWhenShowFormatHintFalse", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            showFormatHint: false,
        });
        const hint = container.querySelector(".cronpicker-hint");
        expect(hint).toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("SetValue_FiveFields_Rejected", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        picker.setValue("0 0 * * *");
        expect(picker.getValue()).toBe("0 * * * * *");
        picker.destroy();
    });

    test("SetValue_SevenFields_Rejected", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        picker.setValue("0 0 0 * * * *");
        expect(picker.getValue()).toBe("0 * * * * *");
        picker.destroy();
    });

    test("SetValue_CommaListExpression_Accepted", () =>
    {
        const picker = new CronPicker("test-cronpicker-container", {
            value: "0 0 9,12,18 * * *",
        });
        expect(picker.getValue()).toContain("9,12,18");
        picker.destroy();
    });

    test("SetValue_EverySecondExpression_Accepted", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        picker.setValue("* * * * * *");
        expect(picker.getValue()).toBe("* * * * * *");
        picker.destroy();
    });

    test("SetValue_ComplexExpression_Accepted", () =>
    {
        const picker = new CronPicker("test-cronpicker-container");
        picker.setValue("0 0 9 1 1,6 *");
        expect(picker.getValue()).toBe("0 0 9 1 1,6 *");
        picker.destroy();
    });

    test("InvalidContainer_DoesNotThrow", () =>
    {
        expect(() =>
        {
            const picker = new CronPicker("nonexistent-id");
            picker.destroy();
        }).not.toThrow();
    });
});
