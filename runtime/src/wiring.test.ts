/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DynamicUIRuntime — wiring engine, propagation, cardinality policies.
 * Covers PRD §6 (Wiring Engine) and plan Phase 2.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { createEmptyDocument, fold } from "./document";
import {
    clearTransforms,
    createWiringEngine,
    getTransform,
    registerTransform,
} from "./wiring";

import type {
    Binding,
    CanvasDocument,
    CanvasNode,
    CanvasPatch,
    PatchOp,
    Surface,
    Unsubscribe,
} from "./types";

// ============================================================================
// FAKE SURFACE
// ============================================================================

interface FakeSurface extends Surface
{
    /** Every setData call, in order. */
    readonly writes: { slot: string; value: unknown }[];

    /** Push a value onto a channel as if the component emitted it. */
    fire(channel: string, payload: unknown): void;
}

function fakeSurface(): FakeSurface
{
    const handlers = new Map<string, Set<(p: unknown) => void>>();
    const writes: { slot: string; value: unknown }[] = [];

    return {
        writes,
        setData(slot, value)
        {
            writes.push({ slot, value });
        },
        on(channel, handler): Unsubscribe
        {
            if (!handlers.has(channel))
            {
                handlers.set(channel, new Set());
            }

            handlers.get(channel)!.add(handler);

            return () => handlers.get(channel)?.delete(handler);
        },
        getState()
        {
            return {};
        },
        setState()
        {
            // no-op
        },
        destroy()
        {
            handlers.clear();
        },
        fire(channel, payload)
        {
            for (const h of handlers.get(channel) ?? [])
            {
                h(payload);
            }
        },
    };
}

// ============================================================================
// HELPERS
// ============================================================================

let surfaces: Map<string, FakeSurface>;
let requested: PatchOp[];

function node(id: string): CanvasNode
{
    return {
        id,
        component: "datagrid",
        placement: { kind: "intent", region: "main", size: "standard" },
        options: {},
        source: null,
        state: {},
        anchor: { kind: "canvas" },
        provenance: { turnId: "t1", lastTouched: 1 },
        pinned: false,
        grants: [],
    };
}

function binding(
    id: string,
    from: string,
    to: string,
    extra: Partial<Binding> = {}): Binding
{
    return {
        id,
        from: { node: from, channel: "selection" },
        to: { node: to, slot: "rows" },
        cardinality: "replace",
        ...extra,
    };
}

function docWith(nodeIds: string[], bindings: Binding[]): CanvasDocument
{
    const ops: PatchOp[] = [
        ...nodeIds.map((id) => ({ op: "addNode" as const, node: node(id) })),
        ...bindings.map((b) => ({ op: "addBinding" as const, binding: b })),
    ];
    const patch: CanvasPatch = { turnId: "t1", revision: 1, ops };

    return fold([patch]);
}

function engineFor(doc: CanvasDocument)
{
    for (const id of Object.keys(doc.nodes))
    {
        surfaces.set(id, fakeSurface());
    }

    const engine = createWiringEngine({
        getSurface: (id) => surfaces.get(id) ?? null,
        requestOps: (ops) => requested.push(...ops),
    });

    engine.attach(doc);
    return engine;
}

beforeEach(() =>
{
    surfaces = new Map();
    requested = [];
    clearTransforms();
});

// ============================================================================
// TRANSFORM REGISTRY
// ============================================================================

describe("transform registry", () =>
{
    test("registers and retrieves a transform", () =>
    {
        registerTransform("double", (v) => (v as number) * 2);

        expect(getTransform("double")).toBeTypeOf("function");
    });

    test("returns null for an unregistered transform", () =>
    {
        expect(getTransform("nope")).toBeNull();
    });

    test("ships built-in transforms", () =>
    {
        expect(getTransform("first")).toBeTypeOf("function");
        expect(getTransform("count")).toBeTypeOf("function");
    });

    test("built-in first takes the head of an array", () =>
    {
        expect(getTransform("first")!([1, 2, 3])).toBe(1);
    });

    test("built-in count returns array length", () =>
    {
        expect(getTransform("count")!([1, 2, 3])).toBe(3);
    });

    test("clearTransforms restores only the built-ins", () =>
    {
        registerTransform("custom", (v) => v);
        clearTransforms();

        expect(getTransform("custom")).toBeNull();
        expect(getTransform("first")).toBeTypeOf("function");
    });
});

