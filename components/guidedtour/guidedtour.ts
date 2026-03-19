/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: GuidedTour
 * 📜 PURPOSE: Product walkthrough wrapping Driver.js with enterprise-themed
 *             popovers, step progression, localStorage persistence, and
 *             analytics hooks.
 * 🔗 RELATES: [[EnterpriseTheme]], [[GraphCanvasMx]]
 * ⚡ FLOW: [Consumer] -> [createGuidedTour(opts)] -> [Driver.js tour]
 * 🔒 SECURITY: Step text via textContent only. Driver.js loaded via CDN,
 *    styled via CSS overrides — source never modified.
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[GuidedTour]";
const STORAGE_PREFIX = "guidedtour-";

// ============================================================================
// INTERFACES
// ============================================================================

/** A single step in the guided tour. */
export interface TourStep
{
    /** CSS selector or HTMLElement to highlight. */
    readonly target: string | HTMLElement;
    /** Step title text. */
    readonly title: string;
    /** Step description text. */
    readonly description: string;
    /** Popover position: top, bottom, left, right. */
    readonly side?: string;
    /** Predicate: return false to skip this step. */
    readonly visible?: () => boolean;
    /** Called before showing this step. */
    readonly onBeforeStep?: () => void | Promise<void>;
    /** Called after leaving this step. */
    readonly onAfterStep?: () => void | Promise<void>;
}

/** Configuration for the GuidedTour component. */
export interface GuidedTourOptions
{
    /** Unique tour identifier (used for localStorage key). */
    readonly tourId: string;
    /** Array of tour steps. */
    readonly steps: TourStep[];
    /** Show "Step X of Y" counter. Default: true. */
    readonly showProgress?: boolean;
    /** Show "Skip Tour" button. Default: true. */
    readonly showSkip?: boolean;
    /** Backdrop overlay colour. Default: "rgba(0,0,0,0.5)". */
    readonly overlayColor?: string;
    /** Animate step transitions. Default: true. */
    readonly animate?: boolean;
    /** Called when tour starts. */
    readonly onTourStart?: () => void;
    /** Called when a step is viewed. */
    readonly onStepView?: (stepIndex: number) => void;
    /** Called when a step is skipped. */
    readonly onStepSkip?: (stepIndex: number) => void;
    /** Called when tour completes (last step done). */
    readonly onTourComplete?: () => void;
    /** Called when tour is dismissed (skip or escape). */
    readonly onTourDismiss?: (stepIndex: number) => void;
}

/** Public handle for controlling the GuidedTour. */
export interface GuidedTourHandle
{
    start(): void;
    next(): void;
    previous(): void;
    goToStep(index: number): void;
    dismiss(): void;
    isActive(): boolean;
    isCompleted(): boolean;
    resetProgress(): void;
    destroy(): void;
}

// ============================================================================
// DRIVER.JS PROBE
// ============================================================================

/**
 * Minimal type for the Driver.js API we consume.
 * We only reference the public surface needed for tour execution.
 */
interface DriverInstance
{
    highlight(step: Record<string, unknown>): void;
    drive(index?: number): void;
    moveNext(): void;
    movePrevious(): void;
    destroy(): void;
    isActive(): boolean;
    getActiveIndex(): number | undefined;
    getActiveElement(): HTMLElement | undefined;
}

/** Driver.js 1.x exposes a factory function, not a constructor. */
interface DriverFactory
{
    (config: Record<string, unknown>): DriverInstance;
}

interface DriverModule
{
    driver: DriverFactory;
}

// @dependency: Driver.js (CDN, window.driver)

/** Probes for Driver.js on the global window object.
 *  The IIFE CDN build exposes `window.driver.js.driver` (nested under a "js" key).
 *  We also check `window.driver.driver` for alternative bundling.
 */
