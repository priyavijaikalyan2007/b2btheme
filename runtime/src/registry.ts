/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: ee4b5a87-5bd6-4593-8f62-727cf28e7710
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Registry
 * 📜 PURPOSE: The allowlist of components a canvas may mount, plus manifest
 *    validation. Factory resolution is allowlist-only: a component name that
 *    was never registered is never looked up, however plausible it looks.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[Resolver]], [[Lifecycle]]
 * ⚡ FLOW: [manifest] -> [registerComponent()] -> [resolveFactory()] -> [mount]
 * 🔒 SECURITY: (CRITICAL) Scene documents are model-authored and untrusted.
 *    lookupFactory() reads exactly one property — the factory named by a
 *    REGISTERED manifest — and never scans the global scope for a matching
 *    name. Scanning would turn an untrusted string into arbitrary global
 *    invocation. See ADR-143.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-registry
// @entrypoint

import { DATA_SHAPES, INTENT_VERBS, LOG_PREFIX } from "./constants";

import {
    enumIssue,
    formatIssues,
    issue,
    result,
    typeIssue,
    type ValidationIssue,
    type ValidationResult,
} from "./errors";

import {
    isFiniteNumber, isNonEmptyString, isObject, isRegionName,
} from "./predicates";

import type { CapabilityManifest } from "./types";

// ============================================================================
// STATE
// ============================================================================

/** The allowlist. Nothing outside this map can be mounted. */
const registry = new Map<string, CapabilityManifest>();

/** Legal conformance levels. */
const CONFORMANCE_LEVELS: readonly string[] = ["display", "field", "surface"];

/** Legal factory argument orders. */
const FACTORY_STYLES: readonly string[] =
    ["container-first", "options-first", "options-only"];

/** Legal attachment methods. */
const MOUNT_METHODS: readonly string[] = ["auto", "show", "getElement"];

/** Legal mount cost classes. */
const MOUNT_COSTS: readonly string[] = ["trivial", "light", "moderate", "heavy"];

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates a capability manifest in full, collecting every issue.
 *
 * @param m - The candidate manifest.
 * @returns The validation result.
 */
export function validateManifest(m: unknown): ValidationResult
{
    if (!isObject(m))
    {
        return result([typeIssue("$", "a capability manifest object", m)]);
    }

    const issues: ValidationIssue[] = [];

    validateIdentity(m, issues);
    validateAffordances(m, issues);
    validatePorts(m, issues);
    validateWeightAndSize(m, issues);
    validateConformance(m, issues);
    validateProtocol(m, issues);
    validateAgent(m, issues);

    return result(issues);
}

