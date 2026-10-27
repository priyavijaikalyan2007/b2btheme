/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Types
 * 📜 PURPOSE: Shapes shared by the playground's host, UI and agent (#30).
 * 🔗 RELATES: [[A2uiPlayground]], [[AgentUiMessageChecker]]
 * ----------------------------------------------------------------------------
 */

export const A2UI_VERSION = "v0.9.1";
export const CATALOG_ID = "https://static.outcrop.us/a2ui/catalog/v1.json";

/** One checker finding (scripts/agentui/a2ui-check.mjs). */
export interface Finding
{
    readonly index: number | null;
    readonly path: string;
    readonly layer: "schema" | "web_core" | "references";
    readonly message: string;
    readonly disagreement?: string;
}

/** A client-to-server `action` message, exactly as an agent receives it. */
export interface A2uiActionMessage
{
    readonly version: typeof A2UI_VERSION;
    readonly action: Readonly<Record<string, unknown>>;
}

/** A client-to-server `error` message, exactly as an agent receives it. */
export interface A2uiErrorMessage
{
    readonly version: typeof A2UI_VERSION;
    readonly error: Readonly<Record<string, unknown>>;
}

/** What applying one batch of server-to-client messages did. */
export interface ApplyResult
{
    /** False when the schema layer rejected the batch: then nothing was applied. */
    readonly applied: boolean;
    readonly findings: readonly Finding[];
    /** Errors raised while the batch was applied, as A2UI error messages. */
    readonly errors: readonly A2uiErrorMessage[];
}

/** The checker's schema layer, bound to its validators. */
export type CheckSchema = (messages: readonly unknown[]) => Finding[];