// ============================================================================
// ATTACH AND DETACH
// ============================================================================

describe("attach", () =>
{
    test("throws when a binding names an unregistered transform", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b", { transform: "ghost" })]);

        expect(() => engineFor(doc)).toThrow(/ghost/);
    });

    test("accepts a binding naming a registered transform", () =>
    {
        registerTransform("ok", (v) => v);
        const doc = docWith(["a", "b"], [binding("x", "a", "b", { transform: "ok" })]);

        expect(() => engineFor(doc)).not.toThrow();
    });

    test("detach stops delivery", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);

        engine.detach();
        surfaces.get("a")!.fire("selection", { id: 1 });
        engine.flush();

        expect(surfaces.get("b")!.writes).toHaveLength(0);
    });

    test("re-attaching does not double-deliver", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);

        engine.attach(doc);
        surfaces.get("a")!.fire("selection", { id: 1 });
        engine.flush();

        expect(surfaces.get("b")!.writes).toHaveLength(1);
    });
});

// ============================================================================
// REPLACE POLICY
// ============================================================================

describe("replace policy", () =>
{
    test("delivers the payload to the target slot", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);

        surfaces.get("a")!.fire("selection", { id: 7 });
        engine.flush();

        expect(surfaces.get("b")!.writes).toEqual([{ slot: "rows", value: { id: 7 } }]);
    });

    test("applies a transform before delivery", () =>
    {
        registerTransform("double", (v) => (v as number) * 2);
        const doc = docWith(["a", "b"], [binding("x", "a", "b", { transform: "double" })]);
        const engine = engineFor(doc);

        surfaces.get("a")!.fire("selection", 21);
        engine.flush();

        expect(surfaces.get("b")!.writes[0].value).toBe(42);
    });

    test("delivers only the latest value when a source emits twice in a tick", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);

        surfaces.get("a")!.fire("selection", 1);
        surfaces.get("a")!.fire("selection", 2);
        engine.flush();

        expect(surfaces.get("b")!.writes).toEqual([{ slot: "rows", value: 2 }]);
    });

    test("does not throw when the target is not mounted", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);

        surfaces.delete("b");

        expect(() =>
        {
            surfaces.get("a")!.fire("selection", 1);
            engine.flush();
        }).not.toThrow();
    });

    test("does not confuse node and channel names that could share a key", () =>
    {
        // "a b" + "c" and "a" + "b c" must never collapse onto one lookup key.
        const doc = docWith(["a b", "a"], []);
        const bindings: Binding[] = [
            {
                id: "one",
                from: { node: "a b", channel: "c" },
                to: { node: "a", slot: "rows" },
                cardinality: "replace",
            },
        ];
        const withBindings = { ...doc, bindings };

        surfaces.set("a b", fakeSurface());
        surfaces.set("a", fakeSurface());

        const engine = createWiringEngine({
            getSurface: (id) => surfaces.get(id) ?? null,
            requestOps: (ops) => requested.push(...ops),
        });

        engine.attach(withBindings);
        surfaces.get("a")!.fire("b c", "wrong");
        engine.flush();

        expect(surfaces.get("a")!.writes).toHaveLength(0);
    });

    test("subscribes a shared source channel only once", () =>
    {
        const doc = docWith(
            ["a", "b", "c"],
            [binding("x", "a", "b"), binding("y", "a", "c")]);
        const engine = engineFor(doc);

        surfaces.get("a")!.fire("selection", 1);
        engine.flush();

        expect(surfaces.get("b")!.writes).toHaveLength(1);
        expect(surfaces.get("c")!.writes).toHaveLength(1);
    });

    test("ignores emissions on channels with no binding", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);

        surfaces.get("a")!.fire("sort", { col: 1 });
        engine.flush();

        expect(surfaces.get("b")!.writes).toHaveLength(0);
    });
});

// ============================================================================
// MERGE POLICY
// ============================================================================

describe("merge policy", () =>
{
    test("delivers the whole set as one value", () =>
    {
        const doc = docWith(
            ["a", "b"],
            [binding("x", "a", "b", { cardinality: "merge" })]);
        const engine = engineFor(doc);

        surfaces.get("a")!.fire("selection", [1, 2, 3]);
        engine.flush();

        expect(surfaces.get("b")!.writes[0].value).toEqual([1, 2, 3]);
    });

    test("requests no structural change", () =>
    {
        const doc = docWith(
            ["a", "b"],
            [binding("x", "a", "b", { cardinality: "merge" })]);
        const engine = engineFor(doc);

        surfaces.get("a")!.fire("selection", [1, 2, 3]);
        engine.flush();

        expect(requested).toHaveLength(0);
    });
});

