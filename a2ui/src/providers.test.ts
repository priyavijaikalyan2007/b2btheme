/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the A2UI adapter's provider lifecycle (ADR-225, spec §3) against a
 *    real web_core surface: one outstanding request per provider, latest and
 *    queue, validation, timeout, and teardown.
 */

import { afterEach, describe, expect, test, vi } from "vitest";

import { wireProviders } from "./providers";
import type { AdapterProvider, Validators } from "./types";
import { fakeDescriptor, flush, realContext } from "../testing/context";

const LOAD: AdapterProvider = { option: "onLoad", request: "load", actionProp: "onLoad", resultProp: "loadResult",
    concurrency: "queue" };
const FIND: AdapterProvider = { option: "onFind", request: "find", actionProp: "onFind", resultProp: "findResult",
    concurrency: "latest" };
const strings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");
const VALIDATORS: Validators = { "Fake.loadResult": strings, "Fake.findResult": strings };
const BOUND = { onLoad: { event: { name: "load", context: { node: { path: "/ev/load" } } } },
    loadResult: { path: "/a/load" }, onFind: { event: { name: "find", context: { q: { path: "/ev/find" } } } },
    findResult: { path: "/a/find" }, eventData: { path: "/ev" } };

function wired(props: Record<string, unknown> = BOUND, timeoutMs = 30_000)
{
    const rc = realContext(props);
    const w = wireProviders(rc.ctx, fakeDescriptor({ providers: [LOAD, FIND] }), VALIDATORS, timeoutMs);

    return { rc, w };
}

interface Tracked { settled: boolean; value?: unknown; error?: unknown }

/** Records whether a promise has settled, without awaiting it. */
function track(p: Promise<unknown>): Tracked
{
    const t: Tracked = { settled: false };

    p.then((v) => { t.settled = true; t.value = v; }, (e) => { t.settled = true; t.error = e; });

    return t;
}

const contextOf = (a: Record<string, unknown>) => a.context as Record<string, unknown>;

afterEach(() => { vi.useRealTimers(); });

describe("wiring", () =>
{
    test("a provider is passed only when its action, its result binding and eventData are all set", () =>
    {
        expect(Object.keys(wired().w.options).sort()).toEqual(["onFind", "onLoad"]);

        const { onFind: _action, ...noAction } = BOUND;
        expect(Object.keys(wired(noAction).w.options)).toEqual(["onLoad"]);

        expect(Object.keys(wired({ ...BOUND, loadResult: ["literal"] }).w.options)).toEqual(["onFind"]);

        const { eventData: _eventData, ...noEventData } = BOUND;
        expect(wired(noEventData).w.options).toEqual({});
    });
});

describe("one request", () =>
{
    test("sending deletes the result path, then writes the request, then dispatches", () =>
    {
        const { rc, w } = wired();
        rc.setData("/a/load", ["stale"]);
        const order: string[] = [];
        const set = rc.ctx.dataContext.set.bind(rc.ctx.dataContext);
        vi.spyOn(rc.ctx.dataContext, "set").mockImplementation((p, v) => { order.push(p); set(p, v); });

        void w.options.onLoad({ id: "n1" });

        expect(order).toEqual(["/a/load", "/ev/load"]);
        expect(rc.getData("/a/load")).toBeUndefined();
        expect(rc.actions.map((a) => a.name)).toEqual(["load"]);
        expect(contextOf(rc.actions[0]).node).toEqual({ id: "n1" });
    });

    test("a valid answer resolves with a copy", async () =>
    {
        const { rc, w } = wired();
        const p = w.options.onLoad({ id: "n1" });

        rc.setData("/a/load", ["c1", "c2"]);

        const answer = await p;
        expect(answer).toEqual(["c1", "c2"]);
        expect(answer).not.toBe(rc.getData("/a/load"));
    });

    test("an answer equal to the previous one still resolves", async () =>
    {
        const { rc, w } = wired();
        const first = w.options.onFind("a");
        rc.setData("/a/find", ["x"]);
        await first;

        const second = w.options.onFind("a");
        rc.setData("/a/find", ["x"]);

        await expect(second).resolves.toEqual(["x"]);
    });

    test("an invalid answer is VALIDATION_FAILED at the result path, and the request stays open", async () =>
    {
        const { rc, w } = wired();
        const t = track(w.options.onLoad({ id: "n1" }));

        rc.setData("/a/load", [1, 2]);
        await flush();

        expect(t.settled).toBe(false);
        expect(rc.errors).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED", path: "/a/load" })]);

        rc.setData("/a/load", ["ok"]);
        await flush();
        expect(t.value).toEqual(["ok"]);
    });

    test("a write with nothing outstanding is ignored", async () =>
    {
        const { rc, w } = wired();

        rc.setData("/a/load", ["unasked"]);
        const t = track(w.options.onLoad({ id: "n1" }));
        await flush();

        expect(t.settled).toBe(false);
        expect(rc.errors).toEqual([]);
    });
});

describe("ack", () =>
{
    const SAVE: AdapterProvider = { option: "onSave", request: "feedback", actionProp: "onFeedback",
        resultProp: "feedbackResult", concurrency: "latest", ack: true };
    const props = { onFeedback: { event: { name: "feedback", context: { f: { path: "/ev/feedback" } } } },
        feedbackResult: { path: "/a/saved" }, eventData: { path: "/ev" } };
    const acked = (timeoutMs = 30_000) =>
    {
        const rc = realContext(props);
        const validators = { "Fake.feedbackResult": (v: unknown) => v === true };
        const w = wireProviders(rc.ctx, fakeDescriptor({ providers: [SAVE] }), validators, timeoutMs);

        return { rc, w };
    };

    test("the agent's true resolves the callback with no value", async () =>
    {
        const { rc, w } = acked();
        const p = w.options.onSave({ targetId: "r1" });

        expect(contextOf(rc.actions[0]).f).toEqual({ targetId: "r1" });
        rc.setData("/a/saved", true);

        await expect(p).resolves.toBeUndefined();
    });

    test("no acknowledgement in time rejects, so the component never shows it saved", async () =>
    {
        vi.useFakeTimers();
        const { w } = acked(1000);
        const t = track(w.options.onSave({ targetId: "r1" }));

        await vi.advanceTimersByTimeAsync(1000);

        expect(t.settled).toBe(true);
        expect(String(t.error)).toMatch(/did not answer onFeedback/);
    });
});

