/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 1ca02ff9-9edb-4ae6-9dc5-4be49ef59837
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter
 * 📜 PURPOSE: The public entry of /a2ui/adapter/v1.js. Binds the catalog,
 *    descriptors and validators the generator embeds at build time (the
 *    virtual:outcrop/* modules) and exports createOutcropCatalog and
 *    catalogJson (spec §7, §12.2). Nothing here touches the DOM at import.
 * 🔗 RELATES: [[A2uiAdapter]], [[AgentUiGenerator]]
 * ⚡ FLOW: [host imports v1.js] -> [createOutcropCatalog(webCore, options)]
 *          -> [Catalog for MessageProcessor]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker a2ui-adapter-entry
// @entrypoint

import catalogText from "virtual:outcrop/catalog";
import descriptors from "virtual:outcrop/descriptors";
import { validators } from "virtual:outcrop/validators";

import { createOutcropCatalogFrom, type OutcropCatalogOptions, type OutcropWebCore } from "./catalog";

/** The catalog this bundle serves, parsed: for advertising it inline and for [29]. */
export const catalogJson: Readonly<Record<string, unknown>> = JSON.parse(catalogText);

/**
 * Builds the A2UI catalog of outcrop components for a host's MessageProcessor.
 *
 * @param webCore - { Catalog, basicCatalog, BASIC_FUNCTIONS } from the host's own @a2ui/web_core.
 * @param options - assetBaseUrl (required, no trailing slash) and injectBaseTheme
 *                  (default false). Both are page-global.
 * @returns A web_core Catalog: pass it to `new MessageProcessor([catalog], onAction)`.
 */
export function createOutcropCatalog(webCore: OutcropWebCore, options: OutcropCatalogOptions): unknown
{
    return createOutcropCatalogFrom({ catalogText, descriptors, validators }, webCore, options);
}
