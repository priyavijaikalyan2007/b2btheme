/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiReferenceAgent / Prompt. The rules the agent is told are
 *    A2UI.md's, verbatim (#30 spec §6.2), the catalogs are included whole,
 *    and the prompt is identical on every call so providers can cache it.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { AGENT_RULES } from "./rules";
import { REPLY_CONTRACT, systemPrompt } from "./prompt";

const A2UI_MD = fs.readFileSync(path.join(__dirname, "..", "..", "..", "A2UI.md"), "utf8");

/** The body of A2UI.md's section for agents: after its heading, up to the next "## ". */
function section(): string
{
    const start = A2UI_MD.indexOf("## What agents (the AI kind) are told");
    const body = A2UI_MD.slice(A2UI_MD.indexOf("\n", start) + 1);

    return body.slice(0, body.indexOf("\n## ")).trim();
}

describe("AGENT_RULES", () =>
{
    test("is the body of A2UI.md's 'What agents are told', verbatim", () =>
    {
        expect(AGENT_RULES.trim()).toBe(section());
    });
});

describe("systemPrompt", () =>
{
    const ours = { $id: "https://static.outcrop.us/a2ui/catalog/v1.json", components: { StickyNote: {} } };
    const basic = { $id: "basic", components: { Text: {} } };

    test("contains the rules, both catalogs verbatim and the reply contract", () =>
    {
        const prompt = systemPrompt(ours, basic);

        expect(prompt).toContain(AGENT_RULES);
        expect(prompt).toContain(JSON.stringify(ours));
        expect(prompt).toContain(JSON.stringify(basic));
        expect(prompt.endsWith(REPLY_CONTRACT)).toBe(true);
    });

    test("names our catalog ID as the one to use", () =>
    {
        expect(systemPrompt(ours, basic))
            .toContain("https://static.outcrop.us/a2ui/catalog/v1.json (use this catalogId)");
    });

    test("is identical across calls, so it can be cached", () =>
    {
        expect(systemPrompt(ours, basic)).toBe(systemPrompt(ours, basic));
    });
});