describe("concurrency", () =>
{
    test("latest: a newer request replaces the waiting one, and the replaced one gets its answer", async () =>
    {
        const { rc, w } = wired();
        const a = track(w.options.onFind("a"));
        const ab = track(w.options.onFind("ab"));
        const abc = track(w.options.onFind("abc"));

        expect(rc.actions.map(contextOf)).toEqual([{ q: "a" }]);

        rc.setData("/a/find", ["for-a"]);
        await flush();
        expect(a.value).toEqual(["for-a"]);
        expect(rc.actions.map(contextOf)).toEqual([{ q: "a" }, { q: "abc" }]);

        rc.setData("/a/find", ["for-abc"]);
        await flush();
        expect(ab.value).toEqual(["for-abc"]);
        expect(abc.value).toEqual(["for-abc"]);
    });

    test("queue: every request is sent, strictly in order", async () =>
    {
        const { rc, w } = wired();
        const one = track(w.options.onLoad({ id: "1" }));
        const two = track(w.options.onLoad({ id: "2" }));

        expect(rc.actions).toHaveLength(1);

        rc.setData("/a/load", ["kids-of-1"]);
        await flush();
        expect(one.value).toEqual(["kids-of-1"]);
        expect(two.settled).toBe(false);
        expect(contextOf(rc.actions[1]).node).toEqual({ id: "2" });

        rc.setData("/a/load", ["kids-of-2"]);
        await flush();
        expect(two.value).toEqual(["kids-of-2"]);
    });
});

describe("failure", () =>
{
    test("timeout rejects, reports OUTCROP_PROVIDER_TIMEOUT at the result path, and sends the next", async () =>
    {
        vi.useFakeTimers();
        const { rc, w } = wired(BOUND, 1000);
        const one = track(w.options.onLoad({ id: "1" }));
        void w.options.onLoad({ id: "2" });

        await vi.advanceTimersByTimeAsync(1000);

        expect(String(one.error)).toContain("1000 ms");
        expect(rc.errors).toEqual([expect.objectContaining({ code: "OUTCROP_PROVIDER_TIMEOUT", path: "/a/load" })]);
        expect(rc.actions).toHaveLength(2);
    });

    test("teardown stops the timer, so no timeout is reported later", async () =>
    {
        vi.useFakeTimers();
        const { rc, w } = wired(BOUND, 1000);
        void w.options.onLoad({ id: "1" });

        w.release();
        await vi.advanceTimersByTimeAsync(1000);

        expect(rc.errors).toEqual([]);
    });

    test("teardown unsubscribes from every result path", () =>
    {
        const rc = realContext(BOUND);
        const subscribe = rc.ctx.dataContext.subscribeDynamicValue.bind(rc.ctx.dataContext);
        const unsubscribes: ReturnType<typeof vi.fn>[] = [];
        vi.spyOn(rc.ctx.dataContext, "subscribeDynamicValue").mockImplementation((v, cb) =>
        {
            const sub = subscribe(v, cb);
            const unsubscribe = vi.fn(() => sub.unsubscribe());
            unsubscribes.push(unsubscribe);
            return { value: sub.value, unsubscribe };
        });
        const w = wireProviders(rc.ctx, fakeDescriptor({ providers: [LOAD, FIND] }), VALIDATORS, 30_000);

        w.release();

        expect(unsubscribes).toHaveLength(2);
        unsubscribes.forEach((u) => expect(u).toHaveBeenCalledTimes(1));
    });

    test("teardown drops pending requests unsettled, and a late answer is ignored", async () =>
    {
        const { rc, w } = wired();
        const one = track(w.options.onLoad({ id: "1" }));
        const two = track(w.options.onLoad({ id: "2" }));

        w.release();
        rc.setData("/a/load", ["late"]);
        await flush();

        expect(one.settled).toBe(false);
        expect(two.settled).toBe(false);
        expect(rc.actions).toHaveLength(1);
        expect(rc.errors).toEqual([]);
    });
});

describe("a provider with several parameters (#68)", () =>
{
    const RENAME: AdapterProvider = { option: "onRename", request: "rename", actionProp: "onRename",
        resultProp: "renameResult", concurrency: "queue", params: ["file", "newName"] };
    const PROPS = { onRename: { event: { name: "rename", context: {} } }, renameResult: { path: "/a/rename" },
        eventData: { path: "/ev" } };

    test("packs its arguments into one request under the param names, and resolves with the answer", async () =>
    {
        const rc = realContext(PROPS);
        const w = wireProviders(rc.ctx, fakeDescriptor({ providers: [RENAME] }),
            { "Fake.renameResult": (v) => typeof v === "boolean" }, 30_000);

        const answer = track(w.options.onRename({ id: "f1", name: "a.txt" }, "b.txt"));
        expect(rc.getData("/ev/rename")).toEqual({ file: { id: "f1", name: "a.txt" }, newName: "b.txt" });

        rc.setData("/a/rename", true);
        await flush();

        expect(answer).toEqual({ settled: true, value: true });
        w.release();
    });
});
