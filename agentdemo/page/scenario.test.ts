/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiPlayground / Scenario. The saved-session format (#30 spec
 *    §7.1, §7.2): a header line, then one event per line. A live scenario
 *    names its provider, model and date; every error names its line.
 */

import { describe, expect, test } from "vitest";

import { parseScenario, serializeScenario } from "./scenario";

const HEADER = { kind: "header", title: "t", provenance: "scripted" };
const lines = (...l: unknown[]) => l.map((x) => JSON.stringify(x)).join("\n");

describe("parseScenario", () =>
{
    test("reads the header and the events in order", () =>
    {
        const s = parseScenario(lines(HEADER, { kind: "user", text: "hi" }, { kind: "a2ui", message: { a: 1 } },
            { kind: "say", text: "ok" }));

        expect(s.header).toEqual(HEADER);
        expect(s.lines.map((l) => l.kind)).toEqual(["user", "a2ui", "say"]);
    });

    test("an empty file is refused", () =>
    {
        expect(() => parseScenario("")).toThrow("line 1 must be a header line");
    });

    test("a first line that is not a header is refused", () =>
    {
        expect(() => parseScenario(lines({ kind: "user", text: "hi" }))).toThrow("line 1 must be a header line");
    });

    test("an unknown kind names its line", () =>
    {
        expect(() => parseScenario(lines(HEADER, { kind: "user", text: "a" }, { kind: "shout", text: "b" })))
            .toThrow("line 3 has an unknown kind");
    });

    test("invalid JSON names its line", () =>
    {
        expect(() => parseScenario(`${JSON.stringify(HEADER)}\n{nope`)).toThrow("line 2 is not valid JSON");
    });

    test("a live header must name its provider, model and date", () =>
    {
        expect(() => parseScenario(lines({ ...HEADER, provenance: "live", provider: "anthropic", model: "m" })))
            .toThrow("a live scenario's header needs provider, model and date (YYYY-MM-DD)");
    });

    test("provenance must be live or scripted", () =>
    {
        expect(() => parseScenario(lines({ ...HEADER, provenance: "edited" })))
            .toThrow('provenance must be "live" or "scripted"');
    });

    test("serializeScenario round-trips", () =>
    {
        const text = lines({ ...HEADER, provenance: "live", provider: "openai", model: "m", date: "2026-10-27" },
            { kind: "action", message: { version: "v0.9.1", action: { name: "x" } } });

        expect(serializeScenario(parseScenario(text))).toBe(`${text}\n`);
    });
});
