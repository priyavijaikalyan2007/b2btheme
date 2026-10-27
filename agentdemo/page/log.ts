/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Log
 * 📜 PURPOSE: Structured logging for the playground, through LogUtility when
 *    the page loads it, the same pattern as the components (LOGGING.md).
 *    Never pass an API key to these functions (#30 spec §6.6).
 * 🔗 RELATES: [[A2uiPlayground]], [[LogUtility]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-playground-log

const LOG_PREFIX = "[A2UI-PLAYGROUND]";
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;

type Logger = ReturnType<ReturnType<NonNullable<Window["createLogUtility"]>>["getLogger"]>;

let resolved: Logger | null | undefined;

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
