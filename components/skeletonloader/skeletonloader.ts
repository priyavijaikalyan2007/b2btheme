/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SkeletonLoader
 * 📜 PURPOSE: Animated placeholder mimicking content layout during loading.
 *             CSS-heavy with minimal JS. Six presets: text, avatar, card,
 *             table, paragraph, custom.
 * 🔗 RELATES: [[EnterpriseTheme]], [[SkeletonLoaderSpec]]
 * ⚡ FLOW: [Consumer App] -> [createSkeletonLoader()] -> [CSS Shimmer]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[SkeletonLoader]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

/** Text line width pattern for natural text simulation. */
const TEXT_LINE_WIDTHS = ["100%", "80%", "90%", "70%", "95%"];

/** Table cell width pattern for varied data simulation. */
const TABLE_CELL_WIDTHS = [
    "75%", "90%", "65%", "80%", "70%", "95%", "60%", "85%"
];

/** Instance counter for unique IDs. */
let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** Configuration options for the SkeletonLoader component. */
export interface SkeletonLoaderOptions
{
    /** Visual preset. Default: "text". */
    preset?: "text" | "avatar" | "card" | "table" | "paragraph" | "custom";
    /** Number of lines for text/paragraph. Default: 3. */
    lines?: number;
    /** Number of rows for table. Default: 5. */
    rows?: number;
    /** Number of columns for table. Default: 4. */
    columns?: number;
    /** CSS width for custom/avatar. Default: "100%". */
    width?: string;
    /** CSS height for custom/avatar. Default: "1rem". */
    height?: string;
    /** CSS gap between lines/rows. Default: "0.5rem". */
    gap?: string;
    /** Enable shimmer animation. Default: true. */
    animate?: boolean;
    /** CSS border-radius. Default: "0". */
    borderRadius?: string;
    /** Circle shape for avatar. Default: false. */
    circle?: boolean;
    /** Additional CSS class(es). */
    cssClass?: string;
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
// COMPONENT CLASS
// ============================================================================

/**
 * ⚓ COMPONENT: SkeletonLoader
 *
 * Animated placeholder for loading states.
 *
 * @example
 * var skeleton = createSkeletonLoader(
 *     { preset: "card" },
 *     "container-id"
 * );
 * // Later: skeleton.destroy();
 */
export class SkeletonLoader
{
    private readonly instanceId!: string;
    private readonly options!: SkeletonLoaderOptions;
    private rootEl: HTMLElement | null = null;
    private destroyed = false;
    private visible = false;

    constructor(options?: SkeletonLoaderOptions)
    {
        instanceCounter++;
        this.instanceId = `skeleton-${instanceCounter}`;
        this.options = options ?? {};

        this.rootEl = this.buildRoot();
        logInfo("Created instance", this.instanceId);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /** Append to container element or body. */
    show(containerId?: string): void
    {
        if (this.destroyed)
        {
            logWarn("Cannot show destroyed instance");
            return;
        }
        if (this.visible)
        {
            logWarn("Already visible");
            return;
        }
        const container = this.resolveContainer(containerId);
        container.appendChild(this.rootEl!);
        this.visible = true;
    }

    /** Remove from DOM, keep state. */
    hide(): void
    {
        if (this.rootEl?.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
            this.visible = false;
        }
    }

    /** Clean up everything. */
    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.hide();
        this.rootEl = null;
        logInfo("Destroyed", this.instanceId);
    }

    /** Return root DOM element. */
    getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    // ========================================================================
    // PRIVATE HELPERS
    // ========================================================================

    /** Resolve container from ID string. */
    private resolveContainer(containerId?: string): HTMLElement
    {
        if (!containerId) { return document.body; }
        const el = document.getElementById(containerId);
        if (!el)
        {
            logWarn("Container not found:", containerId);
            return document.body;
        }
        return el;
    }

    /** Build the root element tree based on preset. */
    private buildRoot(): HTMLElement
    {
        const preset = this.options.preset ?? "text";
        const classes = this.buildRootClasses(preset);
        const root = createElement("div", classes);
        root.id = this.instanceId;

        setAttr(root, {
            role: "status",
            "aria-busy": "true",
            "aria-label": "Loading content"
        });

        const gap = this.options.gap ?? "0.5rem";
        root.style.gap = gap;

        this.buildPreset(root, preset);
        return root;
    }

    /** Build CSS class string for root. */
    private buildRootClasses(preset: string): string
    {
        const parts = ["skeleton-loader", `skeleton-loader-${preset}`];
        if (this.options.animate === false) { parts.push("skeleton-no-animate"); }
        if (this.options.cssClass) { parts.push(this.options.cssClass); }
        return parts.join(" ");
    }

