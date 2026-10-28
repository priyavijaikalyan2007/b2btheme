/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiAdapterDescriptors
 * 📜 PURPOSE: Derive one A2UI adapter descriptor per catalog component from
 *    its manifest and resolved surface (spec §3). Nothing is hand-written, so
 *    a newly classified component is supported with no adapter change. Gate
 *    G1 (actions and providers the adapter cannot serve yet) and tag
 *    collisions are literate problems.
 * 🔗 RELATES: [[AgentUiResolver]], [[AgentUiCatalog]], [[A2uiAdapter]]
 * ⚡ FLOW: [ready components + catalog] -> [buildDescriptors]
 *          -> [descriptors + problems]
 */

import { catalogName } from "./catalog.mjs";

export const TAG_PREFIX = "outcrop-";

const ACTIONS_ISSUE = "#31";

/**
 * The custom element tag for a catalog name (spec §3.3).
 *
 * @param name - Catalog name, e.g. "StickyNote".
 * @returns e.g. "outcrop-sticky-note".
 */
export function tagFor(name)
{
    const kebab = name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2");

    return `${TAG_PREFIX}${kebab.toLowerCase()}`;
}

/**
 * One update route per data prop, by the single rule in spec §3.2: an accepts
 * slot, else a state key, else `value` on a two-way component, else create.
 *
 * @param manifest - The capability manifest.
 * @param surface  - resolveSurface output.
 * @returns { [prop]: PropRoute }.
 */
export function routesFor(manifest, surface)
{
    const slots = new Map(manifest.accepts.map((a) => [a.name, a]));
    const stateKeys = new Set(manifest.stateKeys ?? []);

    return Object.fromEntries(surface.dataProps.map(({ name }) => [name, routeFor(name, slots, stateKeys, surface.twoWayValue)]));
}

function routeFor(name, slots, stateKeys, twoWay)
{
    if (slots.has(name))
    {
        const setter = slots.get(name).setter;
        return setter ? { route: "slot", slot: name, setter } : { route: "slot", slot: name };
    }

    if (stateKeys.has(name)) { return { route: "state", key: name }; }

    if (name === "value" && twoWay) { return { route: "value" }; }

    return { route: "create" };
}

/**
 * Descriptors for every catalog component, with G1 and tag-collision problems.
 *
 * @param ready       - [{ manifest, surface }] for the components in the catalog.
 * @param catalog     - The built catalog (for date-time literal arms).
 * @param assetExists - (distRelativePath) => boolean.
 * @returns { descriptors, problems }.
 */
// @entrypoint
export function buildDescriptors(ready, catalog, assetExists)
{
    const problems = ready.flatMap(({ manifest, surface }) => unsupported(catalogName(manifest), surface));
    const descriptors = ready.map((c) => descriptorFor(c, catalog, assetExists));

    return { descriptors, problems: [...problems, ...tagCollisions(descriptors)] };
}

/** Gate G1: catalog action props the adapter could never fire. */
function unsupported(name, surface)
{
    const found = [
        ["actions", surface.actions.map((a) => a.id)],
        ["providers", surface.providers.map((p) => p.request)],
    ].filter(([, ids]) => ids.length > 0);

    return found.map(([kind, ids]) => `${name} declares ${kind} [${ids.join(", ")}], which the A2UI adapter does not `
        + `support yet, so its catalog action props would never fire. Support lands with ${ACTIONS_ISSUE}; until then keep `
        + "the component on PENDING_CLASSIFICATION or remove the declaration, or, for an action an agent cannot act on, "
        + "declare it in protocol.hostOnlyActions with a reason.");
}

function descriptorFor({ manifest, surface }, catalog, assetExists)
{
    const name = catalogName(manifest);
    const changeOption = surface.twoWayValue && !surface.events.some((e) => e.payloadInValue) ? "onChange" : undefined;

    return {
        name, tagName: tagFor(name), factory: manifest.factory,
        factoryStyle: manifest.factoryStyle ?? "container-first",
        ...(manifest.containerOption ? { containerOption: manifest.containerOption } : {}),
        ...(manifest.containerAs ? { containerAs: manifest.containerAs } : {}),
        mountMethod: manifest.mountMethod ?? "auto",
        conformance: manifest.conformance,
        assets: assetsFor(manifest.name, assetExists),
        props: routesFor(manifest, surface),
        twoWay: surface.twoWayValue,
        ...(changeOption ? { changeOption } : {}),
        ...(surface.change ? { change: surface.change } : {}),
        ...(manifest.presentation === "overlay" ? { overlay: { height: manifest.defaultSize.h } } : {}),
        events: surface.events.map(({ channel, option, actionProp, payloadInValue }) => ({ channel, option, actionProp, payloadInValue })),
        dates: datesFor(catalog, name, surface),
    };
}

function assetsFor(dir, assetExists)
{
    const css = `components/${dir}/${dir}.css`;

    return { js: `components/${dir}/${dir}.js`, ...(assetExists(css) ? { css } : {}) };
}

/** Data props whose literal arm is a date-time string (spec §5.5). */
function datesFor(catalog, name, surface)
{
    const props = catalog.components[name].allOf[2].properties;

    return surface.dataProps.map((d) => d.name).filter((p) => props[p]?.anyOf?.[0]?.format === "date-time");
}

function tagCollisions(descriptors)
{
    const byTag = new Map();

    for (const d of descriptors) { byTag.set(d.tagName, [...(byTag.get(d.tagName) ?? []), d.name]); }

    return [...byTag].filter(([, names]) => names.length > 1).map(([tag, names]) =>
        `Catalog names ${names.map((n) => `"${n}"`).join(" and ")} all map to the tag <${tag}>, so only one could be `
        + "registered. Give one of them a distinct protocol.name.");
}
