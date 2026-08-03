/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DynamicUIRuntime — mount lifecycle, weight budget, demotion, decay.
 * Covers PRD §9.5 (weight budget), §9.6 (decay) and plan Phase 5.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { fold } from "./document";
import { createLifecycleManager } from "./lifecycle";
import { clearRegistry, registerComponent } from "./registry";

import type {
    CanvasDocument,
    CanvasNode,
    CapabilityManifest,
    PatchOp,
    Surface,
} from "./types";

// ============================================================================
// FIXTURES
// ============================================================================

interface FakeSurface extends Surface
{
    readonly id: string;
    destroyed: number;
    restored: Record<string, unknown> | null;
}

let mounted: Map<string, FakeSurface>;
let mountLog: string[];
let unmountLog: string[];
let promotedLog: string[];

function fakeSurface(id: string): FakeSurface
{
    const s: FakeSurface = {
        id,
        destroyed: 0,
        restored: null,
        setData() { /* no-op */ },
        on() { return () => undefined; },
        getState() { return { scrollTop: 40, id }; },
        setState(state) { s.restored = state; },
        destroy() { s.destroyed++; },
    };

    return s;
}

function manifest(
    name: string,
    over: Partial<CapabilityManifest> = {}): CapabilityManifest
{
    return {
        name,
        factory: `create${name}`,
        label: name,
        icon: "bi-square",
        category: "data",
        affords: [],
        emits: [],
        accepts: [],
        actions: [],
        stateKeys: ["scrollTop"],
        weight: { js: 10_000, mountCost: "light", holdsResources: false },
        defaultSize: { w: 300, h: 200 },
        defaultOptions: {},
        conformance: "surface",
        priority: 50,
        ...over,
    };
}

function node(
    id: string,
    over: Partial<CanvasNode> = {}): CanvasNode
{
    return {
        id,
        component: "grid",
        placement: { kind: "intent", region: "main", size: "standard" },
        options: {},
        source: null,
        state: {},
        anchor: { kind: "canvas" },
        provenance: { turnId: "t1", lastTouched: 1 },
        pinned: false,
        grants: [],
        ...over,
    };
}

function docOf(nodes: CanvasNode[]): CanvasDocument
{
    const ops: PatchOp[] = nodes.map((n) => ({ op: "addNode" as const, node: n }));

    return fold([{ turnId: "t1", revision: 1, ops }]);
}

function managerWith(options = {})
{
    return createLifecycleManager(
        {
            mount(n)
            {
                mountLog.push(n.id);
                const s = fakeSurface(n.id);
                mounted.set(n.id, s);
                return s;
            },
            unmount(id)
            {
                unmountLog.push(id);
                mounted.delete(id);
            },
            onPromoted(id)
            {
                promotedLog.push(id);
            },
        },
        options);
}

/** All node ids, as the "everything is on screen" visible set. */
function allVisible(doc: CanvasDocument): Set<string>
{
    return new Set(Object.keys(doc.nodes));
}

beforeEach(() =>
{
    mounted = new Map();
    mountLog = [];
    unmountLog = [];
    promotedLog = [];
    clearRegistry();
    registerComponent(manifest("grid"));
});

// ============================================================================
// MOUNTING
// ============================================================================

