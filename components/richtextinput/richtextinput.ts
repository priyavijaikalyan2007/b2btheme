/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: RichTextInput
 * 📜 PURPOSE: Lightweight contenteditable-based rich text input composing STIE
 *             and Pill for per-row editing contexts — todo items, checklist
 *             entries, inline detail fields. Fills the gap between a plain
 *             <input> and the full MarkdownEditor.
 * 🔗 RELATES: [[SmartTextInput]], [[Pill]], [[MarkdownEditor]]
 * ⚡ FLOW: [Consumer] -> [createRichTextInput()] -> [RichTextInput instance]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[RichTextInput]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

/** Default debounce delay for onChange callback (ms). */
const CHANGE_DEBOUNCE_MS = 150;

/** Allowed HTML tags for paste sanitization. */
const PASTE_ALLOWED_TAGS = new Set([
    "STRONG", "B", "EM", "I", "S", "STRIKE", "DEL",
    "CODE", "A", "UL", "OL", "LI", "BR", "INPUT", "SPAN"
]);

/** Tags to normalize: <b> -> <strong>, <i> -> <em>, <strike>/<del> -> <s>. */
const TAG_NORMALIZE: Record<string, string> = {
    "B": "STRONG",
    "I": "EM",
    "STRIKE": "S",
    "DEL": "S"
};

/** Allowed protocols for <a> href. */
const LINK_ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];

/** Default toolbar actions when formatting is enabled. */
const DEFAULT_TOOLBAR_ACTIONS: FormattingAction[] = [
    "bold", "italic", "strikethrough", "link", "code"
];

/** Icon map for toolbar buttons. */
const ACTION_ICON_MAP: Record<FormattingAction, string> = {
    bold: "bi bi-type-bold",
    italic: "bi bi-type-italic",
    strikethrough: "bi bi-type-strikethrough",
    link: "bi bi-link-45deg",
    code: "bi bi-code",
    orderedList: "bi bi-list-ol",
    unorderedList: "bi bi-list-ul",
    taskList: "bi bi-check2-square"
};

/** Shortcut label map for toolbar button titles. */
const ACTION_SHORTCUT_MAP: Record<string, string> = {
    bold: "Ctrl+B",
    italic: "Ctrl+I",
    strikethrough: "Ctrl+D",
    link: "Ctrl+K",
    code: "Ctrl+E",
    orderedList: "Ctrl+Shift+7",
    unorderedList: "Ctrl+Shift+8",
    taskList: "Ctrl+Shift+9"
};

/** Human label map. */
const ACTION_LABEL_MAP: Record<string, string> = {
    bold: "Bold",
    italic: "Italic",
    strikethrough: "Strikethrough",
    link: "Link",
    code: "Code",
    orderedList: "Ordered List",
    unorderedList: "Unordered List",
    taskList: "Task List"
};

// ============================================================================
// TYPES
// ============================================================================

/** Formatting actions supported by the inline toolbar. */
export type FormattingAction =
    | "bold" | "italic" | "strikethrough" | "link" | "code"
    | "orderedList" | "unorderedList" | "taskList";

/** STIE-compatible trigger definition (duck-typed for decoupling). */
export interface StieCompatTriggerDefinition
{
    trigger: string;
    name: string;
    activation?: Record<string, unknown>;
    dataSource?: Record<string, unknown>;
    tokenRenderer?: Record<string, unknown>;
    tokenSerializer?: Record<string, unknown>;
    [key: string]: unknown;
}

/** Configuration for a RichTextInput instance. */
export interface RichTextInputOptions
{
    /** Initial HTML content. */
    value?: string;
    /** Placeholder text when empty. */
    placeholder?: string;
    /** Disable editing. Default false. */
    disabled?: boolean;
    /** Read-only mode. Default false. */
    readonly?: boolean;
    /** Bootstrap size variant. Default "default". */
    size?: "sm" | "default" | "lg";
    /** Additional CSS class(es) on root. */
    cssClass?: string;
    /** Plain-text character limit. 0 = unlimited. Default 0. */
    maxLength?: number;
    /** Show character counter. Default false. */
    showCounter?: boolean;
    /** CSS min-height for editable area. Default "auto". */
    minHeight?: string;
    /** CSS max-height for editable area. Default "none". */
    maxHeight?: string;
    /** Enable CSS resize: vertical. Default true. */
    resizable?: boolean;

    // Formatting
    /** Enable bold/italic/strike/link/code. Default true. */
    formatting?: boolean;
    /** Enable ordered/unordered/task lists. Default false. */
    lists?: boolean;
    /** Show floating toolbar on selection. Default true. */
    showInlineToolbar?: boolean;
    /** Actions shown in toolbar. */
    toolbarActions?: FormattingAction[];

    // STIE integration
    /** Trigger definitions passed to STIE. */
    triggers?: StieCompatTriggerDefinition[];
    /** Options passed to createSmartTextInput(). */
    stieOptions?: Record<string, unknown>;

    // Serialization
    /** getValue() format. Default "html". */
    outputFormat?: "html" | "markdown";

