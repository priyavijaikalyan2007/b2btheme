/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Globals
 * 📜 PURPOSE: What the playground page reads from `window` (the library's
 *    factories and LogUtility, published by their scripts) and the build's
 *    virtual module, typed once so no code casts `window`.
 * 🔗 RELATES: [[A2uiPlayground]]
 * ----------------------------------------------------------------------------
 */

import type { PlaygroundAutomation } from "./automation";

interface PlaygroundLogger
{
    info(...a: unknown[]): void;
    debug(...a: unknown[]): void;
    error(...a: unknown[]): void;
}

declare global
{
    interface Window
    {
        /** Published by the LogUtility component. See FRONTEND_LOGGING.md. */
        createLogUtility?: () => { getLogger(name: string): PlaygroundLogger };

        /** Per-level logging override, as every component reads it. */
        __ebt_debug_logging?: boolean;

        /** The playground's automation API (automation.ts); replay and recording drive it. */
        a2uiPlayground?: PlaygroundAutomation;

        /** Component factories, published by each component's script. */
        [factory: `create${string}`]: unknown;
    }
}

export {};
