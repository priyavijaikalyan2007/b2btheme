/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * The MCP Apps demo recording run (agentui-unblock §7, PR 4):
 * `npm run demo:mcp:record`. The spec starts the demo itself, so there is
 * no webServer. Never run in CI.
 */

import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: ".",
    testMatch: "record.spec.ts",
    outputDir: "../.out/record-results",
    timeout: 300_000,
    workers: 1,
    use: {
        browserName: "chromium",
    },
});
