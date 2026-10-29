/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiCatalogSize
 * 📜 PURPOSE: What each catalog costs in an agent's prompt (#49): its compact
 *    JSON in bytes and in tokens, counted with a real tokenizer (o200k_base,
 *    through js-tiktoken). Printed by every build and kept in
 *    agentui-report.json, so each sweep PR can quote it.
 * 🔗 RELATES: [[AgentUiLeanCatalog]], [[AgentUiCatalog]]
 */

import { Tiktoken } from "js-tiktoken/lite";
import o200kBase from "js-tiktoken/ranks/o200k_base";

export const TOKENIZER = "o200k_base";

/**
 * Sizes of JSON documents as a prompt carries them: compact, no indentation.
 *
 * @param docs - Documents keyed by a name for the report.
 * @returns { tokenizer, sizes: { <name>: { bytes, tokens } } }.
 */
export function promptSizes(docs)
{
    const encoder = new Tiktoken(o200kBase);
    const sizes = Object.fromEntries(Object.entries(docs).map(([name, doc]) =>
    {
        const text = JSON.stringify(doc);

        return [name, { bytes: Buffer.byteLength(text), tokens: encoder.encode(text).length }];
    }));

    return { tokenizer: TOKENIZER, sizes };
}
