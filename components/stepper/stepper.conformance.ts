/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Stepper / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    These are test fixtures and deliberately do NOT live in the manifest's
 *    defaultOptions: that field is shipped to consumers via
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A fixture there would put placeholder content in front
 *    of real users.
 * RELATES: [[Stepper]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker stepper-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface StepperLike
{
    getElement(): HTMLElement;
    getActiveStep(): number;
    goToStep(index: number): Promise<boolean>;
    nextStep(): Promise<boolean>;
}

/** Two steps, non-linear so goToStep moves synchronously, with the draft button shown. */
const FIXTURE = { steps: [{ label: "One" }, { label: "Two" }], nonLinear: true, showSaveAsDraft: true };

export const CONFORMANCE_GLUE =
{
    options: FIXTURE,

    // What an agent sets for a stepper it can move and a draft it can save.
    eventProps: FIXTURE,

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean | "async" =>
    {
        const stepper = handle as unknown as StepperLike;

        if (channel === "stepChange")
        {
            void stepper.goToStep(stepper.getActiveStep() === 0 ? 1 : 0);
            return true;
        }

        if (channel === "saveDraft")
        {
            const draft = Array.from(stepper.getElement().querySelectorAll("button"))
                .find((b) => b.textContent === "Save as Draft");
            draft?.click();
            return draft !== undefined;
        }

        if (channel !== "finish") { return false; }

        // Finish awaits the last step's validation, so it settles after a promise.
        void stepper.goToStep(1).then(() => stepper.nextStep());
        return "async";
    },
};
