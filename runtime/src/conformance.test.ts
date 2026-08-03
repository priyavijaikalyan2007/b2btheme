/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: DynamicUIRuntime — the conformance checker itself.
 *
 * These are meta-tests: they verify the checker passes a conforming component
 * and, for every assertion it makes, that it actually FAILS a component which
 * breaks that assertion. A gate that cannot fail is not a gate.
 *
 * Covers PRD §16.1 and plan Phase 6.
 */

import { describe, test, expect } from "vitest";

import { CONFORMANCE_CHECKS, runConformance, sampleFor } from "./conformance";

import type { CapabilityManifest, ConformanceLevel } from "./types";

// ============================================================================
// A CONFORMING REFERENCE COMPONENT
// ============================================================================

interface FakeOptions
{
    onSelect?: (v: unknown) => void;
}

/**
 * A minimal component that satisfies the full Surface contract, used as the
 * baseline. Each failure case below is this component with one thing broken.
 */
function makeFactory(broken: Partial<Record<string, boolean>> = {})
{
    return function create(hostId: string, options: FakeOptions = {})
    {
        const host = document.getElementById(hostId);
        const el = document.createElement("div");
        el.className = "fake-root";
        host?.appendChild(el);

        const handlers = new Map<string, Set<(v: unknown) => void>>();
        let scrollTop = 12;
        let destroyed = false;

        const emit = (channel: string, value: unknown): void =>
        {
            if (channel === "selection" && options.onSelect)
            {
                options.onSelect(value);
            }

            for (const h of handlers.get(channel) ?? [])
            {
                h(value);
            }
        };

        return {
            __emit: emit,

            setData(slot: string, value: unknown)
            {
                if (broken.setDataThrows)
                {
                    throw new Error("nope");
                }

                if (slot === "rows" && Array.isArray(value))
                {
                    scrollTop = value.length;
                }
            },

            on(channel: string, handler: (v: unknown) => void)
            {
                if (!handlers.has(channel))
                {
                    handlers.set(channel, new Set());
                }

                handlers.get(channel)!.add(handler);

                return broken.noUnsubscribe
                    ? undefined
                    : () => handlers.get(channel)?.delete(handler);
            },

            getState()
            {
                return broken.undeclaredStateKey
                    ? { scrollTop, secret: 1 }
                    : broken.unserialisableState
                        ? { scrollTop, fn: () => undefined }
                        : { scrollTop };
            },

            setState(state: Record<string, unknown>)
            {
                if (broken.setStateIgnored)
                {
                    return;
                }

                if (typeof state.scrollTop === "number")
                {
                    scrollTop = state.scrollTop;
                }
            },

            destroy()
            {
                if (broken.destroyThrowsTwice && destroyed)
                {
                    throw new Error("already destroyed");
                }

                destroyed = true;

                if (!broken.destroyLeavesDom)
                {
                    el.remove();
                }
            },
        };
    };
}

function manifest(
    over: Partial<CapabilityManifest> = {}): CapabilityManifest
{
    return {
        name: "fake",
        factory: "createFake",
        label: "Fake",
        icon: "bi-square",
        category: "data",
        affords: [],
        emits: [{ name: "selection", payload: "record", multi: true, legacyOption: "onSelect" }],
        accepts: [{ name: "rows", payload: "collection", required: true }],
        actions: [],
        stateKeys: ["scrollTop"],
        weight: { js: 1000, mountCost: "light", holdsResources: false },
        defaultSize: { w: 100, h: 100 },
        defaultOptions: {},
        conformance: "surface",
        priority: 50,
        ...over,
    };
}

function check(
    brokenOrFactory: Partial<Record<string, boolean>> | unknown = {},
    over: Partial<CapabilityManifest> = {},
    extra: Record<string, unknown> = {})
{
    const factory = typeof brokenOrFactory === "function"
        ? brokenOrFactory
        : makeFactory(brokenOrFactory as Record<string, boolean>);

    return runConformance({
        manifest: manifest(over),
        factory,
        trigger: (channel, handle) =>
            (handle as { __emit: (c: string, v: unknown) => void })
                .__emit(channel, { id: "r1" }),
        ...extra,
    });
}

/** Blocking failures only — warnings record coverage gaps, not violations. */
function failedChecks(
    findings: readonly { check: string; severity: string }[]): string[]
{
    return findings.filter((f) => f.severity === "failure").map((f) => f.check);
}

// ============================================================================
// BASELINE
// ============================================================================

