/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Toast
 * 📜 PURPOSE: Transient non-blocking notification system with stacking,
 *             auto-dismiss, progress bar, and action support.
 * 🔗 RELATES: [[EnterpriseTheme]], [[ToastSpec]]
 * ⚡ FLOW: [showToast()] -> [ToastContainer singleton] -> [Toast DOM]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[Toast]";

/** Default auto-dismiss duration in ms. */
const DEFAULT_DURATION = 5000;

/** Default maximum visible toasts. */
const DEFAULT_MAX_VISIBLE = 5;

/** Default gap between stacked toasts in px. */
const DEFAULT_GAP = 8;

/** Default z-index for the container (ADR-032). */
const DEFAULT_Z_INDEX = 1070;

/** Animation duration in ms. */
const ANIMATION_DURATION = 200;

/** Default icons per variant. */
const VARIANT_ICONS: Record<string, string> = {
    info: "bi-info-circle-fill",
    success: "bi-check-circle-fill",
    warning: "bi-exclamation-triangle-fill",
    error: "bi-exclamation-octagon-fill"
};

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    dismissToast: "Escape",
};

/** Instance counter for unique IDs. */
let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** Configuration for a single toast notification. */
export interface ToastOptions
{
    /** Main notification text. Required. */
    message: string;
    /** Bold heading text above the message. */
    title?: string;
    /** Severity variant. Default: "info". */
    variant?: "info" | "success" | "warning" | "error";
    /** Bootstrap Icons class. Auto-set per variant if omitted. */
    icon?: string;
    /** Auto-dismiss in ms. 0 = persistent. Default: 5000. */
    duration?: number;
    /** Show the close button. Default: true. */
    dismissible?: boolean;
    /** Show the countdown progress bar. Default: true. */
    showProgress?: boolean;
    /** Action button label. */
    actionLabel?: string;
    /** Action button callback. */
    onAction?: () => void;
    /** Callback when toast is dismissed. */
    onDismiss?: () => void;
}

/** Configuration for the toast container. */
export interface ToastContainerOptions
{
    /** Screen position. Default: "top-right". */
    position?: "top-right" | "top-left" | "bottom-right"
             | "bottom-left" | "top-center" | "bottom-center";
    /** Max visible toasts. Default: 5. */
    maxVisible?: number;
    /** Gap between toasts in px. Default: 8. */
    gap?: number;
    /** CSS z-index. Default: 1070. */
    zIndex?: number;
    /** Additional CSS class(es). */
    cssClass?: string;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

/** Handle returned to the consumer for controlling a toast. */
export interface ToastHandle
{
    /** Programmatically dismiss the toast. */
    dismiss(): void;
    /** The toast's root DOM element. */
    element: HTMLElement;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Create an element with optional class name. */
function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className) { el.className = className; }
    return el;
}

/** Set multiple attributes on an element. */
function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [key, value] of Object.entries(attrs))
    {
        el.setAttribute(key, value);
    }
}

// ============================================================================
// INTERNAL TOAST STATE
// ============================================================================

interface ToastState
{
    id: string;
    options: ToastOptions;
    element: HTMLElement;
    timerId: number;
    remaining: number;
    startTime: number;
    dismissed: boolean;
    progressFill: HTMLElement | null;
}

// ============================================================================
// TOAST CONTAINER (SINGLETON)
// ============================================================================

/** Module-level singleton. */
let containerInstance: ToastContainerInstance | null = null;

class ToastContainerInstance
{
    private containerEl: HTMLElement;
    private position: string;
    private maxVisible: number;
    private gap: number;
    private containerOpts: ToastContainerOptions;

    private visible: ToastState[] = [];
    private queue: ToastState[] = [];

    constructor(options?: ToastContainerOptions)
    {
        this.containerOpts = options ?? {};
        this.position = options?.position ?? "top-right";
        this.maxVisible = options?.maxVisible ?? DEFAULT_MAX_VISIBLE;
        this.gap = options?.gap ?? DEFAULT_GAP;

        this.containerEl = this.buildContainer(options);
        document.body.appendChild(this.containerEl);
        console.log(LOG_PREFIX, "Container created at", this.position);
    }

