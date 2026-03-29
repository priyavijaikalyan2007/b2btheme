/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MaskedEntry
 * 📜 PURPOSE: A masked input for sensitive non-password data (API keys, tokens,
 *             connection strings). Provides show/hide toggle, copy-to-clipboard,
 *             and configurable masking strategy.
 * 🔗 RELATES: [[EnterpriseTheme]], [[MaskedEntrySpec]]
 * ⚡ FLOW: [Consumer App] -> [createMaskedEntry()] -> [Clipboard API]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[MaskedEntry]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }

/** Default character used for custom mask mode. */
const DEFAULT_MASK_CHAR = "\u2022";

/** Default duration in ms for copy feedback. */
const DEFAULT_COPY_FEEDBACK_MS = 2000;

/** Instance counter for unique DOM IDs. */
let instanceCounter = 0;

/** Default key bindings for keyboard actions. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    toggleReveal: "Ctrl+Shift+h",
    copyValue: "Ctrl+Shift+c",
};

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuration options for the MaskedEntry component.
 * Controls masking behaviour, button visibility, and callbacks.
 */
export interface MaskedEntryOptions
{
    /** The sensitive value to mask. */
    value?: string;

    /** Placeholder text when the input is empty. */
    placeholder?: string;

    /** Masking strategy. "native" uses type=password; "custom" uses JS replacement. */
    maskMode?: "native" | "custom";

    /** Character used for custom mask mode. */
    maskChar?: string;

    /** Whether the value is visible on construction. */
    initiallyRevealed?: boolean;

    /** Show the copy-to-clipboard button. */
    showCopyButton?: boolean;

    /** Show the reveal/conceal toggle button. */
    showToggleButton?: boolean;

    /** Duration in ms to show "Copied!" feedback. */
    copyFeedbackDuration?: number;

    /** Disable the entire control. */
    disabled?: boolean;

    /** Make the input read-only (value not editable, buttons still active). */
    readonly?: boolean;

    /** Bootstrap size variant. */
    size?: "sm" | "default" | "lg";

    /** Maximum character length for the input. */
    maxLength?: number;

    /** Optional label text rendered above the input. */
    label?: string;

    /** Additional CSS classes for the root element. */
    cssClass?: string;

    /** Fires when the user changes the value. */
    onChange?: (value: string) => void;

    /** Fires after a successful clipboard copy. */
    onCopy?: () => void;

    /** Fires when reveal state changes. */
    onReveal?: (revealed: boolean) => void;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Creates an HTML element with optional classes and text content.
 * Uses textContent exclusively for XSS safety.
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
 * Resolves options with defaults applied.
 */
function resolveOptions(options: MaskedEntryOptions): Required<
    Pick<MaskedEntryOptions,
        "value" | "placeholder" | "maskMode" | "maskChar" |
        "initiallyRevealed" | "showCopyButton" | "showToggleButton" |
        "copyFeedbackDuration" | "disabled" | "readonly" | "size" | "maxLength"
    >> & MaskedEntryOptions
{
    return {
        ...options,
        value: options.value ?? "",
        placeholder: options.placeholder ?? "",
        maskMode: options.maskMode ?? "native",
        maskChar: options.maskChar ?? DEFAULT_MASK_CHAR,
        initiallyRevealed: options.initiallyRevealed ?? false,
        showCopyButton: options.showCopyButton ?? true,
        showToggleButton: options.showToggleButton ?? true,
        copyFeedbackDuration: options.copyFeedbackDuration ?? DEFAULT_COPY_FEEDBACK_MS,
        disabled: options.disabled ?? false,
        readonly: options.readonly ?? false,
        size: options.size ?? "default",
        maxLength: options.maxLength ?? 0,
    };
}

// ============================================================================
// CLASS: MaskedEntry
// ============================================================================

/**
 * A masked input for sensitive non-password data such as API keys, tokens,
 * and connection strings. Provides a show/hide toggle, copy-to-clipboard,
 * and two masking strategies (native browser or custom character replacement).
 *
 * @example
 * const entry = new MaskedEntry({ value: "sk-abc123...", label: "API Key" });
 * entry.show("my-container");
 */
export class MaskedEntry
{
    private readonly instanceId: string;
    private options: ReturnType<typeof resolveOptions>;
    private actualValue: string;
    private revealed: boolean;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private toggleBtn: HTMLButtonElement | null = null;
    private copyBtn: HTMLButtonElement | null = null;
    private feedbackEl: HTMLElement | null = null;

    // Timer for copy feedback reset
    private copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(options: MaskedEntryOptions)
    {
        instanceCounter++;
        this.instanceId = `maskedentry-${instanceCounter}`;
        this.options = resolveOptions(options);
        this.actualValue = this.options.value;
        this.revealed = this.options.initiallyRevealed;

        this.rootEl = this.buildRoot();

        logInfo("Initialised:", this.instanceId);
        logDebug("Options:", {
            maskMode: this.options.maskMode,
            size: this.options.size,
            revealed: this.revealed
        });
    }

