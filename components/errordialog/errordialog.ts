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

/**
 * Formats the technical details block from error fields.
 */
function formatTechnicalText(error: LiterateError): string
{
    const lines: string[] = [];

    if (error.errorCode)
    {
        lines.push(`Code: ${error.errorCode}`);
    }

    if (error.correlationId)
    {
        lines.push(`Correlation ID: ${error.correlationId}`);
    }

    if (error.timestamp)
    {
        lines.push(`Time: ${error.timestamp}`);
    }

    if (error.context)
    {
        for (const [key, value] of Object.entries(error.context))
        {
            lines.push(`${key}: ${value}`);
        }
    }

    if (error.technicalDetail)
    {
        if (lines.length > 0)
        {
            lines.push("");
        }
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
        "errordialog-message", "text-dark", "mb-3"
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
        "errordialog-suggestion", "alert", "alert-light",
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

/**
 * Builds the collapsible technical details accordion.
 */
function buildTechnicalAccordion(id: string, error: LiterateError): HTMLElement
{
    const accordionId = `${id}-accordion`;
    const collapseId = `${id}-collapse`;

    const accordion = createElement("div", [
        "accordion", "accordion-flush", "mt-4"
    ]);
    setAttr(accordion, "id", accordionId);

    const item = createElement("div", ["accordion-item", "border-0"]);

    // Accordion header
    const headerEl = createElement("h2", ["accordion-header"]);

    const trigger = createElement("button", [
        "accordion-button", "collapsed", "py-2", "px-0",
        "text-muted", "small"
    ]);
    setAttr(trigger, "type", "button");
    setAttr(trigger, "data-bs-toggle", "collapse");
    setAttr(trigger, "data-bs-target", `#${collapseId}`);
    setAttr(trigger, "aria-expanded", "false");
    setAttr(trigger, "aria-controls", collapseId);

    const triggerIcon = createElement("i", ["bi", "bi-code-slash", "me-2"]);
    trigger.appendChild(triggerIcon);
    trigger.appendChild(document.createTextNode(" Technical Details"));

    headerEl.appendChild(trigger);
    item.appendChild(headerEl);

    // Accordion body
    const collapseDiv = createElement("div", ["accordion-collapse", "collapse"]);
    setAttr(collapseDiv, "id", collapseId);
    setAttr(collapseDiv, "data-bs-parent", `#${accordionId}`);

    const bodyDiv = createElement("div", [
        "accordion-body", "errordialog-technical-body",
        "rounded", "p-3", "mt-2", "position-relative"
    ]);

    // Copy button
    const copyBtn = buildCopyButton(id, error);
    bodyDiv.appendChild(copyBtn);

    // Technical text
    const pre = createElement("pre", [
        "errordialog-technical", "small", "text-muted", "mb-0"
    ]);
    pre.textContent = formatTechnicalText(error);
    bodyDiv.appendChild(pre);

    collapseDiv.appendChild(bodyDiv);
    item.appendChild(collapseDiv);
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
 * Copies text to the clipboard using the Clipboard API with a fallback.
 */
function copyToClipboard(text: string, btn: HTMLElement): void
{
    if (navigator.clipboard)
    {
        navigator.clipboard.writeText(text).then(() =>
        {
            showCopyFeedback(btn);
            console.debug("[ErrorDialog] Technical details copied to clipboard");
        }).catch((err) =>
        {
            console.warn("[ErrorDialog] Clipboard API failed, trying fallback:", err);
            fallbackCopy(text, btn);
        });
    }
    else
    {
        fallbackCopy(text, btn);
    }
}

/**
 * Fallback clipboard copy using a temporary textarea.
 */
function fallbackCopy(text: string, btn: HTMLElement): void
{
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try
    {
        document.execCommand("copy");
        showCopyFeedback(btn);
        console.debug("[ErrorDialog] Technical details copied (fallback)");
    }
    catch (err)
    {
        console.error("[ErrorDialog] Failed to copy to clipboard:", err);
    }
    finally
    {
        document.body.removeChild(textarea);
    }
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
            console.log("[ErrorDialog] Retry button clicked");
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

    constructor(containerId: string)
    {
        this.containerId = containerId;
        instanceCounter++;
        this.instanceId = `errordialog-${instanceCounter}`;

        console.debug("[ErrorDialog] Instance created:", this.instanceId);
    }

    /**
     * Displays an error dialog with the given literate error content.
     */
    public show(error: LiterateError): void
    {
        if (!error.title && !error.message)
        {
            console.warn("[ErrorDialog] No title or message provided; dialog not shown");
            return;
        }

        const container = document.getElementById(this.containerId);
        if (!container)
        {
            console.error("[ErrorDialog] Container element not found:", this.containerId);
            return;
        }

        // Clean up any previous modal from this instance
        this.destroy();

        // Build and inject the modal
        this.modalElement = buildModalElement(this.instanceId, error);
        container.appendChild(this.modalElement);

        console.log("[ErrorDialog] Showing error dialog:", error.title);
        console.debug("[ErrorDialog] Error details:", error);

        // Initialise Bootstrap Modal and show
        // @ts-expect-error — bootstrap is loaded globally, not as an ES module
        this.bootstrapModal = new bootstrap.Modal(this.modalElement);

        // Clean up DOM when modal is hidden
        this.modalElement.addEventListener("hidden.bs.modal", () =>
        {
            this.destroy();
        });

        (this.bootstrapModal as { show(): void }).show();
    }

    /**
     * Hides the modal if it is currently visible.
     */
    public hide(): void
    {
        if (this.bootstrapModal)
        {
            (this.bootstrapModal as { hide(): void }).hide();
            console.debug("[ErrorDialog] Modal hidden");
        }
    }

    /**
     * Removes the modal element from the DOM and cleans up references.
     */
    public destroy(): void
    {
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

            console.debug("[ErrorDialog] Modal destroyed:", this.instanceId);
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
    (window as unknown as Record<string, unknown>)["ErrorDialog"] = ErrorDialog;
    (window as unknown as Record<string, unknown>)["showErrorDialog"] = showErrorDialog;
}