    /** Show a toast. Returns a handle. */
    show(options: ToastOptions): ToastHandle
    {
        const state = this.createToastState(options);
        const handle: ToastHandle = {
            dismiss: () => this.dismiss(state),
            element: state.element
        };

        if (this.visible.length >= this.maxVisible)
        {
            this.queue.push(state);
        }
        else
        {
            this.addToVisible(state);
        }
        return handle;
    }

    /** Dismiss a specific toast. */
    dismiss(state: ToastState): void
    {
        if (state.dismissed) { return; }
        state.dismissed = true;
        clearTimeout(state.timerId);
        this.animateOut(state);
    }

    /** Clear all toasts and queue. */
    clearAll(): void
    {
        this.queue = [];
        const toasts = [...this.visible];
        for (const state of toasts)
        {
            this.dismiss(state);
        }
    }

    /** Update container configuration. */
    configure(options: ToastContainerOptions): void
    {
        this.containerOpts = { ...this.containerOpts, ...options };
        if (options.position)
        {
            this.position = options.position;
            this.updatePositionClass();
        }
        if (options.maxVisible !== undefined)
        {
            this.maxVisible = options.maxVisible;
        }
        if (options.gap !== undefined)
        {
            this.gap = options.gap;
            this.containerEl.style.gap = `${this.gap}px`;
        }
        if (options.zIndex !== undefined)
        {
            this.containerEl.style.zIndex = String(options.zIndex);
        }
    }

    // ====================================================================
    // PRIVATE: CONTAINER DOM
    // ====================================================================

    /** Build the container element. */
    private buildContainer(options?: ToastContainerOptions): HTMLElement
    {
        const posClass = `pvk-toast-container-${this.position}`;
        const extra = options?.cssClass ?? "";
        const el = createElement(
            "div", `pvk-toast-container ${posClass} ${extra}`.trim()
        );
        setAttr(el, {
            role: "region",
            "aria-label": "Notifications",
            "aria-live": "polite"
        });
        el.style.zIndex = String(options?.zIndex ?? DEFAULT_Z_INDEX);
        el.style.gap = `${this.gap}px`;
        return el;
    }

    /** Update position class on container. */
    private updatePositionClass(): void
    {
        const el = this.containerEl;
        const classes = el.className
            .replace(/pvk-toast-container-\S+/, "")
            .trim();
        el.className = `${classes} pvk-toast-container-${this.position}`;
    }

    // ====================================================================
    // PRIVATE: TOAST STATE
    // ====================================================================

    /** Create internal state for a toast. */
    private createToastState(options: ToastOptions): ToastState
    {
        instanceCounter++;
        const id = `pvk-toast-${instanceCounter}`;
        const element = this.buildToastElement(id, options);

        return {
            id,
            options,
            element,
            timerId: 0,
            remaining: options.duration ?? DEFAULT_DURATION,
            startTime: 0,
            dismissed: false,
            progressFill: element.querySelector(".pvk-toast-progress-fill")
        };
    }

    // ====================================================================
    // PRIVATE: TOAST DOM
    // ====================================================================

    /** Build a single toast element. */
    private buildToastElement(
        id: string, options: ToastOptions
    ): HTMLElement
    {
        const variant = options.variant ?? "info";
        const role = variant === "error" ? "alert" : "status";
        const toast = createElement("div", `pvk-toast pvk-toast-${variant}`);
        toast.id = id;
        setAttr(toast, { role });

        toast.appendChild(this.buildHeader(options, variant));
        toast.appendChild(this.buildBody(options));

        if (options.actionLabel)
        {
            toast.appendChild(this.buildAction(options, variant));
        }
        if (options.showProgress !== false && (options.duration ?? DEFAULT_DURATION) > 0)
        {
            toast.appendChild(this.buildProgressBar(options));
        }

        this.addHoverPause(toast);
        return toast;
    }

