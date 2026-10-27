/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiMessageChecker (types)
 * 📜 PURPOSE: Declarations for a2ui-check.mjs, so the TypeScript playground
 *    page and tests can import the plain-ESM checker with types.
 * 🔗 RELATES: [[AgentUiMessageChecker]]
 */

export interface Finding
{
    index: number | null;
    path: string;
    layer: "schema" | "web_core" | "references";
    message: string;
    disagreement?: string;
}

/** An Ajv standalone validate function. */
export type Validate = ((value: unknown) => boolean) & { errors?: unknown[] | null };

export interface MessageValidators
{
    messages: Record<"createSurface" | "updateComponents" | "updateDataModel" | "deleteSurface", Validate>;
    components: Record<string, Validate>;
    functions: Record<string, Validate>;
}

export interface CheckerWebCore
{
    Catalog: unknown;
    MessageProcessor: unknown;
    basicCatalog: unknown;
    BASIC_FUNCTIONS: unknown;
}

export interface CheckerCatalogs
{
    ours: object;
    basic: object;
    commonTypes: object;
}

export interface CheckDeps
{
    validators: MessageValidators;
    webCore: CheckerWebCore;
    catalogJson: object;
    catalogs: CheckerCatalogs;
}

export const MESSAGE_TYPES: readonly string[];
export function checkSchema(messages: readonly unknown[], validators: MessageValidators): Finding[];
export function linkSchemaOnly(catalogJson: object, webCore: Omit<CheckerWebCore, "MessageProcessor">): unknown;
export function dryRun(messages: readonly unknown[], webCore: CheckerWebCore, catalogJson: object): Finding[];
export function referenceProps(catalogs: Pick<CheckerCatalogs, "ours" | "basic">):
    Map<string, { path: string[]; kind: "id" | "childList" }[]>;
export function checkReferences(messages: readonly unknown[], catalogs: Pick<CheckerCatalogs, "ours" | "basic">):
    Finding[];
export function check(messages: readonly unknown[], deps: CheckDeps): { ok: boolean; findings: Finding[] };
export function formatFindings(findings: readonly Finding[]): string;
