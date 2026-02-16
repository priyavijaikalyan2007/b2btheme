/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Conversation
 * 📜 PURPOSE: A programmable turn-by-turn conversation UI component for AI
 *    agent interactions in enterprise SaaS applications.  Supports rich text
 *    rendering via Vditor, streaming responses, session management, feedback,
 *    copy in multiple formats, inline error display, MCP App rendering in
 *    sandboxed iframes, and an optional canvas side panel for full-size
 *    interactive content.
 * 🔗 RELATES: [[EnterpriseTheme]], [[ConversationStyles]], [[MarkdownEditor]],
 *    [[McpAppFrame]]
 * ⚡ FLOW: [Consumer App] -> [createConversation()] -> [DOM conversation panel]
 * 🔒 SECURITY: User messages use textContent only (never innerHTML).
 *    Assistant messages rendered via Vditor.preview() with sanitize:true.
 *    DOMPurify applied on all HTML export paths.
 *    MCP Apps rendered in sandboxed iframes (no allow-same-origin) with CSP
 *    meta tag injection and event.source postMessage validation.
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1 — TYPES & INTERFACES
// ============================================================================

/** Role of a message participant. */
export type ConversationRole = "user" | "assistant" | "system" | "error";

/** Formats supported for copy-to-clipboard operations. */
export type CopyFormat = "markdown" | "html" | "plaintext";

/** Feedback sentiment. */
export type FeedbackSentiment = "positive" | "negative";

/** State of a streaming message. */
export type StreamState = "streaming" | "complete" | "error";

/** Display mode for MCP App content. */
export type McpAppDisplayMode = "inline" | "canvas";

/**
 * Configuration for an MCP App resource to render within a message.
 * The app HTML runs in a sandboxed iframe with no access to the host page.
 */
export interface McpAppConfig
{
    /** The HTML content of the MCP app (text/html;profile=mcp-app). */
    html: string;

    /** Title for the app panel header.  Default: "App". */
    title?: string;

    /** Preferred width in pixels for canvas mode.  Default: 480. */
    preferredWidth?: number;

    /** Preferred height in pixels for inline mode.  Default: 300. */
    preferredHeight?: number;

    /** Allowed connect-src domains for the iframe CSP. */
    connectDomains?: string[];

    /** Render inline within the message or in the canvas panel.  Default: "inline". */
    displayMode?: McpAppDisplayMode;

    /** Override iframe sandbox flags.  Default: "allow-scripts allow-forms". */
    sandboxFlags?: string;
}

/**
 * A single message in the conversation.
 */
export interface ConversationMessage
{
    /** Unique message identifier.  Auto-generated if not provided. */
    id: string;

    /** Who sent the message. */
    role: ConversationRole;

    /** Message content (markdown for assistant, plain text for user). */
    content: string;

    /** UTC timestamp. */
    timestamp: Date;

    /** Feedback on this message (assistant messages only). */
    feedback?: FeedbackData;

    /** Arbitrary metadata the consumer can attach. */
    metadata?: Record<string, unknown>;
}

/**
 * Feedback data attached to an assistant message.
 */
export interface FeedbackData
{
    /** Positive or negative sentiment. */
    sentiment: FeedbackSentiment;

    /** Optional written comment from the user. */
    comment?: string;

    /** UTC timestamp of when feedback was given. */
    timestamp: Date;
}

/**
 * A session representing a conversation thread.
 */
export interface ConversationSession
{
    /** Unique session identifier. */
    id: string;

    /** Human-readable session title. */
    title?: string;

    /** Messages in this session. */
    messages: ConversationMessage[];

    /** When the session was created. */
    createdAt: Date;

    /** When the session was last updated. */
    updatedAt: Date;

    /** Arbitrary session metadata. */
    metadata?: Record<string, unknown>;
}

/**
 * Handle returned by startAssistantMessage() for streaming token-by-token.
 */
export interface StreamHandle
{
    /** The message ID being streamed. */
    readonly messageId: string;

    /** Append a text chunk to the message. */
    appendChunk(text: string): void;

    /** Mark streaming as complete.  Triggers final Vditor render.
     *  Optional metadata may include mcpApp for MCP App rendering. */
    complete(metadata?: Record<string, unknown>): void;

    /** Mark streaming as errored.  Shows inline error state. */
    error(message?: string): void;

    /** Current accumulated content. */
    getContent(): string;

    /** Current stream state. */
    getState(): StreamState;
}

/**
 * Error detail for inline error display within the conversation.
 */
export interface ConversationError
{
    /** Short error title. */
    title: string;

    /** Explanation text. */
    message: string;

    /** Actionable suggestion. */
    suggestion?: string;

    /** Technical detail (expandable). */
    technicalDetail?: string;

    /** Error code for searchability. */
    errorCode?: string;

    /** Correlation ID for backend log tracing. */
    correlationId?: string;
}

/**
 * Configuration options for the Conversation component.
 */
export interface ConversationOptions
{
    /** Maximum messages to retain in buffer.  0 = unlimited.  Default: 0. */
    maxMessages?: number;

    /** Initial session to load. */
    session?: ConversationSession;

    /** Placeholder text for the input textarea.  Default: "Type a message...". */
    placeholder?: string;

    /** Show the session header with controls.  Default: true. */
    showHeader?: boolean;

    /** Session title displayed in header.  Default: "Conversation". */
    title?: string;

    /** Show feedback buttons on assistant messages.  Default: true. */
    showFeedback?: boolean;

    /** Show copy button on individual messages.  Default: true. */
    showMessageCopy?: boolean;

    /** Show conversation-level copy button in header.  Default: true. */
    showConversationCopy?: boolean;

    /** Show the "New conversation" button.  Default: true. */
    showNewConversation?: boolean;

    /** Show the "Clear context" button.  Default: true. */
    showClearContext?: boolean;

    /** Show timestamp on each message.  Default: false. */
    showTimestamps?: boolean;

    /** User display name.  Default: "You". */
    userDisplayName?: string;

    /** Assistant display name.  Default: "Assistant". */
    assistantDisplayName?: string;

    /** User avatar: Bootstrap Icons class or image URL. */
    userAvatar?: string;

    /** Assistant avatar: Bootstrap Icons class or image URL. */
    assistantAvatar?: string;

    /** Typing indicator text.  Default: "Thinking...". */
    typingIndicatorText?: string;

    /** Auto-focus the input field on show().  Default: true. */
    autoFocus?: boolean;

    /** Disable the input area.  Default: false. */
    disabled?: boolean;

    /** Height of the component (CSS value).  Default: "100%". */
    height?: string;

    /** Width of the component (CSS value).  Default: "100%". */
    width?: string;

    /** Bootstrap size variant.  Default: "md". */
    size?: "sm" | "md" | "lg";

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;

    // -- Callbacks: Session lifecycle --

    /** Called when a new session is requested. */
    onNewSession?: () => Promise<ConversationSession> | ConversationSession;

    /** Called when loading an existing session. */
    onLoadSession?: (sessionId: string) => Promise<ConversationSession> | ConversationSession;

    /** Called to persist the session after each message. */
    onSaveSession?: (session: ConversationSession) => Promise<void> | void;

    /** Called when the user clicks "Clear context". */
    onClearSession?: (sessionId: string) => Promise<void> | void;

    // -- Callbacks: Message lifecycle --

    /** Called when the user sends a message. */
    onSendMessage?: (message: string, session: ConversationSession) => void;

    /** Called when feedback is given on an assistant message. */
    onFeedback?: (
        messageId: string,
        feedback: FeedbackData,
        session: ConversationSession
    ) => void;

    /** Called when content is copied. */
    onCopy?: (content: string, format: CopyFormat) => void;

    /** Called when an error occurs. */
    onError?: (error: Error) => void;

    // -- MCP App options --

    /** Enable MCP App rendering in messages.  Default: false. */
    enableMcpApps?: boolean;

    /** Show the canvas side panel for full-size MCP apps.  Default: false. */
    showCanvas?: boolean;

    /** Default canvas panel width in pixels.  Default: 480. */
    canvasWidth?: number;

    /** Minimum canvas panel width in pixels.  Default: 280. */
    canvasMinWidth?: number;

    /** Maximum canvas width as a fraction of the container.  Default: 0.6. */
    canvasMaxWidthFraction?: number;

    /** Called when an MCP app sends a JSON-RPC message to the host. */
    onMcpAppMessage?: (
        appId: string, method: string, params: unknown
    ) => void;

    /** Called when the canvas panel is opened or closed. */
    onCanvasToggle?: (open: boolean) => void;
}

// ============================================================================
// S2 — CONSTANTS
// ============================================================================

const LOG_PREFIX = "[Conversation]";

let instanceCounter = 0;

const DEFAULT_PLACEHOLDER = "Type a message...";
const DEFAULT_TITLE = "Conversation";
const DEFAULT_USER_NAME = "You";
const DEFAULT_ASSISTANT_NAME = "Assistant";
const DEFAULT_TYPING_TEXT = "Thinking...";
const DEFAULT_USER_AVATAR = "bi-person-circle";
const DEFAULT_ASSISTANT_AVATAR = "bi-robot";

const COPY_FEEDBACK_DURATION_MS = 1500;

const DEFAULT_MCP_SANDBOX = "allow-scripts allow-forms";
const DEFAULT_MCP_INLINE_HEIGHT = 300;
const DEFAULT_CANVAS_WIDTH = 480;
const DEFAULT_CANVAS_MIN_WIDTH = 280;
const DEFAULT_CANVAS_MAX_FRACTION = 0.6;
const CANVAS_RESIZE_STEP_PX = 20;

let mcpFrameCounter = 0;

// ============================================================================
// S3 — PRIVATE HELPERS: DOM
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and text.
 */
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

/**
 * Sets an attribute on an element.
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/**
 * Creates an SVG-namespaced element (not needed here but kept for pattern).
 * This component does not use SVG directly.
 */

// ============================================================================
// S4 — PRIVATE HELPERS: UTILITIES
// ============================================================================

/** SVG tags allowed through DOMPurify for diagram rendering. */
const SANITISE_SVG_TAGS: string[] = [
    "svg", "g", "defs", "symbol", "use",
    "path", "circle", "rect", "ellipse", "line",
    "polyline", "polygon",
    "text", "tspan", "textPath",
    "clipPath", "mask", "pattern",
    "linearGradient", "radialGradient", "stop",
    "marker",
    "foreignObject", "image", "title", "desc",
];

