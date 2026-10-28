/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentDescriptionCheck (ADR-222, readiness spec §4.3). A catalog
 *    component must say when to choose it and when to choose something else,
 *    naming another catalog component.
 */

import { describe, expect, test } from "vitest";

import { AGENT_SENTENCE_MAX, AGENT_SENTENCE_MIN, checkAgentDescription } from "./agent-description.mjs";

const NAMES = ["Button", "ChoicePicker", "OrientationPicker"];
const USE = "Let the user choose portrait or landscape page orientation.";
const AVOID = "For any other choice between a few options use ChoicePicker.";

function check(agent?: Record<string, unknown>): string[]
{
    const manifest = { name: "orientationpicker", factory: "createOrientationPicker", label: "Orientation Picker",
        ...(agent ? { agent } : {}) };

    return checkAgentDescription(manifest, NAMES);
}

describe("agent descriptions", () =>
{
    test("two good sentences pass", () => { expect(check({ useWhen: USE, avoidWhen: AVOID })).toEqual([]); });

    test("a missing agent field names both sentences and the manifest", () =>
    {
        const out = check();

        expect(out.join("\n")).toContain("agent.useWhen is missing");
        expect(out.join("\n")).toContain("agent.avoidWhen is missing");
        expect(out[0]).toContain("(components/orientationpicker/orientationpicker.manifest.ts)");
    });

    test("a sentence under the minimum is reported with the minimum", () =>
    {
        const out = check({ useWhen: "Pick a page shape.", avoidWhen: AVOID });

        expect(out.join("\n")).toContain(String(AGENT_SENTENCE_MIN));
    });

    test("a sentence over the maximum is reported with the maximum", () =>
    {
        const long = `${"Let the user choose an orientation for the page. ".repeat(6)}`.trim();

        expect(long.length).toBeGreaterThan(AGENT_SENTENCE_MAX);
        expect(check({ useWhen: long, avoidWhen: AVOID }).join("\n")).toContain(String(AGENT_SENTENCE_MAX));
    });

    test("a sentence without a full stop is reported", () =>
    {
        expect(check({ useWhen: USE.slice(0, -1), avoidWhen: AVOID }).join("\n")).toContain("full stop");
    });

    test("a sentence that only repeats the label is reported", () =>
    {
        const out = check({ useWhen: "Orientation picker.", avoidWhen: AVOID });

        expect(out.join("\n")).toContain("only repeats the label");
    });

    test("an avoidWhen naming only the component itself is reported", () =>
    {
        const out = check({ useWhen: USE, avoidWhen: "Use OrientationPicker only for page orientation choices." });

        expect(out.join("\n")).toContain("names no other catalog component");
    });

    test("the alternative must be spelled exactly as the catalog spells it", () =>
    {
        expect(check({ useWhen: USE, avoidWhen: "For any other choice between options use choicepicker." }).join("\n"))
            .toContain("names no other catalog component");
    });

    test("a name inside a longer word does not count", () =>
    {
        const out = check({ useWhen: USE, avoidWhen: "For other choices use a ChoicePickerish control instead." });

        expect(out.join("\n")).toContain("names no other catalog component");
    });
});
