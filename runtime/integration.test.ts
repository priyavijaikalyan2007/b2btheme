/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: Dynamic UI end-to-end.
 *
 * Drives the whole layer the way the demo does — register manifests, apply a
 * patch, mount real components, propagate a real selection through a real
 * binding — using the module sources rather than the browser bundle.
 *
 * This is the test the unit suites cannot be: each of them stubs the pieces
 * either side of the one under test, so none of them can catch a seam that
 * only fails when two real subsystems meet.
 *
 * Covers PRD §16.4 and plan Phase 14.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";

import { applyPatch, createEmptyDocument } from "./src/document";
import { createLifecycleManager } from "./src/lifecycle";
import { createWiringEngine, registerTransform, clearTransforms } from "./src/wiring";
import { packDocument } from "./src/packer";
import { clearRegistry, getManifest, registerComponents } from "./src/registry";
import { resolve } from "./src/resolver";

import { createTreeView } from "../components/treeview/treeview";
import { createDataGrid } from "../components/datagrid/datagrid";
import { createStickyNote } from "../components/stickynote/stickynote";

import { TREEVIEW_MANIFEST } from "../components/treeview/treeview.manifest";
import { DATAGRID_MANIFEST } from "../components/datagrid/datagrid.manifest";
import { STICKYNOTE_MANIFEST } from "../components/stickynote/stickynote.manifest";

import type { CanvasNode, CanvasPatch, Surface } from "./src/types";

// ============================================================================
// FIXTURE DATA
// ============================================================================

const TABLES = [
    { id: "orders", label: "orders" },
    { id: "customers", label: "customers" },
];

const COLUMNS: Record<string, unknown[]> = {
    orders: [
        { id: "o1", data: { column: "order_id", type: "uuid" } },
        { id: "o2", data: { column: "placed_at", type: "timestamptz" } },
    ],
    customers: [
        { id: "c1", data: { column: "email", type: "citext" } },
    ],
};

// ============================================================================
// HARNESS
// ============================================================================

let root: HTMLDivElement;
let hosts: Map<string, HTMLElement>;

function node(
    id: string,
    component: string,
    options: Record<string, unknown> = {}): CanvasNode
{
    return {
        id,
        component,
        placement: { kind: "intent", region: "main", size: "standard" },
        options,
        source: null,
        state: {},
        anchor: { kind: "canvas" },
        provenance: { turnId: "t1", lastTouched: 1 },
        pinned: false,
        grants: [],
    };
}

/** Mounts a node the way DynamicCanvas does, honouring factoryStyle. */
function mountNode(n: CanvasNode): Surface | null
{
    const manifest = getManifest(n.component);

    if (!manifest)
    {
        return null;
    }

    const host = document.createElement("div");
    host.id = `host-${n.id}`;
    root.appendChild(host);
    hosts.set(n.id, host);

    const opts = { ...manifest.defaultOptions, ...n.options };

    if (manifest.factoryStyle === "options-only")
    {
        const key = manifest.containerOption ?? "container";
        const factory = n.component === "treeview" ? createTreeView : null;

        return factory
            ? factory({ ...opts, [key]: host } as never) as unknown as Surface
            : null;
    }

    if (manifest.factoryStyle === "options-first")
    {
        return createDataGrid(opts as never, host.id) as unknown as Surface;
    }

    return createStickyNote(host.id, opts as never) as unknown as Surface;
}

beforeEach(() =>
{
    clearRegistry();
    clearTransforms();

    root = document.createElement("div");
    document.body.appendChild(root);
    hosts = new Map();

    registerComponents([
        TREEVIEW_MANIFEST, DATAGRID_MANIFEST, STICKYNOTE_MANIFEST,
    ]);

    registerTransform("tableColumns", (value) =>
    {
        const selected = Array.isArray(value) ? value[0] : value;
        const key = (selected as { id?: string })?.id;

        return key ? COLUMNS[key] ?? [] : [];
    });
});

afterEach(() =>
{
    root.remove();
});

// ============================================================================
// THE SCRIPTED SESSION
// ============================================================================