describe("sync — mounting", () =>
{
    test("mounts every visible node", () =>
    {
        const doc = docOf([node("a"), node("b")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);

        expect(mountLog.sort()).toEqual(["a", "b"]);
        expect(mgr.isMounted("a")).toBe(true);
    });

    test("does not mount a node outside the visible set", () =>
    {
        const doc = docOf([node("a"), node("b")]);
        const mgr = managerWith();

        mgr.sync(doc, new Set(["a"]), 1);

        expect(mountLog).toEqual(["a"]);
        expect(mgr.isMounted("b")).toBe(false);
    });

    test("is idempotent — a second sync remounts nothing", () =>
    {
        const doc = docOf([node("a")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);
        mgr.sync(doc, allVisible(doc), 1);

        expect(mountLog).toEqual(["a"]);
    });

    test("exposes the mounted surface", () =>
    {
        const doc = docOf([node("a")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);

        expect(mgr.getSurface("a")).toBe(mounted.get("a"));
    });

    test("returns null for an unmounted node", () =>
    {
        expect(managerWith().getSurface("ghost")).toBeNull();
    });

    test("unmounts a node removed from the document", () =>
    {
        const doc = docOf([node("a"), node("b")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);
        const smaller = docOf([node("a")]);
        mgr.sync(smaller, allVisible(smaller), 2);

        expect(unmountLog).toContain("b");
        expect(mgr.isMounted("b")).toBe(false);
    });

    test("refuses to mount from an invalid document", () =>
    {
        const doc = { ...docOf([node("a")]), schemaVersion: 99 };
        const mgr = managerWith();

        expect(() => mgr.sync(doc as CanvasDocument, new Set(["a"]), 1)).toThrow();
        expect(mountLog).toHaveLength(0);
    });

    test("refuses to mount an unregistered component", () =>
    {
        const doc = docOf([node("a", { component: "ghost" })]);
        const mgr = managerWith();

        expect(() => mgr.sync(doc, allVisible(doc), 1)).toThrow(/ghost/);
    });
});

// ============================================================================
// DEMOTION
// ============================================================================

describe("demotion", () =>
{
    test("captures state before unmounting a node leaving the viewport", () =>
    {
        const doc = docOf([node("a")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);
        mgr.sync(doc, new Set(), 2);

        expect(mgr.getStoredState("a")).toEqual({ scrollTop: 40, id: "a" });
    });

    test("lists demoted nodes", () =>
    {
        const doc = docOf([node("a")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);
        mgr.sync(doc, new Set(), 2);

        expect(mgr.getDemoted()).toEqual(["a"]);
    });

    test("restores captured state when the node is promoted back", () =>
    {
        const doc = docOf([node("a")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);
        mgr.sync(doc, new Set(), 2);
        mgr.sync(doc, allVisible(doc), 3);

        expect(mounted.get("a")?.restored).toEqual({ scrollTop: 40, id: "a" });
    });

    test("notifies the host on promotion so wiring can replay data", () =>
    {
        const doc = docOf([node("a")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);
        mgr.sync(doc, new Set(), 2);
        mgr.sync(doc, allVisible(doc), 3);

        expect(promotedLog).toEqual(["a"]);
    });

    test("drops stored state when a node leaves the document", () =>
    {
        const doc = docOf([node("a")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);
        mgr.sync(doc, new Set(), 2);
        mgr.sync(docOf([]), new Set(), 3);

        expect(mgr.getStoredState("a")).toBeNull();
    });
});

// ============================================================================
// WEIGHT BUDGET
// ============================================================================

describe("weight budget", () =>
{
    test("respects the mount cap", () =>
    {
        const doc = docOf([node("a"), node("b"), node("c")]);
        const mgr = managerWith({ mountCap: 2 });

        mgr.sync(doc, allVisible(doc), 1);

        expect(mountLog).toHaveLength(2);
    });

    test("respects the weight budget", () =>
    {
        clearRegistry();
        registerComponent(manifest("grid", {
            weight: { js: 100_000, mountCost: "moderate", holdsResources: false },
        }));

        const doc = docOf([node("a"), node("b"), node("c")]);
        const mgr = managerWith({ weightBudget: 250_000 });

        mgr.sync(doc, allVisible(doc), 1);

        expect(mountLog).toHaveLength(2);
    });

    test("never evicts a pinned node", () =>
    {
        const doc = docOf([
            node("a", { provenance: { turnId: "t1", lastTouched: 1 } }),
            node("b", { provenance: { turnId: "t1", lastTouched: 9 } }),
            node("pinned", { pinned: true, provenance: { turnId: "t1", lastTouched: 1 } }),
        ]);
        const mgr = managerWith({ mountCap: 2 });

        mgr.sync(doc, allVisible(doc), 10);

        expect(mgr.isMounted("pinned")).toBe(true);
    });

    test("evicts least-recently-touched first", () =>
    {
        const doc = docOf([
            node("old", { provenance: { turnId: "t1", lastTouched: 1 } }),
            node("new", { provenance: { turnId: "t1", lastTouched: 9 } }),
        ]);
        const mgr = managerWith({ mountCap: 1 });

        mgr.sync(doc, allVisible(doc), 10);

        expect(mgr.isMounted("new")).toBe(true);
        expect(mgr.isMounted("old")).toBe(false);
    });

    test("demotes resource-holding components before plain ones", () =>
    {
        clearRegistry();
        registerComponent(manifest("grid"));
        registerComponent(manifest("heavy", {
            weight: { js: 10_000, mountCost: "heavy", holdsResources: true },
        }));

        const doc = docOf([
            node("plain", { provenance: { turnId: "t1", lastTouched: 5 } }),
            node("holder", {
                component: "heavy",
                provenance: { turnId: "t1", lastTouched: 5 },
            }),
        ]);
        const mgr = managerWith({ mountCap: 1 });

        mgr.sync(doc, allVisible(doc), 10);

        expect(mgr.isMounted("plain")).toBe(true);
        expect(mgr.isMounted("holder")).toBe(false);
    });

    test("reports the currently mounted weight", () =>
    {
        const doc = docOf([node("a"), node("b")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);

        expect(mgr.getMountedWeight()).toBe(20_000);
    });
});

// ============================================================================
// DECAY
// ============================================================================

describe("decay", () =>
{
    test("collapses an untouched node to a chip", () =>
    {
        const doc = docOf([node("stale", {
            provenance: { turnId: "t1", lastTouched: 1 },
        })]);
        const mgr = managerWith({ decayTurns: 5 });

        mgr.sync(doc, allVisible(doc), 20);

        expect(mgr.getChips()).toEqual(["stale"]);
        expect(mgr.isMounted("stale")).toBe(false);
    });

    test("does not collapse a recently touched node", () =>
    {
        const doc = docOf([node("fresh", {
            provenance: { turnId: "t1", lastTouched: 18 },
        })]);
        const mgr = managerWith({ decayTurns: 5 });

        mgr.sync(doc, allVisible(doc), 20);

        expect(mgr.getChips()).toHaveLength(0);
        expect(mgr.isMounted("fresh")).toBe(true);
    });

    test("never collapses a pinned node", () =>
    {
        const doc = docOf([node("kept", {
            pinned: true,
            provenance: { turnId: "t1", lastTouched: 1 },
        })]);
        const mgr = managerWith({ decayTurns: 5 });

        mgr.sync(doc, allVisible(doc), 100);

        expect(mgr.getChips()).toHaveLength(0);
    });

    test("a chip retains its state so restoring it is lossless", () =>
    {
        const doc = docOf([node("stale", {
            provenance: { turnId: "t1", lastTouched: 1 },
        })]);
        const mgr = managerWith({ decayTurns: 5 });

        mgr.sync(doc, allVisible(doc), 1);
        mgr.sync(doc, allVisible(doc), 20);

        expect(mgr.getStoredState("stale")).toEqual({ scrollTop: 40, id: "stale" });
    });

    test("a chip is restored on the turn it is touched again", () =>
    {
        const stale = node("stale", { provenance: { turnId: "t1", lastTouched: 1 } });
        const mgr = managerWith({ decayTurns: 5 });

        mgr.sync(docOf([stale]), new Set(["stale"]), 20);
        expect(mgr.getChips()).toEqual(["stale"]);

        const touched = node("stale", { provenance: { turnId: "t2", lastTouched: 20 } });
        mgr.sync(docOf([touched]), new Set(["stale"]), 20);

        expect(mgr.getChips()).toHaveLength(0);
        expect(mgr.isMounted("stale")).toBe(true);
    });
});

// ============================================================================
// TEARDOWN
// ============================================================================

describe("destroy", () =>
{
    test("unmounts everything", () =>
    {
        const doc = docOf([node("a"), node("b")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);
        mgr.destroy();

        expect(unmountLog.sort()).toEqual(["a", "b"]);
        expect(mgr.isMounted("a")).toBe(false);
    });

    test("is idempotent", () =>
    {
        const doc = docOf([node("a")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);
        mgr.destroy();
        mgr.destroy();

        expect(unmountLog).toEqual(["a"]);
    });

    test("clears stored state", () =>
    {
        const doc = docOf([node("a")]);
        const mgr = managerWith();

        mgr.sync(doc, allVisible(doc), 1);
        mgr.sync(doc, new Set(), 2);
        mgr.destroy();

        expect(mgr.getStoredState("a")).toBeNull();
    });
});
