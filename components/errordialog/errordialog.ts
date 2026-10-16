/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ErrorDialog
 * 📜 PURPOSE: Renders literate error messages in a Bootstrap 5 modal dialog.
 * 🔗 RELATES: [[LiterateErrors]], [[EnterpriseTheme]]
 * ⚡ FLOW: [Consumer App] -> [showErrorDialog()] -> [Bootstrap Modal API]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// LOGGING
// ============================================================================

/** Log prefix for all console output from this component. */
const LOG_PREFIX = "[ErrorDialog]";

/** Routes through LogUtility when the host page loads it. See FRONTEND_LOGGING.md. */
const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;
// LOG-6. Read per call, never captured. A const freezes the flag at script
// evaluation, so a console toggle on a live page did nothing. The semantics
// match isGlobalFlagSet in logutility.ts: unset means "decide from the host"
// for debug and "off" for trace. See FRONTEND_LOGGING.md section 1.3.
function _dbg(): boolean
{
    const f = window.__ebt_debug_logging;
    return f === undefined ? LOCAL_HOSTS.test(location.hostname) : !!f;
}

/** Emits a structured info log. */
function logInfo(...args: unknown[]): void
{
    _lu
        ? _lu.info(...args)
        : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...args);
}

/** Emits a structured warning. */
function logWarn(...args: unknown[]): void
{
    _lu
        ? _lu.warn(...args)
        : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...args);
}

/** Emits a structured error. */
function logError(...args: unknown[]): void
{
    _lu
        ? _lu.error(...args)
        : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...args);
}

/** Emits a structured debug log. */
function logDebug(...args: unknown[]): void
{
    _lu
        ? _lu.debug(...args)
        : _dbg() && console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...args);
}

/** True when the page asks for trace output. Read on every call. LOG-6. */
function _trc(): boolean { return !!window.__ebt_trace_logging; }

/** Emits a trace log. High-frequency handlers only. */
function logTrace(...args: unknown[]): void
{
    _lu
        ? _lu.trace(...args)
        : _trc() && console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...args);
}


// ============================================================================
// INTERFACES
// ============================================================================

/**
 * A literate error object containing both user-facing and technical information.
 * See LITERATE_ERRORS.md for the full specification.
 */
export interface LiterateError
{
    /** Short, non-alarming summary for the user. */
    title: string;

    /** Full sentence explaining the situation in plain language. */
    message: string;

    /** Actionable advice the user can follow to resolve the issue. */
    suggestion?: string;

    /** Unique, searchable error code for this specific error type. */
    errorCode?: string;

    /** UUID linking this error to backend logs. */
    correlationId?: string;

    /** UTC timestamp of when the error occurred. */
    timestamp?: string;

    /** Raw technical details (stack trace, API response, etc.). */
    technicalDetail?: string;

    /** Key-value pairs of relevant system state. */
    context?: Record<string, string>;