// ============================================================================
// FANOUT POLICY
// ============================================================================

describe("fanout policy", () =>
{
    function fanoutDoc(max?: number): CanvasDocument
    {
        return docWith(
            ["a", "b"],
            [binding("x", "a", "b", { cardinality: "fanout", maxFanout: max })]);
    }

    test("delivers the first item to the original target", () =>
    {
        const engine = engineFor(fanoutDoc());

        surfaces.get("a")!.fire("selection", [10, 20]);
        engine.flush();

        expect(surfaces.get("b")!.writes[0].value).toBe(10);
    });

    test("requests a node for each additional item", () =>
    {
        const engine = engineFor(fanoutDoc());

        surfaces.get("a")!.fire("selection", [10, 20, 30]);
        engine.flush();

        const added = requested.filter((o) => o.op === "addNode");
        expect(added).toHaveLength(2);
    });

    test("derived nodes clone the target component", () =>
    {
        const engine = engineFor(fanoutDoc());

        surfaces.get("a")!.fire("selection", [10, 20]);
        engine.flush();

        const added = requested.find((o) => o.op === "addNode");
        expect(added && added.op === "addNode" && added.node.component).toBe("datagrid");
    });

    test("caps the fanout at maxFanout", () =>
    {
        const engine = engineFor(fanoutDoc(2));

        surfaces.get("a")!.fire("selection", [1, 2, 3, 4, 5]);
        engine.flush();

        const added = requested.filter((o) => o.op === "addNode");
        expect(added).toHaveLength(1);
    });

    test("removes derived nodes when the selection shrinks", () =>
    {
        const engine = engineFor(fanoutDoc());

        surfaces.get("a")!.fire("selection", [1, 2, 3]);
        engine.flush();

        for (const op of requested)
        {
            if (op.op === "addNode")
            {
                surfaces.set(op.node.id, fakeSurface());
            }
        }

        requested.length = 0;
        surfaces.get("a")!.fire("selection", [1]);
        engine.flush();

        expect(requested.filter((o) => o.op === "removeNode")).toHaveLength(2);
    });

    test("treats a non-array payload as a single item", () =>
    {
        const engine = engineFor(fanoutDoc());

        surfaces.get("a")!.fire("selection", 42);
        engine.flush();

        expect(requested.filter((o) => o.op === "addNode")).toHaveLength(0);
        expect(surfaces.get("b")!.writes[0].value).toBe(42);
    });

    test("an empty selection removes every derived node", () =>
    {
        const engine = engineFor(fanoutDoc());

        surfaces.get("a")!.fire("selection", [1, 2]);
        engine.flush();
        requested.length = 0;

        surfaces.get("a")!.fire("selection", []);
        engine.flush();

        expect(requested.filter((o) => o.op === "removeNode")).toHaveLength(1);
    });
});

// ============================================================================
// PROPAGATION
// ============================================================================

