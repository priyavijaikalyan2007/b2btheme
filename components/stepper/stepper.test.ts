/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Stepper
 * Comprehensive tests for the Stepper (Wizard) component.
 * Tests cover: factory, step rendering, navigation, validation gates,
 * step states, callbacks, ARIA, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createStepper } from "./stepper";
import type { StepConfig, StepperOptions, StepperHandle } from "./stepper";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function makeContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-stepper";
    document.body.appendChild(el);
    return el;
}

function sampleSteps(): StepConfig[]
{
    return [
        { label: "Account", description: "Create your account" },
        { label: "Profile", description: "Set up your profile" },
        { label: "Confirm", description: "Review and submit" },
    ];
}

function defaultOpts(overrides?: Partial<StepperOptions>): StepperOptions
{
    return {
        container: container,
        steps: sampleSteps(),
        ...overrides,
    };
}

function getStepIndicators(): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(".stepper-step")
    ) as HTMLElement[];
}

function getStepLabels(): string[]
{
    return Array.from(
        container.querySelectorAll(".stepper-label-text")
    ).map(el => el.textContent?.trim() ?? "");
}

function getActiveStepEl(): HTMLElement | null
{
    return container.querySelector(
        ".stepper-step[aria-current='step']"
    ) as HTMLElement | null;
}

function getNextBtn(): HTMLButtonElement | null
{
    const footer = container.querySelector(".stepper-footer");
    if (!footer) { return null; }

    const buttons = footer.querySelectorAll("button.btn-primary");
    return buttons.length > 0
        ? buttons[buttons.length - 1] as HTMLButtonElement
        : null;
}

