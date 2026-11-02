/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * Recording run (#30 spec §7.4): replays each scenario, paced so every step
 * can be read, and saves the video as agentdemo/.out/videos/<name>.webm for
 * encode.mjs. SCENARIOS=a,b limits the run. A scenario whose header says
 * "media": "video" records at 1920×1080, since it is published as an MP4
 * rather than an 800 px GIF. The replay still asserts every recorded
 * action, so a recording can only be made of a scenario that replays
 * exactly.
 */

import fs from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";

import { openPlayground } from "../../tests/a2ui/playground-route";
import { replayScenario } from "../../tests/a2ui/replay";

const DIR = path.join(__dirname, "..", "scenarios");
const VIDEOS = path.join(__dirname, "..", ".out", "videos");
const PACE_MS = 900;
// A video scenario shows a whole surface per step, so each step stays up longer to be read.
const VIDEO_PACE_MS = 1600;
const GIF_SIZE = { width: 1280, height: 800 };
const VIDEO_SIZE = { width: 1920, height: 1080 };
const VIDEO_TIMEOUT_MS = 600_000;
const wanted = process.env.SCENARIOS?.split(",").map((s) => s.trim()).filter(Boolean);
const names = fs.readdirSync(DIR).filter((f) => f.endsWith(".jsonl")).map((f) => f.slice(0, -".jsonl".length))
    .filter((n) => !wanted || wanted.includes(n));

for (const name of names)
{
    test(`record ${name}`, async ({ browser }) =>
    {
        const text = fs.readFileSync(path.join(DIR, `${name}.jsonl`), "utf8");
        const isVideo = JSON.parse(text.split("\n", 1)[0]).media === "video";
        const size = isVideo ? VIDEO_SIZE : GIF_SIZE;
        const director = JSON.parse(fs.readFileSync(path.join(DIR, `${name}.director.json`), "utf8"));

        if (isVideo) { test.setTimeout(VIDEO_TIMEOUT_MS); }

        // Its own context, because the size depends on the scenario and Playwright fixes `use` per worker.
        const context = await browser.newContext({ viewport: size, recordVideo: { dir: VIDEOS, size } });
        const page = await context.newPage();

        const pace = isVideo ? VIDEO_PACE_MS : PACE_MS;

        await openPlayground(page);
        await page.waitForTimeout(pace);
        await replayScenario(page, text, director, pace);
        await page.waitForTimeout(pace * 2);

        const video = page.video();

        await context.close();
        await video?.saveAs(path.join(VIDEOS, `${name}.webm`));
        await video?.delete();
    });
}
