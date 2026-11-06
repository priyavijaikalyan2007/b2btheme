#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: McpDemoBuild
 * 📜 PURPOSE: Builds the demo host page into mcp/demo/.out/: index.html
 *    and host.js, the host bundled with the MCP client and AppBridge. Dev
 *    tooling: nothing here is deployed.
 * 🔗 RELATES: [[McpDemoHost]], [[McpDemoServe]]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

export const OUT_DIR = path.join("mcp", "demo", ".out");

/** Writes index.html and host.js under `repo`/OUT_DIR. */
export async function buildHost(repo)
{
    const out = path.join(repo, OUT_DIR);

    fs.mkdirSync(out, { recursive: true });
    fs.copyFileSync(path.join(repo, "mcp", "demo", "page", "index.html"), path.join(out, "index.html"));
    await build({ entryPoints: [path.join(repo, "mcp", "demo", "page", "host.ts")], bundle: true, format: "iife",
        platform: "browser", target: "es2022", sourcemap: true, outfile: path.join(out, "host.js"),
        logLevel: "warning" });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

    buildHost(repo).then(() => console.log(`[mcp-demo-build] ${OUT_DIR}/`),
        (err) => { console.error(`[mcp-demo-build] ${err.message}`); process.exit(1); });
}
