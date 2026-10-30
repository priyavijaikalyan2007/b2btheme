/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiAdapter / Element. The element binds from the context the
 *    host renderer assigns, waits for its assets and every bound value, mounts
 *    the real factory, routes each later change through the descriptor's
 *    route, rebuilds only for create-time props, reports every failure as an
 *    A2UI error, and tears down on a real disconnect (spec §4, §5, §6).
 *    Contexts come from a real @a2ui/web_core 0.14.0 surface.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { defineTestElement, type ElementEnv } from "./element";
import { resetLoaderForTests } from "./loader";
import type { AdapterDescriptor } from "./types";
import {
    fakeDescriptor, fireAssetErrors, fireAssetLoads, flush, installFakeFactory, realContext,
    type FakeRecord, type RealContext,
} from "../testing/context";

const BASE = "https://cdn.test";
const LOAD_PROVIDER = { option: "onLoad", request: "load", actionProp: "onLoad", resultProp: "loadResult",
    concurrency: "queue" as const };
let tagCount = 0;
let record: FakeRecord;

/** Defines a fresh tag for a descriptor, so each test can vary it. */
function tagFor(descriptor: AdapterDescriptor = fakeDescriptor()): string
{
    const tag = `outcrop-fake-${++tagCount}`;
    const env: ElementEnv = { descriptor, validators: { "Fake.items": (v) => Array.isArray(v), "Fake.title": (v) => typeof v === "string" },
        assetBaseUrl: () => BASE, injectBaseTheme: () => false, providerTimeoutMs: () => 30_000 };

    defineTestElement(tag, env);

    return tag;
}

type El = HTMLElement & { context: unknown; readonly handle: unknown };

function create(tag: string, rc: RealContext, connect = true): El
{
    const el = document.createElement(tag) as El;

    el.context = rc.ctx;
    if (connect) { document.body.appendChild(el); }

    return el;
}

