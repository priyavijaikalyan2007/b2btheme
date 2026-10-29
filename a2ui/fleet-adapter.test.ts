/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Gate G3 (spec §9, §10.2). Every component in the built catalog
 *    goes through the BUILT adapter bundle with a real @a2ui/web_core surface:
 *    it mounts, its live props update without a rebuild, its create-time
 *    props rebuild, its events write <eventData>/<channel> and then dispatch,
 *    a two-way edit writes the bound path, and teardown destroys the handle.
 *    A component classified later is covered with no change here.
 *
 *    Components load from source, as runtime/fleet-conformance.test.ts loads
 *    them; the real adapter loader still runs, and every asset URL it injects
 *    is checked before its load event is fired. The dist IIFEs are exercised
 *    in a real browser by tests/a2ui-adapter.spec.ts.
 */

import fs from "node:fs";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { Catalog, ComponentContext, MessageProcessor } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS, basicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";

import { JSDOM_STANDINS } from "../tests/jsdom/standins";
import { sampleProp, sampleValue } from "./sample-values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
type Descriptor = { name: string; tagName: string; factory: string; factoryStyle: string; changeOption?: string; twoWay: boolean;
    change?: { valueFrom: string } | { cleared: null };
    assets: { js: string; css?: string; deps?: { path: string; integrity?: string }[] };
    props: Record<string, { route: string }>;
    events: { channel: string; actionProp: string; payloadInValue: boolean }[];
    providers: { request: string; actionProp: string; resultProp: string; concurrency: string }[] };

const DIST = path.join(__dirname, "..", "dist");
const BASE = "https://assets.test";
const V = "v0.9.1";
const BASIC = "https://a2ui.org/specification/v0_9/catalogs/basic/";

function readDist(rel: string): Any
{
    const file = path.join(DIST, rel);

    if (!fs.existsSync(file)) { throw new Error(`${file} is missing; run \`npm run build\` first.`); }

    return JSON.parse(fs.readFileSync(file, "utf8"));
}

const CATALOG = readDist("a2ui/catalog/v1.json");
const DESCRIPTORS: Descriptor[] = readDist("agentui-report.json").adapter.descriptors;
const MANIFESTS: Any[] = readDist("capability-manifest.json").components;
const COMPONENTS = import.meta.glob<Record<string, unknown>>("../components/*/*.ts");
const GLUE = import.meta.glob<Record<string, Any>>("../components/*/*.conformance.ts");

/** Per-component build counter and live handles, kept by the factory wrapper. */
interface Spy { builds: number; options: Record<string, unknown>[]; destroyed: number }
const spies = new Map<string, Spy>();
let observer: MutationObserver;
const loadedUrls: string[] = [];

/** The options argument's position for each factory style (runtime/src/mount.ts). */
function optionsOf(style: string, args: unknown[]): Record<string, unknown>
{
    return (style === "container-first" ? args[1] : args[0]) as Record<string, unknown>;
}

/**
 * Puts what a component declares it needs on window (ADR-230): vendored
 * libraries' built files run in global scope, since jsdom does not execute the
 * <script> the loader injects, or a stand-in for a library jsdom cannot run
 * (tests/jsdom/standins.ts: Vditor); then other components' source modules.
 */
async function installDependencies(deps: { libraries?: string[]; components?: string[] }): Promise<void>
{
    const libs = readDist("lib-manifest.json").assets;

    for (const lib of deps.libraries ?? [])
    {
        if (JSDOM_STANDINS[lib]) { JSDOM_STANDINS[lib](); }
        else if (libs[lib].url.endsWith(".js")) { (0, eval)(fs.readFileSync(path.join(DIST, libs[lib].url), "utf8")); }
    }

    for (const c of deps.components ?? []) { await COMPONENTS[`../components/${c}/${c}.ts`](); }
}

/** Loads a component's source module, after its dependencies, and wraps its window factory with a spy. */
async function install(d: Descriptor): Promise<void>
{
    const dir = d.assets.js.split("/")[1];
    await installDependencies(MANIFESTS.find((m) => m.factory === d.factory)?.protocol?.dependencies ?? {});
    await COMPONENTS[`../components/${dir}/${dir}.ts`]();
    const real = (window as Any)[d.factory];
    const spy: Spy = { builds: 0, options: [], destroyed: 0 };

    spies.set(d.name, spy);
    (window as Any)[d.factory] = (...args: unknown[]) =>
    {
        spy.builds += 1;
        spy.options.push(optionsOf(d.factoryStyle, args));
        const handle = real(...args);
        const destroy = handle.destroy;
        handle.destroy = (...a: unknown[]) => { spy.destroyed += 1; return destroy.apply(handle, a); };

        return handle;
    };
}

