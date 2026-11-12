/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: A2uiAdapter / BasicRefs (types)
 * 📜 PURPOSE: Declarations for basic-refs.mjs, so the TypeScript adapter can
 *    import the plain-ESM module with types.
 * 🔗 RELATES: [[A2uiAdapter]]
 */

/** The prefix of every $ref into the basic catalog. */
export const BASIC_CATALOG_REF: string;

/** A copy of our catalog with every $ref into the basic catalog replaced by the definition it names. */
export function inlineBasicRefs(catalogJson: unknown): unknown;

/** inlineBasicRefs against a given basic catalog document. */
export function inlineRefsFrom(catalogJson: unknown, basicJson: unknown): unknown;
