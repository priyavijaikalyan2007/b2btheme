/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiReferenceAgent / OpenAI
 * 📜 PURPOSE: OpenAI chat completions in JSON mode, called directly from the
 *    browser with the user's own key (#30 spec §6.4). There is no default
 *    model: the user must name one. No SDK, no retry: one fetch per call.
 * 🔗 RELATES: [[A2uiReferenceAgent]]
 *
 * WHY A FAILED REQUEST CANNOT SAY WHAT FAILED
 * -------------------------------------------
 * OpenAI's error responses carry no Access-Control-Allow-Origin (verified
 * 2026-10-27, spec §14.1), so the browser refuses to let the page read
 * them: a wrong key, model or quota surfaces as the same TypeError as a
 * network failure. The message says exactly that rather than guessing.
 * ----------------------------------------------------------------------------
 */

import { readJson } from "./read-json";
import { redactKey } from "../redact";
import type { CompleteRequest, CompleteResult, Provider } from "../types";

export const OPENAI_UNREADABLE = "OpenAI's response could not be read. Either the network failed, or OpenAI "
    + "rejected the request (a wrong key, model or quota); OpenAI does not let browsers read its error responses.";

const URL = "https://api.openai.com/v1/chat/completions";

interface ChatResponse
{
    choices?: { message?: { content?: string | null } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number } };
    error?: { message?: string };
}

export const openaiProvider: Provider = {
    id: "openai",
    label: "OpenAI",
    complete,
};

async function complete(r: CompleteRequest): Promise<CompleteResult>
{
    if (r.model.trim() === "") { throw new Error("Enter an OpenAI model ID; there is no default."); }

    let res: Response;

    try
    {
        res = await fetch(URL, { method: "POST", signal: r.signal, body: JSON.stringify(body(r)),
            headers: { authorization: `Bearer ${r.key}`, "content-type": "application/json" } });
    }
    catch (err)
    {
        if (r.signal.aborted) { throw err; }
        throw new Error(OPENAI_UNREADABLE);
    }

    const json = await readJson<ChatResponse>(res, "OpenAI", r.key);

    if (!res.ok)
    {
        const message = redactKey(json.error?.message ?? "no error message", r.key);

        throw new Error(`OpenAI returned ${res.status}: ${message}`);
    }

    return read(json);
}

function body(r: CompleteRequest): Record<string, unknown>
{
    const turns = r.turns.map((t) => ({ role: t.role, content: t.text }));

    return { model: r.model.trim(), response_format: { type: "json_object" },
        messages: [{ role: "system", content: r.system }, ...turns] };
}

function read(json: ChatResponse): CompleteResult
{
    const text = json.choices?.[0]?.message?.content ?? "";

    if (text === "") { throw new Error("OpenAI returned no text in its reply."); }

    const u = json.usage ?? {};

    return { text, usage: { input: u.prompt_tokens ?? 0, output: u.completion_tokens ?? 0,
        cached: u.prompt_tokens_details?.cached_tokens ?? 0 } };
}
