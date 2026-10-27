/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * Scenario replay (#30 spec §7.3), shared by the regression tests and the
 * recording script. Each a2ui line is applied through the playground; at
 * each action line the director's gestures are performed on the real
 * components, and the action they emit must equal the transcript's: same
 * name, source component and resolved context. No key and no LLM.
 */

import { expect, type Page } from "@playwright/test";

import { parseScenario } from "../../agentdemo/page/scenario";

export interface Gesture
{
    type: "click" | "fill" | "select";
    target: string;
    value?: string;
}

/** Action-line index (within the scenario's lines, header excluded) to the gestures that produce it. */
export type Director = Record<string, Gesture[]>;

interface ActionMessage { action: { name: string; sourceComponentId: string; context: unknown } }

type Automation = { a2uiPlayground: { loadScenario(t: string): void; step(): unknown; actions(): ActionMessage[] } };

const actions = (page: Page) => page.evaluate(() => (window as unknown as Automation).a2uiPlayground.actions());

/** Replays `text` with `director`; `paceMs` slows it down for recordings. */
export async function replayScenario(page: Page, text: string, director: Director, paceMs = 0): Promise<void>
{
    const scenario = parseScenario(text);

    await page.evaluate((t) => (window as unknown as Automation).a2uiPlayground.loadScenario(t), text);

    for (const [i, line] of scenario.lines.entries())
    {
        if (line.kind === "action") { await reenact(page, i, line.message as ActionMessage, director, paceMs); }

        await page.evaluate(() => (window as unknown as Automation).a2uiPlayground.step());
        if (paceMs > 0) { await page.waitForTimeout(paceMs); }
    }
}

async function reenact(page: Page, i: number, recorded: ActionMessage, director: Director, paceMs: number)
{
    const gestures = director[String(i)];

    if (!gestures) { throw new Error(`scenario line ${i} is an action, but the director has no gesture for it.`); }

    const before = (await actions(page)).length;

    for (const g of gestures)
    {
        await perform(page, g);
        if (paceMs > 0) { await page.waitForTimeout(paceMs / 2); }
    }

    await expect.poll(async () => (await actions(page)).length).toBe(before + 1);

    const emitted = (await actions(page)).at(-1)?.action;

    expect({ name: emitted?.name, sourceComponentId: emitted?.sourceComponentId, context: emitted?.context })
        .toEqual({ name: recorded.action.name, sourceComponentId: recorded.action.sourceComponentId,
            context: recorded.action.context });
}

async function perform(page: Page, g: Gesture): Promise<void>
{
    const target = page.locator(g.target).first();

    if (g.type === "click") { await target.click(); return; }
    if (g.type === "fill") { await target.fill(g.value ?? ""); return; }

    await target.selectOption(g.value ?? "");
}
