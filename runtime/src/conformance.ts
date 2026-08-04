/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c0c46c8e-3c5a-4450-a7e7-69042b18584e
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Conformance
 * 📜 PURPOSE: The generic, manifest-driven conformance checker. One suite runs
 *    over every registered component and decides whether it may be mounted on
 *    a canvas. This is what turns a 118-component retrofit from 118 design
 *    problems into a mechanical burn-down.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[Registry]], [[Surface]]
 * ⚡ FLOW: [manifest + factory] -> [runConformance()] -> [failures]
 * 🔒 SECURITY: Mounts into a detached host and always tears it down, so a
 *    misbehaving component cannot leak DOM into the test page.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-conformance
// @entrypoint

import { LOG_PREFIX } from "./constants";
import { validateManifest } from "./registry";

import type {
    CapabilityManifest,
    ConformanceLevel,
    DataShape,
} from "./types";

// ============================================================================
// TYPES
// ============================================================================

/** Whether a finding blocks the gate or merely records a coverage gap. */
export type CheckSeverity = "failure" | "warning";

/** One conformance finding. */
export interface ConformanceFailure
{
    /** Stable check id, e.g. "destroy-idempotent". */
    readonly check: string;

    /** Failures block the gate; warnings record an untested obligation. */
    readonly severity: CheckSeverity;

    /** What went wrong, concretely enough to act on. */
    readonly detail: string;
}

/** A component under test, plus the glue needed to exercise it. */
export interface ConformanceTarget
{
    /** The component's capability manifest. */
    readonly manifest: CapabilityManifest;

    /** The factory function itself, not its name. */
    readonly factory: unknown;

    /** Options merged over the manifest defaults. */
    readonly options?: Record<string, unknown>;

    /**
     * Calls the factory. Defaults to the canonical `factory(hostId, options)`
     * form from ADR-134. Supply this only for components that predate the
     * convention and take their arguments the other way round.
     */
    readonly invoke?: (
        factory: unknown,
        hostId: string,
        options: Record<string, unknown>) => unknown;

    /**
     * Causes a channel to emit, so the legacy-callback and channel-observable
     * checks can run. Without it those obligations are reported as warnings
     * rather than silently skipped.
     */
    readonly trigger?: (
        channel: string,
        handle: Record<string, unknown>) => boolean | void;
}

/** Declaration of one check, for documentation and coverage reporting. */
export interface CheckDeclaration
{
    readonly id: string;
    readonly minLevel: ConformanceLevel;
    readonly description: string;
}

// ============================================================================
// CHECK REGISTRY
// ============================================================================

/**
 * Every check the suite performs. `minLevel` selects which components it
 * applies to: display checks run for all levels, field and surface checks run
 * only for components declaring that level.
 */
export const CONFORMANCE_CHECKS: readonly CheckDeclaration[] =
[
    { id: "manifest-valid", minLevel: "display", description: "Manifest passes schema validation." },
    { id: "factory-callable", minLevel: "display", description: "Factory is a callable function." },
    { id: "mounts", minLevel: "display", description: "Mounts into a detached host and returns a handle." },
    { id: "display-methods", minLevel: "display", description: "Handle exposes destroy()." },
    { id: "field-methods", minLevel: "field", description: "Handle exposes getValue/setValue/destroy." },
    { id: "surface-methods", minLevel: "surface", description: "Handle exposes setData/on/getState/setState/destroy." },
    { id: "on-returns-unsubscribe", minLevel: "surface", description: "on() returns a working unsubscribe function." },
    { id: "slots-accept-data", minLevel: "surface", description: "Every declared slot accepts a sample of its payload shape." },
    { id: "state-keys-declared", minLevel: "surface", description: "getState() returns only declared stateKeys." },
    { id: "state-serialisable", minLevel: "surface", description: "getState() is JSON-serialisable." },
    { id: "state-round-trips", minLevel: "surface", description: "setState(getState()) restores the captured state." },
    { id: "channel-observable", minLevel: "surface", description: "Every declared channel reaches an on() subscriber." },
    { id: "legacy-callback-fires", minLevel: "surface", description: "The pre-existing constructor callback still fires, and fires first." },
    { id: "renders-content", minLevel: "display", description: "Mounting puts something in the host." },
    { id: "destroy-clears-dom", minLevel: "display", description: "destroy() removes everything the component added." },
    { id: "destroy-idempotent", minLevel: "display", description: "A second destroy() is a no-op." },
];