    /** Optional retry callback. When provided, a Retry button is shown. */
    onRetry?: () => void;
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/** Unique ID counter to prevent DOM collisions when multiple dialogs exist. */
let instanceCounter = 0;

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
 * Sets an attribute only if the value is defined.
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/** Pushes key-value metadata lines from the error onto the array. */
function pushMetadataLines(lines: string[], error: LiterateError): void
{
    if (error.errorCode)       { lines.push(`Code: ${error.errorCode}`); }
    if (error.correlationId)   { lines.push(`Correlation ID: ${error.correlationId}`); }
    if (error.timestamp)       { lines.push(`Time: ${error.timestamp}`); }

    if (error.context)
    {
        for (const [key, value] of Object.entries(error.context))
        {
            lines.push(`${key}: ${value}`);
        }
    }
}

/** Formats the technical details block from error fields. */
function formatTechnicalText(error: LiterateError): string
{
    const lines: string[] = [];
    pushMetadataLines(lines, error);

    if (error.technicalDetail)
    {
        if (lines.length > 0) { lines.push(""); }
        lines.push(error.technicalDetail);
    }

    return lines.join("\n");
}

/**
 * Returns true if the error has any technical information to display.
 */
function hasTechnicalDetails(error: LiterateError): boolean
{
    return !!(error.errorCode || error.correlationId || error.timestamp
        || error.technicalDetail || error.context);
}

// ============================================================================
// MODAL HTML BUILDER
// ============================================================================

/**
 * Builds the complete modal DOM structure for an error dialog.
 * All content is set via textContent for XSS safety.
 */
function buildModalElement(id: string, error: LiterateError): HTMLElement
{
    // -- Outer modal wrapper
    const modal = createElement("div", ["modal", "fade"]);
    setAttr(modal, "id", id);
    setAttr(modal, "tabindex", "-1");
    setAttr(modal, "aria-labelledby", `${id}-title`);
    setAttr(modal, "aria-hidden", "true");

    const dialog = createElement("div", ["modal-dialog", "modal-dialog-centered"]);
    const content = createElement("div", ["modal-content", "border-0", "shadow-lg"]);

    // -- Header
    const header = buildHeader(id, error);
    content.appendChild(header);

    // -- Body
    const body = buildBody(id, error);
    content.appendChild(body);

    // -- Footer
    const footer = buildFooter(id, error);
    content.appendChild(footer);

    dialog.appendChild(content);
    modal.appendChild(dialog);

    return modal;
}

/**
 * Builds the modal header with icon and title.
 */
function buildHeader(id: string, error: LiterateError): HTMLElement
{
    const header = createElement("div", [
        "modal-header", "errordialog-header", "border-bottom-0"
    ]);

    const titleWrapper = createElement("h5", [
        "modal-title", "d-flex", "align-items-center"
    ]);
    setAttr(titleWrapper, "id", `${id}-title`);

    const icon = createElement("i", [
        "bi", "bi-exclamation-octagon-fill", "me-2"
    ]);
    titleWrapper.appendChild(icon);

    const titleText = createElement("span", [], error.title || "Error");
    titleWrapper.appendChild(titleText);

    header.appendChild(titleWrapper);

    const closeBtn = createElement("button", ["btn-close", "btn-close-white"]);
    setAttr(closeBtn, "type", "button");
    setAttr(closeBtn, "data-bs-dismiss", "modal");
    setAttr(closeBtn, "aria-label", "Close");
    header.appendChild(closeBtn);

    return header;
}

/**
 * Builds the modal body with message, suggestion, and technical details.
 */
function buildBody(id: string, error: LiterateError): HTMLElement
{
    const body = createElement("div", ["modal-body", "p-4"]);

    // User message
    const message = createElement("p", [
        "errordialog-message", "mb-3"
    ], error.message);
    body.appendChild(message);

    // Suggestion box (only if provided)
    if (error.suggestion)
    {
        const suggestionBox = buildSuggestionBox(error.suggestion);
        body.appendChild(suggestionBox);
    }

    // Technical details accordion (only if there are details)
    if (hasTechnicalDetails(error))
    {
        const accordion = buildTechnicalAccordion(id, error);
        body.appendChild(accordion);
    }

    return body;
}

/**
 * Builds the suggestion alert box.
 */
function buildSuggestionBox(suggestion: string): HTMLElement
{
    const box = createElement("div", [
        "errordialog-suggestion", "alert",
        "border", "d-flex", "align-items-start"
    ]);
    setAttr(box, "role", "alert");

    const icon = createElement("i", [
        "bi", "bi-lightbulb-fill", "text-warning", "me-2", "mt-1"
    ]);
    box.appendChild(icon);

    const textWrapper = createElement("div", []);

    const label = createElement("strong", [], "Suggestion: ");
    textWrapper.appendChild(label);

    const text = createElement("span", [], suggestion);
    textWrapper.appendChild(text);

    box.appendChild(textWrapper);

    return box;
}

/** Builds the accordion trigger button for technical details. */
function buildAccordionTrigger(collapseId: string): HTMLElement
{
    const trigger = createElement("button", [
        "accordion-button", "collapsed", "py-2", "px-0",
        "text-muted", "small"
    ]);
    setAttr(trigger, "type", "button");
    setAttr(trigger, "data-bs-toggle", "collapse");
    setAttr(trigger, "data-bs-target", `#${collapseId}`);
    setAttr(trigger, "aria-expanded", "false");
    setAttr(trigger, "aria-controls", collapseId);

    const icon = createElement("i", ["bi", "bi-code-slash", "me-2"]);
    trigger.appendChild(icon);
    trigger.appendChild(document.createTextNode(" Technical Details"));
    return trigger;
}

/** Builds the collapsible body with copy button and pre-formatted text. */
function buildAccordionBody(
    id: string, accordionId: string, collapseId: string,
    error: LiterateError
): HTMLElement
{
    const collapseDiv = createElement("div", ["accordion-collapse", "collapse"]);
    setAttr(collapseDiv, "id", collapseId);
    setAttr(collapseDiv, "data-bs-parent", `#${accordionId}`);

    const bodyDiv = createElement("div", [
        "accordion-body", "errordialog-technical-body",
        "rounded", "p-3", "mt-2", "position-relative"
    ]);

    bodyDiv.appendChild(buildCopyButton(id, error));

    const pre = createElement("pre", ["errordialog-technical", "small", "mb-0"]);
    // Canvas anchors name this region rather than counting it (ADR-162).
    pre.setAttribute("data-dui-region", "errordialog:technical");
    pre.textContent = formatTechnicalText(error);
    bodyDiv.appendChild(pre);

    collapseDiv.appendChild(bodyDiv);
    return collapseDiv;
}

/** Builds the collapsible technical details accordion. */
function buildTechnicalAccordion(id: string, error: LiterateError): HTMLElement
{
    const accordionId = `${id}-accordion`;
    const collapseId = `${id}-collapse`;

    const accordion = createElement("div", ["accordion", "accordion-flush", "mt-4"]);
    setAttr(accordion, "id", accordionId);

    const item = createElement("div", ["accordion-item", "border-0"]);
    const headerEl = createElement("h2", ["accordion-header"]);
    headerEl.appendChild(buildAccordionTrigger(collapseId));
    item.appendChild(headerEl);
    item.appendChild(buildAccordionBody(id, accordionId, collapseId, error));
    accordion.appendChild(item);

    return accordion;
}

/**
 * Builds the copy-to-clipboard button for technical details.
 */
function buildCopyButton(id: string, error: LiterateError): HTMLElement
{
    const btn = createElement("button", [
        "btn", "btn-sm", "btn-outline-secondary",
        "errordialog-copy-btn"
    ]);
    setAttr(btn, "type", "button");
    setAttr(btn, "title", "Copy to clipboard");

    const icon = createElement("i", ["bi", "bi-clipboard"]);
    btn.appendChild(icon);

    btn.addEventListener("click", () =>
    {
        copyToClipboard(formatTechnicalText(error), btn);
    });

    return btn;
}

/**
 * Copies text to the clipboard, or refuses.
 *
 * FALLBACK-6. The execCommand path this replaces never checked the boolean
 * execCommand returns, so showCopyFeedback() ran whether or not anything
 * reached the clipboard. A tick that means nothing is worse than no tick,
 * because the user walks away believing they have the text.
 */
function copyToClipboard(text: string, btn: HTMLElement): void
{
    if (!navigator.clipboard)
    {
        logError("Cannot copy, because the Clipboard API is unavailable.");

        throw new Error(
            "ErrorDialog cannot copy to the clipboard. The Clipboard API "
            + "needs a secure context, so serve the page over https or "
            + "localhost.");
    }

    navigator.clipboard.writeText(text).then(() =>
    {
        showCopyFeedback(btn);
        logDebug("Technical details copied to clipboard");
    }).catch((err) =>
    {
        logError("The clipboard write failed, so nothing was copied:", err);
        throw err;
    });
}

/**
 * Shows brief visual feedback on the copy button after a successful copy.
 */
function showCopyFeedback(btn: HTMLElement): void
{
    const icon = btn.querySelector("i");

    if (icon)
    {
        icon.classList.remove("bi-clipboard");
        icon.classList.add("bi-check-lg");

        setTimeout(() =>
        {
            icon.classList.remove("bi-check-lg");
            icon.classList.add("bi-clipboard");
        }, 1500);
    }
}

/**
 * Builds the modal footer with Close and optional Retry buttons.
 */
function buildFooter(id: string, error: LiterateError): HTMLElement
{
    const footer = createElement("div", [
        "modal-footer", "border-top-0", "pt-0"
    ]);

    const closeBtn = createElement("button", ["btn", "btn-secondary"]);
    setAttr(closeBtn, "type", "button");
    setAttr(closeBtn, "data-bs-dismiss", "modal");
    closeBtn.textContent = "Close";
    footer.appendChild(closeBtn);

    if (error.onRetry)
    {
        const retryBtn = createElement("button", ["btn", "btn-primary"]);
        setAttr(retryBtn, "type", "button");
        retryBtn.textContent = "Retry";

        const retryCallback = error.onRetry;
        retryBtn.addEventListener("click", () =>
        {
            logInfo("Retry button clicked");
            retryCallback();
        });

        footer.appendChild(retryBtn);
    }

    return footer;
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint

/**
 * ErrorDialog manages the lifecycle of a literate error modal.
 *
 * @example
 * const dialog = new ErrorDialog("app-container");
 * dialog.show({ title: "Save Failed", message: "Could not save document." });
 */
export class ErrorDialog
{
    private readonly containerId: string;
    private modalElement: HTMLElement | null = null;
    private bootstrapModal: unknown | null = null;
    private readonly instanceId: string;
    private boundCopyHandler: ((e: KeyboardEvent) => void) | null = null;
    private currentError: LiterateError | null = null;

    constructor(containerId: string)
    {
        this.containerId = containerId;
        instanceCounter++;
        this.instanceId = `errordialog-${instanceCounter}`;

        logDebug("Instance created:", this.instanceId);
    }

    /**
     * Displays an error dialog with the given literate error content.
     */
    public show(error: LiterateError): void
    {
        if (!error.title && !error.message)
        {
            logWarn("No title or message provided; dialog not shown");
            return;
        }

        const container = document.getElementById(this.containerId);
        if (!container)
        {
            logError("Container element not found:", this.containerId);
            return;
        }

        // Clean up any previous modal from this instance
        this.destroy();

        // Build and inject the modal
        this.currentError = error;
        this.modalElement = buildModalElement(this.instanceId, error);
        container.appendChild(this.modalElement);

        logInfo("Showing error dialog:", error.title);
        logDebug("Error details:", error);

        // Initialise Bootstrap Modal and show.
        //
        // THIS COMPONENT HAS NO FALLBACK WITHOUT BOOTSTRAP JS, and until
        // ANY-2 that fact was hidden by a `@ts-expect-error` on the line
        // below. Every other consumer of the global guards first and
        // degrades: Toolbar drops back to the title attribute, MarkdownEditor
        // skips its backdrop. This one threw a bare ReferenceError from
        // inside the dialog whose job is to report that something already
        // went wrong. The throw is kept, because an error dialog that
        // silently shows nothing is worse than one that fails loudly, but it
        // now says what is missing. See CODEBASE_FIXES.md DEBT-ERR-2.
        if (typeof bootstrap === "undefined" || !bootstrap.Modal)
        {
            logError("Bootstrap JS is not loaded, so the error dialog cannot open.");
            throw new Error(
                "ErrorDialog requires the Bootstrap JavaScript bundle. "
                + "Load dist/js/bootstrap.bundle.min.js before showing a dialog.");
        }

        this.bootstrapModal = new bootstrap.Modal(this.modalElement);

        // Attach Ctrl+C copy handler (mirrors Windows native dialog behaviour)
        this.bindCopyHandler();

        // Clean up DOM when modal is hidden
        this.modalElement.addEventListener("hidden.bs.modal", () =>
        {
            this.destroy();
        });

        (this.bootstrapModal as { show(): void }).show();
    }

    /**
     * Attaches a document-level keydown handler for Ctrl+C dialog copy.
     */
    private bindCopyHandler(): void
    {
        this.boundCopyHandler = (e: KeyboardEvent) =>
        {
            this.handleDialogCopy(e);
        };
        document.addEventListener("keydown", this.boundCopyHandler);
    }

    /**
     * Removes the Ctrl+C copy handler from the document.
     */
    private unbindCopyHandler(): void
    {
        if (this.boundCopyHandler)
        {
            document.removeEventListener("keydown", this.boundCopyHandler);
            this.boundCopyHandler = null;
        }
    }

    /**
     * Copies dialog content to clipboard on Ctrl+C when no text is selected.
     * Mirrors the Windows native dialog Ctrl+C behaviour.
     */
    private handleDialogCopy(e: KeyboardEvent): void
    {
        logTrace("keydown handler:", { key: e.key.length > 1 ? e.key : "(char)", ctrl: e.ctrlKey });
        if (!e.ctrlKey || e.key !== "c") { return; }
        if (window.getSelection()?.toString()) { return; }

        const parts = this.collectCopyParts();
        navigator.clipboard.writeText(parts.join("\n")).catch(() => {});
        e.preventDefault();
        logDebug("Dialog content copied via Ctrl+C");
    }

    /**
     * Collects title, message, suggestion, errorCode, and correlationId
     * into an array of formatted lines for clipboard copy.
     */
    private collectCopyParts(): string[]
    {
        const parts: string[] = [];
        const err = this.currentError;
        if (!err) { return parts; }

        if (err.title)         { parts.push(`[Title] ${err.title}`); }
        if (err.message)       { parts.push(`[Message] ${err.message}`); }
        if (err.suggestion)    { parts.push(`[Suggestion] ${err.suggestion}`); }
        if (err.errorCode)     { parts.push(`[Error Code] ${err.errorCode}`); }
        if (err.correlationId) { parts.push(`[Correlation ID] ${err.correlationId}`); }

        return parts;
    }

    /**
     * Hides the modal if it is currently visible.
     */
    public hide(): void
    {
        if (this.bootstrapModal)
        {
            (this.bootstrapModal as { hide(): void }).hide();
            logDebug("Modal hidden");
        }
    }

    /**
     * Removes the modal element from the DOM and cleans up references.
     */
    public destroy(): void
    {
        this.unbindCopyHandler();

        if (this.modalElement)
        {
            // Dispose Bootstrap modal instance
            if (this.bootstrapModal)
            {
                (this.bootstrapModal as { dispose(): void }).dispose();
                this.bootstrapModal = null;
            }

            // Remove from DOM
            this.modalElement.remove();
            this.modalElement = null;
            this.currentError = null;

            logDebug("Modal destroyed:", this.instanceId);
        }
    }
}

/**
 * Convenience function to show an error dialog in a single call.
 *
 * @param containerId - The DOM element ID where the modal will be injected
 * @param error - The literate error to display
 *
 * @example
 * showErrorDialog("app-container", {
 *     title: "Document Could Not Be Saved",
 *     message: "The server rejected the save request.",
 *     suggestion: "Please try again in a moment.",
 *     errorCode: "DOC_SAVE_FAILED",
 *     correlationId: "a1b2c3d4-e5f6-7890"
 * });
 */
export function showErrorDialog(containerId: string, error: LiterateError): void
{
    const dialog = new ErrorDialog(containerId);
    dialog.show(error);
}

// ============================================================================
// GLOBAL EXPORTS (for <script> tag usage)
// ============================================================================

// Expose on window for consumers who load via <script> tag
if (typeof window !== "undefined")
{
    window["ErrorDialog"] = ErrorDialog;
    window["showErrorDialog"] = showErrorDialog;
}
