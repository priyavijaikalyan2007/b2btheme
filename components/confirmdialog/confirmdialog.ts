/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: ConfirmDialog
 * PURPOSE: General-purpose confirmation modal with customizable title,
 *    message, icon, buttons, and a promise-based API. Distinct from
 *    ErrorDialog (which is error-specific with technical details).
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[ErrorDialog]]
 * FLOW: [Consumer App] -> [showConfirmDialog()] -> [Promise<boolean>]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Configuration options for the ConfirmDialog component.
 * Only `message` is required; all other fields have sensible defaults.
 */
export interface ConfirmDialogOptions
{
    /** Dialog title. Default: "Confirm". */
    title?: string;

    /** Main message text. Required. */
    message: string;

    /** Bootstrap icon class for the header icon (e.g. "bi-exclamation-triangle"). */
    icon?: string;

    /** Visual variant controlling icon/button color. Default: "default". */
    variant?: "default" | "danger" | "warning" | "info";

    /** Text for the confirm button. Default: "Confirm". */
    confirmLabel?: string;

    /** Text for the cancel button. Default: "Cancel". */
    cancelLabel?: string;

    /** Show the cancel button. Default: true. */
    showCancel?: boolean;

    /** Callback when user confirms. */
    onConfirm?: () => void;

    /** Callback when user cancels. */
    onCancel?: () => void;

    /** Close when clicking the backdrop. Default: true. */
    closeOnBackdrop?: boolean;

    /** Additional CSS class on the root. */
    cssClass?: string;

