/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiReferenceAgent / Redact. Provider error text can carry the
 *    key whole or masked (OpenAI echoes it, #30 spec §14.1); neither form
 *    may reach the screen.
 */

import { describe, expect, test } from "vitest";

import { redactKey } from "./redact";

const KEY = "sk-ant-api03-ABCDEFGHIJKLMNOP1234";

describe("redactKey", () =>
{
    test("replaces the whole key", () =>
    {
        expect(redactKey(`bad key ${KEY}.`, KEY)).toBe("bad key [redacted key].");
    });

    test("replaces a prefix followed by asterisks", () =>
    {
        expect(redactKey("Incorrect API key provided: sk-ant-api03-ABCD********. See docs.", KEY))
            .toBe("Incorrect API key provided: [redacted key]. See docs.");
    });

    test("replaces asterisks followed by the key's last four characters", () =>
    {
        expect(redactKey("Incorrect API key provided: sk-************1234", KEY)).not.toContain("1234");
    });

    test("leaves text without the key unchanged", () =>
    {
        expect(redactKey("Rate limited (429).", KEY)).toBe("Rate limited (429).");
    });

    test("an empty key changes nothing", () =>
    {
        expect(redactKey("anything", "")).toBe("anything");
    });
});
