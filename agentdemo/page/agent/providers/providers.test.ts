/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiReferenceAgent / Providers. The exact requests the browser
 *    sends to Anthropic and OpenAI with the user's own key, how replies and
 *    usage are read, and how every failure becomes a literate, key-free
 *    message without a retry (#30 spec §6.4, §14.1).
 */

import { afterEach, describe, expect, test, vi } from "vitest";

import { ANTHROPIC_DEFAULT_MODEL, anthropicProvider } from "./anthropic";
import { OPENAI_UNREADABLE, openaiProvider } from "./openai";
import type { CompleteRequest } from "../types";

const KEY = "sk-test-0123456789abcdef";

function request(model = "m"): CompleteRequest
{
    return { system: "SYS", turns: [{ role: "user", text: "hi" }, { role: "assistant", text: "{}" }], model,
        key: KEY, signal: new AbortController().signal };
}

function respond(status: number, body: unknown): ReturnType<typeof vi.fn>
{
    const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));

    vi.stubGlobal("fetch", fetch);

    return fetch;
}

afterEach(() => vi.unstubAllGlobals());

describe("anthropicProvider", () =>
{
    test("defaults to claude-sonnet-5-5", () =>
    {
        expect(ANTHROPIC_DEFAULT_MODEL).toBe("claude-sonnet-5-5");
    });

    test("posts to the Messages API with the browser-access header and a cacheable system prompt", async () =>
    {
        const fetch = respond(200, { content: [{ type: "text", text: "{}" }], usage: { input_tokens: 1,
            output_tokens: 2 } });
        const r = request();

        await anthropicProvider.complete(r);

        const [url, init] = fetch.mock.calls[0] as [string, RequestInit];

        expect(url).toBe("https://api.anthropic.com/v1/messages");
        expect(init.method).toBe("POST");
        expect(init.signal).toBe(r.signal);
        expect(init.headers).toEqual({ "x-api-key": KEY, "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true", "content-type": "application/json" });
        expect(JSON.parse(String(init.body))).toEqual({ model: "m", max_tokens: 8192,
            system: [{ type: "text", text: "SYS", cache_control: { type: "ephemeral" } }],
            messages: [{ role: "user", content: "hi" }, { role: "assistant", content: "{}" }] });
    });

    test("reads the text and the usage, including cached tokens", async () =>
    {
        respond(200, { content: [{ type: "text", text: "a" }, { type: "text", text: "b" }],
            usage: { input_tokens: 10, output_tokens: 4, cache_read_input_tokens: 7 } });

        expect(await anthropicProvider.complete(request())).toEqual({ text: "ab",
            usage: { input: 10, output: 4, cached: 7 } });
    });

    test.each([
        [401, "Anthropic rejected the key (401). Check that it is an API key with access to the Messages API."],
        [429, "Anthropic is rate-limiting this key (429). Wait, then press Retry."],
        [529, "Anthropic returned 529: Overloaded"],
    ])("a %i becomes a literate message", async (status, message) =>
    {
        const fetch = respond(status, { type: "error", error: { message: "Overloaded" } });

        await expect(anthropicProvider.complete(request())).rejects.toThrow(message);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test("an error body that echoes the key is redacted", async () =>
    {
        respond(400, { error: { message: `bad key ${KEY}` } });

        await expect(anthropicProvider.complete(request()))
            .rejects.toThrow("Anthropic returned 400: bad key [redacted key]");
    });

    test("a network failure says Anthropic could not be reached", async () =>
    {
        vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));

        await expect(anthropicProvider.complete(request()))
            .rejects.toThrow("Could not reach Anthropic: Failed to fetch");
    });

    test("a body that is not JSON names the provider and status", async () =>
    {
        vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Bad gateway</html>", { status: 502 })));

        await expect(anthropicProvider.complete(request()))
            .rejects.toThrow("Anthropic returned 502 with a body that is not JSON: <html>Bad gateway</html>");
    });

    test("a reply with no text is an error, not an empty string", async () =>
    {
        respond(200, { content: [], usage: { input_tokens: 1, output_tokens: 0 } });

        await expect(anthropicProvider.complete(request())).rejects.toThrow("Anthropic returned no text");
    });
});

describe("openaiProvider", () =>
{
    test("posts to chat completions in JSON mode with the system prompt first", async () =>
    {
        const fetch = respond(200, { choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 1,
            completion_tokens: 1 } });

        await openaiProvider.complete(request("gpt-x"));

        const [url, init] = fetch.mock.calls[0] as [string, RequestInit];

        expect(url).toBe("https://api.openai.com/v1/chat/completions");
        expect(init.headers).toEqual({ authorization: `Bearer ${KEY}`, "content-type": "application/json" });
        expect(JSON.parse(String(init.body))).toEqual({ model: "gpt-x", response_format: { type: "json_object" },
            messages: [{ role: "system", content: "SYS" }, { role: "user", content: "hi" },
                { role: "assistant", content: "{}" }] });
    });

    test("reads the content and the usage, including cached tokens", async () =>
    {
        respond(200, { choices: [{ message: { content: "x" } }], usage: { prompt_tokens: 9, completion_tokens: 3,
            prompt_tokens_details: { cached_tokens: 6 } } });

        expect(await openaiProvider.complete(request()))
            .toEqual({ text: "x", usage: { input: 9, output: 3, cached: 6 } });
    });

    test("an empty model is refused before anything is sent", async () =>
    {
        const fetch = respond(200, {});

        await expect(openaiProvider.complete(request(" ")))
            .rejects.toThrow("Enter an OpenAI model ID; there is no default.");
        expect(fetch).not.toHaveBeenCalled();
    });

    test("an unreadable response says what it could be, because OpenAI hides its errors from browsers", async () =>
    {
        vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));

        await expect(openaiProvider.complete(request())).rejects.toThrow(OPENAI_UNREADABLE);
    });

    test("a readable error is reported with its status, redacted", async () =>
    {
        const fetch = respond(400, { error: { message: `Incorrect API key provided: ${KEY}` } });

        await expect(openaiProvider.complete(request()))
            .rejects.toThrow("OpenAI returned 400: Incorrect API key provided: [redacted key]");
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