function getBackBtn(): HTMLButtonElement | null
{
    const buttons = container.querySelectorAll("button");
    for (const btn of buttons)
    {
        if (btn.textContent === "Back")
        {
            return btn;
        }
    }
    return null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = makeContainer();
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createStepper
// ============================================================================

describe("createStepper", () =>
{
    test("withValidOptions_ReturnsStepperHandle", () =>
    {
        const stepper = createStepper(defaultOpts());
        expect(stepper).toBeDefined();
        expect(typeof stepper.nextStep).toBe("function");
        expect(typeof stepper.prevStep).toBe("function");
        expect(typeof stepper.getActiveStep).toBe("function");
        stepper.destroy();
    });

    test("withValidOptions_MountsIntoContainer", () =>
    {
        const stepper = createStepper(defaultOpts());
        expect(container.children.length).toBeGreaterThan(0);
        stepper.destroy();
    });

    test("withNoContainer_ThrowsError", () =>
    {
        expect(() =>
        {
            createStepper({
                container: null as any,
                steps: sampleSteps(),
            });
        }).toThrow();
    });

    test("withNoSteps_ThrowsError", () =>
    {
        expect(() =>
        {
            createStepper({
                container: container,
                steps: [],
            });
        }).toThrow();
    });
});

// ============================================================================
// STEP RENDERING
// ============================================================================

describe("step rendering", () =>
{
    test("rendersAllStepIndicators", () =>
    {
        const stepper = createStepper(defaultOpts());
        const indicators = getStepIndicators();
        expect(indicators).toHaveLength(3);
        stepper.destroy();
    });

    test("displaysStepLabels", () =>
    {
        const stepper = createStepper(defaultOpts());
        const labels = getStepLabels();
        expect(labels).toContain("Account");
        expect(labels).toContain("Profile");
        expect(labels).toContain("Confirm");
        stepper.destroy();
    });

    test("firstStepIsActiveByDefault", () =>
    {
        const stepper = createStepper(defaultOpts());
        expect(stepper.getActiveStep()).toBe(0);
        const activeEl = getActiveStepEl();
        expect(activeEl).not.toBeNull();
        stepper.destroy();
    });

    test("stepWithDescription_RendersDescription", () =>
    {
        const stepper = createStepper(defaultOpts());
        const desc = container.querySelector(".stepper-description");
        expect(desc).not.toBeNull();
        expect(desc?.textContent).toContain("Create your account");
        stepper.destroy();
    });

    test("stepWithIcon_RendersIconElement", () =>
    {
        const stepper = createStepper(defaultOpts({
            steps: [
                { label: "Step 1", icon: "bi-person" },
                { label: "Step 2" },
            ],
        }));
        const icon = container.querySelector(".bi-person");
        expect(icon).not.toBeNull();
        stepper.destroy();
    });

    test("pendingStep_ShowsStepNumber", () =>
    {
        const stepper = createStepper(defaultOpts());
        const indicators = getStepIndicators();
        // Second step should show number "2"
        const marker = indicators[1]?.querySelector(".stepper-marker");
        expect(marker?.textContent?.trim()).toBe("2");
        stepper.destroy();
    });
});

// ============================================================================
// ACTIVE STEP HIGHLIGHT
// ============================================================================

describe("active step highlight", () =>
{
    test("activeStep_HasAriaCurrent", () =>
    {
        const stepper = createStepper(defaultOpts());
        const active = getActiveStepEl();
        expect(active?.getAttribute("aria-current")).toBe("step");
        stepper.destroy();
    });

    test("activeStep_HasActiveStateClass", () =>
    {
        const stepper = createStepper(defaultOpts());
        const indicators = getStepIndicators();
        expect(indicators[0].classList.contains("stepper-step-active"))
            .toBe(true);
        stepper.destroy();
    });
});

// ============================================================================
// NAVIGATION — NEXT / PREVIOUS
// ============================================================================

describe("navigation", () =>
{
    test("nextStep_AdvancesToNextStep", async () =>
    {
        const stepper = createStepper(defaultOpts());
        const result = await stepper.nextStep();
        expect(result).toBe(true);
        expect(stepper.getActiveStep()).toBe(1);
        stepper.destroy();
    });

    test("prevStep_GoesBackOnStep", async () =>
    {
        const stepper = createStepper(defaultOpts());
        await stepper.nextStep();
        stepper.prevStep();
        expect(stepper.getActiveStep()).toBe(0);
        stepper.destroy();
    });

    test("prevStep_AtFirstStep_StaysAtFirst", () =>
    {
        const stepper = createStepper(defaultOpts());
        stepper.prevStep();
        expect(stepper.getActiveStep()).toBe(0);
        stepper.destroy();
    });

    test("goToStep_NavigatesToSpecificStep", async () =>
    {
        const stepper = createStepper(defaultOpts({ nonLinear: true }));
        const result = await stepper.goToStep(2);
        expect(result).toBe(true);
        expect(stepper.getActiveStep()).toBe(2);
        stepper.destroy();
    });

    test("goToStep_OutOfBounds_ReturnsFalse", async () =>
    {
        const stepper = createStepper(defaultOpts());
        const result = await stepper.goToStep(99);
        expect(result).toBe(false);
        stepper.destroy();
    });

    test("goToStep_NegativeIndex_ReturnsFalse", async () =>
    {
        const stepper = createStepper(defaultOpts());
        const result = await stepper.goToStep(-1);
        expect(result).toBe(false);
        stepper.destroy();
    });

    test("nextStep_OnLastStep_FiresOnFinish", async () =>
    {
        const onFinish = vi.fn();
        const stepper = createStepper(defaultOpts({ onFinish }));
        await stepper.nextStep(); // 0 -> 1
        await stepper.nextStep(); // 1 -> 2
        await stepper.nextStep(); // finish
        expect(onFinish).toHaveBeenCalledOnce();
        stepper.destroy();
    });

    test("onStepChange_FiresCallbackWithFromAndTo", async () =>
    {
        const onStepChange = vi.fn();
        const stepper = createStepper(defaultOpts({ onStepChange }));
        await stepper.nextStep();
        expect(onStepChange).toHaveBeenCalledWith(0, 1);
        stepper.destroy();
    });
});

// ============================================================================
// COMPLETED / ERROR STATES
// ============================================================================

describe("step states", () =>
{
    test("completedStep_ShowsCheckIcon", async () =>
    {
        const stepper = createStepper(defaultOpts());
        await stepper.nextStep();
        // First step should now be "completed"
        const indicators = getStepIndicators();
        const checkIcon = indicators[0]?.querySelector(".bi-check-lg");
        expect(checkIcon).not.toBeNull();
        stepper.destroy();
    });

    test("setStepState_Error_ShowsErrorIcon", () =>
    {
        const stepper = createStepper(defaultOpts());
        stepper.setStepState(1, "error");
        const indicators = getStepIndicators();
        const errorIcon = indicators[1]?.querySelector(".bi-exclamation-lg");
        expect(errorIcon).not.toBeNull();
        stepper.destroy();
    });

    test("setStepState_Completed_ShowsCheckIcon", () =>
    {
        const stepper = createStepper(defaultOpts());
        stepper.setStepState(1, "completed");
        const indicators = getStepIndicators();
        const checkIcon = indicators[1]?.querySelector(".bi-check-lg");
        expect(checkIcon).not.toBeNull();
        stepper.destroy();
    });

    test("validationFailure_SetsErrorState", async () =>
    {
        const stepper = createStepper(defaultOpts({
            steps: [
                { label: "Step 1", validate: () => false },
                { label: "Step 2" },
            ],
        }));
        const result = await stepper.nextStep();
        expect(result).toBe(false);
        expect(stepper.getActiveStep()).toBe(0);
        stepper.destroy();
    });

    test("asyncValidation_AwaitsPromise", async () =>
    {
        const stepper = createStepper(defaultOpts({
            steps: [
                {
                    label: "Step 1",
                    validate: () => Promise.resolve(true),
                },
                { label: "Step 2" },
            ],
        }));
        const result = await stepper.nextStep();
        expect(result).toBe(true);
        expect(stepper.getActiveStep()).toBe(1);
        stepper.destroy();
    });
});

// ============================================================================
// COMPLETION PERCENTAGE
// ============================================================================

describe("completion percentage", () =>
{
    test("initialState_ZeroPercent", () =>
    {
        const stepper = createStepper(defaultOpts());
        expect(stepper.getCompletionPercent()).toBe(0);
        stepper.destroy();
    });

    test("afterOneStep_PartialCompletion", async () =>
    {
        const stepper = createStepper(defaultOpts());
        await stepper.nextStep();
        // 1 of 3 completed = ~33%
        expect(stepper.getCompletionPercent()).toBe(33);
        stepper.destroy();
    });

    test("allCompleted_HundredPercent", async () =>
    {
        const stepper = createStepper(defaultOpts());
        await stepper.nextStep();
        await stepper.nextStep();
        await stepper.nextStep(); // finish marks last completed
        expect(stepper.getCompletionPercent()).toBe(100);
        stepper.destroy();
    });
});

// ============================================================================
// ORIENTATION
// ============================================================================

describe("orientation", () =>
{
    test("vertical_AppliesVerticalClass", () =>
    {
        const stepper = createStepper(
            defaultOpts({ orientation: "vertical" })
        );
        const root = stepper.getElement();
        expect(root.classList.contains("stepper-vertical")).toBe(true);
        stepper.destroy();
    });

    test("horizontal_NoVerticalClass", () =>
    {
        const stepper = createStepper(
            defaultOpts({ orientation: "horizontal" })
        );
        const root = stepper.getElement();
        expect(root.classList.contains("stepper-vertical")).toBe(false);
        stepper.destroy();
    });
});

// ============================================================================
// FINISH LABEL
// ============================================================================

describe("finish label", () =>
{
    test("customFinishLabel_AppliedToLastStep", async () =>
    {
        const stepper = createStepper(defaultOpts({
            finishLabel: "Submit",
            steps: [
                { label: "Step 1" },
                { label: "Step 2" },
            ],
        }));
        await stepper.nextStep(); // moves from 0 to 1 (last step)
        const nextBtn = getNextBtn();
        expect(nextBtn?.textContent).toBe("Submit");
        stepper.destroy();
    });

    test("defaultFinishLabel_IsFinish", async () =>
    {
        const stepper = createStepper(defaultOpts({
            steps: [
                { label: "Step 1" },
                { label: "Step 2" },
            ],
        }));
        await stepper.nextStep(); // moves from 0 to 1 (last step)
        const nextBtn = getNextBtn();
        expect(nextBtn?.textContent).toBe("Finish");
        stepper.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("ARIA attributes", () =>
{
    test("rootElement_HasGroupRole", () =>
    {
        const stepper = createStepper(defaultOpts());
        const root = stepper.getElement();
        expect(root.getAttribute("role")).toBe("group");
        expect(root.getAttribute("aria-label")).toBe("Progress");
        stepper.destroy();
    });

    test("stepIndicatorNav_HasAriaLabelSteps", () =>
    {
        const stepper = createStepper(defaultOpts());
        const nav = container.querySelector(
            "nav[aria-label='Steps']"
        );
        expect(nav).not.toBeNull();
        stepper.destroy();
    });

    test("contentPanes_HaveTabpanelRole", () =>
    {
        const stepper = createStepper(defaultOpts());
        const panes = container.querySelectorAll(
            "[role='tabpanel']"
        );
        expect(panes.length).toBe(3);
        stepper.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesDOMElements", () =>
    {
        const stepper = createStepper(defaultOpts());
        stepper.destroy();
        const stepperEl = container.querySelector(".stepper");
        expect(stepperEl).toBeNull();
    });

    test("destroy_CalledTwice_IsIdempotent", () =>
    {
        const stepper = createStepper(defaultOpts());
        stepper.destroy();
        expect(() => stepper.destroy()).not.toThrow();
    });
});

// ============================================================================
// OPTIONAL STEPS
// ============================================================================

describe("optional steps", () =>
{
    test("optionalStep_ShowsOptionalLabel", () =>
    {
        const stepper = createStepper(defaultOpts({
            steps: [
                { label: "Required Step" },
                { label: "Optional Step", optional: true },
                { label: "Final Step" },
            ],
        }));
        const optionalLabels = container.querySelectorAll(".stepper-optional");
        expect(optionalLabels.length).toBe(1);
        expect(optionalLabels[0].textContent).toContain("optional");
        stepper.destroy();
    });
});

// ============================================================================
// NON-LINEAR MODE
// ============================================================================

describe("non-linear mode", () =>
{
    test("nonLinear_AllStepsClickable", () =>
    {
        const stepper = createStepper(defaultOpts({ nonLinear: true }));
        const indicators = getStepIndicators();
        // In non-linear mode, non-active steps should be clickable
        const clickableSteps = indicators.filter(
            el => el.style.cursor === "pointer"
        );
        // Steps 1 and 2 (index 1 and 2) should be clickable
        expect(clickableSteps.length).toBe(2);
        stepper.destroy();
    });

    test("nonLinear_CanJumpToAnyStep", async () =>
    {
        const stepper = createStepper(defaultOpts({ nonLinear: true }));
        const result = await stepper.goToStep(2);
        expect(result).toBe(true);
        expect(stepper.getActiveStep()).toBe(2);
        stepper.destroy();
    });
});

// ============================================================================
// PROGRESS BAR
// ============================================================================

describe("progress bar", () =>
{
    test("showProgressTrue_RendersProgressBar", () =>
    {
        const stepper = createStepper(
            defaultOpts({ showProgress: true })
        );
        const progress = container.querySelector(".stepper-progress");
        expect(progress).not.toBeNull();
        stepper.destroy();
    });

    test("showProgressFalse_OmitsProgressBar", () =>
    {
        const stepper = createStepper(
            defaultOpts({ showProgress: false })
        );
        const progress = container.querySelector(".stepper-progress");
        expect(progress).toBeNull();
        stepper.destroy();
    });

    test("progressLabel_ShowsPercentage", async () =>
    {
        const stepper = createStepper(defaultOpts());
        await stepper.nextStep();
        const label = container.querySelector(".stepper-progress-label");
        expect(label?.textContent).toContain("33%");
        stepper.destroy();
    });
});
