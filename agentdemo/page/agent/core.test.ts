/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiReferenceAgent. The agent loop with a scripted provider
 *    (#30 spec §6.3): replies are checked before they are applied, all or
 *    nothing; repairs are bounded at two and then stop visibly; actions go
 *    to the model verbatim; provider errors are never retried and never
 *    carry the key. The key sentinel must appear nowhere but the request.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { FAILED_UNAPPLIED, FAILED_WITH_ERRORS, MAX_REPAIRS, parseReply, Session } from "./core";
import type { SessionEvent } from "./core";
import type { CompleteRequest, Provider } from "./types";
import type { ApplyResult, Finding } from "../types";

const KEY = "sk-SENTINEL-0123456789";
const V = "v0.9.1";
const MSG = { version: V, createSurface: { surfaceId: "s", catalogId: "x" } };
const OK = JSON.stringify({ say: "Here it is.", messages: [MSG] });
const BAD = JSON.stringify({ say: "Oops.", messages: [{ version: V, nope: {} }] });
const FINDING: Finding = { index: 0, path: "", layer: "schema", message: "bad message" };
const APPLIED: ApplyResult = { applied: true, findings: [], errors: [] };

interface Rig
{
    session: Session;
    events: SessionEvent[];
    requests: CompleteRequest[];
    apply: ReturnType<typeof vi.fn>;
}

/** A session whose provider returns `replies` in order (an Error is thrown). */
function rig(replies: Array<string | Error>, applyResult: ApplyResult = APPLIED): Rig
{
    const events: SessionEvent[] = [];
    const requests: CompleteRequest[] = [];
    const queue = [...replies];
    const provider: Provider = { id: "anthropic", label: "Fake", complete: async (r) =>
    {
        requests.push(r);
        const next = queue.shift();

        if (next instanceof Error) { throw next; }
        if (next === undefined) { throw new Error("the scripted provider ran out of replies"); }

        return { text: next, usage: { input: 10, output: 5, cached: 3 } };
    } };
    const apply = vi.fn(() => applyResult);
    const session = new Session({ provider, model: () => "m", key: () => KEY, system: "SYSTEM",
        checkSchema: (m) => (JSON.stringify(m).includes("nope") ? [FINDING] : []),
        formatFindings: (f) => f.map((x) => x.message).join("\n"), apply, onEvent: (e) => events.push(e) });

    return { session, events, requests, apply };
}

const kinds = (events: SessionEvent[]) => events.map((e) => e.kind);
let consoleText = "";

beforeEach(() =>
{
    consoleText = "";
    for (const level of ["log", "debug", "info", "warn", "error"] as const)
    {
        vi.spyOn(console, level).mockImplementation((...a: unknown[]) => { consoleText += JSON.stringify(a); });
    }
});

afterEach(() => vi.restoreAllMocks());

describe("Session", () =>
{
    test("a valid reply is applied once, says its text and is recorded in the transcript", async () =>
    {
        const r = rig([OK]);

        expect(await r.session.send("build it")).toBe("applied");
        expect(r.apply).toHaveBeenCalledTimes(1);
        expect(r.apply).toHaveBeenCalledWith([MSG]);
        expect(kinds(r.events)).toEqual(["busy", "usage", "say", "applied", "busy"]);
        expect(r.session.transcript()).toEqual([{ kind: "user", text: "build it" },
            { kind: "say", text: "Here it is." }, { kind: "a2ui", message: MSG }]);
        expect(r.requests[0]).toMatchObject({ system: "SYSTEM", model: "m",
            turns: [{ role: "user", text: "build it" }] });
    });

    test("unparseable JSON is repaired with the parse error, then a valid reply applies", async () =>
    {
        const r = rig(["```json\n{}\n```", OK]);

        expect(await r.session.send("go")).toBe("applied");
        expect(r.requests).toHaveLength(2);
        expect(r.requests[1].turns.at(-1)?.text).toContain("not a single JSON object");
        expect(kinds(r.events)).toContain("repair");
    });

    test("schema findings are sent back and nothing is applied until a valid reply", async () =>
    {
        const r = rig([BAD, OK]);

        expect(await r.session.send("go")).toBe("applied");
        expect(r.requests[1].turns.at(-1)?.text).toContain("bad message");
        expect(r.apply).toHaveBeenCalledTimes(1);
        expect(r.session.transcript().map((l) => l.kind)).toEqual(["user", "finding", "say", "a2ui"]);
    });

    test("after two failed repairs the loop stops, says so and applies nothing", async () =>
    {
        const r = rig([BAD, BAD, BAD, OK]);

        expect(await r.session.send("go")).toBe("failed");
        expect(r.requests).toHaveLength(MAX_REPAIRS + 1);
        expect(r.apply).not.toHaveBeenCalled();
        expect(r.events.find((e) => e.kind === "failed")).toMatchObject({ message: FAILED_UNAPPLIED });
    });

    test("surface errors from an applied batch are sent back, and the stop message says what was rendered", async () =>
    {
        const error = { version: V, error: { code: "VALIDATION_FAILED", path: "/x", message: "m" } } as const;
        const r = rig([OK, OK, OK], { applied: true, findings: [], errors: [error] });

        expect(await r.session.send("go")).toBe("failed");
        expect(r.requests[1].turns.at(-1)?.text).toContain(JSON.stringify(error));
        expect(r.events.find((e) => e.kind === "failed")).toMatchObject({ message: FAILED_WITH_ERRORS });
    });

    test("an action is sent to the model verbatim as the next user turn", async () =>
    {
        const r = rig([OK, OK]);
        const action = { version: V, action: { name: "noteChanged", context: { text: "hi" } } } as const;

        await r.session.send("go");
        await r.session.deliver(action);

        expect(r.requests[1].turns.at(-1)).toEqual({ role: "user", text: JSON.stringify(action) });
        expect(r.session.transcript()).toContainEqual({ kind: "action", message: action });
    });

    test("a provider error is reported once, redacted, and never retried", async () =>
    {
        const r = rig([new Error(`Incorrect API key provided: ${KEY}`)]);

        expect(await r.session.send("go")).toBe("providerError");
        expect(r.requests).toHaveLength(1);
        expect(r.events.find((e) => e.kind === "providerError")).toEqual({ kind: "providerError",
            message: "Incorrect API key provided: [redacted key]" });
    });

    test("stop aborts the request in flight", async () =>
    {
        const events: SessionEvent[] = [];
        const provider: Provider = { id: "openai", label: "Slow", complete: (req) => new Promise((_, reject) =>
            req.signal.addEventListener("abort", () => reject(new Error("aborted")))) };
        const session = new Session({ provider, model: () => "m", key: () => KEY, system: "S", checkSchema: () => [],
            formatFindings: () => "", apply: () => APPLIED, onEvent: (e) => events.push(e) });
        const outcome = session.send("go");

        session.stop();

        expect(await outcome).toBe("stopped");
        expect(kinds(events)).toEqual(["busy", "busy"]);
    });

    test("the key appears nowhere: not in events, transcript, logs or provider-visible turns", async () =>
    {
        const runs = [rig([OK]), rig([BAD, BAD, BAD]), rig([new Error(`bad key ${KEY}`)])];

        for (const r of runs) { await r.session.send("go"); }

        const visible = JSON.stringify(runs.map((r) => [r.events, r.session.transcript(),
            r.requests.map((q) => q.turns)])) + consoleText;

        expect(visible).not.toContain(KEY);
        expect(runs[0].requests[0].key).toBe(KEY);
    });
});

describe("parseReply", () =>
{
    test("accepts exactly one object with say and messages", () =>
    {
        expect(parseReply(` ${OK} `)).toEqual({ say: "Here it is.", messages: [MSG] });
    });

    test.each([
        ["prose around the JSON", `Sure! ${OK}`],
        ["an array", "[]"],
        ["a missing say", JSON.stringify({ messages: [] })],
        ["messages that are not an array", JSON.stringify({ say: "x", messages: {} })],
    ])("refuses %s", (_label, text) =>
    {
        expect(() => parseReply(text)).toThrow();
    });
});
