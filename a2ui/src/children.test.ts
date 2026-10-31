/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiAdapter / ChildElements. A layout's child slots get the
 *    referenced components' elements, kept across rebuilds; late, deleted and
 *    duplicate children are handled; state is carried across a rebuild
 *    (readiness step 4, ADR-238).
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { Catalog, ComponentContext, MessageProcessor } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS } from "@a2ui/web_core/v0_9/basic_catalog";

import { defineTestElement, type ElementEnv } from "./element";
import { resetLoaderForTests } from "./loader";
import type { AdapterDescriptor } from "./types";
import { fireAssetLoads, flush } from "../testing/context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const CATALOG_ID = "https://test.invalid/frame.json";
const V = "v0.9.1";
let count = 0;

/** A leaf element that records its context. */
class Leaf extends HTMLElement
{
    context: Any;
}

/** A surface whose catalog has the layout ("Frame") and a renderable child type ("Leaf"). */
function surfaceWith(components: Record<string, unknown>[])
{
    const leafTag = `test-leaf-${++count}`;
    const api = (Catalog as Any).fromJson({ $schema: "https://json-schema.org/draft/2020-12/schema", $id: CATALOG_ID,
        catalogId: CATALOG_ID, functions: {}, components: {
            Frame: { type: "object", required: ["component", "id"], additionalProperties: true,
                properties: { component: { const: "Frame" }, id: { type: "string" } } },
            Leaf: { type: "object", required: ["component", "id"], additionalProperties: true,
                properties: { component: { const: "Leaf" }, id: { type: "string" } } },
            Bare: { type: "object", required: ["component", "id"], additionalProperties: true,
                properties: { component: { const: "Bare" }, id: { type: "string" } } } } });
    const entries = [...api.components.values()].map((e: Any) =>
        (e.name === "Leaf" ? { ...e, tagName: leafTag, element: class extends Leaf {} } : e));
    const catalog = new (Catalog as Any)(api.id, "0.9", entries, BASIC_FUNCTIONS);
    const processor = new (MessageProcessor as Any)([catalog], () => undefined);
    const send = (m: Record<string, unknown>) => processor.processMessages([{ version: V, ...m }]);

    send({ createSurface: { surfaceId: "s", catalogId: CATALOG_ID } });
    send({ updateComponents: { surfaceId: "s", components } });

    const surface = processor.getSurface("s");
    const errors: Record<string, unknown>[] = [];

    surface.onError.subscribe((e: Record<string, unknown>) => errors.push(e));

    return {
        surface, errors, leafTag,
        update: (c: Record<string, unknown>[]) => send({ updateComponents: { surfaceId: "s", components: c } }),
        // A2UI v0.9 has no per-component delete message; the model's removeComponent is what onDeleted reports.
        remove: (id: string) => surface.componentsModel.removeComponent(id),
    };
}

const DESCRIPTOR: AdapterDescriptor = {
    name: "Frame", tagName: "outcrop-frame", factory: "createFrameFake", factoryStyle: "container-first",
    mountMethod: "auto", conformance: "surface", assets: { js: "components/frame/frame.js" },
    props: { panels: { route: "create" }, aside: { route: "create" } }, twoWay: false,
    children: [{ path: "panels[].content", cardinality: "one" }, { path: "aside", cardinality: "one" }],
    events: [], providers: [], dates: [],
};

interface Build { options: Any; state: Record<string, unknown> }

let builds: Build[];

/** A layout factory that places each panel's content in its container and keeps a state. */
function installFrame(): void
{
    builds = [];
    (window as Any).createFrameFake = (id: string, options: Any) =>
    {
        const build: Build = { options, state: { open: "a" } };
        const root = document.getElementById(id)!;

        for (const p of options.panels ?? []) { root.appendChild(p.content); }
        builds.push(build);

        return {
            getState: () => build.state,
            setState: (s: Record<string, unknown>) =>
            {
                if (s.open === "boom") { throw new Error("no such panel"); }
                build.state = s;
            },
            destroy: () => { root.replaceChildren(); },
        };
    };
}

function mount(components: Record<string, unknown>[])
{
    const s = surfaceWith(components);
    const tag = `outcrop-frame-${++count}`;
    const env: ElementEnv = { descriptor: DESCRIPTOR, validators: {}, assetBaseUrl: () => "https://cdn.test",
        injectBaseTheme: () => false, providerTimeoutMs: () => 30_000 };

    defineTestElement(tag, env);

    const el = document.createElement(tag) as HTMLElement & { context: unknown };

    el.context = new (ComponentContext as Any)(s.surface, "root", "/");
    document.body.appendChild(el);

    return s;
}

