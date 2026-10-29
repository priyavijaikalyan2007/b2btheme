/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DynamicUIRuntime — allowlist-only component registry.
 * Covers PRD §8 (Registry and Security) and plan Phase 4.
 */

import { describe, test, expect, beforeEach } from "vitest";

import {
    clearRegistry,
    getAllManifests,
    getManifest,
    isRegistered,
    lookupFactory,
    registerComponent,
    registerComponents,
    resolveFactory,
    validateManifest,
} from "./registry";

import type { CapabilityManifest } from "./types";

// ============================================================================
// HELPERS
// ============================================================================

function manifest(
    name: string,
    over: Partial<CapabilityManifest> = {}): CapabilityManifest
{
    return {
        name,
        factory: `create${name[0].toUpperCase()}${name.slice(1)}`,
        label: name,
        icon: "bi-square",
        category: "data",
        affords: [
            {
                shape: "collection",
                intents: ["browse"],
                cardinality: { min: 1, max: 1000 },
                minViewport: { w: 200, h: 150 },
            },
        ],
        emits: [{ name: "selection", payload: "record", multi: true }],
        accepts: [{ name: "rows", payload: "collection", required: true }],
        actions: [],
        stateKeys: ["scrollTop"],
        weight: { js: 1000, mountCost: "light", holdsResources: false },
        defaultSize: { w: 300, h: 200 },
        defaultOptions: {},
        conformance: "surface",
        priority: 50,
        ...over,
    };
}

beforeEach(() =>
{
    clearRegistry();
});

// ============================================================================
// REGISTRATION
// ============================================================================

describe("registration", () =>
{
    test("registers and retrieves a manifest", () =>
    {
        registerComponent(manifest("datagrid"));

        expect(getManifest("datagrid")?.name).toBe("datagrid");
    });

    test("returns null for an unregistered component", () =>
    {
        expect(getManifest("ghost")).toBeNull();
    });

    test("isRegistered reflects registration", () =>
    {
        expect(isRegistered("datagrid")).toBe(false);
        registerComponent(manifest("datagrid"));
        expect(isRegistered("datagrid")).toBe(true);
    });

    test("re-registering replaces the previous manifest", () =>
    {
        registerComponent(manifest("datagrid", { label: "Old" }));
        registerComponent(manifest("datagrid", { label: "New" }));

        expect(getAllManifests()).toHaveLength(1);
        expect(getManifest("datagrid")?.label).toBe("New");
    });

    test("registers a batch", () =>
    {
        registerComponents([manifest("a"), manifest("b"), manifest("c")]);

        expect(getAllManifests()).toHaveLength(3);
    });

    test("rejects an invalid manifest with a literate error", () =>
    {
        const bad = manifest("x", { affords: [{ shape: "nonsense" }] as never });

        expect(() => registerComponent(bad)).toThrow(/affords/);
    });

    test("clearRegistry empties the registry", () =>
    {
        registerComponents([manifest("a"), manifest("b")]);
        clearRegistry();

        expect(getAllManifests()).toHaveLength(0);
    });
});

// ============================================================================
// ALLOWLIST RESOLUTION (SECURITY)
// ============================================================================

describe("allowlist resolution", () =>
{
    test("resolves the factory name of a registered component", () =>
    {
        registerComponent(manifest("datagrid"));

        expect(resolveFactory("datagrid")).toBe("createDatagrid");
    });

    test("throws a literate error for an unregistered component", () =>
    {
        expect(() => resolveFactory("ghost")).toThrow(/ghost/);
    });

    test("the error names the registration call", () =>
    {
        expect(() => resolveFactory("ghost")).toThrow(/registerComponent/);
    });

    test("NEVER resolves a global that is not in the registry", () =>
    {
        const scope: Record<string, unknown> = { createGhost: () => undefined };

        expect(() => lookupFactory("ghost", scope)).toThrow();
    });

    test("does not scan scope for a name resembling the component", () =>
    {
        const scope: Record<string, unknown> = {
            createDataGrid: () => undefined,
            createDatagrid: () => undefined,
        };

        expect(() => lookupFactory("datagrid", scope)).toThrow();
    });

    test("looks up only the exact factory named by a registered manifest", () =>
    {
        const fn = (): void => undefined;
        const scope: Record<string, unknown> = { createDatagrid: fn };

        registerComponent(manifest("datagrid"));

        expect(lookupFactory("datagrid", scope)).toBe(fn);
    });

    test("throws when the registered factory is absent from scope", () =>
    {
        registerComponent(manifest("datagrid"));

        expect(() => lookupFactory("datagrid", {})).toThrow(/createDatagrid/);
    });

    test("throws when the registered factory is not callable", () =>
    {
        registerComponent(manifest("datagrid"));

        expect(() => lookupFactory("datagrid", { createDatagrid: 42 })).toThrow();
    });
});

