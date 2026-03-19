/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Stepper
 * 📜 PURPOSE: Multi-stage step progression UI (wizard) with linear/non-linear
 *             navigation, validation gates, step states, and completion tracking.
 * 🔗 RELATES: [[EnterpriseTheme]], [[StepperSpec]]
 * ⚡ FLOW: [Consumer App] -> [createStepper()] -> [Step indicator + content]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[Stepper]";

let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** State of a single step. */
export type StepState = "pending" | "active" | "completed" | "error" | "skipped";

/** Configuration for a single step. */
export interface StepConfig
{
    /** Display label. Required. */
    label: string;
    /** Optional description shown below the label. */
    description?: string;
    /** Bootstrap Icons class for the step indicator. */
    icon?: string;
    /** Content element for this step's body. */
    content?: HTMLElement;
    /** Summary text shown below completed steps. */
    summary?: string;
    /** Validation callback. Return true to allow advancing, false to block. */
    validate?: () => boolean | Promise<boolean>;
    /** Whether this step can be skipped. Default: false. */
    optional?: boolean;
}

/** Configuration for the Stepper component. */
export interface StepperOptions
{
    /** Container element to mount into. Required. */
    container: HTMLElement;
    /** Step definitions. Required. */
    steps: StepConfig[];
    /** Layout orientation. Default: "horizontal". */
    orientation?: "horizontal" | "vertical";
    /** Allow clicking any step freely. Default: false (linear). */
    nonLinear?: boolean;
    /** Show completion percentage. Default: true. */
    showProgress?: boolean;
    /** Show "Save as Draft" button. Default: false. */
    showSaveAsDraft?: boolean;
    /** Label for the final step's advance button. Default: "Finish". */
    finishLabel?: string;
    /** Size variant. Default: "md". */
    size?: "sm" | "md" | "lg";
    /** Additional CSS class(es). */
    cssClass?: string;
    /** Called when active step changes. */
    onStepChange?: (fromIndex: number, toIndex: number) => void;
    /** Called when "Finish" is clicked on the last step. */
    onFinish?: () => void;
    /** Called when "Save as Draft" is clicked. */
    onSaveAsDraft?: () => void;
}

/** Public handle for controlling a Stepper instance. */
export interface StepperHandle
{
    goToStep(index: number): Promise<boolean>;
    nextStep(): Promise<boolean>;
    prevStep(): void;
    getActiveStep(): number;
    setStepState(index: number, state: StepState): void;
    getCompletionPercent(): number;
    getElement(): HTMLElement;
    destroy(): void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className) { el.className = className; }
    return el;
}

function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [key, value] of Object.entries(attrs))
    {
        el.setAttribute(key, value);
    }
}

// ============================================================================
// STEPPER CLASS
// ============================================================================

class Stepper
{
    private readonly id: string;
    private readonly container: HTMLElement;
    private readonly options: StepperOptions;
    private readonly steps: StepConfig[];

    private states: StepState[];
    private activeIndex = 0;
    private orientation: string;
    private nonLinear: boolean;
    private size: string;
    private rootEl: HTMLElement | null = null;
    private destroyed = false;

