/**
 * ⚓ TESTS: ProgressModal
 * Comprehensive Vitest unit tests for the ProgressModal component.
 * Covers: factory, constructor, options, modal rendering, progress bar,
 * progress update, log entries, setStatus, setProgress, setStep,
 * complete, fail, close, destroy, and ARIA.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    ProgressModal,
    showProgressModal,
    showSteppedProgressModal,
} from "./progressmodal";
import type { ProgressModalOptions } from "./progressmodal";

// ============================================================================
// HELPERS
// ============================================================================

function makeOptions(overrides?: Partial<ProgressModalOptions>): ProgressModalOptions
{
    return {
        title: "Importing Data...",
        ...overrides,
    };
}

function getModal(): HTMLElement | null
{
    return document.querySelector(".progressmodal");
}

function getBackdrop(): HTMLElement | null
{
    return document.querySelector(".progressmodal-backdrop");
}

function getProgressBar(): HTMLElement | null
{
    return document.querySelector(".progressmodal-bar");
}

function getStatusEl(): HTMLElement | null
{
    return document.querySelector(".progressmodal-status");
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
});

afterEach(() =>
{
    // Clean up any remaining modal elements
    document.querySelectorAll(".progressmodal, .progressmodal-backdrop")
        .forEach((el) => el.remove());
    vi.useRealTimers();
});

// ============================================================================
// FACTORY — showProgressModal
// ============================================================================

describe("showProgressModal", () =>
{
    test("showProgressModal_ValidOptions_ReturnsProgressModalInstance", () =>
    {
        const modal = showProgressModal(makeOptions());
        expect(modal).toBeInstanceOf(ProgressModal);
        modal.destroy();
    });

    test("showProgressModal_ValidOptions_RendersModalInBody", () =>
    {
        const modal = showProgressModal(makeOptions());
        expect(getModal()).not.toBeNull();
        modal.destroy();
    });

    test("showProgressModal_ValidOptions_RendersBackdrop", () =>
    {
        const modal = showProgressModal(makeOptions());
        expect(getBackdrop()).not.toBeNull();
        modal.destroy();
    });

    test("showProgressModal_ValidOptions_IsVisible", () =>
    {
        const modal = showProgressModal(makeOptions());
        expect(modal.isVisible()).toBe(true);
        modal.destroy();
    });
});

// ============================================================================
// FACTORY — showSteppedProgressModal
// ============================================================================

describe("showSteppedProgressModal", () =>
{
    test("showSteppedProgressModal_ValidArgs_ReturnsInstance", () =>
    {
        const modal = showSteppedProgressModal("Uploading", 5);
        expect(modal).toBeInstanceOf(ProgressModal);
        modal.destroy();
    });

    test("showSteppedProgressModal_ValidArgs_IsVisible", () =>
    {
        const modal = showSteppedProgressModal("Uploading", 5);
        expect(modal.isVisible()).toBe(true);
        modal.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR OPTIONS
// ============================================================================

describe("ProgressModal constructor", () =>
{
    test("Constructor_WithTitle_SetsTitle", () =>
    {
        const modal = new ProgressModal(makeOptions({ title: "Processing" }));
        modal.show();
        const title = document.querySelector(".progressmodal-title");
        expect(title?.textContent).toBe("Processing");
        modal.destroy();
    });

    test("Constructor_DefaultMode_IsIndeterminate", () =>
    {
        const modal = new ProgressModal(makeOptions());
        modal.show();
        // Spinner should be visible in indeterminate mode
        const spinner = document.querySelector(".progressmodal-spinner");
        expect(spinner).not.toBeNull();
        modal.destroy();
    });
});

// ============================================================================
// MODAL RENDERING
// ============================================================================

describe("ProgressModal rendering", () =>
{
    test("Show_RendersDialogWithRole", () =>
    {
        const modal = showProgressModal(makeOptions());
        const el = getModal();
        expect(el?.getAttribute("role")).toBe("dialog");
        modal.destroy();
    });

    test("Show_RendersAriaModal", () =>
    {
        const modal = showProgressModal(makeOptions());
        const el = getModal();
        expect(el?.getAttribute("aria-modal")).toBe("true");
        modal.destroy();
    });

    test("Show_RendersProgressBar", () =>
    {
        const modal = showProgressModal(makeOptions({ mode: "determinate" }));
        expect(getProgressBar()).not.toBeNull();
        modal.destroy();
    });

    test("Show_RendersStatusArea", () =>
    {
        const modal = showProgressModal(makeOptions({ statusText: "Starting..." }));
        expect(getStatusEl()?.textContent).toBe("Starting...");
        modal.destroy();
    });

    test("Show_WithOnCancel_RendersCancelButton", () =>
    {
        const modal = showProgressModal(makeOptions({
            onCancel: () => {},
        }));
        const cancelBtn = document.querySelector(".progressmodal-cancel-btn") as HTMLElement;
        expect(cancelBtn?.style.display).not.toBe("none");
        modal.destroy();
    });

    test("Show_WithoutOnCancel_HidesCancelButton", () =>
    {
        const modal = showProgressModal(makeOptions());
        const cancelBtn = document.querySelector(".progressmodal-cancel-btn") as HTMLElement;
        expect(cancelBtn?.style.display).toBe("none");
        modal.destroy();
    });
});

// ============================================================================
// PROGRESS BAR — setProgress
// ============================================================================

describe("ProgressModal setProgress", () =>
{
    test("SetProgress_50Percent_UpdatesBarWidth", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.setProgress(0.5);
        const bar = getProgressBar();
        expect(bar?.style.width).toBe("50%");
        modal.destroy();
    });

    test("SetProgress_100Percent_SetsFullWidth", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.setProgress(1.0);
        const bar = getProgressBar();
        expect(bar?.style.width).toBe("100%");
        modal.destroy();
    });

    test("SetProgress_ZeroPercent_SetsZeroWidth", () =>
    {
        const modal = showProgressModal(makeOptions({ mode: "determinate" }));
        modal.setProgress(0);
        const bar = getProgressBar();
        expect(bar?.style.width).toBe("0%");
        modal.destroy();
    });

    test("SetProgress_UpdatesAriaValuenow", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.setProgress(0.75);
        const bar = getProgressBar();
        expect(bar?.getAttribute("aria-valuenow")).toBe("75");
        modal.destroy();
    });

    test("SetProgress_UpdatesPercentageText", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.setProgress(0.33);
        const pct = document.querySelector(".progressmodal-percentage");
        expect(pct?.textContent).toBe("33%");
        modal.destroy();
    });
});

// ============================================================================
// SET STATUS
// ============================================================================

describe("ProgressModal setStatus", () =>
{
    test("SetStatus_NewText_UpdatesStatusText", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.setStatus("Processing file 3 of 10...");
        expect(getStatusEl()?.textContent).toBe("Processing file 3 of 10...");
        modal.destroy();
    });
});

// ============================================================================
// LOG ENTRIES
// ============================================================================

describe("ProgressModal log entries", () =>
{
    test("LogInfo_SingleMessage_AddsLogEntry", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.logInfo("Starting import...");
        const entries = document.querySelectorAll(".progressmodal-log-entry");
        expect(entries.length).toBe(1);
        modal.destroy();
    });

    test("LogError_Message_AddsErrorEntry", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.logError("Failed to process item");
        const entry = document.querySelector(".progressmodal-log-error");
        expect(entry).not.toBeNull();
        modal.destroy();
    });

    test("LogWarning_Message_AddsWarningEntry", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.logWarning("Slow connection detected");
        const entry = document.querySelector(".progressmodal-log-warning");
        expect(entry).not.toBeNull();
        modal.destroy();
    });

    test("GetLog_AfterMultipleLogs_ReturnsAllEntries", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.logInfo("Step 1");
        modal.logInfo("Step 2");
        modal.logSuccess("Done");
        const log = modal.getLog();
        expect(log.length).toBe(3);
        modal.destroy();
    });

    test("GetLogText_AfterLog_ReturnsFormattedText", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.logInfo("Started");
        const text = modal.getLogText();
        expect(text).toContain("Started");
        modal.destroy();
    });
});

// ============================================================================
// COMPLETE / FAIL
// ============================================================================

describe("ProgressModal complete / fail", () =>
{
    test("Complete_SetsState_ToCompleted", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.complete("All done!");
        expect(modal.getState()).toBe("completed");
        modal.destroy();
    });

    test("Complete_UpdatesStatusText", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.complete("Import finished.");
        expect(getStatusEl()?.textContent).toBe("Import finished.");
        modal.destroy();
    });

    test("Complete_SetsProgressTo100", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.complete();
        const bar = getProgressBar();
        expect(bar?.style.width).toBe("100%");
        modal.destroy();
    });

    test("Complete_ShowsDoneButton", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.complete();
        vi.advanceTimersByTime(100);
        const doneBtn = document.querySelector(".progressmodal-done-btn") as HTMLElement;
        expect(doneBtn?.style.display).not.toBe("none");
        modal.destroy();
    });

    test("Fail_SetsState_ToFailed", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.fail("An error occurred.");
        expect(modal.getState()).toBe("failed");
        modal.destroy();
    });

    test("Fail_UpdatesStatusText", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.fail("Network error");
        expect(getStatusEl()?.textContent).toBe("Network error");
        modal.destroy();
    });
});

// ============================================================================
// CLOSE
// ============================================================================

describe("ProgressModal close", () =>
{
    test("Close_AfterComplete_SetsStateToClosed", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.complete();
        modal.close();
        expect(modal.getState()).toBe("closed");
        modal.destroy();
    });

    test("Close_WhileRunning_WarnsAndDoesNotClose", () =>
    {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const modal = showProgressModal(makeOptions());
        modal.close(); // should warn since still running
        expect(modal.isVisible()).toBe(true);
        spy.mockRestore();
        modal.destroy();
    });

    test("Close_AfterComplete_RemovesFromDOM", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.complete();
        modal.close();
        expect(getModal()).toBeNull();
        expect(getBackdrop()).toBeNull();
    });

    test("Close_WithOnClose_FiresCallback", () =>
    {
        const onClose = vi.fn();
        const modal = showProgressModal(makeOptions({ onClose }));
        modal.complete();
        modal.close();
        expect(onClose).toHaveBeenCalledOnce();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("ProgressModal destroy", () =>
{
    test("Destroy_RemovesFromDOM", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.destroy();
        expect(getModal()).toBeNull();
    });

    test("Destroy_SetsStateToClosed", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.destroy();
        expect(modal.getState()).toBe("closed");
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.destroy();
        expect(() => modal.destroy()).not.toThrow();
    });

    test("Destroy_IsNotVisible", () =>
    {
        const modal = showProgressModal(makeOptions());
        modal.destroy();
        expect(modal.isVisible()).toBe(false);
    });
});

// ============================================================================
// SET STEP
// ============================================================================

describe("ProgressModal setStep", () =>
{
    test("SetStep_ValidStep_UpdatesProgressProportion", () =>
    {
        const modal = showSteppedProgressModal("Processing", 4);
        modal.setStep(2);
        const bar = getProgressBar();
        expect(bar?.style.width).toBe("50%");
        modal.destroy();
    });

    test("SetStep_AllSteps_SetsProgressTo100", () =>
    {
        const modal = showSteppedProgressModal("Processing", 3);
        modal.setStep(3);
        const bar = getProgressBar();
        expect(bar?.style.width).toBe("100%");
        modal.destroy();
    });
});

// ============================================================================
// AUTO-CLOSE
// ============================================================================

describe("ProgressModal auto-close", () =>
{
    test("AutoClose_AfterComplete_ClosesAfterDelay", () =>
    {
        const modal = showProgressModal(makeOptions({ autoClose: 1000 }));
        modal.complete();
        vi.advanceTimersByTime(1100);
        expect(modal.getState()).toBe("closed");
    });
});
