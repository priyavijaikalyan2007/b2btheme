#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: A2uiRecordingEncoder
 * 📜 PURPOSE: Turn each recorded scenario video into its published media
 *    (#30 spec §7.4). A scenario whose header says "media": "video" gets an
 *    MP4 in demo/media/a2ui/, which the build copies to the CDN, and a PNG
 *    poster in docs/media/a2ui/ for the README to link from. Any other gets
 *    an optimised GIF (800 px wide, 10 fps) and a poster in docs/media/a2ui/,
 *    plus WebM and MP4 copies for posts in the gitignored
 *    agentdemo/.out/media/. A file over its budget fails, so git history
 *    does not bloat. Never run in CI.
 * 🔗 RELATES: [[A2uiScenarioReplay]], [[A2uiPlayground]]
 * ⚡ FLOW: [agentdemo/.out/videos/<name>.webm] -> [ffmpeg]
 *    -> [docs/media/a2ui/<name>.gif|.png, demo/media/a2ui/<name>.mp4]
 *
 * Usage: node agentdemo/record/encode.mjs   (after the recording run)
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 3 MB since 2026-11-02 (user): the incident-triage showcase repaints the message
// log, data model and surface on most steps, and is 2.6 MB at 800 px.
export const BUDGET_BYTES = 3 * 1024 * 1024;
// 20 MB since 2026-11-02: a committed video, served by Cloudflare, whose per-asset ceiling is 25 MiB.
export const VIDEO_BUDGET_BYTES = 20 * 1024 * 1024;
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
export function posterArgs(input, output, width = 800)
{
    return ["-y", "-sseof", "-1", "-i", input, "-frames:v", "1", "-vf", `scale=${width}:-1`, output];
}

export function mp4Args(input, output)
{
    return ["-y", "-i", input, "-vf", "scale=1280:-2", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output];
}

/** The published video: full recorded size, no audio track, playable while it downloads. */
export function videoArgs(input, output)
{
    return ["-y", "-i", input, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", output];
}

/** Throws when a file is over budget. */
export function checkBudget(file, bytes, budget = BUDGET_BYTES)
{
    if (bytes <= budget) { return; }

    const mb = (bytes / (1024 * 1024)).toFixed(1);

    throw new Error(`${file} is ${mb} MB, over the ${budget / (1024 * 1024)} MB budget; shorten the scenario or `
        + "lower its pace.");
}

/** The header's "media" ("gif" when absent) of agentdemo/scenarios/<name>.jsonl. */
export function headerMedia(scenariosDir, name)
{
    const first = fs.readFileSync(path.join(scenariosDir, `${name}.jsonl`), "utf8").split("\n", 1)[0];

    return JSON.parse(first).media ?? "gif";
}

/**
 * Encodes every video in `videosDir`, each as its scenario's `mediaOf(name)` says.
 *
 * @returns {{name: string, file: string, bytes: number}[]}
 */
export function encodeAll({ videosDir, outDir, mediaDir, cdnDir, mediaOf, run = execFileSync,
    size = (p) => fs.statSync(p).size })
{
    requireFfmpeg(run);

    const names = fs.readdirSync(videosDir).filter((f) => f.endsWith(".webm")).map((f) => f.slice(0, -5)).sort();

    if (names.length === 0) { throw new Error(`${videosDir} has no .webm videos. Run the recording first.`); }

    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(mediaDir, { recursive: true });

    return names.map((name) =>
    {
        const input = path.join(videosDir, `${name}.webm`);

        return mediaOf(name) === "video"
            ? encodeVideo(name, input, { outDir, cdnDir, run, size })
            : encodeGif(name, input, { outDir, mediaDir, run, size });
    });
}

function encodeVideo(name, input, { outDir, cdnDir, run, size })
{
    const mp4 = path.join(cdnDir, `${name}.mp4`);

    fs.mkdirSync(cdnDir, { recursive: true });
    run("ffmpeg", videoArgs(input, mp4), { stdio: "ignore" });
    run("ffmpeg", posterArgs(input, path.join(outDir, `${name}.png`), 1280), { stdio: "ignore" });
    checkBudget(`${name}.mp4`, size(mp4), VIDEO_BUDGET_BYTES);

    return { name, file: mp4, bytes: size(mp4) };
}

function encodeGif(name, input, { outDir, mediaDir, run, size })
{
    const gif = path.join(outDir, `${name}.gif`);

    run("ffmpeg", gifArgs(input, gif), { stdio: "ignore" });
    run("ffmpeg", posterArgs(input, path.join(outDir, `${name}.png`)), { stdio: "ignore" });
    run("ffmpeg", mp4Args(input, path.join(mediaDir, `${name}.mp4`)), { stdio: "ignore" });
    fs.copyFileSync(input, path.join(mediaDir, `${name}.webm`));
    checkBudget(`${name}.gif`, size(gif));

    return { name, file: gif, bytes: size(gif) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

    try
    {
        const scenariosDir = path.join(repo, "agentdemo", "scenarios");
        const done = encodeAll({ videosDir: path.join(repo, "agentdemo", ".out", "videos"),
            outDir: path.join(repo, "docs", "media", "a2ui"), mediaDir: path.join(repo, "agentdemo", ".out", "media"),
            cdnDir: path.join(repo, "demo", "media", "a2ui"), mediaOf: (name) => headerMedia(scenariosDir, name) });

        for (const d of done)
        {
            console.log(`[record] ${path.relative(repo, d.file)} ${(d.bytes / 1024).toFixed(0)} KB`);
        }
    }
    catch (err)
    {
        console.error(`[record] ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
    }
}
