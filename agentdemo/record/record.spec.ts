/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * Recording run (#30 spec §7.4): replays each scenario, paced so every step
 * can be read, and saves the video as agentdemo/.out/videos/<name>.webm for
 * encode.mjs. SCENARIOS=a,b limits the run. The replay still asserts every
 * recorded action, so a recording can only be made of a scenario that
 * replays exactly.
 */

import fs from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";

import { openPlayground } from "../../tests/a2ui/playground-route";
import { replayScenario } from "../../tests/a2ui/replay";

const DIR = path.join(__dirname, "..", "scenarios");
const VIDEOS = path.join(__dirname, "..", ".out", "videos");
const PACE_MS = 900;
const wanted = process.env.SCENARIOS?.split(",").map((s) => s.trim()).filter(Boolean);
const names = fs.readdirSync(DIR).filter((f) => f.endsWith(".jsonl")).map((f) => f.slice(0, -".jsonl".length))
    .filter((n) => !wanted || wanted.includes(n));

for (const name of names)
{
    test(`record ${name}`, async ({ page }) =>
    {
        const text = fs.readFileSync(path.join(DIR, `${name}.jsonl`), "utf8");
        const director = JSON.parse(fs.readFileSync(path.join(DIR, `${name}.director.json`), "utf8"));

        await openPlayground(page);
        await page.waitForTimeout(PACE_MS);
        await replayScenario(page, text, director, PACE_MS);
        await page.waitForTimeout(PACE_MS * 2);

        const video = page.video();

        await page.close();
        fs.mkdirSync(VIDEOS, { recursive: true });
        await video?.saveAs(path.join(VIDEOS, `${name}.webm`));
    });
}