    /** Build toast header: icon + title + close. */
    private buildHeader(
        options: ToastOptions, variant: string
    ): HTMLElement
    {
        const header = createElement("div", "pvk-toast-header");
        const iconClass = options.icon ?? VARIANT_ICONS[variant];
        const icon = createElement("i", `bi ${iconClass} pvk-toast-icon`);
        setAttr(icon, { "aria-hidden": "true" });
        header.appendChild(icon);

        if (options.title)
        {
            const title = createElement("span", "pvk-toast-title");
            title.textContent = options.title;
            header.appendChild(title);
        }

        if (options.dismissible !== false)
        {
            header.appendChild(this.buildCloseButton());
        }
        return header;
    }

    /** Build close button. */
    private buildCloseButton(): HTMLElement
    {
        const btn = createElement("button", "pvk-toast-close");
        setAttr(btn, {
            type: "button",
            "aria-label": "Dismiss notification"
        });
        btn.innerHTML = '<i class="bi bi-x-lg"></i>';
        return btn;
    }

    /** Build toast body: message text. */
    private buildBody(options: ToastOptions): HTMLElement
    {
        const body = createElement("div", "pvk-toast-body");
        body.textContent = options.message;
        return body;
    }

    /** Build action button. */
    private buildAction(
        options: ToastOptions, variant: string
    ): HTMLElement
    {
        const btnClass = this.getActionBtnClass(variant);
        const btn = createElement("button", `btn btn-sm ${btnClass} pvk-toast-action`);
        setAttr(btn, { type: "button" });
        btn.textContent = options.actionLabel ?? "";
        return btn;
    }

    /** Get Bootstrap btn-outline class for variant. */
    private getActionBtnClass(variant: string): string
    {
        switch (variant)
        {
            case "success": return "btn-outline-success";
            case "warning": return "btn-outline-warning";
            case "error":   return "btn-outline-danger";
            default:        return "btn-outline-primary";
        }
    }

    /** Build progress bar. */
    private buildProgressBar(options: ToastOptions): HTMLElement
    {
        const track = createElement("div", "pvk-toast-progress");
        setAttr(track, {
            role: "progressbar",
            "aria-valuenow": "100",
            "aria-valuemin": "0",
            "aria-valuemax": "100",
            "aria-label": "Time remaining before auto-dismiss"
        });
        const fill = createElement("div", "pvk-toast-progress-fill");
        const duration = options.duration ?? DEFAULT_DURATION;
        fill.style.animationDuration = `${duration}ms`;
        track.appendChild(fill);
        return track;
    }

    // ====================================================================
    // PRIVATE: VISIBILITY & ANIMATION
    // ====================================================================

    /** Add toast to visible stack with entrance animation. */
    private addToVisible(state: ToastState): void
    {
        this.visible.push(state);
        state.element.classList.add("pvk-toast-entering");

        if (this.isBottomPosition())
        {
            this.containerEl.appendChild(state.element);
        }
        else
        {
            this.containerEl.prepend(state.element);
        }

        this.bindEvents(state);
        requestAnimationFrame(() =>
        {
            state.element.classList.remove("pvk-toast-entering");
            this.startDismissTimer(state);
        });
    }

    /** Check if position is bottom-*. */
    private isBottomPosition(): boolean
    {
        return this.position.startsWith("bottom");
    }

    /** Animate toast out and remove. */
    private animateOut(state: ToastState): void
    {
        state.element.classList.add("pvk-toast-exiting");
        setTimeout(() => this.removeToast(state), ANIMATION_DURATION);
    }

    /** Remove toast DOM and promote queued toasts. */
    private removeToast(state: ToastState): void
    {
        if (state.element.parentNode)
        {
            state.element.parentNode.removeChild(state.element);
        }
        this.visible = this.visible.filter((s) => s.id !== state.id);
        state.options.onDismiss?.();
        this.promoteQueued();
    }

    /** Promote next queued toast to visible. */
    private promoteQueued(): void
    {
        if (this.queue.length > 0 && this.visible.length < this.maxVisible)
        {
            const next = this.queue.shift()!;
            this.addToVisible(next);
        }
    }

    // ====================================================================
    // PRIVATE: TIMERS & HOVER PAUSE
    // ====================================================================

    /** Start the auto-dismiss timer. */
    private startDismissTimer(state: ToastState): void
    {
        const duration = state.remaining;
        if (duration <= 0) { return; }
        state.startTime = Date.now();
        state.timerId = window.setTimeout(
            () => this.dismiss(state),
            duration
        );
    }

