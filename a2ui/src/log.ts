/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: b1f15653-b9ef-4421-9cbc-e8f36b564c76
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / Log
 * 📜 PURPOSE: The FRONTEND_LOGGING.md pattern for the adapter: LogUtility
 *    when the host page loads it, timestamped console output otherwise. The
 *    logger is resolved on first use, never at module top level, so the
 *    bundle can be imported where there is no window (spec §12.1).
 * 🔗 RELATES: [[A2uiAdapter]], [[LogUtility]]
 * ⚡ FLOW: [adapter] -> [logInfo/logDebug/logError] -> [LogUtility | console]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-log

/** Log prefix for all output from the adapter. */
const LOG_PREFIX = "[A2UI]";

interface Logger
{
    info(...a: unknown[]): void;
    debug(...a: unknown[]): void;
    error(...a: unknown[]): void;
}

interface LogWindow
{
    createLogUtility?: () => { getLogger(name: string): Logger };
    __ebt_debug_logging?: boolean;
}

let resolved: Logger | null | undefined;

/** LogUtility's logger when the host page loads it, else null. Resolved once. */
function logUtility(): Logger | null
{
    if (resolved === undefined)
    {
        const w = window as unknown as LogWindow;

        resolved = typeof w.createLogUtility === "function" ? w.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
    }

    return resolved;
}

/** True when the page asks for debug output. Read on every call. */
function debugEnabled(): boolean
{
    return !!(window as unknown as LogWindow).__ebt_debug_logging;
}

/** Emits a structured info log. */
export function logInfo(...args: unknown[]): void
{
    const lu = logUtility();

    lu ? lu.info(...args) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...args);
}

/** Emits a structured debug log. */
export function logDebug(...args: unknown[]): void
{
    const lu = logUtility();

    lu ? lu.debug(...args) : debugEnabled() && console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...args);
}

/** Emits a structured error. */
export function logError(...args: unknown[]): void
{
    const lu = logUtility();

    lu ? lu.error(...args) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...args);
}
