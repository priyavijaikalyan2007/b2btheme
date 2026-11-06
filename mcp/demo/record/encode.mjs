#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: McpDemoRecordingEncoder
 * 📜 PURPOSE: Turns the MCP Apps demo recording into its published media,
 *    with the A2UI recorder's encoder: an MP4 in demo/media/mcp/, which the
 *    build copies to the CDN, and a 1280-wide PNG poster in docs/media/mcp/
 *    for the README. Fails over the 20 MB video budget. Never run in CI.
 * 🔗 RELATES: [[A2uiRecordingEncoder]], [[McpDemoServe]]
 * ⚡ FLOW: [mcp/demo/.out/videos/mcp-apps.webm] -> [encodeAll]
 *    -> [demo/media/mcp/mcp-apps.mp4, docs/media/mcp/mcp-apps.png]
 *
 * Usage: node mcp/demo/record/encode.mjs   (after the recording run)
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

import { encodeAll } from "../../../agentdemo/record/encode.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

try
{
    const done = encodeAll({ videosDir: path.join(repo, "mcp", "demo", ".out", "videos"),
        outDir: path.join(repo, "docs", "media", "mcp"), mediaDir: path.join(repo, "mcp", "demo", ".out", "media"),
        cdnDir: path.join(repo, "demo", "media", "mcp"), mediaOf: () => "video" });

    for (const d of done) { console.log(`[record] ${path.relative(repo, d.file)} ${(d.bytes / 1024).toFixed(0)} KB`); }
}
catch (err)
{
    console.error(`[record] ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
}