describe("runConformance — conforming component", () =>
{
    test("reports no failures", () =>
    {
        expect(check()).toEqual([]);
    });

    test("leaves no DOM behind after running", () =>
    {
        check();

        expect(document.querySelectorAll(".fake-root")).toHaveLength(0);
    });

    test("passes at field level with getValue and setValue", () =>
    {
        const factory = (hostId: string) =>
        {
            const el = document.createElement("div");
            document.getElementById(hostId)?.appendChild(el);
            let value: unknown = null;

            return {
                getValue: () => value,
                setValue: (v: unknown) => { value = v; },
                destroy: () => el.remove(),
            };
        };

        const failures = check(factory, {
            conformance: "field",
            emits: [],
            accepts: [],
            stateKeys: [],
        });

        expect(failures).toEqual([]);
    });

    test("passes a CLASS-based component, preserving `this`", () =>
    {
        // Regression net: the checker originally extracted methods and called
        // them detached, which works for closure-based handles but breaks
        // every class instance in the fleet — `this` becomes undefined and the
        // call throws inside the component. Both pilot components caught it.
        class Grid
        {
            private el: HTMLElement;
            private rows: unknown[] = [];
            private destroyed = false;

            constructor(hostId: string)
            {
                this.el = document.createElement("div");
                document.getElementById(hostId)?.appendChild(this.el);
            }

            public setData(_slot: string, value: unknown): void
            {
                this.rows = Array.isArray(value) ? value : [];
            }

            public on(): () => void
            {
                return () => undefined;
            }

            public getState(): Record<string, unknown>
            {
                return { scrollTop: this.rows.length };
            }

            public setState(state: Record<string, unknown>): void
            {
                this.rows = new Array(Number(state.scrollTop) || 0);
            }

            public destroy(): void
            {
                if (this.destroyed) { return; }
                this.destroyed = true;
                this.el.remove();
            }
        }

        const failures = check(
            (hostId: string) => new Grid(hostId),
            { emits: [] });

        expect(failures).toEqual([]);
    });

    test("passes at display level with destroy alone", () =>
    {
        const factory = (hostId: string) =>
        {
            const el = document.createElement("div");
            document.getElementById(hostId)?.appendChild(el);

            return { destroy: () => el.remove() };
        };

        const failures = check(factory, {
            conformance: "display",
            emits: [],
            accepts: [],
            stateKeys: [],
        });

        expect(failures).toEqual([]);
    });
});

// ============================================================================
// EVERY ASSERTION MUST BE ABLE TO FAIL
// ============================================================================

describe("runConformance — detects violations", () =>
{
    test("fails when the factory is not callable", () =>
    {
        const failures = runConformance({ manifest: manifest(), factory: 42 });

        expect(failedChecks(failures)).toContain("factory-callable");
    });

    test("fails when the factory throws on mount", () =>
    {
        const failures = check(() => { throw new Error("boom"); });

        expect(failedChecks(failures)).toContain("mounts");
    });

    test("fails when the factory returns no handle", () =>
    {
        expect(failedChecks(check(() => null))).toContain("mounts");
    });

    test("fails when a required method is missing", () =>
    {
        const factory = (hostId: string) =>
        {
            document.getElementById(hostId)?.appendChild(
                document.createElement("div"));

            return { destroy: () => undefined };
        };

        expect(failedChecks(check(factory))).toContain("surface-methods");
    });

    test("fails when destroy leaves DOM behind", () =>
    {
        expect(failedChecks(check({ destroyLeavesDom: true })))
            .toContain("destroy-clears-dom");
    });

    test("fails when destroy is not idempotent", () =>
    {
        expect(failedChecks(check({ destroyThrowsTwice: true })))
            .toContain("destroy-idempotent");
    });

    test("fails when on() does not return an unsubscribe function", () =>
    {
        expect(failedChecks(check({ noUnsubscribe: true })))
            .toContain("on-returns-unsubscribe");
    });

    test("fails when setData throws on a declared slot", () =>
    {
        expect(failedChecks(check({ setDataThrows: true })))
            .toContain("slots-accept-data");
    });

    test("fails when getState returns an undeclared key", () =>
    {
        expect(failedChecks(check({ undeclaredStateKey: true })))
            .toContain("state-keys-declared");
    });

    test("fails when getState is not JSON-serialisable", () =>
    {
        expect(failedChecks(check({ unserialisableState: true })))
            .toContain("state-serialisable");
    });

    test("fails when setState does not round-trip", () =>
    {
        expect(failedChecks(check({ setStateIgnored: true })))
            .toContain("state-round-trips");
    });

    test("fails when the manifest itself is invalid", () =>
    {
        const failures = check({}, { name: "" });

        expect(failedChecks(failures)).toContain("manifest-valid");
    });

    test("reports a detail string for every failure", () =>
    {
        for (const f of check({ destroyLeavesDom: true }))
        {
            expect(f.detail.length).toBeGreaterThan(0);
        }
    });
});

