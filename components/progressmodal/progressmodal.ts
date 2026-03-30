/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ProgressModal
 * 📜 PURPOSE: A modal overlay that communicates the status of a long-running
 *    operation, supporting indeterminate and determinate modes with a
 *    scrollable timestamped detail log.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer App] -> [showProgressModal()] -> [DOM modal + backdrop]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * A single entry in the progress detail log.
 */
export interface ProgressLogEntry
{
    /** The message text. */
    message: string;

    /** Log level determining the icon and colour. Default: "info". */
    level?: "info" | "success" | "error" | "warning" | "progress";

    /** Timestamp. Auto-generated if not provided. */
    timestamp?: Date;
}

/**
 * Configuration options for the ProgressModal component.
 */
export interface ProgressModalOptions
{
    /** Modal title text. */
    title: string;

    /** Initial mode. Default: "indeterminate". */
    mode?: "indeterminate" | "determinate";

    /** Initial status text displayed below the spinner or progress bar. */
    statusText?: string;

    /** Total number of steps (for step-counter display). */
    totalSteps?: number;

    /** Show timestamps in the detail log. Default: true. */
    showTimestamps?: boolean;

    /** Show the scrollable detail log panel. Default: true. */
    showDetailLog?: boolean;

    /** Show the "Copy log" button on the detail log. Default: true. */
    showCopyLog?: boolean;

    /** Automatically close the modal N milliseconds after successful completion.
     *  0 = no auto-close. Default: 0. */
    autoClose?: number;

    /** Allow clicking the backdrop to close the modal once completed. Default: false. */
    allowBackdropClose?: boolean;

    /** Use wide layout for long log messages. Default: false. */
    wide?: boolean;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;

    /** Callback fired when the user clicks Cancel. If not provided, Cancel button is not shown. */
    onCancel?: () => void;

    /** Callback fired when the user clicks Retry (only on error). If not provided, Retry button is not shown. */
    onRetry?: () => void;

    /** Callback fired when the modal is closed (after completion). */
    onClose?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[ProgressModal]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

let instanceCounter = 0;

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    closeCompleted: "Escape",
    focusTrap: "Tab",
};

// ============================================================================
// ICON CLASSES PER LOG LEVEL
// ============================================================================

const LEVEL_ICON_MAP: Record<string, string[]> =
{
    info: ["bi", "bi-info-circle"],
    success: ["bi", "bi-check-circle-fill"],
    error: ["bi", "bi-x-circle-fill"],
    warning: ["bi", "bi-exclamation-triangle-fill"],
};

// ============================================================================
// PRIVATE HELPERS — DOM
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0)
    {
        el.classList.add(...classes);
    }
    if (text)
    {
        el.textContent = text;
    }
    return el;
}

function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// PRIVATE HELPERS — TIME FORMATTING
// ============================================================================

function formatTimestamp(date: Date): string
{
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
}

function clampFraction(value: number): number
{
    if (value < 0)
    {
        logWarn("Progress value below 0; clamped.");
        return 0;
    }
    if (value > 1)
    {
        logWarn("Progress value above 1.0; clamped.");
        return 1;
    }
    return value;
}

// ============================================================================
// PRIVATE HELPERS — FOCUS TRAPPING
// ============================================================================

const FOCUSABLE_SELECTOR =
    'button:not([disabled]):not([style*="display: none"]),'
    + '[tabindex]:not([tabindex="-1"]):not([disabled])';

