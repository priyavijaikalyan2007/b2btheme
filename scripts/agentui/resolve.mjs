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
    CHANGE_MISMATCH: "change-mismatch",
});

/** "n/a" is not a reason (spec §3.3). */
export const MIN_REASON_LENGTH = 20;

/** "row-activate" → "RowActivate". */
export function pascal(s)
{
    return s.split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

/**
 * The catalog action prop for a channel (user decision, 2026-10-25). A
 * legacyOption that is "on" + the channel name, compared case-insensitively,
 * is used verbatim, so its casing survives (`bulkchange` + `onBulkChange` →
 * `onBulkChange`). Anything else, or no legacyOption, is "on" +
 * PascalCase(channel) (`selection` + `onSelect` → `onSelection`).
 *
 * @param channel      - The emits channel name.
 * @param legacyOption - The channel's declared legacyOption, if any.
 * @returns The action prop name.
 */
export function actionPropFor(channel, legacyOption)
{
    const matches = typeof legacyOption === "string" && legacyOption.startsWith("on")
        && legacyOption.slice(2).toLowerCase() === channel.toLowerCase();

    return matches ? legacyOption : `on${pascal(channel)}`;
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
    const change = protocol.change ?? null;
    const hasPair = ctx.byName.has("value") && ctx.byName.get("onChange")?.cls === MEMBER_CLASS.FUNCTION;
    const twoWayValue = hasPair && change !== "event";
    const events = resolveEvents(ctx, twoWayValue);
    const providers = resolveProviders(ctx);
    const claimed = claimedNames(ctx, events, twoWayValue);

    checkMultipleClaims(ctx, events, providers, twoWayValue);

    const dataProps = members.filter((m) => !claimed.has(m.name)).flatMap((m) => resolveMember(ctx, m));

    checkDoubleClaims(ctx, claimed);
    checkStaleDeclarations(ctx, members);
    checkValueLevel(ctx, dataProps, twoWayValue);
    checkChange(ctx, change, hasPair, twoWayValue);

    return { name: manifest.name, dataProps, twoWayValue, change: twoWayValue ? change : null, events, providers,
        actions: resolveActions(manifest, protocol), hostOnly: hostOnlyOf(protocol), fixed: fixedOf(ctx),
        violations: ctx.violations };
}

/** Records one violation, with the file the author has to edit. */
export function violate(ctx, member, code, message)
{
    const { name } = ctx.manifest;

    ctx.violations.push({ component: name, member, code,
        message: `${name}.${member}: ${message} (components/${name}/${name}.manifest.ts)` });
}

/**
 * One event per emits channel, named by actionPropFor. A two-way field's
 * onChange channel carries its payload in `value` (payloadInValue), so
 * nothing is written under eventData for it.
 */
function resolveEvents(ctx, twoWayValue)
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
            actionProp: actionPropFor(c.name, c.legacyOption),
            payload: c.payload,
            multi: c.multi,
            payloadInValue: twoWayValue && option === "onChange",
        };
    });
}

