/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: SmartTextInput
 * PURPOSE: Behavioral middleware that attaches to text inputs and provides
 *    trigger-based inline references (@mentions, #resources, $formulas, etc.).
 *    Non-UI — host provides popover rendering and data sources.
 * RELATES: [[EnterpriseTheme]], [[SearchBox]], [[EditableComboBox]], [[Tagger]]
 * FLOW: [Text Input] -> [attach()] -> [Trigger Detection] -> [Host Popover] -> [Token Insert]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/** Adapter type describing the underlying text editing surface. */
export type InputAdapterType =
    | "plaintext"
    | "contenteditable"
    | "prosemirror"
    | "codemirror"
    | "monaco";

/** Lifecycle state of a trigger session. */
export type TriggerState = "idle" | "active" | "resolved" | "cancelled";

/** Visual rendering type for inserted tokens. */
export type TokenRenderType =
    | "pill"
    | "link"
    | "computed"
    | "inline-text"
    | "custom";

/** Contexts in which trigger detection is suppressed. */
export type SuppressContext =
    | "codeBlock"
    | "inlineCode"
    | "url"
    | "email"
    | "quotation";

/** Reason the popover was closed. */
export type PopoverCloseReason = "cancelled" | "resolved" | "blur" | "escape";

/** Events emitted by the SmartTextInput engine. */
export type StieEventName =
    | "trigger:open"
    | "trigger:query"
    | "trigger:close"
    | "token:inserted"
    | "token:removed"
    | "token:clicked"
    | "navigate"
    | "select"
    | "dismiss"
    | "content:change";

/** Unsubscribe function returned by event registration. */
export type Unsubscribe = () => void;

/** Rules governing how a trigger activates. */
export interface TriggerActivation
{
    requireWhitespaceBefore: boolean;
    minQueryLength: number;
    maxQueryLength: number;
    cancelChars: string[];
    escapeChar: string | null;
    suppressIn: SuppressContext[];
}

/** A single result from a data source query. */
export interface DataSourceResult
{
    id: string;
    label: string;
    sublabel?: string;
    icon?: string;
    type?: string;
    metadata?: Record<string, unknown>;
}

/** Data source provider for a trigger. */
export interface TriggerDataSource
{
    query?: (text: string) => Promise<DataSourceResult[]>;
    type?: string;
}

/** Controls how a token is rendered in the host surface. */
export interface TokenRenderer
{
    type: TokenRenderType;
    display: (token: ResolvedToken, context?: RenderContext) => string;
    className?: string | ((token: ResolvedToken) => string);
    href?: (token: ResolvedToken) => string;
    reactive?: boolean;
    editOnClick?: boolean;
    tooltip?: (token: ResolvedToken) => string;
    render?: (token: ResolvedToken, context?: RenderContext) => HTMLElement;
}

/** Serialization strategy for tokens in raw text. */
export interface TokenSerializer
{
    serialize: (token: ResolvedToken) => string;
    deserialize: (rawContent: string) => DeserializedToken[];
}

/** Complete definition for a trigger character and its behavior. */
export interface TriggerDefinition
{
    trigger: string;
    name: string;
    activation: TriggerActivation;
    dataSource: TriggerDataSource;
    tokenRenderer: TokenRenderer;
    tokenSerializer: TokenSerializer;
    allowedInputTypes?: InputAdapterType[];
}

/** A fully resolved token that has been inserted into the input. */
export interface ResolvedToken
{
    instanceId: string;
    triggerName: string;
    id: string;
    label: string;
    sublabel?: string;
    icon?: string;
    metadata: Record<string, unknown>;
    sourceRange: { start: number; end: number };
}

/** A token found during deserialization of raw content. */
export interface DeserializedToken
{
    rawMatch: string;
    startIndex: number;
    endIndex: number;
    token: Partial<ResolvedToken>;
    needsEnrichment: boolean;
}

/** Context provided to token renderers. */
export interface RenderContext
{
    adapterType: InputAdapterType;
    element: HTMLElement;
}

/** Cursor position as a character offset. */
export interface CursorPosition
{
    offset: number;
}

/** Screen-space coordinates for popover positioning. */
export interface CursorCoordinates
{
    top: number;
    left: number;
    height: number;
}

/** Suppression contexts active at the current cursor position. */
export interface CursorContext
{
    contexts: SuppressContext[];
}

/** Contract for text-surface adapters. */
export interface InputAdapter
{
    type: InputAdapterType;
    onKeyDown(handler: (event: KeyboardEvent) => void): Unsubscribe;
    onInput(handler: () => void): Unsubscribe;
    onBlur(handler: () => void): Unsubscribe;
    getCursorPosition(): CursorPosition;
    getTextInRange(start: number, end: number): string;
    getTextBeforeCursor(charCount: number): string;
    getCursorCoordinates(): CursorCoordinates;
    replaceRange(start: number, end: number, replacement: string): void;
    insertToken(token: ResolvedToken, renderer: TokenRenderer, serializer?: TokenSerializer): void;
    removeToken(tokenId: string): void;
    getSerializedContent(): string;
    setSerializedContent(content: string, serializers: TokenSerializer[]): void;
    getPlainTextContent(): string;
    getCursorContext(): CursorContext;
    focus(): void;
    destroy(): void;
}

/** Payload for the trigger:open event. */
export interface TriggerOpenEvent
{
    triggerName: string;
    triggerDef: TriggerDefinition;
    queryText: string;
    position: CursorCoordinates;
}

/** Payload for the trigger:query event. */
export interface TriggerQueryEvent
{
    triggerName: string;
    queryText: string;
    position: CursorCoordinates;
}

/** Payload for the trigger:close event. */
export interface TriggerCloseEvent
{
    triggerName: string;
    reason: PopoverCloseReason;
}

/** Internal state of an active trigger session. */
export interface TriggerSession
{
    triggerDef: TriggerDefinition;
    triggerStart: number;
    queryText: string;
    state: TriggerState;
}

/** Configuration options for the SmartTextInput engine. */
export interface SmartTextInputOptions
{
    queryDebounceMs?: number;
    delegateKeyboard?: boolean;
    atomicTokenDeletion?: boolean;
    showTriggerCharInToken?: boolean;
    onTriggerOpen?: (event: TriggerOpenEvent) => void;
    onTriggerQuery?: (event: TriggerQueryEvent) => void;
    onTriggerClose?: (event: TriggerCloseEvent) => void;
    onTokenInserted?: (token: ResolvedToken) => void;
    onTokenRemoved?: (token: ResolvedToken) => void;
    onTokenClicked?: (token: ResolvedToken) => void;
    onNavigate?: (direction: "up" | "down") => void;
    onSelect?: () => void;
    onDismiss?: () => void;
    onContentChange?: (content: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[SmartTextInput]";
const CLS = "stie";
const DEFAULT_DEBOUNCE_MS = 150;
const DEFAULT_BLUR_DELAY_MS = 150;
const DEFAULT_MAX_QUERY_LENGTH = 50;
const ZERO_WIDTH_SPACE = "\u200B";

/** Auto-incrementing counter for unique instance IDs. */
let instanceCounter = 0;

/** Default keyboard bindings for popover navigation. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    navigateUp: "ArrowUp",
    navigateDown: "ArrowDown",
    confirmSelection: "Enter",
    cancelSession: "Escape",
};

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and text content.
 *
 * @param tag - HTML tag name
 * @param cls - Space-separated CSS classes
 * @param text - Optional text content
 * @returns The created element
 */
function createElement(tag: string, cls: string, text?: string): HTMLElement
{
    const el = document.createElement(tag);

    if (cls)
    {
        el.className = cls;
    }

    if (text)
    {
        el.textContent = text;
    }

    return el;
}

/**
 * Sets multiple attributes on an element.
 *
 * @param el - Target element
 * @param attrs - Attribute key-value pairs
 */
function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

/**
 * Safely invokes an optional callback, catching and logging errors.
 *
 * @param fn - Optional callback
 * @param args - Arguments to pass to the callback
 */
function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }

    try
    {
        fn(...args);
    }
    catch (err)
    {
        console.error(LOG_PREFIX, "Callback error:", err);
    }
}

/**
 * Returns a debounced wrapper that delays invocation of `fn`.
 *
 * @param fn - Function to debounce
 * @param ms - Delay in milliseconds
 * @returns Debounced function
 */
function debounce(fn: (q: string) => void, ms: number): (q: string) => void
{
    let timer = 0;

    return (q: string): void =>
    {
        if (timer) { clearTimeout(timer); }
        timer = window.setTimeout(() => { timer = 0; fn(q); }, ms);
    };
}

/**
 * Generates a unique instance identifier.
 *
 * @returns Unique string in the form `stie-N`
 */
function generateId(): string
{
    instanceCounter += 1;
    return `${CLS}-${instanceCounter}`;
}

/**
 * Tests whether a character is whitespace.
 *
 * @param char - Single character to test
 * @returns True if whitespace
 */
function isWhitespace(char: string): boolean
{
    return (char === " " || char === "\t" || char === "\n" || char === "\r");
}

/**
 * Resolves the CSS class for a token using its renderer configuration.
 *
 * @param renderer - The token renderer
 * @param token - The resolved token
 * @returns CSS class string
 */
function resolveTokenClass(renderer: TokenRenderer, token: ResolvedToken): string
{
    if (!renderer.className)
    {
        return `${CLS}-token`;
    }

    if (typeof renderer.className === "function")
    {
        return renderer.className(token);
    }

    return renderer.className;
}

// ============================================================================
// PLAIN TEXT ADAPTER
// ============================================================================

/**
 * Adapter for standard `<input>` and `<textarea>` elements.
 * Tokens are stored as serialized syntax directly in the element value.
 */
class PlainTextAdapter implements InputAdapter
{
    public readonly type: InputAdapterType = "plaintext";
    private element: HTMLInputElement | HTMLTextAreaElement;
    private unsubs: Unsubscribe[] = [];

    constructor(element: HTMLElement)
    {
        this.element = element as HTMLInputElement | HTMLTextAreaElement;
    }

    // -- Event wiring --------------------------------------------------------

    public onKeyDown(handler: (event: KeyboardEvent) => void): Unsubscribe
    {
        const wrapped = (e: Event): void => { handler(e as KeyboardEvent); };
        this.element.addEventListener("keydown", wrapped);
        const unsub = (): void => { this.element.removeEventListener("keydown", wrapped); };
        this.unsubs.push(unsub);
        return unsub;
    }

    public onInput(handler: () => void): Unsubscribe
    {
        this.element.addEventListener("input", handler);
        const unsub = (): void => { this.element.removeEventListener("input", handler); };
        this.unsubs.push(unsub);
        return unsub;
    }

    public onBlur(handler: () => void): Unsubscribe
    {
        this.element.addEventListener("blur", handler);
        const unsub = (): void => { this.element.removeEventListener("blur", handler); };
        this.unsubs.push(unsub);
        return unsub;
    }

    // -- Cursor queries ------------------------------------------------------

    public getCursorPosition(): CursorPosition
    {
        return { offset: this.element.selectionStart || 0 };
    }

    public getTextBeforeCursor(charCount: number): string
    {
        const pos = this.element.selectionStart || 0;
        const start = Math.max(0, pos - charCount);
        return this.element.value.slice(start, pos);
    }

    public getTextInRange(start: number, end: number): string
    {
        return this.element.value.slice(start, end);
    }

    // -- Mirror-based cursor coordinate calculation --------------------------

    public getCursorCoordinates(): CursorCoordinates
    {
        const mirror = this.buildMirrorDiv();
        const coords = this.measureMirrorCoords(mirror);
        mirror.remove();
        return coords;
    }

    // -> Delegates to: buildMirrorDiv, measureMirrorCoords

    /** Creates a hidden mirror div matching the element's styles. */
    private buildMirrorDiv(): HTMLDivElement
    {
        const mirror = document.createElement("div");
        const style = window.getComputedStyle(this.element);

        this.applyMirrorStyles(mirror, style);
        this.populateMirrorContent(mirror);

        document.body.appendChild(mirror);
        return mirror;
    }

    /** Copies computed styles from the element onto the mirror div. */
    private applyMirrorStyles(
        mirror: HTMLDivElement, style: CSSStyleDeclaration
    ): void
    {
        mirror.style.position = "absolute";
        mirror.style.visibility = "hidden";
        mirror.style.whiteSpace = "pre-wrap";
        mirror.style.wordWrap = "break-word";
        mirror.style.overflow = "hidden";
        mirror.style.font = style.font;
        mirror.style.padding = style.padding;
        mirror.style.border = style.border;
        mirror.style.width = style.width;
        mirror.style.lineHeight = style.lineHeight;
        mirror.style.letterSpacing = style.letterSpacing;
    }

    /** Fills the mirror with text up to cursor and a marker span. */
    private populateMirrorContent(mirror: HTMLDivElement): void
    {
        const pos = this.element.selectionStart || 0;
        const textBefore = this.element.value.slice(0, pos);
        const textNode = document.createTextNode(textBefore);
        const marker = document.createElement("span");

        marker.textContent = "|";
        mirror.appendChild(textNode);
        mirror.appendChild(marker);
    }

    /** Reads coordinates from the marker span relative to the element. */
    private measureMirrorCoords(mirror: HTMLDivElement): CursorCoordinates
    {
        const marker = mirror.querySelector("span");
        if (!marker)
        {
            return { top: 0, left: 0, height: 0 };
        }

        const elemRect = this.element.getBoundingClientRect();
        const markerRect = marker.getBoundingClientRect();

        return {
            top: elemRect.top + (markerRect.top - mirror.getBoundingClientRect().top),
            left: elemRect.left + (markerRect.left - mirror.getBoundingClientRect().left),
            height: markerRect.height || 16,
        };
    }

    // -- Text mutation -------------------------------------------------------

    public replaceRange(start: number, end: number, replacement: string): void
    {
        const val = this.element.value;
        this.element.value = val.slice(0, start) + replacement + val.slice(end);
        const newPos = start + replacement.length;
        this.element.setSelectionRange(newPos, newPos);
    }

    /**
     * Inserts a token by writing its serialized syntax into the textarea.
     * The host can call getSerializedContent() to retrieve the raw form.
     */
    public insertToken(
        token: ResolvedToken,
        renderer: TokenRenderer,
        _serializer?: TokenSerializer
    ): void
    {
        const displayText = renderer.display(token) + " ";
        this.replaceRange(token.sourceRange.start, token.sourceRange.end, displayText);

        const newEnd = token.sourceRange.start + displayText.length;
        token.sourceRange = { start: token.sourceRange.start, end: newEnd };
    }

    public removeToken(_tokenId: string): void
    {
        // In plaintext mode tokens are inline text; no DOM element to remove.
        // The engine's token map is the source of truth.
        console.debug(LOG_PREFIX, "removeToken is a no-op for plaintext adapter");
    }

    // -- Content serialization -----------------------------------------------

    public getSerializedContent(): string
    {
        return this.element.value;
    }

    public setSerializedContent(content: string, _serializers: TokenSerializer[]): void
    {
        this.element.value = content;
    }

    public getPlainTextContent(): string
    {
        return this.element.value;
    }

    // -- Cursor context detection --------------------------------------------

    public getCursorContext(): CursorContext
    {
        const pos = this.element.selectionStart || 0;
        const text = this.element.value;
        const contexts = detectSuppressContexts(text, pos);
        return { contexts };
    }

    // -- Lifecycle -----------------------------------------------------------

    public focus(): void
    {
        this.element.focus();
    }

    public destroy(): void
    {
        for (const unsub of this.unsubs)
        {
            unsub();
        }

        this.unsubs = [];
    }
}

// ============================================================================
// CONTENT EDITABLE ADAPTER
// ============================================================================

/**
 * Adapter for contenteditable elements.
 * Tokens are inserted as non-editable spans within the DOM.
 */
class ContentEditableAdapter implements InputAdapter
{
    public readonly type: InputAdapterType = "contenteditable";
    private element: HTMLElement;
    private unsubs: Unsubscribe[] = [];
    private tokens: Map<string, ResolvedToken> = new Map();
    private tokenSerializers: Map<string, TokenSerializer> = new Map();

    constructor(element: HTMLElement)
    {
        this.element = element;
    }

    // -- Event wiring --------------------------------------------------------

    public onKeyDown(handler: (event: KeyboardEvent) => void): Unsubscribe
    {
        const wrapped = (e: Event): void => { handler(e as KeyboardEvent); };
        this.element.addEventListener("keydown", wrapped);
        const unsub = (): void => { this.element.removeEventListener("keydown", wrapped); };
        this.unsubs.push(unsub);
        return unsub;
    }

    public onInput(handler: () => void): Unsubscribe
    {
        this.element.addEventListener("input", handler);
        const unsub = (): void => { this.element.removeEventListener("input", handler); };
        this.unsubs.push(unsub);
        return unsub;
    }

    public onBlur(handler: () => void): Unsubscribe
    {
        this.element.addEventListener("blur", handler);
        const unsub = (): void => { this.element.removeEventListener("blur", handler); };
        this.unsubs.push(unsub);
        return unsub;
    }

    // -- Cursor queries ------------------------------------------------------

    public getCursorPosition(): CursorPosition
    {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0)
        {
            return { offset: 0 };
        }

        return { offset: this.calcLinearOffset(sel) };
    }

    /** Computes a linear character offset by walking DOM text nodes. */
    private calcLinearOffset(sel: Selection): number
    {
        const anchorNode = sel.anchorNode;
        const anchorOff = sel.anchorOffset;

        if (!anchorNode)
        {
            return 0;
        }

        return this.walkOffsetTo(this.element, anchorNode, anchorOff);
    }

    /** Walks child nodes summing text lengths until the anchor is reached. */
    private walkOffsetTo(
        root: Node, target: Node, targetOffset: number
    ): number
    {
        let offset = 0;

        for (const child of Array.from(root.childNodes))
        {
            if (child === target || child.contains(target))
            {
                return offset + this.resolveNodeOffset(child, target, targetOffset);
            }

            offset += (child.textContent || "").length;
        }

        return offset;
    }

    /** Resolves offset within a single node relative to the target. */
    private resolveNodeOffset(
        node: Node, target: Node, targetOffset: number
    ): number
    {
        if (node === target)
        {
            return (node.nodeType === Node.TEXT_NODE) ? targetOffset : 0;
        }

        return this.walkOffsetTo(node, target, targetOffset);
    }

    public getTextBeforeCursor(charCount: number): string
    {
        const pos = this.getCursorPosition().offset;
        const fullText = this.element.textContent || "";
        const start = Math.max(0, pos - charCount);
        return fullText.slice(start, pos);
    }

    public getTextInRange(start: number, end: number): string
    {
        const fullText = this.element.textContent || "";
        return fullText.slice(start, end);
    }

    // -- Cursor coordinates --------------------------------------------------

    public getCursorCoordinates(): CursorCoordinates
    {
        const sel = window.getSelection();

        if (!sel || sel.rangeCount === 0)
        {
            return { top: 0, left: 0, height: 0 };
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        return {
            top: rect.top,
            left: rect.left,
            height: rect.height || 16,
        };
    }

    // -- Text mutation -------------------------------------------------------

    public replaceRange(start: number, end: number, replacement: string): void
    {
        const result = this.findTextNodeAtOffset(this.element, start);

        if (!result)
        {
            return;
        }

        this.performRangeReplace(result.node, result.offset, start, end, replacement);
    }

    /** Finds the text node and local offset for a given linear offset. */
    private findTextNodeAtOffset(
        root: Node, target: number
    ): { node: Text; offset: number } | null
    {
        let running = 0;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let current = walker.nextNode();

        while (current)
        {
            const len = (current.textContent || "").length;

            if (running + len >= target)
            {
                return { node: current as Text, offset: target - running };
            }

            running += len;
            current = walker.nextNode();
        }

        return null;
    }

    /** Performs the actual DOM range replacement. */
    private performRangeReplace(
        startNode: Text,
        localOffset: number,
        _globalStart: number,
        globalEnd: number,
        replacement: string
    ): void
    {
        const endResult = this.findTextNodeAtOffset(this.element, globalEnd);

        if (!endResult)
        {
            return;
        }

        const range = document.createRange();
        range.setStart(startNode, localOffset);
        range.setEnd(endResult.node, endResult.offset);
        range.deleteContents();
        range.insertNode(document.createTextNode(replacement));

        this.moveCursorAfter(range);
    }

    /** Places the cursor immediately after the given range. */
    private moveCursorAfter(range: Range): void
    {
        range.collapse(false);
        const sel = window.getSelection();

        if (sel)
        {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    // -- Token insertion -----------------------------------------------------

    public insertToken(
        token: ResolvedToken,
        renderer: TokenRenderer,
        serializer?: TokenSerializer
    ): void
    {
        this.deleteRangeForToken(token);
        const tokenEl = this.buildTokenElement(token, renderer);
        this.insertTokenElement(tokenEl);
        this.tokens.set(token.instanceId, token);

        if (serializer)
        {
            this.tokenSerializers.set(token.triggerName, serializer);
        }
    }

    /** Deletes the trigger text range before inserting the token element. */
    private deleteRangeForToken(token: ResolvedToken): void
    {
        const startResult = this.findTextNodeAtOffset(
            this.element, token.sourceRange.start
        );
        const endResult = this.findTextNodeAtOffset(
            this.element, token.sourceRange.end
        );

        if (!startResult || !endResult) { return; }

        const range = document.createRange();
        range.setStart(startResult.node, startResult.offset);
        range.setEnd(endResult.node, endResult.offset);
        range.deleteContents();
    }

    /** Builds the non-editable span (or anchor) for a token. */
    private buildTokenElement(
        token: ResolvedToken, renderer: TokenRenderer
    ): HTMLElement
    {
        const isLink = (renderer.type === "link" && renderer.href);
        const tag = isLink ? "a" : "span";
        const el = createElement(tag, `${CLS}-token ${resolveTokenClass(renderer, token)}`);

        setAttr(el, {
            "contenteditable": "false",
            "data-stie-token-id": token.instanceId,
            "data-stie-trigger": token.triggerName,
            "data-stie-entity-id": token.id,
        });

        el.textContent = renderer.display(token);

        if (isLink && renderer.href)
        {
            (el as HTMLAnchorElement).href = renderer.href(token);
        }

        return el;
    }

    /** Inserts the token element at the current selection point. */
    private insertTokenElement(tokenEl: HTMLElement): void
    {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) { return; }

        const range = sel.getRangeAt(0);
        range.insertNode(tokenEl);

        const spacer = document.createTextNode(ZERO_WIDTH_SPACE);
        tokenEl.after(spacer);

        this.setCursorAfterNode(spacer);
    }

    /** Positions the cursor after the given node. */
    private setCursorAfterNode(node: Node): void
    {
        const range = document.createRange();
        range.setStartAfter(node);
        range.collapse(true);

        const sel = window.getSelection();
        if (sel)
        {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    // -- Token removal -------------------------------------------------------

    public removeToken(tokenId: string): void
    {
        const el = this.element.querySelector(
            `[data-stie-token-id="${tokenId}"]`
        );

        if (el) { el.remove(); }

        this.tokens.delete(tokenId);
    }

    // -- Content serialization -----------------------------------------------

    public getSerializedContent(): string
    {
        return this.walkSerialize(this.element);
    }

    /** Recursively serializes DOM nodes to text, preserving token structure. */
    private walkSerialize(node: Node): string
    {
        if (node.nodeType === Node.TEXT_NODE)
        {
            return node.textContent || "";
        }

        if (this.isTokenElement(node as HTMLElement))
        {
            return this.serializeTokenNode(node as HTMLElement);
        }

        return this.serializeChildNodes(node);
    }

    /** Checks whether an element is a STIE token span. */
    private isTokenElement(el: HTMLElement): boolean
    {
        return (
            el.nodeType === Node.ELEMENT_NODE &&
            el.hasAttribute("data-stie-token-id")
        );
    }

    /** Serializes a token element using its stored serializer or display text. */
    private serializeTokenNode(el: HTMLElement): string
    {
        const instanceId = el.getAttribute("data-stie-token-id") || "";
        const token = this.tokens.get(instanceId);

        if (!token)
        {
            console.debug(LOG_PREFIX, "Token not found for serialization:", instanceId);
            return el.textContent || "";
        }

        const triggerName = token.triggerName;
        const serializer = this.tokenSerializers.get(triggerName);

        if (serializer)
        {
            return serializer.serialize(token);
        }

        console.debug(LOG_PREFIX, "No serializer for trigger:", triggerName);
        return el.textContent || "";
    }

    /** Concatenates serialized content from all child nodes. */
    private serializeChildNodes(node: Node): string
    {
        let result = "";

        for (const child of Array.from(node.childNodes))
        {
            result += this.walkSerialize(child);
        }

        return result;
    }

    public setSerializedContent(
        content: string, _serializers: TokenSerializer[]
    ): void
    {
        this.element.textContent = "";
        this.tokens.clear();

        const textNode = document.createTextNode(content);
        this.element.appendChild(textNode);
    }

    public getPlainTextContent(): string
    {
        return this.element.textContent || "";
    }

    // -- Cursor context detection --------------------------------------------

    public getCursorContext(): CursorContext
    {
        const sel = window.getSelection();
        const contexts: SuppressContext[] = [];

        if (!sel || sel.rangeCount === 0)
        {
            return { contexts };
        }

        this.detectAncestorContexts(sel.anchorNode, contexts);
        return { contexts };
    }

    /** Walks ancestor elements to detect suppress contexts. */
    private detectAncestorContexts(
        node: Node | null, contexts: SuppressContext[]
    ): void
    {
        let current = node;

        while (current && current !== this.element)
        {
            if (current.nodeType === Node.ELEMENT_NODE)
            {
                this.checkElementContext(current as HTMLElement, contexts);
            }

            current = current.parentNode;
        }
    }

    /** Checks a single element for suppress-context indicators. */
    private checkElementContext(
        el: HTMLElement, contexts: SuppressContext[]
    ): void
    {
        const tag = el.tagName.toLowerCase();

        if (tag === "code") { contexts.push("inlineCode"); }
        if (tag === "pre") { contexts.push("codeBlock"); }
        if (tag === "a") { contexts.push("url"); }
        if (tag === "blockquote") { contexts.push("quotation"); }
    }

    // -- Lifecycle -----------------------------------------------------------

    public focus(): void
    {
        this.element.focus();
    }

    public destroy(): void
    {
        for (const unsub of this.unsubs)
        {
            unsub();
        }

        this.unsubs = [];
        this.tokens.clear();
        this.tokenSerializers.clear();
    }
}

// ============================================================================
// SUPPRESS CONTEXT DETECTION (shared helper)
// ============================================================================

/**
 * Detects suppress contexts in plain text by scanning for patterns.
 *
 * @param text - Full text content
 * @param pos - Cursor position
 * @returns Array of active suppress contexts
 */
function detectSuppressContexts(text: string, pos: number): SuppressContext[]
{
    const contexts: SuppressContext[] = [];

    if (isInsidePattern(text, pos, "```", "```")) { contexts.push("codeBlock"); }
    if (isInsideSingleBackticks(text, pos)) { contexts.push("inlineCode"); }
    if (isInsideUrlPattern(text, pos)) { contexts.push("url"); }

    return contexts;
}

/** Tests whether the cursor is between a pair of delimiters. */
function isInsidePattern(
    text: string, pos: number, open: string, close: string
): boolean
{
    const before = text.slice(0, pos);
    const openCount = countOccurrences(before, open);

    if (openCount === 0) { return false; }

    const after = text.slice(pos);
    const closeIdx = after.indexOf(close);

    return (openCount % 2 === 1) && (closeIdx >= 0);
}

/** Tests whether the cursor sits inside single backtick delimiters. */
function isInsideSingleBackticks(text: string, pos: number): boolean
{
    const before = text.slice(0, pos);
    const singleTicks = countOccurrences(before, "`") - (countOccurrences(before, "```") * 3);
    return singleTicks % 2 === 1;
}

/** Tests whether the cursor sits inside a URL-like pattern. */
function isInsideUrlPattern(text: string, pos: number): boolean
{
    const before = text.slice(0, pos);
    const urlStart = before.lastIndexOf("http");

    if (urlStart < 0) { return false; }

    const afterUrl = text.slice(urlStart);
    const spaceIdx = afterUrl.search(/\s/);

    return (spaceIdx < 0) || (urlStart + spaceIdx > pos);
}

/** Counts non-overlapping occurrences of a substring. */
function countOccurrences(text: string, sub: string): number
{
    let count = 0;
    let idx = 0;

    while (true)
    {
        idx = text.indexOf(sub, idx);
        if (idx < 0) { break; }
        count += 1;
        idx += sub.length;
    }

    return count;
}

// ============================================================================
// SMART TEXT INPUT ENGINE
// ============================================================================

/**
 * Main engine class that orchestrates trigger detection, token management,
 * and adapter coordination. This is the public API surface.
 */
export class SmartTextInputEngine
{
    private opts: SmartTextInputOptions;
    private triggers: Map<string, TriggerDefinition> = new Map();
    private adapter: InputAdapter | null = null;
    private targetElement: HTMLElement | null = null;
    private tokens: Map<string, ResolvedToken> = new Map();
    private listeners: Map<string, Set<Function>> = new Map();

    // Trigger session state
    private session: TriggerSession | null = null;
    private multiCharBuffer: string = "";
    private multiCharTimer: number = 0;

    // Timers
    private debouncedQuery: ((q: string) => void) | null = null;
    private blurTimer: number = 0;

    // Adapter unsubs
    private adapterUnsubs: Unsubscribe[] = [];

    // ARIA
    private liveRegionEl: HTMLElement | null = null;

    // Destroyed flag
    private destroyed: boolean = false;

    // Unique identifier
    private instanceId: string;

    constructor(options?: SmartTextInputOptions)
    {
        this.instanceId = generateId();
        this.opts = options || {};
        this.initDebounce();
        console.debug(LOG_PREFIX, "Created:", this.instanceId);
    }

    /** Initializes the debounced query emitter from options. */
    private initDebounce(): void
    {
        const ms = this.opts.queryDebounceMs ?? DEFAULT_DEBOUNCE_MS;
        this.debouncedQuery = debounce((q: string) => { this.emitQueryEvent(q); }, ms);
    }

    // ========================================================================
    // PUBLIC API — Attachment
    // ========================================================================

    // @entrypoint

    /**
     * Attaches the engine to a DOM element, auto-detecting adapter type.
     *
     * @param element - The target input, textarea, or contenteditable element
     * @param adapterType - Optional explicit adapter type override
     */
    public attach(element: HTMLElement, adapterType?: InputAdapterType): void
    {
        if (this.destroyed)
        {
            console.warn(LOG_PREFIX, "Cannot attach — engine is destroyed");
            return;
        }

        if (!this.validateElement(element)) { return; }

        const type = adapterType || this.detectAdapterType(element);
        this.targetElement = element;
        this.adapter = this.createAdapter(element, type);
        this.liveRegionEl = this.buildLiveRegion();
        this.wireAdapterEvents();

        console.debug(LOG_PREFIX, "Attached to", type, "element");
    }

    /** Creates the appropriate adapter instance for the detected type. */
    private createAdapter(
        element: HTMLElement, type: InputAdapterType
    ): InputAdapter
    {
        if (type === "contenteditable")
        {
            return new ContentEditableAdapter(element);
        }

        return new PlainTextAdapter(element);
    }

    /** Wires adapter events to engine handlers and stores unsubscribe fns. */
    private wireAdapterEvents(): void
    {
        if (!this.adapter) { return; }

        const a = this.adapter;

        this.adapterUnsubs.push(a.onKeyDown((e) => { this.handleKeyDown(e); }));
        this.adapterUnsubs.push(a.onInput(() => { this.handleInput(); }));
        this.adapterUnsubs.push(a.onBlur(() => { this.handleBlur(); }));
    }

    // ========================================================================
    // PUBLIC API — Detach / Destroy
    // ========================================================================

    /** Detaches the engine from the current element, cleaning up resources. */
    public detach(): void
    {
        for (const unsub of this.adapterUnsubs) { unsub(); }
        this.adapterUnsubs = [];

        if (this.adapter) { this.adapter.destroy(); }
        this.adapter = null;
        this.targetElement = null;

        this.removeLiveRegion();
        this.clearSession();
        this.clearTimers();

        console.debug(LOG_PREFIX, "Detached");
    }

    /** Permanently destroys the engine, releasing all resources. */
    public destroy(): void
    {
        this.detach();
        this.triggers.clear();
        this.tokens.clear();
        this.listeners.clear();
        this.destroyed = true;

        console.debug(LOG_PREFIX, "Destroyed:", this.instanceId);
    }

    // ========================================================================
    // PUBLIC API — Trigger Registration
    // ========================================================================

    /**
     * Registers a trigger definition with the engine.
     *
     * @param trigger - The trigger definition to register
     */
    public register(trigger: TriggerDefinition): void
    {
        if (!trigger.trigger || !trigger.name)
        {
            console.error(LOG_PREFIX, "Invalid trigger definition:", trigger);
            return;
        }

        this.triggers.set(trigger.name, trigger);
        console.debug(LOG_PREFIX, "Registered trigger:", trigger.name, `(${trigger.trigger})`);
    }

    /**
     * Removes a trigger definition by name.
     *
     * @param triggerName - Name of the trigger to remove
     */
    public unregister(triggerName: string): void
    {
        this.triggers.delete(triggerName);
        console.debug(LOG_PREFIX, "Unregistered trigger:", triggerName);
    }

    /** Returns all registered trigger definitions. */
    public getTriggers(): TriggerDefinition[]
    {
        return Array.from(this.triggers.values());
    }

    // ========================================================================
    // PUBLIC API — Token Resolution
    // ========================================================================

    /**
     * Resolves the active trigger session with a selected data source item.
     * Inserts the token into the input and closes the trigger session.
     *
     * @param item - The selected data source result
     */
    public resolve(item: DataSourceResult): void
    {
        if (!this.session || !this.adapter)
        {
            console.warn(LOG_PREFIX, "resolve() called with no active session");
            return;
        }

        const token = this.buildResolvedToken(item);
        this.insertAndStoreToken(token);
        this.closeSessionResolved(token);
    }

    /** Constructs a ResolvedToken from the active session and selected item. */
    private buildResolvedToken(item: DataSourceResult): ResolvedToken
    {
        const session = this.session!;
        const triggerLen = session.triggerDef.trigger.length;
        const cursorPos = this.adapter!.getCursorPosition().offset;

        return {
            instanceId: generateId(),
            triggerName: session.triggerDef.name,
            id: item.id,
            label: item.label,
            sublabel: item.sublabel,
            icon: item.icon,
            metadata: item.metadata || {},
            sourceRange: { start: session.triggerStart, end: cursorPos },
        };
    }

    /** Inserts the token via adapter and stores in the engine map. */
    private insertAndStoreToken(token: ResolvedToken): void
    {
        const triggerDef = this.session!.triggerDef;
        this.adapter!.insertToken(
            token,
            triggerDef.tokenRenderer,
            triggerDef.tokenSerializer
        );
        this.tokens.set(token.instanceId, token);
    }

    /** Closes the session as resolved and emits relevant events. */
    private closeSessionResolved(token: ResolvedToken): void
    {
        const triggerName = this.session!.triggerDef.name;
        this.clearSession();

        this.emitEvent("trigger:close", { triggerName, reason: "resolved" });
        this.emitEvent("token:inserted", token);

        safeCallback(this.opts.onTokenInserted, token);
        this.announce(`Inserted ${token.label}`);
    }

    // ========================================================================
    // PUBLIC API — Cancel
    // ========================================================================

    /** Cancels the active trigger session. */
    public cancel(): void
    {
        if (!this.session) { return; }

        this.cancelTriggerSession("cancelled");
    }

    // ========================================================================
    // PUBLIC API — Token Management
    // ========================================================================

    /** Returns all tokens currently stored in the engine. */
    public getTokens(): ResolvedToken[]
    {
        return Array.from(this.tokens.values());
    }

    /** Returns tokens filtered by trigger name. */
    public getTokensByType(triggerName: string): ResolvedToken[]
    {
        return Array.from(this.tokens.values()).filter(
            (t) => t.triggerName === triggerName
        );
    }

    /**
     * Removes a token by instance ID.
     *
     * @param instanceId - The unique instance ID of the token
     */
    public removeToken(instanceId: string): void
    {
        const token = this.tokens.get(instanceId);
        if (!token) { return; }

        if (this.adapter) { this.adapter.removeToken(instanceId); }

        this.tokens.delete(instanceId);
        this.emitEvent("token:removed", token);
        safeCallback(this.opts.onTokenRemoved, token);
    }

    /**
     * Replaces a token's data while keeping its position.
     *
     * @param instanceId - The unique instance ID of the token to replace
     * @param newToken - Partial token data to merge
     */
    public replaceToken(
        instanceId: string, newToken: Partial<ResolvedToken>
    ): void
    {
        const existing = this.tokens.get(instanceId);
        if (!existing) { return; }

        const merged = { ...existing, ...newToken, instanceId };
        this.tokens.set(instanceId, merged);
    }

    // ========================================================================
    // PUBLIC API — Content Access
    // ========================================================================

    /** Returns the serialized content from the adapter. */
    public getSerializedContent(): string
    {
        return this.adapter ? this.adapter.getSerializedContent() : "";
    }

    /** Sets content on the adapter, running through registered serializers. */
    public setSerializedContent(content: string): void
    {
        if (!this.adapter) { return; }

        const serializers = this.collectSerializers();
        this.adapter.setSerializedContent(content, serializers);
    }

    /** Returns plain text content from the adapter. */
    public getPlainTextContent(): string
    {
        return this.adapter ? this.adapter.getPlainTextContent() : "";
    }

    /** Gathers all serializers from registered triggers. */
    private collectSerializers(): TokenSerializer[]
    {
        return Array.from(this.triggers.values()).map(
            (t) => t.tokenSerializer
        );
    }

    // ========================================================================
    // PUBLIC API — Event System
    // ========================================================================

    /**
     * Subscribes to an engine event.
     *
     * @param event - Event name
     * @param handler - Handler function
     * @returns Unsubscribe function
     */
    public on(event: StieEventName, handler: Function): Unsubscribe
    {
        if (!this.listeners.has(event))
        {
            this.listeners.set(event, new Set());
        }

        this.listeners.get(event)!.add(handler);

        return (): void =>
        {
            const set = this.listeners.get(event);
            if (set) { set.delete(handler); }
        };
    }

    // ========================================================================
    // PUBLIC API — Options
    // ========================================================================

    /** Merges new options into the current configuration. */
    public setOptions(options: Partial<SmartTextInputOptions>): void
    {
        this.opts = { ...this.opts, ...options };
        this.initDebounce();
    }

    // ========================================================================
    // PUBLIC API — Static Token Rendering
    // ========================================================================

    /**
     * Renders serialized content into a container with styled token elements.
     * Useful for read-only display of tokenized content.
     *
     * @param container - Target DOM container
     * @param content - Raw serialized content
     * @param serializers - Serializers to parse tokens from content
     * @param renderers - Map of trigger name to renderer for styling
     */
    public static renderTokens(
        container: HTMLElement,
        content: string,
        serializers: TokenSerializer[],
        renderers: Map<string, TokenRenderer>
    ): void
    {
        container.textContent = "";
        const allTokens = collectDeserializedTokens(serializers, content);
        buildRenderedDOM(container, content, allTokens, renderers);
    }

    // ========================================================================
    // PRIVATE — Keyboard Handler
    // ========================================================================

    // <- Handles: keydown

    /** Dispatches keyboard events during active sessions. */
    private handleKeyDown(e: KeyboardEvent): void
    {
        if (!this.session)
        {
            this.handleKeyDownIdle(e);
            return;
        }

        if (this.opts.delegateKeyboard !== false)
        {
            this.handleKeyDownActive(e);
        }
    }

    /** Handles keydown events when no session is active. */
    private handleKeyDownIdle(_e: KeyboardEvent): void
    {
        // No special handling needed in idle state.
        // Trigger detection happens in handleInput.
    }

    /** Handles keydown events during an active trigger session. */
    private handleKeyDownActive(e: KeyboardEvent): void
    {
        if (e.key === DEFAULT_KEY_BINDINGS.navigateUp)
        {
            e.preventDefault();
            this.emitEvent("navigate", { direction: "up" });
            safeCallback(this.opts.onNavigate, "up");
            return;
        }

        this.handleKeyDownActiveSecondary(e);
    }

    /** Handles secondary key bindings during active session. */
    private handleKeyDownActiveSecondary(e: KeyboardEvent): void
    {
        if (e.key === DEFAULT_KEY_BINDINGS.navigateDown)
        {
            e.preventDefault();
            this.emitEvent("navigate", { direction: "down" });
            safeCallback(this.opts.onNavigate, "down");
            return;
        }

        if (e.key === DEFAULT_KEY_BINDINGS.confirmSelection)
        {
            e.preventDefault();
            this.emitEvent("select", {});
            safeCallback(this.opts.onSelect);
            return;
        }

        if (e.key === DEFAULT_KEY_BINDINGS.cancelSession)
        {
            e.preventDefault();
            this.cancelTriggerSession("escape");
            safeCallback(this.opts.onDismiss);
        }
    }

    // ========================================================================
    // PRIVATE — Input Handler
    // ========================================================================

    // <- Handles: input

    /** Routes input events to trigger detection or session update. */
    private handleInput(): void
    {
        if (this.session)
        {
            this.updateTriggerSession();
        }
        else
        {
            this.detectTrigger();
        }

        this.emitContentChange();
    }

    /** Emits a content:change event with the current plain text. */
    private emitContentChange(): void
    {
        if (!this.adapter) { return; }

        const content = this.adapter.getPlainTextContent();
        this.emitEvent("content:change", { content });
        safeCallback(this.opts.onContentChange, content);
    }

    // ========================================================================
    // PRIVATE — Blur Handler
    // ========================================================================

    // <- Handles: blur

    /** Handles blur events by scheduling a delayed session cancel. */
    private handleBlur(): void
    {
        if (!this.session) { return; }

        this.blurTimer = window.setTimeout(
            () => { this.cancelTriggerSession("blur"); },
            DEFAULT_BLUR_DELAY_MS
        );
    }

    // ========================================================================
    // PRIVATE — Trigger Detection
    // ========================================================================

    /** Scans text before cursor for registered trigger characters. */
    private detectTrigger(): void
    {
        if (!this.adapter) { return; }

        const maxTriggerLen = this.getMaxTriggerLength();
        const textBefore = this.adapter.getTextBeforeCursor(maxTriggerLen + 1);

        if (textBefore.length === 0) { return; }

        this.checkTriggersAgainstText(textBefore);
    }

    /** Returns the length of the longest registered trigger string. */
    private getMaxTriggerLength(): number
    {
        let max = 1;

        for (const def of this.triggers.values())
        {
            if (def.trigger.length > max) { max = def.trigger.length; }
        }

        return max;
    }

    /** Tests each trigger against the text before the cursor. */
    private checkTriggersAgainstText(textBefore: string): void
    {
        for (const def of this.triggers.values())
        {
            if (this.triggerMatches(def, textBefore))
            {
                this.startTriggerSession(def);
                return;
            }
        }
    }

    /** Tests whether a single trigger definition matches the text context. */
    private triggerMatches(def: TriggerDefinition, textBefore: string): boolean
    {
        const triggerStr = def.trigger;

        if (!textBefore.endsWith(triggerStr)) { return false; }
        if (!this.checkWhitespaceBefore(def, textBefore)) { return false; }
        if (this.isEscaped(def, textBefore)) { return false; }
        if (this.isSuppressed(def)) { return false; }

        return true;
    }

    /** Verifies whitespace-before requirement for a trigger. */
    private checkWhitespaceBefore(
        def: TriggerDefinition, textBefore: string
    ): boolean
    {
        if (!def.activation.requireWhitespaceBefore) { return true; }

        const charBeforeTrigger = textBefore.length - def.trigger.length - 1;

        if (charBeforeTrigger < 0) { return true; }

        return isWhitespace(textBefore[charBeforeTrigger]);
    }

    /** Checks if the trigger character was preceded by an escape char. */
    private isEscaped(def: TriggerDefinition, textBefore: string): boolean
    {
        if (!def.activation.escapeChar) { return false; }

        const escPos = textBefore.length - def.trigger.length - 1;
        return (escPos >= 0 && textBefore[escPos] === def.activation.escapeChar);
    }

    /** Checks if the cursor context suppresses this trigger. */
    private isSuppressed(def: TriggerDefinition): boolean
    {
        if (def.activation.suppressIn.length === 0) { return false; }
        if (!this.adapter) { return false; }

        const ctx = this.adapter.getCursorContext();

        return def.activation.suppressIn.some(
            (s) => ctx.contexts.includes(s)
        );
    }

    // ========================================================================
    // PRIVATE — Trigger Session Management
    // ========================================================================

    /** Starts a new trigger session and emits the trigger:open event. */
    private startTriggerSession(triggerDef: TriggerDefinition): void
    {
        if (!this.adapter) { return; }

        const cursorPos = this.adapter.getCursorPosition().offset;
        const triggerStart = cursorPos - triggerDef.trigger.length;

        this.session = {
            triggerDef,
            triggerStart,
            queryText: "",
            state: "active",
        };

        this.emitTriggerOpen(triggerDef);
    }

    /** Emits the trigger:open event with position data. */
    private emitTriggerOpen(triggerDef: TriggerDefinition): void
    {
        const position = this.adapter!.getCursorCoordinates();

        const event: TriggerOpenEvent = {
            triggerName: triggerDef.name,
            triggerDef,
            queryText: "",
            position,
        };

        this.emitEvent("trigger:open", event);
        safeCallback(this.opts.onTriggerOpen, event);
        this.announce(`${triggerDef.name} suggestions available`);
    }

    /** Updates the query text for the active session. */
    private updateTriggerSession(): void
    {
        if (!this.session || !this.adapter) { return; }

        const queryText = this.extractQueryText();

        if (this.shouldCancelSession(queryText)) { return; }

        this.session.queryText = queryText;

        if (this.debouncedQuery)
        {
            this.debouncedQuery(queryText);
        }
    }

    /** Extracts the query text from cursor position relative to trigger. */
    private extractQueryText(): string
    {
        const session = this.session!;
        const queryStart = session.triggerStart + session.triggerDef.trigger.length;
        const cursorPos = this.adapter!.getCursorPosition().offset;

        return this.adapter!.getTextInRange(queryStart, cursorPos);
    }

    /** Checks cancel conditions and cancels the session if needed. */
    private shouldCancelSession(queryText: string): boolean
    {
        const activation = this.session!.triggerDef.activation;
        const maxLen = activation.maxQueryLength || DEFAULT_MAX_QUERY_LENGTH;

        if (queryText.length > maxLen)
        {
            this.cancelTriggerSession("cancelled");
            return true;
        }

        if (this.containsCancelChar(queryText, activation.cancelChars))
        {
            this.cancelTriggerSession("cancelled");
            return true;
        }

        return false;
    }

    /** Tests whether the query text contains any cancel characters. */
    private containsCancelChar(queryText: string, cancelChars: string[]): boolean
    {
        return cancelChars.some((c) => queryText.includes(c));
    }

    /** Emits a debounced trigger:query event. */
    private emitQueryEvent(queryText: string): void
    {
        if (!this.session || !this.adapter) { return; }

        const position = this.adapter.getCursorCoordinates();

        const event: TriggerQueryEvent = {
            triggerName: this.session.triggerDef.name,
            queryText,
            position,
        };

        this.emitEvent("trigger:query", event);
        safeCallback(this.opts.onTriggerQuery, event);
    }

    /** Cancels the active trigger session with the given reason. */
    private cancelTriggerSession(reason: string): void
    {
        if (!this.session) { return; }

        const triggerName = this.session.triggerDef.name;
        this.session.state = "cancelled";
        this.clearSession();

        const closeReason = reason as PopoverCloseReason;
        this.emitEvent("trigger:close", { triggerName, reason: closeReason });
        safeCallback(this.opts.onTriggerClose, { triggerName, reason: closeReason });
        this.announce("Suggestions closed");
    }

    // ========================================================================
    // PRIVATE — Event Emission
    // ========================================================================

    /** Emits an event to all registered listeners. */
    private emitEvent(name: StieEventName, data: unknown): void
    {
        const set = this.listeners.get(name);
        if (!set) { return; }

        for (const handler of set)
        {
            try
            {
                handler(data);
            }
            catch (err)
            {
                console.error(LOG_PREFIX, `Event "${name}" handler error:`, err);
            }
        }
    }

    // ========================================================================
    // PRIVATE — Validation
    // ========================================================================

    /** Validates an element for attachment eligibility. */
    private validateElement(element: HTMLElement): boolean
    {
        if (!element)
        {
            console.error(LOG_PREFIX, "No element provided to attach()");
            return false;
        }

        return this.checkElementRestrictions(element);
    }

    /** Checks tag-level and attribute-level restrictions. */
    private checkElementRestrictions(element: HTMLElement): boolean
    {
        const tag = element.tagName.toLowerCase();

        if (tag === "select")
        {
            console.error(LOG_PREFIX, "Cannot attach to <select> elements");
            return false;
        }

        if (this.isRestrictedInputType(element))
        {
            return false;
        }

        return this.checkDisabledReadonly(element);
    }

    /** Rejects password, number, date, and other non-text input types. */
    private isRestrictedInputType(element: HTMLElement): boolean
    {
        if (element.tagName.toLowerCase() !== "input") { return false; }

        const restricted = ["password", "number", "date", "file", "checkbox", "radio"];
        const inputType = (element as HTMLInputElement).type || "text";

        if (restricted.includes(inputType))
        {
            console.error(LOG_PREFIX, "Cannot attach to input type:", inputType);
            return true;
        }

        return false;
    }

    /** Rejects disabled or readonly elements. */
    private checkDisabledReadonly(element: HTMLElement): boolean
    {
        if ((element as HTMLInputElement).disabled)
        {
            console.error(LOG_PREFIX, "Cannot attach to disabled element");
            return false;
        }

        if ((element as HTMLInputElement).readOnly)
        {
            console.error(LOG_PREFIX, "Cannot attach to readonly element");
            return false;
        }

        return true;
    }

    // ========================================================================
    // PRIVATE — Adapter Type Detection
    // ========================================================================

    /** Auto-detects the appropriate adapter type for an element. */
    private detectAdapterType(element: HTMLElement): InputAdapterType
    {
        const tag = element.tagName.toLowerCase();

        if (tag === "input" || tag === "textarea")
        {
            return "plaintext";
        }

        if (element.contentEditable === "true")
        {
            return "contenteditable";
        }

        console.error(LOG_PREFIX, "Unsupported element type:", tag);
        throw new Error(`${LOG_PREFIX} Unsupported element type: ${tag}`);
    }

    // ========================================================================
    // PRIVATE — ARIA Live Region
    // ========================================================================

    /** Creates a visually hidden ARIA live region for announcements. */
    private buildLiveRegion(): HTMLElement
    {
        const el = createElement("div", `${CLS}-live-region`);

        setAttr(el, {
            "role": "status",
            "aria-live": "polite",
            "aria-atomic": "true",
        });

        this.applyScreenReaderOnlyStyles(el);
        document.body.appendChild(el);
        return el;
    }

    /** Applies visually-hidden styles for screen reader only content. */
    private applyScreenReaderOnlyStyles(el: HTMLElement): void
    {
        el.style.position = "absolute";
        el.style.width = "1px";
        el.style.height = "1px";
        el.style.padding = "0";
        el.style.margin = "-1px";
        el.style.overflow = "hidden";
        el.style.clip = "rect(0, 0, 0, 0)";
        el.style.whiteSpace = "nowrap";
        el.style.border = "0";
    }

    /** Announces a message to screen readers via the live region. */
    private announce(message: string): void
    {
        if (this.liveRegionEl)
        {
            this.liveRegionEl.textContent = message;
        }
    }

    /** Removes the ARIA live region from the DOM. */
    private removeLiveRegion(): void
    {
        if (this.liveRegionEl)
        {
            this.liveRegionEl.remove();
            this.liveRegionEl = null;
        }
    }

    // ========================================================================
    // PRIVATE — Cleanup Helpers
    // ========================================================================

    /** Clears the active trigger session. */
    private clearSession(): void
    {
        this.session = null;
        this.multiCharBuffer = "";
    }

    /** Clears pending timers. */
    private clearTimers(): void
    {
        if (this.blurTimer)
        {
            clearTimeout(this.blurTimer);
            this.blurTimer = 0;
        }

        if (this.multiCharTimer)
        {
            clearTimeout(this.multiCharTimer);
            this.multiCharTimer = 0;
        }
    }
}

// ============================================================================
// STATIC RENDERING HELPERS
// ============================================================================

/**
 * Collects all deserialized tokens from all serializers, sorted by position.
 *
 * @param serializers - Serializers to run
 * @param content - Raw content to deserialize
 * @returns Sorted array of deserialized tokens
 */
function collectDeserializedTokens(
    serializers: TokenSerializer[], content: string
): DeserializedToken[]
{
    const all: DeserializedToken[] = [];

    for (const serializer of serializers)
    {
        const found = serializer.deserialize(content);
        all.push(...found);
    }

    all.sort((a, b) => a.startIndex - b.startIndex);
    return all;
}

/**
 * Builds DOM nodes in a container from content and deserialized tokens.
 *
 * @param container - Target DOM container
 * @param content - Raw content string
 * @param tokens - Sorted deserialized tokens
 * @param renderers - Map of trigger name to renderer
 */
function buildRenderedDOM(
    container: HTMLElement,
    content: string,
    tokens: DeserializedToken[],
    renderers: Map<string, TokenRenderer>
): void
{
    let cursor = 0;

    for (const dt of tokens)
    {
        appendTextSegment(container, content, cursor, dt.startIndex);
        appendTokenSegment(container, dt, renderers);
        cursor = dt.endIndex;
    }

    appendTextSegment(container, content, cursor, content.length);
}

/** Appends a plain text node for the gap between tokens. */
function appendTextSegment(
    container: HTMLElement, content: string, from: number, to: number
): void
{
    if (from >= to) { return; }

    const text = content.slice(from, to);
    container.appendChild(document.createTextNode(text));
}

/** Appends a styled token span for a deserialized token. */
function appendTokenSegment(
    container: HTMLElement,
    dt: DeserializedToken,
    renderers: Map<string, TokenRenderer>
): void
{
    const triggerName = dt.token.triggerName || "";
    const renderer = renderers.get(triggerName);

    if (!renderer)
    {
        container.appendChild(document.createTextNode(dt.rawMatch));
        return;
    }

    const resolvedToken = buildPartialResolvedToken(dt);
    const el = buildStaticTokenElement(resolvedToken, renderer);
    container.appendChild(el);
}

/** Constructs a ResolvedToken from partial deserialized data. */
function buildPartialResolvedToken(dt: DeserializedToken): ResolvedToken
{
    return {
        instanceId: dt.token.instanceId || generateId(),
        triggerName: dt.token.triggerName || "",
        id: dt.token.id || "",
        label: dt.token.label || dt.rawMatch,
        sublabel: dt.token.sublabel,
        icon: dt.token.icon,
        metadata: dt.token.metadata || {},
        sourceRange: { start: dt.startIndex, end: dt.endIndex },
    };
}

/** Creates a styled span element for static token rendering. */
function buildStaticTokenElement(
    token: ResolvedToken, renderer: TokenRenderer
): HTMLElement
{
    const cls = `${CLS}-token ${resolveTokenClass(renderer, token)}`;
    const el = createElement("span", cls);
    el.textContent = renderer.display(token);

    setAttr(el, {
        "data-stie-token-id": token.instanceId,
        "data-stie-trigger": token.triggerName,
        "data-stie-entity-id": token.id,
    });

    return el;
}

// ============================================================================
// FACTORY FUNCTION + WINDOW GLOBALS
// ============================================================================

/**
 * Factory function to create a SmartTextInput engine instance.
 *
 * @param options - Engine configuration
 * @returns New SmartTextInputEngine instance
 */
// @entrypoint
export function createSmartTextInput(
    options?: SmartTextInputOptions
): SmartTextInputEngine
{
    return new SmartTextInputEngine(options);
}

// >> Delegates to: window globals
if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["SmartTextInputEngine"] = SmartTextInputEngine;
    (window as unknown as Record<string, unknown>)["createSmartTextInput"] = createSmartTextInput;
}