    /** Pause timer on hover. */
    private pauseTimer(state: ToastState): void
    {
        if (state.timerId)
        {
            clearTimeout(state.timerId);
            state.remaining -= (Date.now() - state.startTime);
            state.element.classList.add("pvk-toast-paused");
        }
    }

    /** Resume timer on mouse leave. */
    private resumeTimer(state: ToastState): void
    {
        state.element.classList.remove("pvk-toast-paused");
        if (state.remaining > 0 && !state.dismissed)
        {
            this.startDismissTimer(state);
        }
    }

    /** Add hover pause listeners. */
    private addHoverPause(element: HTMLElement): void
    {
        element.addEventListener("mouseenter", () =>
        {
            const state = this.findState(element);
            if (state) { this.pauseTimer(state); }
        });
        element.addEventListener("mouseleave", () =>
        {
            const state = this.findState(element);
            if (state) { this.resumeTimer(state); }
        });
    }

    /** Find state by element. */
    private findState(element: HTMLElement): ToastState | undefined
    {
        return this.visible.find((s) => s.element === element);
    }

    // ====================================================================
    // PRIVATE: KEY BINDING HELPERS
    // ====================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.containerOpts.keyBindings?.[action]
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

    // ====================================================================
    // PRIVATE: EVENT BINDING
    // ====================================================================

    /** Bind close, action, and keyboard events. */
    private bindEvents(state: ToastState): void
    {
        this.bindCloseBtn(state);
        this.bindActionBtn(state);
        state.element.addEventListener("keydown", (e) =>
        {
            if (this.matchesKeyCombo(e as KeyboardEvent, "dismissToast"))
            {
                this.dismiss(state);
            }
        });
    }

    /** Bind close button click. */
    private bindCloseBtn(state: ToastState): void
    {
        const closeBtn = state.element.querySelector(".pvk-toast-close");
        if (closeBtn)
        {
            closeBtn.addEventListener("click", () => this.dismiss(state));
        }
    }

    /** Bind action button click. */
    private bindActionBtn(state: ToastState): void
    {
        const actionBtn = state.element.querySelector(".pvk-toast-action");
        if (actionBtn && state.options.onAction)
        {
            actionBtn.addEventListener("click", () =>
            {
                state.options.onAction!();
                this.dismiss(state);
            });
        }
    }
}

// ============================================================================
// CONTAINER ACCESSOR
// ============================================================================

/** Get or create the singleton container. */
function getContainer(): ToastContainerInstance
{
    if (!containerInstance)
    {
        containerInstance = new ToastContainerInstance();
    }
    return containerInstance;
}

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

/** Show a toast with full options. Returns a ToastHandle. */
export function showToast(options: ToastOptions): ToastHandle
{
    return getContainer().show(options);
}

/** Convenience: info variant. */
export function showInfoToast(
    message: string, title?: string
): ToastHandle
{
    return showToast({ message, title, variant: "info" });
}

/** Convenience: success variant. */
export function showSuccessToast(
    message: string, title?: string
): ToastHandle
{
    return showToast({ message, title, variant: "success" });
}

/** Convenience: warning variant. */
export function showWarningToast(
    message: string, title?: string
): ToastHandle
{
    return showToast({ message, title, variant: "warning" });
}

/** Convenience: error variant. */
export function showErrorToast(
    message: string, title?: string
): ToastHandle
{
    return showToast({ message, title, variant: "error" });
}

/** Dismiss all visible toasts and clear the queue. */
export function clearAllToasts(): void
{
    if (containerInstance) { containerInstance.clearAll(); }
}

/** Configure the toast container. */
export function configureToasts(options: ToastContainerOptions): void
{
    if (containerInstance)
    {
        containerInstance.configure(options);
    }
    else
    {
        containerInstance = new ToastContainerInstance(options);
    }
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as any).showToast = showToast;
(window as any).showInfoToast = showInfoToast;
(window as any).showSuccessToast = showSuccessToast;
(window as any).showWarningToast = showWarningToast;
(window as any).showErrorToast = showErrorToast;
(window as any).clearAllToasts = clearAllToasts;
(window as any).configureToasts = configureToasts;
