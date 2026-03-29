/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: HelpDrawer
 * 📜 PURPOSE: Right-side sliding panel for in-context documentation.
 *             Singleton per page — renders markdown via marked,
 *             supports history navigation, drag-to-resize, and keyboard.
 * 🔗 RELATES: [[EnterpriseTheme]], [[PropertyInspector]], [[MarkdownEditor]]
 * ⚡ FLOW: [Consumer] -> [createHelpDrawer()] -> [Drawer Panel]
 * 🔒 SECURITY: Markdown rendered via marked.parse() with HTML sanitisation.
 *    Falls back to textContent when marked unavailable.
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[HelpDrawer]";
function logInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...args);
}

function logWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...args);
}

function logError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...args);
}

function logDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...args);
}

const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DRAWER_Z_INDEX = 1060;

// ============================================================================
// SINGLETON STATE
// ============================================================================

let singletonInstance: HelpDrawerHandle | null = null;

// ============================================================================
// INTERFACES
// ============================================================================

/** A documentation topic to display in the drawer. */
export interface HelpTopic
{
    /** Unique topic identifier. */
    readonly id: string;
    /** Displayed in header bar. */
    readonly title: string;
    /** Inline markdown content (mutually exclusive with url). */
    readonly markdown?: string;
    /** URL to fetch markdown content from. */
    readonly url?: string;
}

/** Configuration for the HelpDrawer component. */
export interface HelpDrawerOptions
{
    /** Initial drawer width in px. Default: 400. */
    readonly width?: number;
    /** Minimum resize width in px. Default: 280. */
    readonly minWidth?: number;
    /** Maximum resize width in px. Default: 600. */
    readonly maxWidth?: number;
    /** Called when the drawer closes. */
    readonly onClose?: () => void;
    /** Called when a documentation link is followed. */
    readonly onNavigate?: (url: string) => void;
}

/** Public handle for controlling the HelpDrawer. */
export interface HelpDrawerHandle
{
    open(topic: HelpTopic): void;
    close(): void;
    isOpen(): boolean;
    back(): void;
    canGoBack(): boolean;
    getElement(): HTMLElement;
    destroy(): void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className) { el.className = className; }
    return el;
}

function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [key, value] of Object.entries(attrs))
    {
        el.setAttribute(key, value);
    }
}

// ============================================================================
// MARKDOWN RENDERER PROBE
// ============================================================================

// @dependency: markdownrenderer (window.createMarkdownRenderer)

interface MdRendererHandle
{
    render: (md: string, target: HTMLElement) => void;
    toHtml: (md: string) => string;
}

type MdRendererFactory = () => MdRendererHandle;

/** Get or create the shared markdown renderer. */
function getMdRenderer(): MdRendererHandle | null
{
    const factory = (window as unknown as Record<string, unknown>)
        ["createMarkdownRenderer"] as MdRendererFactory | undefined;
    if (typeof factory === "function")
    {
        return factory();
    }
    return null;
}

// ============================================================================
// HELP DRAWER CLASS
// ============================================================================

/**
 * Singleton right-side drawer for displaying documentation content.
 * Manages topic history, markdown rendering via marked, and drag-to-resize.
 */
class HelpDrawer
{
    private readonly options: HelpDrawerOptions;

    private width: number;
    private minW: number;
    private maxW: number;
    private isOpen_ = false;
    private destroyed = false;

    private history: HelpTopic[] = [];

    private drawerEl: HTMLElement;
    private headerEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private backBtn: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;
    private spinnerEl: HTMLElement | null = null;
    private resizeHandleEl: HTMLElement | null = null;

    private boundKeyDown: (e: KeyboardEvent) => void;
    private themeObserver: MutationObserver | null = null;
    private lastMarkdown: string | null = null;

