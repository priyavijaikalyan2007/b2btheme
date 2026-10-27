/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiReferenceAgent / Types
 * 📜 PURPOSE: The provider-neutral agent's vocabulary (#30 spec §6). A
 *    provider turns a conversation into text; everything else is core.ts.
 * 🔗 RELATES: [[A2uiReferenceAgent]]
 * ----------------------------------------------------------------------------
 */

export interface Turn
{
    readonly role: "user" | "assistant";
    readonly text: string;
}

export interface Usage
{
    readonly input: number;
    readonly output: number;
    readonly cached: number;
}

export interface CompleteRequest
{
    readonly system: string;
    readonly turns: readonly Turn[];
    readonly model: string;
    readonly key: string;
    readonly signal: AbortSignal;
}

export interface CompleteResult
{
    readonly text: string;
    readonly usage: Usage;
}

/** One LLM provider, called directly from the browser with the user's own key (spec §6.4). */
export interface Provider
{
    readonly id: "anthropic" | "openai";
    readonly label: string;
    complete(request: CompleteRequest): Promise<CompleteResult>;
}

export type TurnOutcome = "applied" | "failed" | "stopped" | "providerError";
