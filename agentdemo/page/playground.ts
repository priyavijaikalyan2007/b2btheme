/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Controller
 * 📜 PURPOSE: One apply path for every message source (#30 spec §5.2), and
 *    scenario stepping. A scenario's a2ui lines are applied; its user and
 *    say lines go to the chat; its action and error lines are shown as
 *    recorded. Only the Playwright replay re-enacts the gestures (§7.3).
 * 🔗 RELATES: [[A2uiPlaygroundHost]], [[A2uiPlaygroundStepper]], [[A2uiPlaygroundScenario]]
 * ----------------------------------------------------------------------------
 */

import type { Host } from "./host";
import type { LogModel, LogSource } from "./log-model";
import { parseScenario } from "./scenario";
import type { Scenario, ScenarioLine } from "./scenario";
import { Stepper } from "./stepper";
import type { A2uiActionMessage, ApplyResult, Finding } from "./types";
import type { Chat } from "./ui/chat";
import type { Inspect } from "./ui/inspect";

export interface PlaygroundDeps
{
    readonly host: Host;
    readonly log: LogModel;
    readonly inspect: Inspect;
    readonly chat: Chat;
    readonly formatFindings: (findings: readonly Finding[]) => string;
}

export class Playground
{
    readonly #d: PlaygroundDeps;
    readonly #liveActions: A2uiActionMessage[] = [];
    #scenario: Scenario | null = null;
    #stepper: Stepper | null = null;

    constructor(deps: PlaygroundDeps)
    {
        this.#d = deps;
        deps.host.onAction((a) => { this.#liveActions.push(a); deps.inspect.action(a, false); this.refreshData(); });
        deps.host.onError((e) => deps.inspect.error(e));
    }

    /** Applies a batch through the Host and records it in the log. */
    applyBatch(source: LogSource, messages: readonly unknown[]): ApplyResult
    {
        const result = this.#d.host.apply(messages);
        const status = !result.applied ? "rejected" : result.errors.length > 0 ? "applied-with-errors" : "applied";

        for (const m of messages) { this.#d.log.add(source, m, status); }
        if (!result.applied)
        {
            this.#d.inspect.showFindings(this.#d.formatFindings(result.findings));
            this.#d.inspect.select("check");
        }
        this.refreshData();

        return result;
    }

    /** Loads a scenario file and resets the playground to its start. */
    loadScenario(text: string): Scenario
    {
        const scenario = parseScenario(text);

        this.#scenario = scenario;
        this.#stepper = new Stepper(scenario.lines);
        this.reset();

        return scenario;
    }

    /** Applies the next scenario line; null at the end. */
    step(): ScenarioLine | null
    {
        const line = this.#requireStepper().next();

        if (line) { this.#play(line); }

        return line;
    }

    /** Steps back one line: reset, then re-apply the lines before it. */
    back(): void
    {
        const lines = this.#requireStepper().back();

        this.#clear();
        for (const line of lines) { this.#play(line); }
    }

    /** Deletes every surface and returns to the scenario's start. */
    reset(): void
    {
        this.#stepper?.reset();
        this.#clear();
    }

    /** True when a scenario is loaded. */
    hasScenario(): boolean
    {
        return this.#stepper !== null;
    }

    /** True when there is a scenario and lines remain. */
    canStep(): boolean
    {
        return this.#stepper !== null && !this.#stepper.done;
    }

    /** Live actions emitted since the last reset, as A2UI action messages. */
    actions(): A2uiActionMessage[]
    {
        return [...this.#liveActions];
    }

    /** Refreshes the data-model tab from every live surface. */
    refreshData(): void
    {
        this.#d.inspect.showData(this.dataModels());
    }

    /** Every live surface's data model, by surface ID. */
    dataModels(): Record<string, unknown>
    {
        return Object.fromEntries(this.#d.host.surfaces().map((id) => [id, this.#d.host.dataModel(id)]));
    }

    #play(line: ScenarioLine): void
    {
        switch (line.kind)
        {
            case "a2ui": this.applyBatch("scenario", [line.message]); break;
            case "user": this.#d.chat.user(line.text); break;
            case "say": this.#d.chat.say(line.text); break;
            case "finding": this.#d.chat.notice(`Checker feedback sent to the agent: ${line.text}`); break;
            case "action": this.#d.inspect.action(line.message, true); break;
            case "error": this.#d.inspect.error(line.message); break;
        }
    }

    #clear(): void
    {
        this.#d.host.reset();
        this.#d.log.clear();
        this.#d.inspect.clear();
        this.#d.chat.clear();
        this.#liveActions.length = 0;
    }

    #requireStepper(): Stepper
    {
        if (!this.#stepper) { throw new Error("No scenario is loaded. Choose one from the Scenario menu first."); }

        return this.#stepper;
    }
}
