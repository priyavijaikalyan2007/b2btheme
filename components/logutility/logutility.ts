/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a1c3e5f7-9b2d-4e6f-8a0c-2d4e6f8a0b1c
 * Created: 2026-03-29
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LogUtility
 * 📜 PURPOSE: Centralised, configurable logging utility that replaces
 *             per-component logInfo/logWarn/logError/logDebug helpers with
 *             a singleton providing named loggers, level filtering,
 *             timestamp control, and optional LogConsole routing.
 * 🔗 RELATES: [[EnterpriseTheme]], [[LogConsole]]
 * ⚡ FLOW: [Any Component] -> [logUtility.getLogger()] -> [Logger] -> [console.*]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Numeric severity levels for fast comparison. */
const LEVELS: Record<string, number> = {
    trace: -1,
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * Global debug flags checked on every log call so they can be
 * toggled at runtime from the browser console or application code.
 *
 * Usage (browser console):
 *   window.__ebt_debug_logging = true;   // enable debug output
 *   window.__ebt_info_logging = true;    // enable info output
 *   window.__ebt_trace_logging = true;   // enable trace output
 *
 * Warnings and errors are ALWAYS emitted regardless of these flags.
 * When a flag is true, that level is enabled even if the LogUtility's
 * configured level would normally suppress it.
 */
const GLOBAL_FLAGS = {
    debug: "__ebt_debug_logging",
    trace: "__ebt_trace_logging",
    info: "__ebt_info_logging",
} as const;

/**
 * The three flag names, as a union of literals rather than `string`.
 *
 * `as const` above is what makes this a union. Without it the values widen
 * to `string`, the parameter below widens with them, and indexing `window`
 * by a `string` is the one thing no declaration can type. The flags are
 * declared in components/globals.d.ts, so the lookup needs no assertion.
 */
type GlobalFlagName = (typeof GLOBAL_FLAGS)[keyof typeof GLOBAL_FLAGS];

/**
 * THE LOCAL DEVELOPMENT RULE, STATED ONCE.
 *
 * This literal is repeated character-for-character in the fallback preamble
 * every component carries, because that path runs when `logutility.js` is
 * not loaded and so cannot call into this file. `scripts/audit-counts.mjs`
 * compares the two texts and fails if they drift apart.
 *
 * `[::1]` keeps its brackets: `location.hostname` returns an IPv6 literal
 * bracketed in every major browser. `*.localhost` is included because
 * RFC 6761 reserves it for loopback. DELIBERATELY EXCLUDED: `file:` URLs,
 * whose hostname is empty; LAN addresses such as 192.168.x and 10.x, which
 * are real devices on a real network; and `.test`, which is reserved but
 * not resolved to loopback by browsers. Widen this only on purpose.
 */
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;

/** Whether the page is being served from a local development host. */
function isLocalHost(): boolean
{
    try
    {
        return LOCAL_HOSTS.test(window.location.hostname);
    }
    catch
    {
        return false;
    }
}

/**
 * Whether a verbose level has been switched on for this page.
 *
 * THE FLAG IS TRI-STATE AND THAT IS THE POINT. Unset means "decide for me",
 * which for `debug` means local development is enough and for every other
 * level means no. `true` switches the level on anywhere. `false` switches it
 * off even on localhost, which is how a test run keeps its output quiet
 * while jsdom serves it from `http://localhost:3000/`.
 *
 * Only `debug` follows the host. Trace stays flag-only, because trace is
 * event-handler volume and nobody wants it merely for opening a page.
 *
 * This FORCES ON. A level the configured `level` already admits is emitted
 * whatever the flag says, so an explicit `createLogUtility({ level: "debug" })`
 * still wins. The flag is for turning something on that the level would
 * otherwise filter.
 *
 * @param flagName - The window property name to check.
 * @returns True if the level should be emitted regardless of `level`.
 */
function isGlobalFlagSet(flagName: GlobalFlagName): boolean
{
    try
    {
        const flag = window[flagName];

        if (typeof flag === "boolean") { return flag; }
        if (flag !== undefined) { return !!flag; }

        return flagName === GLOBAL_FLAGS.debug && isLocalHost();
    }
    catch
    {
        return false;
    }
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Minimal interface for LogConsole integration.
 * Any object that implements info/debug/warn/error can receive routed events.
 */
export interface LogConsoleHandle
{
    /** Log an informational message to the user-visible console. */
    info(message: string): void;

    /** Log a debug message to the user-visible console. */
    debug(message: string): void;

    /** Log a warning message to the user-visible console. */
    warn(message: string): void;

    /** Log an error message to the user-visible console. */
    error(message: string): void;
}

/** Configuration options for the LogUtility singleton. */
export interface LogUtilityOptions
{
    /** Minimum log level. Default: "debug". */
    level?: "trace" | "debug" | "info" | "warn" | "error";

    /** Whether to include ISO timestamps in output. Default: true. */
    timestamps?: boolean;

    /** Optional LogConsole instance to route user-visible events to. */
    logConsole?: LogConsoleHandle;

    /** Whether console output is enabled. Default: true. */
    consoleOutput?: boolean;
}

/** A named logger bound to a specific component. */
export interface Logger
{
    /** Log an informational message. */
    info(...args: unknown[]): void;

    /** Log a warning message. */
    warn(...args: unknown[]): void;

    /** Log an error message. Errors are never filtered. */
    error(...args: unknown[]): void;

    /** Log a debug message. */
    debug(...args: unknown[]): void;

    /** Log a trace message (most verbose — DOM mutations, render cycles). */
    trace(...args: unknown[]): void;

    /** Log a user-visible event (routed to LogConsole if configured). */
    event(message: string, data?: unknown): void;
}

/** The centralised logging utility interface. */
export interface LogUtility
{
    /** Create a logger for a specific component. */
    getLogger(componentName: string): Logger;

    /** Update the minimum log level at runtime. */
    setLevel(level: "trace" | "debug" | "info" | "warn" | "error"): void;

    /** Attach or detach a LogConsole instance for user-visible event routing. */
    setLogConsole(logConsole: LogConsoleHandle | null): void;

    /** Enable or disable console output. */
    setConsoleOutput(enabled: boolean): void;

    /** Destroy the singleton and release resources. */
    destroy(): void;
}

// ============================================================================
// IMPLEMENTATION
// ============================================================================

/**
 * Concrete implementation of the LogUtility interface.
 * Manages log level filtering, timestamp formatting, console output,
 * and optional LogConsole event routing.
 */
class LogUtilityImpl implements LogUtility
{
    /** Current numeric log level threshold. */
    private level: number;

    /** Whether ISO timestamps are prepended to output. */
    private timestamps: boolean;

    /** Whether output is sent to the browser console. */
    private consoleOutput: boolean;

    /** Optional external console for user-visible event routing. */
    private logConsole: LogConsoleHandle | null;

    constructor(options?: LogUtilityOptions)
    {
        // "info" rather than "debug". The debug gate is `level > LEVELS.debug`,
        // so a default of "debug" made `0 > 0` false and DEBUG EMITTED
        // EVERYWHERE. All 125 components call `createLogUtility()` with no
        // options and the singleton keeps whatever the first caller passed,
        // so in practice the default governed every page that did not
        // configure one. Verbose levels are opt-in now. LOG-3, ADR-176.
        this.level = LEVELS[options?.level ?? "info"];
        this.timestamps = options?.timestamps !== false;
        this.consoleOutput = options?.consoleOutput !== false;
        this.logConsole = options?.logConsole ?? null;
    }

    // ── Logger Factory ──────────────────────────────────────────────────

    /** Create a named Logger instance bound to a component prefix. */
    getLogger(componentName: string): Logger
    {
        const prefix = `[${componentName}]`;
        const self = this;

        return {
            info(...args: unknown[]): void
            {
                if (self.level > LEVELS.info
                    && !isGlobalFlagSet(GLOBAL_FLAGS.info))
                {
                    return;
                }
                self.emit("info", prefix, args);
            },
            warn(...args: unknown[]): void
            {
                // Warnings are always emitted.
                self.emit("warn", prefix, args);
            },
            error(...args: unknown[]): void
            {
                // Errors are always emitted.
                self.emit("error", prefix, args);
            },
            debug(...args: unknown[]): void
            {
                if (self.level > LEVELS.debug
                    && !isGlobalFlagSet(GLOBAL_FLAGS.debug))
                {
                    return;
                }
                self.emit("debug", prefix, args);
            },
            trace(...args: unknown[]): void
            {
                if (self.level > LEVELS.trace
                    && !isGlobalFlagSet(GLOBAL_FLAGS.trace))
                {
                    return;
                }
                self.emit("trace", prefix, args);
            },
            event(message: string, data?: unknown): void
            {
                self.emitEvent(prefix, message, data);
            },
        };
    }

    // ── Configuration Mutators ──────────────────────────────────────────

    /** Update the minimum log level at runtime. */
    setLevel(level: "debug" | "info" | "warn" | "error"): void
    {
        this.level = LEVELS[level];
    }

    /** Attach or detach a LogConsole for event routing. */
    setLogConsole(lc: LogConsoleHandle | null): void
    {
        this.logConsole = lc;
    }

    /** Enable or disable console output. */
    setConsoleOutput(enabled: boolean): void
    {
        this.consoleOutput = enabled;
    }

    /** Release all references and reset the singleton. */
    destroy(): void
    {
        this.logConsole = null;
    }

    // ── Internal Emitters ───────────────────────────────────────────────

    /**
     * Format and emit a log message to the browser console.
     * Prepends timestamp (if enabled), level tag, and component prefix.
     */
    private emit(level: string, prefix: string, args: unknown[]): void
    {
        if (!this.consoleOutput) { return; }

        const parts: unknown[] = this.buildParts(level, prefix);
        parts.push(...args);

        this.dispatchToConsole(level, parts);
    }

    /** Build the common prefix parts array: [timestamp?, levelTag, prefix]. */
    private buildParts(level: string, prefix: string): unknown[]
    {
        const parts: unknown[] = [];

        if (this.timestamps)
        {
            parts.push(new Date().toISOString());
        }

        parts.push(`[${level.toUpperCase()}]`);
        parts.push(prefix);

        return parts;
    }

    /** Dispatch a formatted parts array to the correct console method. */
    private dispatchToConsole(level: string, parts: unknown[]): void
    {
        switch (level)
        {
            case "error": console.error(...parts); break;
            case "warn": console.warn(...parts); break;
            case "debug": console.debug(...parts); break;
            case "trace": console.debug(...parts); break;
            default: console.log(...parts);
        }
    }

    /**
     * Emit a user-visible event. Always logs to console and routes
     * to the attached LogConsole if one is configured.
     */
    private emitEvent(prefix: string, message: string, data?: unknown): void
    {
        const args = data !== undefined ? [message, data] : [message];
        this.emit("info", prefix, args);

        if (this.logConsole)
        {
            const formatted = `${prefix} ${message}`;
            this.logConsole.info(formatted);
        }
    }
}

// ============================================================================
// SINGLETON
// ============================================================================

/** The singleton LogUtility instance. */
let instance: LogUtility | null = null;

/**
 * Create or retrieve the LogUtility singleton.
 * If the singleton already exists, the provided options are ignored.
 *
 * @param options - Configuration for the logging utility.
 * @returns The singleton LogUtility instance.
 */
export function createLogUtility(options?: LogUtilityOptions): LogUtility
{
    if (!instance)
    {
        instance = new LogUtilityImpl(options);
    }

    return instance;
}

/**
 * Reset the singleton (used internally by destroy and tests).
 * After calling this, the next createLogUtility call will create a fresh instance.
 */
export function resetLogUtility(): void
{
    if (instance)
    {
        instance.destroy();
    }

    instance = null;
}

// ============================================================================
// WINDOW GLOBALS
// ============================================================================

window.createLogUtility = createLogUtility;
window.resetLogUtility = resetLogUtility;
window.LogUtility = LogUtilityImpl;