async function loaded(): Promise<void>
{
    fireAssetLoads();
    await flush();
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

describe("binding and mounting", () =>
{
    test("a context set before connection mounts once connected", async () =>
    {
        const el = create(tagFor(), realContext({ title: "t" }), false);

        await loaded();
        expect(record.builds).toHaveLength(0);

        document.body.appendChild(el);
        expect(record.builds).toHaveLength(1);
    });

    test("a context set after connection mounts once assets load", async () =>
    {
        const el = document.createElement(tagFor()) as El;
        document.body.appendChild(el);
        el.context = realContext({ title: "t" }).ctx;

        expect(record.builds).toHaveLength(0);
        await loaded();
        expect(record.builds).toHaveLength(1);
        expect(el.querySelector(".outcrop-host .fake-root")).not.toBeNull();
        expect(el.hasAttribute("aria-busy")).toBe(false);
    });

    test("an overlay component mounts in a positioned box as tall as its manifest height (#41)", async () =>
    {
        const el = create(tagFor(fakeDescriptor({ overlay: { height: 300 } })), realContext({ title: "t" }));
        await loaded();

        const box = el.querySelector<HTMLElement>(".outcrop-host")!;
        expect(box.style.position).toBe("relative");
        expect(box.style.minHeight).toBe("300px");
    });

    test("a bound provider reaches the factory as its option, and unmount releases it (ADR-225)", async () =>
    {
        const rc = realContext({ title: "t", onLoad: { event: { name: "load" } }, loadResult: { path: "/a" },
            eventData: { path: "/ev" } });
        const el = create(tagFor(fakeDescriptor({ providers: [LOAD_PROVIDER] })), rc);
        await loaded();

        const onLoad = record.builds[0].options.onLoad as (r: unknown) => Promise<unknown>;
        expect(onLoad).toBeTypeOf("function");

        void onLoad({ id: "n" });
        expect(rc.actions.map((a) => a.name)).toEqual(["load"]);

        el.remove();
        await flush();
        rc.setData("/a", ["late"]);
        expect(rc.errors).toEqual([]);
    });

    test("a fixed option reaches the factory with its value on every mount (ADR-235)", async () =>
    {
        create(tagFor(fakeDescriptor({ fixed: { keyScope: "ribbon" } })), realContext({ title: "t" }));
        await loaded();

        expect(record.builds[0].options).toEqual(expect.objectContaining({ title: "t", keyScope: "ribbon" }));
    });

    test("an unbound provider is not passed to the factory", async () =>
    {
        create(tagFor(fakeDescriptor({ providers: [LOAD_PROVIDER] })), realContext({ title: "t" }));
        await loaded();

        expect("onLoad" in record.builds[0].options).toBe(false);
    });

    test("a framed component's box has no inline style", async () =>
    {
        const el = create(tagFor(), realContext({ title: "t" }));
        await loaded();

        expect(el.querySelector(".outcrop-host")!.getAttribute("style")).toBeNull();
    });

    test("a new context object for the same component does not rebuild", async () =>
    {
        const rc = realContext({ title: "t" });
        const el = create(tagFor(), rc);
        await loaded();

        el.context = rc.freshContext();
        el.context = rc.freshContext();

        expect(record.builds).toHaveLength(1);
        expect(record.destroyed).toBe(0);
    });

    test("a context for a different component tears down and rebuilds", async () =>
    {
        const el = create(tagFor(), realContext({ title: "t" }));
        await loaded();

        el.context = realContext({ title: "u" }, {}, "s2").ctx;
        await flush();

        expect(record.destroyed).toBe(1);
        expect(record.builds.map((b) => b.options.title)).toEqual(["t", "u"]);
    });

    test("absent props are omitted, and manifest defaultOptions are never read", async () =>
    {
        create(tagFor(), realContext({ title: "t" }));
        await loaded();

        expect(record.builds[0].options).toEqual({ title: "t" });
    });
});

describe("readiness and routes", () =>
{
    test("a bound prop with no data waits, busy, then mounts with the value", async () =>
    {
        const rc = realContext({ items: { path: "/items" } });
        const el = create(tagFor(), rc);
        await loaded();

        expect(record.builds).toHaveLength(0);
        expect(el.getAttribute("aria-busy")).toBe("true");

        rc.setData("/items", [1]);
        expect(record.builds[0].options).toEqual({ items: [1] });
    });

    test("a bound slot prop updates through setData without a rebuild", async () =>
    {
        const rc = realContext({ items: { path: "/items" } }, { items: [1] });
        create(tagFor(), rc);
        await loaded();

        rc.setData("/items", [2]);

        expect(record.calls).toEqual([["setData", "items", [2]]]);
        expect(record.builds).toHaveLength(1);
    });

    test("state and value literals route through setState and setValue", async () =>
    {
        const rc = realContext({ title: "t", mode: "a", value: "x" });
        create(tagFor(), rc);
        await loaded();

        rc.setProps({ title: "t", mode: "b", value: "y" });

        expect(record.calls).toEqual([["setState", { mode: "b" }], ["setValue", "y"]]);
        expect(record.builds).toHaveLength(1);
    });

    test("a changed create-time literal rebuilds", async () =>
    {
        const rc = realContext({ title: "t" });
        create(tagFor(), rc);
        await loaded();

        rc.setProps({ title: "u" });

        expect(record.destroyed).toBe(1);
        expect(record.builds.map((b) => b.options.title)).toEqual(["t", "u"]);
    });
});

describe("errors", () =>
{
    test("a bound value that fails its validator is VALIDATION_FAILED and is not applied", async () =>
    {
        const rc = realContext({ items: { path: "/items" } }, { items: [1] });
        create(tagFor(), rc);
        await loaded();

        rc.setData("/items", "bad");
        await flush();

        expect(rc.errors).toMatchObject([{ code: "VALIDATION_FAILED", path: "/items", surfaceId: "s1" }]);
        expect(record.calls).toEqual([]);
    });

    test("a bound value deleted after mount is OUTCROP_BINDING_LOST", async () =>
    {
        const rc = realContext({ items: { path: "/items" } }, { items: [1] });
        create(tagFor(), rc);
        await loaded();

        rc.setData("/items", undefined);
        await flush();

        expect(rc.errors).toMatchObject([{ code: "OUTCROP_BINDING_LOST", path: "/items" }]);
        expect(record.calls).toEqual([]);
    });

    test("an asset that fails to load is OUTCROP_ASSET_LOAD_FAILED and clears busy", async () =>
    {
        const rc = realContext({ title: "t" });
        const el = create(tagFor(), rc);

        fireAssetErrors();
        await flush();

        expect(rc.errors).toMatchObject([{ code: "OUTCROP_ASSET_LOAD_FAILED" }]);
        expect(String(rc.errors[0].message)).toContain("https://cdn.test/components/fake/fake.js");
        expect(el.hasAttribute("aria-busy")).toBe(false);
        expect(record.builds).toHaveLength(0);
    });

    test("a factory missing after load is OUTCROP_MOUNT_FAILED", async () =>
    {
        delete (window as unknown as Record<string, unknown>).createFake;
        const rc = realContext({ title: "t" });
        create(tagFor(), rc);
        await loaded();

        expect(rc.errors).toMatchObject([{ code: "OUTCROP_MOUNT_FAILED" }]);
        expect(String(rc.errors[0].message)).toMatch(/createFake is not defined/);
    });

    test("a factory that throws is OUTCROP_MOUNT_FAILED with its message", async () =>
    {
        (window as unknown as Record<string, unknown>).createFake = () => { throw new Error("boom in factory"); };
        const rc = realContext({ title: "t" });
        const el = create(tagFor(), rc);
        await loaded();

        expect(rc.errors).toMatchObject([{ code: "OUTCROP_MOUNT_FAILED" }]);
        expect(String(rc.errors[0].message)).toContain("boom in factory");
        expect(el.querySelector(".outcrop-host")).toBeNull();
    });

    test("a literal date that does not parse is VALIDATION_FAILED, never undefined", async () =>
    {
        const rc = realContext({ title: "nope" });
        create(tagFor(fakeDescriptor({ dates: ["title"] })), rc);
        await loaded();
        await flush();

        expect(rc.errors).toMatchObject([{ code: "VALIDATION_FAILED" }]);
        expect(String(rc.errors[0].message)).toMatch(/ISO 8601/);
        expect(record.builds).toHaveLength(0);
    });

    test("a bound date arrives as a Date", async () =>
    {
        const rc = realContext({ title: { path: "/when" } }, { when: "2026-10-26T10:00:00.000Z" });
        create(tagFor(fakeDescriptor({ dates: ["title"] })), rc);
        await loaded();

        expect(record.builds[0].options.title).toEqual(new Date("2026-10-26T10:00:00.000Z"));
    });

    test("an element inside a shadow root is OUTCROP_MOUNT_FAILED naming the light-DOM rule", async () =>
    {
        const rc = realContext({ title: "t" });
        const shadow = document.body.appendChild(document.createElement("div")).attachShadow({ mode: "open" });
        const el = document.createElement(tagFor()) as El;

        el.context = rc.ctx;
        shadow.appendChild(el);
        await loaded();

        expect(record.builds).toHaveLength(0);
        expect(rc.errors).toMatchObject([{ code: "OUTCROP_MOUNT_FAILED" }]);
        expect(String(rc.errors[0].message)).toMatch(/shadow root.*light DOM/);
    });
});

describe("teardown", () =>
{
    test("a move within the same task does not destroy", async () =>
    {
        const el = create(tagFor(), realContext({ title: "t" }));
        await loaded();

        el.remove();
        document.body.appendChild(el);
        await flush();

        expect(record.destroyed).toBe(0);
    });

    test("a real disconnect destroys the handle and releases subscriptions", async () =>
    {
        const rc = realContext({ items: { path: "/items" } }, { items: [1] });
        const el = create(tagFor(), rc);
        await loaded();

        el.remove();
        await flush();
        rc.setData("/items", [9]);

        expect(record.destroyed).toBe(1);
        expect(record.calls).toEqual([]);
        expect(el.handle).toBeUndefined();
    });
});

describe("module load", () =>
{
    test("importing the element module touches no DOM", async () =>
    {
        const saved = globalThis.HTMLElement;

        vi.resetModules();
        // @ts-expect-error — simulate an environment with no DOM (Node, server rendering)
        delete globalThis.HTMLElement;

        try
        {
            await expect(import("./element")).resolves.toHaveProperty("outcropElementBase");
        }
        finally
        {
            globalThis.HTMLElement = saved;
        }
    });
});
