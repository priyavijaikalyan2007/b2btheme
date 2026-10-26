/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E harness build: bundles the Lit and React host pages with esbuild into
 * test-results/a2ui-harness/. The adapter is NOT bundled: the harness imports
 * the built /a2ui/adapter/v1.js from the served dist tree, as a host would.
 */

import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

const HERE = __dirname;
export const HARNESS_DIR = path.join(HERE, "..", "..", "test-results", "a2ui-harness");

/** Builds both harnesses; returns the output directory. */
export async function buildHarness(): Promise<string>
{
    fs.mkdirSync(HARNESS_DIR, { recursive: true });

    await esbuild.build({
        entryPoints: { lit: path.join(HERE, "harness-lit.ts"), react: path.join(HERE, "harness-react.ts") },
        outdir: HARNESS_DIR, bundle: true, format: "esm", platform: "browser", target: "es2022",
        define: { "process.env.NODE_ENV": '"development"' }, logLevel: "silent",
    });

    return HARNESS_DIR;
}