function getFocusableElements(container: HTMLElement): HTMLElement[]
{
    return Array.from(
        container.querySelectorAll(FOCUSABLE_SELECTOR)
    ) as HTMLElement[];
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint
/**
 * ProgressModal renders a dialog overlay that communicates the status of a
 * long-running operation with indeterminate/determinate modes and a detail log.
 *
 * @example
 * const modal = new ProgressModal({ title: "Importing Data..." });
 * modal.show();
 * modal.logInfo("Starting import...");
 * modal.setProgress(0.5);
 * modal.complete("Import finished.");
 */
export class ProgressModal
{
    private readonly instanceId: string;
    private options: ProgressModalOptions;

    // State
    private state: "created" | "running" | "completed" | "failed" | "closed"
        = "created";
    private mode: "indeterminate" | "determinate";
    private progress = 0;
    private currentStep = 0;
    private logEntries: ProgressLogEntry[] = [];
    private autoScrollEnabled = true;
    private previouslyFocusedEl: HTMLElement | null = null;
    private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

    // DOM references
    private backdropEl: HTMLElement | null = null;
    private modalEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private closeBtnEl: HTMLElement | null = null;
    private spinnerEl: HTMLElement | null = null;
    private progressSectionEl: HTMLElement | null = null;
    private stepCounterEl: HTMLElement | null = null;
    private currentStepEl: HTMLElement | null = null;
    private totalStepsEl: HTMLElement | null = null;
    private barEl: HTMLElement | null = null;
    private percentageEl: HTMLElement | null = null;
    private statusEl: HTMLElement | null = null;
    private logContainerEl: HTMLElement | null = null;
    private logEl: HTMLElement | null = null;
    private copyLogBtnEl: HTMLElement | null = null;
    private cancelBtnEl: HTMLElement | null = null;
    private retryBtnEl: HTMLElement | null = null;
    private doneBtnEl: HTMLElement | null = null;

    // Bound event handlers
    private readonly boundOnKeydown: (e: KeyboardEvent) => void;
    private readonly boundOnBackdropClick: (e: MouseEvent) => void;

    constructor(options: ProgressModalOptions)
    {
        instanceCounter++;
        this.instanceId = `progressmodal-${instanceCounter}`;

        if (!options.title)
        {
            logError("No title provided; defaulting.");
        }

        this.options = {
            mode: "indeterminate",
            showTimestamps: true,
            showDetailLog: true,
            showCopyLog: true,
            autoClose: 0,
            allowBackdropClose: false,
            wide: false,
            ...options,
            title: options.title || "Processing\u2026",
        };

        this.mode = this.options.mode!;

        this.boundOnKeydown = (e) => this.onKeydown(e);
        this.boundOnBackdropClick = (e) => this.onBackdropClick(e);

        logInfo("Initialised:", this.instanceId);
    }

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    public show(initialEntries?: ProgressLogEntry[]): void
    {
        if (this.state !== "created")
        {
            logWarn(`show() called in state "${this.state}"; ignored.`);
            return;
        }

        this.previouslyFocusedEl =
            document.activeElement as HTMLElement | null;
        this.state = "running";
        this.buildDOM();
        this.attachToBody();
        this.updateModeDisplay();
        this.updateFooterButtons();

        if (initialEntries)
        {
            this.log(initialEntries);
        }

        document.addEventListener("keydown", this.boundOnKeydown);

        requestAnimationFrame(() =>
        {
            this.modalEl?.focus();
        });

        logDebug("Shown:", this.instanceId);
    }

    public setStatus(text: string): void
    {
        if (this.statusEl)
        {
            this.statusEl.textContent = text;
        }
        logDebug(`Status updated: "${text}"`);
    }

    public setProgress(fraction: number): void
    {
        const clamped = clampFraction(fraction);
        this.progress = clamped;

        if (this.mode === "indeterminate")
        {
            this.mode = "determinate";
            this.updateModeDisplay();
        }

        this.updateProgressBar();
        logDebug("Progress:", Math.round(clamped * 100) + "%");
    }

    public setStep(currentStep: number): void
    {
        const total = this.options.totalSteps || 0;
        if (currentStep > total && total > 0)
        {
            logWarn(`Step ${currentStep} exceeds total ${total}; clamped.`);
            currentStep = total;
        }

        this.currentStep = currentStep;
        this.updateStepCounter();

        if (total > 0)
        {
            this.setProgress(currentStep / total);
        }
    }

    public setIndeterminate(): void
    {
        this.mode = "indeterminate";
        this.updateModeDisplay();
        logDebug("Switched to indeterminate mode.");
    }

    public log(entry: ProgressLogEntry | ProgressLogEntry[]): void
    {
        const entries = Array.isArray(entry) ? entry : [entry];
        for (const e of entries)
        {
            const normalized = this.normalizeEntry(e);
            this.logEntries.push(normalized);
            this.appendLogEntryDOM(normalized);
        }
        this.autoScrollLog();
    }

    public logInfo(message: string): void
    {
        this.log({ message, level: "info" });
    }

    public logSuccess(message: string): void
    {
        this.log({ message, level: "success" });
    }

    public logError(message: string): void
    {
        this.log({ message, level: "error" });
    }

    public logWarning(message: string): void
    {
        this.log({ message, level: "warning" });
    }

    public complete(statusText?: string): void
    {
        this.state = "completed";
        this.progress = 1;
        this.mode = "determinate";
        this.updateModeDisplay();
        this.updateProgressBar();

        this.barEl?.classList.add("progressmodal-bar-success");
        this.modalEl?.classList.add("progressmodal-completed");

        if (this.statusEl)
        {
            this.statusEl.textContent =
                statusText || "Complete";
            this.statusEl.classList.add("progressmodal-status-success");
        }

        this.showHeaderCloseBtn();
        this.updateFooterButtons();
        this.focusCloseButton();
        this.startAutoCloseTimer();

        logDebug("Completed:", this.instanceId);
    }

    public fail(statusText?: string): void
    {
        this.state = "failed";

        this.barEl?.classList.add("progressmodal-bar-error");
        this.modalEl?.classList.add("progressmodal-failed");

        if (this.statusEl)
        {
            this.statusEl.textContent =
                statusText || "Failed";
            this.statusEl.classList.add("progressmodal-status-error");
        }

        this.showHeaderCloseBtn();
        this.updateFooterButtons();
        this.focusCloseButton();

        logDebug("Failed:", this.instanceId);
    }

    public close(): void
    {
        if (this.state === "running")
        {
            logWarn("close() while running; use fail() or complete() first.");
            return;
        }
        if (this.state === "closed")
        {
            return;
        }

        this.clearAutoCloseTimer();
        this.state = "closed";
        this.removeFromDOM();
        document.removeEventListener("keydown", this.boundOnKeydown);

        if (this.previouslyFocusedEl)
        {
            this.previouslyFocusedEl.focus();
        }

        this.options.onClose?.();
        logDebug("Closed:", this.instanceId);
    }

    public getLog(): ProgressLogEntry[]
    {
        return [...this.logEntries];
    }

    public getLogText(): string
    {
        return this.logEntries.map((e) =>
        {
            const ts = e.timestamp
                ? formatTimestamp(e.timestamp)
                : "";
            const lvl = (e.level || "info").toUpperCase().padEnd(8);
            return `${ts}  ${lvl}  ${e.message}`;
        }).join("\n");
    }

    public isVisible(): boolean
    {
        return this.state === "running"
            || this.state === "completed"
            || this.state === "failed";
    }

    public getState():
        "running" | "completed" | "failed" | "closed"
    {
        if (this.state === "created")
        {
            return "closed";
        }
        return this.state;
    }

    public destroy(): void
    {
        this.clearAutoCloseTimer();
        this.removeFromDOM();
        document.removeEventListener("keydown", this.boundOnKeydown);
        this.state = "closed";
        logDebug("Destroyed:", this.instanceId);
    }

    // ========================================================================
    // PRIVATE — DOM CONSTRUCTION
    // ========================================================================

    private buildDOM(): void
    {
        this.backdropEl = this.buildBackdrop();
        this.modalEl = this.buildModal();
    }

    private buildBackdrop(): HTMLElement
    {
        const backdrop = createElement(
            "div", ["progressmodal-backdrop"]
        );
        backdrop.addEventListener(
            "click", this.boundOnBackdropClick
        );
        return backdrop;
    }

    private buildModal(): HTMLElement
    {
        const modal = createElement("div", ["progressmodal"]);
        setAttr(modal, "id", this.instanceId);
        setAttr(modal, "role", "dialog");
        setAttr(modal, "aria-modal", "true");
        setAttr(modal, "aria-labelledby", `${this.instanceId}-title`);
        setAttr(modal, "aria-describedby", `${this.instanceId}-status`);
        setAttr(modal, "tabindex", "-1");

        if (this.options.wide)
        {
            modal.classList.add("progressmodal-wide");
        }

        const dialog = createElement("div", ["progressmodal-dialog"]);
        const content = createElement("div", ["progressmodal-content"]);

        content.appendChild(this.buildHeader());
        content.appendChild(this.buildBody());
        content.appendChild(this.buildFooter());

        dialog.appendChild(content);
        modal.appendChild(dialog);

        return modal;
    }

    private buildHeader(): HTMLElement
    {
        const header = createElement(
            "div", ["progressmodal-header"]
        );

        this.titleEl = createElement(
            "h5",
            ["progressmodal-title"],
            this.options.title
        );
        setAttr(this.titleEl, "id", `${this.instanceId}-title`);
        header.appendChild(this.titleEl);

        this.closeBtnEl = createElement(
            "button", ["btn-close", "progressmodal-close-btn"]
        );
        setAttr(this.closeBtnEl, "type", "button");
        setAttr(this.closeBtnEl, "aria-label", "Close dialog");
        this.closeBtnEl.style.display = "none";
        this.closeBtnEl.addEventListener("click", () =>
        {
            this.close();
        });
        header.appendChild(this.closeBtnEl);

        return header;
    }

    private buildBody(): HTMLElement
    {
        const body = createElement("div", ["progressmodal-body"]);

        body.appendChild(this.buildSpinner());
        body.appendChild(this.buildProgressSection());
        body.appendChild(this.buildStatusArea());

        if (this.options.showDetailLog)
        {
            body.appendChild(this.buildLogContainer());
        }

        return body;
    }

    private buildSpinner(): HTMLElement
    {
        this.spinnerEl = createElement(
            "div", ["progressmodal-spinner"]
        );
        setAttr(this.spinnerEl, "role", "status");
        setAttr(
            this.spinnerEl, "aria-label", "Operation in progress"
        );

        const ring = createElement(
            "div", ["progressmodal-spinner-ring"]
        );
        this.spinnerEl.appendChild(ring);

        return this.spinnerEl;
    }

    private buildProgressSection(): HTMLElement
    {
        this.progressSectionEl = createElement(
            "div", ["progressmodal-progress-section"]
        );
        this.progressSectionEl.style.display = "none";

        this.progressSectionEl.appendChild(
            this.buildStepCounter()
        );
        this.progressSectionEl.appendChild(
            this.buildProgressBar()
        );
        this.progressSectionEl.appendChild(
            this.buildPercentage()
        );

        return this.progressSectionEl;
    }

    private buildStepCounter(): HTMLElement
    {
        this.stepCounterEl = createElement(
            "div", ["progressmodal-step-counter"]
        );

        const stepLabel = document.createTextNode("Step ");
        this.stepCounterEl.appendChild(stepLabel);

        this.currentStepEl = createElement(
            "span", ["progressmodal-current-step"], "0"
        );
        this.stepCounterEl.appendChild(this.currentStepEl);

        const ofLabel = document.createTextNode(" of ");
        this.stepCounterEl.appendChild(ofLabel);

        this.totalStepsEl = createElement(
            "span",
            ["progressmodal-total-steps"],
            String(this.options.totalSteps || 0)
        );
        this.stepCounterEl.appendChild(this.totalStepsEl);

        if (!this.options.totalSteps)
        {
            this.stepCounterEl.style.display = "none";
        }

        return this.stepCounterEl;
    }

    private buildProgressBar(): HTMLElement
    {
        const container = createElement(
            "div", ["progress", "progressmodal-bar-container"]
        );

        this.barEl = createElement(
            "div", ["progress-bar", "progressmodal-bar"]
        );
        setAttr(this.barEl, "role", "progressbar");
        setAttr(this.barEl, "aria-valuenow", "0");
        setAttr(this.barEl, "aria-valuemin", "0");
        setAttr(this.barEl, "aria-valuemax", "100");
        setAttr(this.barEl, "aria-label", "Operation progress");
        this.barEl.style.width = "0%";

        container.appendChild(this.barEl);
        return container;
    }

    private buildPercentage(): HTMLElement
    {
        this.percentageEl = createElement(
            "div", ["progressmodal-percentage"], "0%"
        );
        return this.percentageEl;
    }

    private buildStatusArea(): HTMLElement
    {
        this.statusEl = createElement(
            "div",
            ["progressmodal-status"],
            this.options.statusText || ""
        );
        setAttr(
            this.statusEl, "id", `${this.instanceId}-status`
        );
        setAttr(this.statusEl, "aria-live", "polite");
        return this.statusEl;
    }

    private buildLogContainer(): HTMLElement
    {
        this.logContainerEl = createElement(
            "div", ["progressmodal-log-container"]
        );

        if (this.options.showCopyLog)
        {
            this.copyLogBtnEl = this.buildCopyLogButton();
            this.logContainerEl.appendChild(this.copyLogBtnEl);
        }

        this.logEl = createElement("div", ["progressmodal-log"]);
        setAttr(this.logEl, "role", "log");
        setAttr(this.logEl, "aria-label", "Operation details");
        setAttr(this.logEl, "aria-live", "polite");

        this.logEl.addEventListener("scroll", () =>
        {
            this.onLogScroll();
        });

        this.logContainerEl.appendChild(this.logEl);
        return this.logContainerEl;
    }

    private buildCopyLogButton(): HTMLElement
    {
        const btn = createElement(
            "button", ["progressmodal-copy-log-btn"]
        );
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Copy log to clipboard");
        setAttr(btn, "title", "Copy log");

        const icon = createElement("i", ["bi", "bi-clipboard"]);
        btn.appendChild(icon);

        btn.addEventListener("click", () =>
        {
            this.copyLogToClipboard();
        });

        return btn;
    }

    private buildFooter(): HTMLElement
    {
        const footer = createElement(
            "div", ["progressmodal-footer"]
        );

        this.cancelBtnEl = createElement(
            "button",
            ["btn", "btn-secondary", "progressmodal-cancel-btn"],
            "Cancel"
        );
        setAttr(this.cancelBtnEl, "type", "button");
        setAttr(this.cancelBtnEl, "aria-label", "Cancel operation");
        this.cancelBtnEl.addEventListener("click", () =>
        {
            this.onCancelClick();
        });
        footer.appendChild(this.cancelBtnEl);

        this.retryBtnEl = createElement(
            "button",
            ["btn", "btn-primary", "progressmodal-retry-btn"],
            "Retry"
        );
        setAttr(this.retryBtnEl, "type", "button");
        setAttr(this.retryBtnEl, "aria-label", "Retry operation");
        this.retryBtnEl.style.display = "none";
        this.retryBtnEl.addEventListener("click", () =>
        {
            this.onRetryClick();
        });
        footer.appendChild(this.retryBtnEl);

        this.doneBtnEl = createElement(
            "button",
            ["btn", "btn-primary", "progressmodal-done-btn"],
            "Close"
        );
        setAttr(this.doneBtnEl, "type", "button");
        setAttr(this.doneBtnEl, "aria-label", "Close dialog");
        this.doneBtnEl.style.display = "none";
        this.doneBtnEl.addEventListener("click", () =>
        {
            this.close();
        });
        footer.appendChild(this.doneBtnEl);

        return footer;
    }

    // ========================================================================
    // PRIVATE — DOM ATTACHMENT / REMOVAL
    // ========================================================================

    private attachToBody(): void
    {
        if (this.backdropEl)
        {
            document.body.appendChild(this.backdropEl);
        }
        if (this.modalEl)
        {
            document.body.appendChild(this.modalEl);
        }
    }

    private removeFromDOM(): void
    {
        this.backdropEl?.remove();
        this.modalEl?.remove();
        this.backdropEl = null;
        this.modalEl = null;
    }

    // ========================================================================
    // PRIVATE — MODE DISPLAY
    // ========================================================================

    private updateModeDisplay(): void
    {
        if (this.mode === "indeterminate")
        {
            this.showSpinner();
            this.hideProgressSection();
        }
        else
        {
            this.hideSpinner();
            this.showProgressSection();
        }
    }

    private showSpinner(): void
    {
        if (this.spinnerEl)
        {
            this.spinnerEl.style.display = "";
        }
    }

    private hideSpinner(): void
    {
        if (this.spinnerEl)
        {
            this.spinnerEl.style.display = "none";
        }
    }

    private showProgressSection(): void
    {
        if (this.progressSectionEl)
        {
            this.progressSectionEl.style.display = "";
        }
    }

    private hideProgressSection(): void
    {
        if (this.progressSectionEl)
        {
            this.progressSectionEl.style.display = "none";
        }
    }

    // ========================================================================
    // PRIVATE — PROGRESS BAR UPDATES
    // ========================================================================

    private updateProgressBar(): void
    {
        const pct = Math.round(this.progress * 100);

        if (this.barEl)
        {
            this.barEl.style.width = pct + "%";
            setAttr(this.barEl, "aria-valuenow", String(pct));
        }
        if (this.percentageEl)
        {
            this.percentageEl.textContent = pct + "%";
        }
    }

    private updateStepCounter(): void
    {
        if (this.currentStepEl)
        {
            this.currentStepEl.textContent =
                String(this.currentStep);
        }
        if (this.totalStepsEl)
        {
            this.totalStepsEl.textContent =
                String(this.options.totalSteps || 0);
        }
        if (this.stepCounterEl && this.options.totalSteps)
        {
            this.stepCounterEl.style.display = "";
        }
    }

    // ========================================================================
    // PRIVATE — FOOTER BUTTON STATE
    // ========================================================================

    private updateFooterButtons(): void
    {
        if (this.state === "running")
        {
            this.showCancelIfAvailable();
            this.hideRetryButton();
            this.hideDoneButton();
        }
        else if (this.state === "completed")
        {
            this.hideCancelButton();
            this.hideRetryButton();
            this.showDoneButton();
        }
        else if (this.state === "failed")
        {
            this.hideCancelButton();
            this.showRetryIfAvailable();
            this.showDoneButton();
        }
    }

    private showCancelIfAvailable(): void
    {
        if (this.cancelBtnEl)
        {
            this.cancelBtnEl.style.display =
                this.options.onCancel ? "" : "none";
        }
    }

    private hideCancelButton(): void
    {
        if (this.cancelBtnEl)
        {
            this.cancelBtnEl.style.display = "none";
        }
    }

    private showRetryIfAvailable(): void
    {
        if (this.retryBtnEl)
        {
            this.retryBtnEl.style.display =
                this.options.onRetry ? "" : "none";
        }
    }

    private hideRetryButton(): void
    {
        if (this.retryBtnEl)
        {
            this.retryBtnEl.style.display = "none";
        }
    }

    private showDoneButton(): void
    {
        if (this.doneBtnEl)
        {
            this.doneBtnEl.style.display = "";
        }
    }

    private hideDoneButton(): void
    {
        if (this.doneBtnEl)
        {
            this.doneBtnEl.style.display = "none";
        }
    }

    private showHeaderCloseBtn(): void
    {
        if (this.closeBtnEl)
        {
            this.closeBtnEl.style.display = "";
        }
    }

    private focusCloseButton(): void
    {
        requestAnimationFrame(() =>
        {
            this.doneBtnEl?.focus();
        });
    }

    // ========================================================================
    // PRIVATE — LOG ENTRIES
    // ========================================================================

    private normalizeEntry(entry: ProgressLogEntry): ProgressLogEntry
    {
        return {
            message: entry.message,
            level: entry.level || "info",
            timestamp: entry.timestamp || new Date(),
        };
    }

    private appendLogEntryDOM(entry: ProgressLogEntry): void
    {
        if (!this.logEl)
        {
            return;
        }

        const level = entry.level || "info";
        const row = createElement("div", [
            "progressmodal-log-entry",
            `progressmodal-log-${level}`,
        ]);

        if (this.options.showTimestamps && entry.timestamp)
        {
            const ts = createElement(
                "span",
                ["progressmodal-log-timestamp"],
                formatTimestamp(entry.timestamp)
            );
            row.appendChild(ts);
        }

        const iconSpan = createElement(
            "span", ["progressmodal-log-icon"]
        );
        iconSpan.appendChild(this.buildLogIcon(level));
        row.appendChild(iconSpan);

        const msg = createElement(
            "span",
            ["progressmodal-log-message"],
            entry.message
        );
        row.appendChild(msg);

        this.logEl.appendChild(row);
    }

    private buildLogIcon(level: string): HTMLElement
    {
        if (level === "progress")
        {
            return createElement(
                "div", ["progressmodal-log-spinner"]
            );
        }

        const classes = LEVEL_ICON_MAP[level] || LEVEL_ICON_MAP["info"];
        return createElement("i", classes);
    }

    // ========================================================================
    // PRIVATE — LOG SCROLLING
    // ========================================================================

    private autoScrollLog(): void
    {
        if (!this.logEl || !this.autoScrollEnabled)
        {
            return;
        }
        this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    private onLogScroll(): void
    {
        if (!this.logEl)
        {
            return;
        }
        const threshold = 5;
        const atBottom =
            this.logEl.scrollHeight - this.logEl.scrollTop
            - this.logEl.clientHeight <= threshold;
        this.autoScrollEnabled = atBottom;
    }

    // ========================================================================
    // PRIVATE — CLIPBOARD
    // ========================================================================

    private copyLogToClipboard(): void
    {
        const text = this.getLogText();
        navigator.clipboard.writeText(text).then(
            () =>
            {
                logDebug("Log copied to clipboard.");
            },
            (err) =>
            {
                logError("Failed to copy log:", err);
            }
        );
    }

    // ========================================================================
    // KEY BINDING HELPERS
    // ========================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    private matchesKeyCombo(
        e: KeyboardEvent, action: string
    ): boolean
    {
        const combo = this.resolveKeyCombo(action);
        if (!combo) { return false; }
        const parts = combo.split("+");
        const key = parts[parts.length - 1];
        const needCtrl = parts.includes("Ctrl");
        const needShift = parts.includes("Shift");
        const needAlt = parts.includes("Alt");
        return e.key === key
            && e.ctrlKey === needCtrl
            && e.shiftKey === needShift
            && e.altKey === needAlt;
    }

    // ========================================================================
    // PRIVATE — EVENT HANDLERS
    // ========================================================================

    private onKeydown(e: KeyboardEvent): void
    {
        // Ctrl+C — copy dialog content (Windows native dialog behaviour)
        if (e.ctrlKey && e.key === "c" && !window.getSelection()?.toString())
        {
            this.handleDialogCopy(e);
            return;
        }

        if (this.matchesKeyCombo(e, "closeCompleted"))
        {
            this.handleEscape(e);
            return;
        }
        if (this.matchesKeyCombo(e, "focusTrap"))
        {
            this.handleFocusTrap(e);
            return;
        }
    }

    /**
     * Copies dialog content to clipboard on Ctrl+C when no text is selected.
     * Mirrors the Windows native dialog Ctrl+C behaviour.
     */
    private handleDialogCopy(e: KeyboardEvent): void
    {
        const parts = this.collectCopyParts();
        navigator.clipboard.writeText(parts.join("\n")).catch(() => {});
        e.preventDefault();
        logDebug("Dialog content copied via Ctrl+C");
    }

    /**
     * Collects title, status message, and progress percentage for clipboard copy.
     */
    private collectCopyParts(): string[]
    {
        const parts: string[] = [];

        const title = this.titleEl?.textContent;
        if (title) { parts.push(`[Title] ${title}`); }

        const status = this.statusEl?.textContent;
        if (status) { parts.push(`[Status] ${status}`); }

        if (this.mode === "determinate")
        {
            const pct = Math.round(this.progress * 100);
            parts.push(`[Progress] ${pct}%`);
        }

        return parts;
    }

    private handleEscape(e: KeyboardEvent): void
    {
        if (this.state === "running")
        {
            e.preventDefault();
            return;
        }
        if (
            this.state === "completed"
            || this.state === "failed"
        )
        {
            e.preventDefault();
            this.close();
        }
    }

    private handleFocusTrap(e: KeyboardEvent): void
    {
        if (!this.modalEl)
        {
            return;
        }

        const focusable = getFocusableElements(this.modalEl);
        if (focusable.length === 0)
        {
            e.preventDefault();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement;

        if (e.shiftKey && active === first)
        {
            e.preventDefault();
            last.focus();
        }
        else if (!e.shiftKey && active === last)
        {
            e.preventDefault();
            first.focus();
        }
    }

    private onBackdropClick(e: MouseEvent): void
    {
        if (this.state === "running")
        {
            e.preventDefault();
            return;
        }
        if (
            this.options.allowBackdropClose
            && (this.state === "completed" || this.state === "failed")
        )
        {
            this.close();
        }
    }

    private onCancelClick(): void
    {
        if (!this.options.onCancel || this.state !== "running")
        {
            return;
        }

        if (this.cancelBtnEl)
        {
            this.cancelBtnEl.textContent = "Cancelling\u2026";
            (this.cancelBtnEl as HTMLButtonElement).disabled = true;
        }

        this.options.onCancel();
        logDebug("Cancel requested.");
    }

    private onRetryClick(): void
    {
        if (!this.options.onRetry)
        {
            return;
        }

        this.resetToRunning();
        this.options.onRetry();
        logDebug("Retry requested.");
    }

    // ========================================================================
    // PRIVATE — STATE RESET (for retry)
    // ========================================================================

    private resetToRunning(): void
    {
        this.state = "running";
        this.progress = 0;
        this.currentStep = 0;
        this.mode = this.options.mode || "indeterminate";

        this.modalEl?.classList.remove(
            "progressmodal-completed", "progressmodal-failed"
        );
        this.barEl?.classList.remove(
            "progressmodal-bar-success", "progressmodal-bar-error"
        );
        this.statusEl?.classList.remove(
            "progressmodal-status-success",
            "progressmodal-status-error"
        );

        if (this.closeBtnEl)
        {
            this.closeBtnEl.style.display = "none";
        }

        this.updateModeDisplay();
        this.updateProgressBar();
        this.updateStepCounter();
        this.updateFooterButtons();

        if (this.statusEl)
        {
            this.statusEl.textContent =
                this.options.statusText || "";
        }

        this.resetCancelButton();
    }

    private resetCancelButton(): void
    {
        if (this.cancelBtnEl)
        {
            this.cancelBtnEl.textContent = "Cancel";
            (this.cancelBtnEl as HTMLButtonElement).disabled = false;
        }
    }

    // ========================================================================
    // PRIVATE — AUTO-CLOSE TIMER
    // ========================================================================

    private startAutoCloseTimer(): void
    {
        const delay = this.options.autoClose || 0;
        if (delay <= 0 || this.state !== "completed")
        {
            return;
        }
        this.autoCloseTimer = setTimeout(() =>
        {
            this.close();
        }, delay);
    }

    private clearAutoCloseTimer(): void
    {
        if (this.autoCloseTimer !== null)
        {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = null;
        }
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Shows an indeterminate progress modal in a single call.
 * Returns the instance for further updates.
 */
export function showProgressModal(
    options: ProgressModalOptions
): ProgressModal
{
    const modal = new ProgressModal(options);
    modal.show();
    return modal;
}

/**
 * Shows a determinate progress modal pre-configured with step count.
 * Returns the instance for further updates.
 */
export function showSteppedProgressModal(
    title: string,
    totalSteps: number,
    options?: Partial<ProgressModalOptions>
): ProgressModal
{
    const modal = new ProgressModal({
        ...options,
        title,
        totalSteps,
        mode: "determinate",
    });
    modal.show();
    return modal;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as any)["ProgressModal"] = ProgressModal;
    (window as any)["showProgressModal"] = showProgressModal;
    (window as any)["showSteppedProgressModal"] =
        showSteppedProgressModal;
}