    // ========================================================================
    // KEY BINDING HELPERS
    // ========================================================================

    /**
     * Resolves the combo string for a named action,
     * checking user overrides first, then defaults.
     */
    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /**
     * Returns true when the keyboard event matches the
     * resolved combo for the given action name.
     */
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
    // DOM CONSTRUCTION
    // ========================================================================

    /**
     * Builds the complete DOM tree for the masked entry.
     */
    private buildRoot(): HTMLElement
    {
        const root = createElement("div", ["maskedentry"]);

        if (this.options.cssClass)
        {
            root.classList.add(...this.options.cssClass.split(" "));
        }

        // Optional label
        if (this.options.label)
        {
            const label = this.buildLabel();
            root.appendChild(label);
        }

        // Input group
        const group = this.buildInputGroup();
        root.appendChild(group);

        // Live region for screen reader announcements
        this.feedbackEl = this.buildFeedbackRegion();
        root.appendChild(this.feedbackEl);

        return root;
    }

    /**
     * Builds the label element linked to the input.
     */
    private buildLabel(): HTMLElement
    {
        const label = createElement("label", ["maskedentry-label", "form-label"]);
        setAttr(label, "for", `${this.instanceId}-input`);
        label.textContent = this.options.label ?? "";

        return label;
    }

    /**
     * Builds the Bootstrap input-group containing input and action buttons.
     */
    private buildInputGroup(): HTMLElement
    {
        const sizeClass = this.getSizeClass();
        const groupClasses = ["maskedentry-group", "input-group"];

        if (sizeClass)
        {
            groupClasses.push(sizeClass);
        }

        const group = createElement("div", groupClasses);

        // Input element
        this.inputEl = this.buildInput();
        group.appendChild(this.inputEl);

        // Toggle button
        if (this.options.showToggleButton)
        {
            this.toggleBtn = this.buildToggleButton();
            group.appendChild(this.toggleBtn);
        }

        // Copy button
        if (this.options.showCopyButton)
        {
            this.copyBtn = this.buildCopyButton();
            group.appendChild(this.copyBtn);
        }

        return group;
    }

    /**
     * Builds the input element with initial masking state.
     */
    private buildInput(): HTMLInputElement
    {
        const input = document.createElement("input");
        input.classList.add("maskedentry-input", "form-control");
        setAttr(input, "id", `${this.instanceId}-input`);
        setAttr(input, "autocomplete", "off");
        setAttr(input, "spellcheck", "false");

        if (this.options.placeholder)
        {
            setAttr(input, "placeholder", this.options.placeholder);
        }

        if (this.options.maxLength > 0)
        {
            setAttr(input, "maxlength", String(this.options.maxLength));
        }

        if (this.options.readonly)
        {
            input.readOnly = true;
        }

        if (this.options.disabled)
        {
            input.disabled = true;
        }

        // Link to label via aria-label if no visible label
        if (!this.options.label)
        {
            setAttr(input, "aria-label", "Masked value");
        }

        this.applyMaskState(input);

        // Listen for user edits
        input.addEventListener("input", () => this.handleInputChange());
        input.addEventListener("keydown", (e) => this.handleKeydown(e));

        return input;
    }

    /**
     * Builds the toggle reveal/conceal button.
     */
    private buildToggleButton(): HTMLButtonElement
    {
        const btn = document.createElement("button");
        btn.classList.add("maskedentry-toggle", "btn", "btn-outline-secondary");
        setAttr(btn, "type", "button");

        this.updateToggleAria(btn);

        const icon = createElement("i", [
            "bi",
            this.revealed ? "bi-eye-slash" : "bi-eye"
        ]);
        btn.appendChild(icon);

        btn.addEventListener("click", () => this.toggleReveal());

        if (this.options.disabled)
        {
            btn.disabled = true;
        }

        return btn;
    }

    /**
     * Builds the copy-to-clipboard button.
     */
    private buildCopyButton(): HTMLButtonElement
    {
        const btn = document.createElement("button");
        btn.classList.add("maskedentry-copy", "btn", "btn-outline-secondary");
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Copy to clipboard");

        const icon = createElement("i", ["bi", "bi-clipboard"]);
        btn.appendChild(icon);

        btn.addEventListener("click", () => this.handleCopy());

        if (this.options.disabled)
        {
            btn.disabled = true;
        }

        return btn;
    }

    /**
     * Builds the visually hidden live region for screen reader announcements.
     */
    private buildFeedbackRegion(): HTMLElement
    {
        const el = createElement("div", ["maskedentry-feedback", "visually-hidden"]);
        setAttr(el, "role", "status");
        setAttr(el, "aria-live", "polite");

        return el;
    }

