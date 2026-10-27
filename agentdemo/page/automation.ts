/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Automation API
 * 📜 PURPOSE: `window.a2uiPlayground`, which the scenario replay tests and
 *    the recording script drive (#30 plan amendment A3). Read-mostly; it does
 *    what the toolbar does and changes no behaviour.
 * 🔗 RELATES: [[A2uiPlayground]], [[A2uiScenarioReplay]]
 * ----------------------------------------------------------------------------
 */

import type { LogEntry, LogModel } from "./log-model";
import type { Playground } from "./playground";
import type { ScenarioLine } from "./scenario";

export interface PlaygroundAutomation
{
    /** Loads a scenario's text and resets to its start. */
    loadScenario(text: string): void;
    /** Applies the next line; null at the end. */
    step(): ScenarioLine | null;
    /** Live actions since the last reset, as A2UI action messages. */
    actions(): unknown[];
    /** The log and every surface's data model. */
    snapshot(): { log: LogEntry[]; dataModels: Record<string, unknown> };
}

/** Publishes the automation API on window. */
export function exposeAutomation(playground: Playground, log: LogModel): void
{
    window.a2uiPlayground = {
        loadScenario: (text) => { playground.loadScenario(text); },
        step: () => playground.step(),
        actions: () => playground.actions(),
        snapshot: () => ({ log: log.entries(), dataModels: playground.dataModels() }),
    };
}