    // Callbacks
    /** Content changed (debounced). */
    onChange?: (value: string) => void;
    /** Editable received focus. */
    onFocus?: () => void;
    /** Editable lost focus. */
    onBlur?: () => void;
    /** Ctrl+Enter pressed. */
    onSubmit?: (value: string) => void;
    /** Enable Ctrl+Enter submit. Default false. */
    submitOnCtrlEnter?: boolean;
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
// SHARED SELECTION LISTENER — singleton across all instances
// ============================================================================

/** Set of active RichTextInput instances for selection change dispatch. */
const activeInstances: Set<RichTextInput> = new Set();

/** Whether the shared selectionchange listener is registered. */
let selectionListenerAttached = false;

/** Attach the shared document selectionchange listener (once). */
function ensureSelectionListener(): void
{
    if (selectionListenerAttached) { return; }
    selectionListenerAttached = true;
    document.addEventListener("selectionchange", handleGlobalSelectionChange);
}

/** Dispatch selectionchange to all active instances. */
function handleGlobalSelectionChange(): void
{
    for (const instance of activeInstances)
    {
        instance.handleSelectionChange();
    }
}

// ============================================================================
// RICHTEXTINPUT CLASS
// ============================================================================

/** Lightweight contenteditable rich text input with STIE composition. */
export class RichTextInput
{
    private options: RichTextInputOptions;
    private rootEl: HTMLElement | null = null;
    private editableEl: HTMLElement | null = null;
    private placeholderEl: HTMLElement | null = null;
    private counterEl: HTMLElement | null = null;
    private toolbarEl: HTMLElement | null = null;
    private toolbarBtnMap: Map<FormattingAction, HTMLElement> = new Map();
    private stieEngine: unknown = null;
    private changeTimer: ReturnType<typeof setTimeout> | null = null;
    private hasFocus = false;
    private destroyed = false;
    private boundHandlers: Array<{ el: EventTarget; event: string; fn: EventListener }> = [];

    constructor(options: RichTextInputOptions)
    {
        this.options = { ...options };
        this.buildRoot();
        this.attachListeners();
        this.initStie();

        if (this.options.value)
        {
            this.setValue(this.options.value);
        }

        this.updatePlaceholder();
        this.updateCounter();

        activeInstances.add(this);
        ensureSelectionListener();

        logInfo("Created");
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    /** Append root into a container (by ID string or element reference). */
    public show(container: string | HTMLElement): void
    {
        const target = typeof container === "string"
            ? document.getElementById(container)
            : container;

        if (!target)
        {
            logError("Container not found:", container);
            return;
        }

        target.appendChild(this.rootEl!);
    }

    /** Return root DOM element for manual insertion. */
    public getElement(): HTMLElement
    {
        return this.rootEl!;
    }

    /** Content in configured format (html or markdown). */
    public getValue(): string
    {
        if (this.options.outputFormat === "markdown")
        {
            return this.serializeToMarkdown();
        }
        return this.getHtml();
    }

    /** Always returns HTML content. */
    public getHtml(): string
    {
        return this.serializeToHtml();
    }

    /** Always returns markdown content via DOM-walk serialization. */
    public getMarkdown(): string
    {
        return this.serializeToMarkdown();
    }

    /** Stripped plain text. */
    public getPlainText(): string
    {
        return (this.editableEl?.textContent ?? "").trim();
    }

    /** Set content from HTML string. */
    public setValue(html: string): void
    {
        if (!this.editableEl) { return; }
        this.editableEl.innerHTML = this.sanitizeHtml(html);
        this.updatePlaceholder();
        this.updateCounter();
    }

    /** Toggle disabled state. */
    public setDisabled(flag: boolean): void
    {
        this.options.disabled = flag;
        this.applyStateClasses();
        if (this.editableEl)
        {
            this.editableEl.contentEditable = flag ? "false" : "true";
            if (flag) { setAttr(this.editableEl, { "aria-disabled": "true" }); }
            else { this.editableEl.removeAttribute("aria-disabled"); }
        }
    }

    /** Toggle readonly state. */
    public setReadonly(flag: boolean): void
    {
        this.options.readonly = flag;
        this.applyStateClasses();
        if (this.editableEl)
        {
            this.editableEl.contentEditable = flag ? "false" : "true";
            if (flag) { setAttr(this.editableEl, { "aria-readonly": "true" }); }
            else { this.editableEl.removeAttribute("aria-readonly"); }
        }
    }

    /** Programmatic focus. */
    public focus(): void
    {
        this.editableEl?.focus();
    }

    /** Whether content is empty or whitespace-only. */
    public isEmpty(): boolean
    {
        const text = this.editableEl?.textContent ?? "";
        return text.trim().length === 0;
    }

    /** Returns STIE engine if attached, null otherwise. */
    public getStieEngine(): unknown
    {
        return this.stieEngine;
    }

    /** Programmatic formatting. */
    public execFormat(action: FormattingAction): void
    {
        this.applyFormat(action);
    }

    /** Full cleanup — remove listeners, DOM, STIE engine. */
    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;

        activeInstances.delete(this);
        this.destroyStie();
        this.clearChangeTimer();

        for (const { el, event, fn } of this.boundHandlers)
        {
            el.removeEventListener(event, fn);
        }
        this.boundHandlers = [];
        this.toolbarBtnMap.clear();

        if (this.rootEl?.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }

        this.rootEl = null;
        this.editableEl = null;
        this.placeholderEl = null;
        this.counterEl = null;
        this.toolbarEl = null;

        logInfo("Destroyed");
    }