// ============================================================================
// LEGACY SURFACE (THE ADDITIVE GUARANTEE)
// ============================================================================

describe("runConformance — legacy surface", () =>
{
    test("passes when the constructor callback still fires", () =>
    {
        expect(failedChecks(check())).not.toContain("legacy-callback-fires");
    });

    test("fails when the constructor callback no longer fires", () =>
    {
        const factory = (hostId: string) =>
        {
            document.getElementById(hostId)?.appendChild(
                document.createElement("div"));
            const handlers = new Set<(v: unknown) => void>();

            return {
                __emit: (_c: string, v: unknown) =>
                {
                    for (const h of handlers) { h(v); }
                },
                setData: () => undefined,
                on: (_c: string, h: (v: unknown) => void) =>
                {
                    handlers.add(h);
                    return () => handlers.delete(h);
                },
                getState: () => ({ scrollTop: 1 }),
                setState: () => undefined,
                destroy: () => undefined,
            };
        };

        expect(failedChecks(check(factory))).toContain("legacy-callback-fires");
    });

    test("fails when a declared channel never reaches on()", () =>
    {
        const factory = (hostId: string, options: FakeOptions = {}) =>
        {
            document.getElementById(hostId)?.appendChild(
                document.createElement("div"));

            return {
                __emit: (_c: string, v: unknown) => options.onSelect?.(v),
                setData: () => undefined,
                on: () => () => undefined,
                getState: () => ({ scrollTop: 1 }),
                setState: () => undefined,
                destroy: () => undefined,
            };
        };

        expect(failedChecks(check(factory))).toContain("channel-observable");
    });

    test("records an untriggered channel as a warning, not a failure", () =>
    {
        const failures = runConformance({
            manifest: manifest(),
            factory: makeFactory(),
        });

        expect(failedChecks(failures)).not.toContain("channel-observable");
    });

    test("reports untriggered channels so coverage gaps stay visible", () =>
    {
        const failures = runConformance({
            manifest: manifest(),
            factory: makeFactory(),
        });

        expect(failures.some((f) => f.severity === "warning")).toBe(true);
    });
});

// ============================================================================
// INVOCATION CONVENTION
// ============================================================================

describe("runConformance — invocation", () =>
{
    test("supports a component taking (options, containerId)", () =>
    {
        const factory = (options: Record<string, unknown>, hostId: string) =>
        {
            const el = document.createElement("div");
            document.getElementById(hostId)?.appendChild(el);

            return {
                setData: () => undefined,
                on: () => () => undefined,
                getState: () => ({ scrollTop: 1 }),
                setState: () => undefined,
                destroy: () => el.remove(),
                __opts: options,
            };
        };

        const failures = runConformance({
            manifest: manifest({ emits: [] }),
            factory,
            invoke: (f, hostId, options) =>
                (f as (o: unknown, h: string) => unknown)(options, hostId),
        });

        expect(failedChecks(failures)).toEqual([]);
    });
});

// ============================================================================
// SAMPLE DATA
// ============================================================================

describe("sampleFor", () =>
{
    test("produces a value for every data shape", () =>
    {
        const shapes = [
            "scalar", "record", "collection", "hierarchy", "graph",
            "timeseries", "document", "media", "geo", "diff",
        ] as const;

        for (const shape of shapes)
        {
            expect(sampleFor(shape)).toBeDefined();
        }
    });

    test("collection samples are arrays", () =>
    {
        expect(Array.isArray(sampleFor("collection"))).toBe(true);
    });

    test("samples are JSON-serialisable", () =>
    {
        expect(() => JSON.stringify(sampleFor("hierarchy"))).not.toThrow();
    });
});

// ============================================================================
// CHECK REGISTRY
// ============================================================================

describe("CONFORMANCE_CHECKS", () =>
{
    test("declares a level for every check", () =>
    {
        const levels: ConformanceLevel[] = ["display", "field", "surface"];

        for (const c of CONFORMANCE_CHECKS)
        {
            expect(levels).toContain(c.minLevel);
        }
    });

    test("every check id is unique", () =>
    {
        const ids = CONFORMANCE_CHECKS.map((c) => c.id);

        expect(new Set(ids).size).toBe(ids.length);
    });
});
