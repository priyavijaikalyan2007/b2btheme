/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ThemeToggle
 * 📜 PURPOSE: Three-state theme switcher (Light / Auto / Dark) with OS
 *    prefers-color-scheme auto-detection.  Sets `data-bs-theme` on <html>.
 *    Does NOT persist — the host app controls storage via `defaultTheme`
 *    and the `onChange` callback.
 * 🔗 RELATES: [[DarkMode]], [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [App init] -> createThemeToggle(opts) -> ThemeToggleHandle
 * ----------------------------------------------------------------------------
 */

// @entrypoint
// @dependency: bootstrap-icons

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[ThemeToggle]";

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

let instanceCount = 0;

// ============================================================================
// TYPES
// ============================================================================

export type ThemeMode = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

export interface ThemeToggleOptions
{
    /** Container element to render the toggle into. */
    container: HTMLElement;

    /** Initial mode — "auto" reads OS preference.  Default: "auto". */
    defaultTheme?: ThemeMode;

    /** Fires when the resolved theme changes.  App should persist `mode`. */
    onChange?: (theme: ResolvedTheme, mode: ThemeMode) => void;
}

export interface ThemeToggleHandle
{
    /** Returns the current resolved theme ("light" | "dark"). */
    getTheme(): ResolvedTheme;

    /** Returns the current mode ("light" | "dark" | "auto"). */
    getMode(): ThemeMode;

    /** Programmatically set the mode. */
    setTheme(mode: ThemeMode): void;

    /** Tear down listeners and DOM. */
    destroy(): void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string
): HTMLElementTagNameMap[K]
{
    const el = document.createElement(tag);
    if (className)
    {
        el.className = className;
    }
    return el;
}

function setAttr(el: HTMLElement, key: string, value: string): void
{
    el.setAttribute(key, value);
}

// ============================================================================
// THEME TOGGLE CLASS
// ============================================================================

export class ThemeToggle
{
    private id: string;
    private root: HTMLElement;
    private mode: ThemeMode;
    private resolvedTheme: ResolvedTheme;
    private onChange?: (theme: ResolvedTheme, mode: ThemeMode) => void;
    private mediaQuery: MediaQueryList;
    private mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;
    private buttons: Map<ThemeMode, HTMLButtonElement> = new Map();

    constructor(options: ThemeToggleOptions)
    {
        instanceCount += 1;
        this.id = "themetoggle-" + instanceCount;
        this.onChange = options.onChange;
        this.mode = options.defaultTheme ?? "auto";
        this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this.resolvedTheme = this.resolveTheme(this.mode);
        this.root = this.buildDOM();
        options.container.appendChild(this.root);
        this.applyTheme();
        this.bindMediaListener();
        logInfo("Created", this.id, "mode=" + this.mode);
    }

    // ========================================================================
    // PUBLIC
    // ========================================================================

    getTheme(): ResolvedTheme
    {
        return this.resolvedTheme;
    }

    getMode(): ThemeMode
    {
        return this.mode;
    }

    setTheme(mode: ThemeMode): void
    {
        this.mode = mode;
        this.resolvedTheme = this.resolveTheme(mode);
        this.applyTheme();
        this.updateActiveButton();
        this.bindMediaListener();
        this.fireChange();
        logInfo("setTheme", mode, "→", this.resolvedTheme);
    }

    destroy(): void
    {
        this.unbindMediaListener();
        if (this.root.parentElement)
        {
            this.root.parentElement.removeChild(this.root);
        }
        logInfo("Destroyed", this.id);
    }

    // ========================================================================
    // PRIVATE — Resolve
    // ========================================================================

    private resolveTheme(mode: ThemeMode): ResolvedTheme
    {
        if (mode === "auto")
        {
            return this.mediaQuery.matches ? "dark" : "light";
        }
        return mode;
    }

    // ========================================================================
    // PRIVATE — DOM
    // ========================================================================

    private buildDOM(): HTMLElement
    {
        const wrap = createElement("div", "themetoggle");
        setAttr(wrap, "role", "group");
        setAttr(wrap, "aria-label", "Theme switcher");

        this.addButton(wrap, "light", "bi-sun", "Light theme");
        this.addButton(wrap, "auto", "bi-circle-half", "Auto (system)");
        this.addButton(wrap, "dark", "bi-moon-fill", "Dark theme");

        this.updateActiveButton();
        return wrap;
    }

    private addButton(
        parent: HTMLElement,
        mode: ThemeMode,
        icon: string,
        label: string
    ): void
    {
        const btn = createElement("button", "themetoggle-btn");
        setAttr(btn, "type", "button");
        setAttr(btn, "data-theme", mode);
        setAttr(btn, "aria-label", label);
        setAttr(btn, "title", label);

        const i = createElement("i", icon);
        btn.appendChild(i);

        btn.addEventListener("click", () =>
        {
            this.setTheme(mode);
        });

        this.buttons.set(mode, btn);
        parent.appendChild(btn);
    }

    // ========================================================================
    // PRIVATE — Apply
    // ========================================================================

    private applyTheme(): void
    {
        document.documentElement.setAttribute(
            "data-bs-theme",
            this.resolvedTheme
        );
    }

    private updateActiveButton(): void
    {
        this.buttons.forEach((btn, key) =>
        {
            if (key === this.mode)
            {
                btn.classList.add("themetoggle-btn-active");
                setAttr(btn, "aria-pressed", "true");
            }
            else
            {
                btn.classList.remove("themetoggle-btn-active");
                setAttr(btn, "aria-pressed", "false");
            }
        });
    }

    // ========================================================================
    // PRIVATE — Media query
    // ========================================================================

    private bindMediaListener(): void
    {
        this.unbindMediaListener();
        if (this.mode === "auto")
        {
            this.mediaHandler = (e: MediaQueryListEvent) =>
            {
                this.resolvedTheme = e.matches ? "dark" : "light";
                this.applyTheme();
                this.fireChange();
                logInfo("OS changed →", this.resolvedTheme);
            };
            this.mediaQuery.addEventListener("change", this.mediaHandler);
        }
    }

    private unbindMediaListener(): void
    {
        if (this.mediaHandler)
        {
            this.mediaQuery.removeEventListener("change", this.mediaHandler);
            this.mediaHandler = null;
        }
    }

    // ========================================================================
    // PRIVATE — Callback
    // ========================================================================

    private fireChange(): void
    {
        if (this.onChange)
        {
            this.onChange(this.resolvedTheme, this.mode);
        }
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createThemeToggle(options: ThemeToggleOptions): ThemeToggleHandle
{
    if (!options || !options.container)
    {
        logError("No container provided");
        throw new Error(LOG_PREFIX + " No container provided");
    }

    const instance = new ThemeToggle(options);

    return {
        getTheme: () => instance.getTheme(),
        getMode: () => instance.getMode(),
        setTheme: (mode: ThemeMode) => instance.setTheme(mode),
        destroy: () => instance.destroy()
    };
}

// ============================================================================
// GLOBAL EXPORT
// ============================================================================

(window as unknown as Record<string, unknown>).createThemeToggle = createThemeToggle;
