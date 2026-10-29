/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiCatalogSize. Bytes and o200k_base tokens of compact JSON. #49.
 */

import { expect, test } from "vitest";

import { promptSizes } from "./catalog-size.mjs";

test("counts the compact JSON's UTF-8 bytes and its o200k_base tokens", () =>
{
    // The JSON text is quoted: "hello world" is 13 bytes, " | hello | world | " 4 tokens; "é" is 4 bytes, 3 tokens.
    expect(promptSizes({ greeting: "hello world", accent: "é" })).toEqual({ tokenizer: "o200k_base", sizes: {
        greeting: { bytes: 13, tokens: 4 }, accent: { bytes: 4, tokens: 3 } } });
});
