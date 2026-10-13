/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7f2b4d16-9c38-4a5e-b0d7-13e8a6c45f29
 * Created: 2026-10-13
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Globals
 * 📜 PURPOSE: Ambient declarations for the window globals that components
 *             publish to each other. Components in this library do not
 *             import one another, they communicate through `window`, so
 *             every cross-component lookup used to need a `window as any`
 *             cast. Declaring the shape here types those lookups instead.
 * 🔗 RELATES: [[LogUtility]], [[FrontendLogging]]
 * ⚡ FLOW: [Component] -> [window.createLogUtility] -> [LogUtility]
 * ----------------------------------------------------------------------------
 */

import type { LogUtility, LogUtilityOptions } from "./logutility/logutility";

declare global
{
    interface Window
    {
        /**
         * Factory published by the LogUtility component. Absent when the
         * host page does not load `logutility.js`, which is why every
         * component checks for it before use. See FRONTEND_LOGGING.md.
         */
        createLogUtility?: (options?: LogUtilityOptions) => LogUtility;

        /** Resets the LogUtility singleton. Published for tests. */
        resetLogUtility?: () => void;
    }
}
