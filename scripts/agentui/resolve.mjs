/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiResolver
 * 📜 PURPOSE: Check the classifier's findings against the manifest's
 *    declarations and produce the protocol surface (spec §3.2–3.3). Every
 *    undeclared hazard, stale key or short reason becomes a literate violation
 *    naming the manifest to edit.
 * 🔗 RELATES: [[AgentUiClassifier]], [[NoFallbackCode]]
 * ⚡ FLOW: [classify.mjs] -> [members] -> [resolveSurface]
 *          -> [surface with violations]
 */

import { MEMBER_CLASS } from "./classify.mjs";

export const VIOLATION = Object.freeze({
    UNCLASSIFIED: "unclassified",
    DOUBLE_CLASSIFIED: "double-classified",
    STALE_DECLARATION: "stale-declaration",
    SHORT_REASON: "short-reason",
    UNDECLARED_MIXED: "undeclared-mixed",
    UNDECLARED_HAZARD: "undeclared-hazard",
    TOO_BROAD: "too-broad",
    MISSING_JSDOC: "missing-jsdoc",
    PROVIDER_ARITY: "provider-arity",
    VALUE_BELOW_FIELD: "value-below-field",
    NAME_INVALID: "name-invalid",
    NAME_COLLISION: "name-collision",
    PROP_COLLISION: "prop-collision",
});

/** "n/a" is not a reason (spec §3.3). */
export const MIN_REASON_LENGTH = 20;

