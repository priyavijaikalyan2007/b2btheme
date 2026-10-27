/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentDescriptionCheck
 * 📜 PURPOSE: The agent-description rule (ADR-222, readiness spec §4.3). Every
 *    catalog component says when to choose it and when to choose something
 *    else, naming that alternative, so a model can pick between overlapping
 *    components (ours, and A2UI's basic ones). It runs after catalog assembly,
 *    because the naming rule needs the catalog's component names.
 * 🔗 RELATES: [[AgentUiCatalog]], [[AgentUiGenerator]]
 * ⚡ FLOW: [buildCatalog] -> [checkAgentDescription] -> [generator errors]
 */

import { catalogName } from "./catalog.mjs";

export const AGENT_SENTENCE_MIN = 30;
export const AGENT_SENTENCE_MAX = 240;

/** The two sentences, in the order the catalog description uses them. */
const KEYS = ["useWhen", "avoidWhen"];

/**
 * Checks one catalog component's agent description.
 *
 * @param manifest     - The capability manifest.
 * @param catalogNames - Every component name in the built catalog, ours and basic.
 * @returns Literate messages naming the manifest; [] when it passes.
 */
// @entrypoint
export function checkAgentDescription(manifest, catalogNames)
{
    const agent = manifest.agent ?? {};
    const self = catalogName(manifest);
    const problems = KEYS.flatMap((k) => sentenceProblems(k, agent[k], manifest.label));

    const namesOther = (text) => catalogNames.some((n) => n !== self && namesComponent(text, n));

    if (typeof agent.avoidWhen === "string" && !namesOther(agent.avoidWhen))
    {
        problems.push("agent.avoidWhen names no other catalog component, so a model is not told what to use instead. "
            + "Name it exactly as the catalog spells it, for example ChoicePicker or TextField.");
    }

    return problems.map((p) => `${manifest.name}: ${p} (components/${manifest.name}/${manifest.name}.manifest.ts)`);
}

/** What is wrong with one sentence; [] when nothing is. */
function sentenceProblems(key, text, label)
{
    if (typeof text !== "string" || text.trim() === "")
    {
        return [`agent.${key} is missing. A catalog component needs agent.useWhen and agent.avoidWhen: one `
            + "sentence each on when to choose it and when to choose something else."];
    }

    const out = [];

    const n = text.length;

    if (n < AGENT_SENTENCE_MIN) { out.push(`agent.${key} is ${n} characters; write at least ${AGENT_SENTENCE_MIN}.`); }

    if (n > AGENT_SENTENCE_MAX) { out.push(`agent.${key} is ${n} characters; keep it to ${AGENT_SENTENCE_MAX}.`); }

    if (!text.trimEnd().endsWith(".")) { out.push(`agent.${key} must be a sentence ending with a full stop.`); }

    if (fold(text) === fold(label))
    {
        out.push(`agent.${key} only repeats the label "${label}"; say when to choose it.`);
    }

    return out;
}

/** Lower case, letters and digits only. */
function fold(s)
{
    return s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/** True when `name` appears in `text` as a whole word, exactly as spelled. */
function namesComponent(text, name)
{
    return new RegExp(`(^|[^A-Za-z0-9])${name}([^A-Za-z0-9]|$)`).test(text);
}