describe("propagation", () =>
{
    test("delivers along a chain in topological order", () =>
    {
        const order: string[] = [];
        const doc = docWith(
            ["a", "b", "c"],
            [binding("x", "a", "b"), binding("y", "b", "c")]);

        for (const id of ["a", "b", "c"])
        {
            surfaces.set(id, fakeSurface());
        }

        const engine = createWiringEngine({
            getSurface: (id) =>
            {
                const s = surfaces.get(id);

                if (!s)
                {
                    return null;
                }

                return {
                    ...s,
                    setData: (slot, value) =>
                    {
                        order.push(id);
                        s.setData(slot, value);
                        s.fire("selection", value);
                    },
                };
            },
            requestOps: (ops) => requested.push(...ops),
        });

        engine.attach(doc);
        surfaces.get("a")!.fire("selection", 1);
        engine.flush();

        expect(order).toEqual(["b", "c"]);
    });

    test("terminates on a runtime cycle rather than looping", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b"), binding("y", "b", "a")]);

        for (const id of ["a", "b"])
        {
            surfaces.set(id, fakeSurface());
        }

        const engine = createWiringEngine({
            getSurface: (id) =>
            {
                const s = surfaces.get(id)!;

                return {
                    ...s,
                    setData: (slot, value) =>
                    {
                        s.setData(slot, value);
                        s.fire("selection", value);
                    },
                };
            },
            requestOps: (ops) => requested.push(...ops),
        });

        engine.attach(doc);

        expect(() =>
        {
            surfaces.get("a")!.fire("selection", 1);
            engine.flush();
        }).not.toThrow();

        expect(surfaces.get("b")!.writes.length).toBeLessThan(10);
    });

    test("fans one source out to multiple targets", () =>
    {
        const doc = docWith(
            ["a", "b", "c"],
            [binding("x", "a", "b"), binding("y", "a", "c")]);
        const engine = engineFor(doc);

        surfaces.get("a")!.fire("selection", 5);
        engine.flush();

        expect(surfaces.get("b")!.writes).toHaveLength(1);
        expect(surfaces.get("c")!.writes).toHaveLength(1);
    });

    test("an isolated document delivers nothing", () =>
    {
        const engine = engineFor(createEmptyDocument("c1", "w1"));

        expect(() => engine.flush()).not.toThrow();
    });
});

// ============================================================================
// REPLAY CACHE (VIRTUALIZATION SAFETY)
// ============================================================================

describe("replay cache", () =>
{
    test("caches a delivery made while the target was unmounted", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);
        const b = surfaces.get("b")!;

        surfaces.delete("b");
        surfaces.get("a")!.fire("selection", { id: 9 });
        engine.flush();

        expect(b.writes).toHaveLength(0);

        surfaces.set("b", b);
        engine.replay("b");

        expect(b.writes).toEqual([{ slot: "rows", value: { id: 9 } }]);
    });

    test("replays the latest value, not every value", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);
        const b = surfaces.get("b")!;

        surfaces.delete("b");
        surfaces.get("a")!.fire("selection", 1);
        engine.flush();
        surfaces.get("a")!.fire("selection", 2);
        engine.flush();

        surfaces.set("b", b);
        engine.replay("b");

        expect(b.writes).toEqual([{ slot: "rows", value: 2 }]);
    });

    test("replay is a no-op for a node that received nothing", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);

        engine.replay("b");

        expect(surfaces.get("b")!.writes).toHaveLength(0);
    });

    test("replay does not deliver another node's cached values", () =>
    {
        const doc = docWith(
            ["a", "b", "c"],
            [binding("x", "a", "b"), binding("y", "a", "c")]);
        const engine = engineFor(doc);

        surfaces.get("a")!.fire("selection", 1);
        engine.flush();
        surfaces.get("b")!.writes.length = 0;
        surfaces.get("c")!.writes.length = 0;

        engine.replay("b");

        expect(surfaces.get("b")!.writes).toHaveLength(1);
        expect(surfaces.get("c")!.writes).toHaveLength(0);
    });

    test("forget drops a node's cached deliveries", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);
        const b = surfaces.get("b")!;

        surfaces.get("a")!.fire("selection", 1);
        engine.flush();
        b.writes.length = 0;

        engine.forget("b");
        engine.replay("b");

        expect(b.writes).toHaveLength(0);
    });

    test("detach clears the cache", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);
        const b = surfaces.get("b")!;

        surfaces.get("a")!.fire("selection", 1);
        engine.flush();
        b.writes.length = 0;

        engine.detach();
        engine.replay("b");

        expect(b.writes).toHaveLength(0);
    });
});

// ============================================================================
// BATCHING
// ============================================================================

describe("batching", () =>
{
    test("defers delivery until the microtask flush", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        engineFor(doc);

        surfaces.get("a")!.fire("selection", 1);

        expect(surfaces.get("b")!.writes).toHaveLength(0);
    });

    test("delivers automatically on the microtask queue", async () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        engineFor(doc);

        surfaces.get("a")!.fire("selection", 1);
        await Promise.resolve();

        expect(surfaces.get("b")!.writes).toHaveLength(1);
    });

    test("flush is a no-op when nothing is pending", () =>
    {
        const doc = docWith(["a", "b"], [binding("x", "a", "b")]);
        const engine = engineFor(doc);

        engine.flush();
        engine.flush();

        expect(surfaces.get("b")!.writes).toHaveLength(0);
    });
});