/**
 * Validates the identity and presentation fields.
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validateIdentity(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    for (const key of ["name", "factory", "label", "icon", "category"])
    {
        if (!isNonEmptyString(m[key]))
        {
            issues.push(typeIssue(key, "a non-empty string", m[key]));
        }
    }

    if (!isFiniteNumber(m.priority))
    {
        issues.push(typeIssue("priority", "a number", m.priority));
    }

    if (m.factoryStyle !== undefined
        && !FACTORY_STYLES.includes(m.factoryStyle as string))
    {
        issues.push(enumIssue("factoryStyle", m.factoryStyle, FACTORY_STYLES));
    }

    if (m.containerAs !== undefined
        && m.containerAs !== "element" && m.containerAs !== "id")
    {
        issues.push(enumIssue("containerAs", m.containerAs, ["element", "id"]));
    }

    if (m.presentation !== undefined
        && m.presentation !== "framed" && m.presentation !== "overlay")
    {
        issues.push(enumIssue("presentation", m.presentation,
            ["framed", "overlay"]));
    }

    if (m.mountMethod !== undefined
        && !MOUNT_METHODS.includes(m.mountMethod as string))
    {
        issues.push(enumIssue("mountMethod", m.mountMethod, MOUNT_METHODS));
    }
}

/**
 * Validates every affordance, including shape and intent vocabularies.
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validateAffordances(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    if (!Array.isArray(m.affords))
    {
        issues.push(typeIssue("affords", "an array of affordances", m.affords));
        return;
    }

    m.affords.forEach((a: unknown, i: number) =>
    {
        validateAffordance(a, `affords.${i}`, issues);
    });
}

/**
 * Validates one affordance.
 *
 * @param a      - The candidate affordance.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateAffordance(
    a: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!isObject(a))
    {
        issues.push(typeIssue(path, "an affordance object", a));
        return;
    }

    if (typeof a.shape !== "string" || !DATA_SHAPES.includes(a.shape as never))
    {
        issues.push(enumIssue(`${path}.shape`, a.shape, DATA_SHAPES));
    }

    validateIntents(a.intents, `${path}.intents`, issues);
    validateRange(a.cardinality, `${path}.cardinality`, issues, true);
    validateRange(a.density, `${path}.density`, issues, false);
    validateExtent(a.minViewport, `${path}.minViewport`, issues);
}

/**
 * Validates an intent verb list.
 *
 * @param value  - The candidate list.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateIntents(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!Array.isArray(value))
    {
        issues.push(typeIssue(path, "an array of intent verbs", value));
        return;
    }

    value.forEach((verb: unknown, i: number) =>
    {
        if (typeof verb !== "string" || !INTENT_VERBS.includes(verb as never))
        {
            issues.push(enumIssue(`${path}.${i}`, verb, INTENT_VERBS));
        }
    });
}

/**
 * Validates a min/max range, rejecting inverted bounds.
 *
 * @param value    - The candidate range, possibly undefined.
 * @param path     - JSON path for error reporting.
 * @param issues   - Accumulator appended to in place.
 * @param required - Whether the range must be present.
 */
function validateRange(
    value: unknown,
    path: string,
    issues: ValidationIssue[],
    required: boolean): void
{
    if (value === undefined)
    {
        if (required)
        {
            issues.push(typeIssue(path, "a { min, max } range", value));
        }
        return;
    }

    if (!isObject(value) || !isFiniteNumber(value.min) || !isFiniteNumber(value.max))
    {
        issues.push(typeIssue(path, "a { min, max } range of numbers", value));
        return;
    }

    if (value.min > value.max)
    {
        issues.push(issue(
            path,
            `Range minimum ${value.min} is greater than maximum ${value.max}.`,
            "Swap the bounds so that min is less than or equal to max."));
    }
}

/**
 * Validates a width/height extent.
 *
 * @param value  - The candidate extent.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateExtent(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!isObject(value) || !isFiniteNumber(value.w) || !isFiniteNumber(value.h))
    {
        issues.push(typeIssue(path, "a { w, h } extent of numbers", value));
    }
}

/**
 * Validates emitted channels and accepted slots, including uniqueness.
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validatePorts(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    validatePortList(m.emits, "emits", issues);
    validatePortList(m.accepts, "accepts", issues);
}

/**
 * Validates one port list — either channels or slots.
 *
 * @param value  - The candidate list.
 * @param path   - "emits" or "accepts".
 * @param issues - Accumulator appended to in place.
 */
function validatePortList(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!Array.isArray(value))
    {
        issues.push(typeIssue(path, "an array", value));
        return;
    }

    const seen = new Set<string>();

    value.forEach((port: unknown, i: number) =>
    {
        if (!isObject(port) || !isNonEmptyString(port.name))
        {
            issues.push(typeIssue(`${path}.${i}.name`, "a port name", port));
            return;
        }

        if (seen.has(port.name))
        {
            issues.push(issue(
                `${path}.${i}.name`,
                `Port name "${port.name}" is declared more than once.`,
                `Give every entry in ${path} a unique name.`));
        }

        seen.add(port.name);

        if (typeof port.payload !== "string"
            || !DATA_SHAPES.includes(port.payload as never))
        {
            issues.push(enumIssue(`${path}.${i}.payload`, port.payload, DATA_SHAPES));
        }
    });
}

