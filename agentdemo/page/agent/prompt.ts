/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiReferenceAgent / Prompt
 * 📜 PURPOSE: The system prompt (#30 spec §6.2): an A2UI primer, this
 *    library's rules (A2UI.md, verbatim), our catalog's lean agent rendering
 *    (#49) and Google's basic catalog, both verbatim, and the reply contract.
 *    Identical on every turn, so providers can cache it.
 * 🔗 RELATES: [[A2uiReferenceAgent]], [[AgentUiCatalog]]
 * ----------------------------------------------------------------------------
 */

import { CATALOG_ID } from "../types";
import { AGENT_RULES } from "./rules";

export const REPLY_CONTRACT = "Reply with exactly one JSON object and nothing else, no code fence and no prose "
    + 'around it: {"say": "<short chat text>", "messages": [<A2UI v0.9.1 server-to-client messages>]}. '
    + `"messages" may be empty. Use catalogId ${CATALOG_ID}.`;

const PRIMER = [
    "You are an agent that builds user interfaces for a person by sending A2UI v0.9.1 messages. A host page "
        + "renders them with real components, and you see what the person does.",
    "",
    "## A2UI v0.9.1 in brief",
    "- Every message has \"version\": \"v0.9.1\" and exactly one of createSurface, updateComponents, "
        + "updateDataModel or deleteSurface.",
    `- createSurface {"surfaceId", "catalogId": "${CATALOG_ID}"} comes first, once per surface.`,
    "- updateComponents {\"surfaceId\", \"components\": [...]} is a flat list. Each component has a unique \"id\" "
        + "and a \"component\" naming a catalog component. Containers refer to children by id. One component must "
        + "have the id \"root\". Sending an id again updates that component.",
    "- updateDataModel {\"surfaceId\", \"path\": \"/\", \"value\": {...}} sets data. Bind a prop to data with "
        + "{\"path\": \"/name\"}.",
    "- An action is {\"event\": {\"name\": \"...\", \"context\": {\"key\": {\"path\": \"/name\"}}}}.",
    "- The person's actions reach you as {\"version\": \"v0.9.1\", \"action\": {...}} and errors as "
        + "{\"version\": \"v0.9.1\", \"error\": {...}}. Treat each as their next turn and reply.",
    "- Use only components, props and functions from the catalogs below.",
].join("\n");

/**
 * The system prompt.
 *
 * @param agentCatalogJson - Our catalog's lean rendering for agents, dist/a2ui/catalog/v1.agent.json.
 * @param basicCatalogJson - Google's basic catalog, which defines the components and functions ours re-exports.
 */
export function systemPrompt(agentCatalogJson: object, basicCatalogJson: object): string
{
    return [
        PRIMER,
        "",
        "## Rules for this library's components",
        AGENT_RULES,
        "",
        "## Catalogs",
        `### ${CATALOG_ID} (use this catalogId)`,
        JSON.stringify(agentCatalogJson),
        "",
        "### Google's basic catalog (re-exported by the catalog above)",
        JSON.stringify(basicCatalogJson),
        "",
        "## Reply contract",
        REPLY_CONTRACT,
    ].join("\n");
}