/** The literal arm of each data prop, keyed by prop name. */
function literalArms(name: string): Record<string, Any>
{
    const own = CATALOG.components[name].allOf[2].properties;

    return Object.fromEntries(Object.keys(own).filter((p) => own[p].anyOf).map((p) => [p, own[p].anyOf[0]]));
}

let catalog: Any;

beforeAll(async () =>
{
    observer = new MutationObserver((records) =>
    {
        for (const node of records.flatMap((r) => [...r.addedNodes]) as Element[])
        {
            const url = node.getAttribute?.("src") ?? node.getAttribute?.("href");
            if (url) { loadedUrls.push(url); queueMicrotask(() => node.dispatchEvent(new Event("load"))); }
        }
    });
    observer.observe(document.head, { childList: true });

    // @ts-expect-error — the built bundle has no declaration next to it in this tree
    const adapter = await import("../dist/a2ui/adapter/v1.js");
    catalog = adapter.createOutcropCatalog({ Catalog, basicCatalog, BASIC_FUNCTIONS }, { assetBaseUrl: BASE });

    for (const d of DESCRIPTORS)
    {
        await install(d);
        customElements.define(d.tagName, catalog.components.get(d.name).element);
    }

    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
});

const flush = () => new Promise((r) => setTimeout(r, 0));

// Tear every staged element down while the document still exists; teardown is deferred by a microtask.
afterEach(async () => { document.body.replaceChildren(); await flush(); });
afterAll(() => { observer.disconnect(); vi.restoreAllMocks(); });

/** A real surface with one component, "c", plus its element, mounted. */
async function stage(d: Descriptor, props: Record<string, unknown>, data: Record<string, unknown>): Promise<Any>
{
    const actions: Any[] = [];
    const errors: Any[] = [];
    const surfaceId = `s-${d.name}-${Math.random().toString(36).slice(2)}`;
    const mp = new (MessageProcessor as Any)([catalog], (a: Any) => actions.push(a));
    const send = (m: Record<string, unknown>) => mp.processMessages([{ version: V, ...m }]);

    send({ createSurface: { surfaceId, catalogId: CATALOG.$id } });
    send({ updateComponents: { surfaceId, components: [{ id: "c", component: d.name, ...props }] } });
    send({ updateDataModel: { surfaceId, path: "/", value: data } });

    const surface = mp.getSurface(surfaceId);
    surface.onError.subscribe((e: Any) => errors.push(e));
    const el = document.createElement(d.tagName) as Any;
    el.context = new (ComponentContext as Any)(surface, "c", "/");
    document.body.appendChild(el);
    await flush();
    await flush();

    return { el, surface, actions, errors,
        setProps: (p: Record<string, unknown>) => send({ updateComponents: { surfaceId,
            components: [{ id: "c", component: d.name, ...p }] } }),
        setData: (p: string, value: unknown) => send({ updateDataModel: { surfaceId, path: p, value } }) };
}

describe("G3 — coverage", () =>
{
    test("every component of ours in the built catalog has a descriptor, and there is at least one", () =>
    {
        const ours = Object.entries(CATALOG.components)
            .filter(([, e]: [string, Any]) => !e.allOf[0].$ref?.startsWith(BASIC)).map(([n]) => n).sort();

        expect(ours.length).toBeGreaterThan(0);
        expect(DESCRIPTORS.map((d) => d.name).sort()).toEqual(ours);
    });
});