    /** Route to the correct preset builder. */
    private buildPreset(root: HTMLElement, preset: string): void
    {
        switch (preset)
        {
            case "text":      this.buildTextPreset(root); break;
            case "avatar":    this.buildAvatarPreset(root); break;
            case "card":      this.buildCardPreset(root); break;
            case "table":     this.buildTablePreset(root); break;
            case "paragraph": this.buildParagraphPreset(root); break;
            case "custom":    this.buildCustomPreset(root); break;
            default:          this.buildTextPreset(root); break;
        }
    }

    /** Build text preset — varying-width lines. */
    private buildTextPreset(root: HTMLElement): void
    {
        const count = this.options.lines ?? 3;
        for (let i = 0; i < count; i++)
        {
            const isLast = i === count - 1;
            const width = isLast ? "60%" : TEXT_LINE_WIDTHS[i % TEXT_LINE_WIDTHS.length];
            root.appendChild(this.createLine(width));
        }
    }

    /** Build avatar preset — single square or circle block. */
    private buildAvatarPreset(root: HTMLElement): void
    {
        const size = this.options.width ?? "3rem";
        const height = this.options.height ?? "3rem";
        const block = createElement("div", "skeleton-avatar");
        block.style.width = size;
        block.style.height = height;
        if (this.options.circle) { block.classList.add("skeleton-circle"); }
        this.applyBorderRadius(block);
        root.appendChild(block);
    }

    /** Build card preset — image block + text lines. */
    private buildCardPreset(root: HTMLElement): void
    {
        const imgBlock = createElement("div", "skeleton-card-image");
        imgBlock.style.height = "160px";
        this.applyBorderRadius(imgBlock);
        root.appendChild(imgBlock);

        const lineWidths = ["100%", "70%", "85%"];
        for (const w of lineWidths)
        {
            root.appendChild(this.createLine(w));
        }
    }

    /** Build table preset — CSS Grid of cells. */
    private buildTablePreset(root: HTMLElement): void
    {
        const rows = this.options.rows ?? 5;
        const cols = this.options.columns ?? 4;
        const table = createElement("div", "skeleton-table");
        table.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        table.style.gap = this.options.gap ?? "0.5rem";

        this.buildTableCells(table, rows, cols);
        root.appendChild(table);
    }

    /** Build table cells: full-width header row + varied body rows. */
    private buildTableCells(
        table: HTMLElement, rows: number, cols: number
    ): void
    {
        for (let r = 0; r < rows; r++)
        {
            for (let c = 0; c < cols; c++)
            {
                const cell = createElement("div", "skeleton-cell");
                const isHeader = r === 0;
                const idx = (r - 1) * cols + c;
                cell.style.width = isHeader
                    ? "100%"
                    : TABLE_CELL_WIDTHS[idx % TABLE_CELL_WIDTHS.length];
                this.applyBorderRadius(cell);
                table.appendChild(cell);
            }
        }
    }

    /** Build paragraph preset — uniform-width lines, last shorter. */
    private buildParagraphPreset(root: HTMLElement): void
    {
        const count = this.options.lines ?? 4;
        for (let i = 0; i < count; i++)
        {
            const isLast = i === count - 1;
            const width = isLast ? "75%" : "100%";
            root.appendChild(this.createLine(width));
        }
    }

    /** Build custom preset — single block. */
    private buildCustomPreset(root: HTMLElement): void
    {
        const block = createElement("div", "skeleton-block");
        block.style.width = this.options.width ?? "100%";
        block.style.height = this.options.height ?? "1rem";
        this.applyBorderRadius(block);
        root.appendChild(block);
    }

    /** Create a shimmer line element. */
    private createLine(width: string): HTMLElement
    {
        const line = createElement("div", "skeleton-line");
        line.style.width = width;
        this.applyBorderRadius(line);
        return line;
    }

    /** Apply custom border radius if configured. */
    private applyBorderRadius(el: HTMLElement): void
    {
        if (this.options.borderRadius)
        {
            el.style.borderRadius = this.options.borderRadius;
        }
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * ⚓ FUNCTION: createSkeletonLoader
 * Create, show, and return a SkeletonLoader in one call.
 */
export function createSkeletonLoader(
    options?: SkeletonLoaderOptions, containerId?: string
): SkeletonLoader
{
    const loader = new SkeletonLoader(options);
    loader.show(containerId);
    return loader;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as any).SkeletonLoader = SkeletonLoader;
(window as any).createSkeletonLoader = createSkeletonLoader;
