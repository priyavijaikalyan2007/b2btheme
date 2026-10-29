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
import { destroyProbe } from "../../tests/destroy-probe";
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
        const probe = destroyProbe();

        stepper.destroy();
        const first = probe.total();
        stepper.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
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

// ============================================================================
// SURFACE CONTRACT (readiness step 2 B5): additive on("stepChange" | "finish" |
// "saveDraft"), getState/setState and setData. Legacy callbacks fire first.
// ============================================================================

describe("surface contract (B5)", () =>
{
    function getDraftBtn(): HTMLButtonElement | null
    {
        return Array.from(container.querySelectorAll("button"))
            .find(b => b.textContent === "Save as Draft") ?? null;
    }

    async function settle(): Promise<void>
    {
        for (let i = 0; i < 5; i++) { await Promise.resolve(); }
    }

    test("on(stepChange)_ClickingNext_HearsFromAndTo_AfterOnStepChange", async () =>
    {
        const order: string[] = [];
        const stepper = createStepper(defaultOpts({
            onStepChange: (from, to) => order.push(`option:${from}>${to}`),
        }));
        const off = stepper.on("stepChange", (p) =>
        {
            const { from, to } = p as { from: number; to: number };
            order.push(`channel:${from}>${to}`);
        });

        getNextBtn()!.click();
        await settle();
        off();
        getNextBtn()!.click();
        await settle();

        expect(order).toEqual(["option:0>1", "channel:0>1", "option:1>2"]);
        stepper.destroy();
    });

    test("on(stepChange)_WithoutOnStepChange_StillEmits", async () =>
    {
        const heard = vi.fn();
        const stepper = createStepper(defaultOpts());
        stepper.on("stepChange", heard);

        getNextBtn()!.click();
        await settle();

        expect(heard).toHaveBeenCalledOnce();
        expect(heard).toHaveBeenCalledWith({ from: 0, to: 1 });
        stepper.destroy();
    });

    test("on(stepChange)_ClickingBack_HearsFromAndTo", async () =>
    {
        const heard = vi.fn();
        const stepper = createStepper(defaultOpts());
        await stepper.goToStep(2);
        stepper.on("stepChange", heard);

        getBackBtn()!.click();

        expect(heard).toHaveBeenCalledWith({ from: 2, to: 1 });
        stepper.destroy();
    });

    test("on(finish)_ClickingFinish_HearsActiveIndex_AfterOnFinish", async () =>
    {
        const order: string[] = [];
        const stepper = createStepper(defaultOpts({ onFinish: () => order.push("option") }));
        await stepper.goToStep(2);
        const off = stepper.on("finish", (p) => order.push(`channel:${String(p)}`));

        getNextBtn()!.click();
        await settle();
        off();
        getNextBtn()!.click();
        await settle();

        expect(order).toEqual(["option", "channel:2", "option"]);
        stepper.destroy();
    });

    test("on(finish)_WithoutOnFinish_StillEmitsAndStillCompletesTheStep", async () =>
    {
        const heard = vi.fn();
        const stepper = createStepper(defaultOpts());
        await stepper.goToStep(2);
        stepper.on("finish", heard);

        getNextBtn()!.click();
        await settle();

        expect(heard).toHaveBeenCalledOnce();
        expect(heard).toHaveBeenCalledWith(2);
        expect(stepper.getCompletionPercent()).toBe(67);
        stepper.destroy();
    });

    test("on(finish)_FailedValidation_DoesNotEmit", async () =>
    {
        const heard = vi.fn();
        const steps = sampleSteps();
        steps[2].validate = () => false;
        const stepper = createStepper(defaultOpts({ steps }));
        await stepper.goToStep(2);
        stepper.on("finish", heard);

        getNextBtn()!.click();
        await settle();

        expect(heard).not.toHaveBeenCalled();
        stepper.destroy();
    });

    test("on(saveDraft)_ClickingSaveAsDraft_HearsActiveIndex_AfterOnSaveAsDraft", async () =>
    {
        const order: string[] = [];
        const stepper = createStepper(defaultOpts({
            showSaveAsDraft: true,
            onSaveAsDraft: () => order.push("option"),
        }));
        await stepper.goToStep(1);
        const off = stepper.on("saveDraft", (p) => order.push(`channel:${String(p)}`));

        getDraftBtn()!.click();
        off();
        getDraftBtn()!.click();

        expect(order).toEqual(["option", "channel:1", "option"]);
        stepper.destroy();
    });

    test("on(saveDraft)_WithoutOnSaveAsDraft_StillEmits", () =>
    {
        const heard = vi.fn();
        const stepper = createStepper(defaultOpts({ showSaveAsDraft: true }));
        stepper.on("saveDraft", heard);

        getDraftBtn()!.click();

        expect(heard).toHaveBeenCalledOnce();
        expect(heard).toHaveBeenCalledWith(0);
        stepper.destroy();
    });

    test("on(saveDraft)_WithoutShowSaveAsDraft_NoButtonSoNoEmit", () =>
    {
        const stepper = createStepper(defaultOpts());
        stepper.on("saveDraft", () => undefined);

        expect(getDraftBtn()).toBeNull();
        stepper.destroy();
    });

    test("on_HandlerThatThrows_DoesNotBreakLaterHandlersOrTheStepper", async () =>
    {
        const heard = vi.fn();
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const stepper = createStepper(defaultOpts());
        stepper.on("stepChange", () => { throw new Error("boom"); });
        stepper.on("stepChange", heard);

        getNextBtn()!.click();
        await settle();

        expect(heard).toHaveBeenCalledOnce();
        expect(stepper.getActiveStep()).toBe(1);
        errorSpy.mockRestore();
        stepper.destroy();
    });

    test("payloads_ArePlainJson", async () =>
    {
        const payloads: unknown[] = [];
        const stepper = createStepper(defaultOpts({ showSaveAsDraft: true }));
        stepper.on("stepChange", (p) => payloads.push(p));
        stepper.on("saveDraft", (p) => payloads.push(p));
        stepper.on("finish", (p) => payloads.push(p));

        getNextBtn()!.click();
        await settle();
        getDraftBtn()!.click();
        await stepper.goToStep(2);
        getNextBtn()!.click();
        await settle();

        expect(payloads.length).toBe(4);
        expect(JSON.parse(JSON.stringify(payloads))).toEqual(payloads);
        stepper.destroy();
    });

    test("stepChangePayload_IsACopy_HandlerMutationDoesNotReachOtherHandlers", async () =>
    {
        const second = vi.fn();
        const stepper = createStepper(defaultOpts());
        stepper.on("stepChange", (p) => { (p as { to: number }).to = 99; });
        stepper.on("stepChange", second);

        getNextBtn()!.click();
        await settle();

        expect(second).toHaveBeenCalledWith({ from: 0, to: 1 });
        stepper.destroy();
    });

    test("on_UnknownChannel_Throws_NamingTheValidChannels", () =>
    {
        const stepper = createStepper(defaultOpts());

        expect(() => stepper.on("bogus", () => undefined)).toThrow(/stepChange.*finish.*saveDraft/);
        stepper.destroy();
    });

    test("setData_Throws_NamingTheSettersToUse", () =>
    {
        const stepper = createStepper(defaultOpts());

        expect(() => stepper.setData("steps", [])).toThrow(/Stepper.*no data slots.*goToStep/);
        stepper.destroy();
    });

    test("getState_SetState_RoundTripActiveStep", async () =>
    {
        const stepper = createStepper(defaultOpts());
        await stepper.goToStep(1);
        const captured = stepper.getState();
        expect(captured).toEqual({ activeStep: 1 });

        await stepper.goToStep(2);
        expect(stepper.getState()).toEqual({ activeStep: 2 });

        stepper.setState(captured);
        await settle();

        expect(stepper.getActiveStep()).toBe(1);
        expect(stepper.getState()).toEqual(captured);
        stepper.destroy();
    });

    test("setState_SameStep_DoesNotNavigate", async () =>
    {
        const onStepChange = vi.fn();
        const stepper = createStepper(defaultOpts({ onStepChange }));

        stepper.setState({ activeStep: 0 });
        await settle();

        expect(onStepChange).not.toHaveBeenCalled();
        stepper.destroy();
    });

    test("setState_RejectedGoToStep_IsLoggedNotUnhandled", async () =>
    {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const steps = sampleSteps();
        steps[0].validate = () => { throw new Error("validate failed"); };
        const stepper = createStepper(defaultOpts({ steps }));

        stepper.setState({ activeStep: 2 });
        await settle();

        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
        stepper.destroy();
    });

    test("destroy_ClearsHandlers_SoLaterNavigationHearsNothing", async () =>
    {
        const heard = vi.fn();
        const stepper = createStepper(defaultOpts());
        stepper.on("stepChange", heard);

        stepper.destroy();
        await stepper.goToStep(1);

        expect(heard).not.toHaveBeenCalled();
    });
});