    // ====================================================================
    // PRIVATE: DOM BUILD
    // ====================================================================

    /** Build the entire component DOM tree. */
    private buildRoot(): void
    {
        this.rootEl = createElement("div", this.assembleRootClasses());
        this.buildEditableArea();
        this.buildPlaceholder();
        this.rootEl.appendChild(this.editableEl!);
        this.rootEl.appendChild(this.placeholderEl!);

        if (this.options.showCounter)
        {
            this.buildCounter();
            this.rootEl.appendChild(this.counterEl!);
        }

        if (this.shouldShowToolbar())
        {
            this.buildInlineToolbar();
            this.rootEl.appendChild(this.toolbarEl!);
        }
    }

    /** Assemble CSS classes for root element. */
    private assembleRootClasses(): string
    {
        const classes = ["richtextinput"];

        if (this.options.size === "sm") { classes.push("richtextinput-sm"); }
        if (this.options.size === "lg") { classes.push("richtextinput-lg"); }
        if (this.options.disabled) { classes.push("richtextinput-disabled"); }
        if (this.options.readonly) { classes.push("richtextinput-readonly"); }
        if (this.options.resizable !== false) { classes.push("richtextinput-resizable"); }
        if (this.options.cssClass) { classes.push(this.options.cssClass); }

        return classes.join(" ");
    }

    /** Build the contenteditable area. */
    private buildEditableArea(): void
    {
        this.editableEl = createElement("div", "richtextinput-editable");
        const editable = !(this.options.disabled || this.options.readonly);
        this.editableEl.contentEditable = editable ? "true" : "false";

        const ariaLabel = this.options.placeholder || "Rich text input";
        setAttr(this.editableEl, {
            "role": "textbox",
            "aria-multiline": "true",
            "aria-label": ariaLabel
        });

        if (this.options.disabled)
        {
            setAttr(this.editableEl, { "aria-disabled": "true" });
        }
        if (this.options.readonly)
        {
            setAttr(this.editableEl, { "aria-readonly": "true" });
        }

        this.applyEditableSizing();
    }

    /** Apply min-height and max-height to the editable area. */
    private applyEditableSizing(): void
    {
        if (!this.editableEl) { return; }

        if (this.options.minHeight && this.options.minHeight !== "auto")
        {
            this.editableEl.style.minHeight = this.options.minHeight;
        }
        if (this.options.maxHeight && this.options.maxHeight !== "none")
        {
            this.editableEl.style.maxHeight = this.options.maxHeight;
        }
    }

    /** Build the placeholder overlay element. */
    private buildPlaceholder(): void
    {
        this.placeholderEl = createElement("span", "richtextinput-placeholder");
        this.placeholderEl.textContent = this.options.placeholder || "";
        setAttr(this.placeholderEl, { "aria-hidden": "true" });
    }

    /** Build the character counter element. */
    private buildCounter(): void
    {
        this.counterEl = createElement("div", "richtextinput-counter");
    }

    /** Determine whether the inline toolbar should be built. */
    private shouldShowToolbar(): boolean
    {
        if (this.options.showInlineToolbar === false) { return false; }
        if (this.options.formatting === false && !this.options.lists) { return false; }
        return true;
    }

    /** Build the inline floating toolbar. */
    private buildInlineToolbar(): void
    {
        this.toolbarEl = createElement("div", "richtextinput-toolbar");
        setAttr(this.toolbarEl, {
            "role": "toolbar",
            "aria-label": "Text formatting"
        });

        const actions = this.getToolbarActions();
        let needSep = false;

        for (const action of actions)
        {
            const isListAction = action === "orderedList"
                || action === "unorderedList"
                || action === "taskList";

            if (isListAction && !needSep)
            {
                this.appendToolbarSep();
                needSep = true;
            }

            this.buildToolbarButton(action);
        }
    }

    /** Append a separator to the toolbar. */
    private appendToolbarSep(): void
    {
        const sep = createElement("div", "richtextinput-toolbar-sep");
        this.toolbarEl!.appendChild(sep);
    }

    /** Get the resolved list of toolbar actions. */
    private getToolbarActions(): FormattingAction[]
    {
        if (this.options.toolbarActions)
        {
            return this.options.toolbarActions;
        }

        const actions: FormattingAction[] = [...DEFAULT_TOOLBAR_ACTIONS];
        if (this.options.lists)
        {
            actions.push("orderedList", "unorderedList", "taskList");
        }
        return actions;
    }

    /** Build a single toolbar button and append to toolbar. */
    private buildToolbarButton(action: FormattingAction): void
    {
        const btn = createElement("button", "richtextinput-toolbar-btn") as HTMLButtonElement;
        btn.type = "button";

        const label = ACTION_LABEL_MAP[action] || action;
        const shortcut = ACTION_SHORTCUT_MAP[action] || "";
        const title = shortcut ? `${label} (${shortcut})` : label;

        setAttr(btn, {
            "aria-label": label,
            "title": title,
            "data-action": action
        });

        const icon = createElement("i", ACTION_ICON_MAP[action]);
        setAttr(icon, { "aria-hidden": "true" });
        btn.appendChild(icon);

        // mousedown + preventDefault to keep selection alive
        const handler = (e: Event): void =>
        {
            e.preventDefault();
            this.applyFormat(action);
            this.updateToolbarState();
        };

        btn.addEventListener("mousedown", handler);
        this.boundHandlers.push({ el: btn, event: "mousedown", fn: handler as EventListener });

        this.toolbarEl!.appendChild(btn);
        this.toolbarBtnMap.set(action, btn);
    }