/** SVG attributes allowed through DOMPurify for diagram rendering. */
const SANITISE_SVG_ATTRS: string[] = [
    "viewBox", "d", "x", "y", "cx", "cy", "r", "rx", "ry",
    "x1", "y1", "x2", "y2", "points", "width", "height",
    "dx", "dy",
    "fill", "fill-opacity", "stroke", "stroke-width",
    "stroke-opacity", "stroke-dasharray", "stroke-dashoffset",
    "stroke-linecap", "stroke-linejoin", "opacity",
    "transform", "preserveAspectRatio",
    "dominant-baseline", "text-anchor", "font-size",
    "font-family", "font-weight",
    "marker-end", "marker-start", "marker-mid",
    "markerWidth", "markerHeight", "refX", "refY",
    "orient", "markerUnits",
    "offset", "stop-color", "stop-opacity",
    "gradientTransform", "gradientUnits",
    "clip-path", "clip-rule", "mask",
    "xmlns", "xmlns:xlink", "xlink:href", "href",
    "class", "id", "style", "data-*",
];

/**
 * Sanitises HTML using DOMPurify if available.
 */
function sanitiseHTML(html: string): string
{
    const dp = (window as any).DOMPurify;
    if (dp && typeof dp.sanitize === "function")
    {
        return dp.sanitize(html, {
            ADD_TAGS: SANITISE_SVG_TAGS,
            ADD_ATTR: SANITISE_SVG_ATTRS,
            ALLOW_DATA_ATTR: true,
        });
    }
    console.warn(LOG_PREFIX, "DOMPurify not found — HTML may not be sanitised");
    return html;
}

/**
 * Generates a unique message ID.
 */
function generateMessageId(): string
{
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 8);
    return `msg-${ts}-${rand}`;
}

/**
 * Generates a unique session ID.
 */
function generateSessionId(): string
{
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 10);
    return `session-${ts}-${rand}`;
}

/**
 * Formats a Date as a short time string (HH:MM).
 */
function formatTime(date: Date): string
{
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
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
            console.debug(LOG_PREFIX, "Content copied to clipboard");
        }).catch((err) =>
        {
            console.warn(LOG_PREFIX, "Clipboard API failed, trying fallback:", err);
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
        console.debug(LOG_PREFIX, "Content copied (fallback)");
    }
    catch (err)
    {
        console.error(LOG_PREFIX, "Failed to copy to clipboard:", err);
    }
    finally
    {
        document.body.removeChild(textarea);
    }
}

/**
 * Shows brief visual feedback on a copy button.
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
        }, COPY_FEEDBACK_DURATION_MS);
    }
}

/**
 * Resolves a container parameter to an HTMLElement.
 */
function resolveContainer(
    container?: string | HTMLElement
): HTMLElement
{
    if (!container)
    {
        return document.body;
    }
    if (typeof container === "string")
    {
        const el = document.getElementById(container);
        if (!el)
        {
            console.error(LOG_PREFIX, "Container not found:", container);
            return document.body;
        }
        return el;
    }
    return container;
}

/**
 * Checks whether a string is a Bootstrap Icons class name.
 */
function isIconClass(value: string): boolean
{
    return value.startsWith("bi-");
}

// ============================================================================
// S4b — MCP APP FRAME (SANDBOXED IFRAME RENDERER)
// ============================================================================

/**
 * Callback signature for messages received from an MCP app guest.
 */
type McpAppMessageHandler = (
    appId: string, method: string, params: unknown
) => void;

/**
 * Builds a CSP meta tag string from an McpAppConfig.
 * Restricts the iframe's network and execution capabilities.
 */