// ============================================================================
// MANIFEST VALIDATION
// ============================================================================

describe("validateManifest", () =>
{
    test("accepts a well-formed manifest", () =>
    {
        expect(validateManifest(manifest("datagrid")).ok).toBe(true);
    });

    test("rejects a non-object", () =>
    {
        expect(validateManifest(null).ok).toBe(false);
    });

    test("rejects a missing name", () =>
    {
        const res = validateManifest({ ...manifest("x"), name: "" });

        expect(res.issues.some((i) => i.path === "name")).toBe(true);
    });

    test("accepts declared scrolling regions", () =>
    {
        expect(validateManifest(manifest("datagrid", {
            regions: ["datagrid:scroll-container", "datagrid:body"],
        })).ok).toBe(true);
    });

    test("accepts a manifest that declares no regions", () =>
    {
        // A component with nothing of its own that scrolls omits the field.
        expect(validateManifest(manifest("metriccard")).ok).toBe(true);
    });

    test("rejects regions that are not an array", () =>
    {
        const res = validateManifest(manifest("datagrid", {
            regions: "datagrid:body" as unknown as readonly string[],
        }));

        expect(res.issues.some((i) => i.path === "regions")).toBe(true);
    });

    test("rejects a malformed region name", () =>
    {
        const res = validateManifest(manifest("datagrid", {
            regions: ["body"],
        }));

        expect(res.issues.some((i) => i.path === "regions[0]")).toBe(true);
    });

    test("rejects a region namespaced to another component", () =>
    {
        // A component may only name its own regions. Declaring somebody
        // else's would let an anchor address a region this manifest does not
        // own, and nothing downstream would catch it.
        const res = validateManifest(manifest("datagrid", {
            regions: ["treeview:list-container"],
        }));

        expect(res.ok).toBe(false);
        expect(res.issues.some((i) => i.path === "regions[0]")).toBe(true);
    });

    test("rejects a missing factory", () =>
    {
        const res = validateManifest({ ...manifest("x"), factory: 42 });

        expect(res.issues.some((i) => i.path === "factory")).toBe(true);
    });

    test("rejects an unknown data shape and names the path", () =>
    {
        const res = validateManifest(manifest("x", {
            affords: [{
                shape: "nonsense",
                intents: ["browse"],
                cardinality: { min: 1, max: 2 },
                minViewport: { w: 1, h: 1 },
            }] as never,
        }));

        expect(res.issues.some((i) => i.path === "affords.0.shape")).toBe(true);
    });

    test("rejects an unknown intent verb", () =>
    {
        const res = validateManifest(manifest("x", {
            affords: [{
                shape: "collection",
                intents: ["frobnicate"],
                cardinality: { min: 1, max: 2 },
                minViewport: { w: 1, h: 1 },
            }] as never,
        }));

        expect(res.issues.some((i) => i.path === "affords.0.intents.0")).toBe(true);
    });

    test("rejects an inverted cardinality range", () =>
    {
        const res = validateManifest(manifest("x", {
            affords: [{
                shape: "collection",
                intents: ["browse"],
                cardinality: { min: 100, max: 1 },
                minViewport: { w: 1, h: 1 },
            }],
        }));

        expect(res.issues.some(
            (i) => i.path === "affords.0.cardinality")).toBe(true);
    });

    test("rejects an unknown channel payload shape", () =>
    {
        const res = validateManifest(manifest("x", {
            emits: [{ name: "sel", payload: "nope", multi: false }] as never,
        }));

        expect(res.issues.some((i) => i.path === "emits.0.payload")).toBe(true);
    });

    test("rejects an unknown conformance level", () =>
    {
        const res = validateManifest(manifest("x", { conformance: "magic" as never }));

        expect(res.issues.some((i) => i.path === "conformance")).toBe(true);
    });

    test("rejects an unknown mount cost", () =>
    {
        const res = validateManifest(manifest("x", {
            weight: { js: 10, mountCost: "colossal", holdsResources: false } as never,
        }));

        expect(res.issues.some((i) => i.path === "weight.mountCost")).toBe(true);
    });

    test("allows a surface manifest with no view state (ADR-229)", () =>
    {
        const res = validateManifest(manifest("x", {
            conformance: "surface",
            stateKeys: [],
            emits: [],
            accepts: [],
        }));

        expect(res.issues).toEqual([]);
    });

    test("allows a display-level manifest with no channels or slots", () =>
    {
        const res = validateManifest(manifest("x", {
            conformance: "display",
            stateKeys: [],
            emits: [],
            accepts: [],
            affords: [],
        }));

        expect(res.ok).toBe(true);
    });

    test("rejects a duplicate channel name", () =>
    {
        const res = validateManifest(manifest("x", {
            emits: [
                { name: "sel", payload: "record", multi: false },
                { name: "sel", payload: "record", multi: false },
            ],
        }));

        expect(res.ok).toBe(false);
    });
});

