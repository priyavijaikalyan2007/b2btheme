/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: dc3de3b0-6fe8-441a-bfeb-523cd5f3d62e
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ThemeInit
 * 📜 PURPOSE: Pre-paint theme initializer for cross-subdomain parity
 *    (Keycloak on auth.knobby.io ↔ app on prod.knobby.io). Reads the
 *    `knobby-theme` cookie (mode: light|dark|auto), falls back to the
 *    same-origin localStorage key, then to prefers-color-scheme, and sets
 *    `data-bs-theme` on <html> synchronously so there is no flash of the
 *    wrong theme. When the mode is `auto` (or no preference exists) it keeps
 *    tracking OS appearance changes while the page is open.
 *    Consumed as a blocking external <script src> in <head> — no inline
 *    script needed, so it is compatible with a strict CSP (no nonce/hash).
 *    Self-contained: no imports, no app globals required.
 * 🔗 RELATES: [[ThemeToggle]], [[DarkMode]], [[AuthCard]],
 *    specs/keycloak-theme-parity-requirements.md (R2/R3)
 * ⚡ FLOW: <head> load -> runThemeInit(env) -> data-bs-theme set pre-paint
 *    -> optional matchMedia("change") listener while mode is auto/unset
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[ThemeInit]";

/** Cookie AND localStorage key — the R3 contract shared with ThemeManager. */
const THEME_PREFERENCE_KEY = "knobby-theme";

const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";

// ============================================================================
// TYPES
// ============================================================================

export type ThemeInitMode = "light" | "dark" | "auto";
export type ThemeInitResolved = "light" | "dark";

/**
 * Everything runThemeInit touches in the browser, injectable for tests.
 * The real environment is built by buildBrowserEnvironment().
 */
export interface ThemeInitEnvironment
{
    /** Snapshot of document.cookie. */
    cookie: string;

    /** Guarded localStorage read — may throw in privacy modes; callers catch. */
    readStorage: () => string | null;

    /** window.matchMedia, or undefined when unavailable. */
    matchMedia: ((query: string) => MediaQueryList) | undefined;

    /** Element receiving data-bs-theme — document.documentElement in browsers. */
    root: Element;
}

/**
 * Structural view of MediaQueryList covering both the modern
 * addEventListener API and the legacy addListener API (older Safari).
 */
interface PrefersDarkQuery
{
    readonly matches: boolean;
    addEventListener?: (type: "change", listener: (e: { matches: boolean }) => void) => void;
    removeEventListener?: (type: "change", listener: (e: { matches: boolean }) => void) => void;
    addListener?: (listener: (e: { matches: boolean }) => void) => void;
    removeListener?: (listener: (e: { matches: boolean }) => void) => void;
}

// ============================================================================
// PREFERENCE READING (R2.2 resolution order, R3.2 strict validation)
// ============================================================================

/** Returns the string only when it is exactly one of the three valid modes. */
function asValidMode(value: string | null): ThemeInitMode | null
{
    if (value === "light" || value === "dark" || value === "auto")
    {
        return value;
    }
    return null;
}

/**
 * Extracts the theme mode from a document.cookie string. Strictly validated:
 * any value other than the three literal modes is rejected (R3.2), so a
 * corrupted or tampered cookie can never inject anything into the DOM.
 * First occurrence wins, matching browser cookie-ordering semantics.
 */
export function parseThemeCookie(cookieString: string): ThemeInitMode | null
{
    const pairs = cookieString.split(";");
    for (const pair of pairs)
    {
        const eq = pair.indexOf("=");
        if (eq < 0) continue;

        const name = pair.slice(0, eq).trim();
        if (name !== THEME_PREFERENCE_KEY) continue;

        return asValidMode(pair.slice(eq + 1).trim());
    }
    return null;
}

/**
 * Reads the preferred mode: cookie first (cross-subdomain contract), then
 * same-origin localStorage (app pages), else null (no stored preference).
 */
export function readThemeMode(env: ThemeInitEnvironment): ThemeInitMode | null
{
    const fromCookie = parseThemeCookie(env.cookie);
    if (fromCookie !== null)
    {
        return fromCookie;
    }

    try
    {
        return asValidMode(env.readStorage());
    }
    catch
    {
        return null;
    }
}

// ============================================================================
// RESOLUTION (R1.2 — mode resolves at read time so `auto` tracks the OS)
// ============================================================================

/**
 * Maps a mode to the concrete theme. `auto` and "no preference" both follow
 * the OS so a fresh browser matches what the OS-aware app would show.
 */
export function resolveThemeMode(
    mode: ThemeInitMode | null,
    prefersDark: boolean
): ThemeInitResolved
{
    if (mode === "light" || mode === "dark")
    {
        return mode;
    }
    return prefersDark ? "dark" : "light";
}

// ============================================================================
// INIT
// ============================================================================

function queryPrefersDark(env: ThemeInitEnvironment): PrefersDarkQuery | null
{
    if (typeof env.matchMedia !== "function")
    {
        return null;
    }

    try
    {
        return env.matchMedia(PREFERS_DARK_QUERY) as unknown as PrefersDarkQuery;
    }
    catch
    {
        return null;
    }
}

/**
 * Keeps data-bs-theme in sync with OS appearance while the page is open
 * (acceptance criterion: toggling OS appearance updates the Keycloak page).
 * Returns a cleanup that detaches the listener.
 */
function watchSystemTheme(query: PrefersDarkQuery, root: Element): () => void
{
    const onChange = (e: { matches: boolean }): void =>
    {
        root.setAttribute("data-bs-theme", e.matches ? "dark" : "light");
    };

    if (typeof query.addEventListener === "function")
    {
        query.addEventListener("change", onChange);
        return () => query.removeEventListener?.("change", onChange);
    }

    if (typeof query.addListener === "function")
    {
        query.addListener(onChange);
        return () => query.removeListener?.(onChange);
    }

    return () => { /* no listener API — nothing to detach */ };
}

/**
 * Applies the theme synchronously (pre-paint when loaded blocking in <head>)
 * and, for `auto`/unset modes, watches the OS preference for live changes.
 * Returns a cleanup for the watcher (used by tests; ignored in production).
 */
export function runThemeInit(env: ThemeInitEnvironment): () => void
{
    const mode = readThemeMode(env);
    const query = queryPrefersDark(env);
    const resolved = resolveThemeMode(mode, query !== null && query.matches);

    env.root.setAttribute("data-bs-theme", resolved);
    console.debug(LOG_PREFIX, `mode=${mode ?? "none"} resolved=${resolved}`);

    if (mode === "light" || mode === "dark" || query === null)
    {
        return () => { /* fixed mode — no OS watcher attached */ };
    }
    return watchSystemTheme(query, env.root);
}

/** Builds the real browser environment for the auto-run entry point. */
export function buildBrowserEnvironment(): ThemeInitEnvironment
{
    return {
        cookie: document.cookie,
        readStorage: () => window.localStorage.getItem(THEME_PREFERENCE_KEY),
        matchMedia: typeof window.matchMedia === "function"
            ? window.matchMedia.bind(window)
            : undefined,
        root: document.documentElement,
    };
}

// ============================================================================
// ENTRY — runs synchronously at script load (blocking <script> in <head>)
// ============================================================================

if (typeof window !== "undefined" && typeof document !== "undefined")
{
    runThemeInit(buildBrowserEnvironment());
}
