/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiReferenceAgent
 * 📜 PURPOSE: The provider-neutral agent loop (#30 spec §6.1, §6.3), and the
 *    pattern a host developer copies: the catalog goes into the prompt, each
 *    reply is checked before it is applied, all or nothing, and the user's
 *    actions and the surface's errors come back as the next turn, verbatim.
 *    Plain TypeScript with no Node-only APIs, so a Worker or another page
 *    can run it unchanged.
 * 🔗 RELATES: [[A2uiPlaygroundHost]], [[AgentUiMessageChecker]], [[A2uiPlaygroundScenario]]
 * ⚡ FLOW: [user text | action | error] -> [provider] -> [parse] -> [checkSchema]
 *          -> [apply] -> [applied | repair (≤ 2) | failed]
 *
 * WHY THE REPAIR LOOP IS NOT A FALLBACK
 * -------------------------------------
 * Every failure is shown to the user and sent to the model verbatim, nothing
 * is auto-corrected or dropped, and the loop always ends: after the second
 * failed repair it stops and says so.
 * ----------------------------------------------------------------------------
 */

import { logDebug, logInfo } from "../log";
import type { ScenarioLine } from "../scenario";
import type { ApplyResult, CheckSchema, Finding } from "../types";
import { redactKey } from "./redact";
import type { Provider, Turn, TurnOutcome, Usage } from "./types";

export const MAX_REPAIRS = 2;
export const FAILED_UNAPPLIED = "The agent's reply failed validation twice; nothing from this turn was applied.";
export const FAILED_WITH_ERRORS = "The agent's reply still had errors after two repairs. What it rendered is shown, "
    + "with its errors.";

export type SessionEvent =
    | { readonly kind: "busy"; readonly on: boolean }
    | { readonly kind: "say"; readonly text: string }
    | { readonly kind: "applied"; readonly messages: readonly unknown[]; readonly result: ApplyResult }
    | { readonly kind: "repair"; readonly attempt: number; readonly feedback: string }
    | { readonly kind: "failed"; readonly message: string; readonly feedback: string }
    | { readonly kind: "usage"; readonly usage: Usage }
    | { readonly kind: "providerError"; readonly message: string };

export interface SessionDeps
{
    readonly provider: Provider;
    readonly model: () => string;
    readonly key: () => string;
    readonly system: string;
    readonly checkSchema: CheckSchema;
    readonly formatFindings: (findings: readonly Finding[]) => string;
    readonly apply: (messages: readonly unknown[]) => ApplyResult;
    readonly onEvent: (event: SessionEvent) => void;
}

interface Reply
{
    readonly say: string;
    readonly messages: readonly unknown[];
}

export class Session
{
    readonly #d: SessionDeps;
    #turns: Turn[] = [];
    #transcript: ScenarioLine[] = [];
    #abort: AbortController | null = null;
    #appliedThisTurn = false;

    constructor(deps: SessionDeps)
    {
        this.#d = deps;
    }

    /** The user's chat text. */
    send(text: string): Promise<TurnOutcome>
    {
        this.#transcript.push({ kind: "user", text });

        return this.#turn(text);
    }

    /** A surface's action or error message, sent to the model verbatim. */
    deliver(message: { readonly action: unknown } | { readonly error: unknown }): Promise<TurnOutcome>
    {
        this.#transcript.push("action" in message ? { kind: "action", message } : { kind: "error", message });

        return this.#turn(JSON.stringify(message));
    }

    /** Aborts the request in flight. */
    stop(): void
    {
        this.#abort?.abort();
    }

    /** Forgets the conversation. */
    reset(): void
    {
        this.stop();
        this.#turns = [];
        this.#transcript = [];
    }

    /** The session so far, as scenario lines (the key is never in them). */
    transcript(): ScenarioLine[]
    {
        return [...this.#transcript];
    }

    async #turn(userText: string): Promise<TurnOutcome>
    {
        this.#turns.push({ role: "user", text: userText });
        this.#appliedThisTurn = false;
        this.#d.onEvent({ kind: "busy", on: true });

        try { return await this.#attempts(); }
        finally { this.#d.onEvent({ kind: "busy", on: false }); }
    }

    async #attempts(): Promise<TurnOutcome>
    {
        for (let attempt = 0; ; attempt++)
        {
            const text = await this.#call();

            if (text === "stopped" || text === "providerError") { return text; }

            const feedback = this.#evaluate(text);

            if (feedback === null) { return "applied"; }
            if (attempt === MAX_REPAIRS) { return this.#fail(feedback); }

            logInfo("repairing the agent's reply", { attempt: attempt + 1 });
            this.#transcript.push({ kind: "finding", text: feedback });
            this.#turns.push({ role: "user", text: repairPrompt(feedback) });
            this.#d.onEvent({ kind: "repair", attempt: attempt + 1, feedback });
        }
    }

    /** The provider's reply text, or why there is none. Never retries. */
    async #call(): Promise<string | "stopped" | "providerError">
    {
        this.#abort = new AbortController();

        try
        {
            const result = await this.#d.provider.complete({ system: this.#d.system, turns: [...this.#turns],
                model: this.#d.model(), key: this.#d.key(), signal: this.#abort.signal });

            this.#turns.push({ role: "assistant", text: result.text });
            this.#d.onEvent({ kind: "usage", usage: result.usage });
            logDebug("agent reply", { characters: result.text.length });

            return result.text;
        }
        catch (err)
        {
            if (this.#abort.signal.aborted) { return "stopped"; }

            const message = redactKey(err instanceof Error ? err.message : String(err), this.#d.key());

            this.#d.onEvent({ kind: "providerError", message });

            return "providerError";
        }
    }

    /** Parses, checks and applies one reply; returns feedback for the model, or null when it applied cleanly. */
    #evaluate(text: string): string | null
    {
        let reply: Reply;

        try { reply = parseReply(text); }
        catch (err) { return err instanceof Error ? err.message : String(err); }

        const findings = this.#d.checkSchema(reply.messages);

        if (findings.length > 0) { return this.#d.formatFindings(findings); }

        const result = this.#d.apply(reply.messages);

        this.#appliedThisTurn = true;
        this.#transcript.push({ kind: "say", text: reply.say },
            ...reply.messages.map((message) => ({ kind: "a2ui" as const, message })));
        this.#d.onEvent({ kind: "say", text: reply.say });
        this.#d.onEvent({ kind: "applied", messages: reply.messages, result });

        return result.errors.length > 0 ? result.errors.map((e) => JSON.stringify(e)).join("\n") : null;
    }

    #fail(feedback: string): TurnOutcome
    {
        const message = this.#appliedThisTurn ? FAILED_WITH_ERRORS : FAILED_UNAPPLIED;

        logInfo("the agent's reply failed after repairs", { applied: this.#appliedThisTurn });
        this.#d.onEvent({ kind: "failed", message, feedback });

        return "failed";
    }
}

/**
 * The reply contract: exactly one JSON object `{ say, messages }`, nothing
 * around it.
 *
 * @throws With the rule the reply broke, worded for the model.
 */
export function parseReply(text: string): Reply
{
    let value: unknown;

    try { value = JSON.parse(text.trim()); }
    catch (err)
    {
        throw new Error("Your reply was not a single JSON object (no code fence, no prose around it): "
            + `${err instanceof Error ? err.message : String(err)}`);
    }

    const reply = value as Partial<Reply> | null;

    if (reply === null || typeof reply !== "object" || Array.isArray(reply) || typeof reply.say !== "string"
        || !Array.isArray(reply.messages))
    {
        throw new Error('Your reply must be one JSON object with "say" (a string) and "messages" (an array).');
    }

    return { say: reply.say, messages: reply.messages };
}

function repairPrompt(feedback: string): string
{
    return "Your last reply was not applied, or rendered with errors. Fix exactly these problems and reply again "
        + `under the same contract:\n${feedback}`;
}
