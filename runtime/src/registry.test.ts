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

    test("requires a surface-level manifest to declare state keys", () =>
    {
        const res = validateManifest(manifest("x", {
            conformance: "surface",
            stateKeys: [],
            emits: [],
            accepts: [],
        }));

        expect(res.ok).toBe(false);
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
