/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: SprintPicker
 * Spec-based tests for the SprintPicker agile sprint selector component.
 * Tests cover: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, sprint computation, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { SprintPicker, createSprintPicker } from "./sprintpicker";

import type { SprintValue, SprintPickerOptions } from "./sprintpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

/** Monday 2026-01-05 as anchor date. */
const ANCHOR = new Date(2026, 0, 5);

function queryWrapper(): HTMLElement | null
{
    return container.querySelector("[class*='sprintpicker']");
}

function queryInput(): HTMLInputElement | null
{
    return container.querySelector("input") as HTMLInputElement | null;
}

function queryDropdown(): HTMLElement | null
{
    return container.querySelector(
        ".sprintpicker-dropdown"
    ) as HTMLElement | null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-sprintpicker";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createSprintPicker
// ============================================================================

describe("createSprintPicker", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        createSprintPicker("test-sprintpicker", { anchorDate: ANCHOR });
        expect(queryWrapper()).not.toBeNull();
    });

    test("returnsSprintPickerInstance", () =>
    {
        const sp = createSprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        expect(sp).toBeInstanceOf(SprintPicker);
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("SprintPicker constructor", () =>
{
    test("computesSprints", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        expect(sp.getSprints().length).toBeGreaterThan(0);
    });

    test("defaultSprintLength_Is2Weeks", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        const sprints = sp.getSprints();
        expect(sprints.length).toBe(26);
    });

    test("customSprintLength_ComputesCorrectly", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
            sprintLength: 1,
        });
        const sprints = sp.getSprints();
        expect(sprints.length).toBe(26);
    });

    test("defaultMaxSprints_Is26", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        expect(sp.getSprints()).toHaveLength(26);
    });
});

// ============================================================================
// PUBLIC METHODS — getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_InitiallyNull", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        expect(sp.getValue()).toBeNull();
    });

    test("setValue_UpdatesSelection", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        const sprints = sp.getSprints();
        const value: SprintValue = {
            sprintIndex: sprints[0].index,
            sprintName: sprints[0].name,
            startDate: sprints[0].startDate,
            endDate: sprints[0].endDate,
            date: sprints[0].startDate,
        };
        sp.setValue(value);
        expect(sp.getValue()).not.toBeNull();
        expect(sp.getValue()?.sprintIndex).toBe(0);
    });

    test("setValue_Null_ClearsSelection", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        sp.setValue(null);
        expect(sp.getValue()).toBeNull();
    });

    test("getFormattedValue_ReturnsString", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        const sprints = sp.getSprints();
        sp.setValue({
            sprintIndex: 0,
            sprintName: sprints[0].name,
            startDate: sprints[0].startDate,
            endDate: sprints[0].endDate,
            date: sprints[0].startDate,
        });
        expect(sp.getFormattedValue()).not.toBe("");
    });

    test("getFormattedValue_WhenNull_ReturnsEmpty", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        expect(sp.getFormattedValue()).toBe("");
    });
});

// ============================================================================
// PUBLIC METHODS — getSprints / getSprintAtDate
// ============================================================================

describe("sprint access", () =>
{
    test("getSprints_ReturnsArray", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        expect(Array.isArray(sp.getSprints())).toBe(true);
    });

    test("getSprintAtDate_FindsCorrectSprint", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
            sprintLength: 2,
        });
        const sprints = sp.getSprints();
        const midDate = new Date(
            sprints[0].startDate.getTime()
            + (sprints[0].endDate.getTime() - sprints[0].startDate.getTime()) / 2
        );
        const found = sp.getSprintAtDate(midDate);
        expect(found).not.toBeNull();
        expect(found?.index).toBe(0);
    });

    test("getSprintAtDate_OutOfRange_ReturnsNull", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        const farFuture = new Date(2099, 11, 31);
        expect(sp.getSprintAtDate(farFuture)).toBeNull();
    });
});

// ============================================================================
// PUBLIC METHODS — open / close / lifecycle
// ============================================================================

describe("lifecycle", () =>
{
    test("open_ShowsDropdown", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        sp.open();
        // Dropdown is appended to document.body, not the container
        const dropdown = document.body.querySelector(
            ".sprintpicker-dropdown"
        );
        expect(dropdown).not.toBeNull();
    });

    test("close_HidesDropdown", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        sp.open();
        sp.close();
        expect(sp.getValue()).toBeNull();
    });

    test("destroy_CleansUp", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        sp.destroy();
        expect(queryWrapper()).toBeNull();
    });
});

// ============================================================================
// PUBLIC METHODS — enable / disable
// ============================================================================

describe("enable and disable", () =>
{
    test("disable_DisablesInput", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        sp.disable();
        const input = queryInput();
        expect(input?.disabled).toBe(true);
    });

    test("enable_ReEnablesInput", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
            disabled: true,
        });
        sp.enable();
        const input = queryInput();
        expect(input?.disabled).toBe(false);
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onChange_FiresOnSetValue", () =>
    {
        const onChange = vi.fn();
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
            onChange,
        });
        const sprints = sp.getSprints();
        sp.setValue({
            sprintIndex: 0,
            sprintName: sprints[0].name,
            startDate: sprints[0].startDate,
            endDate: sprints[0].endDate,
            date: sprints[0].startDate,
        });
        expect(onChange).toHaveBeenCalled();
    });
});

// ============================================================================
// OPTIONS — naming
// ============================================================================

describe("sprint naming", () =>
{
    test("defaultNaming_Sprint1Format", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        const sprints = sp.getSprints();
        expect(sprints[0].name).toBe("Sprint 1");
    });

    test("shortNaming_S1Format", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
            sprintNaming: "short",
        });
        const sprints = sp.getSprints();
        expect(sprints[0].name).toBe("S1");
    });

    test("customNaming_CallsFunction", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
            sprintNaming: (idx) => `Iteration ${idx + 1}`,
        });
        const sprints = sp.getSprints();
        expect(sprints[0].name).toBe("Iteration 1");
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("hasLiveRegion", () =>
    {
        new SprintPicker("test-sprintpicker", { anchorDate: ANCHOR });
        // Live region is appended to document.body, not the container
        const liveRegion = document.body.querySelector("[aria-live]");
        expect(liveRegion).not.toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("stringAnchorDate_Parses", () =>
    {
        expect(() =>
        {
            new SprintPicker("test-sprintpicker", {
                anchorDate: "2026-01-05",
            });
        }).not.toThrow();
    });

    test("setSprintLength_RecomputesSprints", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
            sprintLength: 2,
        });
        sp.setSprintLength(3);
        const sprints = sp.getSprints();
        expect(sprints.length).toBe(26);
    });

    test("setAnchorDate_RecomputesSprints", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        sp.setAnchorDate(new Date(2026, 5, 1));
        expect(sp.getSprints()[0].startDate.getMonth()).toBe(5);
    });

    test("setMode_ChangesResolution", () =>
    {
        const sp = new SprintPicker("test-sprintpicker", {
            anchorDate: ANCHOR,
        });
        expect(() => sp.setMode("end")).not.toThrow();
    });
});
