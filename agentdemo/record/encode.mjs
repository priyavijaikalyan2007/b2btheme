#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: A2uiRecordingEncoder
 * 📜 PURPOSE: Turn each recorded scenario video into the README media (#30
 *    spec §7.4): an optimised GIF (800 px wide, 10 fps) and a PNG poster in
 *    docs/media/a2ui/, plus WebM and MP4 copies for posts in the gitignored
 *    agentdemo/.out/media/. A GIF over the 2 MB budget fails, so git history
 *    does not bloat. Never run in CI.
 * 🔗 RELATES: [[A2uiScenarioReplay]], [[A2uiPlayground]]
 * ⚡ FLOW: [agentdemo/.out/videos/<name>.webm] -> [ffmpeg] -> [docs/media/a2ui/<name>.gif|.png]
 *
 * Usage: node agentdemo/record/encode.mjs   (after the recording run)
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BUDGET_BYTES = 2 * 1024 * 1024;
export const FFMPEG_MISSING = "ffmpeg is not installed. Install it (macOS: brew install ffmpeg; Debian/Ubuntu: "
    + "sudo apt install ffmpeg) and run again.";

/** Throws FFMPEG_MISSING unless `ffmpeg -version` runs. */
export function requireFfmpeg(run = execFileSync)
{
    try { run("ffmpeg", ["-version"], { stdio: "ignore" }); }
    catch { throw new Error(FFMPEG_MISSING); }
}

/** One pass with a generated palette: smaller and cleaner than ffmpeg's default GIF palette. */
export function gifArgs(input, output)
{
    return ["-y", "-i", input, "-vf",
        "fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer",
        "-loop", "0", output];
}

/** A frame from the last second: the scenario's finished state. */
export function posterArgs(input, output)
{
    return ["-y", "-sseof", "-1", "-i", input, "-frames:v", "1", "-vf", "scale=800:-1", output];
}

export function mp4Args(input, output)
{
    return ["-y", "-i", input, "-vf", "scale=1280:-2", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output];
}

/** Throws when a GIF is over budget. */
export function checkBudget(name, bytes, budget = BUDGET_BYTES)
{
    if (bytes <= budget) { return; }

    const mb = (bytes / (1024 * 1024)).toFixed(1);

    throw new Error(`${name}.gif is ${mb} MB, over the ${budget / (1024 * 1024)} MB budget; shorten the scenario or `
        + "lower its pace.");
}

/**
 * Encodes every video in `videosDir`.
 *
 * @returns {{name: string, gifBytes: number}[]}
 */
export function encodeAll({ videosDir, outDir, mediaDir, run = execFileSync, size = (p) => fs.statSync(p).size })
{
    requireFfmpeg(run);

    const names = fs.readdirSync(videosDir).filter((f) => f.endsWith(".webm")).map((f) => f.slice(0, -5)).sort();

    if (names.length === 0) { throw new Error(`${videosDir} has no .webm videos. Run the recording first.`); }

    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });

    return names.map((name) =>
    {
        const input = path.join(videosDir, `${name}.webm`);
        const gif = path.join(outDir, `${name}.gif`);

        run("ffmpeg", gifArgs(input, gif), { stdio: "ignore" });
        run("ffmpeg", posterArgs(input, path.join(outDir, `${name}.png`)), { stdio: "ignore" });
        run("ffmpeg", mp4Args(input, path.join(mediaDir, `${name}.mp4`)), { stdio: "ignore" });
        fs.copyFileSync(input, path.join(mediaDir, `${name}.webm`));
        checkBudget(name, size(gif));

        return { name, gifBytes: size(gif) };
    });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

    try
    {
        const done = encodeAll({ videosDir: path.join(repo, "agentdemo", ".out", "videos"),
            outDir: path.join(repo, "docs", "media", "a2ui"), mediaDir: path.join(repo, "agentdemo", ".out", "media") });

        for (const d of done) { console.log(`[record] ${d.name}.gif ${(d.gifBytes / 1024).toFixed(0)} KB`); }
    }
    catch (err)
    {
        console.error(`[record] ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
    }
}