/** "row-activate" → "RowActivate". */
export function pascal(s)
{
    return s.split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

/**
 * Resolves one component's protocol surface (spec §3).
 *
 * @param manifest - The capability manifest.
 * @param members  - MemberReport[] from classify.mjs.
 * @returns The surface, with every violation found.
 */
// @entrypoint
export function resolveSurface(manifest, members)
{
    const protocol = manifest.protocol ?? {};
    const ctx = { manifest, protocol, byName: new Map(members.map((m) => [m.name, m])), violations: [], violated: new Set() };
    const events = resolveEvents(ctx);
    const providers = resolveProviders(ctx);
    const twoWayValue = ctx.byName.has("value") && ctx.byName.get("onChange")?.cls === MEMBER_CLASS.FUNCTION;
    const claimed = claimedNames(ctx, events, twoWayValue);

    checkMultipleClaims(ctx, events, providers, twoWayValue);

    const dataProps = members.filter((m) => !claimed.has(m.name)).flatMap((m) => resolveMember(ctx, m));

    checkDoubleClaims(ctx, claimed);
    checkStaleDeclarations(ctx, members);
    checkValueLevel(ctx, dataProps);

    return { name: manifest.name, dataProps, twoWayValue, events, providers,
        actions: resolveActions(manifest), hostOnly: protocol.hostOnly ?? {}, violations: ctx.violations };
}

/** Records one violation, with the file the author has to edit. */
export function violate(ctx, member, code, message)
{
    const { name } = ctx.manifest;

    ctx.violations.push({ component: name, member, code,
        message: `${name}.${member}: ${message} (components/${name}/${name}.manifest.ts)` });
}

/** One event per emits channel: a bindable prop plus an on<Channel> action. */
function resolveEvents(ctx)
{
    return ctx.manifest.emits.map((c) =>
    {
        let option = null;

        if (c.legacyOption && ctx.byName.has(c.legacyOption))
        {
            const m = ctx.byName.get(c.legacyOption);

            if (m.cls !== MEMBER_CLASS.FUNCTION)
            {
                violate(ctx, c.legacyOption, VIOLATION.DOUBLE_CLASSIFIED,
                    `is named by emits[${c.name}].legacyOption but is ${m.cls}-typed; only a function can be an event. Correct the legacyOption, or the member's type.`);
                ctx.violated.add(c.legacyOption);
            } else
            {
                option = c.legacyOption;
            }
        }

        return {
            channel: c.name,
            option,
            bindProp: ctx.protocol.bindAs?.[c.name] ?? c.name,
            actionProp: `on${pascal(c.name)}`,
            payload: c.payload,
        };
    });
}

/** Providers that name a one-parameter function member. */
function resolveProviders(ctx)
{
    return Object.entries(ctx.protocol.providers ?? {}).flatMap(([option, spec]) =>
    {
        const m = ctx.byName.get(option);

        if (!m || m.cls !== MEMBER_CLASS.FUNCTION)
        {
            return [];   // reported by checkStaleDeclarations
        }

        if (m.arity !== 1)
        {
            violate(ctx, option, VIOLATION.PROVIDER_ARITY, `provider takes ${m.arity} parameters; a provider `
                + `takes exactly one, which becomes the "${spec.params}" prop. Declare it in protocol.hostOnly `
                + "instead, or give the component an additive single-object variant.");
            return [];
        }

        return [{ option, ...spec, actionProp: `on${pascal(spec.request)}` }];
    });
}

/**
 * Members that something other than the data rule has claimed. Every declared
 * provider key that names a function is claimed, even one rejected for its
 * arity, so it is reported once (provider-arity), not twice. Invalid legacyOptions
 * are also claimed so they don't get processed as unclaimed members.
 */
function claimedNames(ctx, events, twoWayValue)
{
    const { manifest } = ctx;
    const implicit = manifest.factoryStyle === "options-only" ? [manifest.containerOption ?? "container"] : [];
    const providerKeys = Object.keys(ctx.protocol.providers ?? {})
        .filter((k) => ctx.byName.get(k)?.cls === MEMBER_CLASS.FUNCTION);

    return new Set([
        ...events.map((e) => e.option).filter(Boolean),
        ...Array.from(ctx.violated),
        ...providerKeys,
        ...(twoWayValue ? ["onChange"] : []),
        ...implicit,
    ]);
}

/** Detects a name claimed by multiple categories. Spec §3.1: every option in exactly one. */
function checkMultipleClaims(ctx, events, providers, twoWayValue)
{
    const { manifest } = ctx;
    const claims = new Map();

    for (const e of events.filter((e) => e.option))
    {
        const key = e.option;
        claims.set(key, (claims.get(key) ?? 0) + 1);
    }

    for (const p of providers)
    {
        const key = p.option;
        claims.set(key, (claims.get(key) ?? 0) + 1);
    }

    if (twoWayValue)
    {
        claims.set("onChange", (claims.get("onChange") ?? 0) + 1);
    }

    if (manifest.factoryStyle === "options-only")
    {
        const containerName = manifest.containerOption ?? "container";
        claims.set(containerName, (claims.get(containerName) ?? 0) + 1);
    }

    for (const [name, count] of claims)
    {
        if (count > 1)
        {
            violate(ctx, name, VIOLATION.DOUBLE_CLASSIFIED,
                `is claimed by ${count} different sources (events, providers, two-way value, or implicit). Each option must belong to exactly one category.`);
        }
    }
}

/** Resolves an unclaimed member: data prop, host-only, or a violation. */
function resolveMember(ctx, m)
{
    const declared = ctx.protocol.hostOnly?.[m.name] !== undefined;

    if (declared && m.mixedArms.length === 0) { return []; }

    if (m.cls === MEMBER_CLASS.FUNCTION || m.cls === MEMBER_CLASS.ELEMENT)
    {
        violate(ctx, m.name, VIOLATION.UNCLASSIFIED, `is ${m.cls}-typed and unclassified. Over A2UI or MCP it `
            + "would vanish without a trace. Name it in an emits[].legacyOption, protocol.providers, or "
            + "protocol.hostOnly with a reason.");
        return [];
    }

    if (m.cls === MEMBER_CLASS.TOO_BROAD && ctx.protocol.schemas?.[m.name] === undefined)
    {
        violate(ctx, m.name, VIOLATION.TOO_BROAD, "is typed too broadly to describe (unknown, any, object or an "
            + "open record). Give it a JSON Schema in protocol.schemas, or declare it in protocol.hostOnly.");
        return [];
    }

    return checkDataMember(ctx, m, declared) ? [m] : [];
}

/** Mixed arms, nested hazards and JSDoc for a data member. True when clean. */
function checkDataMember(ctx, m, declared)
{
    const before = ctx.violations.length;

    if (m.mixedArms.length > 0 && !declared)
    {
        violate(ctx, m.name, VIOLATION.UNDECLARED_MIXED, `mixes data with ${m.mixedArms.join(" and ")}. Only the `
            + "data arms cross the protocol; say so with a protocol.hostOnly entry for this member.");
    }

    for (const h of m.hazards.filter((h) => !isCovered(h.path, ctx.protocol.hostOnly)))
    {
        violate(ctx, m.name, VIOLATION.UNDECLARED_HAZARD, `contains a ${h.cls} at ${h.path}. Every schema tool `
            + `drops such parts silently, so declare "${h.path}" (or a parent path) in protocol.hostOnly.`);
    }

    if (m.jsdoc === "")
    {
        violate(ctx, m.name, VIOLATION.MISSING_JSDOC, "has no JSDoc. Its description is what the agent reads; "
            + "add a /** … */ comment on its own line above the member in the options interface.");
    }

    return ctx.violations.length === before;
}

/** True when a hostOnly key equals the path or is a parent of it. */
export function isCovered(path, hostOnly = {})
{
    return Object.keys(hostOnly).some((k) => path === k || path.startsWith(`${k}.`) || path.startsWith(`${k}[`));
}

/** A hostOnly entry that also names an event, provider or write-back member. */
function checkDoubleClaims(ctx, claimed)
{
    for (const key of Object.keys(ctx.protocol.hostOnly ?? {}).filter((k) => claimed.has(k)))
    {
        violate(ctx, key, VIOLATION.DOUBLE_CLASSIFIED, "is declared host-only and is also an event, provider or "
            + "value write-back. Remove one of the two declarations.");
    }
}

/** Keys that name nothing, and reasons too short to be reasons. */
function checkStaleDeclarations(ctx, members)
{
    const { protocol } = ctx;
    const isMember = (k) => ctx.byName.has(k);
    const isPath = (k) => members.some((m) => m.hazards.some((h) => isCovered(h.path, { [k]: "" })));
    const channels = new Set(ctx.manifest.emits.map((e) => e.name));

    staleKeys(ctx, protocol.hostOnly, (k) => isMember(k) || isPath(k), "protocol.hostOnly");
    staleKeys(ctx, protocol.providers, (k) => ctx.byName.get(k)?.cls === MEMBER_CLASS.FUNCTION, "protocol.providers");
    staleKeys(ctx, protocol.schemas, isMember, "protocol.schemas");
    staleKeys(ctx, protocol.bindAs, (k) => channels.has(k), "protocol.bindAs");

    for (const [key, reason] of Object.entries(protocol.hostOnly ?? {}).filter(([, r]) => r.length < MIN_REASON_LENGTH))
    {
        violate(ctx, key, VIOLATION.SHORT_REASON, `has the reason "${reason}". Write what the member needs that `
            + `JSON cannot carry, in at least ${MIN_REASON_LENGTH} characters.`);
    }
}

/** Reports every key of a declaration map that fails the test. */
function staleKeys(ctx, map, isLive, where)
{
    for (const key of Object.keys(map ?? {}).filter((k) => !isLive(k)))
    {
        violate(ctx, key, VIOLATION.STALE_DECLARATION, `is named in ${where} but matches nothing in the options `
            + "type. Stale declarations hide renames; remove it or correct the name.");
    }
}

/** A `value` data prop requires at least field level (spec §7.1). */
function checkValueLevel(ctx, dataProps)
{
    if (ctx.manifest.conformance === "display" && dataProps.some((d) => d.name === "value"))
    {
        violate(ctx, "value", VIOLATION.VALUE_BELOW_FIELD, "is a data prop, so an agent will read it back, but the "
            + "manifest declares conformance \"display\". Raise it to \"field\" and pass the field checks.");
    }
}

/** One on<Id> action prop per declared manifest action. */
function resolveActions(manifest)
{
    return manifest.actions.map((a) => ({ id: a.id, label: a.label, actionProp: `on${pascal(a.id)}` }));
}