// ============================================================================
// PROTOCOL FIELD (ADR-219)
// ============================================================================

describe("validateManifest — protocol field", () =>
{
    function base(protocol?: unknown): Record<string, unknown>
    {
        return {
            name: "fake", factory: "createFake", label: "Fake", icon: "bi-square",
            category: "data", affords: [], emits: [], accepts: [], actions: [],
            stateKeys: [], weight: { js: 1, mountCost: "light", holdsResources: false },
            defaultSize: { w: 10, h: 10 }, defaultOptions: {}, conformance: "display",
            priority: 50,
            ...(protocol === undefined ? {} : { protocol }),
        };
    }

    test("a manifest without protocol stays valid", () =>
    {
        expect(validateManifest(base()).ok).toBe(true);
    });

    test("a complete protocol is valid", () =>
    {
        const protocol = {
            name: "Fake",
            providers: { onSearch: { request: "search" } },
            hostOnly: { renderCell: "Takes a DOM element, which JSON cannot carry." },
            schemas: { extra: { type: "object" } },
        };

        expect(validateManifest(base(protocol)).ok).toBe(true);
    });

    test("protocol must be an object", () =>
    {
        expect(validateManifest(base("yes")).ok).toBe(false);
    });

    test("protocol.name must be a UAX #31 identifier", () =>
    {
        expect(validateManifest(base({ name: "user-card" })).ok).toBe(false);
    });

    test("a provider needs a UAX #31 request", () =>
    {
        expect(validateManifest(base({ providers: { onSearch: {} } })).ok).toBe(false);
        expect(validateManifest(base({ providers: { onSearch: { request: "find-all" } } })).ok).toBe(false);
    });

    test("a provider's concurrency is latest or queue", () =>
    {
        expect(validateManifest(base({ providers: { onSearch: { request: "search", concurrency: "latest" } } })).ok)
            .toBe(true);
        expect(validateManifest(base({ providers: { onLoad: { request: "load", concurrency: "queue" } } })).ok)
            .toBe(true);

        const res = validateManifest(base({ providers: { onLoad: { request: "load", concurrency: "parallel" } } }));

        expect(res.ok).toBe(false);
        expect(res.issues.map((i) => i.path)).toEqual(["protocol.providers.onLoad.concurrency"]);
    });

    // Unknown keys are REJECTED, in a provider spec and in protocol itself.
    // Since 2026-10-25 every catalog name is derived (on<Request>,
    // <request>Result, eventData), so nothing in the generator reads a
    // provider's old params/response or protocol.bindAs. A leftover would pass
    // every other gate silently; this validator is the one place left to say so.
    test("a provider's leftover params or response key is rejected", () =>
    {
        const res = validateManifest(base({ providers: { onSearch: { request: "search", params: "q", response: "r" } } }));

        expect(res.ok).toBe(false);
        expect(res.issues.map((i) => i.path).sort())
            .toEqual(["protocol.providers.onSearch.params", "protocol.providers.onSearch.response"]);
    });

    test("an unknown protocol key such as the removed bindAs is rejected", () =>
    {
        const res = validateManifest(base({ bindAs: { anchor: "anchorChange" } }));

        expect(res.ok).toBe(false);
        expect(res.issues.map((i) => i.path)).toEqual(["protocol.bindAs"]);
    });

    test("hostOnly reasons must be strings", () =>
    {
        expect(validateManifest(base({ hostOnly: { renderCell: 3 } })).ok).toBe(false);
    });

    test("schemas values must be objects", () =>
    {
        expect(validateManifest(base({ schemas: { extra: "object" } })).ok).toBe(false);
    });

    // ADR-222: protocol.change, protocol.hostOnlyActions.
    const paths = (protocol: unknown) => validateManifest(base(protocol)).issues.map((i) => i.path);

    test("each protocol.change form is valid", () =>
    {
        expect(paths({ change: { valueFrom: "hex" } })).toEqual([]);
        expect(paths({ change: { cleared: null } })).toEqual([]);
        expect(paths({ change: "event" })).toEqual([]);
    });

    test("protocol.change.valueFrom must name a property", () =>
    {
        expect(paths({ change: { valueFrom: "" } })).toEqual(["protocol.change.valueFrom"]);
    });

    test("protocol.change outside the three forms is rejected", () =>
    {
        expect(paths({ change: { valueFrom: "a", cleared: null } })).toEqual(["protocol.change"]);
        expect(paths({ change: "two-way" })).toEqual(["protocol.change"]);
        expect(paths({ change: { cleared: false } })).toEqual(["protocol.change"]);
    });

    test("protocol.hostOnlyActions reasons must be strings", () =>
    {
        expect(paths({ hostOnlyActions: { export: 1 } })).toEqual(["protocol.hostOnlyActions.export"]);
        expect(paths({ hostOnlyActions: { export: "Writes a file in the browser." } })).toEqual([]);
    });

    // ADR-230 (#51): what the component needs on the page before its own script.
    test("protocol.dependencies names libraries and components as lists of names", () =>
    {
        expect(paths({ dependencies: { libraries: ["marked"], components: ["markdownrenderer"] } })).toEqual([]);
        expect(paths({ dependencies: { components: ["personchip"] } })).toEqual([]);
    });

    test("protocol.dependencies outside that shape is rejected", () =>
    {
        expect(paths({ dependencies: ["marked"] })).toEqual(["protocol.dependencies"]);
        expect(paths({ dependencies: { libraries: "marked" } })).toEqual(["protocol.dependencies.libraries"]);
        expect(paths({ dependencies: { components: ["Person Chip", ""] } }))
            .toEqual(["protocol.dependencies.components[0]", "protocol.dependencies.components[1]"]);
        expect(paths({ dependencies: { scripts: [] } })).toEqual(["protocol.dependencies.scripts"]);
    });
});

describe("validateManifest — agent field (ADR-222)", () =>
{
    function withAgent(agent: unknown): string[]
    {
        const m = { name: "fake", factory: "createFake", label: "Fake", icon: "bi-square",
            category: "data", affords: [], emits: [], accepts: [], actions: [],
            stateKeys: [], weight: { js: 1, mountCost: "light", holdsResources: false },
            defaultSize: { w: 10, h: 10 }, defaultOptions: {}, conformance: "display", priority: 50, agent };

        return validateManifest(m).issues.map((i) => i.path);
    }

    test("two sentences are valid here; the generator checks their content", () =>
    {
        expect(withAgent({ useWhen: "x", avoidWhen: "y" })).toEqual([]);
    });

    test("a missing sentence is reported by path", () =>
    {
        expect(withAgent({ useWhen: "x" })).toEqual(["agent.avoidWhen"]);
    });

    test("an unknown key is rejected", () =>
    {
        expect(withAgent({ useWhen: "x", avoidWhen: "y", extra: 1 })).toEqual(["agent.extra"]);
    });

    test("agent must be an object", () =>
    {
        expect(withAgent("x")).toEqual(["agent"]);
    });
});