    /** Apply disabled/readonly/resizable classes to root. */
    private applyStateClasses(): void
    {
        if (!this.rootEl) { return; }
        this.rootEl.classList.toggle("richtextinput-disabled", !!this.options.disabled);
        this.rootEl.classList.toggle("richtextinput-readonly", !!this.options.readonly);
    }

    // ====================================================================
    // PRIVATE: EVENT LISTENERS
    // ====================================================================

    /** Attach all event listeners to the editable area and document. */
    private attachListeners(): void
    {
        if (!this.editableEl) { return; }

        this.addListener(this.editableEl, "input", () => this.handleInput());
        this.addListener(this.editableEl, "keydown", (e) => this.handleKeyDown(e as KeyboardEvent));
        this.addListener(this.editableEl, "focus", () => this.handleFocus());
        this.addListener(this.editableEl, "blur", () => this.handleBlur());
        this.addListener(this.editableEl, "paste", (e) => this.handlePaste(e as ClipboardEvent));
        this.addListener(this.editableEl, "click", (e) => this.handleEditableClick(e));
    }

    /** Helper to add a listener and track it for cleanup. */
    private addListener(el: EventTarget, event: string, fn: (e: Event) => void): void
    {
        const handler = fn as EventListener;
        el.addEventListener(event, handler);
        this.boundHandlers.push({ el, event, fn: handler });
    }

    // ====================================================================
    // PRIVATE: EVENT HANDLERS
    // ====================================================================

    /** Handle input event — update placeholder, counter, emit change. */
    private handleInput(): void
    {
        this.updatePlaceholder();
        this.updateCounter();
        this.emitChange();
    }

    /** Handle keydown — shortcuts, enter normalization, submit. */
    private handleKeyDown(e: KeyboardEvent): void
    {
        const ctrl = e.ctrlKey || e.metaKey;
        const shift = e.shiftKey;

        // Formatting shortcuts (when formatting enabled)
        if (ctrl && this.options.formatting !== false)
        {
            if (this.handleFormattingShortcut(e, shift)) { return; }
        }

        // List shortcuts (when lists enabled)
        if (ctrl && shift && this.options.lists)
        {
            if (this.handleListShortcut(e)) { return; }
        }

        // Ctrl+Enter submit
        if (ctrl && e.key === "Enter" && this.options.submitOnCtrlEnter)
        {
            e.preventDefault();
            this.options.onSubmit?.(this.getValue());
            return;
        }

        // Enter normalization — insert <br> instead of <div>/<p>
        if (e.key === "Enter" && !shift && !ctrl)
        {
            this.handleEnterKey(e);
        }
    }

    /** Handle formatting keyboard shortcuts. Returns true if handled. */
    private handleFormattingShortcut(e: KeyboardEvent, _shift: boolean): boolean
    {
        const key = e.key.toLowerCase();

        if (key === "b") { e.preventDefault(); this.applyFormat("bold"); return true; }
        if (key === "i") { e.preventDefault(); this.applyFormat("italic"); return true; }
        if (key === "d") { e.preventDefault(); this.applyFormat("strikethrough"); return true; }
        if (key === "k") { e.preventDefault(); this.applyFormat("link"); return true; }
        if (key === "e") { e.preventDefault(); this.applyFormat("code"); return true; }

        return false;
    }

    /** Handle list keyboard shortcuts. Returns true if handled. */
    private handleListShortcut(e: KeyboardEvent): boolean
    {
        if (e.key === "8") { e.preventDefault(); this.applyFormat("unorderedList"); return true; }
        if (e.key === "7") { e.preventDefault(); this.applyFormat("orderedList"); return true; }
        if (e.key === "9") { e.preventDefault(); this.applyFormat("taskList"); return true; }

        return false;
    }

    /** Normalize Enter key to <br> (not <div>/<p>). Skip in list context. */
    private handleEnterKey(e: KeyboardEvent): void
    {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) { return; }

        // Allow default behaviour inside lists (creates new <li>)
        const anchor = sel.anchorNode;
        if (anchor && this.isInsideList(anchor)) { return; }

        e.preventDefault();
        const range = sel.getRangeAt(0);
        range.deleteContents();

        const br = document.createElement("br");
        range.insertNode(br);

        // Move cursor after the <br>
        range.setStartAfter(br);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        this.handleInput();
    }

    /** Check if a node is inside a list element. */
    private isInsideList(node: Node): boolean
    {
        let current: Node | null = node;
        while (current && current !== this.editableEl)
        {
            if (current.nodeName === "UL" || current.nodeName === "OL")
            {
                return true;
            }
            current = current.parentNode;
        }
        return false;
    }

    /** Handle focus event. */
    private handleFocus(): void
    {
        this.hasFocus = true;
        this.rootEl?.classList.add("richtextinput-focused");
        this.options.onFocus?.();
    }

