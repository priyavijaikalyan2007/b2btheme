/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 6d1643f1-82a2-4653-a00b-160ac4e7c17a
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / TestContext (tests only)
 * 📜 PURPOSE: A real @a2ui/web_core 0.14.0 surface and ComponentContext for
 *    one open-schema "Fake" component, plus a recording fake widget factory,
 *    so the element tests exercise web_core's genuine subscribeDynamicValue,
 *    set and dispatchAction rather than a hand-written double.
 * 🔗 RELATES: [[A2uiAdapter]]
 * ⚡ FLOW: [test] -> [realContext] -> [MessageProcessor + ComponentContext]
 * ----------------------------------------------------------------------------
 */

import { Catalog, ComponentContext, MessageProcessor } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS } from "@a2ui/web_core/v0_9/basic_catalog";

import type { AdapterDescriptor, ComponentContextLike } from "../src/types";

const CATALOG_ID = "https://test.invalid/fake.json";
const V = "v0.9.1";

/** A live web_core surface holding one component, "root", of type Fake. */
export interface RealContext
{
    ctx: ComponentContextLike;
    /** A new ComponentContext object for the same component, as Lit makes on every parent render. */
    freshContext(): ComponentContextLike;
    setProps(props: Record<string, unknown>): void;
    setData(path: string, value: unknown): void;
    getData(path: string): unknown;
    errors: Record<string, unknown>[];
    actions: Record<string, unknown>[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/**
 * Builds a real surface with one Fake component carrying `props`, and `data`
 * in its data model.
 */
export function realContext(props: Record<string, unknown>, data: Record<string, unknown> = {}, surfaceId = "s1"): RealContext
{
    const api = (Catalog as Any).fromJson({ $schema: "https://json-schema.org/draft/2020-12/schema", $id: CATALOG_ID,
        catalogId: CATALOG_ID, functions: {}, components: { Fake: { type: "object", required: ["component", "id"],
            properties: { component: { const: "Fake" }, id: { type: "string" } }, additionalProperties: true } } });
    const catalog = new (Catalog as Any)(api.id, "0.9", [...api.components.values()], BASIC_FUNCTIONS);
    const actions: Record<string, unknown>[] = [];
    const processor = new (MessageProcessor as Any)([catalog], (a: Record<string, unknown>) => actions.push(a));
    const send = (m: Record<string, unknown>) => processor.processMessages([{ version: V, ...m }]);

    send({ createSurface: { surfaceId, catalogId: CATALOG_ID } });
    send({ updateComponents: { surfaceId, components: [{ id: "root", component: "Fake", ...props }] } });
    send({ updateDataModel: { surfaceId, path: "/", value: data } });

    const surface = processor.getSurface(surfaceId);
    const errors: Record<string, unknown>[] = [];

    surface.onError.subscribe((e: Record<string, unknown>) => errors.push(e));

    return {
        ctx: new (ComponentContext as Any)(surface, "root", "/") as ComponentContextLike,
        freshContext: () => new (ComponentContext as Any)(surface, "root", "/") as ComponentContextLike,
        setProps: (p) => send({ updateComponents: { surfaceId, components: [{ id: "root", component: "Fake", ...p }] } }),
        setData: (path, value) => send({ updateDataModel: { surfaceId, path, ...(value === undefined ? {} : { value }) } }),
        getData: (path) => surface.dataModel.get(path),
        errors, actions,
    };
}

/** What the fake widget factory recorded. */
export interface FakeRecord
{
    builds: { id: string; options: Record<string, unknown> }[];
    calls: [string, ...unknown[]][];
    destroyed: number;
    /** The latest handle's channel listeners. */
    listeners: Map<string, Set<(payload: unknown) => void>>;
}

/**
 * Installs window.createFake, a container-first factory whose handle records
 * every call, and returns the record. `emit(channel, payload)` on the handle
 * fires its `on()` listeners.
 */
export function installFakeFactory(): FakeRecord
{
    const record: FakeRecord = { builds: [], calls: [], destroyed: 0, listeners: new Map() };

    (window as Any).createFake = (id: string, options: Record<string, unknown>) =>
    {
        record.builds.push({ id, options });
        record.listeners = new Map();

        return fakeHandle(record, id);
    };

    return record;
}

function fakeHandle(record: FakeRecord, id: string): Record<string, unknown>
{
    const listeners = record.listeners;
    const call = (name: string) => (...args: unknown[]) => { record.calls.push([name, ...args]); };

    document.getElementById(id)?.appendChild(Object.assign(document.createElement("span"), { className: "fake-root" }));

    return {
        setData: call("setData"), setState: call("setState"), setValue: call("setValue"),
        destroy: () => { record.destroyed += 1; },
        on: (channel: string, fn: (p: unknown) => void) =>
        {
            const set = listeners.get(channel) ?? new Set();
            set.add(fn);
            listeners.set(channel, set);

            return () => set.delete(fn);
        },
        emit: (channel: string, payload: unknown) => { listeners.get(channel)?.forEach((fn) => fn(payload)); },
    };
}

/** Fires `load` on every script and stylesheet in <head>, as a browser would. */
export function fireAssetLoads(): void
{
    for (const el of document.head.querySelectorAll("script[src], link[rel=stylesheet]"))
    {
        el.dispatchEvent(new Event("load"));
    }
}

/** Fires `error` on every script and stylesheet in <head>. */
export function fireAssetErrors(): void
{
    for (const el of document.head.querySelectorAll("script[src], link[rel=stylesheet]"))
    {
        el.dispatchEvent(new Event("error"));
    }
}

/** Lets pending promise callbacks and microtasks run. */
export function flush(): Promise<void>
{
    return new Promise((r) => setTimeout(r, 0));
}

/** The descriptor for the Fake component used across element tests. */
export function fakeDescriptor(over: Partial<AdapterDescriptor> = {}): AdapterDescriptor
{
    return {
        name: "Fake", tagName: "outcrop-fake", factory: "createFake", factoryStyle: "container-first",
        mountMethod: "auto", conformance: "surface", assets: { js: "components/fake/fake.js" },
        props: { title: { route: "create" }, items: { route: "slot", slot: "items" }, mode: { route: "state", key: "mode" },
            value: { route: "value" } },
        twoWay: true, events: [], dates: [], ...over,
    };
}