    constructor(options: StepperOptions)
    {
        instanceCounter++;
        this.id = `stepper-${instanceCounter}`;
        this.container = options.container;
        this.options = options;
        this.steps = [...options.steps];

        this.orientation = options.orientation ?? "horizontal";
        this.nonLinear = options.nonLinear ?? false;
        this.size = options.size ?? "md";

        this.states = this.steps.map((_, i) =>
            i === 0 ? "active" : "pending"
        );

        this.render();
        console.log(LOG_PREFIX, "Created", this.id,
            `(${this.steps.length} steps, ${this.orientation})`);
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    async goToStep(index: number): Promise<boolean>
    {
        if (index < 0 || index >= this.steps.length) { return false; }
        if (index === this.activeIndex) { return true; }

        if (!this.nonLinear && index > this.activeIndex)
        {
            const valid = await this.validateCurrentStep();
            if (!valid) { return false; }
        }

        return this.transitionTo(index);
    }

    async nextStep(): Promise<boolean>
    {
        if (this.activeIndex >= this.steps.length - 1)
        {
            const valid = await this.validateCurrentStep();
            if (!valid) { return false; }

            this.states[this.activeIndex] = "completed";
            if (this.options.onFinish) { this.options.onFinish(); }
            this.render();
            return true;
        }

        const valid = await this.validateCurrentStep();
        if (!valid) { return false; }

        return this.transitionTo(this.activeIndex + 1);
    }

    prevStep(): void
    {
        if (this.activeIndex <= 0) { return; }
        this.transitionTo(this.activeIndex - 1);
    }

    getActiveStep(): number
    {
        return this.activeIndex;
    }

    setStepState(index: number, state: StepState): void
    {
        if (index < 0 || index >= this.steps.length) { return; }
        this.states[index] = state;
        this.render();
    }

    getCompletionPercent(): number
    {
        const completed = this.states.filter(
            s => s === "completed" || s === "skipped"
        ).length;
        return Math.round((completed / this.steps.length) * 100);
    }

    getElement(): HTMLElement
    {
        return this.rootEl as HTMLElement;
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;

        if (this.rootEl?.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
        this.rootEl = null;
        console.log(LOG_PREFIX, "Destroyed", this.id);
    }

    // ====================================================================
    // PRIVATE: NAVIGATION
    // ====================================================================

    private async validateCurrentStep(): Promise<boolean>
    {
        const step = this.steps[this.activeIndex];
        if (!step.validate) { return true; }

        const result = step.validate();
        const valid = result instanceof Promise
            ? await result : result;

        if (!valid)
        {
            this.states[this.activeIndex] = "error";
            this.render();
        }
        return valid;
    }

    private transitionTo(index: number): boolean
    {
        const from = this.activeIndex;

        if (this.states[from] === "active" || this.states[from] === "error")
        {
            this.states[from] = index > from ? "completed" : "pending";
        }

        this.activeIndex = index;
        this.states[index] = "active";

        if (this.options.onStepChange)
        {
            this.options.onStepChange(from, index);
        }

        this.render();
        return true;
    }

    // ====================================================================
    // PRIVATE: RENDER
    // ====================================================================

    private render(): void
    {
        const oldRoot = this.rootEl;
        this.rootEl = this.buildRoot();

        this.rootEl.appendChild(this.buildIndicator());

        if (this.options.showProgress !== false)
        {
            this.rootEl.appendChild(this.buildProgressBar());
        }

        this.rootEl.appendChild(this.buildContentArea());
        this.rootEl.appendChild(this.buildFooter());

        if (oldRoot?.parentNode)
        {
            oldRoot.parentNode.replaceChild(this.rootEl, oldRoot);
        }
        else
        {
            this.container.appendChild(this.rootEl);
        }
    }

    private buildRoot(): HTMLElement
    {
        const sizeClass = this.size !== "md"
            ? ` stepper-${this.size}` : "";
        const orientClass = this.orientation === "vertical"
            ? " stepper-vertical" : "";
        const extra = this.options.cssClass
            ? ` ${this.options.cssClass}` : "";

        const root = createElement(
            "div", `stepper${orientClass}${sizeClass}${extra}`
        );
        root.id = this.id;
        setAttr(root, { role: "group", "aria-label": "Progress" });
        return root;
    }

    // ====================================================================
    // PRIVATE: STEP INDICATOR BAR
    // ====================================================================

    private buildIndicator(): HTMLElement
    {
        const nav = createElement("nav", "stepper-indicator");
        setAttr(nav, { "aria-label": "Steps" });

        const ol = createElement("ol", "stepper-steps");
        for (let i = 0; i < this.steps.length; i++)
        {
            ol.appendChild(this.buildStepItem(i));
        }
        nav.appendChild(ol);
        return nav;
    }

    private buildStepItem(index: number): HTMLElement
    {
        const state = this.states[index];
        const step = this.steps[index];
        const li = createElement("li",
            `stepper-step stepper-step-${state}`
        );

        if (index === this.activeIndex)
        {
            setAttr(li, { "aria-current": "step" });
        }

        li.appendChild(this.buildStepMarker(index, state, step));
        li.appendChild(this.buildStepLabel(step, state));

        if (this.isStepClickable(index))
        {
            li.style.cursor = "pointer";
            li.tabIndex = 0;
            li.addEventListener("click", () => this.goToStep(index));
            li.addEventListener("keydown",
                (e) => this.handleStepKeyDown(e, index)
            );
        }

        return li;
    }

    /** Build the circle/icon marker for a step. */
    private buildStepMarker(
        index: number,
        state: StepState,
        step: StepConfig
    ): HTMLElement
    {
        const marker = createElement("div", "stepper-marker");

        if (state === "completed")
        {
            const check = createElement("i", "bi bi-check-lg");
            setAttr(check, { "aria-hidden": "true" });
            marker.appendChild(check);
        }
        else if (state === "error")
        {
            const x = createElement("i", "bi bi-exclamation-lg");
            setAttr(x, { "aria-hidden": "true" });
            marker.appendChild(x);
        }
        else if (step.icon)
        {
            const icon = createElement("i", `bi ${step.icon}`);
            setAttr(icon, { "aria-hidden": "true" });
            marker.appendChild(icon);
        }
        else
        {
            const num = createElement("span");
            num.textContent = String(index + 1);
            marker.appendChild(num);
        }
        return marker;
    }

    /** Build the label + description for a step. */
    private buildStepLabel(step: StepConfig, state: StepState): HTMLElement
    {
        const wrap = createElement("div", "stepper-label");

        const title = createElement("span", "stepper-label-text");
        title.textContent = step.label;
        if (step.optional)
        {
            const opt = createElement("span", "stepper-optional");
            opt.textContent = " (optional)";
            title.appendChild(opt);
        }
        wrap.appendChild(title);

        if (step.description)
        {
            const desc = createElement("span", "stepper-description");
            desc.textContent = step.description;
            wrap.appendChild(desc);
        }

        if (state === "completed" && step.summary)
        {
            const summary = createElement("span", "stepper-summary");
            summary.textContent = step.summary;
            wrap.appendChild(summary);
        }
        return wrap;
    }

    /** Handle Enter/Space on a clickable step indicator. */
    private handleStepKeyDown(e: KeyboardEvent, index: number): void
    {
        if (e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            this.goToStep(index);
        }
    }

    private isStepClickable(index: number): boolean
    {
        if (index === this.activeIndex) { return false; }
        if (this.nonLinear) { return true; }
        return this.states[index] === "completed";
    }

    // ====================================================================
    // PRIVATE: PROGRESS BAR
    // ====================================================================

    private buildProgressBar(): HTMLElement
    {
        const wrap = createElement("div", "stepper-progress");
        const fill = createElement("div", "stepper-progress-fill");
        const pct = this.getCompletionPercent();
        fill.style.width = `${pct}%`;
        wrap.appendChild(fill);

        const label = createElement("span", "stepper-progress-label");
        label.textContent = `${pct}% complete`;
        wrap.appendChild(label);
        return wrap;
    }

    // ====================================================================
    // PRIVATE: CONTENT AREA
    // ====================================================================

    private buildContentArea(): HTMLElement
    {
        const area = createElement("div", "stepper-content");

        for (let i = 0; i < this.steps.length; i++)
        {
            const pane = createElement("div", "stepper-pane");
            pane.style.display = i === this.activeIndex ? "" : "none";
            setAttr(pane, {
                role: "tabpanel",
                "aria-label": this.steps[i].label
            });

            if (this.steps[i].content)
            {
                pane.appendChild(this.steps[i].content as HTMLElement);
            }
            area.appendChild(pane);
        }
        return area;
    }

    // ====================================================================
    // PRIVATE: FOOTER BUTTONS
    // ====================================================================

    private buildFooter(): HTMLElement
    {
        const footer = createElement("div", "stepper-footer");

        if (this.options.showSaveAsDraft)
        {
            footer.appendChild(this.buildSaveAsDraftBtn());
        }

        const spacer = createElement("div", "stepper-footer-spacer");
        footer.appendChild(spacer);

        if (this.activeIndex > 0)
        {
            footer.appendChild(this.buildBackBtn());
        }

        footer.appendChild(this.buildNextBtn());
        return footer;
    }

    private buildBackBtn(): HTMLElement
    {
        const btn = createElement("button", "btn btn-outline-secondary btn-sm");
        setAttr(btn, { type: "button" });
        btn.textContent = "Back";
        btn.addEventListener("click", () => this.prevStep());
        return btn;
    }

    private buildNextBtn(): HTMLElement
    {
        const isLast = this.activeIndex >= this.steps.length - 1;
        const label = isLast
            ? (this.options.finishLabel ?? "Finish")
            : "Next";
        const cls = isLast
            ? "btn btn-primary btn-sm"
            : "btn btn-primary btn-sm";

        const btn = createElement("button", cls);
        setAttr(btn, { type: "button" });
        btn.textContent = label;
        btn.addEventListener("click", () => this.nextStep());
        return btn;
    }

    private buildSaveAsDraftBtn(): HTMLElement
    {
        const btn = createElement("button", "btn btn-outline-secondary btn-sm");
        setAttr(btn, { type: "button" });
        btn.textContent = "Save as Draft";
        btn.addEventListener("click", () =>
        {
            if (this.options.onSaveAsDraft)
            {
                this.options.onSaveAsDraft();
            }
        });
        return btn;
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

// @entrypoint

export function createStepper(options: StepperOptions): StepperHandle
{
    if (!options.container)
    {
        console.error(LOG_PREFIX, "No container provided");
        throw new Error(`${LOG_PREFIX} container is required`);
    }
    if (!options.steps || options.steps.length === 0)
    {
        console.error(LOG_PREFIX, "No steps provided");
        throw new Error(`${LOG_PREFIX} steps are required`);
    }

    const inst = new Stepper(options);
    return {
        goToStep: (i) => inst.goToStep(i),
        nextStep: () => inst.nextStep(),
        prevStep: () => inst.prevStep(),
        getActiveStep: () => inst.getActiveStep(),
        setStepState: (i, s) => inst.setStepState(i, s),
        getCompletionPercent: () => inst.getCompletionPercent(),
        getElement: () => inst.getElement(),
        destroy: () => inst.destroy()
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).createStepper = createStepper;