/**
 * Validates the weight model and default size.
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validateWeightAndSize(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    const w = m.weight;

    if (!isObject(w))
    {
        issues.push(typeIssue("weight", "a weight object", w));
    }
    else
    {
        if (!isFiniteNumber(w.js) || w.js < 0)
        {
            issues.push(typeIssue("weight.js", "a byte count of zero or more", w.js));
        }

        if (typeof w.mountCost !== "string" || !MOUNT_COSTS.includes(w.mountCost))
        {
            issues.push(enumIssue("weight.mountCost", w.mountCost, MOUNT_COSTS));
        }

        if (typeof w.holdsResources !== "boolean")
        {
            issues.push(typeIssue("weight.holdsResources", "a boolean", w.holdsResources));
        }
    }

    validateExtent(m.defaultSize, "defaultSize", issues);
}

/**
 * Validates the conformance level and the obligations it implies.
 *
 * A manifest claiming `surface` must declare the state it can restore;
 * otherwise the canvas cannot virtualize it without losing the user's place.
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validateConformance(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    if (typeof m.conformance !== "string"
        || !CONFORMANCE_LEVELS.includes(m.conformance))
    {
        issues.push(enumIssue("conformance", m.conformance, CONFORMANCE_LEVELS));
        return;
    }

    if (!Array.isArray(m.stateKeys))
    {
        issues.push(typeIssue("stateKeys", "an array of state key names", m.stateKeys));
        return;
    }

    if (m.regions !== undefined)
    {
        if (!Array.isArray(m.regions))
        {
            issues.push(typeIssue(
                "regions", "an array of region names", m.regions));
            return;
        }

        for (const [i, name] of m.regions.entries())
        {
            if (!isRegionName(name))
            {
                issues.push(typeIssue(
                    `regions[${i}]`,
                    "a region name of the form \"component:region\"",
                    name));
            }
            else if (!name.startsWith(`${m.name}:`))
            {
                issues.push(issue(
                    `regions[${i}]`,
                    `Region "${name}" is not namespaced to this component.`,
                    `Name it "${m.name}:<region>", so an anchor cannot `
                    + "address another component's region by accident."));
            }
        }
    }

    if (m.conformance === "surface" && m.stateKeys.length === 0)
    {
        issues.push(issue(
            "stateKeys",
            "A surface-conformant component declares no state keys, so the "
            + "canvas cannot restore it after virtualizing it.",
            "Declare the keys getState() returns, or lower conformance to "
            + "\"display\"."));
    }
}

/** UAX #31 identifier, the A2UI v1.0 rule for names (spec §5.1). */
const UAX31 = /^[\p{XID_Start}_][\p{XID_Continue}]*$/u;

/**
 * Validates the optional agent-protocol declarations (ADR-219).
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validateProtocol(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    if (m.protocol === undefined)
    {
        return;
    }

    if (!isObject(m.protocol))
    {
        issues.push(typeIssue("protocol", "an object of protocol declarations", m.protocol));
        return;
    }

    const p = m.protocol;

    if (p.name !== undefined && !(isNonEmptyString(p.name) && UAX31.test(p.name)))
    {
        issues.push(typeIssue("protocol.name", "a UAX #31 identifier such as \"DataGrid\"", p.name));
    }

    unknownKeys("protocol", p, PROTOCOL_KEYS, issues);
    validateProviderMap(p.providers, issues);
    validateStringMap("protocol.hostOnly", p.hostOnly, "a reason string", issues);
    validateSchemaMap(p.schemas, issues);
    validateChange(p.change, issues);
    validateStringMap("protocol.hostOnlyActions", p.hostOnlyActions, "a reason string", issues);
}

/** The keys `protocol` may carry. */
const PROTOCOL_KEYS: readonly string[] = ["name", "providers", "hostOnly", "schemas", "change", "hostOnlyActions"];