function getDriverJs(): DriverFactory | null
{
    const mod = (window as unknown as Record<string, unknown>)["driver"];
    if (!mod) { return null; }

    if (typeof mod === "function")
    {
        return mod as unknown as DriverFactory;
    }

    if (typeof mod !== "object") { return null; }

    // CDN IIFE: window.driver.js.driver
    const jsNs = (mod as Record<string, unknown>)["js"];
    if (typeof jsNs === "object" && jsNs && "driver" in (jsNs as object))
    {
        const ctor = (jsNs as Record<string, unknown>)["driver"];
        if (typeof ctor === "function")
        {
            return ctor as unknown as DriverFactory;
        }
    }

    // Fallback: window.driver.driver
    if ("driver" in (mod as object))
    {
        const m = mod as unknown as DriverModule;
        if (typeof m.driver === "function")
        {
            return m.driver as unknown as DriverFactory;
        }
    }

    return null;
}

// ============================================================================
// GUIDED TOUR CLASS
// ============================================================================

/**
 * Manages a multi-step product walkthrough using Driver.js for highlighting.
 * Injects custom enterprise-themed popovers, handles step progression,
 * persistence via localStorage, and analytics lifecycle hooks.
 */
class GuidedTour
{
    private readonly options: GuidedTourOptions;
    private readonly filteredSteps: TourStep[];
    private readonly storageKey: string;

    private driverInstance: DriverInstance | null = null;
    private active = false;
    private currentIndex = 0;
    private destroyed = false;

    private boundKeyDown: (e: KeyboardEvent) => void;