function buildCSPMetaTag(config: McpAppConfig): string
{
    const connectSrc = config.connectDomains && config.connectDomains.length > 0
        ? config.connectDomains.join(" ")
        : "";
    const csp = [
        "default-src 'none'",
        "script-src 'unsafe-inline'",
        "style-src 'unsafe-inline'",
        connectSrc ? `connect-src ${connectSrc}` : "",
    ].filter(Boolean).join("; ");
    return `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
}

/**
 * Extracts Bootstrap theme values from computed styles on a reference
 * element and returns a CSS custom property block for MCP app theming.
 */
function buildThemeStyleBlock(refEl: HTMLElement): string
{
    const cs = getComputedStyle(refEl);
    const vars: Record<string, string> = {
        "--mcp-primary": cs.getPropertyValue("--bs-primary") || "#1c7ed6",
        "--mcp-background": cs.backgroundColor || "#ffffff",
        "--mcp-text": cs.color || "#0f172a",
        "--mcp-border": cs.borderColor || "#cbd5e1",
        "--mcp-font-family": cs.fontFamily || "sans-serif",
        "--mcp-font-size": cs.fontSize || "14px",
    };
    const lines = Object.entries(vars)
        .map(([k, v]) => `${k}: ${v};`).join(" ");
    return `<style>:root { ${lines} } body { margin: 0; font-family: var(--mcp-font-family); font-size: var(--mcp-font-size); color: var(--mcp-text); background: var(--mcp-background); }</style>`;
}

/**
 * McpAppFrame manages a single MCP App inside a sandboxed iframe.
 *
 * Security model:
 * - iframe sandbox="allow-scripts allow-forms" (no allow-same-origin)
 * - Content injected via srcdoc (no network fetch)
 * - CSP meta tag restricts network access
 * - postMessage validated via event.source === iframe.contentWindow
 * - Unique appId per frame for multi-app routing
 */
class McpAppFrame
{
    readonly appId: string;
    private iframe: HTMLIFrameElement | null = null;
    private container: HTMLElement;
    private config: McpAppConfig;
    private onMessage: McpAppMessageHandler | null;
    private boundMessageHandler: ((e: MessageEvent) => void) | null = null;
    private destroyed = false;

    constructor(
        config: McpAppConfig,
        container: HTMLElement,
        onMessage?: McpAppMessageHandler
    )
    {
        mcpFrameCounter++;
        this.appId = `mcp-frame-${mcpFrameCounter}`;
        this.config = config;
        this.container = container;
        this.onMessage = onMessage || null;

        this.createIframe();
        this.setupMessageBridge();
        console.debug(LOG_PREFIX, "McpAppFrame created:", this.appId);
    }

    /**
     * Creates the sandboxed iframe and injects it into the container.
     */
    private createIframe(): void
    {
        this.iframe = document.createElement("iframe");
        this.iframe.classList.add("conversation-mcp-iframe");
        setAttr(this.iframe as unknown as HTMLElement, "sandbox",
            this.config.sandboxFlags || DEFAULT_MCP_SANDBOX);
        setAttr(this.iframe as unknown as HTMLElement, "title",
            this.config.title || "MCP App");

        const height = this.config.preferredHeight || DEFAULT_MCP_INLINE_HEIGHT;
        this.iframe.style.height = `${height}px`;

        const srcdoc = this.buildSrcdoc();
        this.iframe.srcdoc = srcdoc;
        this.container.appendChild(this.iframe);
    }

    /**
     * Assembles the srcdoc HTML with CSP, theme, and app content.
     */
    private buildSrcdoc(): string
    {
        const csp = buildCSPMetaTag(this.config);
        const theme = buildThemeStyleBlock(this.container);
        const bridge = this.buildBridgeScript();
        return `<!DOCTYPE html><html><head>${csp}${theme}${bridge}</head><body>${this.config.html}</body></html>`;
    }

    /**
     * Builds the guest-side bridge script injected into the iframe.
     * Provides window.mcpBridge for the app to communicate with the host.
     */
    private buildBridgeScript(): string
    {
        return `<script>
(function() {
    var appId = "${this.appId}";
    var rpcId = 0;
    window.mcpBridge = {
        send: function(method, params) {
            rpcId++;
            parent.postMessage({
                jsonrpc: "2.0", id: rpcId,
                method: method, params: params,
                appId: appId
            }, "*");
        },
        onMessage: null
    };
    window.addEventListener("message", function(e) {
        if (e.data && e.data.appId === appId && window.mcpBridge.onMessage) {
            window.mcpBridge.onMessage(e.data.method, e.data.params);
        }
    });
    window.addEventListener("error", function(e) {
        parent.postMessage({
            jsonrpc: "2.0", method: "mcp.error",
            params: { message: e.message, filename: e.filename, line: e.lineno },
            appId: appId
        }, "*");
    });
})();
<\/script>`;
    }

    /**
     * Registers the postMessage listener on the host window.
     */
    private setupMessageBridge(): void
    {
        this.boundMessageHandler = (e: MessageEvent) =>
        {
            this.handleGuestMessage(e);
        };
        window.addEventListener("message", this.boundMessageHandler);
    }

    /**
     * Validates and dispatches a message from the guest iframe.
     */
    private handleGuestMessage(e: MessageEvent): void
    {
        if (!this.iframe || this.destroyed) { return; }
        if (e.source !== this.iframe.contentWindow) { return; }

        const data = e.data;
        if (!data || data.appId !== this.appId) { return; }
        if (typeof data.method !== "string") { return; }

        console.debug(LOG_PREFIX, "MCP message from guest:",
            this.appId, data.method);

        if (this.onMessage)
        {
            this.onMessage(this.appId, data.method, data.params);
        }
    }

    /**
     * Sends a JSON-RPC message to the guest iframe.
     */
    sendToGuest(method: string, params?: unknown): void
    {
        if (!this.iframe || this.destroyed) { return; }
        const cw = this.iframe.contentWindow;
        if (!cw) { return; }
        cw.postMessage({
            jsonrpc: "2.0", method, params,
            appId: this.appId,
        }, "*");
    }

    /**
     * Resizes the iframe to the specified dimensions.
     */
    resize(width?: number, height?: number): void
    {
        if (!this.iframe) { return; }
        if (width !== undefined)
        {
            this.iframe.style.width = `${width}px`;
        }
        if (height !== undefined)
        {
            this.iframe.style.height = `${height}px`;
        }
    }

    /**
     * Returns the iframe element for DOM manipulation.
     */
    getIframe(): HTMLIFrameElement | null
    {
        return this.iframe;
    }

    /**
     * Removes the iframe and cleans up the message listener.
     */
    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;

        if (this.boundMessageHandler)
        {
            window.removeEventListener("message", this.boundMessageHandler);
            this.boundMessageHandler = null;
        }
        if (this.iframe)
        {
            this.iframe.remove();
            this.iframe = null;
        }
        this.onMessage = null;
        console.debug(LOG_PREFIX, "McpAppFrame destroyed:", this.appId);
    }
}

// ============================================================================
// S5 — CONVERSATION CLASS
// ============================================================================

/**
 * Conversation renders a turn-by-turn AI chat UI with rich text rendering,
 * streaming, session management, feedback, and copy functionality.
 *
 * @example
 * const chat = new Conversation({
 *     title: "Support Agent",
 *     onSendMessage: (msg, session) => callMyAPI(msg),
 * });
 * chat.show("chat-container");
 */
export class Conversation
{
    private readonly instanceId: string;
    private opts: ConversationOptions;
    private session: ConversationSession;
    private autoScrollEnabled = true;
    private activeStream: StreamHandle | null = null;
    private destroyed = false;
    private visible = false;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private headerEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private messageListEl: HTMLElement | null = null;
    private typingEl: HTMLElement | null = null;
    private inputAreaEl: HTMLElement | null = null;
    private textareaEl: HTMLTextAreaElement | null = null;
    private sendBtnEl: HTMLElement | null = null;
    private feedbackModalEl: HTMLElement | null = null;
    private feedbackTextareaEl: HTMLTextAreaElement | null = null;
    private feedbackTargetMsgId: string | null = null;
    private feedbackTargetSentiment: FeedbackSentiment | null = null;

    // O(1) message DOM lookups
    private messageElements = new Map<string, HTMLElement>();

    // MCP App state
    private mcpFrames = new Map<string, McpAppFrame>();
    private wrapperEl: HTMLElement | null = null;
    private canvasEl: HTMLElement | null = null;
    private canvasHeaderEl: HTMLElement | null = null;
    private canvasBodyEl: HTMLElement | null = null;
    private canvasHandleEl: HTMLElement | null = null;
    private canvasOpen = false;
    private canvasWidth = DEFAULT_CANVAS_WIDTH;
    private canvasAppConfig: McpAppConfig | null = null;
    private canvasFrame: McpAppFrame | null = null;
    private expandedMsgId: string | null = null;

    /**
     * Creates a new Conversation instance and builds its DOM.
     *
     * @param options - Configuration for the conversation component.
     */
    constructor(options?: ConversationOptions)
    {
        instanceCounter++;
        this.instanceId = `conversation-${instanceCounter}`;
        this.opts = options || {};
        this.session = this.initSession();
        this.buildDOM();
        this.renderInitialMessages();
        console.debug(LOG_PREFIX, "Created instance:", this.instanceId);
    }

    /**
     * Initialises the session from options or creates a new one.
     */
    private initSession(): ConversationSession
    {
        if (this.opts.session)
        {
            return {
                ...this.opts.session,
                messages: [...this.opts.session.messages],
            };
        }
        const now = new Date();
        return {
            id: generateSessionId(),
            title: this.opts.title || DEFAULT_TITLE,
            messages: [],
            createdAt: now,
            updatedAt: now,
        };
    }

    // ========================================================================
    // PUBLIC — LIFECYCLE
    // ========================================================================

    /**
     * Appends the conversation to a container and makes it visible.
     *
     * @param container - Element ID string or HTMLElement.
     */
    show(container?: string | HTMLElement): void
    {
        if (this.destroyed || this.visible || !this.rootEl)
        {
            return;
        }
        const target = resolveContainer(container);
        const mountEl = this.wrapperEl || this.rootEl;
        target.appendChild(mountEl);
        this.visible = true;
        this.scrollToBottom();
        if (this.opts.autoFocus !== false)
        {
            this.focus();
        }
        console.debug(LOG_PREFIX, "Shown in container");
    }

    /**
     * Removes from DOM without destroying state.
     */
    hide(): void
    {
        if (!this.rootEl || !this.visible)
        {
            return;
        }
        const mountEl = this.wrapperEl || this.rootEl;
        mountEl.remove();
        this.visible = false;
        console.debug(LOG_PREFIX, "Hidden");
    }

    /**
     * Hides and releases all references and timers.
     */
    destroy(): void
    {
        if (this.destroyed) { return; }
        this.hide();
        this.stopStream();
        this.destroyAllMcpFrames();
        this.rootEl = null;
        this.headerEl = null;
        this.titleEl = null;
        this.messageListEl = null;
        this.typingEl = null;
        this.inputAreaEl = null;
        this.textareaEl = null;
        this.sendBtnEl = null;
        this.feedbackModalEl = null;
        this.feedbackTextareaEl = null;
        this.wrapperEl = null;
        this.canvasEl = null;
        this.canvasHeaderEl = null;
        this.canvasBodyEl = null;
        this.canvasHandleEl = null;
        this.canvasFrame = null;
        this.messageElements.clear();
        this.destroyed = true;
        console.debug(LOG_PREFIX, "Destroyed:", this.instanceId);
    }

    // ========================================================================
    // PUBLIC — MESSAGE API
    // ========================================================================

    /**
     * Adds a user message to the conversation.
     */
    addUserMessage(text: string): ConversationMessage
    {
        const msg = this.createMessage("user", text);
        this.session.messages.push(msg);
        this.renderMessage(msg);
        this.evictOldMessages();
        this.updateSessionTimestamp();
        this.saveSessionIfCallback();
        return msg;
    }

    /**
     * Adds a complete assistant message (rendered via Vditor).
     */
    addAssistantMessage(text: string): ConversationMessage
    {
        const msg = this.createMessage("assistant", text);
        this.session.messages.push(msg);
        this.hideTypingIndicator();
        this.renderMessage(msg);
        this.evictOldMessages();
        this.updateSessionTimestamp();
        this.saveSessionIfCallback();
        return msg;
    }

    /**
     * Adds an informational system message.
     */
    addSystemMessage(text: string): ConversationMessage
    {
        const msg = this.createMessage("system", text);
        this.session.messages.push(msg);
        this.renderMessage(msg);
        this.evictOldMessages();
        return msg;
    }

    /**
     * Adds an inline error message with expandable details.
     */
    addError(error: ConversationError): ConversationMessage
    {
        const content = this.formatErrorContent(error);
        const msg = this.createMessage("error", content);
        msg.metadata = { errorDetail: error };
        this.session.messages.push(msg);
        this.renderErrorBubble(msg, error);
        this.evictOldMessages();
        return msg;
    }

    /**
     * Adds an assistant message with an embedded MCP App.
     * The text is rendered as markdown above the app iframe.
     */
    addAppMessage(
        text: string, appConfig: McpAppConfig
    ): ConversationMessage
    {
        const msg = this.createMessage("assistant", text);
        msg.metadata = { mcpApp: appConfig };
        this.session.messages.push(msg);
        this.hideTypingIndicator();
        this.renderMessage(msg);
        this.evictOldMessages();
        this.updateSessionTimestamp();
        this.saveSessionIfCallback();
        return msg;
    }

    // ========================================================================
    // PUBLIC — CANVAS API
    // ========================================================================

    /**
     * Opens the canvas side panel with an MCP App.
     */
    openCanvas(config: McpAppConfig): void
    {
        if (!this.opts.showCanvas || !this.canvasEl)
        {
            console.warn(LOG_PREFIX,
                "Canvas not enabled — set showCanvas: true");
            return;
        }
        this.canvasAppConfig = config;
        this.renderCanvasContent(config);
        this.showCanvasPanel();
    }

    /**
     * Closes the canvas side panel.
     */
    closeCanvas(): void
    {
        this.hideCanvasPanel();
    }

    /**
     * Returns whether the canvas panel is currently open.
     */
    isCanvasOpen(): boolean
    {
        return this.canvasOpen;
    }

    // ========================================================================
    // PUBLIC — STREAMING API
    // ========================================================================

    /**
     * Begins a streaming assistant message.  Returns a handle for appending
     * chunks and completing the stream.
     */
    startAssistantMessage(): StreamHandle
    {
        if (this.activeStream)
        {
            console.warn(LOG_PREFIX, "Stream already active — completing previous");
            this.activeStream.complete();
        }
        this.hideTypingIndicator();
        const msg = this.createMessage("assistant", "");
        this.session.messages.push(msg);
        const handle = this.createStreamHandle(msg);
        this.activeStream = handle;
        this.renderStreamingBubble(msg);
        return handle;
    }

    /**
     * Shows the typing indicator.
     */
    showTypingIndicator(): void
    {
        if (this.typingEl)
        {
            this.typingEl.classList.add("conversation-typing-visible");
            this.autoScrollMessages();
        }
    }

    /**
     * Hides the typing indicator.
     */
    hideTypingIndicator(): void
    {
        if (this.typingEl)
        {
            this.typingEl.classList.remove("conversation-typing-visible");
        }
    }

    // ========================================================================
    // PUBLIC — SESSION API
    // ========================================================================

    /**
     * Replaces the current session and re-renders all messages.
     */
    loadSession(session: ConversationSession): void
    {
        this.stopStream();
        this.session = {
            ...session,
            messages: [...session.messages],
        };
        this.clearMessageList();
        this.renderInitialMessages();
        this.updateTitleDisplay();
        console.debug(LOG_PREFIX, "Session loaded:", session.id);
    }

    /**
     * Creates a new session via callback and reinitialises.
     */
    async newSession(): Promise<void>
    {
        this.stopStream();
        if (this.opts.onNewSession)
        {
            try
            {
                const sess = await this.opts.onNewSession();
                this.loadSession(sess);
                return;
            }
            catch (err)
            {
                console.error(LOG_PREFIX, "onNewSession failed:", err);
            }
        }
        this.loadSession(this.createDefaultSession());
    }

    /**
     * Clears messages in the current session.
     */
    async clearSession(): Promise<void>
    {
        this.stopStream();
        if (this.opts.onClearSession)
        {
            try
            {
                await this.opts.onClearSession(this.session.id);
            }
            catch (err)
            {
                console.error(LOG_PREFIX, "onClearSession failed:", err);
            }
        }
        this.session.messages = [];
        this.session.updatedAt = new Date();
        this.clearMessageList();
        console.debug(LOG_PREFIX, "Session cleared:", this.session.id);
    }

    /**
     * Returns a deep copy of the current session.
     */
    getSession(): ConversationSession
    {
        return {
            ...this.session,
            messages: this.session.messages.map(m => ({
                ...m,
                metadata: m.metadata ? { ...m.metadata } : undefined,
            })),
        };
    }

    /**
     * Returns a copy of the messages array.
     */
    getMessages(): ConversationMessage[]
    {
        return this.session.messages.map(m => ({
            ...m,
            metadata: m.metadata ? { ...m.metadata } : undefined,
        }));
    }

    // ========================================================================
    // PUBLIC — COPY API
    // ========================================================================

    /**
     * Copies a single message to the clipboard.
     */
    copyMessage(messageId: string, format: CopyFormat, btn?: HTMLElement): void
    {
        const msg = this.session.messages.find(m => m.id === messageId);
        if (!msg)
        {
            console.warn(LOG_PREFIX, "Message not found:", messageId);
            return;
        }
        const text = this.formatMessageForCopy(msg, format);
        if (btn)
        {
            copyToClipboard(text, btn);
        }
        else
        {
            navigator.clipboard?.writeText(text);
        }
        this.opts.onCopy?.(text, format);
    }

    /**
     * Copies the entire conversation to the clipboard.
     */
    copyConversation(format: CopyFormat, btn?: HTMLElement): void
    {
        const text = this.formatConversationForCopy(format);
        if (btn)
        {
            copyToClipboard(text, btn);
        }
        else
        {
            navigator.clipboard?.writeText(text);
        }
        this.opts.onCopy?.(text, format);
    }

    // ========================================================================
    // PUBLIC — UTILITY
    // ========================================================================

    /**
     * Enables or disables the input area.
     */
    setDisabled(disabled: boolean): void
    {
        this.opts.disabled = disabled;
        if (this.rootEl)
        {
            this.rootEl.classList.toggle("conversation-disabled", disabled);
        }
        this.updateSendButtonState();
    }

    /**
     * Updates the header title.
     */
    setTitle(title: string): void
    {
        this.opts.title = title;
        this.updateTitleDisplay();
    }

    /** Forces scroll to bottom. */
    scrollToBottom(): void
    {
        if (this.messageListEl)
        {
            this.messageListEl.scrollTop = this.messageListEl.scrollHeight;
            this.autoScrollEnabled = true;
        }
    }

    /** Focuses the input textarea. */
    focus(): void
    {
        this.textareaEl?.focus();
    }

    /** Returns current message count. */
    getMessageCount(): number
    {
        return this.session.messages.length;
    }

    /** Returns true if a stream is active. */
    isStreaming(): boolean
    {
        return this.activeStream !== null;
    }

    /** Returns visibility state. */
    isVisible(): boolean
    {
        return this.visible;
    }

    /** Returns the root DOM element. */
    getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    // ========================================================================
    // PRIVATE — DOM BUILDING
    // ========================================================================

    /**
     * Builds the complete conversation DOM tree.
     */
    private buildDOM(): void
    {
        this.rootEl = createElement("div", ["conversation"]);
        setAttr(this.rootEl, "role", "region");
        setAttr(this.rootEl, "aria-label",
            this.opts.title || DEFAULT_TITLE);
        this.rootEl.id = this.instanceId;
        this.applySizeClass();
        this.applyDimensions();
        this.applyCssClass();
        if (this.opts.showHeader !== false)
        {
            this.buildHeader();
        }
        this.buildMessageList();
        this.buildInputArea();
        this.buildFeedbackModal();
        this.buildCanvasDOM();
    }

    /**
     * Builds the header with title and action buttons.
     */
    private buildHeader(): void
    {
        this.headerEl = createElement("div", ["conversation-header"]);
        this.titleEl = createElement("h3", ["conversation-title"],
            this.opts.title || DEFAULT_TITLE);
        this.headerEl.appendChild(this.titleEl);
        const actions = createElement("div", ["conversation-header-actions"]);
        this.appendHeaderButtons(actions);
        this.headerEl.appendChild(actions);
        this.rootEl!.appendChild(this.headerEl);
    }

    /**
     * Appends the header action buttons based on options.
     */
    private appendHeaderButtons(container: HTMLElement): void
    {
        if (this.opts.showNewConversation !== false)
        {
            const btn = this.buildHeaderBtn("bi-plus-lg", "New conversation");
            btn.addEventListener("click", () => { this.newSession(); });
            container.appendChild(btn);
        }
        if (this.opts.showClearContext !== false)
        {
            const btn = this.buildHeaderBtn("bi-trash", "Clear context");
            btn.addEventListener("click", () => { this.clearSession(); });
            container.appendChild(btn);
        }
        if (this.opts.showConversationCopy !== false)
        {
            this.appendCopyDropdown(container);
        }
    }

    /**
     * Builds a header action button.
     */
    private buildHeaderBtn(
        iconClass: string, tooltip: string
    ): HTMLElement
    {
        const btn = createElement("button", ["conversation-header-btn"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "title", tooltip);
        setAttr(btn, "aria-label", tooltip);
        const icon = createElement("i", ["bi", iconClass]);
        btn.appendChild(icon);
        return btn;
    }

    /**
     * Appends the copy dropdown to the header actions.
     */
    private appendCopyDropdown(container: HTMLElement): void
    {
        const wrapper = createElement("div", ["conversation-copy-dropdown"]);
        const btn = this.buildHeaderBtn("bi-clipboard", "Copy conversation");
        btn.addEventListener("click", () =>
        {
            menu.classList.toggle("conversation-copy-menu-visible");
        });
        wrapper.appendChild(btn);

        const menu = createElement("div", ["conversation-copy-menu"]);
        setAttr(menu, "role", "menu");
        this.appendCopyMenuItem(menu, "Markdown", "markdown", btn);
        this.appendCopyMenuItem(menu, "HTML", "html", btn);
        this.appendCopyMenuItem(menu, "Plain text", "plaintext", btn);
        wrapper.appendChild(menu);

        document.addEventListener("click", (e) =>
        {
            if (!wrapper.contains(e.target as Node))
            {
                menu.classList.remove("conversation-copy-menu-visible");
            }
        });

        container.appendChild(wrapper);
    }

    /**
     * Appends a single item to the copy dropdown menu.
     */
    private appendCopyMenuItem(
        menu: HTMLElement,
        label: string,
        format: CopyFormat,
        triggerBtn: HTMLElement
    ): void
    {
        const item = createElement("button", ["conversation-copy-menu-item"], label);
        setAttr(item, "type", "button");
        setAttr(item, "role", "menuitem");
        item.addEventListener("click", () =>
        {
            this.copyConversation(format, triggerBtn);
            menu.classList.remove("conversation-copy-menu-visible");
        });
        menu.appendChild(item);
    }

    /**
     * Builds the scrollable message list container.
     */
    private buildMessageList(): void
    {
        this.messageListEl = createElement("div", ["conversation-messages"]);
        setAttr(this.messageListEl, "role", "log");
        setAttr(this.messageListEl, "aria-live", "polite");
        setAttr(this.messageListEl, "aria-relevant", "additions");

        this.messageListEl.addEventListener("scroll", () =>
        {
            this.onMessageListScroll();
        });

        this.buildTypingIndicator();
        this.rootEl!.appendChild(this.messageListEl);
    }

    /**
     * Builds the typing indicator element.
     */
    private buildTypingIndicator(): void
    {
        this.typingEl = createElement("div", ["conversation-typing-indicator"]);
        setAttr(this.typingEl, "role", "status");
        setAttr(this.typingEl, "aria-label",
            this.opts.typingIndicatorText || DEFAULT_TYPING_TEXT);

        const dots = createElement("div", ["conversation-typing-dots"]);
        dots.appendChild(createElement("span", []));
        dots.appendChild(createElement("span", []));
        dots.appendChild(createElement("span", []));
        this.typingEl.appendChild(dots);

        const text = createElement("span", ["conversation-typing-text"],
            this.opts.typingIndicatorText || DEFAULT_TYPING_TEXT);
        this.typingEl.appendChild(text);

        this.messageListEl!.appendChild(this.typingEl);
    }

    /**
     * Builds the input area with textarea and send button.
     */
    private buildInputArea(): void
    {
        this.inputAreaEl = createElement("div", ["conversation-input-area"]);
        const wrapper = createElement("div", ["conversation-input-wrapper"]);

        this.buildTextarea();
        this.buildSendButton();

        wrapper.appendChild(this.textareaEl!);
        wrapper.appendChild(this.sendBtnEl!);
        this.inputAreaEl.appendChild(wrapper);
        this.rootEl!.appendChild(this.inputAreaEl);
    }

    /**
     * Builds and configures the message input textarea.
     */
    private buildTextarea(): void
    {
        this.textareaEl = document.createElement("textarea");
        this.textareaEl.classList.add("conversation-textarea");
        this.textareaEl.rows = 1;
        this.textareaEl.placeholder =
            this.opts.placeholder || DEFAULT_PLACEHOLDER;
        setAttr(this.textareaEl, "aria-label", "Message input");

        this.textareaEl.addEventListener("keydown", (e) =>
        {
            this.onTextareaKeydown(e);
        });
        this.textareaEl.addEventListener("input", () =>
        {
            this.autoResizeTextarea();
            this.updateSendButtonState();
        });
    }

    /**
     * Builds and configures the send button.
     */
    private buildSendButton(): void
    {
        this.sendBtnEl = createElement("button", ["conversation-send-btn"]);
        setAttr(this.sendBtnEl, "type", "button");
        setAttr(this.sendBtnEl, "aria-label", "Send message");
        setAttr(this.sendBtnEl, "disabled", "true");
        const sendIcon = createElement("i", ["bi", "bi-send"]);
        this.sendBtnEl.appendChild(sendIcon);
        this.sendBtnEl.addEventListener("click", () =>
        {
            this.onSendClick();
        });
    }

    /**
     * Builds the feedback modal overlay (shared, repositioned per use).
     */
    private buildFeedbackModal(): void
    {
        this.feedbackModalEl = createElement("div",
            ["conversation-feedback-modal"]);

        const content = createElement("div",
            ["conversation-feedback-content"]);
        const heading = createElement("h4", [], "Provide feedback");
        content.appendChild(heading);

        this.feedbackTextareaEl = document.createElement("textarea");
        this.feedbackTextareaEl.classList.add(
            "conversation-feedback-textarea");
        this.feedbackTextareaEl.rows = 3;
        this.feedbackTextareaEl.placeholder =
            "What could be improved? (optional)";
        content.appendChild(this.feedbackTextareaEl);

        content.appendChild(this.buildFeedbackActions());
        this.feedbackModalEl.appendChild(content);
        this.rootEl!.appendChild(this.feedbackModalEl);
    }

    /**
     * Builds the cancel/submit action buttons for the feedback modal.
     */
    private buildFeedbackActions(): HTMLElement
    {
        const actions = createElement("div",
            ["conversation-feedback-modal-actions"]);
        const cancelBtn = createElement("button",
            ["conversation-feedback-cancel"], "Cancel");
        setAttr(cancelBtn, "type", "button");
        cancelBtn.addEventListener("click", () =>
        {
            this.closeFeedbackModal();
        });
        const submitBtn = createElement("button",
            ["conversation-feedback-submit"], "Submit");
        setAttr(submitBtn, "type", "button");
        submitBtn.addEventListener("click", () =>
        {
            this.submitFeedback();
        });
        actions.appendChild(cancelBtn);
        actions.appendChild(submitBtn);
        return actions;
    }

    // ========================================================================
    // PRIVATE — MESSAGE RENDERING
    // ========================================================================

    /**
     * Renders all messages from the current session.
     */
    private renderInitialMessages(): void
    {
        for (const msg of this.session.messages)
        {
            if (msg.role === "error" && msg.metadata?.errorDetail)
            {
                this.renderErrorBubble(
                    msg, msg.metadata.errorDetail as ConversationError);
            }
            else
            {
                this.renderMessage(msg);
            }
        }
    }

    /**
     * Renders a single message and appends to the message list.
     */
    private renderMessage(msg: ConversationMessage): void
    {
        if (!this.messageListEl) { return; }

        let bubble: HTMLElement;
        switch (msg.role)
        {
            case "user":
                bubble = this.buildUserBubble(msg);
                break;
            case "assistant":
                bubble = this.buildAssistantBubble(msg);
                break;
            case "system":
                bubble = this.buildSystemBubble(msg);
                break;
            default:
                bubble = this.buildSystemBubble(msg);
                break;
        }

        this.messageElements.set(msg.id, bubble);
        this.messageListEl.insertBefore(bubble, this.typingEl);
        this.renderMcpAppIfPresent(bubble, msg);
        this.autoScrollMessages();
    }

    /**
     * Builds a user message bubble.
     */
    private buildUserBubble(msg: ConversationMessage): HTMLElement
    {
        const bubble = this.buildMessageShell(msg, "user");
        const content = createElement("div",
            ["conversation-message-content"]);
        content.textContent = msg.content;
        bubble.querySelector(".conversation-message-body")!
            .appendChild(content);
        return bubble;
    }

    /**
     * Builds an assistant message bubble with Vditor-rendered content.
     */
    private buildAssistantBubble(msg: ConversationMessage): HTMLElement
    {
        const bubble = this.buildMessageShell(msg, "assistant");
        const content = createElement("div",
            ["conversation-message-content"]);
        this.renderAssistantContent(content, msg.content);
        const body = bubble.querySelector(
            ".conversation-message-body") as HTMLElement;
        body.appendChild(content);
        this.appendMessageActions(body, msg);
        return bubble;
    }

    /**
     * Builds a system message bubble.
     */
    private buildSystemBubble(msg: ConversationMessage): HTMLElement
    {
        const bubble = createElement("div",
            ["conversation-message", "conversation-message-system"]);
        setAttr(bubble, "role", "article");
        setAttr(bubble, "aria-label", "System message");
        const content = createElement("div",
            ["conversation-message-content"]);
        content.textContent = msg.content;
        bubble.appendChild(content);
        return bubble;
    }

    /**
     * Builds the common message shell (avatar + header).
     */
    private buildMessageShell(
        msg: ConversationMessage, role: "user" | "assistant"
    ): HTMLElement
    {
        const bubble = createElement("div",
            ["conversation-message", `conversation-message-${role}`]);
        setAttr(bubble, "role", "article");
        setAttr(bubble, "data-message-id", msg.id);
        setAttr(bubble, "aria-label",
            this.buildMessageAriaLabel(msg, role));

        const avatar = this.buildAvatar(role);
        bubble.appendChild(avatar);

        const body = createElement("div", ["conversation-message-body"]);
        body.appendChild(this.buildMessageHeader(msg, role));
        bubble.appendChild(body);

        return bubble;
    }

    /**
     * Builds the message header with name and optional timestamp.
     */
    private buildMessageHeader(
        msg: ConversationMessage, role: "user" | "assistant"
    ): HTMLElement
    {
        const header = createElement("div",
            ["conversation-message-header"]);
        const name = role === "user"
            ? (this.opts.userDisplayName || DEFAULT_USER_NAME)
            : (this.opts.assistantDisplayName || DEFAULT_ASSISTANT_NAME);
        const nameEl = createElement("span",
            ["conversation-message-name"], name);
        header.appendChild(nameEl);

        if (this.opts.showTimestamps)
        {
            const timeEl = createElement("span",
                ["conversation-message-time"],
                formatTime(msg.timestamp));
            header.appendChild(timeEl);
        }
        return header;
    }

    /**
     * Builds an avatar element for a message.
     */
    private buildAvatar(role: "user" | "assistant"): HTMLElement
    {
        const avatar = createElement("div",
            ["conversation-message-avatar"]);
        const iconStr = role === "user"
            ? (this.opts.userAvatar || DEFAULT_USER_AVATAR)
            : (this.opts.assistantAvatar || DEFAULT_ASSISTANT_AVATAR);

        if (isIconClass(iconStr))
        {
            const icon = createElement("i", ["bi", iconStr]);
            avatar.appendChild(icon);
        }
        else
        {
            const img = document.createElement("img");
            img.src = iconStr;
            setAttr(img as unknown as HTMLElement, "alt", role);
            avatar.appendChild(img);
        }
        return avatar;
    }

    /**
     * Renders markdown content into a container using Vditor.preview().
     */
    private renderAssistantContent(
        container: HTMLElement, markdown: string
    ): void
    {
        if (!markdown)
        {
            container.textContent = "";
            return;
        }
        const VditorClass = (window as any).Vditor;
        if (VditorClass && typeof VditorClass.preview === "function")
        {
            VditorClass.preview(container, markdown,
                this.getVditorPreviewConfig());
        }
        else
        {
            container.textContent = markdown;
            console.warn(LOG_PREFIX,
                "Vditor not available — showing raw markdown");
        }
    }

    /**
     * Returns the Vditor preview configuration for assistant messages.
     */
    private getVditorPreviewConfig(): Record<string, unknown>
    {
        return {
            mode: "light",
            hljs: { enable: true, style: "github", lineNumber: false },
            markdown: {
                toc: false, mark: true,
                footnotes: true, autoSpace: true, sanitize: true,
            },
            math: { engine: "KaTeX" },
            after: () =>
            {
                console.debug(LOG_PREFIX, "Assistant content rendered");
            },
        };
    }

    /**
     * Appends action buttons (feedback + copy) to a message body.
     */
    private appendMessageActions(
        body: HTMLElement, msg: ConversationMessage
    ): void
    {
        const actions = createElement("div",
            ["conversation-message-actions"]);

        if (this.opts.showFeedback !== false)
        {
            this.appendFeedbackButtons(actions, msg);
        }
        if (this.opts.showMessageCopy !== false)
        {
            this.appendMessageCopyBtn(actions, msg);
        }
        body.appendChild(actions);
    }

    /**
     * Appends thumbs-up/down feedback buttons.
     */
    private appendFeedbackButtons(
        container: HTMLElement, msg: ConversationMessage
    ): void
    {
        const upBtn = this.buildActionBtn(
            "bi-hand-thumbs-up", "Rate as helpful");
        upBtn.addEventListener("click", () =>
        {
            this.onFeedbackClick(msg.id, "positive", upBtn, downBtn);
        });
        if (msg.feedback?.sentiment === "positive")
        {
            upBtn.classList.add("conversation-feedback-active");
        }

        const downBtn = this.buildActionBtn(
            "bi-hand-thumbs-down", "Rate as unhelpful");
        downBtn.classList.add("conversation-feedback-negative");
        downBtn.addEventListener("click", () =>
        {
            this.onFeedbackClick(msg.id, "negative", downBtn, upBtn);
        });
        if (msg.feedback?.sentiment === "negative")
        {
            downBtn.classList.add("conversation-feedback-active");
        }

        container.appendChild(upBtn);
        container.appendChild(downBtn);
    }

    /**
     * Appends a copy button to a message's action bar.
     */
    private appendMessageCopyBtn(
        container: HTMLElement, msg: ConversationMessage
    ): void
    {
        const btn = this.buildActionBtn("bi-clipboard", "Copy message");
        btn.addEventListener("click", () =>
        {
            this.copyMessage(msg.id, "markdown", btn);
        });
        container.appendChild(btn);
    }

    /**
     * Builds a small action button for message actions.
     */
    private buildActionBtn(
        iconClass: string, tooltip: string
    ): HTMLElement
    {
        const btn = createElement("button", ["conversation-action-btn"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "title", tooltip);
        setAttr(btn, "aria-label", tooltip);
        const icon = createElement("i", ["bi", iconClass]);
        btn.appendChild(icon);
        return btn;
    }

    // ========================================================================
    // PRIVATE — ERROR RENDERING
    // ========================================================================

    /**
     * Renders an error message bubble with expandable details.
     */
    private renderErrorBubble(
        msg: ConversationMessage, error: ConversationError
    ): void
    {
        if (!this.messageListEl) { return; }

        const bubble = createElement("div",
            ["conversation-message", "conversation-message-error"]);
        setAttr(bubble, "role", "article");
        setAttr(bubble, "data-message-id", msg.id);
        setAttr(bubble, "aria-label", "Error: " + error.title);

        const body = createElement("div", ["conversation-message-body"]);
        const content = createElement("div",
            ["conversation-message-content"]);
        const errorEl = this.buildErrorContent(error);
        content.appendChild(errorEl);
        body.appendChild(content);
        bubble.appendChild(body);

        this.messageElements.set(msg.id, bubble);
        this.messageListEl.insertBefore(bubble, this.typingEl);
        this.autoScrollMessages();
    }

    /**
     * Builds the structured error content element.
     */
    private buildErrorContent(error: ConversationError): HTMLElement
    {
        const el = createElement("div", ["conversation-error"]);

        const summary = createElement("div",
            ["conversation-error-summary"]);
        const icon = createElement("i",
            ["bi", "bi-exclamation-triangle-fill"]);
        summary.appendChild(icon);
        const titleEl = createElement("span",
            ["conversation-error-title"], error.title);
        summary.appendChild(titleEl);
        el.appendChild(summary);

        const msgEl = createElement("p",
            ["conversation-error-message"], error.message);
        el.appendChild(msgEl);

        if (error.suggestion)
        {
            const sugEl = createElement("p",
                ["conversation-error-suggestion"], error.suggestion);
            el.appendChild(sugEl);
        }

        this.appendErrorDetails(el, error);
        return el;
    }

    /**
     * Appends expandable technical details to an error element.
     */
    private appendErrorDetails(
        el: HTMLElement, error: ConversationError
    ): void
    {
        if (!error.technicalDetail && !error.errorCode && !error.correlationId)
        {
            return;
        }
        const details = document.createElement("details");
        details.classList.add("conversation-error-details");
        const summaryEl = document.createElement("summary");
        summaryEl.textContent = "Technical Details";
        details.appendChild(summaryEl);

        let techText = "";
        if (error.errorCode)
        {
            techText += `Error Code: ${error.errorCode}\n`;
        }
        if (error.correlationId)
        {
            techText += `Correlation ID: ${error.correlationId}\n`;
        }
        if (error.technicalDetail)
        {
            techText += `\n${error.technicalDetail}`;
        }
        const pre = createElement("pre",
            ["conversation-error-technical"]);
        pre.textContent = techText.trim();
        details.appendChild(pre);
        el.appendChild(details);
    }

    // ========================================================================
    // PRIVATE — MCP APP RENDERING
    // ========================================================================

    /**
     * Checks a message for MCP app content and renders it inline.
     */
    private renderMcpAppIfPresent(
        bubble: HTMLElement, msg: ConversationMessage
    ): void
    {
        if (!this.opts.enableMcpApps) { return; }
        if (!msg.metadata?.mcpApp) { return; }

        const config = msg.metadata.mcpApp as McpAppConfig;
        if (config.displayMode === "canvas")
        {
            this.openCanvas(config);
            return;
        }
        this.renderMcpAppInline(bubble, msg.id, config);
    }

    /**
     * Renders an MCP App iframe inline within a message bubble.
     */
    private renderMcpAppInline(
        bubble: HTMLElement, msgId: string, config: McpAppConfig
    ): void
    {
        const body = bubble.querySelector(
            ".conversation-message-body") as HTMLElement;
        if (!body) { return; }

        const frame = createElement("div", ["conversation-mcp-frame"]);
        const height = config.preferredHeight || DEFAULT_MCP_INLINE_HEIGHT;
        frame.style.maxHeight = `${height}px`;

        const appFrame = new McpAppFrame(config, frame,
            this.handleMcpMessage.bind(this));
        this.mcpFrames.set(msgId, appFrame);

        if (this.opts.showCanvas)
        {
            frame.appendChild(this.buildExpandButton(msgId, config));
        }
        body.appendChild(frame);
        console.debug(LOG_PREFIX, "MCP app inline:", appFrame.appId);
    }

    /**
     * Builds the "expand to canvas" button for an inline MCP frame.
     */
    private buildExpandButton(
        msgId: string, config: McpAppConfig
    ): HTMLElement
    {
        const btn = createElement("button",
            ["conversation-mcp-expand-btn"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "title", "Expand to canvas");
        setAttr(btn, "aria-label", "Expand app to canvas panel");
        const icon = createElement("i",
            ["bi", "bi-box-arrow-up-right"]);
        btn.appendChild(icon);
        btn.addEventListener("click", () =>
        {
            this.expandToCanvas(msgId, config);
        });
        return btn;
    }

    /**
     * Expands an inline MCP app to the canvas side panel.
     */
    private expandToCanvas(
        msgId: string, config: McpAppConfig
    ): void
    {
        if (this.expandedMsgId)
        {
            this.restoreInlineFrame(this.expandedMsgId);
        }
        const inlineFrame = this.mcpFrames.get(msgId);
        if (inlineFrame)
        {
            const iframe = inlineFrame.getIframe();
            if (iframe) { iframe.style.display = "none"; }
        }
        this.expandedMsgId = msgId;
        this.openCanvas(config);
    }

    /**
     * Restores a previously expanded inline frame to visible.
     */
    private restoreInlineFrame(msgId: string): void
    {
        const frame = this.mcpFrames.get(msgId);
        if (frame)
        {
            const iframe = frame.getIframe();
            if (iframe) { iframe.style.display = ""; }
        }
    }

    /**
     * Handles a JSON-RPC message from any MCP app guest.
     */
    private handleMcpMessage(
        appId: string, method: string, params: unknown
    ): void
    {
        if (method === "mcp.error")
        {
            console.error(LOG_PREFIX, "MCP app error:", appId, params);
            return;
        }
        if (this.opts.onMcpAppMessage)
        {
            this.opts.onMcpAppMessage(appId, method, params);
        }
    }

    /**
     * Destroys all active MCP App frames and the canvas frame.
     */
    private destroyAllMcpFrames(): void
    {
        for (const [, frame] of this.mcpFrames)
        {
            frame.destroy();
        }
        this.mcpFrames.clear();
        if (this.canvasFrame)
        {
            this.canvasFrame.destroy();
            this.canvasFrame = null;
        }
    }

    // ========================================================================
    // PRIVATE — CANVAS SIDE PANEL
    // ========================================================================

    /**
     * Builds the canvas panel DOM when showCanvas is enabled.
     * Called from buildDOM() after the main conversation DOM is built.
     */
    private buildCanvasDOM(): void
    {
        if (!this.opts.showCanvas || !this.rootEl) { return; }

        this.canvasWidth = this.opts.canvasWidth || DEFAULT_CANVAS_WIDTH;
        this.wrapperEl = createElement("div",
            ["conversation-with-canvas"]);
        this.wrapperEl.style.height = this.opts.height || "100%";
        this.wrapperEl.style.width = this.opts.width || "100%";

        this.wrapperEl.appendChild(this.rootEl);

        this.canvasHandleEl = createElement("div",
            ["conversation-canvas-handle"]);
        setAttr(this.canvasHandleEl, "role", "separator");
        setAttr(this.canvasHandleEl, "aria-orientation", "vertical");
        setAttr(this.canvasHandleEl, "aria-label", "Resize canvas panel");
        setAttr(this.canvasHandleEl, "tabindex", "0");
        this.wrapperEl.appendChild(this.canvasHandleEl);

        this.canvasEl = createElement("div",
            ["conversation-canvas", "conversation-canvas--hidden"]);
        setAttr(this.canvasEl, "role", "complementary");
        setAttr(this.canvasEl, "aria-label", "MCP App Canvas");
        this.canvasEl.style.width = `${this.canvasWidth}px`;

        this.canvasHeaderEl = this.buildCanvasHeader();
        this.canvasEl.appendChild(this.canvasHeaderEl);

        this.canvasBodyEl = createElement("div",
            ["conversation-canvas-body"]);
        this.canvasEl.appendChild(this.canvasBodyEl);

        this.wrapperEl.appendChild(this.canvasEl);
        this.attachCanvasResizeHandler();
        this.attachCanvasKeyHandler();
    }

    /**
     * Builds the canvas panel header with title and close button.
     */
    private buildCanvasHeader(): HTMLElement
    {
        const header = createElement("div",
            ["conversation-canvas-header"]);
        const title = createElement("span",
            ["conversation-canvas-title"], "App");
        header.appendChild(title);

        const closeBtn = createElement("button",
            ["conversation-canvas-close"]);
        setAttr(closeBtn, "type", "button");
        setAttr(closeBtn, "aria-label", "Close canvas panel");
        const icon = createElement("i", ["bi", "bi-x-lg"]);
        closeBtn.appendChild(icon);
        closeBtn.addEventListener("click", () =>
        {
            this.hideCanvasPanel();
        });
        header.appendChild(closeBtn);
        return header;
    }

    /**
     * Renders MCP App content into the canvas body.
     */
    private renderCanvasContent(config: McpAppConfig): void
    {
        if (!this.canvasBodyEl) { return; }

        if (this.canvasFrame)
        {
            this.canvasFrame.destroy();
            this.canvasFrame = null;
        }

        while (this.canvasBodyEl.firstChild)
        {
            this.canvasBodyEl.removeChild(this.canvasBodyEl.firstChild);
        }

        this.canvasFrame = new McpAppFrame(config, this.canvasBodyEl,
            this.handleMcpMessage.bind(this));
        const iframe = this.canvasFrame.getIframe();
        if (iframe)
        {
            iframe.style.height = "100%";
            iframe.style.width = "100%";
        }

        if (this.canvasHeaderEl)
        {
            const titleEl = this.canvasHeaderEl.querySelector(
                ".conversation-canvas-title");
            if (titleEl)
            {
                titleEl.textContent = config.title || "App";
            }
        }
    }

    /**
     * Shows the canvas panel.
     */
    private showCanvasPanel(): void
    {
        if (!this.canvasEl || this.canvasOpen) { return; }
        this.canvasEl.classList.remove("conversation-canvas--hidden");
        if (this.canvasHandleEl)
        {
            this.canvasHandleEl.style.display = "";
        }
        this.canvasOpen = true;
        if (this.opts.onCanvasToggle)
        {
            this.opts.onCanvasToggle(true);
        }
        console.debug(LOG_PREFIX, "Canvas opened");
    }

    /**
     * Hides the canvas panel and restores any expanded inline frame.
     */
    private hideCanvasPanel(): void
    {
        if (!this.canvasEl || !this.canvasOpen) { return; }
        this.canvasEl.classList.add("conversation-canvas--hidden");
        if (this.canvasHandleEl)
        {
            this.canvasHandleEl.style.display = "none";
        }
        this.canvasOpen = false;

        if (this.expandedMsgId)
        {
            this.restoreInlineFrame(this.expandedMsgId);
            this.expandedMsgId = null;
        }

        if (this.canvasFrame)
        {
            this.canvasFrame.destroy();
            this.canvasFrame = null;
        }

        if (this.opts.onCanvasToggle)
        {
            this.opts.onCanvasToggle(false);
        }
        console.debug(LOG_PREFIX, "Canvas closed");
    }

    /**
     * Attaches pointer-capture resize handler to the canvas divider.
     */
    private attachCanvasResizeHandler(): void
    {
        if (!this.canvasHandleEl) { return; }
        this.canvasHandleEl.style.display = "none";

        this.canvasHandleEl.addEventListener("pointerdown", (e) =>
        {
            if (e.button !== 0) { return; }
            e.preventDefault();
            e.stopPropagation();
            this.canvasHandleEl!.setPointerCapture(e.pointerId);

            const startX = e.clientX;
            const startWidth = this.canvasWidth;

            const onMove = (ev: PointerEvent) =>
            {
                this.onCanvasResizeMove(ev, startX, startWidth);
            };
            const onUp = (ev: PointerEvent) =>
            {
                this.canvasHandleEl!.releasePointerCapture(ev.pointerId);
                this.canvasHandleEl!.removeEventListener("pointermove", onMove);
                this.canvasHandleEl!.removeEventListener("pointerup", onUp);
            };
            this.canvasHandleEl!.addEventListener("pointermove", onMove);
            this.canvasHandleEl!.addEventListener("pointerup", onUp);
        });
    }

    /**
     * Processes canvas resize pointer movement.
     */
    private onCanvasResizeMove(
        e: PointerEvent, startX: number, startWidth: number
    ): void
    {
        const dx = startX - e.clientX;
        const minW = this.opts.canvasMinWidth || DEFAULT_CANVAS_MIN_WIDTH;
        const maxFraction = this.opts.canvasMaxWidthFraction
            || DEFAULT_CANVAS_MAX_FRACTION;
        const containerW = this.wrapperEl
            ? this.wrapperEl.clientWidth : 800;
        const maxW = containerW * maxFraction;
        const newW = Math.max(minW, Math.min(maxW, startWidth + dx));
        this.canvasWidth = newW;
        if (this.canvasEl)
        {
            this.canvasEl.style.width = `${newW}px`;
        }
    }

    /**
     * Attaches keyboard handler for canvas Esc close and arrow resize.
     */
    private attachCanvasKeyHandler(): void
    {
        if (!this.canvasHandleEl || !this.canvasEl) { return; }

        this.canvasHandleEl.addEventListener("keydown", (e) =>
        {
            this.onCanvasHandleKeydown(e);
        });

        this.canvasEl.addEventListener("keydown", (e) =>
        {
            if (e.key === "Escape" && this.canvasOpen)
            {
                this.hideCanvasPanel();
            }
        });
    }

    /**
     * Handles keyboard events on the canvas resize handle.
     */
    private onCanvasHandleKeydown(e: KeyboardEvent): void
    {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") { return; }
        e.preventDefault();
        const delta = e.key === "ArrowLeft"
            ? CANVAS_RESIZE_STEP_PX : -CANVAS_RESIZE_STEP_PX;
        const minW = this.opts.canvasMinWidth || DEFAULT_CANVAS_MIN_WIDTH;
        const maxFraction = this.opts.canvasMaxWidthFraction
            || DEFAULT_CANVAS_MAX_FRACTION;
        const containerW = this.wrapperEl
            ? this.wrapperEl.clientWidth : 800;
        const maxW = containerW * maxFraction;
        const newW = Math.max(minW, Math.min(maxW,
            this.canvasWidth + delta));
        this.canvasWidth = newW;
        if (this.canvasEl)
        {
            this.canvasEl.style.width = `${newW}px`;
        }
    }

    // ========================================================================
    // PRIVATE — STREAMING
    // ========================================================================

    /**
     * Creates a StreamHandle for a streaming assistant message.
     */
    private createStreamHandle(msg: ConversationMessage): StreamHandle
    {
        let accumulated = "";
        let state: StreamState = "streaming";

        const handle: StreamHandle = {
            messageId: msg.id,

            appendChunk: (text: string) =>
            {
                if (state !== "streaming") { return; }
                accumulated += text;
                this.onStreamChunk(msg.id, accumulated);
            },

            complete: (metadata?: Record<string, unknown>) =>
            {
                if (state !== "streaming") { return; }
                state = "complete";
                msg.content = accumulated;
                if (metadata)
                {
                    msg.metadata = { ...(msg.metadata || {}), ...metadata };
                }
                this.onStreamComplete(msg.id, accumulated, msg);
                this.activeStream = null;
                this.updateSessionTimestamp();
                this.saveSessionIfCallback();
            },

            error: (message?: string) =>
            {
                if (state !== "streaming") { return; }
                state = "error";
                this.onStreamError(msg.id, message);
                this.activeStream = null;
            },

            getContent: () => accumulated,
            getState: () => state,
        };

        return handle;
    }

    /**
     * Renders the initial streaming message bubble.
     */
    private renderStreamingBubble(msg: ConversationMessage): void
    {
        if (!this.messageListEl) { return; }

        const bubble = this.buildMessageShell(msg, "assistant");
        bubble.classList.add("conversation-message-streaming");
        const content = createElement("div",
            ["conversation-message-content"]);
        bubble.querySelector(".conversation-message-body")!
            .appendChild(content);

        this.messageElements.set(msg.id, bubble);
        this.messageListEl.insertBefore(bubble, this.typingEl);
        this.autoScrollMessages();
    }

    /**
     * Handles a streaming chunk update.
     */
    private onStreamChunk(
        msgId: string, accumulated: string
    ): void
    {
        const bubble = this.messageElements.get(msgId);
        if (!bubble) { return; }
        const content = bubble.querySelector(
            ".conversation-message-content");
        if (content)
        {
            content.textContent = accumulated;
        }
        this.autoScrollMessages();
    }

    /**
     * Handles stream completion — triggers full Vditor render.
     */
    private onStreamComplete(
        msgId: string, finalContent: string,
        msg?: ConversationMessage
    ): void
    {
        const bubble = this.messageElements.get(msgId);
        if (!bubble) { return; }
        bubble.classList.remove("conversation-message-streaming");

        const content = bubble.querySelector(
            ".conversation-message-content") as HTMLElement;
        if (content)
        {
            this.renderAssistantContent(content, finalContent);
        }

        const resolvedMsg = msg
            || this.session.messages.find(m => m.id === msgId);
        if (resolvedMsg)
        {
            const body = bubble.querySelector(
                ".conversation-message-body") as HTMLElement;
            if (body)
            {
                this.appendMessageActions(body, resolvedMsg);
            }
            this.renderMcpAppIfPresent(bubble, resolvedMsg);
        }

        this.autoScrollMessages();
        console.debug(LOG_PREFIX, "Stream complete:", msgId);
    }

    /**
     * Handles a stream error.
     */
    private onStreamError(
        msgId: string, message?: string
    ): void
    {
        const bubble = this.messageElements.get(msgId);
        if (!bubble) { return; }
        bubble.classList.remove("conversation-message-streaming");
        bubble.classList.add("conversation-message-error");

        const content = bubble.querySelector(
            ".conversation-message-content") as HTMLElement;
        if (content)
        {
            content.textContent = "";
            const errEl = this.buildErrorContent({
                title: "Response failed",
                message: message || "An error occurred during streaming.",
                suggestion: "Try sending your message again.",
            });
            content.appendChild(errEl);
        }
        console.error(LOG_PREFIX, "Stream error:", msgId, message);
    }

    /**
     * Stops the active stream if any.
     */
    private stopStream(): void
    {
        if (this.activeStream)
        {
            this.activeStream.complete();
            this.activeStream = null;
        }
    }

    // ========================================================================
    // PRIVATE — INPUT HANDLING
    // ========================================================================

    /**
     * Handles keydown on the input textarea.
     */
    private onTextareaKeydown(e: KeyboardEvent): void
    {
        if (e.key === "Enter" && !e.shiftKey)
        {
            e.preventDefault();
            this.onSendClick();
        }
    }

    /**
     * Handles the send button click.
     */
    private onSendClick(): void
    {
        if (!this.textareaEl || this.opts.disabled) { return; }

        const text = this.textareaEl.value.trim();
        if (!text) { return; }
        if (this.activeStream)
        {
            console.warn(LOG_PREFIX,
                "Cannot send while streaming — wait for completion");
            return;
        }

        this.addUserMessage(text);
        this.textareaEl.value = "";
        this.autoResizeTextarea();
        this.updateSendButtonState();
        this.focus();

        if (this.opts.onSendMessage)
        {
            this.opts.onSendMessage(text, this.getSession());
        }
    }

    /**
     * Auto-resizes the textarea to fit content up to max-height.
     */
    private autoResizeTextarea(): void
    {
        if (!this.textareaEl) { return; }
        this.textareaEl.style.height = "auto";
        this.textareaEl.style.height = this.textareaEl.scrollHeight + "px";
    }

    /**
     * Updates the send button's disabled state.
     */
    private updateSendButtonState(): void
    {
        if (!this.sendBtnEl || !this.textareaEl) { return; }
        const hasText = this.textareaEl.value.trim().length > 0;
        const canSend = hasText && !this.opts.disabled && !this.activeStream;

        if (canSend)
        {
            this.sendBtnEl.removeAttribute("disabled");
        }
        else
        {
            setAttr(this.sendBtnEl, "disabled", "true");
        }
    }

    // ========================================================================
    // PRIVATE — SCROLLING
    // ========================================================================

    /**
     * Auto-scrolls the message list to the bottom if enabled.
     */
    private autoScrollMessages(): void
    {
        if (!this.messageListEl || !this.autoScrollEnabled)
        {
            return;
        }
        this.messageListEl.scrollTop = this.messageListEl.scrollHeight;
    }

    /**
     * Handles scroll events to detect user-initiated scroll-up.
     */
    private onMessageListScroll(): void
    {
        if (!this.messageListEl) { return; }
        const threshold = 5;
        const atBottom =
            this.messageListEl.scrollHeight - this.messageListEl.scrollTop
            - this.messageListEl.clientHeight <= threshold;
        this.autoScrollEnabled = atBottom;
    }

    // ========================================================================
    // PRIVATE — FEEDBACK
    // ========================================================================

    /**
     * Handles a feedback button click.
     */
    private onFeedbackClick(
        msgId: string,
        sentiment: FeedbackSentiment,
        clickedBtn: HTMLElement,
        otherBtn: HTMLElement
    ): void
    {
        const isActive = clickedBtn.classList.contains(
            "conversation-feedback-active");

        if (isActive)
        {
            clickedBtn.classList.remove("conversation-feedback-active");
            this.removeFeedback(msgId);
            return;
        }

        clickedBtn.classList.add("conversation-feedback-active");
        otherBtn.classList.remove("conversation-feedback-active");

        this.feedbackTargetMsgId = msgId;
        this.feedbackTargetSentiment = sentiment;
        this.showFeedbackModal();
    }

    /**
     * Shows the feedback comment modal.
     */
    private showFeedbackModal(): void
    {
        if (this.feedbackModalEl && this.feedbackTextareaEl)
        {
            this.feedbackTextareaEl.value = "";
            this.feedbackModalEl.classList.add(
                "conversation-feedback-modal-visible");
            this.feedbackTextareaEl.focus();
        }
    }

    /**
     * Closes the feedback comment modal.
     */
    private closeFeedbackModal(): void
    {
        if (this.feedbackModalEl)
        {
            this.feedbackModalEl.classList.remove(
                "conversation-feedback-modal-visible");
        }
        this.feedbackTargetMsgId = null;
        this.feedbackTargetSentiment = null;
    }

    /**
     * Submits feedback from the modal.
     */
    private submitFeedback(): void
    {
        if (!this.feedbackTargetMsgId || !this.feedbackTargetSentiment)
        {
            this.closeFeedbackModal();
            return;
        }

        const comment = this.feedbackTextareaEl?.value.trim() || undefined;
        const feedback: FeedbackData = {
            sentiment: this.feedbackTargetSentiment,
            comment,
            timestamp: new Date(),
        };

        this.applyFeedbackToMessage(this.feedbackTargetMsgId, feedback);
        this.closeFeedbackModal();
    }

    /**
     * Applies feedback to a message and fires the callback.
     */
    private applyFeedbackToMessage(
        msgId: string, feedback: FeedbackData
    ): void
    {
        const msg = this.session.messages.find(m => m.id === msgId);
        if (msg)
        {
            msg.feedback = feedback;
        }
        if (this.opts.onFeedback)
        {
            this.opts.onFeedback(msgId, feedback, this.getSession());
        }
        console.debug(LOG_PREFIX, "Feedback submitted:", msgId,
            feedback.sentiment);
    }

    /**
     * Removes feedback from a message.
     */
    private removeFeedback(msgId: string): void
    {
        const msg = this.session.messages.find(m => m.id === msgId);
        if (msg)
        {
            delete msg.feedback;
        }
        console.debug(LOG_PREFIX, "Feedback removed:", msgId);
    }

    // ========================================================================
    // PRIVATE — COPY FORMATTING
    // ========================================================================

    /**
     * Formats a single message for clipboard copy.
     */
    private formatMessageForCopy(
        msg: ConversationMessage, format: CopyFormat
    ): string
    {
        switch (format)
        {
            case "markdown":
                return this.formatMsgMarkdown(msg);
            case "html":
                return this.formatMsgHTML(msg);
            case "plaintext":
                return this.formatMsgPlaintext(msg);
            default:
                return msg.content;
        }
    }

    /**
     * Formats a message as Markdown.
     */
    private formatMsgMarkdown(msg: ConversationMessage): string
    {
        if (msg.role === "assistant")
        {
            return msg.content;
        }
        return msg.content;
    }

    /**
     * Formats a message as HTML.
     */
    private formatMsgHTML(msg: ConversationMessage): string
    {
        if (msg.role === "assistant")
        {
            const el = this.messageElements.get(msg.id);
            const contentEl = el?.querySelector(
                ".conversation-message-content");
            if (contentEl)
            {
                return sanitiseHTML(contentEl.innerHTML);
            }
        }
        return `<p>${this.escapeHTML(msg.content)}</p>`;
    }

    /**
     * Formats a message as plain text.
     */
    private formatMsgPlaintext(msg: ConversationMessage): string
    {
        if (msg.role === "assistant")
        {
            const el = this.messageElements.get(msg.id);
            const contentEl = el?.querySelector(
                ".conversation-message-content");
            if (contentEl)
            {
                return contentEl.textContent || msg.content;
            }
        }
        return msg.content;
    }

    /**
     * Formats the entire conversation for clipboard copy.
     */
    private formatConversationForCopy(format: CopyFormat): string
    {
        const parts: string[] = [];
        for (const msg of this.session.messages)
        {
            const name = this.getDisplayName(msg.role);
            const text = this.formatMessageForCopy(msg, format);
            parts.push(`${name}: ${text}`);
        }
        return parts.join("\n\n");
    }

    /**
     * Returns the display name for a role.
     */
    private getDisplayName(role: ConversationRole): string
    {
        switch (role)
        {
            case "user":
                return this.opts.userDisplayName || DEFAULT_USER_NAME;
            case "assistant":
                return this.opts.assistantDisplayName
                    || DEFAULT_ASSISTANT_NAME;
            case "system":
                return "System";
            case "error":
                return "Error";
            default:
                return "Unknown";
        }
    }

    /**
     * Escapes HTML special characters in a string.
     */
    private escapeHTML(text: string): string
    {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // ========================================================================
    // PRIVATE — SESSION MANAGEMENT
    // ========================================================================

    /**
     * Enforces the maxMessages buffer limit.
     */
    private evictOldMessages(): void
    {
        const max = this.opts.maxMessages || 0;
        if (max <= 0) { return; }

        while (this.session.messages.length > max)
        {
            const oldest = this.session.messages.shift();
            if (oldest)
            {
                const el = this.messageElements.get(oldest.id);
                if (el) { el.remove(); }
                this.messageElements.delete(oldest.id);
            }
        }
    }

    /**
     * Fires the onSaveSession callback if provided.
     */
    private saveSessionIfCallback(): void
    {
        if (this.opts.onSaveSession)
        {
            try
            {
                this.opts.onSaveSession(this.getSession());
            }
            catch (err)
            {
                console.error(LOG_PREFIX, "onSaveSession failed:", err);
            }
        }
    }

    /**
     * Updates the session's updatedAt timestamp.
     */
    private updateSessionTimestamp(): void
    {
        this.session.updatedAt = new Date();
    }

    /**
     * Creates a default empty session.
     */
    private createDefaultSession(): ConversationSession
    {
        const now = new Date();
        return {
            id: generateSessionId(),
            title: this.opts.title || DEFAULT_TITLE,
            messages: [],
            createdAt: now,
            updatedAt: now,
        };
    }

    /**
     * Creates a ConversationMessage object.
     */
    private createMessage(
        role: ConversationRole, content: string
    ): ConversationMessage
    {
        return {
            id: generateMessageId(),
            role,
            content,
            timestamp: new Date(),
        };
    }

    /**
     * Formats error detail into a plain-text content string.
     */
    private formatErrorContent(error: ConversationError): string
    {
        let text = `${error.title}: ${error.message}`;
        if (error.suggestion)
        {
            text += ` ${error.suggestion}`;
        }
        return text;
    }

    // ========================================================================
    // PRIVATE — DOM HELPERS
    // ========================================================================

    /**
     * Clears all messages from the DOM.
     */
    private clearMessageList(): void
    {
        for (const [, el] of this.messageElements)
        {
            el.remove();
        }
        this.messageElements.clear();
    }

    /**
     * Updates the title display in the header.
     */
    private updateTitleDisplay(): void
    {
        if (this.titleEl)
        {
            this.titleEl.textContent =
                this.opts.title || this.session.title || DEFAULT_TITLE;
        }
    }

    /**
     * Applies the size class to the root element.
     */
    private applySizeClass(): void
    {
        if (!this.rootEl) { return; }
        const size = this.opts.size || "md";
        if (size !== "md")
        {
            this.rootEl.classList.add(`conversation-${size}`);
        }
    }

    /**
     * Applies height/width dimensions to the root element.
     */
    private applyDimensions(): void
    {
        if (!this.rootEl) { return; }
        this.rootEl.style.height = this.opts.height || "100%";
        this.rootEl.style.width = this.opts.width || "100%";
    }

    /**
     * Applies any custom CSS classes to the root element.
     */
    private applyCssClass(): void
    {
        if (!this.rootEl || !this.opts.cssClass) { return; }
        const classes = this.opts.cssClass.split(/\s+/);
        for (const cls of classes)
        {
            if (cls) { this.rootEl.classList.add(cls); }
        }
    }

    /**
     * Builds an ARIA label for a message.
     */
    private buildMessageAriaLabel(
        msg: ConversationMessage, role: "user" | "assistant"
    ): string
    {
        const name = role === "user"
            ? (this.opts.userDisplayName || DEFAULT_USER_NAME)
            : (this.opts.assistantDisplayName || DEFAULT_ASSISTANT_NAME);
        const time = formatTime(msg.timestamp);
        return `${name} at ${time}`;
    }
}

// ============================================================================
// S6 — CONVENIENCE FUNCTIONS & GLOBAL EXPORTS
// ============================================================================

/**
 * Creates a conversation, shows it in the given container, and returns
 * the instance.
 *
 * @param options - Configuration for the conversation.
 * @param container - Element ID string or HTMLElement.
 */
export function createConversation(
    options?: ConversationOptions,
    container?: string | HTMLElement
): Conversation
{
    const conv = new Conversation(options);
    conv.show(container);
    return conv;
}

// -- Global exports for script-tag usage --

if (typeof window !== "undefined")
{
    (window as any).Conversation = Conversation;
    (window as any).createConversation = createConversation;
}
