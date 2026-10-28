/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 76418b3b-ceef-4a50-9dde-b46190a867cb
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / PublicTypes
 * 📜 PURPOSE: The types published as /a2ui/adapter/v1.d.ts for hosts. They
 *    name no @a2ui type, so a host needs nothing beyond its own web_core.
 *    Usage: docs/A2UI_INTEGRATION_GUIDE.md.
 * 🔗 RELATES: [[A2uiAdapter]]
 * ⚡ FLOW: [host TypeScript] -> [v1.d.ts] -> [createOutcropCatalog]
 * ----------------------------------------------------------------------------
 */

/** The A2UI error codes the adapter sends through the surface. */
export type OutcropErrorCode =
    | "VALIDATION_FAILED"
    | "OUTCROP_BINDING_LOST"
    | "OUTCROP_ASSET_LOAD_FAILED"
    | "OUTCROP_MOUNT_FAILED"
    | "OUTCROP_PROVIDER_TIMEOUT";

/** The members of @a2ui/web_core (0.14.x) the adapter needs. */
export interface OutcropWebCore
{
    /** `Catalog` from '@a2ui/web_core/v0_9'. */
    readonly Catalog: unknown;
    /** `basicCatalog` from '@a2ui/web_core/v0_9/basic_catalog', or the renderer's own basic catalog. */
    readonly basicCatalog: unknown;
    /** `BASIC_FUNCTIONS` from '@a2ui/web_core/v0_9/basic_catalog'. */
    readonly BASIC_FUNCTIONS: unknown;
}

/** createOutcropCatalog's options. All are page-global: every call on a page must match. */
export interface OutcropCatalogOptions
{
    /** Where the library's dist/ tree is served, e.g. "https://static.outcrop.us". No trailing slash. */
    readonly assetBaseUrl: string;
    /** Also load <assetBaseUrl>/css/custom.css, which restyles the whole page (it is Bootstrap). Default false. */
    readonly injectBaseTheme?: boolean;
    /**
     * How long a component's data request waits for the agent's answer, in
     * milliseconds; then OUTCROP_PROVIDER_TIMEOUT. A positive integer. Default 30000.
     */
    readonly providerTimeoutMs?: number;
}

/** The A2UI catalog this bundle serves (https://static.outcrop.us/a2ui/catalog/v1.json), parsed. */
export declare const catalogJson: Readonly<Record<string, unknown>>;

/**
 * Builds the A2UI catalog of outcrop components for a MessageProcessor.
 * Pass your web_core Catalog type as C to type the result.
 */
export declare function createOutcropCatalog<C = unknown>(webCore: OutcropWebCore, options: OutcropCatalogOptions): C;