/** The keys `agent` carries (ADR-222). */
const AGENT_KEYS: readonly string[] = ["useWhen", "avoidWhen"];

/**
 * Validates `protocol.change`: exactly one of the three ChangeSpec forms
 * (ADR-222). Whether the form fits the types is the generator's check.
 */
function validateChange(v: unknown, issues: ValidationIssue[]): void
{
    if (v === undefined || v === "event")
    {
        return;
    }

    const expected = "\"event\", { valueFrom: \"<property>\" } or { cleared: null }";

    if (!isObject(v) || Object.keys(v).length !== 1)
    {
        issues.push(typeIssue("protocol.change", expected, v));
        return;
    }

    if ("valueFrom" in v)
    {
        if (!isNonEmptyString(v.valueFrom))
        {
            issues.push(typeIssue("protocol.change.valueFrom", "a property name of the onChange payload", v.valueFrom));
        }

        return;
    }

    if (v.cleared !== null)
    {
        issues.push(typeIssue("protocol.change", expected, v));
    }
}

/**
 * Validates `agent`: exactly useWhen and avoidWhen, both non-empty strings
 * (ADR-222). Length and content rules belong to the generator, which can
 * see the catalog an avoidWhen must name a component from.
 */
function validateAgent(m: Record<string, unknown>, issues: ValidationIssue[]): void
{
    if (m.agent === undefined)
    {
        return;
    }

    if (!isObject(m.agent))
    {
        issues.push(typeIssue("agent", "an object with useWhen and avoidWhen", m.agent));
        return;
    }

    const agent = m.agent;

    unknownKeys("agent", agent, AGENT_KEYS, issues);

    for (const key of AGENT_KEYS.filter((k) => !isNonEmptyString(agent[k])))
    {
        issues.push(typeIssue(`agent.${key}`, "a non-empty sentence", agent[key]));
    }
}

/** The keys a provider spec may carry; every catalog name derives from `request`. */
const PROVIDER_KEYS: readonly string[] = ["request"];

/**
 * Reports every key of `obj` outside `allowed`. The generator derives all
 * catalog names (spec §5.4), so a key it does not read, such as a removed
 * `bindAs` or a provider's old `params`, would otherwise pass silently.
 */
function unknownKeys(
    path: string,
    obj: Record<string, unknown>,
    allowed: readonly string[],
    issues: ValidationIssue[]): void
{
    for (const key of Object.keys(obj).filter((k) => !allowed.includes(k)))
    {
        issues.push(issue(
            `${path}.${key}`,
            `"${key}" is not a ${path} key; nothing reads it, so it would be ignored silently.`,
            `Remove it. ${path} takes only ${allowed.join(", ")}.`));
    }
}

/**
 * Validates `protocol.providers`: every entry names its request and nothing
 * else.
 */
function validateProviderMap(v: unknown, issues: ValidationIssue[]): void
{
    if (v === undefined)
    {
        return;
    }

    if (!isObject(v))
    {
        issues.push(typeIssue("protocol.providers", "an object keyed by option name", v));
        return;
    }

    for (const [option, spec] of Object.entries(v))
    {
        const request = isObject(spec) ? spec.request : undefined;

        if (!(isNonEmptyString(request) && UAX31.test(request)))
        {
            issues.push(typeIssue(`protocol.providers.${option}.request`, "a UAX #31 identifier", request));
        }

        if (isObject(spec))
        {
            unknownKeys(`protocol.providers.${option}`, spec, PROVIDER_KEYS, issues);
        }
    }
}

/** Validates a map whose values must be non-empty strings. */
function validateStringMap(
    path: string,
    v: unknown,
    expected: string,
    issues: ValidationIssue[]): void
{
    if (v === undefined)
    {
        return;
    }

    if (!isObject(v))
    {
        issues.push(typeIssue(path, "an object", v));
        return;
    }

    for (const [key, value] of Object.entries(v))
    {
        if (!isNonEmptyString(value))
        {
            issues.push(typeIssue(`${path}.${key}`, expected, value));
        }
    }
}

