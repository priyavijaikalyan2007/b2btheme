/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 4b8e21c7-5a60-4f93-8d12-6e7a9c0b3d84
 * Created: 2026-10-13
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DiagramEngine
 * 📜 PURPOSE: One logging factory for every namespace in the engine bundle.
 *    FRONTEND_LOGGING.md prescribes a per-component `_lu` resolution plus a
 *    set of helper functions. The engine concatenates twenty namespaces of
 *    its own, plus the engine prefix, into one file, so repeating that
 *    preamble would add roughly six hundred lines of near-identical code to
 *    the largest file in the repository. The factory resolves LogUtility once
 *    per namespace and callers destructure the levels they use, which leaves
 *    all 118 call sites standing. See FRONTEND_LOGGING.md section 1.1.
 * 🔗 RELATES: [[LogUtility]], [[DiagramEngine]]
 * ⚡ FLOW: [makeLogger(prefix)] -> [window.createLogUtility] -> [console.*]
 * ----------------------------------------------------------------------------
 */

/** The five severity levels every namespace exposes. */
interface EngineLogger
{
    trace(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
}

/**
 * Builds the logging helpers for one namespace.
 *
 * Resolution happens once, when the bundle is evaluated. A host page that
 * loads `logutility.js` before the engine gets routed output. A host page
 * that does not gets the same text on the console instead, so logging never
 * depends on LogUtility being present.
 *
 * @param prefix - Bracketed namespace, for example `"[PenTool]"`.
 * @returns Helpers for all five levels.
 */
function makeLogger(prefix: string): EngineLogger
{
    const lu = (typeof window.createLogUtility === "function")
        ? window.createLogUtility().getLogger(prefix.slice(1, -1))
        : null;
    // LOG-3. Same gate as every component preamble, kept verbatim.
    const _dbg = window.__ebt_debug_logging
        ?? /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/.test(location.hostname);
    const _trc = window.__ebt_trace_logging === true;

    return {
        trace: (...args: unknown[]): void =>
        {
            lu ? lu.trace(...args) : _trc && console.debug(new Date().toISOString(), "[TRACE]", prefix, ...args);
        },
        debug: (...args: unknown[]): void =>
        {
            lu ? lu.debug(...args) : _dbg && console.debug(new Date().toISOString(), "[DEBUG]", prefix, ...args);
        },
        info: (...args: unknown[]): void =>
        {
            lu ? lu.info(...args) : console.log(new Date().toISOString(), "[INFO]", prefix, ...args);
        },
        warn: (...args: unknown[]): void =>
        {
            lu ? lu.warn(...args) : console.warn(new Date().toISOString(), "[WARN]", prefix, ...args);
        },
        error: (...args: unknown[]): void =>
        {
            lu ? lu.error(...args) : console.error(new Date().toISOString(), "[ERROR]", prefix, ...args);
        },
    };
}

/**
 * Engine-level helpers. `LOG_PREFIX` is declared in the bundle preamble that
 * scripts/bundle-diagramengine.sh writes ahead of every concatenated section.
 */
const { info: logInfo, warn: logWarn, error: logError, debug: logDebug } = makeLogger(LOG_PREFIX);
