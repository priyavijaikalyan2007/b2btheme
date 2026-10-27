/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiPlayground / Scenario
 * 📜 PURPOSE: The saved-session format (#30 spec §7.1): JSONL with a header
 *    line, then one event per line. "Save session" writes it; replay, the
 *    recordings and the CLI read it. A live scenario must say which model
 *    produced it, because advertised recordings are labelled with it (§7.2).
 * 🔗 RELATES: [[A2uiPlayground]], [[A2uiScenarioReplay]]
 * ----------------------------------------------------------------------------
 */

export interface ScenarioHeader
{
    readonly kind: "header";
    readonly title: string;
    readonly provenance: "live" | "scripted";
    readonly provider?: string;
    readonly model?: string;
    readonly date?: string;
}

export type ScenarioLine =
    | { readonly kind: "user"; readonly text: string }
    | { readonly kind: "say"; readonly text: string }
    | { readonly kind: "finding"; readonly text: string }
    | { readonly kind: "a2ui"; readonly message: unknown }
    | { readonly kind: "action"; readonly message: unknown }
    | { readonly kind: "error"; readonly message: unknown };

export interface Scenario
{
    readonly header: ScenarioHeader;
    readonly lines: readonly ScenarioLine[];
}

const KINDS = new Set(["user", "say", "finding", "a2ui", "action", "error"]);

/**
 * Parses a scenario file.
 *
 * @throws With the offending line number when the file is not a scenario.
 */
export function parseScenario(text: string): Scenario
{
    const raw = text.replace(/\n$/, "").split("\n");
    const header = parseLine(raw[0] ?? "", 1);

    checkHeader(header);

    const lines = raw.slice(1).map((line, i) =>
    {
        const value = parseLine(line, i + 2);

        if (!KINDS.has(String(value.kind))) { throw new Error(`line ${i + 2} has an unknown kind "${value.kind}".`); }

        return value as unknown as ScenarioLine;
    });

    return { header: header as unknown as ScenarioHeader, lines };
}

/** The scenario as JSONL, one line per event, ending with a newline. */
export function serializeScenario(scenario: Scenario): string
{
    return `${[scenario.header, ...scenario.lines].map((l) => JSON.stringify(l)).join("\n")}\n`;
}

function parseLine(line: string, n: number): Record<string, unknown>
{
    let value: unknown;

    try { value = JSON.parse(line); }
    catch
    {
        if (n === 1) { throw new Error(headerRule()); }
        throw new Error(`line ${n} is not valid JSON.`);
    }

    if (value === null || typeof value !== "object" || Array.isArray(value))
    {
        throw new Error(n === 1 ? headerRule() : `line ${n} must be a JSON object.`);
    }

    return value as Record<string, unknown>;
}

function checkHeader(h: Record<string, unknown>): void
{
    if (h.kind !== "header" || typeof h.title !== "string") { throw new Error(headerRule()); }

    if (h.provenance !== "live" && h.provenance !== "scripted")
    {
        throw new Error('line 1: provenance must be "live" or "scripted".');
    }

    const dated = typeof h.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.date);

    if (h.provenance === "live" && (typeof h.provider !== "string" || typeof h.model !== "string" || !dated))
    {
        throw new Error("line 1: a live scenario's header needs provider, model and date (YYYY-MM-DD).");
    }
}

function headerRule(): string
{
    return 'line 1 must be a header line: {"kind":"header","title":…,"provenance":"live"|"scripted",…}.';
}
