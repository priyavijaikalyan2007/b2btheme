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

/** Hosts where debug output is on unless the page says otherwise (LOG-3). */
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;

type Logger = ReturnType<ReturnType<NonNullable<Window["createLogUtility"]>>["getLogger"]>;

let resolved: Logger | null | undefined;

/** LogUtility's logger when the host page loads it, else null. Resolved once, on first use. */
function logUtility(): Logger | null
{
    if (resolved === undefined)
    {
        const create = window.createLogUtility;

        resolved = typeof create === "function" ? create().getLogger(LOG_PREFIX.slice(1, -1)) : null;
    }

    return resolved;
}

/** True when the page asks for debug output. Read on every call. */
function _dbg(): boolean
{
    const f = window.__ebt_debug_logging;
    return f === undefined ? LOCAL_HOSTS.test(location.hostname) : !!f;
}

/** Emits a structured info log. */
export function logInfo(...a: unknown[]): void
{
    const lu = logUtility();
    lu ? lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}

/** Emits a structured debug log. */
export function logDebug(...a: unknown[]): void
{
    const lu = logUtility();
    lu ? lu.debug(...a) : _dbg() && console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}

/** Emits a structured error. */
export function logError(...a: unknown[]): void
{
    const lu = logUtility();
    lu ? lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a);
}
