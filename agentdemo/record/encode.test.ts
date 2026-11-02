// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiRecordingEncoder. ffmpeg is a local prerequisite named by
 *    its absence, GIFs are 800 px at 10 fps with a palette pass, a GIF over
 *    the 3 MB budget fails, and a "video" scenario becomes an MP4 for the
 *    CDN under a 20 MB budget (#30 spec §7.4). ffmpeg itself is stubbed.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";

import { BUDGET_BYTES, checkBudget, encodeAll, FFMPEG_MISSING, gifArgs, headerMedia, requireFfmpeg,
    VIDEO_BUDGET_BYTES, videoArgs } from "./encode.mjs";

describe("requireFfmpeg", () =>
{
    test("names the install command when ffmpeg is missing", () =>
    {
        const run = vi.fn(() => { throw new Error("ENOENT"); });

        expect(() => requireFfmpeg(run)).toThrow(FFMPEG_MISSING);
        expect(FFMPEG_MISSING).toContain("brew install ffmpeg");
    });
});

describe("gifArgs", () =>
{
    test("scales to 800 px at 10 fps with a generated palette, looping", () =>
    {
        const args = gifArgs("in.webm", "out.gif");

        expect(args.join(" ")).toContain("fps=10,scale=800:-1:flags=lanczos");
        expect(args.join(" ")).toContain("palettegen");
        expect(args.slice(-3)).toEqual(["-loop", "0", "out.gif"]);
    });
});

describe("videoArgs", () =>
{
    test("H.264 at the recorded size, no audio, playable while downloading", () =>
    {
        const args = videoArgs("in.webm", "out.mp4").join(" ");

        expect(args).toContain("-an -c:v libx264");
        expect(args).toContain("-movflags +faststart out.mp4");
        expect(args).not.toContain("scale=");
    });
});

describe("headerMedia", () =>
{
    test("reads the header's media, gif when absent", () =>
    {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "media-"));

        fs.writeFileSync(path.join(dir, "v.jsonl"),
            '{"kind":"header","title":"V","provenance":"scripted","media":"video"}\n');
        fs.writeFileSync(path.join(dir, "g.jsonl"), '{"kind":"header","title":"G","provenance":"scripted"}\n{}\n');
        expect(headerMedia(dir, "v")).toBe("video");
        expect(headerMedia(dir, "g")).toBe("gif");
    });
});

describe("checkBudget", () =>
{
    test("passes at the budget and fails above it, naming the file and the size", () =>
    {
        expect(() => checkBudget("a.gif", BUDGET_BYTES)).not.toThrow();
        expect(() => checkBudget("a.gif", 4 * 1024 * 1024))
            .toThrow("a.gif is 4.0 MB, over the 3 MB budget; shorten the scenario or lower its pace.");
        expect(() => checkBudget("w.mp4", 21 * 1024 * 1024, VIDEO_BUDGET_BYTES))
            .toThrow("w.mp4 is 21.0 MB, over the 20 MB budget");
    });
});

describe("encodeAll", () =>
{
    function videos(names: string[]): string
    {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "encode-"));

        for (const n of names) { fs.writeFileSync(path.join(dir, `${n}.webm`), "video"); }

        return dir;
    }

    test("runs ffmpeg for a GIF, a poster and an MP4 per video, and copies the WebM", () =>
    {
        const videosDir = videos(["a"]);
        const outDir = path.join(videosDir, "out");
        const mediaDir = path.join(videosDir, "media");
        const run = vi.fn();
        const done = encodeAll({ videosDir, outDir, mediaDir, cdnDir: path.join(videosDir, "cdn"),
            mediaOf: () => "gif", run, size: () => 1000 });

        expect(done).toEqual([{ name: "a", file: path.join(outDir, "a.gif"), bytes: 1000 }]);
        expect(run.mock.calls.map((c) => (c[1] as string[]).at(-1))).toEqual(["-version", path.join(outDir, "a.gif"),
            path.join(outDir, "a.png"), path.join(mediaDir, "a.mp4")]);
        expect(fs.existsSync(path.join(mediaDir, "a.webm"))).toBe(true);
    });

    test("a video scenario gets an MP4 for the CDN and a wide poster, and no GIF", () =>
    {
        const videosDir = videos(["w"]);
        const outDir = path.join(videosDir, "out");
        const cdnDir = path.join(videosDir, "cdn");
        const run = vi.fn();
        const done = encodeAll({ videosDir, outDir, mediaDir: path.join(videosDir, "m"), cdnDir,
            mediaOf: () => "video", run, size: () => 5000 });

        expect(done).toEqual([{ name: "w", file: path.join(cdnDir, "w.mp4"), bytes: 5000 }]);
        expect(run.mock.calls.map((c) => (c[1] as string[]).at(-1))).toEqual(["-version", path.join(cdnDir, "w.mp4"),
            path.join(outDir, "w.png")]);
        expect((run.mock.calls[2][1] as string[]).join(" ")).toContain("scale=1280:-1");
    });

    test("an over-budget GIF fails the run", () =>
    {
        const videosDir = videos(["big"]);

        expect(() => encodeAll({ videosDir, outDir: path.join(videosDir, "o"), mediaDir: path.join(videosDir, "m"),
            cdnDir: path.join(videosDir, "c"), mediaOf: () => "gif", run: vi.fn(), size: () => BUDGET_BYTES + 1 }))
            .toThrow("big.gif is 3.0 MB, over the 3 MB budget");
    });

    test("an over-budget video fails the run", () =>
    {
        const videosDir = videos(["long"]);

        expect(() => encodeAll({ videosDir, outDir: path.join(videosDir, "o"), mediaDir: path.join(videosDir, "m"),
            cdnDir: path.join(videosDir, "c"), mediaOf: () => "video", run: vi.fn(),
            size: () => VIDEO_BUDGET_BYTES + 1 })).toThrow("long.mp4 is 20.0 MB, over the 20 MB budget");
    });

    test("no videos is an error that says to record first", () =>
    {
        const videosDir = videos([]);

        expect(() => encodeAll({ videosDir, outDir: videosDir, mediaDir: videosDir, cdnDir: videosDir,
            mediaOf: () => "gif", run: vi.fn() }))
            .toThrow("has no .webm videos. Run the recording first.");
    });
});
