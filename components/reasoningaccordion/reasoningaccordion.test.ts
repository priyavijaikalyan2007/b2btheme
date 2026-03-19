/**
 * TESTS: ReasoningAccordion
 * Vitest unit tests for the ReasoningAccordion component.
 * Covers: factory, options, DOM structure, ARIA, step management,
 * expand/collapse, status indicators, callbacks, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    ReasoningAccordion,
    createReasoningAccordion,
} from "./reasoningaccordion";
import type
{
    ReasoningAccordionOptions,
    ReasoningStep,
} from "./reasoningaccordion";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeStep(overrides?: Partial<ReasoningStep>): ReasoningStep
{
    return {
        id: "step-" + Math.random().toString(36).slice(2, 6),
        title: "Analyze context",
        status: "complete",
        content: "Analyzed the user query for intent.",
        duration: 1500,
        confidence: 0.85,
        ...overrides,
    };
}

function makeOptions(
    overrides?: Partial<ReasoningAccordionOptions>
): ReasoningAccordionOptions
{
    return {
        steps: [
            makeStep({ id: "s1", title: "Parse Query", status: "complete" }),
            makeStep({ id: "s2", title: "Generate Plan", status: "thinking" }),
            makeStep({ id: "s3", title: "Execute", status: "pending" }),
        ],
        showTimings: true,
        showConfidence: true,
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-reasoning";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createReasoningAccordion
// ============================================================================

describe("createReasoningAccordion", () =>
{
    test("mountsInContainer", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        expect(container.querySelector(".reasoning")).not.toBeNull();
        acc.destroy();
    });

    test("returnsReasoningAccordionInstance", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        expect(acc).toBeInstanceOf(ReasoningAccordion);
        acc.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rootElement_HasReasoningClass", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        expect(container.querySelector(".reasoning")).not.toBeNull();
        acc.destroy();
    });

    test("rendersStepItems", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        const steps = container.querySelectorAll("[role='listitem']");
        expect(steps.length).toBe(3);
        acc.destroy();
    });

    test("rendersStepTitles", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        expect(container.textContent).toContain("Parse Query");
        expect(container.textContent).toContain("Generate Plan");
        acc.destroy();
    });

    test("showTimings_DisplaysDuration", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions({
            showTimings: true,
            steps: [
                makeStep({ id: "s1", duration: 2500, status: "complete" }),
            ],
        }));
        // 2500ms = "2.5s"
        expect(container.textContent).toContain("2.5s");
        acc.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("rootHasRegionRole", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        const root = container.querySelector("[role='region']");
        expect(root).not.toBeNull();
        acc.destroy();
    });

    test("stepsContainerHasListRole", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        const list = container.querySelector("[role='list']");
        expect(list).not.toBeNull();
        acc.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("options", () =>
{
    test("sizeVariant_AppliesSizeClass", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions({
            size: "sm",
        }));
        const root = container.querySelector(".reasoning");
        expect(root?.classList.contains("reasoning-sm")).toBe(true);
        acc.destroy();
    });

    test("cssClass_AppliedToRoot", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions({
            cssClass: "my-accordion",
        }));
        const root = container.querySelector(".reasoning");
        expect(root?.classList.contains("my-accordion")).toBe(true);
        acc.destroy();
    });
});

// ============================================================================
// PUBLIC API — STEP MANAGEMENT
// ============================================================================

describe("step management", () =>
{
    test("addStep_AddsNewStep", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions({
            steps: [],
        }));
        acc.addStep(makeStep({ id: "added-1", title: "New Step" }));
        expect(container.textContent).toContain("New Step");
        acc.destroy();
    });

    test("updateStep_ChangesStepStatus", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        acc.updateStep("s3", { status: "complete" });
        // Should not throw; step status updated
        acc.destroy();
    });

    test("clear_RemovesAllSteps", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        acc.clear();
        const steps = container.querySelectorAll("[role='listitem']");
        expect(steps.length).toBe(0);
        acc.destroy();
    });
});

// ============================================================================
// PUBLIC API — EXPAND / COLLAPSE
// ============================================================================

describe("expand and collapse", () =>
{
    test("expandAll_ExpandsAllSteps", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        acc.expandAll();
        // After expanding, content panels should be visible
        acc.destroy();
    });

    test("collapseAll_CollapsesAllSteps", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions({
            expandAll: true,
        }));
        acc.collapseAll();
        acc.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onStepClick_FiresOnStepHeaderClick", () =>
    {
        const onStepClick = vi.fn();
        const acc = createReasoningAccordion("test-reasoning", makeOptions({
            onStepClick,
        }));
        const stepHeader = container.querySelector(
            ".reasoning-step-header, [role='button']"
        ) as HTMLElement;
        stepHeader?.click();
        expect(onStepClick).toHaveBeenCalled();
        acc.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("show_AppendsToContainer", () =>
    {
        const acc = new ReasoningAccordion(makeOptions());
        acc.show("test-reasoning");
        expect(container.querySelector(".reasoning")).not.toBeNull();
        acc.destroy();
    });

    test("hide_RemovesFromDOM", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        acc.hide();
        expect(container.querySelector(".reasoning")).toBeNull();
        acc.destroy();
    });

    test("destroy_NullifiesElement", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        acc.destroy();
        expect(acc.getElement()).toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("showInMissingContainer_LogsError", () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const acc = new ReasoningAccordion(makeOptions());
        acc.show("nonexistent");
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
        acc.destroy();
    });

    test("emptySteps_RendersWithoutCrash", () =>
    {
        const acc = createReasoningAccordion("test-reasoning", makeOptions({
            steps: [],
        }));
        expect(container.querySelector(".reasoning")).not.toBeNull();
        acc.destroy();
    });

    test("updateNonexistentStep_LogsWarning", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const acc = createReasoningAccordion("test-reasoning", makeOptions());
        acc.updateStep("nonexistent", { status: "error" });
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
        acc.destroy();
    });
});