    /** Override default key combos. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[ConfirmDialog]";

/** Unique ID counter to prevent DOM collisions when multiple dialogs exist. */
let instanceCounter = 0;

/** Default keyboard bindings for dialog actions. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    cancel: "Escape",
    confirm: "Enter",
};

/** Maps variant to default Bootstrap icon class. */
const VARIANT_ICONS: Record<string, string> = {
    default: "bi-question-circle",
    danger: "bi-exclamation-triangle",
    warning: "bi-exclamation-circle",
    info: "bi-info-circle",
};

/** Maps variant to Bootstrap button class. */
const VARIANT_BTN_CLASS: Record<string, string> = {
    default: "btn-primary",
    danger: "btn-danger",
    warning: "btn-warning",
    info: "btn-info",
};

/** Maps variant to CSS icon colour class. */
const VARIANT_ICON_CLASS: Record<string, string> = {
    default: "confirmdialog-icon-default",
    danger: "confirmdialog-icon-danger",
    warning: "confirmdialog-icon-warning",
    info: "confirmdialog-icon-info",
};

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Creates an HTML element with optional classes and text content.
 * Uses textContent exclusively — never innerHTML — for security.
 */
function createElement(
    tag: string,
    classes: string[],
    text?: string): HTMLElement
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

/**
 * Sets an attribute on an element.
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/**
 * Resolves a key combo for a named action, checking user overrides first.
 */
function resolveKeyCombo(
    action: string,
    overrides?: Partial<Record<string, string>>): string
{
    return overrides?.[action] ?? DEFAULT_KEY_BINDINGS[action] ?? "";
}

/**
 * Tests whether a KeyboardEvent matches the combo string for a named action.
 * Combo format: "Modifier+Modifier+Key" (e.g. "Ctrl+Shift+Enter").
 */
function matchesKeyCombo(
    e: KeyboardEvent,
    action: string,
    overrides?: Partial<Record<string, string>>): boolean
{
    const combo = resolveKeyCombo(action, overrides);

    if (!combo)
    {
        return false;
    }

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

/**
 * Merges user-supplied options with sensible defaults.
 */
function mergeOptions(options: ConfirmDialogOptions): Required<ConfirmDialogOptions>
{
    const variant = options.variant ?? "default";

    return {
        title: options.title ?? "Confirm",
        message: options.message,
        icon: options.icon ?? VARIANT_ICONS[variant] ?? VARIANT_ICONS["default"],
        variant: variant,
        confirmLabel: options.confirmLabel ?? "Confirm",
        cancelLabel: options.cancelLabel ?? "Cancel",
        showCancel: options.showCancel ?? true,
        onConfirm: options.onConfirm ?? (() => {}),
        onCancel: options.onCancel ?? (() => {}),
        closeOnBackdrop: options.closeOnBackdrop ?? true,
        cssClass: options.cssClass ?? "",
        keyBindings: options.keyBindings ?? {},
    };
}

// ============================================================================
// DOM BUILDER FUNCTIONS
// ============================================================================

/**
 * Builds the header row: icon, title text, and close button.
 */
function buildHeader(
    id: string,
    opts: Required<ConfirmDialogOptions>): HTMLElement
{
    const header = createElement("div", ["confirmdialog-header"]);

    // Icon — split class string on spaces (e.g. "bi-question-circle" -> ["bi", "bi-question-circle"])
    const iconClasses = ["bi", ...opts.icon.split(/\s+/).filter(Boolean),
        "confirmdialog-icon", VARIANT_ICON_CLASS[opts.variant] ?? ""];
    const icon = createElement("i", iconClasses.filter(Boolean));
    header.appendChild(icon);

    // Title
    const title = createElement("h5", ["confirmdialog-title"], opts.title);
    setAttr(title, "id", `${id}-title`);
    header.appendChild(title);

    // Close button
    const closeBtn = createElement("button", ["confirmdialog-close"]);
    setAttr(closeBtn, "type", "button");
    setAttr(closeBtn, "aria-label", "Close");
    closeBtn.textContent = "\u00D7";
    header.appendChild(closeBtn);

    return header;
}

/**
 * Builds the body section containing the message paragraph.
 */
function buildBody(
    id: string,
    opts: Required<ConfirmDialogOptions>): HTMLElement
{
    const body = createElement("div", ["confirmdialog-body"]);

    const message = createElement("p", ["confirmdialog-message"], opts.message);
    setAttr(message, "id", `${id}-message`);
    body.appendChild(message);

    return body;
}

/**
 * Builds the footer with cancel and confirm buttons.
 */
function buildFooter(opts: Required<ConfirmDialogOptions>): HTMLElement
{
    const footer = createElement("div", ["confirmdialog-footer"]);

    // Cancel button (conditionally shown)
    if (opts.showCancel)
    {
        const cancelBtn = createElement(
            "button",
            ["confirmdialog-cancel", "btn", "btn-secondary"],
            opts.cancelLabel
        );
        setAttr(cancelBtn, "type", "button");
        footer.appendChild(cancelBtn);
    }

    // Confirm button
    const btnClass = VARIANT_BTN_CLASS[opts.variant] ?? VARIANT_BTN_CLASS["default"];
    const confirmBtn = createElement(
        "button",
        ["confirmdialog-confirm", "btn", btnClass],
        opts.confirmLabel
    );
    setAttr(confirmBtn, "type", "button");
    footer.appendChild(confirmBtn);

    return footer;
}

/**
 * Creates the dialog element with ARIA attributes and variant class.
 */
function buildDialogElement(
    id: string,
    opts: Required<ConfirmDialogOptions>): HTMLElement
{
    const variantClass = `confirmdialog-${opts.variant}`;
    const dialogClasses = ["confirmdialog", variantClass];

    if (opts.cssClass)
    {
        dialogClasses.push(opts.cssClass);
    }

    const dialog = createElement("div", dialogClasses);
    setAttr(dialog, "role", "alertdialog");
    setAttr(dialog, "aria-modal", "true");
    setAttr(dialog, "aria-labelledby", `${id}-title`);
    setAttr(dialog, "aria-describedby", `${id}-message`);

    return dialog;
}

/**
 * Assembles the complete dialog DOM tree and backdrop.
 */
function buildDialogDOM(
    id: string,
    opts: Required<ConfirmDialogOptions>): HTMLElement
{
    const backdrop = createElement("div", ["confirmdialog-backdrop"]);
    const dialog = buildDialogElement(id, opts);

    dialog.appendChild(buildHeader(id, opts));
    dialog.appendChild(buildBody(id, opts));
    dialog.appendChild(buildFooter(opts));

    backdrop.appendChild(dialog);

    return backdrop;
}

// ============================================================================
// FOCUS TRAP HELPERS
// ============================================================================

/**
 * Collects all focusable button elements within the dialog.
 */
function getFocusableButtons(dialogEl: HTMLElement): HTMLElement[]
{
    const buttons = dialogEl.querySelectorAll<HTMLElement>(
        "button.confirmdialog-confirm, button.confirmdialog-cancel, button.confirmdialog-close"
    );

    return Array.from(buttons);
}

/**
 * Handles Tab key to trap focus within the dialog buttons.
 */
function handleFocusTrap(e: KeyboardEvent, dialogEl: HTMLElement): void
{
    if (e.key !== "Tab")
    {
        return;
    }

    const focusable = getFocusableButtons(dialogEl);

    if (focusable.length === 0)
    {
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

// ============================================================================
// PUBLIC API: CLASS
// ============================================================================

// @entrypoint

/**
 * ConfirmDialog manages the lifecycle of a confirmation modal.
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 *
 * @example
 * const dialog = new ConfirmDialog({ message: "Delete this item?" });
 * const confirmed = await dialog.show();
 * if (confirmed) { deleteItem(); }
 */
export class ConfirmDialog
{
    private options: Required<ConfirmDialogOptions>;
    private backdropEl: HTMLElement | null = null;
    private dialogEl: HTMLElement | null = null;
    private confirmBtnEl: HTMLElement | null = null;
    private cancelBtnEl: HTMLElement | null = null;
    private resolvePromise: ((value: boolean) => void) | null = null;
    private previousFocusEl: HTMLElement | null = null;
    private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;
    private readonly instanceId: string;

    constructor(options: ConfirmDialogOptions)
    {
        if (!options.message)
        {
            console.error(LOG_PREFIX, "Message is required");
        }

        instanceCounter++;
        this.instanceId = `confirmdialog-${instanceCounter}`;
        this.options = mergeOptions(options);

        console.debug(LOG_PREFIX, "Instance created:", this.instanceId);
    }

    // ====================================================================
    // PUBLIC METHODS
    // ====================================================================

    /**
     * Show the dialog. Returns Promise<boolean>: true = confirmed, false = cancelled.
     */
    public show(): Promise<boolean>
    {
        return new Promise<boolean>((resolve) =>
        {
            this.resolvePromise = resolve;
            this.previousFocusEl = document.activeElement as HTMLElement;
            this.buildAndMount();
            this.focusConfirmButton();

            console.log(LOG_PREFIX, "Showing dialog:", this.options.title);
        });
    }

    // ====================================================================
    // PRIVATE: BUILD AND MOUNT
    // ====================================================================

    /**
     * Constructs the DOM, mounts it, and wires up all event listeners.
     */
    private buildAndMount(): void
    {
        this.backdropEl = buildDialogDOM(this.instanceId, this.options);
        this.dialogEl = this.backdropEl.querySelector(".confirmdialog") as HTMLElement;
        this.confirmBtnEl = this.backdropEl.querySelector(".confirmdialog-confirm") as HTMLElement;
        this.cancelBtnEl = this.backdropEl.querySelector(".confirmdialog-cancel") as HTMLElement;

        document.body.appendChild(this.backdropEl);

        this.bindEvents();
    }

    /**
     * Focuses the confirm button after the dialog is mounted.
     */
    private focusConfirmButton(): void
    {
        if (this.confirmBtnEl)
        {
            this.confirmBtnEl.focus();
        }
    }

    // ====================================================================
    // PRIVATE: EVENT BINDING
    // ====================================================================

    /**
     * Wires up click and keyboard event listeners.
     */
    private bindEvents(): void
    {
        this.bindButtonClicks();
        this.bindBackdropClick();
        this.bindKeyboard();
    }

    /**
     * Binds click handlers to confirm, cancel, and close buttons.
     */
    private bindButtonClicks(): void
    {
        if (this.confirmBtnEl)
        {
            this.confirmBtnEl.addEventListener("click", () =>
            {
                console.debug(LOG_PREFIX, "Confirm button clicked");
                this.resolve(true);
            });
        }

        if (this.cancelBtnEl)
        {
            this.cancelBtnEl.addEventListener("click", () =>
            {
                console.debug(LOG_PREFIX, "Cancel button clicked");
                this.resolve(false);
            });
        }

        this.bindCloseButton();
    }

    /**
     * Binds the header close ("x") button to cancel the dialog.
     */
    private bindCloseButton(): void
    {
        const closeBtn = this.backdropEl?.querySelector(".confirmdialog-close");

        if (closeBtn)
        {
            closeBtn.addEventListener("click", () =>
            {
                console.debug(LOG_PREFIX, "Close button clicked");
                this.resolve(false);
            });
        }
    }

    /**
     * Binds backdrop click to cancel when closeOnBackdrop is enabled.
     */
    private bindBackdropClick(): void
    {
        if (!this.options.closeOnBackdrop || !this.backdropEl)
        {
            return;
        }

        this.backdropEl.addEventListener("click", (e) =>
        {
            if (e.target === this.backdropEl)
            {
                console.debug(LOG_PREFIX, "Backdrop clicked — cancelling");
                this.resolve(false);
            }
        });
    }

    /**
     * Attaches a document-level keydown handler for Escape, Enter, and Tab.
     */
    private bindKeyboard(): void
    {
        this.boundKeyHandler = (e: KeyboardEvent) =>
        {
            this.handleKeydown(e);
        };

        document.addEventListener("keydown", this.boundKeyHandler);
    }

    // ====================================================================
    // PRIVATE: KEYBOARD HANDLING
    // ====================================================================

    /**
     * Routes keydown events to the appropriate handler.
     */
    private handleKeydown(e: KeyboardEvent): void
    {
        // Ctrl+C — copy dialog content (Windows native dialog behaviour)
        if (e.ctrlKey && e.key === "c" && !window.getSelection()?.toString())
        {
            this.handleDialogCopy(e);
            return;
        }

        // Escape — cancel
        if (matchesKeyCombo(e, "cancel", this.options.keyBindings))
        {
            e.preventDefault();
            console.debug(LOG_PREFIX, "Escape key — cancelling");
            this.resolve(false);
            return;
        }

        // Enter — confirm ONLY when the confirm button is focused
        if (matchesKeyCombo(e, "confirm", this.options.keyBindings))
        {
            if (document.activeElement === this.confirmBtnEl)
            {
                e.preventDefault();
                console.debug(LOG_PREFIX, "Enter key on confirm button — confirming");
                this.resolve(true);
            }

            return;
        }

        // Tab — focus trap within the dialog
        if (this.dialogEl)
        {
            handleFocusTrap(e, this.dialogEl);
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
        console.debug(LOG_PREFIX, "Dialog content copied via Ctrl+C");
    }

    /**
     * Collects title, message, and button labels for clipboard copy.
     */
    private collectCopyParts(): string[]
    {
        const parts: string[] = [];
        const opts = this.options;

        parts.push(`[Title] ${opts.title}`);
        parts.push(`[Message] ${opts.message}`);

        if (opts.showCancel)
        {
            parts.push(`[${opts.cancelLabel}] [${opts.confirmLabel}]`);
        }
        else
        {
            parts.push(`[${opts.confirmLabel}]`);
        }

        return parts;
    }

    // ====================================================================
    // PRIVATE: RESOLUTION AND TEARDOWN
    // ====================================================================

    /**
     * Resolves the promise, fires callbacks, and tears down the dialog.
     */
    private resolve(confirmed: boolean): void
    {
        if (this.resolvePromise)
        {
            this.resolvePromise(confirmed);
            this.resolvePromise = null;
        }

        if (confirmed && this.options.onConfirm)
        {
            this.options.onConfirm();
        }

        if (!confirmed && this.options.onCancel)
        {
            this.options.onCancel();
        }

        this.teardown();
        this.restoreFocus();

        console.log(LOG_PREFIX, "Dialog resolved:", confirmed ? "confirmed" : "cancelled");
    }

    /**
     * Removes the dialog DOM, detaches the keyboard handler, and clears references.
     */
    private teardown(): void
    {
        if (this.boundKeyHandler)
        {
            document.removeEventListener("keydown", this.boundKeyHandler);
            this.boundKeyHandler = null;
        }

        if (this.backdropEl)
        {
            this.backdropEl.remove();
            this.backdropEl = null;
        }

        this.dialogEl = null;
        this.confirmBtnEl = null;
        this.cancelBtnEl = null;

        console.debug(LOG_PREFIX, "Dialog torn down:", this.instanceId);
    }

    /**
     * Restores focus to the element that was active before the dialog opened.
     */
    private restoreFocus(): void
    {
        if (this.previousFocusEl && typeof this.previousFocusEl.focus === "function")
        {
            this.previousFocusEl.focus();
        }

        this.previousFocusEl = null;
    }
}

// ============================================================================
// PUBLIC API: CONVENIENCE FUNCTIONS
// ============================================================================

// @entrypoint

/**
 * Show a confirm dialog and return a promise.
 * Resolves to true if the user confirms, false if they cancel.
 *
 * @example
 * const confirmed = await showConfirmDialog({ message: "Proceed?" });
 * if (confirmed) { doAction(); }
 */
export function showConfirmDialog(options: ConfirmDialogOptions): Promise<boolean>
{
    const dialog = new ConfirmDialog(options);
    return dialog.show();
}

/**
 * Shortcut for danger/destructive confirmation dialogs.
 * Pre-configures the danger variant with a "Delete" confirm label.
 *
 * @example
 * const confirmed = await showDangerConfirmDialog("Delete this project?");
 * if (confirmed) { deleteProject(); }
 */
export function showDangerConfirmDialog(
    message: string,
    title?: string): Promise<boolean>
{
    return showConfirmDialog({
        message,
        title: title || "Are you sure?",
        variant: "danger",
        confirmLabel: "Delete",
        icon: "bi-exclamation-triangle",
    });
}

// ============================================================================
// GLOBAL EXPORTS (for <script> tag usage)
// ============================================================================

// Expose on window for consumers who load via <script> tag
if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["ConfirmDialog"] = ConfirmDialog;
    (window as unknown as Record<string, unknown>)["showConfirmDialog"] = showConfirmDialog;
    (window as unknown as Record<string, unknown>)["showDangerConfirmDialog"] = showDangerConfirmDialog;
}