    /** Handle blur event. */
    private handleBlur(): void
    {
        this.hasFocus = false;
        this.rootEl?.classList.remove("richtextinput-focused");
        this.hideToolbar();
        this.options.onBlur?.();
    }

    /** Handle paste — sanitize HTML from clipboard. */
    private handlePaste(e: ClipboardEvent): void
    {
        e.preventDefault();

        const html = e.clipboardData?.getData("text/html");
        const plain = e.clipboardData?.getData("text/plain") || "";

        if (html)
        {
            const clean = this.sanitizePastedHtml(html);
            this.insertHtmlAtCursor(clean);
        }
        else
        {
            this.insertTextAtCursor(plain);
        }

        this.handleInput();
    }

    /** Delegated click handler — toggles task list checkboxes. */
    private handleEditableClick(e: Event): void
    {
        const target = e.target as HTMLElement;
        if (!target || !target.classList.contains("rti-task-checkbox"))
        {
            return;
        }

        // Checkbox was clicked inside contenteditable — sync state
        const checkbox = target as HTMLInputElement;
        const li = checkbox.closest(".rti-task-item");
        if (li)
        {
            li.classList.toggle("rti-task-item-checked", checkbox.checked);
            checkbox.setAttribute("aria-checked", String(checkbox.checked));
        }
        this.handleInput();
    }

    /** Handle selectionchange — show/hide toolbar, update active states. */
    public handleSelectionChange(): void
    {
        if (!this.hasFocus || !this.toolbarEl) { return; }

        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0)
        {
            this.hideToolbar();
            return;
        }

        // Ensure selection is within our editable
        const range = sel.getRangeAt(0);
        if (!this.editableEl?.contains(range.commonAncestorContainer))
        {
            this.hideToolbar();
            return;
        }