/** Validates `protocol.schemas`: every value is a JSON Schema object. */
function validateSchemaMap(v: unknown, issues: ValidationIssue[]): void
{
    if (v === undefined)
    {
        return;
    }

    if (!isObject(v))
    {
        issues.push(typeIssue("protocol.schemas", "an object keyed by option name", v));
        return;
    }

    for (const [key, value] of Object.entries(v))
    {
        if (!isObject(value))
        {
            issues.push(typeIssue(`protocol.schemas.${key}`, "a JSON Schema object", value));
        }
    }
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers a component, adding it to the mount allowlist.
 *
 * @param m - The manifest to register. Replaces any manifest of the same name.
 * @throws Error when the manifest fails validation.
 */
export function registerComponent(m: CapabilityManifest): void
{
    const res = validateManifest(m);

    if (!res.ok)
    {
        throw new Error(formatIssues(res, `capability manifest "${m?.name}"`));
    }

    registry.set(m.name, m);
}

/**
 * Registers a batch of components.
 *
 * @param manifests - The manifests to register.
 * @throws Error on the first manifest that fails validation.
 */
export function registerComponents(
    manifests: readonly CapabilityManifest[]): void
{
    for (const m of manifests)
    {
        registerComponent(m);
    }
}

/**
 * Looks up a registered manifest.
 *
 * @param name - Component name.
 * @returns The manifest, or null when it is not registered.
 */
export function getManifest(name: string): CapabilityManifest | null
{
    return registry.get(name) ?? null;
}

/**
 * Returns every registered manifest, sorted by name so that any consumer
 * iterating the registry behaves deterministically.
 *
 * @returns The manifests, ascending by name.
 */
export function getAllManifests(): readonly CapabilityManifest[]
{
    return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Reports whether a component is on the allowlist.
 *
 * @param name - Component name.
 * @returns True when registered.
 */
export function isRegistered(name: string): boolean
{
    return registry.has(name);
}

/** Empties the registry. Intended for tests and host re-initialisation. */
export function clearRegistry(): void
{
    registry.clear();
}

// ============================================================================
// ALLOWLIST RESOLUTION (SECURITY BOUNDARY)
// ============================================================================

/**
 * Resolves a component name to its factory name, allowlist-only.
 *
 * @param component - Component name from a scene document.
 * @returns The registered factory name.
 * @throws Error naming the component and how to register it.
 */
export function resolveFactory(component: string): string
{
    const manifest = registry.get(component);

    if (!manifest)
    {
        throw new Error(
            `${LOG_PREFIX} Component "${component}" is not registered, so it `
            + "cannot be mounted. Register it with registerComponent(manifest) "
            + "before loading a document that references it. Components are "
            + "resolved against the registry only — a matching global is never "
            + "searched for.");
    }

    return manifest.factory;
}

/**
 * Resolves a component to its callable factory.
 *
 * (CRITICAL) Reads exactly one property from the supplied scope — the factory
 * named by a registered manifest. The scope is never enumerated or searched,
 * so an unregistered component name cannot reach any global, however closely
 * it resembles one that exists.
 *
 * @param component - Component name from a scene document.
 * @param scope     - Global scope to read from, typically `window`.
 * @returns The factory function.
 * @throws Error when the component is unregistered or the factory is missing.
 */
export function lookupFactory(
    component: string,
    scope: Record<string, unknown>): (...args: unknown[]) => unknown
{
    const factoryName = resolveFactory(component);
    const candidate = scope[factoryName];

    if (typeof candidate !== "function")
    {
        throw new Error(
            `${LOG_PREFIX} Component "${component}" is registered against `
            + `factory "${factoryName}", but no such function is loaded. Add `
            + `the component's script tag, or correct the factory name in its `
            + "manifest.");
    }

    return candidate as (...args: unknown[]) => unknown;
}
