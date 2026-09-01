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
 * Web Storage is missing under Node 22 and later.
 *
 * Node ships its own experimental `localStorage` global. It SHADOWS the one
 * jsdom installs, and it evaluates to `undefined` unless the process was
 * started with `--localstorage-file`, so `localStorage.getItem(...)` throws
 * "Cannot read properties of undefined" rather than failing to resolve. The
 * jsdom instance is unreachable once shadowed — it is not on the window, the
 * prototype chain, or globalThis — so the only repair is to supply one.
 *
 * This keeps the suite independent of which Node the contributor runs. On a
 * Node without the shadowing global, jsdom's own Storage is already present
 * and the guard does nothing.
 */
class MemoryStorage implements Storage
{
    private readonly entries = new Map<string, string>();

    get length(): number
    {
        return this.entries.size;
    }

    key(index: number): string | null
    {
        return Array.from(this.entries.keys())[index] ?? null;
    }

    getItem(key: string): string | null
    {
        return this.entries.get(String(key)) ?? null;
    }

    setItem(key: string, value: string): void
    {
        this.entries.set(String(key), String(value));
    }

    removeItem(key: string): void
    {
        this.entries.delete(String(key));
    }

    clear(): void
    {
        this.entries.clear();
    }
}

for (const name of ["localStorage", "sessionStorage"] as const)
{
    if (typeof (globalThis as any)[name] === "undefined")
    {
        Object.defineProperty(globalThis, name, {
            configurable: true,
            writable: true,
            value: new MemoryStorage(),
        });
    }
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
