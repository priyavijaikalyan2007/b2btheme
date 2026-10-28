/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiAdapter / RoundTrip. A user's edit is written to the path
 *    bound to `value`; an event's payload is written to <eventData>/<channel>
 *    before its action is dispatched; a change the agent caused is never
 *    echoed back as a user event (spec §5.6, §5.7). Real web_core contexts.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { defineTestElement, type ElementEnv } from "./element";
import { resetLoaderForTests } from "./loader";
import type { AdapterDescriptor } from "./types";
import {
    fakeDescriptor, fireAssetLoads, flush, installFakeFactory, realContext, type FakeRecord, type RealContext,
} from "../testing/context";

let tagCount = 0;
let record: FakeRecord;

type Handle = Record<string, unknown> & { emit(channel: string, payload: unknown): void };

/** A field shape: two-way value through the injected onChange option, no events. */
const FIELD = fakeDescriptor({ conformance: "field", changeOption: "onChange", props: { value: { route: "value" } } });

/** A surface shape: a payloadInValue change channel plus a submit channel. */
const SURFACE = fakeDescriptor({ props: { value: { route: "value" } }, events: [
    { channel: "change", option: "onChange", actionProp: "onChange", payloadInValue: true },
    { channel: "submit", option: "onSubmit", actionProp: "onSubmit", payloadInValue: false },
] });

async function mounted(descriptor: AdapterDescriptor, rc: RealContext): Promise<Handle>
{
    const tag = `outcrop-rt-${++tagCount}`;
    const env: ElementEnv = { descriptor, validators: { "Fake.value": () => true },
        assetBaseUrl: () => "https://cdn.test", injectBaseTheme: () => false, providerTimeoutMs: () => 30_000 };

    defineTestElement(tag, env);
    const el = document.createElement(tag) as HTMLElement & { context: unknown; handle: Handle };
    el.context = rc.ctx;
    document.body.appendChild(el);
    fireAssetLoads();
    await flush();

    return el.handle;
}

