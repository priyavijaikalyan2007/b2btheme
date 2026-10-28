/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 0b5ad312-c5b6-46eb-a256-870078cd19a2
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Doc Viewer / CapabilityManifest
 * PURPOSE: Declares what Doc Viewer can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Doc Viewer]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker docviewer-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance (readiness step 2 P1, ADR-230): its page
 * changes are view state, so it emits nothing. Over agent protocols it renders
 * pages[].markdown through MarkdownRenderer, which the adapter loads first,
 * with marked.
 */
export const DOCVIEWER_MANIFEST: CapabilityManifest =
{
    name: "docviewer",
    factory: "createDocViewer",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Doc Viewer",
    icon: "bi-file-text",
    category: "content",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show multi-page documentation written in markdown, with a table of contents, an outline and "
            + "previous and next links.",
        avoidWhen: "For one short piece of text use Text; for switching between a few panels use Tabs.",
    },

    affords: [
        {
            shape: "document",
            intents: ["browse", "inspect"],
            cardinality: { min: 1, max: 500 },
            minViewport: { w: 320, h: 240 },
        },
    ],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-230).
    protocol: {
        hostOnly: {
            // The URL-fetch rule (readiness step 2 §4); the generator removes it from the pages schema (ADR-230).
            "pages[].url": "The component fetches this URL from the user's browser with the host's credentials; "
                + "an agent must not choose it.",
            onPageChange: "Fires as the user moves between pages; that is view state, not information for an agent.",
            onReady: "Fires when a page has rendered; a lifecycle signal, not information for an agent.",
        },
        // MarkdownRenderer renders each page and throws without marked (ADR-230, #51).
        dependencies: { libraries: ["marked"], components: ["markdownrenderer"] },
    },

    regions: [
        "docviewer:toc-list",
        "docviewer:content",
        "docviewer:outline",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 12200, mountCost: "light", holdsResources: false },

    defaultSize: { w: 600, h: 450 },
    defaultOptions: { pages: [] },

    conformance: "display",
    priority: 50,
};
