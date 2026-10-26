/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 355060a8-35bc-43a2-b8c5-99ab38852801
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / Catalog
 * 📜 PURPOSE: createOutcropCatalog's implementation. Loads the embedded
 *    catalog with the host's own web_core, links Google's basic catalog as a
 *    peer, keeps the host's basic implementations, and attaches one
 *    outcrop-* element class per component of ours (spec §7). Element classes
 *    are shared per tag for the page, so a renderer's lazy
 *    customElements.define never sees two constructors for one tag.
 * 🔗 RELATES: [[A2uiAdapter]], [[AgentUiCatalog]]
 * ⚡ FLOW: [embedded catalog + host web_core] -> [createOutcropCatalogFrom]
 *          -> [runtime Catalog for MessageProcessor]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-catalog

import { outcropElementBase, type ElementEnv } from "./element";
import { checkBase } from "./loader";
import type { AdapterDescriptor, Validators } from "./types";

/** What the adapter bundle embeds at build time. */
export interface Embedded
{
    readonly catalogText: string;
    readonly descriptors: readonly AdapterDescriptor[];
    readonly validators: Validators;
}

/** The members of @a2ui/web_core the adapter needs, supplied by the host (spec §7). */
export interface OutcropWebCore
{
    readonly Catalog: unknown;
    readonly basicCatalog: unknown;
    readonly BASIC_FUNCTIONS: unknown;
}

/** createOutcropCatalog's options. */
export interface OutcropCatalogOptions
{
    readonly assetBaseUrl: string;
    readonly injectBaseTheme?: boolean;
}

interface Entry { readonly name: string; readonly [key: string]: unknown }
interface LoadedCatalog
{
    readonly components: ReadonlyMap<string, Entry>;
    withPeerCatalogs(peers: unknown[]): LoadedCatalog;
    withEntries(components: Entry[], functions: unknown): unknown;
}
interface CatalogClass { fromJson(json: unknown): LoadedCatalog }
interface BasicCatalog { readonly components: ReadonlyMap<string, Entry> }

/** The page-global options, fixed by the first call. */
let config: { assetBaseUrl: string; injectBaseTheme: boolean } | undefined;

/** One element class per tag for the life of the page. */
let classes = new Map<string, CustomElementConstructor>();

/**
 * Builds the runtime catalog for MessageProcessor.
 *
 * @param embedded - The catalog, descriptors and validators the bundle carries.
 * @param webCore  - { Catalog, basicCatalog, BASIC_FUNCTIONS } from the host's @a2ui/web_core.
 * @param options  - { assetBaseUrl, injectBaseTheme? }; page-global.
 * @throws When webCore lacks a member, an option is invalid or changes, or a
 *         catalog component has no descriptor.
 */
export function createOutcropCatalogFrom(
    embedded: Embedded, webCore: OutcropWebCore, options: OutcropCatalogOptions): unknown
{
    const { Catalog, basicCatalog } = checkWebCore(webCore);

    fixConfig(options);

    const loaded = Catalog.fromJson(JSON.parse(embedded.catalogText)).withPeerCatalogs([basicCatalog]);
    const byName = new Map(embedded.descriptors.map((d) => [d.name, d]));
    const entries = [...loaded.components.values()].map((api) =>
    {
        const basic = basicCatalog.components.get(api.name);

        return basic ? { ...basic, schema: api.schema } : ourEntry(api, byName.get(api.name), embedded.validators);
    });

    return loaded.withEntries(entries, webCore.BASIC_FUNCTIONS);
}

/**
 * The element class for one descriptor, created once per tag.
 *
 * @param descriptor - The component's descriptor.
 * @param validators - The bundle's compiled validators.
 */
export function elementClassFor(descriptor: AdapterDescriptor, validators: Validators): CustomElementConstructor
{
    const existing = classes.get(descriptor.tagName);

    if (existing) { return existing; }

    const env: ElementEnv = { descriptor, validators, assetBaseUrl: () => current().assetBaseUrl,
        injectBaseTheme: () => current().injectBaseTheme };
    const cls = class extends outcropElementBase() { protected readonly env = env; };

    classes.set(descriptor.tagName, cls);

    return cls;
}

/** Forgets the page-global state. Tests only. */
export function resetCatalogStateForTests(): void
{
    config = undefined;
    classes = new Map();
}

function ourEntry(api: Entry, descriptor: AdapterDescriptor | undefined, validators: Validators): Entry
{
    if (!descriptor)
    {
        throw new Error(`${api.name} has no adapter descriptor, so it could never render. The adapter bundle and its `
            + "catalog are out of step; rebuild both with `npm run build:agentui`.");
    }

    return { ...api, tagName: descriptor.tagName, element: elementClassFor(descriptor, validators) };
}

function checkWebCore(webCore: OutcropWebCore): { Catalog: CatalogClass; basicCatalog: BasicCatalog }
{
    const hint = "Pass { Catalog } from '@a2ui/web_core/v0_9' and { basicCatalog, BASIC_FUNCTIONS } from "
        + "'@a2ui/web_core/v0_9/basic_catalog' (tested with 0.14.0).";
    const catalog: unknown = webCore?.Catalog;
    const basic = webCore?.basicCatalog as Partial<BasicCatalog> | undefined;

    if (typeof catalog !== "function" || typeof (catalog as { fromJson?: unknown }).fromJson !== "function")
    {
        throw new Error(`createOutcropCatalog: webCore.Catalog is missing or not a class with fromJson. ${hint}`);
    }

    if (typeof basic?.components?.get !== "function" || typeof basic.components.has !== "function")
    {
        throw new Error("createOutcropCatalog: webCore.basicCatalog is missing or not a catalog with components. "
            + hint);
    }

    if (!Array.isArray(webCore.BASIC_FUNCTIONS))
    {
        throw new Error(`createOutcropCatalog: webCore.BASIC_FUNCTIONS is missing or not an array. ${hint}`);
    }

    return { Catalog: catalog as unknown as CatalogClass, basicCatalog: basic as BasicCatalog };
}

/** Validates the options and fixes them for the page on the first call. */
function fixConfig(options: OutcropCatalogOptions): void
{
    if (options.injectBaseTheme !== undefined && typeof options.injectBaseTheme !== "boolean")
    {
        throw new Error("createOutcropCatalog: injectBaseTheme must be a boolean, got "
            + `${JSON.stringify(options.injectBaseTheme)}.`);
    }

    checkBase(options.assetBaseUrl);

    const next = { assetBaseUrl: options.assetBaseUrl, injectBaseTheme: options.injectBaseTheme === true };

    if (!config) { config = next; return; }

    for (const key of ["assetBaseUrl", "injectBaseTheme"] as const)
    {
        if (config[key] !== next[key])
        {
            throw new Error(`createOutcropCatalog: ${key} is page-global and was already `
                + `${JSON.stringify(config[key])}; `
                + `this call passed ${JSON.stringify(next[key])}. The outcrop-* element classes are shared per tag, so `
                + "every call on a page must use the same options.");
        }
    }
}

function current(): { assetBaseUrl: string; injectBaseTheme: boolean }
{
    if (!config)
    {
        throw new Error("An outcrop-* element was used before createOutcropCatalog was called. "
            + "Build the catalog first.");
    }

    return config;
}
