/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiHarnessBuild
 * 📜 PURPOSE: E2E harness build: bundles the Lit and React host pages with esbuild
 *    into test-results/a2ui-harness/<worker pid>/, once per worker. The adapter
 *    is NOT bundled: the harness imports the built /a2ui/adapter/v1.js from the
 *    served dist tree, as a host would.
 * 🔗 RELATES: [[A2uiHarness]], [[A2uiAdapter]]
 * ⚡ FLOW: [spec beforeAll] -> [esbuild, once per worker] -> [test-results/a2ui-harness/<pid>/]
 * ----------------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const HERE = __dirname;
/**
 * One directory per worker process. Every spec file builds the harness in its beforeAll, and Playwright runs spec
 * files in parallel workers. With one shared directory, a worker's build rewrote lit.js while another worker's
 * page was reading it, so that page loaded a truncated script, never set `ready`, and timed out. That happened
 * only in full runs (2026-11-10).
 */
export const HARNESS_DIR = path.join(HERE, "..", "..", "test-results", "a2ui-harness", String(process.pid));

let built: Promise<string> | undefined;

/** Builds both harnesses once per worker; returns the output directory. */
export function buildHarness(): Promise<string>
{
    built ??= (async () =>
    {
        fs.mkdirSync(HARNESS_DIR, { recursive: true });

        await esbuild.build({
            entryPoints: { lit: path.join(HERE, "harness-lit.ts"), react: path.join(HERE, "harness-react.ts") },
            outdir: HARNESS_DIR, bundle: true, format: "esm", platform: "browser", target: "es2022",
            define: { "process.env.NODE_ENV": '"development"' }, logLevel: "silent",
        });

        return HARNESS_DIR;
    })();

    return built;
}