    constructor(
        options: GuidedTourOptions,
        DriverClass: DriverFactory
    )
    {
        this.options = options;
        this.storageKey = `${STORAGE_PREFIX}${options.tourId}-complete`;
        this.filteredSteps = this.filterVisibleSteps(options.steps);

        this.boundKeyDown = (e) => this.handleKeyDown(e);
        this.driverInstance = this.createDriverInstance(DriverClass);

        console.log(
            LOG_PREFIX, "Created tour:",
            options.tourId,
            `(${this.filteredSteps.length} steps)`
        );
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    start(): void
    {
        if (this.filteredSteps.length === 0)
        {
            console.warn(LOG_PREFIX, "No visible steps to show");
            return;
        }

        this.active = true;
        this.currentIndex = 0;
        document.addEventListener("keydown", this.boundKeyDown, true);

        this.fireOnTourStart();
        this.driveToStep(0);
        console.log(LOG_PREFIX, "Tour started:", this.options.tourId);
    }

    next(): void
    {
        if (!this.active) { return; }
        this.fireOnAfterStep(this.currentIndex);

        if (this.currentIndex < this.filteredSteps.length - 1)
        {
            this.currentIndex++;
            this.driveToStep(this.currentIndex);
        }
        else
        {
            this.completeTour();
        }
    }

    previous(): void
    {
        if (!this.active || this.currentIndex <= 0) { return; }
        this.fireOnAfterStep(this.currentIndex);
        this.currentIndex--;
        this.driveToStep(this.currentIndex);
    }

    goToStep(index: number): void
    {
        if (!this.active) { return; }
        if (index < 0 || index >= this.filteredSteps.length) { return; }
        this.fireOnAfterStep(this.currentIndex);
        this.currentIndex = index;
        this.driveToStep(index);
    }

    dismiss(): void
    {
        if (!this.active) { return; }

        this.fireOnTourDismiss(this.currentIndex);
        this.stopTour();
        console.log(LOG_PREFIX, "Tour dismissed:", this.options.tourId);
    }

    isActive(): boolean
    {
        return this.active;
    }

    isCompleted(): boolean
    {
        try
        {
            return localStorage.getItem(this.storageKey) === "true";
        }
        catch
        {
            return false;
        }
    }

    resetProgress(): void
    {
        try
        {
            localStorage.removeItem(this.storageKey);
        }
        catch
        {
            console.warn(LOG_PREFIX, "Could not clear localStorage");
        }
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;

        this.stopTour();
        if (this.driverInstance)
        {
            this.driverInstance.destroy();
            this.driverInstance = null;
        }
        console.log(LOG_PREFIX, "Destroyed:", this.options.tourId);
    }

    // ====================================================================
    // PRIVATE: DRIVER.JS SETUP
    // ====================================================================

    private createDriverInstance(
        DriverClass: DriverFactory
    ): DriverInstance
    {
        const self = this;

        return DriverClass({
            showProgress: false,
            showButtons: [],
            overlayColor: this.options.overlayColor ?? "rgba(0,0,0,0.5)",
            animate: this.options.animate !== false,
            allowClose: false,
            stagePadding: 8,
            stageRadius: 0,
            popoverClass: "guidedtour-popover",
            onDestroyStarted: () => { self.dismiss(); }
        });
    }

    private filterVisibleSteps(steps: TourStep[]): TourStep[]
    {
        return steps.filter(s =>
        {
            if (!s.visible) { return true; }
            return s.visible();
        });
    }

    // ====================================================================
    // PRIVATE: DRIVE STEPS
    // ====================================================================

    /** Highlights the target element and injects a custom popover for the given step. */
    private driveToStep(index: number): void
    {
        const step = this.filteredSteps[index];
        if (!step || !this.driverInstance) { return; }

        this.fireOnBeforeStep(index);
        this.fireOnStepView(index);
        console.debug(LOG_PREFIX, "Driving to step:", index, step.title);

        const target = typeof step.target === "string"
            ? step.target : step.target;

        const self = this;

        this.driverInstance.highlight({
            element: target,
            popover: {
                title: "",
                description: "",
                side: step.side ?? "bottom",
                align: "center",
                onPopoverRender: () =>
                {
                    // Defer one frame — Driver.js may fire callback
                    // before the popover element is in the DOM
                    requestAnimationFrame(() =>
                    {
                        self.injectCustomPopover(step, index);
                    });
                }
            }
        });
    }

    /** Replaces Driver.js default popover content with enterprise-themed custom popover. */
    private injectCustomPopover(step: TourStep, index: number): void
    {
        const popover = document.querySelector(
            ".driver-popover"
        ) as HTMLElement;
        if (!popover) { return; }

        popover.innerHTML = "";
        popover.classList.add("guidedtour-popover");

        popover.appendChild(this.buildPopoverHeader(step));
        popover.appendChild(this.buildPopoverBody(step));
        popover.appendChild(this.buildPopoverFooter(index));
    }

    // ====================================================================
    // PRIVATE: POPOVER DOM
    // ====================================================================

    private buildPopoverHeader(step: TourStep): HTMLElement
    {
        const header = document.createElement("div");
        header.className = "guidedtour-header";

        const title = document.createElement("span");
        title.className = "guidedtour-title";
        title.textContent = step.title;
        header.appendChild(title);

        return header;
    }

    private buildPopoverBody(step: TourStep): HTMLElement
    {
        const body = document.createElement("div");
        body.className = "guidedtour-body";
        body.textContent = step.description;
        return body;
    }

    /** Builds the popover footer with progress label and navigation buttons. */
    private buildPopoverFooter(index: number): HTMLElement
    {
        const footer = document.createElement("div");
        footer.className = "guidedtour-footer";

        const total = this.filteredSteps.length;
        const showProgress = this.options.showProgress !== false;

        if (showProgress)
        {
            footer.appendChild(this.buildProgressLabel(index, total));
        }

        footer.appendChild(this.buildNavButtons(index, total));
        return footer;
    }

    /** Assembles the Previous / Next / Skip / Done button group. */
    private buildNavButtons(index: number, total: number): HTMLElement
    {
        const buttons = document.createElement("div");
        buttons.className = "guidedtour-buttons";

        const isFirst = index === 0;
        const isLast = index === total - 1;

        if (this.options.showSkip !== false && !isLast)
        {
            buttons.appendChild(this.buildSkipBtn());
        }

        if (!isFirst)
        {
            buttons.appendChild(this.buildPrevBtn());
        }

        buttons.appendChild(
            isLast ? this.buildDoneBtn() : this.buildNextBtn()
        );

        return buttons;
    }

    private buildProgressLabel(
        index: number, total: number
    ): HTMLElement
    {
        const label = document.createElement("span");
        label.className = "guidedtour-progress";
        label.textContent = `Step ${index + 1} of ${total}`;
        return label;
    }

    private buildPrevBtn(): HTMLElement
    {
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-outline-secondary guidedtour-btn";
        btn.type = "button";
        btn.textContent = "Previous";
        btn.addEventListener("click", () => this.previous());
        return btn;
    }

    private buildNextBtn(): HTMLElement
    {
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-primary guidedtour-btn";
        btn.type = "button";
        btn.textContent = "Next";
        btn.addEventListener("click", () => this.next());
        return btn;
    }

    private buildDoneBtn(): HTMLElement
    {
        const btn = document.createElement("button");
        btn.className = "btn btn-sm btn-primary guidedtour-btn";
        btn.type = "button";
        btn.textContent = "Done";
        btn.addEventListener("click", () => this.next());
        return btn;
    }

    private buildSkipBtn(): HTMLElement
    {
        const btn = document.createElement("button");
        btn.className =
            "btn btn-sm btn-link text-muted guidedtour-btn guidedtour-skip";
        btn.type = "button";
        btn.textContent = "Skip Tour";
        btn.addEventListener("click", () => this.dismiss());
        return btn;
    }

    // ====================================================================
    // PRIVATE: TOUR LIFECYCLE
    // ====================================================================

    private completeTour(): void
    {
        this.markComplete();
        this.fireOnTourComplete();
        this.stopTour();
        console.log(LOG_PREFIX, "Tour completed:", this.options.tourId);
    }

    private stopTour(): void
    {
        this.active = false;
        document.removeEventListener("keydown", this.boundKeyDown, true);

        if (this.driverInstance)
        {
            this.driverInstance.destroy();
            this.driverInstance = null;
        }

        const DriverClass = getDriverJs();
        if (DriverClass)
        {
            this.driverInstance = this.createDriverInstance(DriverClass);
        }
    }

    private markComplete(): void
    {
        try
        {
            localStorage.setItem(this.storageKey, "true");
        }
        catch
        {
            console.warn(LOG_PREFIX, "Could not write localStorage");
        }
    }

    // ====================================================================
    // PRIVATE: ANALYTICS HOOKS
    // ====================================================================

    private fireOnTourStart(): void
    {
        if (this.options.onTourStart)
        {
            this.options.onTourStart();
        }
    }

    private fireOnStepView(index: number): void
    {
        if (this.options.onStepView)
        {
            this.options.onStepView(index);
        }
    }

    private fireOnTourComplete(): void
    {
        if (this.options.onTourComplete)
        {
            this.options.onTourComplete();
        }
    }

    private fireOnTourDismiss(index: number): void
    {
        if (this.options.onTourDismiss)
        {
            this.options.onTourDismiss(index);
        }
    }

    private fireOnBeforeStep(index: number): void
    {
        const step = this.filteredSteps[index];
        if (step?.onBeforeStep) { step.onBeforeStep(); }
    }

    private fireOnAfterStep(index: number): void
    {
        const step = this.filteredSteps[index];
        if (step?.onAfterStep) { step.onAfterStep(); }
    }

    // ====================================================================
    // PRIVATE: KEYBOARD
    // ====================================================================

    private handleKeyDown(e: KeyboardEvent): void
    {
        if (!this.active) { return; }

        if (e.key === "ArrowRight" || e.key === "ArrowDown")
        {
            e.preventDefault();
            this.next();
        }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        {
            e.preventDefault();
            this.previous();
        }
        else if (e.key === "Escape")
        {
            e.preventDefault();
            this.dismiss();
        }
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

// @entrypoint

/**
 * Creates a GuidedTour wrapping Driver.js.
 * Returns null if Driver.js is not loaded on the page.
 */
export function createGuidedTour(
    options: GuidedTourOptions
): GuidedTourHandle | null
{
    if (!options.tourId)
    {
        console.error(LOG_PREFIX, "tourId is required");
        return null;
    }

    if (!options.steps || options.steps.length === 0)
    {
        console.error(LOG_PREFIX, "steps are required");
        return null;
    }

    const DriverClass = getDriverJs();
    if (!DriverClass)
    {
        console.error(
            LOG_PREFIX,
            "Driver.js not found on window.driver.",
            "Load Driver.js via CDN before using GuidedTour."
        );
        return null;
    }

    const inst = new GuidedTour(options, DriverClass);

    return {
        start: () => inst.start(),
        next: () => inst.next(),
        previous: () => inst.previous(),
        goToStep: (i) => inst.goToStep(i),
        dismiss: () => inst.dismiss(),
        isActive: () => inst.isActive(),
        isCompleted: () => inst.isCompleted(),
        resetProgress: () => inst.resetProgress(),
        destroy: () => inst.destroy()
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).createGuidedTour =
    createGuidedTour;
