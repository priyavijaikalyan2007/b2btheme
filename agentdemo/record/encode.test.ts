// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiRecordingEncoder. ffmpeg is a local prerequisite named by
 *    its absence, GIFs are 800 px at 10 fps with a palette pass, and a GIF
 *    over the 2 MB budget fails (#30 spec §7.4). ffmpeg itself is stubbed.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";

import { BUDGET_BYTES, checkBudget, encodeAll, FFMPEG_MISSING, gifArgs, requireFfmpeg } from "./encode.mjs";

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

describe("checkBudget", () =>
{
    test("passes at the budget and fails above it, naming the file and the size", () =>
    {
        expect(() => checkBudget("a", BUDGET_BYTES)).not.toThrow();
        expect(() => checkBudget("a", 3 * 1024 * 1024))
            .toThrow("a.gif is 3.0 MB, over the 2 MB budget; shorten the scenario or lower its pace.");
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
        const done = encodeAll({ videosDir, outDir, mediaDir, run, size: () => 1000 });

        expect(done).toEqual([{ name: "a", gifBytes: 1000 }]);
        expect(run.mock.calls.map((c) => (c[1] as string[]).at(-1))).toEqual(["-version", path.join(outDir, "a.gif"),
            path.join(outDir, "a.png"), path.join(mediaDir, "a.mp4")]);
        expect(fs.existsSync(path.join(mediaDir, "a.webm"))).toBe(true);
    });

    test("an over-budget GIF fails the run", () =>
    {
        const videosDir = videos(["big"]);

        expect(() => encodeAll({ videosDir, outDir: path.join(videosDir, "o"), mediaDir: path.join(videosDir, "m"),
            run: vi.fn(), size: () => BUDGET_BYTES + 1 })).toThrow("big.gif is 2.0 MB, over the 2 MB budget");
    });

    test("no videos is an error that says to record first", () =>
    {
        const videosDir = videos([]);

        expect(() => encodeAll({ videosDir, outDir: videosDir, mediaDir: videosDir, run: vi.fn() }))
            .toThrow("has no .webm videos. Run the recording first.");
    });
});
