/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 43cabdaf-ce34-4a7f-9c1f-0a201cee001e
 * Created: 2026-11-12
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / BasicRefs
 * 📜 PURPOSE: Copy the basic catalog's definitions into our catalog where it
 *    $refs them, before web_core loads it.
 * 🔗 RELATES: [[A2uiAdapter]], [[AgentUiMessageChecker]]
 * ⚡ FLOW: [our catalog JSON + the vendored basic catalog] -> [inlineBasicRefs] -> [Catalog.fromJson]
 * ----------------------------------------------------------------------------
 *
 * WHY THIS EXISTS
 * ---------------
 * Our published catalog re-exports Google's basic components, and shares
 * its CatalogComponentCommon and theme, by $ref into the basic catalog.
 * web_core 0.14 resolved those through withPeerCatalogs. 0.15 removed it
 * (a2ui-project/a2ui#3575): a cross-catalog $ref then loads as an empty
 * object, so every component rejects every prop. Upstream's migration is to
 * copy the referenced definitions in, which this does in memory.
 *
 * The definitions come from the document our $refs name: the v0.9.1 basic
 * catalog, vendored. Not from the host's basicCatalog: a renderer's copy,
 * such as @a2ui/lit's, is not that document (it has no theme definition).
 * Plain ESM with no Node APIs: the adapter bundle and the message checker
 * both import this one module, so they link the catalog the same way
 * (link-parity.test.ts).
 */

// @semantic-marker a2ui-adapter-basic-refs

import BASIC_CATALOG from "../../scripts/agentui/vendor/a2ui-v0_9_1/catalogs/basic/catalog.json" with { type: "json" };

/** The prefix of every $ref into the basic catalog. */
export const BASIC_CATALOG_REF = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json#";

/**
 * A copy of our catalog with every $ref into the basic catalog replaced by
 * the definition it names. The input is not changed.
 *
 * @param {object} catalogJson - Our published catalog.
 * @returns {object} A catalog with no $ref into the basic catalog.
 * @throws As inlineRefsFrom.
 */
export function inlineBasicRefs(catalogJson)
{
    return inlineRefsFrom(catalogJson, BASIC_CATALOG);
}

/**
 * inlineBasicRefs against a given basic catalog document.
 *
 * @param {object} catalogJson - Our published catalog.
 * @param {object} basicJson   - A basic catalog document.
 * @returns {object} A catalog with no $ref into the basic catalog.
 * @throws When a $ref names a definition the basic catalog lacks, has keys
 *         beside it, or brings a local $ref our catalog cannot resolve.
 */
export function inlineRefsFrom(catalogJson, basicJson)
{
    const linked = copyInlining(catalogJson, basicJson);

    for (const ref of localRefs(linked))
    {
        if (resolvePointer(linked, ref.slice(1)) === undefined)
        {
            throw new Error(`inlineBasicRefs: an inlined basic definition refers to ${ref}, which our catalog `
                + "does not define. Copy that definition into our catalog as well.");
        }
    }

    return linked;
}

/** A deep copy of value, with each basic-catalog $ref object replaced by its definition. */
function copyInlining(value, basicJson)
{
    if (Array.isArray(value)) { return value.map((item) => copyInlining(item, basicJson)); }

    if (value === null || typeof value !== "object") { return value; }

    if (typeof value.$ref === "string" && value.$ref.startsWith(BASIC_CATALOG_REF))
    {
        return basicDefinition(value, basicJson);
    }

    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copyInlining(child, basicJson)]));
}

/** A copy of the basic definition one $ref object names. */
function basicDefinition(refObject, basicJson)
{
    const pointer = refObject.$ref.slice(BASIC_CATALOG_REF.length);
    const extra = Object.keys(refObject).filter((key) => key !== "$ref");

    if (extra.length > 0)
    {
        throw new Error(`inlineBasicRefs: ${extra.join(", ")} beside a basic-catalog $ref to ${pointer} would be `
            + "lost. Move them into a separate allOf member.");
    }

    const definition = resolvePointer(basicJson, pointer);

    if (definition === undefined)
    {
        throw new Error(`inlineBasicRefs: our catalog refers to ${pointer}, which the basic catalog does not `
            + "define. The catalog and the vendored basic catalog must be the same A2UI version.");
    }

    return structuredClone(definition);
}

/** The JSON Pointer target in root, or undefined. */
function resolvePointer(root, pointer)
{
    return pointer.split("/").slice(1)
        .map((token) => token.replace(/~1/g, "/").replace(/~0/g, "~"))
        .reduce((node, token) => (node !== null && typeof node === "object" ? node[token] : undefined), root);
}

/** Every local ("#/...") $ref in value. */
function localRefs(value)
{
    if (Array.isArray(value)) { return value.flatMap(localRefs); }

    if (value === null || typeof value !== "object") { return []; }

    return Object.entries(value).flatMap(([key, child]) =>
        (key === "$ref" && typeof child === "string" && child.startsWith("#/") ? [child] : localRefs(child)));
}