beforeEach(() =>
{
    resetLoaderForTests();
    document.head.replaceChildren();
    document.body.replaceChildren();
    record = installFakeFactory();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => { vi.restoreAllMocks(); });

describe("two-way value", () =>
{
    // SprintPicker's constructor calls setValue(options.value), and its onChange
    // fires on programmatic changes too. Normalising its own initial value is not
    // a user edit: it must not write back, and must not mount a second time (B2).
    test("an onChange fired while the factory is still constructing neither writes back nor remounts", async () =>
    {
        const factory = window.createFake;
        window.createFake = (id: string, options: Record<string, unknown>) =>
        {
            const handle = factory(id, options);
            (options.onChange as (v: unknown) => void)("normalised");
            return handle;
        };
        const rc = realContext({ value: { path: "/v" } }, { v: "a" });
        await mounted(FIELD, rc);

        expect(record.builds).toHaveLength(1);
        expect(rc.getData("/v")).toBe("a");
        expect(rc.actions).toEqual([]);
    });

    test("a field's injected onChange writes the bound path; the echo is not applied back", async () =>
    {
        const rc = realContext({ value: { path: "/v" } }, { v: "a" });
        await mounted(FIELD, rc);

        (record.builds[0].options.onChange as (v: unknown) => void)("x");

        expect(rc.getData("/v")).toBe("x");
        expect(record.calls).toEqual([]);
        expect(rc.actions).toEqual([]);
    });

    // ADR-222 (#39): the manifest's protocol.change mapping is applied before the write.
    test("valueFrom writes that property of the payload, and its echo is not applied back", async () =>
    {
        const rc = realContext({ value: { path: "/v" } }, { v: "#f00" });
        await mounted(fakeDescriptor({ ...FIELD, change: { valueFrom: "hex" } }), rc);

        (record.builds[0].options.onChange as (v: unknown) => void)({ hex: "#00f", label: "Blue" });
        await flush();

        expect(rc.getData("/v")).toBe("#00f");
        expect(record.calls).toEqual([]);
    });

    test("valueFrom applies to a surface's change channel too", async () =>
    {
        const onChange = { event: { name: "changed", context: { v: { path: "/v" } } } };
        const rc = realContext({ value: { path: "/v" }, onChange }, { v: "#f00" });
        const handle = await mounted(fakeDescriptor({ ...SURFACE, change: { valueFrom: "hex" } }), rc);

        handle.emit("change", { hex: "#0f0", label: "Green" });
        await flush();

        expect(rc.getData("/v")).toBe("#0f0");
        expect(rc.actions).toMatchObject([{ name: "changed", context: { v: "#0f0" } }]);
    });

    // An A2UI data model cannot hold null: setting it deletes the key. So for a
    // { cleared: null } component, cleared is absent, in both directions.
    test("cleared: the user clearing the value deletes the bound path, with no lost-binding error", async () =>
    {
        const rc = realContext({ value: { path: "/v" } }, { v: "a" });
        await mounted(fakeDescriptor({ ...FIELD, change: { cleared: null } }), rc);

        (record.builds[0].options.onChange as (v: unknown) => void)(null);
        await flush();

        expect(rc.getData("/v")).toBeUndefined();
        expect(rc.errors).toEqual([]);
        expect(record.calls).toEqual([]);
    });

    test("cleared: the agent deleting the bound path clears the component with setValue(null)", async () =>
    {
        const rc = realContext({ value: { path: "/v" } }, { v: "a" });
        await mounted(fakeDescriptor({ ...FIELD, change: { cleared: null } }), rc);

        rc.setData("/v", undefined);
        await flush();

        expect(record.calls).toEqual([["setValue", null]]);
        expect(rc.errors).toEqual([]);
    });

    test("cleared on a surface's change channel: the path is deleted, then onChange fires", async () =>
    {
        const onChange = { event: { name: "changed", context: { v: { path: "/v" } } } };
        const rc = realContext({ value: { path: "/v" }, onChange }, { v: "a" });
        const handle = await mounted(fakeDescriptor({ ...SURFACE, change: { cleared: null } }), rc);

        handle.emit("change", null);
        await flush();

        expect(rc.getData("/v")).toBeUndefined();
        expect(rc.errors).toEqual([]);
        expect(rc.actions).toHaveLength(1);
        expect(rc.actions[0]).toMatchObject({ name: "changed" });
        // The bound value is absent, so on the wire (JSON) the agent sees the key omitted.
        expect(JSON.parse(JSON.stringify((rc.actions[0] as { context: unknown }).context))).toEqual({});
    });

    test("without cleared, the agent deleting the bound path is still a lost binding", async () =>
    {
        const rc = realContext({ value: { path: "/v" } }, { v: "a" });
        await mounted(FIELD, rc);

        rc.setData("/v", undefined);
        await flush();

        expect(rc.errors).toEqual([expect.objectContaining({ code: "OUTCROP_BINDING_LOST" })]);
    });

    test("a surface's change channel writes the bound path, then dispatches onChange", async () =>
    {
        const rc = realContext({ value: { path: "/v" }, onChange: { event: { name: "changed", context: { v: { path: "/v" } } } } }, { v: "a" });
        const handle = await mounted(SURFACE, rc);

        handle.emit("change", "y");
        await flush();

        expect(rc.getData("/v")).toBe("y");
        expect(rc.actions).toMatchObject([{ name: "changed", context: { v: "y" } }]);
    });

    test("a literal value: the edit is not written anywhere, but onChange still fires", async () =>
    {
        const rc = realContext({ value: "a", onChange: { event: { name: "changed" } } });
        const handle = await mounted(SURFACE, rc);

        handle.emit("change", "y");
        await flush();

        expect(rc.actions).toMatchObject([{ name: "changed" }]);
    });

    test("an agent update that makes the component emit change is not echoed back", async () =>
    {
        const rc = realContext({ value: { path: "/v" }, onChange: { event: { name: "changed" } } }, { v: "a" });
        const handle = await mounted(SURFACE, rc);
        handle.setValue = (v: unknown) => { record.calls.push(["setValue", v]); handle.emit("change", v); };

        rc.setData("/v", "agent");
        await flush();

        expect(record.calls).toEqual([["setValue", "agent"]]);
        expect(rc.actions).toEqual([]);
    });
});

describe("events", () =>
{
    test("the payload is written to <eventData>/<channel> before the action, which sees it", async () =>
    {
        const rc = realContext({ eventData: { path: "/ev" },
            onSubmit: { event: { name: "submitted", context: { text: { path: "/ev/submit/text" } } } } });
        const handle = await mounted(SURFACE, rc);

        handle.emit("submit", { text: "hi" });
        await flush();

        expect(rc.getData("/ev/submit")).toEqual({ text: "hi" });
        expect(rc.actions).toMatchObject([{ name: "submitted", sourceComponentId: "root", context: { text: "hi" } }]);
    });

    test("with no eventData binding the action still fires and nothing is written", async () =>
    {
        const rc = realContext({ onSubmit: { event: { name: "submitted" } } });
        const handle = await mounted(SURFACE, rc);

        handle.emit("submit", { text: "hi" });
        await flush();

        expect(rc.getData("/ev")).toBeUndefined();
        expect(rc.actions).toMatchObject([{ name: "submitted" }]);
    });

    test("with no action prop the payload is written and nothing is sent", async () =>
    {
        const rc = realContext({ eventData: { path: "/ev" } });
        const handle = await mounted(SURFACE, rc);

        handle.emit("submit", { text: "hi" });
        await flush();

        expect(rc.getData("/ev/submit")).toEqual({ text: "hi" });
        expect(rc.actions).toEqual([]);
    });

    test("a Date in a payload is written as an ISO string", async () =>
    {
        const rc = realContext({ eventData: { path: "/ev" } });
        const handle = await mounted(SURFACE, rc);

        handle.emit("submit", { at: new Date("2026-10-26T10:00:00.000Z") });

        expect(rc.getData("/ev/submit")).toEqual({ at: "2026-10-26T10:00:00.000Z" });
    });

    test("a rebuild releases the old handle's listeners", async () =>
    {
        const rc = realContext({ title: "t", eventData: { path: "/ev" } });
        const old = await mounted(fakeDescriptor({ events: SURFACE.events }), rc);

        rc.setProps({ title: "u", eventData: { path: "/ev" } });
        old.emit("submit", { text: "stale" });

        expect(record.builds).toHaveLength(2);
        expect(rc.getData("/ev/submit")).toBeUndefined();
    });

    test("a descriptor with channels whose handle has no on() is OUTCROP_MOUNT_FAILED, and the handle is destroyed", async () =>
    {
        const install = (window as unknown as Record<string, (id: string, o: unknown) => unknown>).createFake;
        (window as unknown as Record<string, unknown>).createFake = (id: string, o: unknown) =>
        {
            const h = install(id, o) as Record<string, unknown>;
            delete h.on;
            return h;
        };
        const rc = realContext({});
        await mounted(SURFACE, rc);
        await flush();

        expect(rc.errors).toMatchObject([{ code: "OUTCROP_MOUNT_FAILED" }]);
        expect(String(rc.errors[0].message)).toMatch(/no on\(\) method/);
        expect(record.destroyed).toBe(1);
    });
});
