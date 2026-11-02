/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiRecording / Playwright config
 * 📜 PURPOSE: Records each scenario replay as video (#30 spec §7.4): 1280×800,
 *    or 1920×1080 for a "video" scenario. record.spec.ts opens a context of
 *    that size itself. Run by `npm run demo:a2ui:record`; never CI.
 * 🔗 RELATES: [[A2uiRecordingEncoder]], [[A2uiScenarioReplay]]
 * ----------------------------------------------------------------------------
 */

import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    testMatch: "record.spec.ts",
    outputDir: "../.out/record-results",
    timeout: 120_000,
    workers: 1,
    use: {
        browserName: "chromium",
    },
    webServer: {
        command: "python3 -m http.server 8000 -d dist",
        cwd: "../..",
        port: 8000,
        reuseExistingServer: true,
        timeout: 10_000,
    },
});
