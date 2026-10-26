/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 220f247a-ee60-4ed0-8cf7-951fead1a071
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / Globals
 * 📜 PURPOSE: The window members the adapter reads, typed, so it reaches them
 *    without an assertion (WIN-1, ADR-174). Component factories are window
 *    globals by contract (`window.createStickyNote`), named create<Name>.
 * 🔗 RELATES: [[A2uiAdapter]], [[LogUtility]]
 * ⚡ FLOW: [component script] -> [window.create<Name>] -> [element mount]
 * ----------------------------------------------------------------------------
 */

interface AdapterLogger
{
    info(...a: unknown[]): void;
    debug(...a: unknown[]): void;
    error(...a: unknown[]): void;
}

declare global
{
    interface Window
    {
        /** Published by the LogUtility component when the host page loads it. See FRONTEND_LOGGING.md. */
        createLogUtility?: () => { getLogger(name: string): AdapterLogger };

        /** Per-level logging override, as every component reads it. */
        __ebt_debug_logging?: boolean;

        /** Component factories, published by each component's script. */
        [factory: `create${string}`]: unknown;
    }
}

export {};
