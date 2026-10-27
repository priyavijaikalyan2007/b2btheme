/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: every saved scenario under agentdemo/scenarios/ replays in the
 * playground (#30 spec §7.3). The director's gestures must make the real
 * components emit exactly the recorded actions, so a transcript is also a
 * regression test, with no key and no LLM.
 */

import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

import { cspViolations, openPlayground } from "./a2ui/playground-route";
import { replayScenario } from "./a2ui/replay";

const DIR = path.join(__dirname, "..", "agentdemo", "scenarios");
const NAMES = fs.readdirSync(DIR).filter((f) => f.endsWith(".jsonl")).map((f) => f.slice(0, -".jsonl".length));

test.describe("A2UI scenario replays", () =>
{
    for (const name of NAMES)
    {
        test(`${name} replays with the recorded actions`, async ({ page }) =>
        {
            const text = fs.readFileSync(path.join(DIR, `${name}.jsonl`), "utf8");
            const director = JSON.parse(fs.readFileSync(path.join(DIR, `${name}.director.json`), "utf8"));

            await openPlayground(page);
            await replayScenario(page, text, director);

            await expect(page.locator('.a2ui-log li[data-status="rejected"]')).toHaveCount(0);
            expect(await cspViolations(page)).toEqual([]);
        });
    }
});
