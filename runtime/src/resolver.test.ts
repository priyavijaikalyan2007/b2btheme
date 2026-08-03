/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DynamicUIRuntime — intent resolver scoring, explainability, overrides.
 * Covers PRD §7 (Intent Resolver) and plan Phase 3.
 */

import { describe, test, expect, beforeEach } from "vitest";

import { clearRegistry, registerComponents } from "./registry";
import {
    clearPresentationPreferences,
    recordUserChoice,
    registerPresentationPreference,
    resolve,
} from "./resolver";

import type { Affordance, CapabilityManifest, ResolveRequest } from "./types";

// ============================================================================
// HELPERS
// ============================================================================

function manifest(
    name: string,
    affords: Affordance[],
    over: Partial<CapabilityManifest> = {}): CapabilityManifest
{
    return {
        name,
        factory: `create${name}`,
        label: name,
        icon: "bi-square",
        category: "data",
        affords,
        emits: [{ name: "selection", payload: "record", multi: true }],
        accepts: [{ name: "rows", payload: "collection", required: true }],
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

function afford(over: Partial<Affordance> = {}): Affordance
{
    return {
        shape: "collection",
        intents: ["browse"],
        cardinality: { min: 1, max: 1000 },
        minViewport: { w: 200, h: 150 },
        ...over,
    };
}

function request(over: Partial<ResolveRequest> = {}): ResolveRequest
{
    return {
        intent: "browse",
        shape: "collection",
        cardinality: 50,
        viewport: { w: 1200, h: 800 },
        ...over,
    };
}

/** A grid and a tree, so shape and intent can discriminate between them. */
function seedFleet(): void
{
    registerComponents([
        manifest("grid", [afford({ intents: ["browse", "compare", "edit"] })]),
        manifest("tree", [afford({ shape: "hierarchy", intents: ["browse", "navigate"] })]),
        manifest("chart", [afford({ shape: "timeseries", intents: ["monitor", "compare"] })]),
    ]);
}

beforeEach(() =>
{
    clearRegistry();
    clearPresentationPreferences();
});

// ============================================================================
// BASIC RESOLUTION
// ============================================================================

describe("resolve", () =>
{
    test("chooses the component affording the requested shape", () =>
    {
        seedFleet();

        expect(resolve(request({ shape: "hierarchy" })).chosen).toBe("tree");
    });

    test("chooses on intent when shape does not discriminate", () =>
    {
        registerComponents([
            manifest("browser", [afford({ intents: ["browse"] })]),
            manifest("editor", [afford({ intents: ["edit"] })]),
        ]);

        expect(resolve(request({ intent: "edit" })).chosen).toBe("editor");
    });

    test("returns null when nothing affords the shape", () =>
    {
        seedFleet();

        expect(resolve(request({ shape: "geo" })).chosen).toBeNull();
    });

    test("returns an empty candidate list when nothing affords the shape", () =>
    {
        seedFleet();

        expect(resolve(request({ shape: "geo" })).candidates).toHaveLength(0);
    });

    test("excludes components whose shape does not match", () =>
    {
        seedFleet();

        const names = resolve(request()).candidates.map((c) => c.component);

        expect(names).not.toContain("tree");
        expect(names).not.toContain("chart");
    });

    test("returns candidates in descending score order", () =>
    {
        registerComponents([
            manifest("weak", [afford({ intents: ["compare"] })]),
            manifest("strong", [afford({ intents: ["browse"] })]),
        ]);

        const scores = resolve(request()).candidates.map((c) => c.score);

        expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });

    test("resolves against an empty registry without throwing", () =>
    {
        expect(resolve(request()).chosen).toBeNull();
    });
});

// ============================================================================
// HARD EXCLUSIONS
// ============================================================================

describe("hard exclusions", () =>
{
    test("excludes a component needing more viewport than available", () =>
    {
        registerComponents([
            manifest("big", [afford({ minViewport: { w: 900, h: 600 } })]),
            manifest("small", [afford({ minViewport: { w: 100, h: 100 } })]),
        ]);

        const res = resolve(request({ viewport: { w: 320, h: 240 } }));

        expect(res.chosen).toBe("small");
        expect(res.candidates.map((c) => c.component)).not.toContain("big");
    });

    test("keeps a component that exactly meets the viewport minimum", () =>
    {
        registerComponents([
            manifest("exact", [afford({ minViewport: { w: 320, h: 240 } })]),
        ]);

        expect(resolve(request({ viewport: { w: 320, h: 240 } })).chosen).toBe("exact");
    });
});

// ============================================================================
// CARDINALITY AND DENSITY
// ============================================================================

describe("cardinality fit", () =>
{
    test("prefers the component whose range contains the cardinality", () =>
    {
        registerComponents([
            manifest("single", [afford({ cardinality: { min: 1, max: 1 } })]),
            manifest("many", [afford({ cardinality: { min: 2, max: 10_000 } })]),
        ]);

        expect(resolve(request({ cardinality: 500 })).chosen).toBe("many");
        expect(resolve(request({ cardinality: 1 })).chosen).toBe("single");
    });

    test("decays rather than excluding outside the range", () =>
    {
        registerComponents([
            manifest("single", [afford({ cardinality: { min: 1, max: 1 } })]),
        ]);

        const res = resolve(request({ cardinality: 500 }));

        expect(res.chosen).toBe("single");
        expect(res.candidates[0].score).toBeLessThan(2);
    });

    test("prefers the component whose density range contains the field count", () =>
    {
        registerComponents([
            manifest("narrow", [afford({ density: { min: 1, max: 4 } })]),
            manifest("wide", [afford({ density: { min: 5, max: 80 } })]),
        ]);

        expect(resolve(request({ fieldCount: 40 })).chosen).toBe("wide");
    });

    test("ignores density when the request omits a field count", () =>
    {
        registerComponents([
            manifest("narrow", [afford({ density: { min: 1, max: 4 } })]),
        ]);

        const reasons = resolve(request()).candidates[0].reasons;

        expect(reasons.some((r) => r.factor === "densityFit")).toBe(false);
    });
});

// ============================================================================
// DETERMINISM
// ============================================================================

describe("determinism", () =>
{
    test("breaks a tie by manifest priority", () =>
    {
        registerComponents([
            manifest("low", [afford()], { priority: 10 }),
            manifest("high", [afford()], { priority: 90 }),
        ]);

        expect(resolve(request()).chosen).toBe("high");
    });

    test("breaks a priority tie by name", () =>
    {
        registerComponents([
            manifest("zebra", [afford()], { priority: 50 }),
            manifest("alpha", [afford()], { priority: 50 }),
        ]);

        expect(resolve(request()).chosen).toBe("alpha");
    });

    test("produces the same result across repeated calls", () =>
    {
        seedFleet();

        expect(resolve(request())).toEqual(resolve(request()));
    });

    test("is independent of registration order", () =>
    {
        registerComponents([manifest("a", [afford()]), manifest("b", [afford()])]);
        const first = resolve(request()).chosen;

        clearRegistry();
        registerComponents([manifest("b", [afford()]), manifest("a", [afford()])]);

        expect(resolve(request()).chosen).toBe(first);
    });
});

// ============================================================================
// EXPLAINABILITY (REQUIRED)
// ============================================================================

describe("explainability", () =>
{
    test("every candidate carries at least one reason", () =>
    {
        seedFleet();

        for (const c of resolve(request()).candidates)
        {
            expect(c.reasons.length).toBeGreaterThan(0);
        }
    });

    test("reasons sum to the reported score", () =>
    {
        seedFleet();

        const c = resolve(request()).candidates[0];
        const sum = c.reasons.reduce((t, r) => t + r.delta, 0);

        expect(sum).toBeCloseTo(c.score, 6);
    });

    test("names the intent affinity factor when the intent matches", () =>
    {
        seedFleet();

        const reasons = resolve(request()).candidates[0].reasons;

        expect(reasons.some((r) => r.factor === "intentAffinity")).toBe(true);
    });

    test("names the weight penalty factor", () =>
    {
        seedFleet();

        const reasons = resolve(request()).candidates[0].reasons;

        expect(reasons.some((r) => r.factor === "weightPenalty")).toBe(true);
    });

    test("the winner is the first candidate", () =>
    {
        seedFleet();

        const res = resolve(request());

        expect(res.chosen).toBe(res.candidates[0].component);
    });
});

// ============================================================================
// OVERRIDES
// ============================================================================

describe("overrides", () =>
{
    test("a host preference lifts the preferred component", () =>
    {
        registerComponents([
            manifest("plain", [afford({ intents: ["browse"] })], { priority: 90 }),
            manifest("special", [afford({ intents: ["browse"] })], { priority: 10 }),
        ]);

        registerPresentationPreference(
            { shape: "collection", intent: "browse" },
            { prefer: "special", weight: 1 });

        expect(resolve(request()).chosen).toBe("special");
    });

    test("a preference for another intent does not apply", () =>
    {
        registerComponents([
            manifest("plain", [afford({ intents: ["browse"] })], { priority: 90 }),
            manifest("special", [afford({ intents: ["browse"] })], { priority: 10 }),
        ]);

        registerPresentationPreference(
            { shape: "collection", intent: "edit" },
            { prefer: "special", weight: 1 });

        expect(resolve(request()).chosen).toBe("plain");
    });

    test("the request prefer hint boosts but does not force", () =>
    {
        registerComponents([
            manifest("hinted", [afford({ intents: ["browse"] })], { priority: 50 }),
            manifest("other", [afford({ intents: ["browse"] })], { priority: 50 }),
        ]);

        expect(resolve(request({ prefer: "hinted" })).chosen).toBe("hinted");
    });

    test("a prefer hint naming an unafforded component is ignored", () =>
    {
        seedFleet();

        expect(resolve(request({ prefer: "chart" })).chosen).toBe("grid");
    });

    test("a recorded user choice lifts that component next time", () =>
    {
        registerComponents([
            manifest("plain", [afford({ intents: ["browse"] })], { priority: 90 }),
            manifest("chosen", [afford({ intents: ["browse"] })], { priority: 10 }),
        ]);

        expect(resolve(request()).chosen).toBe("plain");

        recordUserChoice({ shape: "collection", intent: "browse" }, "chosen");
        recordUserChoice({ shape: "collection", intent: "browse" }, "chosen");
        recordUserChoice({ shape: "collection", intent: "browse" }, "chosen");

        expect(resolve(request()).chosen).toBe("chosen");
    });

    test("clearPresentationPreferences removes host preferences", () =>
    {
        registerComponents([
            manifest("plain", [afford()], { priority: 90 }),
            manifest("special", [afford()], { priority: 10 }),
        ]);

        registerPresentationPreference(
            { shape: "collection", intent: "browse" },
            { prefer: "special", weight: 1 });
        clearPresentationPreferences();

        expect(resolve(request()).chosen).toBe("plain");
    });
});

// ============================================================================
// WEIGHT
// ============================================================================

describe("weight penalty", () =>
{
    test("prefers the lighter of two otherwise equal components", () =>
    {
        registerComponents([
            manifest("heavy", [afford()], {
                weight: { js: 400_000, mountCost: "heavy", holdsResources: true },
            }),
            manifest("light", [afford()], {
                weight: { js: 4_000, mountCost: "trivial", holdsResources: false },
            }),
        ]);

        expect(resolve(request()).chosen).toBe("light");
    });

    test("weight never outweighs an intent mismatch", () =>
    {
        registerComponents([
            manifest("light-wrong", [afford({ intents: ["schedule"] })], {
                weight: { js: 1_000, mountCost: "trivial", holdsResources: false },
            }),
            manifest("heavy-right", [afford({ intents: ["browse"] })], {
                weight: { js: 900_000, mountCost: "heavy", holdsResources: true },
            }),
        ]);

        expect(resolve(request()).chosen).toBe("heavy-right");
    });
});