    // ========================================================================
    // MASKING LOGIC
    // ========================================================================

    /**
     * Applies the current mask state to the input element.
     */
    private applyMaskState(input: HTMLInputElement): void
    {
        if (this.options.maskMode === "native")
        {
            this.applyNativeMask(input);
        }
        else
        {
            this.applyCustomMask(input);
        }
    }

    /**
     * Native mode: toggles input type between password and text.
     */
    private applyNativeMask(input: HTMLInputElement): void
    {
        input.type = this.revealed ? "text" : "password";
        input.value = this.actualValue;
    }

    /**
     * Custom mode: replaces visible characters with the mask character.
     */
    private applyCustomMask(input: HTMLInputElement): void
    {
        input.type = "text";

        if (this.revealed)
        {
            input.value = this.actualValue;
        }
        else
        {
            input.value = this.options.maskChar.repeat(this.actualValue.length);
        }
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Handles user input changes on the text field.
     */
    private handleInputChange(): void
    {
        if (!this.inputEl)
        {
            return;
        }

        // In custom mask mode when concealed, ignore direct edits
        if ((this.options.maskMode === "custom") && !this.revealed)
        {
            this.applyCustomMask(this.inputEl);
            return;
        }

        this.actualValue = this.inputEl.value;

        if (this.options.onChange)
        {
            this.options.onChange(this.actualValue);
        }

        logDebug("Value changed, length:", this.actualValue.length);
    }

    /**
     * Handles keydown events on the input for bound actions.
     */
    private handleKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "toggleReveal"))
        {
            e.preventDefault();
            this.toggleReveal();
        }
        else if (this.matchesKeyCombo(e, "copyValue"))
        {
            e.preventDefault();
            this.handleCopy();
        }
    }

    /**
     * Handles copy button click — copies actual value to clipboard.
     */
    private handleCopy(): void
    {
        if (!this.actualValue)
        {
            logDebug("Nothing to copy — value is empty");
            return;
        }

        if (navigator.clipboard)
        {
            navigator.clipboard.writeText(this.actualValue).then(() =>
            {
                this.showCopyFeedback();
                logDebug("Value copied to clipboard");
            }).catch((err) =>
            {
                logWarn("Clipboard API failed, trying fallback:", err);
                this.fallbackCopy();
            });
        }
        else
        {
            this.fallbackCopy();
        }
    }

    /**
     * Fallback clipboard copy using a temporary textarea.
     */
    private fallbackCopy(): void
    {
        const textarea = document.createElement("textarea");
        textarea.value = this.actualValue;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();

        try
        {
            document.execCommand("copy");
            this.showCopyFeedback();
            logDebug("Value copied (fallback)");
        }
        catch (err)
        {
            logError("Failed to copy to clipboard:", err);
        }
        finally
        {
            document.body.removeChild(textarea);
        }
    }

    /**
     * Shows brief visual feedback on the copy button after a successful copy.
     */
    private showCopyFeedback(): void
    {
        if (!this.copyBtn)
        {
            return;
        }

        const icon = this.copyBtn.querySelector("i");

        if (icon)
        {
            icon.classList.remove("bi-clipboard");
            icon.classList.add("bi-check-lg");
        }

        // Clear any previous timer
        if (this.copyFeedbackTimer)
        {
            clearTimeout(this.copyFeedbackTimer);
        }

        this.copyFeedbackTimer = setTimeout(() =>
        {
            if (icon)
            {
                icon.classList.remove("bi-check-lg");
                icon.classList.add("bi-clipboard");
            }
            this.copyFeedbackTimer = null;
        }, this.options.copyFeedbackDuration);

        this.announce("Copied to clipboard");

        if (this.options.onCopy)
        {
            this.options.onCopy();
        }
    }

    // ========================================================================
    // TOGGLE HELPERS
    // ========================================================================

    /**
     * Updates the toggle button ARIA attributes and label.
     */
    private updateToggleAria(btn: HTMLButtonElement): void
    {
        setAttr(btn, "aria-pressed", String(this.revealed));
        setAttr(
            btn,
            "aria-label",
            this.revealed ? "Hide value" : "Show value"
        );
    }

    /**
     * Updates the toggle button icon to match the current reveal state.
     */
    private updateToggleIcon(): void
    {
        if (!this.toggleBtn)
        {
            return;
        }

        const icon = this.toggleBtn.querySelector("i");

        if (icon)
        {
            icon.classList.remove("bi-eye", "bi-eye-slash");
            icon.classList.add(this.revealed ? "bi-eye-slash" : "bi-eye");
        }

        this.updateToggleAria(this.toggleBtn);
    }

    /**
     * Returns the Bootstrap size class for the input group, or empty string.
     */
    private getSizeClass(): string
    {
        if (this.options.size === "sm")
        {
            return "input-group-sm";
        }

        if (this.options.size === "lg")
        {
            return "input-group-lg";
        }

        return "";
    }

    /**
     * Announces a message to screen readers via the live region.
     */
    private announce(message: string): void
    {
        if (this.feedbackEl)
        {
            this.feedbackEl.textContent = message;
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    // @entrypoint

    /**
     * Appends the component into the container identified by containerId.
     */
    public show(containerId: string): void
    {
        const container = document.getElementById(containerId);

        if (!container)
        {
            logError("Container not found:", containerId);
            return;
        }

        if (this.rootEl)
        {
            container.appendChild(this.rootEl);
            logInfo("Shown in container:", containerId);
        }
    }

    /**
     * Removes the component from the DOM without destroying state.
     */
    public hide(): void
    {
        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
            logDebug("Hidden");
        }
    }

    /**
     * Hides, removes event listeners, and nulls all references.
     */
    public destroy(): void
    {
        this.hide();

        if (this.copyFeedbackTimer)
        {
            clearTimeout(this.copyFeedbackTimer);
            this.copyFeedbackTimer = null;
        }

        this.rootEl = null;
        this.inputEl = null;
        this.toggleBtn = null;
        this.copyBtn = null;
        this.feedbackEl = null;

        logInfo("Destroyed:", this.instanceId);
    }

    /**
     * Returns the current plaintext value.
     */
    public getValue(): string
    {
        return this.actualValue;
    }

    /**
     * Sets a new value and re-applies the current mask state.
     */
    public setValue(value: string): void
    {
        this.actualValue = value;

        if (this.inputEl)
        {
            this.applyMaskState(this.inputEl);
        }

        logDebug("Value set, length:", value.length);
    }

    /**
     * Returns true if the value is currently visible.
     */
    public isRevealed(): boolean
    {
        return this.revealed;
    }

    /**
     * Shows the plaintext value and updates the toggle icon.
     */
    public reveal(): void
    {
        if (this.revealed)
        {
            return;
        }

        this.revealed = true;

        if (this.inputEl)
        {
            this.applyMaskState(this.inputEl);
        }

        this.updateToggleIcon();
        this.announce("Value revealed");

        if (this.options.onReveal)
        {
            this.options.onReveal(true);
        }

        logDebug("Value revealed");
    }

    /**
     * Masks the value and updates the toggle icon.
     */
    public conceal(): void
    {
        if (!this.revealed)
        {
            return;
        }

        this.revealed = false;

        if (this.inputEl)
        {
            this.applyMaskState(this.inputEl);
        }

        this.updateToggleIcon();
        this.announce("Value hidden");

        if (this.options.onReveal)
        {
            this.options.onReveal(false);
        }

        logDebug("Value concealed");
    }

    /**
     * Toggles between revealed and concealed states.
     */
    public toggleReveal(): void
    {
        if (this.revealed)
        {
            this.conceal();
        }
        else
        {
            this.reveal();
        }
    }

    /**
     * Enables the input and buttons.
     */
    public enable(): void
    {
        this.options.disabled = false;

        if (this.inputEl)
        {
            this.inputEl.disabled = false;
        }

        if (this.toggleBtn)
        {
            this.toggleBtn.disabled = false;
        }

        if (this.copyBtn)
        {
            this.copyBtn.disabled = false;
        }

        logDebug("Enabled");
    }

    /**
     * Disables the input and buttons.
     */
    public disable(): void
    {
        this.options.disabled = true;

        if (this.inputEl)
        {
            this.inputEl.disabled = true;
        }

        if (this.toggleBtn)
        {
            this.toggleBtn.disabled = true;
        }

        if (this.copyBtn)
        {
            this.copyBtn.disabled = true;
        }

        logDebug("Disabled");
    }

    /**
     * Returns the root HTMLElement.
     */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Creates a MaskedEntry and immediately shows it in the given container.
 *
 * @param containerId - The DOM element ID to mount into
 * @param options - Configuration options for the masked entry
 * @returns The MaskedEntry instance
 *
 * @example
 * const entry = createMaskedEntry("key-container", {
 *     value: "sk-abc123def456",
 *     label: "API Key",
 *     maskMode: "native",
 *     readonly: true
 * });
 */
export function createMaskedEntry(
    containerId: string,
    options: MaskedEntryOptions): MaskedEntry
{
    const entry = new MaskedEntry(options);
    entry.show(containerId);
    return entry;
}

// ============================================================================
// GLOBAL EXPORTS (for <script> tag usage)
// ============================================================================

// Expose on window for consumers who load via <script> tag
if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["MaskedEntry"] = MaskedEntry;
    (window as unknown as Record<string, unknown>)["createMaskedEntry"] = createMaskedEntry;
}
