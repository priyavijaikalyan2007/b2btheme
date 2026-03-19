/**
 * Vitest shared setup — DOM helpers, mock utilities, and cleanup.
 * NOTE: Individual test files handle their own cleanup to avoid
 * interfering with singleton components (Toast, HelpDrawer, etc.).
 */

// ============================================================================
// JSDOM POLYFILLS
// ============================================================================

/**
 * ResizeObserver is not available in jsdom. Provide a minimal no-op
 * implementation so components that use it can be instantiated in tests.
 */
if (typeof globalThis.ResizeObserver === "undefined")
{
    globalThis.ResizeObserver = class ResizeObserver
    {
        private callback: ResizeObserverCallback;
        constructor(callback: ResizeObserverCallback)
        {
            this.callback = callback;
        }
        observe(): void { /* no-op */ }
        unobserve(): void { /* no-op */ }
        disconnect(): void { /* no-op */ }
    };
}

/**
 * matchMedia is not fully implemented in jsdom. Provide a minimal stub
 * for components like ThemeToggle that read OS prefers-color-scheme.
 */
if (typeof window.matchMedia !== "function")
{
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => { /* no-op */ },
            removeListener: () => { /* no-op */ },
            addEventListener: () => { /* no-op */ },
            removeEventListener: () => { /* no-op */ },
            dispatchEvent: () => false,
        }),
    });
}