/** Providers that name a one-parameter function member: on<Request> and <request>Result. */
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
                + `takes exactly one, which the component writes to <eventData path>/${spec.request}. Declare it `
                + "in protocol.hostOnly instead, or give the component an additive single-object variant.");
            return [];
        }

        // required (ADR-234): the catalog requires on<Request>, <request>Result and eventData.
        return [{ option, request: spec.request, actionProp: `on${pascal(spec.request)}`,
            response: `${spec.request}Result`, ...(spec.required === true ? { required: true } : {}) }];
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
        ...Object.keys(fixedOf(ctx)),
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

    // One callback in two roles (user decision, 2026-10-25): an onChange that
    // an emits channel already names IS the write-back, so its event claim
    // subsumes the two-way claim instead of doubling it.
    if (twoWayValue && !claims.has("onChange"))
    {
        claims.set("onChange", 1);
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

/** A hostOnly entry that also names an event, provider, write-back or fixed member. */
function checkDoubleClaims(ctx, claimed)
{
    for (const key of Object.keys(ctx.protocol.hostOnly ?? {}).filter((k) => claimed.has(k)))
    {
        violate(ctx, key, VIOLATION.DOUBLE_CLASSIFIED, "is declared host-only and is also an event, provider, "
            + "value write-back or fixed option. Remove one of the two declarations.");
    }
}

/** Keys that name nothing, and reasons too short to be reasons. */
function checkStaleDeclarations(ctx, members)
{
    const { protocol } = ctx;
    const isMember = (k) => ctx.byName.has(k);
    const isPath = (k) => members.some((m) => m.hazards.some((h) => isCovered(h.path, { [k]: "" })));
    // A nested path to a plain field (items[].href) is removed from the schema by the generator, which
    // fails the build when the path names nothing there (ADR-230); here its root must be a data member.
    const isNestedData = (k) => /[.[]/.test(k) && ctx.byName.get(k.split(/[.[]/)[0])?.cls === MEMBER_CLASS.DATA;

    staleKeys(ctx, protocol.hostOnly, (k) => isMember(k) || isPath(k) || isNestedData(k), "protocol.hostOnly");
    staleKeys(ctx, protocol.providers, (k) => ctx.byName.get(k)?.cls === MEMBER_CLASS.FUNCTION, "protocol.providers");
    staleKeys(ctx, protocol.schemas, isMember, "protocol.schemas");
    staleKeys(ctx, protocol.fixed, (k) => ctx.byName.get(k)?.cls === MEMBER_CLASS.DATA, "protocol.fixed",
        "the options type's data members");
    staleKeys(ctx, protocol.hostOnlyActions, (k) => ctx.manifest.actions.some((a) => a.id === k),
        "protocol.hostOnlyActions", "the manifest's actions");

    for (const [key, reason] of Object.entries(hostOnlyOf(protocol)).filter(([, r]) => r.length < MIN_REASON_LENGTH))
    {
        violate(ctx, key, VIOLATION.SHORT_REASON, `has the reason "${reason}". Write what the member needs that `
            + `JSON cannot carry, in at least ${MIN_REASON_LENGTH} characters.`);
    }
}

/**
 * The options the adapter always passes (ADR-235): protocol.fixed's entries
 * that name a data member. The rest are reported as stale.
 */
function fixedOf(ctx)
{
    return Object.fromEntries(Object.entries(ctx.protocol.fixed ?? {})
        .filter(([k]) => ctx.byName.get(k)?.cls === MEMBER_CLASS.DATA));
}

/**
 * Every host-only member and action with its reason. Actions are keyed
 * `actions.<id>`, so the report lists them beside members (ADR-222).
 */
function hostOnlyOf(protocol)
{
    const actions = Object.entries(protocol.hostOnlyActions ?? {}).map(([id, reason]) => [`actions.${id}`, reason]);

    return { ...protocol.hostOnly, ...Object.fromEntries(actions) };
}

/** Reports every key of a declaration map that fails the test. */
function staleKeys(ctx, map, isLive, where, what = "the options type")
{
    for (const key of Object.keys(map ?? {}).filter((k) => !isLive(k)))
    {
        violate(ctx, key, VIOLATION.STALE_DECLARATION, `is named in ${where} but matches nothing in ${what}. `
            + "Stale declarations hide renames; remove it or correct the name.");
    }
}

/**
 * A two-way `value` (a `value` data prop beside the ADR-134 `onChange`
 * write-back) requires at least field level (spec §7.1). A read-only `value`,
 * such as a displayed metric, is ordinary data at display.
 */
function checkValueLevel(ctx, dataProps, twoWayValue)
{
    if (ctx.manifest.conformance === "display" && twoWayValue && dataProps.some((d) => d.name === "value"))
    {
        violate(ctx, "value", VIOLATION.VALUE_BELOW_FIELD, "is two-way (it has the onChange write-back), so an "
            + "agent will read the user's changes back, but the manifest declares conformance \"display\". "
            + "Raise it to \"field\" and pass the field checks.");
    }
}

/** How to declare a mapping, appended to every change-mismatch message. */
const CHANGE_FORMS = "Declare protocol.change: { valueFrom: \"<property>\" } when the value is a property of the "
    + "payload, { cleared: null } when the payload is the value or null when the user clears it, or \"event\" when "
    + "onChange is not a value change (value becomes one-way; name onChange in an emits channel).";

/**
 * protocol.change against the classifier's value fit (ADR-222, #39): the
 * adapter writes onChange's (mapped) argument to the path bound to value, so
 * anything that is not assignable to value would reach the agent as data its
 * catalog schema rejects.
 */
function checkChange(ctx, change, hasPair, twoWayValue)
{
    if (change !== null && !hasPair)
    {
        violate(ctx, "change", VIOLATION.STALE_DECLARATION, "protocol.change is declared, but the options do not "
            + "have both `value` and a function `onChange`, so there is nothing to map. Remove it.");
        return;
    }

    if (!twoWayValue) { return; }

    const fit = ctx.byName.get("onChange").valueFit;

    if (fit === undefined)
    {
        throw new Error(`${ctx.manifest.name}: the classifier gave onChange no valueFit, so its write-back cannot `
            + "be checked. Call classifyMembers with the factory's handle type.");
    }

    const problem = changeProblem(change, fit);

    if (problem) { violate(ctx, "onChange", VIOLATION.CHANGE_MISMATCH, `${problem} ${CHANGE_FORMS}`); }
}

/** Why the declared mapping does not fit, or null when it does. */
function changeProblem(change, fit)
{
    if (change === null)
    {
        return fit.direct ? null : `passes ${fit.param}, which is not assignable to value, so the adapter would `
            + "write the wrong type to the path bound to value.";
    }

    if ("valueFrom" in change)
    {
        const fits = fit.fromProperty.length > 0 ? `; ${fit.fromProperty.join(", ")} would fit` : "";

        return fit.fromProperty.includes(change.valueFrom) ? null
            : `has no property "${change.valueFrom}" assignable to value on every arm of ${fit.param}${fits}.`;
    }

    if (!fit.withoutNull) { return `passes ${fit.param}, which is not assignable to value even without null.`; }

    return fit.setValueAcceptsNull ? null : "is declared { cleared: null }, but the handle's setValue does not "
        + "accept null, so an agent that clears the value could not apply it.";
}

/**
 * One on<Id> action prop per declared manifest action. An action whose id
 * equals a channel name is the same event, so the channel's action stands
 * for both and no separate entry is made. A host-only action (ADR-222) gets none.
 */
function resolveActions(manifest, protocol)
{
    const channels = new Set(manifest.emits.map((c) => c.name));
    const hostOnly = protocol.hostOnlyActions ?? {};

    return manifest.actions.filter((a) => !channels.has(a.id) && hostOnly[a.id] === undefined)
        .map((a) => ({ id: a.id, label: a.label, actionProp: `on${pascal(a.id)}` }));
}