const panels = (...ids: string[]) => ids.map((id) => ({ id: `p-${id}`, title: id, content: id }));
const leaf = (id: string) => ({ id, component: "Leaf" });

beforeEach(() =>
{
    resetLoaderForTests();
    document.head.replaceChildren();
    document.body.replaceChildren();
    installFrame();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => { vi.restoreAllMocks(); });

describe("child slots (ADR-238)", () =>
{
    test("each referenced child is its component's element, with its own context", async () =>
    {
        const s = mount([{ id: "root", component: "Frame", panels: panels("a", "b") }, leaf("a"), leaf("b")]);
        fireAssetLoads();
        await flush();

        const contents = builds[0].options.panels.map((p: Any) => p.content);
        expect(contents.map((el: HTMLElement) => el.localName)).toEqual([s.leafTag, s.leafTag]);
        expect(contents.map((el: Leaf) => el.context.componentModel.id)).toEqual(["a", "b"]);
        expect(builds[0].options.panels[0].title).toBe("a");
    });

    test("a rebuild moves the same elements into the new layout, keeping their state, and carries the layout's",
        async () =>
        {
            const s = mount([{ id: "root", component: "Frame", panels: panels("a", "b") }, leaf("a"), leaf("b"),
                leaf("c")]);
            fireAssetLoads();
            await flush();
            const [a] = builds[0].options.panels.map((p: Any) => p.content);
            builds[0].state = { open: "b" };

            s.update([{ id: "root", component: "Frame", panels: panels("a", "b", "c") }]);
            await flush();

            expect(builds).toHaveLength(2);
            expect(builds[1].options.panels[0].content).toBe(a);
            expect(a.isConnected).toBe(true);
            expect(builds[1].state).toEqual({ open: "b" });
            expect(s.errors).toEqual([]);
        });

    test("a child that arrives after the layout fills its slot", async () =>
    {
        const s = mount([{ id: "root", component: "Frame", panels: panels("a", "late") }, leaf("a")]);
        fireAssetLoads();
        await flush();

        expect(builds[0].options.panels[1].content.className).toBe("outcrop-child-pending");

        s.update([leaf("late")]);
        await flush();

        expect(builds).toHaveLength(2);
        expect(builds[1].options.panels[1].content.localName).toBe(s.leafTag);
        expect(s.errors).toEqual([]);
    });

    test("a deleted child empties its slot", async () =>
    {
        const s = mount([{ id: "root", component: "Frame", panels: panels("a", "b") }, leaf("a"), leaf("b")]);
        fireAssetLoads();
        await flush();

        s.remove("b");
        await flush();

        expect(builds.at(-1)!.options.panels[1].content.className).toBe("outcrop-child-pending");
    });

    test("an id used twice is reported, and placed once", async () =>
    {
        const s = mount([{ id: "root", component: "Frame", panels: panels("a"), aside: "a" }, leaf("a")]);
        fireAssetLoads();
        await flush();

        expect(builds[0].options.aside.className).toBe("outcrop-child-pending");
        expect(s.errors).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED",
            message: expect.stringMatching(/"a" is referenced more than once/) })]);
    });

    test("a layout that lists itself as a child is reported", async () =>
    {
        const s = mount([{ id: "root", component: "Frame", panels: panels("root") }]);
        fireAssetLoads();
        await flush();

        expect(builds[0].options.panels[0].content.className).toBe("outcrop-child-pending");
        expect(s.errors).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED",
            message: expect.stringMatching(/lists itself as a child/) })]);
    });

    test("a child whose catalog entry has no element is reported", async () =>
    {
        const s = mount([{ id: "root", component: "Frame", panels: panels("x") }, { id: "x", component: "Bare" }]);
        fireAssetLoads();
        await flush();

        expect(s.errors).toEqual([expect.objectContaining({ code: "OUTCROP_MOUNT_FAILED",
            message: expect.stringMatching(/"x" is a Bare, whose catalog entry has no element/) })]);
    });

    test("a setState that rejects the carried state is reported, and the fresh state kept", async () =>
    {
        const s = mount([{ id: "root", component: "Frame", panels: panels("a") }, leaf("a"), leaf("b")]);
        fireAssetLoads();
        await flush();
        builds[0].state = { open: "boom" };

        s.update([{ id: "root", component: "Frame", panels: panels("a", "b") }]);
        await flush();

        expect(builds[1].state).toEqual({ open: "a" });
        expect(s.errors).toEqual([expect.objectContaining({ code: "OUTCROP_MOUNT_FAILED",
            message: expect.stringMatching(/setState\(\) rejected the state carried across a rebuild/) })]);
    });
});