describe.each(DESCRIPTORS.map((d) => [d.name, d] as const))("G3 — %s", (name, d) =>
{
    const arms = literalArms(name);
    const manifest = MANIFESTS.find((m) => m.factory === d.factory);
    // The independent oracle: what the MANIFEST says is live, not what the descriptor says (spec §3.2).
    const declared = new Set([...manifest.accepts.map((a: Any) => a.name), ...(manifest.stateKeys ?? []),
        ...(d.twoWay ? ["value"] : [])]);
    const live = Object.keys(arms).filter((p) => declared.has(p));
    const create = Object.keys(arms).filter((p) => !declared.has(p));
    const required = (CATALOG.components[name].allOf[2].required as string[]).filter((p) => p !== "component");

    /** Literal create props for the required ones; live props bound under /p. */
    /**
     * Literal create props for the required ones, the glue's heldProps (create-time props other props'
     * valid values depend on, such as DynamicFormSwitcher's variants), and live props bound under /p.
     */
    async function initial(): Promise<{ props: Record<string, unknown>; data: Record<string, unknown>;
        held: Record<string, unknown> }>
    {
        const dir = d.assets.js.split("/")[1];
        const held: Record<string, unknown> = (await GLUE[`../components/${dir}/${dir}.conformance.ts`]?.())
            ?.CONFORMANCE_GLUE?.heldProps ?? {};
        const props: Record<string, unknown> = {};
        const data: Record<string, unknown> = {};

        for (const p of required.filter((r) => create.includes(r))) { props[p] = sampleProp(p, arms[p], 0, CATALOG); }
        for (const p of live) { props[p] = { path: `/p/${p}` }; data[p] = sampleProp(p, arms[p], 0, CATALOG); }

        return { props: { ...props, ...requiredProviders(), ...held }, data: { p: data }, held };
    }

    /**
     * A required provider's catalog props (ADR-234): its action, its result binding and eventData, bound as the
     * provider test binds them. A literal cannot sample them, and the catalog rejects the component without them.
     */
    function requiredProviders(): Record<string, unknown>
    {
        const bound = d.providers.filter((p) => required.includes(p.actionProp));

        return bound.length === 0 ? {} : Object.fromEntries([["eventData", { path: "/ev" }],
            ...bound.flatMap((p) => [[p.actionProp, { event: { name: p.actionProp } }],
                [p.resultProp, { path: `/answers/${p.request}` }]])]);
    }

    test("mounts once, loading its own assets and its declared dependencies", async () =>
    {
        const before = spies.get(name)!.builds;
        const { props, data } = await initial();
        const s = await stage(d, props, data);

        expect(s.errors).toEqual([]);
        expect(spies.get(name)!.builds).toBe(before + 1);
        expect(s.el.handle).toBeDefined();
        const deps = (d.assets.deps ?? []).map((dep) => dep.path);
        const own = [...deps, d.assets.js, ...(d.assets.css ? [d.assets.css] : [])].map((a) => `${BASE}/${a}`);
        expect(loadedUrls).toEqual(expect.arrayContaining(own));
    });

    test("live props update without a rebuild", async () =>
    {
        const { props, data } = await initial();
        const s = await stage(d, props, data);
        const builds = spies.get(name)!.builds;

        for (const p of live) { s.setData(`/p/${p}`, sampleProp(p, arms[p], 1, CATALOG)); }
        await flush();

        expect(s.errors).toEqual([]);
        expect(spies.get(name)!.builds).toBe(builds);
    });

    test("each create-time prop that can vary rebuilds exactly once", async () =>
    {
        // heldProps are mounted with and held fixed (DocViewer's activePage must name one of its pages; ADR-230).
        const { props, data, held } = await initial();
        const s = await stage(d, props, data);
        const current = { ...props };
        const varying = create.filter((p) => !(p in held) && JSON.stringify(sampleProp(p, arms[p], 0, CATALOG))
            !== JSON.stringify(sampleProp(p, arms[p], 1, CATALOG)));

        const rebuilds: Record<string, number> = {};

        for (const p of varying)
        {
            const builds = spies.get(name)!.builds;
            current[p] = sampleProp(p, arms[p], p in current ? 1 : 0, CATALOG);
            s.setProps(current);
            await flush();
            rebuilds[p] = spies.get(name)!.builds - builds;
        }

        expect(rebuilds).toEqual(Object.fromEntries(varying.map((p) => [p, 1])));
        expect(s.errors).toEqual([]);
    });

    test.skipIf(d.events.length === 0)("each event writes its payload, then dispatches its action", async () =>
    {
        const glue = (await GLUE[`../components/${d.assets.js.split("/")[1]}/${d.assets.js.split("/")[1]}.conformance.ts`]?.())
            ?.CONFORMANCE_GLUE;
        const { props, data } = await initial();
        const actionProps = Object.fromEntries(d.events.map((e) => [e.actionProp, { event: { name: e.actionProp } }]));
        // eventProps: what an agent sets to make a channel reachable, such as clickable: true (B4).
        const s = await stage(d, { ...props, ...glue?.eventProps, ...actionProps, eventData: { path: "/ev" } }, data);

        const writes = vi.spyOn(s.surface.dataModel, "set");

        for (const e of d.events)
        {
            expect(glue?.trigger, `add a trigger for "${e.channel}" to the ${name} conformance glue`).toBeTypeOf("function");
            s.actions.length = 0;
            writes.mockClear();
            // "async": the gesture reaches the channel after a promise settles (Stepper's finish), so wait twice.
            const driven = glue.trigger(e.channel, s.el.handle);
            expect([true, "async"], `${name} glue cannot trigger "${e.channel}"`).toContain(driven);
            await flush();
            if (driven === "async") { await flush(); }

            const path = e.payloadInValue ? "/p/value" : `/ev/${e.channel}`;
            expect(writes.mock.calls.map((c) => c[0]), `${name}.${e.channel} wrote nothing to ${path}`).toContain(path);
            expect(s.actions.map((a: Any) => a.name), `${name}.${e.channel}`).toContain(e.actionProp);
        }

        expect(s.errors).toEqual([]);
    });

    test.skipIf(d.providers.length === 0)("each provider clears its answer, writes its request, dispatches, and takes the answer", async () =>
    {
        const dir = d.assets.js.split("/")[1];
        const glue = (await GLUE[`../components/${dir}/${dir}.conformance.ts`]?.())?.CONFORMANCE_GLUE;
        const { props, data } = await initial();
        const bindings = Object.fromEntries(d.providers.flatMap((p) => [[p.actionProp, { event: { name: p.actionProp } }],
            [p.resultProp, { path: `/answers/${p.request}` }]]));
        const s = await stage(d, { ...props, ...glue?.requestProps, ...bindings, eventData: { path: "/ev" } }, data);
        const writes = vi.spyOn(s.surface.dataModel, "set");

        for (const p of d.providers)
        {
            expect(glue?.request, `add a request trigger for "${p.request}" to the ${name} conformance glue`)
                .toBeTypeOf("function");
            s.actions.length = 0;
            writes.mockClear();
            expect(glue.request(p.request, s.el.handle), `${name} glue cannot request "${p.request}"`).toBe(true);
            await vi.waitFor(() => expect(s.actions.map((a: Any) => a.name)).toContain(p.actionProp), { timeout: 2000 });

            const paths = writes.mock.calls.map((c) => c[0]);
            expect(paths.indexOf(`/answers/${p.request}`), `${name}.${p.request} clears its answer before the request`)
                .toBeLessThan(paths.indexOf(`/ev/${p.request}`));
            s.setData(`/answers/${p.request}`, sampleValue(CATALOG.$defs[`${name}__${p.resultProp}`], 1, CATALOG));
            await flush();
        }

        expect(s.errors).toEqual([]);
    });

    test.skipIf(!d.changeOption)("a two-way edit through the injected change option writes the bound path", async () =>
    {
        const { props, data } = await initial();
        const s = await stage(d, props, data);
        const options = spies.get(name)!.options.at(-1)!;
        const edit = sampleValue(arms.value, 1, CATALOG);
        // The payload the component's onChange sends, per its protocol.change (ADR-222).
        const payload = d.change && "valueFrom" in d.change ? { [d.change.valueFrom]: edit } : edit;

        (options[d.changeOption] as (v: unknown) => void)(payload);

        expect(s.surface.dataModel.get("/p/value")).toEqual(edit);
        expect(s.errors).toEqual([]);

        if (d.change && "cleared" in d.change)
        {
            (options[d.changeOption] as (v: unknown) => void)(null);
            expect(s.surface.dataModel.get("/p/value")).toBeUndefined();
            expect(s.errors).toEqual([]);
        }
    });

    test("teardown destroys the handle", async () =>
    {
        const { props, data } = await initial();
        const s = await stage(d, props, data);
        const destroyed = spies.get(name)!.destroyed;

        s.el.remove();
        await flush();

        expect(spies.get(name)!.destroyed).toBe(destroyed + 1);
        expect(s.el.handle).toBeUndefined();
    });
});