    constructor(options: HelpDrawerOptions)
    {
        this.options = options;
        this.width = options.width ?? DEFAULT_WIDTH;
        this.minW = options.minWidth ?? MIN_WIDTH;
        this.maxW = options.maxWidth ?? MAX_WIDTH;

        this.boundKeyDown = (e) => this.handleKeyDown(e);
        document.addEventListener("keydown", this.boundKeyDown, true);

        this.drawerEl = this.buildDrawer();
        document.body.appendChild(this.drawerEl);
        this.observeThemeChanges();

        logInfo("Created");
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    open(topic: HelpTopic): void
    {
        if (!topic || (!topic.markdown && !topic.url))
        {
            logWarn("Topic must have markdown or url");
            return;
        }

        this.history.push(topic);
        this.renderTopic(topic);
        this.showDrawer();
        logInfo("Opened topic:", topic.id);
    }

    close(): void
    {
        if (!this.isOpen_) { return; }
        this.isOpen_ = false;
        this.drawerEl.classList.remove("helpdrawer-open");
        this.history = [];

        if (this.options.onClose) { this.options.onClose(); }
        logInfo("Closed");
    }

    isOpen(): boolean
    {
        return this.isOpen_;
    }

    back(): void
    {
        if (this.history.length <= 1) { return; }

        this.history.pop();
        const prev = this.history[this.history.length - 1];
        this.renderTopic(prev);
        logInfo("Back to:", prev.id);
    }

    canGoBack(): boolean
    {
        return this.history.length > 1;
    }

    getElement(): HTMLElement
    {
        return this.drawerEl;
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;

        if (this.themeObserver)
        {
            this.themeObserver.disconnect();
            this.themeObserver = null;
        }
        document.removeEventListener("keydown", this.boundKeyDown, true);
        this.drawerEl.parentNode?.removeChild(this.drawerEl);

        if (singletonInstance)
        {
            singletonInstance = null;
        }
        logInfo("Destroyed");
    }

    /** Re-renders content when the theme changes. */
    private observeThemeChanges(): void
    {
        this.themeObserver = new MutationObserver(() =>
        {
            if (this.lastMarkdown && this.isOpen_)
            {
                this.renderMarkdown(this.lastMarkdown);
            }
        });
        this.themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-bs-theme"],
        });
    }

    // ====================================================================
    // PRIVATE: BUILD DOM
    // ====================================================================

    private buildDrawer(): HTMLElement
    {
        const drawer = createElement("div", "helpdrawer");
        drawer.style.width = `${this.width}px`;
        drawer.style.zIndex = String(DRAWER_Z_INDEX);
        setAttr(drawer, {
            role: "complementary",
            "aria-label": "Help drawer"
        });

        this.headerEl = this.buildHeader();
        drawer.appendChild(this.headerEl);
        this.resizeHandleEl = this.buildResizeHandle();
        drawer.appendChild(this.resizeHandleEl);

        this.bodyEl = createElement("div", "helpdrawer-body");
        drawer.appendChild(this.bodyEl);

        this.spinnerEl = this.buildSpinner();
        this.spinnerEl.style.display = "none";
        drawer.appendChild(this.spinnerEl);

        return drawer;
    }

    private buildHeader(): HTMLElement
    {
        const header = createElement("div", "helpdrawer-header");

        const left = createElement("div", "helpdrawer-header-left");
        this.backBtn = this.buildBackButton();
        left.appendChild(this.backBtn);

        this.titleEl = createElement("span", "helpdrawer-title");
        left.appendChild(this.titleEl);
        header.appendChild(left);

        const closeBtn = this.buildCloseButton();
        header.appendChild(closeBtn);

        return header;
    }

    private buildBackButton(): HTMLElement
    {
        const btn = createElement("button", "helpdrawer-back-btn");
        setAttr(btn, {
            type: "button",
            "aria-label": "Back",
            title: "Back"
        });
        btn.style.display = "none";

        const icon = createElement("i", "bi bi-arrow-left");
        setAttr(icon, { "aria-hidden": "true" });
        btn.appendChild(icon);

        btn.addEventListener("click", () => this.back());
        return btn;
    }

    private buildCloseButton(): HTMLElement
    {
        const btn = createElement("button", "helpdrawer-close-btn");
        setAttr(btn, {
            type: "button",
            "aria-label": "Close help",
            title: "Close"
        });

        const icon = createElement("i", "bi bi-x-lg");
        setAttr(icon, { "aria-hidden": "true" });
        btn.appendChild(icon);

        btn.addEventListener("click", () => this.close());
        return btn;
    }

    private buildResizeHandle(): HTMLElement
    {
        const handle = createElement("div", "helpdrawer-resize-handle");
        setAttr(handle, {
            role: "separator",
            "aria-orientation": "vertical",
            "aria-label": "Resize help panel",
            "aria-valuenow": String(this.width),
            "aria-valuemin": String(this.minW),
            "aria-valuemax": String(this.maxW)
        });
        handle.addEventListener("mousedown", (e) => this.startResize(e));
        return handle;
    }

    private buildSpinner(): HTMLElement
    {
        const wrap = createElement("div", "helpdrawer-loading");
        const spinner = createElement("div", "spinner-border spinner-border-sm");
        setAttr(spinner, { role: "status" });

        const sr = createElement("span", "visually-hidden");
        sr.textContent = "Loading...";
        spinner.appendChild(sr);
        wrap.appendChild(spinner);

        return wrap;
    }

    // ====================================================================
    // PRIVATE: SHOW / RENDER
    // ====================================================================

    private showDrawer(): void
    {
        if (this.isOpen_) { return; }
        this.isOpen_ = true;
        this.drawerEl.classList.add("helpdrawer-open");
    }

    private renderTopic(topic: HelpTopic): void
    {
        this.updateHeader(topic.title);

        if (topic.markdown)
        {
            this.renderMarkdown(topic.markdown);
        }
        else if (topic.url)
        {
            this.fetchAndRender(topic.url);
        }
    }

    private updateHeader(title: string): void
    {
        if (this.titleEl) { this.titleEl.textContent = title; }

        if (this.backBtn)
        {
            this.backBtn.style.display = this.canGoBack()
                ? "" : "none";
        }
    }

    /** Renders markdown into the body via MarkdownRenderer. */
    private renderMarkdown(md: string): void
    {
        if (!this.bodyEl) { return; }
        this.bodyEl.innerHTML = "";
        this.hideSpinner();

        this.lastMarkdown = md;
        const renderer = getMdRenderer();
        if (renderer)
        {
            renderer.render(md, this.bodyEl);
            logDebug("Rendered markdown");
        }
        else
        {
            logWarn("MarkdownRenderer not available; plain text");
            this.bodyEl.textContent = md;
            this.bodyEl.style.whiteSpace = "pre-wrap";
        }
    }

    private async fetchAndRender(url: string): Promise<void>
    {
        if (!this.bodyEl) { return; }
        this.bodyEl.innerHTML = "";
        this.showSpinner();

        try
        {
            const response = await fetch(url);
            if (!response.ok)
            {
                throw new Error(`HTTP ${response.status}`);
            }
            const md = await response.text();
            this.renderMarkdown(md);

            if (this.options.onNavigate)
            {
                this.options.onNavigate(url);
            }
        }
        catch (err)
        {
            this.hideSpinner();
            logError("Failed to fetch:", url, err);
            this.renderFetchError(url);
        }
    }

    private renderFetchError(url: string): void
    {
        if (!this.bodyEl) { return; }
        this.bodyEl.innerHTML = "";

        const msg = createElement("div", "helpdrawer-error");
        const icon = createElement("i", "bi bi-exclamation-triangle");
        msg.appendChild(icon);

        const text = createElement("span");
        text.textContent = ` Could not load documentation from ${url}`;
        msg.appendChild(text);

        this.bodyEl.appendChild(msg);
    }

    private showSpinner(): void
    {
        if (this.spinnerEl) { this.spinnerEl.style.display = ""; }
    }

    private hideSpinner(): void
    {
        if (this.spinnerEl) { this.spinnerEl.style.display = "none"; }
    }

    // ====================================================================
    // PRIVATE: RESIZE
    // ====================================================================

    /** Begins drag-to-resize on the left resize handle. */
    private startResize(e: MouseEvent): void
    {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = this.width;
        document.body.style.userSelect = "none";

        const onMove = (ev: MouseEvent) =>
        {
            this.applyResize(startX, startWidth, ev.clientX);
        };

        const onUp = () =>
        {
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            document.body.style.userSelect = "";
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }

    private applyResize(
        startX: number, startWidth: number, currentX: number
    ): void
    {
        const delta = startX - currentX;
        this.width = Math.max(
            this.minW,
            Math.min(startWidth + delta, this.maxW)
        );
        this.drawerEl.style.width = `${this.width}px`;
        if (this.resizeHandleEl)
        {
            this.resizeHandleEl.setAttribute(
                "aria-valuenow", String(this.width)
            );
        }
    }

    // ====================================================================
    // PRIVATE: KEYBOARD
    // ====================================================================

    private handleKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape" && this.isOpen_)
        {
            e.preventDefault();
            this.close();
        }
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

// @entrypoint

/**
 * Creates or returns the singleton HelpDrawer instance.
 */
export function createHelpDrawer(
    options?: HelpDrawerOptions
): HelpDrawerHandle
{
    if (singletonInstance)
    {
        logInfo("Returning existing singleton");
        return singletonInstance;
    }

    const inst = new HelpDrawer(options ?? {});

    singletonInstance = {
        open: (t) => inst.open(t),
        close: () => inst.close(),
        isOpen: () => inst.isOpen(),
        back: () => inst.back(),
        canGoBack: () => inst.canGoBack(),
        getElement: () => inst.getElement(),
        destroy: () => inst.destroy()
    };

    return singletonInstance;
}

/**
 * Returns the existing HelpDrawer singleton, or null if not created.
 */
export function getHelpDrawer(): HelpDrawerHandle | null
{
    return singletonInstance;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).createHelpDrawer =
    createHelpDrawer;
(window as unknown as Record<string, unknown>).getHelpDrawer =
    getHelpDrawer;
