/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiDefAliases
 * 📜 PURPOSE: Keep the catalog's published $defs names when the TypeScript
 *    names under them change (#74). A $defs key is "<Component>__<name>",
 *    and typia derives <name> from the TypeScript type. Renaming an options
 *    type, or a typia upgrade that spells a name differently, would remove
 *    the published key and add a new one. That breaks every host that
 *    validates against the old one, so it would need a new catalog major.
 * 🔗 RELATES: [[AgentUiCatalog]], [[AgentUiCatalogDiff]]
 * ⚡ FLOW: [typia $defs] -> [relocateDefs] -> [DEF_ALIASES lookup]
 *          -> [published $defs key]
 *
 * HOW TO USE IT
 * -------------
 * When the build reports "$defs.<Old> removed" and "$defs.<New> added" for
 * the same type, add "<New>": "<Old>" here. The catalog then keeps <Old>,
 * and nothing a host sees changes. Both keys keep the same "<Component>__"
 * prefix. The build fails an alias that no generated key uses, so a stale
 * entry cannot linger.
 */

/**
 * Generated $defs key → the published key it keeps.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const DEF_ALIASES = Object.freeze({});
