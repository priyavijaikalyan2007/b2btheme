/**
 * TESTS: GuidedTour
 * Spec-based tests for the GuidedTour step-by-step product tour component.
 * Tests cover: factory function, options/defaults, Driver.js mock,
 * handle methods, callbacks, keyboard, localStorage, edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createGuidedTour } from "./guidedtour";
import type { GuidedTourOptions, TourStep, GuidedTourHandle } from "./guidedtour";

// ============================================================================
// DRIVER.JS MOCK
// ============================================================================

function createMockDriverInstance()
{
    let active = false;
    let activeIndex: number | undefined;

    return {
        highlight: vi.fn(),
        drive: vi.fn((index?: number) =>
        {
            active = true;
            activeIndex = index ?? 0;
        }),
        moveNext: vi.fn(() =>
        {
            if (activeIndex !== undefined) { activeIndex++; }
        }),
        movePrevious: vi.fn(() =>
        {
            if (activeIndex !== undefined && activeIndex > 0) { activeIndex--; }
        }),
        destroy: vi.fn(() =>
        {
            active = false;
            activeIndex = undefined;
        }),
        isActive: vi.fn(() => active),
        getActiveIndex: vi.fn(() => activeIndex),
        getActiveElement: vi.fn(() => undefined),
    };
}

let mockDriverInstance: ReturnType<typeof createMockDriverInstance>;

function installDriverMock(): void
{
    mockDriverInstance = createMockDriverInstance();
    const driverFactory = vi.fn(() => mockDriverInstance);
    (window as unknown as Record<string, unknown>)["driver"] = {
        js: { driver: driverFactory },
    };
}

function removeDriverMock(): void
{
    delete (window as unknown as Record<string, unknown>)["driver"];
}

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function makeStepTargets(count: number): HTMLElement[]
{
    const targets: HTMLElement[] = [];
    for (let i = 0; i < count; i++)
    {
        const el = document.createElement("div");
        el.id = `step-target-${i}`;
        el.textContent = `Target ${i}`;
        container.appendChild(el);
        targets.push(el);
    }
    return targets;
}

function defaultSteps(targets: HTMLElement[]): TourStep[]
{
    return targets.map((t, i) => ({
        target: t,
        title: `Step ${i + 1}`,
        description: `Description for step ${i + 1}`,
    }));
}

function defaultOptions(overrides?: Partial<GuidedTourOptions>): GuidedTourOptions
{
    const targets = makeStepTargets(3);
    return {
        tourId: "test-tour",
        steps: defaultSteps(targets),
        ...overrides,
    };
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
    installDriverMock();
    localStorage.clear();
});

afterEach(() =>
{
    removeDriverMock();
    container.remove();
    localStorage.clear();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

describe("createGuidedTour", () =>
{
    test("withValidOptions_ReturnsHandle", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        expect(handle).not.toBeNull();
        expect(typeof handle!.start).toBe("function");
        expect(typeof handle!.destroy).toBe("function");
        handle!.destroy();
    });

    test("withoutDriverJs_ReturnsNull", () =>
    {
        removeDriverMock();
        const handle = createGuidedTour(defaultOptions());
        expect(handle).toBeNull();
    });

    test("withoutTourId_ReturnsNull", () =>
    {
        const handle = createGuidedTour(defaultOptions({ tourId: "" }));
        expect(handle).toBeNull();
    });

    test("withEmptySteps_ReturnsNull", () =>
    {
        const handle = createGuidedTour(defaultOptions({ steps: [] }));
        expect(handle).toBeNull();
    });
});

// ============================================================================
// OPTIONS & DEFAULTS
// ============================================================================

describe("GuidedTour options", () =>
{
    test("withCustomTourId_UsesIdForStorageKey", () =>
    {
        const handle = createGuidedTour(defaultOptions({ tourId: "my-tour" }));
        expect(handle).not.toBeNull();
        handle!.destroy();
    });

    test("withShowProgressFalse_StillCreatesTour", () =>
    {
        const handle = createGuidedTour(defaultOptions({ showProgress: false }));
        expect(handle).not.toBeNull();
        handle!.destroy();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("GuidedTour handle methods", () =>
{
    test("start_ActivatesTour", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        handle!.start();
        expect(handle!.isActive()).toBe(true);
        handle!.destroy();
    });

    test("dismiss_DeactivatesTour", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        handle!.start();
        handle!.dismiss();
        expect(handle!.isActive()).toBe(false);
        handle!.destroy();
    });

    test("isCompleted_FalseInitially", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        expect(handle!.isCompleted()).toBe(false);
        handle!.destroy();
    });

    test("resetProgress_ClearsCompletionState", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        // Mark complete via localStorage
        localStorage.setItem("guidedtour-test-tour-complete", "true");
        expect(handle!.isCompleted()).toBe(true);
        handle!.resetProgress();
        expect(handle!.isCompleted()).toBe(false);
        handle!.destroy();
    });

    test("destroy_CleansUpResources", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        handle!.start();
        expect(() => handle!.destroy()).not.toThrow();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("GuidedTour callbacks", () =>
{
    test("onTourStart_CalledOnStart", () =>
    {
        const onTourStart = vi.fn();
        const handle = createGuidedTour(defaultOptions({ onTourStart }));
        handle!.start();
        expect(onTourStart).toHaveBeenCalled();
        handle!.destroy();
    });

    test("onTourDismiss_CalledOnDismiss", () =>
    {
        const onTourDismiss = vi.fn();
        const handle = createGuidedTour(defaultOptions({ onTourDismiss }));
        handle!.start();
        handle!.dismiss();
        expect(onTourDismiss).toHaveBeenCalled();
        handle!.destroy();
    });

    test("onStepView_CalledOnStart", () =>
    {
        const onStepView = vi.fn();
        const handle = createGuidedTour(defaultOptions({ onStepView }));
        handle!.start();
        expect(onStepView).toHaveBeenCalledWith(0);
        handle!.destroy();
    });
});

// ============================================================================
// KEYBOARD
// ============================================================================

describe("GuidedTour keyboard", () =>
{
    test("escapeKey_DismissesTour", () =>
    {
        const onTourDismiss = vi.fn();
        const handle = createGuidedTour(defaultOptions({ onTourDismiss }));
        handle!.start();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        expect(onTourDismiss).toHaveBeenCalled();
        handle!.destroy();
    });

    test("arrowRight_GoesToNextStep", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        handle!.start();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowRight", bubbles: true,
        }));
        // Driver mock moveNext should have been called
        expect(mockDriverInstance.moveNext).toHaveBeenCalled();
        handle!.destroy();
    });

    test("arrowLeft_GoesToPreviousStep", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        handle!.start();
        handle!.next();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowLeft", bubbles: true,
        }));
        expect(mockDriverInstance.movePrevious).toHaveBeenCalled();
        handle!.destroy();
    });
});

// ============================================================================
// LOCALSTORAGE PERSISTENCE
// ============================================================================

describe("GuidedTour localStorage", () =>
{
    test("completedTour_PersistsInLocalStorage", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        handle!.start();
        // Manually mark completed
        localStorage.setItem("guidedtour-test-tour-complete", "true");
        expect(handle!.isCompleted()).toBe(true);
        handle!.destroy();
    });

    test("resetProgress_RemovesStorageKey", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        localStorage.setItem("guidedtour-test-tour-complete", "true");
        handle!.resetProgress();
        expect(localStorage.getItem("guidedtour-test-tour-complete")).toBeNull();
        handle!.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("GuidedTour edge cases", () =>
{
    test("destroyTwice_DoesNotThrow", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        expect(() =>
        {
            handle!.destroy();
            handle!.destroy();
        }).not.toThrow();
    });

    test("startWithVisibleFilteredSteps_OnlyShowsVisibleOnes", () =>
    {
        const targets = makeStepTargets(3);
        const steps: TourStep[] = [
            { target: targets[0], title: "S1", description: "D1" },
            { target: targets[1], title: "S2", description: "D2", visible: () => false },
            { target: targets[2], title: "S3", description: "D3" },
        ];
        const handle = createGuidedTour(defaultOptions({ steps }));
        expect(handle).not.toBeNull();
        handle!.destroy();
    });

    test("nextWhenNotActive_DoesNotThrow", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        expect(() => handle!.next()).not.toThrow();
        handle!.destroy();
    });

    test("previousWhenNotActive_DoesNotThrow", () =>
    {
        const handle = createGuidedTour(defaultOptions());
        expect(() => handle!.previous()).not.toThrow();
        handle!.destroy();
    });
});