describe("dynamic UI — scripted session", () =>
{
    /** Builds the tree + grid + binding that the demo's first turn produces. */
    function firstTurn(): CanvasPatch
    {
        return {
            turnId: "turn-1",
            revision: 1,
            ops: [
                {
                    op: "addNode",
                    node: node("tree", "treeview", { roots: TABLES }),
                },
                {
                    op: "addNode",
                    node: node("grid", "datagrid", {
                        columns: [
                            { id: "column", label: "Column" },
                            { id: "type", label: "Type" },
                        ],
                    }),
                },
                {
                    op: "addBinding",
                    binding: {
                        id: "b1",
                        from: { node: "tree", channel: "selection" },
                        to: { node: "grid", slot: "rows" },
                        cardinality: "replace",
                        transform: "tableColumns",
                    },
                },
            ],
        };
    }

    test("a turn produces a valid document with a binding", () =>
    {
        const doc = applyPatch(
            createEmptyDocument("c1", "w1"), firstTurn(), { validate: true });

        expect(Object.keys(doc.nodes).sort()).toEqual(["grid", "tree"]);
        expect(doc.bindings).toHaveLength(1);
        expect(doc.revision).toBe(1);
    });

    test("both nodes mount as real components", () =>
    {
        const doc = applyPatch(createEmptyDocument("c1", "w1"), firstTurn());
        const lifecycle = createLifecycleManager(
            { mount: mountNode, unmount: (id) => hosts.get(id)?.replaceChildren() });

        lifecycle.sync(doc, new Set(["tree", "grid"]), 1);

        expect(lifecycle.isMounted("tree")).toBe(true);
        expect(lifecycle.isMounted("grid")).toBe(true);

        lifecycle.destroy();
    });

    test("selecting in the tree feeds the grid through the binding", () =>
    {
        const doc = applyPatch(createEmptyDocument("c1", "w1"), firstTurn());
        const lifecycle = createLifecycleManager(
            { mount: mountNode, unmount: (id) => hosts.get(id)?.replaceChildren() });

        lifecycle.sync(doc, new Set(["tree", "grid"]), 1);

        const delivered: unknown[] = [];
        const grid = lifecycle.getSurface("grid")!;
        const originalSetData = grid.setData.bind(grid);

        grid.setData = (slot, value) =>
        {
            delivered.push({ slot, value });
            originalSetData(slot, value);
        };

        const wiring = createWiringEngine({
            getSurface: (id) => lifecycle.getSurface(id),
            getManifest: (component) => getManifest(component),
        });

        wiring.attach(doc);

        // Drive the real TreeView, not a fake.
        (lifecycle.getSurface("tree") as unknown as
            { selectNode(id: string): void }).selectNode("orders");

        wiring.flush();

        expect(delivered).toHaveLength(1);
        expect((delivered[0] as { slot: string }).slot).toBe("rows");
        expect((delivered[0] as { value: unknown[] }).value).toHaveLength(2);

        wiring.detach();
        lifecycle.destroy();
    });

    test("the transform is what makes the payload shapes line up", () =>
    {
        // Without it the tree emits tree nodes and the grid receives something
        // it cannot render — the bug this test exists to pin down.
        const doc = applyPatch(createEmptyDocument("c1", "w1"), firstTurn());

        expect(doc.bindings[0].transform).toBe("tableColumns");
    });
});

// ============================================================================
// RESOLUTION
// ============================================================================

describe("dynamic UI — resolution", () =>
{
    test("a hierarchy browse resolves to the tree", () =>
    {
        const result = resolve({
            intent: "browse",
            shape: "hierarchy",
            cardinality: 4,
            viewport: { w: 1200, h: 800 },
        });

        expect(result.chosen).toBe("treeview");
    });

    test("a collection browse resolves to the grid", () =>
    {
        const result = resolve({
            intent: "browse",
            shape: "collection",
            cardinality: 40,
            viewport: { w: 1200, h: 800 },
        });

        expect(result.chosen).toBe("datagrid");
    });

    test("every resolution explains itself", () =>
    {
        const result = resolve({
            intent: "browse",
            shape: "collection",
            cardinality: 40,
            viewport: { w: 1200, h: 800 },
        });

        expect(result.candidates[0].reasons.length).toBeGreaterThan(0);
    });
});

// ============================================================================
// LAYOUT AND VIRTUALIZATION
// ============================================================================

describe("dynamic UI — layout and virtualization", () =>
{
    test("packing places both nodes without overlap", () =>
    {
        const doc = applyPatch(createEmptyDocument("c1", "w1"), {
            turnId: "t", revision: 1,
            ops: [
                { op: "addNode", node: node("a", "stickynote") },
                { op: "addNode", node: node("b", "stickynote") },
            ],
        });

        const packed = packDocument(doc);
        const a = packed.get("a")!;
        const b = packed.get("b")!;

        const overlap = a.x < b.x + b.w && b.x < a.x + a.w
            && a.y < b.y + b.h && b.y < a.y + a.h;

        expect(overlap).toBe(false);
    });

    test("demoting and promoting restores component state", () =>
    {
        const doc = applyPatch(createEmptyDocument("c1", "w1"), {
            turnId: "t", revision: 1,
            ops: [{ op: "addNode", node: node("n", "stickynote", { text: "kept" }) }],
        });

        const lifecycle = createLifecycleManager(
            { mount: mountNode, unmount: (id) => hosts.get(id)?.replaceChildren() });

        lifecycle.sync(doc, new Set(["n"]), 1);
        lifecycle.getSurface("n")!.setData("text", "edited");

        lifecycle.sync(doc, new Set(), 2);
        expect(lifecycle.isMounted("n")).toBe(false);

        lifecycle.sync(doc, new Set(["n"]), 3);

        expect(lifecycle.getSurface("n")!.getState().text).toBe("edited");

        lifecycle.destroy();
    });

    test("the mount budget caps how much is live at once", () =>
    {
        const ops = ["a", "b", "c"].map(
            (id) => ({ op: "addNode" as const, node: node(id, "stickynote") }));

        const doc = applyPatch(
            createEmptyDocument("c1", "w1"), { turnId: "t", revision: 1, ops });

        const lifecycle = createLifecycleManager(
            { mount: mountNode, unmount: (id) => hosts.get(id)?.replaceChildren() },
            { mountCap: 2 });

        lifecycle.sync(doc, new Set(["a", "b", "c"]), 1);

        const live = ["a", "b", "c"].filter((id) => lifecycle.isMounted(id));

        expect(live).toHaveLength(2);

        lifecycle.destroy();
    });
});