        this.showToolbar();
        this.positionToolbar(range);
        this.updateToolbarState();
    }

    // ====================================================================
    // PRIVATE: FORMATTING
    // ====================================================================

    /** Apply a formatting action. */
    private applyFormat(action: FormattingAction): void
    {
        if (this.options.disabled || this.options.readonly) { return; }
        this.editableEl?.focus();

        switch (action)
        {
            case "bold":
                document.execCommand("bold", false);
                this.normalizeBoldTags();
                break;
            case "italic":
                document.execCommand("italic", false);
                break;
            case "strikethrough":
                document.execCommand("strikeThrough", false);
                break;
            case "link":
                this.handleFormatLink();
                break;
            case "code":
                this.handleFormatCode();
                break;
            case "orderedList":
                document.execCommand("insertOrderedList", false);
                break;
            case "unorderedList":
                document.execCommand("insertUnorderedList", false);
                break;
            case "taskList":
                this.handleInsertTaskList();
                break;
        }

        this.handleInput();
    }

    /** Normalize Firefox font-weight:bold spans to <strong>. */
    private normalizeBoldTags(): void
    {
        if (!this.editableEl) { return; }
        const spans = this.editableEl.querySelectorAll("span[style]");

        for (const span of Array.from(spans))
        {
            const style = (span as HTMLElement).style;
            if (style.fontWeight === "bold" || style.fontWeight === "700")
            {
                const strong = document.createElement("strong");
                while (span.firstChild)
                {
                    strong.appendChild(span.firstChild);
                }
                span.parentNode?.replaceChild(strong, span);
            }
        }
    }

    /** Insert or remove a link. */
    private handleFormatLink(): void
    {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) { return; }

        // Check if already inside a link
        const existingLink = this.findParentTag(sel.anchorNode, "A");
        if (existingLink)
        {
            document.execCommand("unlink", false);
            return;
        }

        const url = prompt("Enter URL:");
        if (!url) { return; }

        // Validate protocol
        if (!this.isValidLinkUrl(url)) { return; }

        document.execCommand("createLink", false, url);
    }

    /** Validate that a URL uses an allowed protocol. */
    private isValidLinkUrl(url: string): boolean
    {
        try
        {
            const parsed = new URL(url, window.location.href);
            return LINK_ALLOWED_PROTOCOLS.includes(parsed.protocol);
        }
        catch
        {
            return false;
        }
    }

    /** Toggle inline code wrapping using Range API. */
    private handleFormatCode(): void
    {
        const range = this.getSelectionRange();
        if (!range) { return; }

        // Check if already inside <code>
        const existingCode = this.findParentTag(range.commonAncestorContainer, "CODE");
        if (existingCode)
        {
            this.unwrapElement(existingCode);
            return;
        }

        if (range.collapsed) { return; }

        const code = document.createElement("code");
        try
        {
            range.surroundContents(code);
        }
        catch
        {
            // surroundContents fails on partial selections — fallback
            const fragment = range.extractContents();
            code.appendChild(fragment);
            range.insertNode(code);
        }

        // Move cursor after the <code>
        const sel = window.getSelection();
        if (sel)
        {
            const newRange = document.createRange();
            newRange.setStartAfter(code);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
    }

    /** Insert a task list at current position. */
    private handleInsertTaskList(): void
    {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) { return; }

        // Check if already inside a task list — toggle off
        const existingTask = this.findParentByClass(
            sel.anchorNode, "rti-task-list"
        );
        if (existingTask)
        {
            this.unwrapTaskList(existingTask);
            return;
        }

        const range = sel.getRangeAt(0);
        const text = range.toString() || "";

        range.deleteContents();

        const list = this.createTaskListItem(text, false);
        range.insertNode(list);

        // Focus the task text
        const textSpan = list.querySelector(".rti-task-text");
        if (textSpan)
        {
            const newRange = document.createRange();
            newRange.selectNodeContents(textSpan);
            newRange.collapse(false);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
    }

    /** Create a task list UL with one item. */
    private createTaskListItem(text: string, checked: boolean): HTMLElement
    {
        const ul = createElement("ul", "rti-task-list");
        const li = createElement("li", checked ? "rti-task-item rti-task-item-checked" : "rti-task-item");

        const checkbox = document.createElement("input") as HTMLInputElement;
        checkbox.type = "checkbox";
        checkbox.className = "rti-task-checkbox";
        checkbox.checked = checked;
        setAttr(checkbox, { "role": "checkbox", "aria-checked": String(checked) });

        // Inside contenteditable, browsers intercept checkbox clicks.
        // Use mousedown to toggle manually and prevent contenteditable capture.
        checkbox.addEventListener("mousedown", (e: Event) =>
        {
            e.stopPropagation();
        });

        checkbox.addEventListener("click", (e: Event) =>
        {
            e.stopPropagation();
            li.classList.toggle("rti-task-item-checked", checkbox.checked);
            checkbox.setAttribute("aria-checked", String(checkbox.checked));
            this.handleInput();
        });

        const textSpan = createElement("span", "rti-task-text");
        textSpan.textContent = text;

        li.appendChild(checkbox);
        li.appendChild(textSpan);
        ul.appendChild(li);

        return ul;
    }

    /** Unwrap a task list back to plain text. */
    private unwrapTaskList(listEl: HTMLElement): void
    {
        const items: string[] = [];
        const lis = listEl.querySelectorAll(".rti-task-item");
        for (const li of Array.from(lis))
        {
            const textSpan = li.querySelector(".rti-task-text");
            if (textSpan) { items.push(textSpan.textContent || ""); }
        }

        const textNode = document.createTextNode(items.join(" "));
        listEl.parentNode?.replaceChild(textNode, listEl);
    }

    /** Check if a formatting command is active. */
    private isFormatActive(command: string): boolean
    {
        try
        {
            return document.queryCommandState(command);
        }
        catch
        {
            return false;
        }
    }

    /** Find the nearest ancestor matching a tag name. */
    private findParentTag(node: Node | null, tagName: string): HTMLElement | null
    {
        let current: Node | null = node;
        while (current && current !== this.editableEl)
        {
            if (current.nodeName === tagName)
            {
                return current as HTMLElement;
            }
            current = current.parentNode;
        }
        return null;
    }

    /** Find the nearest ancestor with a given class. */
    private findParentByClass(node: Node | null, className: string): HTMLElement | null
    {
        let current: Node | null = node;
        while (current && current !== this.editableEl)
        {
            if (current instanceof HTMLElement && current.classList.contains(className))
            {
                return current;
            }
            current = current.parentNode;
        }
        return null;
    }

    /** Unwrap an element, keeping its children in place. */
    private unwrapElement(el: HTMLElement): void
    {
        const parent = el.parentNode;
        if (!parent) { return; }

        while (el.firstChild)
        {
            parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
    }

    /** Get the current Selection Range within our editable. */
    private getSelectionRange(): Range | null
    {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) { return null; }

        const range = sel.getRangeAt(0);
        if (!this.editableEl?.contains(range.commonAncestorContainer))
        {
            return null;
        }
        return range;
    }

    // ====================================================================
    // PRIVATE: INLINE TOOLBAR
    // ====================================================================

    /** Show the floating toolbar. */
    private showToolbar(): void
    {
        if (!this.toolbarEl) { return; }
        this.toolbarEl.classList.add("richtextinput-toolbar-visible");
    }

    /** Hide the floating toolbar. */
    private hideToolbar(): void
    {
        if (!this.toolbarEl) { return; }
        this.toolbarEl.classList.remove("richtextinput-toolbar-visible");
    }

    /** Position the toolbar near the selection — below if room, else above. */
    private positionToolbar(range: Range): void
    {
        if (!this.toolbarEl || !this.rootEl) { return; }

        const rangeRect = range.getBoundingClientRect();
        const rootRect = this.rootEl.getBoundingClientRect();
        const toolbarHeight = this.toolbarEl.offsetHeight || 36;
        const toolbarWidth = this.toolbarEl.offsetWidth || 180;
        const gap = 8;

        // Center toolbar horizontally on selection
        let left = rangeRect.left - rootRect.left
            + (rangeRect.width / 2) - (toolbarWidth / 2);

        // Clamp to root bounds
        left = Math.max(0, Math.min(left, rootRect.width - toolbarWidth));

        // Prefer below the selection so it doesn't cover highlighted text
        const belowTop = rangeRect.bottom - rootRect.top + gap;
        const aboveTop = rangeRect.top - rootRect.top - toolbarHeight - gap;

        // Use below unless it would overflow the viewport
        const belowViewport = rangeRect.bottom + gap + toolbarHeight;
        const useBelow = belowViewport < window.innerHeight;

        const top = useBelow ? belowTop : Math.max(0, aboveTop);

        this.toolbarEl.style.left = `${left}px`;
        this.toolbarEl.style.top = `${top}px`;
    }

    /** Update active state of toolbar buttons. */
    private updateToolbarState(): void
    {
        for (const [action, btn] of this.toolbarBtnMap)
        {
            const active = this.isActionActive(action);
            btn.classList.toggle("richtextinput-toolbar-btn-active", active);
        }
    }

    /** Check whether a formatting action is currently active. */
    private isActionActive(action: FormattingAction): boolean
    {
        switch (action)
        {
            case "bold": return this.isFormatActive("bold");
            case "italic": return this.isFormatActive("italic");
            case "strikethrough": return this.isFormatActive("strikeThrough");
            case "orderedList": return this.isFormatActive("insertOrderedList");
            case "unorderedList": return this.isFormatActive("insertUnorderedList");
            case "link":
            {
                const sel = window.getSelection();
                return !!sel?.anchorNode && !!this.findParentTag(sel.anchorNode, "A");
            }
            case "code":
            {
                const sel = window.getSelection();
                return !!sel?.anchorNode && !!this.findParentTag(sel.anchorNode, "CODE");
            }
            case "taskList":
            {
                const sel = window.getSelection();
                return !!sel?.anchorNode && !!this.findParentByClass(sel.anchorNode, "rti-task-list");
            }
        }
    }

    // ====================================================================
    // PRIVATE: STIE INTEGRATION
    // ====================================================================

    /** Initialize STIE engine if available and triggers are configured. */
    private initStie(): void
    {
        if (!this.options.triggers || this.options.triggers.length === 0) { return; }

        const win = window as unknown as Record<string, unknown>;
        const factory = win["createSmartTextInput"] as
            ((opts?: Record<string, unknown>) => unknown) | undefined;

        if (!factory)
        {
            logDebug("STIE not loaded — triggers skipped");
            return;
        }

        try
        {
            this.stieEngine = factory(this.options.stieOptions || {});
            this.registerStieTriggers();
            this.attachStieToEditable();
            logInfo("STIE attached with",
                this.options.triggers.length, "trigger(s)");
        }
        catch (err)
        {
            logError("Failed to initialize STIE:", err);
            this.stieEngine = null;
        }
    }

    /** Register configured triggers with the STIE engine. */
    private registerStieTriggers(): void
    {
        if (!this.stieEngine || !this.options.triggers) { return; }

        const engine = this.stieEngine as Record<string, unknown>;
        const register = engine["register"] as
            ((def: unknown) => void) | undefined;

        if (!register) { return; }

        for (const trigger of this.options.triggers)
        {
            register.call(engine, trigger);
        }
    }

    /** Attach STIE to the contenteditable element. */
    private attachStieToEditable(): void
    {
        if (!this.stieEngine || !this.editableEl) { return; }

        const engine = this.stieEngine as Record<string, unknown>;
        const attach = engine["attach"] as
            ((el: HTMLElement, type?: string) => void) | undefined;

        if (attach)
        {
            attach.call(engine, this.editableEl, "contenteditable");
        }
    }

    /** Destroy STIE engine. */
    private destroyStie(): void
    {
        if (!this.stieEngine) { return; }

        const engine = this.stieEngine as Record<string, unknown>;
        const destroy = engine["destroy"] as (() => void) | undefined;

        if (destroy)
        {
            destroy.call(engine);
        }
        this.stieEngine = null;
    }

    // ====================================================================
    // PRIVATE: SERIALIZATION
    // ====================================================================

    /** Serialize editable content to clean HTML. */
    private serializeToHtml(): string
    {
        if (!this.editableEl) { return ""; }

        const html = this.editableEl.innerHTML;
        // Trim trailing <br> from empty state
        if (html === "<br>" || html === "<br/>") { return ""; }
        return html;
    }

    /** Serialize editable content to markdown via DOM walk. */
    private serializeToMarkdown(): string
    {
        if (!this.editableEl) { return ""; }

        const lines: string[] = [];
        this.walkNodeToMarkdown(this.editableEl, lines, "");
        return lines.join("").trim();
    }

    /** Recursively walk DOM nodes to produce markdown. */
    private walkNodeToMarkdown(node: Node, out: string[], ctx: string): void
    {
        if (node.nodeType === Node.TEXT_NODE)
        {
            out.push(node.textContent || "");
            return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) { return; }

        const el = node as HTMLElement;
        const tag = el.tagName;

        const [prefix, suffix] = this.markdownWrappers(tag, el);
        out.push(prefix);

        for (const child of Array.from(el.childNodes))
        {
            this.walkNodeToMarkdown(child, out, ctx);
        }

        out.push(suffix);
    }

    /** Return [prefix, suffix] markdown wrappers for a tag. */
    private markdownWrappers(tag: string, el: HTMLElement): [string, string]
    {
        switch (tag)
        {
            case "STRONG": case "B": return ["**", "**"];
            case "EM": case "I": return ["*", "*"];
            case "S": case "STRIKE": case "DEL": return ["~~", "~~"];
            case "CODE": return ["`", "`"];
            case "A":
            {
                const href = el.getAttribute("href") || "";
                return ["[", `](${href})`];
            }
            case "BR": return ["\n", ""];
            case "UL": return ["", "\n"];
            case "OL": return ["", "\n"];
            case "LI":
            {
                const parent = el.parentElement;
                if (parent?.tagName === "OL")
                {
                    const idx = Array.from(parent.children).indexOf(el) + 1;
                    return [`${idx}. `, "\n"];
                }
                // Task list items get GFM checkbox syntax
                if (el.classList.contains("rti-task-item"))
                {
                    const checked = el.classList.contains("rti-task-item-checked");
                    return [checked ? "- [x] " : "- [ ] ", "\n"];
                }
                return ["- ", "\n"];
            }
            case "INPUT":
            {
                // Skip checkbox inputs — handled by LI task prefix
                return ["", ""];
            }
            case "SPAN":
            {
                // Pass through — content comes from children
                return ["", ""];
            }
            default: return ["", ""];
        }
    }

    /** Sanitize an HTML string (for setValue). */
    private sanitizeHtml(html: string): string
    {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const fragment = document.createDocumentFragment();
        this.sanitizeNodes(doc.body, fragment);

        const temp = document.createElement("div");
        temp.appendChild(fragment);
        return temp.innerHTML;
    }

    /** Sanitize pasted HTML from clipboard. */
    private sanitizePastedHtml(html: string): string
    {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const fragment = document.createDocumentFragment();
        this.sanitizeNodes(doc.body, fragment);

        const temp = document.createElement("div");
        temp.appendChild(fragment);
        return temp.innerHTML;
    }

    /** Recursively sanitize nodes — allowlist tags, strip rest. */
    private sanitizeNodes(source: Node, target: Node): void
    {
        for (const child of Array.from(source.childNodes))
        {
            if (child.nodeType === Node.TEXT_NODE)
            {
                target.appendChild(document.createTextNode(child.textContent || ""));
                continue;
            }

            if (child.nodeType !== Node.ELEMENT_NODE) { continue; }

            const el = child as HTMLElement;
            const tag = el.tagName;

            if (!PASTE_ALLOWED_TAGS.has(tag))
            {
                // Strip tag but keep children
                this.sanitizeNodes(el, target);
                continue;
            }

            // Normalize tag if needed
            const normalizedTag = TAG_NORMALIZE[tag] || tag;
            const newEl = document.createElement(normalizedTag);

            // For <a>, preserve only href
            if (normalizedTag === "A")
            {
                const href = el.getAttribute("href");
                if (href && this.isValidLinkUrl(href))
                {
                    newEl.setAttribute("href", href);
                }
            }

            this.sanitizeNodes(el, newEl);
            target.appendChild(newEl);
        }
    }

    // ====================================================================
    // PRIVATE: CURSOR / INSERT HELPERS
    // ====================================================================

    /** Insert sanitized HTML at the current cursor position. */
    private insertHtmlAtCursor(html: string): void
    {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) { return; }

        const range = sel.getRangeAt(0);
        range.deleteContents();

        const temp = document.createElement("div");
        temp.innerHTML = html;

        const fragment = document.createDocumentFragment();
        let lastNode: Node | null = null;

        while (temp.firstChild)
        {
            lastNode = temp.firstChild;
            fragment.appendChild(lastNode);
        }

        range.insertNode(fragment);

        // Move cursor to end of inserted content
        if (lastNode)
        {
            const newRange = document.createRange();
            newRange.setStartAfter(lastNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        }
    }

    /** Insert plain text at the current cursor position. */
    private insertTextAtCursor(text: string): void
    {
        document.execCommand("insertText", false, text);
    }

    // ====================================================================
    // PRIVATE: PLACEHOLDER & COUNTER
    // ====================================================================

    /** Show or hide placeholder based on content. */
    private updatePlaceholder(): void
    {
        if (!this.placeholderEl) { return; }

        const empty = this.isEmpty();
        this.placeholderEl.classList.toggle("richtextinput-placeholder-hidden", !empty);
    }

    /** Update the character counter display. */
    private updateCounter(): void
    {
        if (!this.counterEl) { return; }

        const len = this.getPlainText().length;
        const max = this.options.maxLength || 0;

        if (max > 0)
        {
            this.counterEl.textContent = `${len} / ${max}`;
            this.counterEl.classList.toggle("richtextinput-counter-over", len > max);
        }
        else
        {
            this.counterEl.textContent = String(len);
        }
    }

    // ====================================================================
    // PRIVATE: CHANGE EMISSION
    // ====================================================================

    /** Emit onChange with debounce. */
    private emitChange(): void
    {
        if (!this.options.onChange) { return; }

        this.clearChangeTimer();
        this.changeTimer = setTimeout(() =>
        {
            this.options.onChange?.(this.getValue());
        }, CHANGE_DEBOUNCE_MS);
    }

    /** Clear the pending change timer. */
    private clearChangeTimer(): void
    {
        if (this.changeTimer !== null)
        {
            clearTimeout(this.changeTimer);
            this.changeTimer = null;
        }
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/** Create a RichTextInput instance. */
export function createRichTextInput(options: RichTextInputOptions): RichTextInput
{
    return new RichTextInput(options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).RichTextInput = RichTextInput;
(window as unknown as Record<string, unknown>).createRichTextInput = createRichTextInput;