// ============================================================================
// SAMPLE DATA
// ============================================================================

/** Representative sample payloads, one per data shape. */
const SAMPLES: Readonly<Record<DataShape, () => unknown>> =
{
    scalar: () => 42,
    record: () => ({ id: "r1", name: "Sample" }),
    collection: () => [{ id: "r1", name: "One" }, { id: "r2", name: "Two" }],
    hierarchy: () => ({ id: "root", label: "Root", children: [{ id: "c1", label: "Child" }] }),
    graph: () => ({ nodes: [{ id: "n1" }, { id: "n2" }], edges: [{ source: "n1", target: "n2" }] }),
    timeseries: () => [{ t: "2026-01-01", v: 1 }, { t: "2026-01-02", v: 2 }],
    document: () => ({ id: "d1", title: "Sample", body: "Text" }),
    media: () => ({ id: "m1", url: "about:blank", kind: "image" }),
    geo: () => ({ type: "Point", coordinates: [0, 0] }),
    diff: () => ({ before: { a: 1 }, after: { a: 2 } }),
};

/**
 * Builds a representative sample value for a data shape, used to exercise a
 * component's declared slots.
 *
 * @param shape - The declared payload shape.
 * @returns A JSON-serialisable sample.
 */
export function sampleFor(shape: DataShape): unknown
{
    return (SAMPLES[shape] ?? SAMPLES.record)();
}

// ============================================================================
// HELPERS
// ============================================================================

/** Monotonic counter so concurrent hosts cannot collide on an id. */
let hostSeq = 0;

/** Records a finding into the accumulator. */
function fail(
    out: ConformanceFailure[],
    check: string,
    detail: string,
    severity: CheckSeverity = "failure"): void
{
    out.push({ check, severity, detail });
}

/** True when a handle exposes every named method. */
function hasMethods(
    handle: Record<string, unknown>,
    names: readonly string[]): string[]
{
    return names.filter((n) => typeof handle[n] !== "function");
}

/**
 * Calls a handle method with `this` bound to the handle.
 *
 * Extracting a method and calling it detached silently breaks every
 * class-based component in the fleet — `this` becomes undefined and the call
 * throws deep inside the component. Always route through here.
 *
 * @param handle - The mounted handle.
 * @param method - Method name.
 * @param args   - Arguments to forward.
 * @returns Whatever the method returned.
 */
function call(
    handle: Record<string, unknown>,
    method: string,
    ...args: unknown[]): unknown
{
    return (handle[method] as (...a: unknown[]) => unknown)
        .apply(handle, args);
}

/** Calls a handle method, returning any thrown error rather than propagating. */
function attempt(fn: () => void): Error | null
{
    try
    {
        fn();
        return null;
    }
    catch (err)
    {
        return err instanceof Error ? err : new Error(String(err));
    }
}

