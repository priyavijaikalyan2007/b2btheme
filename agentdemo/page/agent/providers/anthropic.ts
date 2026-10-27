/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiReferenceAgent / Anthropic
 * 📜 PURPOSE: Claude through the Messages API, called directly from the
 *    browser with the user's own key (#30 spec §6.4). Anthropic allows this
 *    behind `anthropic-dangerous-direct-browser-access`, and its error
 *    responses are readable cross-origin (verified, spec §14.1). No SDK, no
 *    retry: one fetch per call.
 * 🔗 RELATES: [[A2uiReferenceAgent]]
 * ----------------------------------------------------------------------------
 */

import { readJson } from "./read-json";
import { redactKey } from "../redact";
import type { CompleteRequest, CompleteResult, Provider } from "../types";

export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-5-5";

const URL = "https://api.anthropic.com/v1/messages";
const MAX_TOKENS = 8192;

interface MessagesResponse
{
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number };
    error?: { message?: string };
}

export const anthropicProvider: Provider = {
    id: "anthropic",
    label: "Claude (Anthropic)",
    complete,
};

async function complete(r: CompleteRequest): Promise<CompleteResult>
{
    let res: Response;

    try
    {
        res = await fetch(URL, { method: "POST", signal: r.signal, body: JSON.stringify(body(r)), headers: {
            "x-api-key": r.key, "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true", "content-type": "application/json" } });
    }
    catch (err)
    {
        if (r.signal.aborted) { throw err; }
        throw new Error(`Could not reach Anthropic: ${err instanceof Error ? err.message : String(err)}`);
    }

    const json = await readJson<MessagesResponse>(res, "Anthropic", r.key);

    if (!res.ok) { throw new Error(failure(res.status, json, r.key)); }

    return read(json);
}

/** The system prompt is marked cacheable: it is identical on every turn. */
function body(r: CompleteRequest): Record<string, unknown>
{
    return { model: r.model, max_tokens: MAX_TOKENS,
        system: [{ type: "text", text: r.system, cache_control: { type: "ephemeral" } }],
        messages: r.turns.map((t) => ({ role: t.role, content: t.text })) };
}

function read(json: MessagesResponse): CompleteResult
{
    const text = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");

    if (text === "") { throw new Error("Anthropic returned no text in its reply."); }

    const u = json.usage ?? {};

    return { text, usage: { input: u.input_tokens ?? 0, output: u.output_tokens ?? 0,
        cached: u.cache_read_input_tokens ?? 0 } };
}

function failure(status: number, json: MessagesResponse, key: string): string
{
    if (status === 401)
    {
        return "Anthropic rejected the key (401). Check that it is an API key with access to the Messages API.";
    }
    if (status === 429) { return "Anthropic is rate-limiting this key (429). Wait, then press Retry."; }

    return `Anthropic returned ${status}: ${redactKey(json.error?.message ?? "no error message", key)}`;
}