/** Structural equality over JSON-serialisable values. */
function sameJson(a: unknown, b: unknown): boolean
{
    try
    {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    catch
    {
        return false;
    }
}

// ============================================================================
// RUNNER
// ============================================================================

/**
 * Runs the conformance suite against one component.
 *
 * Returns findings rather than throwing, so the same routine can drive a
 * vitest assertion, the structural gate, and a coverage report.
 *
 * @param target - The component, its manifest, and any glue it needs.
 * @returns Every finding. An empty array means fully conformant.
 */
export function runConformance(
    target: ConformanceTarget): ConformanceFailure[]
{
    const out: ConformanceFailure[] = [];
    const { manifest } = target;

    const res = validateManifest(manifest);

    if (!res.ok)
    {
        fail(out, "manifest-valid",
            res.issues.map((i) => `${i.path}: ${i.problem}`).join("; "));
    }

    if (typeof target.factory !== "function")
    {
        fail(out, "factory-callable",
            `Expected a function, found ${typeof target.factory}.`);
        return out;
    }

    return runMounted(target, out);
}

/**
 * Mounts the component and runs every check that needs a live instance,
 * guaranteeing the host is removed however the run ends.
 *
 * @param target - The component under test.
 * @param out    - Findings accumulated so far.
 * @returns Every finding.
 */
function runMounted(
    target: ConformanceTarget,
    out: ConformanceFailure[]): ConformanceFailure[]
{
    mountError = "";

    const host = document.createElement("div");
    host.id = `conformance-host-${++hostSeq}`;
    document.body.appendChild(host);

    try
    {
        const spies = new Map<string, unknown[]>();
        const handle = mount(target, host.id, spies);

        if (!handle)
        {
            fail(out, "mounts",
                `Factory did not produce a handle. ${mountError}`);
            return out;
        }

        checkMethods(target, handle, out);
        checkRendered(target, host, out);
        checkSurface(target, handle, spies, out);
        checkTeardown(handle, host, out);
    }
    finally
    {
        host.remove();
    }

    return out;
}

/**
 * Invokes the factory with spy callbacks injected for every channel that
 * declares a legacy option.
 *
 * @param target - The component under test.
 * @param hostId - Id of the host element.
 * @param spies  - Receives the values each legacy callback observed.
 * @returns The handle, or null when the factory failed.
 */
function mount(
    target: ConformanceTarget,
    hostId: string,
    spies: Map<string, unknown[]>): Record<string, unknown> | null
{
    const options: Record<string, unknown> = {
        ...target.manifest.defaultOptions,
        ...target.options,
    };

    for (const channel of target.manifest.emits)
    {
        if (!channel.legacyOption)
        {
            continue;
        }

        const seen: unknown[] = [];
        spies.set(channel.name, seen);
        options[channel.legacyOption] = (v: unknown) => seen.push(v);
    }

    try
    {
        const invoke = target.invoke ?? defaultInvoke(target.manifest);
        const handle = invoke(target.factory, hostId, options);

        if (handle && typeof handle === "object")
        {
            attachHandle(
                handle as Record<string, unknown>,
                target.manifest,
                document.getElementById(hostId));

            return handle as Record<string, unknown>;
        }

        mountError = `Factory returned ${handle === null ? "null" : typeof handle}, `
            + "expected a handle object.";
        return null;
    }
    catch (err)
    {
        mountError = err instanceof Error
            ? `${err.message}\n${(err.stack ?? "").split("\n").slice(1, 4).join("\n")}`
            : String(err);
        return null;
    }
}

/**
 * Attaches a component that does not attach itself.
 *
 * @param handle   - The freshly constructed handle.
 * @param manifest - Declares how attachment works.
 * @param host     - The host element.
 */
function attachHandle(
    handle: Record<string, unknown>,
    manifest: CapabilityManifest,
    host: HTMLElement | null): void
{
    if (!host || !manifest.mountMethod || manifest.mountMethod === "auto")
    {
        return;
    }

    if (manifest.mountMethod === "show" && typeof handle.show === "function")
    {
        (handle.show as (h: HTMLElement) => void).call(handle, host);
        return;
    }

    if (manifest.mountMethod === "getElement"
        && typeof handle.getElement === "function")
    {
        const el = (handle.getElement as () => unknown).call(handle);

        if (el instanceof Element)
        {
            host.appendChild(el);
        }
    }
}

/** Reason the most recent mount failed, surfaced in the finding. */
let mountError = "";

/**
 * Builds the factory invoker for a declared argument order.
 *
 * @param manifest - Declares factoryStyle and, for options-only, the option
 *                   key carrying the host element.
 * @returns An invoker matching that convention.
 */
function defaultInvoke(
    manifest: CapabilityManifest):
    (f: unknown, id: string, o: Record<string, unknown>) => unknown
{
    if (manifest.factoryStyle === "options-first")
    {
        return (f, id, o) =>
            (f as (a: unknown, b: string) => unknown)(o, id);
    }

    if (manifest.factoryStyle === "options-only")
    {
        const key = manifest.containerOption ?? "container";
        const asId = manifest.containerAs === "id";

        return (f, id, o) => (f as (a: unknown) => unknown)(
            { ...o, [key]: asId ? id : document.getElementById(id) });
    }

    return (f, id, o) =>
        (f as (a: string, b: unknown) => unknown)(id, o);
}

/**
 * Asserts that mounting actually put something in the host.
 *
 * Without this, a component handed the wrong container option constructs
 * successfully, renders nothing, and passes every other check — including
 * destroy-clears-dom, which is trivially satisfied when nothing was added.
 * That exact failure hid a wrong `containerOption` on TreeView.
 *
 * @param target - The component under test.
 * @param host   - The host element it was mounted into.
 * @param out    - Findings accumulator.
 */
function checkRendered(
    target: ConformanceTarget,
    host: HTMLElement,
    out: ConformanceFailure[]): void
{
    if (host.childNodes.length > 0)
    {
        return;
    }

    const m = target.manifest;
    const hint = m.factoryStyle === "options-only"
        ? ` Check containerOption ("${m.containerOption ?? "container"}"), `
            + `containerAs ("${m.containerAs ?? "element"}") and mountMethod `
            + `("${m.mountMethod ?? "auto"}") — the component `
            + "may be reading a different option, expecting an id where an "
            + "element was passed, or needing show()/getElement() to attach."
        : ` Check factoryStyle ("${m.factoryStyle ?? "container-first"}") and `
            + `mountMethod ("${m.mountMethod ?? "auto"}").`;

    fail(out, "renders-content",
        `Mounting produced a handle but left the host empty.${hint}`);
}

/**
 * Checks that the handle exposes the methods its conformance level requires.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param out    - Findings accumulator.
 */
function checkMethods(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    const level = target.manifest.conformance;

    const missing = hasMethods(handle, methodsFor(level));

    if (missing.length > 0)
    {
        fail(out, `${level}-methods`,
            `Missing ${missing.join(", ")} on the handle.`);
    }
}

/**
 * The methods each conformance level requires.
 *
 * @param level - Declared conformance level.
 * @returns Required method names.
 */
function methodsFor(level: ConformanceLevel): readonly string[]
{
    if (level === "surface")
    {
        return ["setData", "on", "getState", "setState", "destroy"];
    }

    if (level === "field")
    {
        return ["getValue", "setValue", "destroy"];
    }

    return ["destroy"];
}

// ============================================================================
// SURFACE CHECKS
// ============================================================================

/**
 * Runs every surface-level check. Skipped entirely for display and field
 * components, which carry no wiring obligations.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param spies  - Legacy callback observations, keyed by channel.
 * @param out    - Findings accumulator.
 */
function checkSurface(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    spies: Map<string, unknown[]>,
    out: ConformanceFailure[]): void
{
    if (target.manifest.conformance !== "surface")
    {
        return;
    }

    if (typeof handle.on !== "function" || typeof handle.setData !== "function"
        || typeof handle.getState !== "function"
        || typeof handle.setState !== "function")
    {
        return;
    }

    checkUnsubscribe(target, handle, out);
    checkChannels(target, handle, spies, out);
    checkStateContract(target, handle, out);
}

/**
 * Asserts on() hands back a usable unsubscribe function.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param out    - Findings accumulator.
 */
function checkUnsubscribe(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    const channel = target.manifest.emits[0]?.name ?? "probe";
    const off = call(handle, "on", channel, () => undefined);

    if (typeof off !== "function")
    {
        fail(out, "on-returns-unsubscribe",
            `on("${channel}") returned ${typeof off}, expected a function. `
            + "The canvas creates and tears down bindings continuously and "
            + "cannot retain handler references.");
        return;
    }

    const err = attempt(() => (off as () => void)());

    if (err)
    {
        fail(out, "on-returns-unsubscribe",
            `Unsubscribe threw: ${err.message}`);
    }
}

/**
 * Asserts every declared channel reaches an on() subscriber, and that the
 * pre-existing constructor callback still fires first.
 *
 * This is the ADDITIVE guarantee made verifiable: it is the regression net
 * that proves adding on() did not displace anyone's existing callback.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param spies  - Legacy callback observations, keyed by channel.
 * @param out    - Findings accumulator.
 */
function checkChannels(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    spies: Map<string, unknown[]>,
    out: ConformanceFailure[]): void
{
    if (!target.trigger)
    {
        for (const channel of target.manifest.emits)
        {
            fail(out, "channel-observable",
                `Channel "${channel.name}" was not exercised — the target `
                + "supplies no trigger(), so neither the on() path nor the "
                + "legacy callback could be verified.", "warning");
        }

        return;
    }

    for (const channel of target.manifest.emits)
    {
        exerciseChannel(target, handle, channel.name,
            spies.get(channel.name), out);
    }
}

/**
 * Triggers one channel and checks both delivery paths.
 *
 * @param target  - The component under test.
 * @param handle  - The mounted handle.
 * @param channel - Channel name.
 * @param seen    - Legacy callback observations, if the channel declares one.
 * @param out     - Findings accumulator.
 */
function exerciseChannel(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    channel: string,
    seen: unknown[] | undefined,
    out: ConformanceFailure[]): void
{
    const observed: unknown[] = [];

    call(handle, "on", channel, (v: unknown) => observed.push(v));

    const before = seen?.length ?? 0;
    let driven: boolean | void = undefined;
    let err: Error | null = null;

    try
    {
        driven = target.trigger!(channel, handle);
    }
    catch (caught)
    {
        err = caught instanceof Error ? caught : new Error(String(caught));
    }

    if (err)
    {
        fail(out, "channel-observable",
            `Triggering "${channel}" threw: ${err.message}`);
        return;
    }

    if (driven === false)
    {
        fail(out, "channel-observable",
            `Channel "${channel}" could not be driven programmatically, so `
            + "neither the on() path nor the legacy callback was verified. "
            + "Extend the component's .conformance.ts trigger when a way to "
            + "drive it exists.", "warning");
        return;
    }

    if (observed.length === 0)
    {
        fail(out, "channel-observable",
            `Channel "${channel}" is declared in the manifest but never `
            + "reached an on() subscriber after being triggered.");
    }

    if (seen && seen.length === before)
    {
        fail(out, "legacy-callback-fires",
            `The constructor callback for "${channel}" did not fire. Adding `
            + "on() must not displace it — existing consumers depend on it "
            + "and the Dynamic UI layer is additive by contract.");
    }
}

/**
 * Checks the state contract: declared keys only, JSON-serialisable, and a
 * faithful round trip.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param out    - Findings accumulator.
 */
function checkStateContract(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    const captured = call(handle, "getState") as Record<string, unknown>;

    checkStateKeys(target.manifest, captured, out);
    checkStateSerialisable(captured, out);
    checkRoundTrip(target, handle, captured, out);
}

/**
 * Asserts getState() returns nothing the manifest did not declare.
 *
 * @param manifest - The component's manifest.
 * @param state    - The captured state.
 * @param out      - Findings accumulator.
 */
function checkStateKeys(
    manifest: CapabilityManifest,
    state: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    const declared = new Set(manifest.stateKeys);
    const extra = Object.keys(state ?? {}).filter((k) => !declared.has(k));

    if (extra.length > 0)
    {
        fail(out, "state-keys-declared",
            `getState() returned undeclared key(s): ${extra.join(", ")}. `
            + "Declare them in the manifest's stateKeys or stop returning them "
            + "— the canvas persists exactly what is declared.");
    }
}

/**
 * Asserts the captured state survives a JSON round trip, since it is
 * persisted by the host.
 *
 * @param state - The captured state.
 * @param out   - Findings accumulator.
 */
function checkStateSerialisable(
    state: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    let encoded: string | undefined;

    const err = attempt(() => { encoded = JSON.stringify(state); });

    if (err || encoded === undefined)
    {
        fail(out, "state-serialisable",
            `getState() is not JSON-serialisable: ${err?.message ?? "encoded to undefined"}.`);
        return;
    }

    const lost = findUnserialisable(state, "");

    if (lost.length > 0)
    {
        fail(out, "state-serialisable",
            `getState() contains value(s) that JSON silently discards: `
            + `${lost.join(", ")}. The host persists this state, so a dropped `
            + "value restores as missing rather than as an error.");
    }
}

/**
 * Walks a value and reports paths holding types JSON drops silently.
 *
 * Comparing JSON.stringify output before and after cannot catch these — both
 * sides discard the same values, so the comparison always agrees. The only
 * reliable check is a structural walk.
 *
 * @param value - The value to inspect.
 * @param path  - Accumulated path, for the report.
 * @returns Paths whose values would not survive persistence.
 */
function findUnserialisable(value: unknown, path: string): string[]
{
    const kind = typeof value;

    if (kind === "function" || kind === "symbol" || kind === "bigint"
        || value === undefined)
    {
        return [`${path || "$"} (${kind})`];
    }

    if (value === null || kind !== "object")
    {
        return [];
    }

    if (Array.isArray(value))
    {
        return value.flatMap((v, i) => findUnserialisable(v, `${path}[${i}]`));
    }

    return Object.entries(value as Record<string, unknown>)
        .flatMap(([k, v]) => findUnserialisable(v, path ? `${path}.${k}` : k));
}

/**
 * Asserts setState() restores a previously captured state.
 *
 * Mutates the component through a declared slot first, so a setState() that
 * silently does nothing cannot pass by leaving state coincidentally equal.
 * When no slot produces an observable change the check cannot conclude, and
 * says so as a warning rather than passing quietly.
 *
 * @param target   - The component under test.
 * @param handle   - The mounted handle.
 * @param captured - State captured before mutation.
 * @param out      - Findings accumulator.
 */
function checkRoundTrip(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    captured: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    fillSlots(target, handle, out);

    const mutated = call(handle, "getState") as Record<string, unknown>;

    if (sameJson(mutated, captured))
    {
        fail(out, "state-round-trips",
            "No declared slot produced an observable state change, so the "
            + "round trip could not be verified.", "warning");
        return;
    }

    const err = attempt(() => { call(handle, "setState", captured); });

    if (err)
    {
        fail(out, "state-round-trips", `setState() threw: ${err.message}`);
        return;
    }

    if (!sameJson(call(handle, "getState"), captured))
    {
        fail(out, "state-round-trips",
            "setState(getState()) did not restore the captured state. The "
            + "canvas virtualizes aggressively, so a lossy restore shows the "
            + "user a component that silently lost their place.");
    }
}

/**
 * Feeds a sample of the declared payload shape into every declared slot.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param out    - Findings accumulator.
 */
function fillSlots(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    for (const slot of target.manifest.accepts)
    {
        const custom = slot.setter && slot.setter !== "setData"
            && typeof handle[slot.setter] === "function"
            ? slot.setter
            : null;

        const err = attempt(() =>
        {
            if (custom)
            {
                call(handle, custom, sampleFor(slot.payload));
                return;
            }

            call(handle, "setData", slot.name, sampleFor(slot.payload));
        });

        if (err)
        {
            fail(out, "slots-accept-data",
                `Slot "${slot.name}" rejected a sample ${slot.payload}: `
                + `${err.message}`);
        }
    }
}

// ============================================================================
// TEARDOWN CHECKS
// ============================================================================

/**
 * Checks that destroy() cleans up completely and tolerates a second call.
 *
 * Both matter to the canvas specifically: it mounts and unmounts continuously
 * as the viewport moves, so a leak compounds and a throwing second destroy
 * breaks reconciliation for every other node.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param host   - The host element the component was mounted into.
 * @param out    - Findings accumulator.
 */
function checkTeardown(
    handle: Record<string, unknown>,
    host: HTMLElement,
    out: ConformanceFailure[]): void
{
    if (typeof handle.destroy !== "function")
    {
        return;
    }

    const first = attempt(() => { call(handle, "destroy"); });

    if (first)
    {
        fail(out, "destroy-clears-dom", `destroy() threw: ${first.message}`);
        return;
    }

    if (host.childNodes.length > 0)
    {
        fail(out, "destroy-clears-dom",
            `destroy() left ${host.childNodes.length} node(s) in the host. `
            + "The canvas mounts and unmounts continuously, so anything left "
            + "behind compounds.");
    }

    const second = attempt(() => { call(handle, "destroy"); });

    if (second)
    {
        fail(out, "destroy-idempotent",
            `A second destroy() threw: ${second.message}. Lifecycle may call `
            + "destroy() on an already-demoted node; it must be a no-op.");
    }
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Formats findings for a test assertion message.
 *
 * @param component - Component name.
 * @param findings  - Findings from runConformance.
 * @returns A multi-line report, or an empty string when fully conformant.
 */
export function formatConformance(
    component: string,
    findings: readonly ConformanceFailure[]): string
{
    if (findings.length === 0)
    {
        return "";
    }

    const lines = findings.map(
        (f) => `  [${f.severity}] ${f.check}: ${f.detail}`);

    return `${LOG_PREFIX} ${component} conformance:\n${lines.join("\n")}`;
}

/**
 * Filters findings down to the ones that block the gate.
 *
 * @param findings - Findings from runConformance.
 * @returns Only the blocking failures.
 */
export function blockingFailures(
    findings: readonly ConformanceFailure[]): ConformanceFailure[]
{
    return findings.filter((f) => f.severity === "failure");
}
