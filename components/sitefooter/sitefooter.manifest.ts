/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SiteFooter / CapabilityManifest
 * 📜 PURPOSE: Declares what SiteFooter can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it. See ADR-142 and ADR-146.
 * 🔗 RELATES: [[SiteFooter]], [[DynamicUIRuntime]], [[Resolver]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker sitefooter-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/** A link as an agent writes it: its text only (the link rule, B8). */
const LINK_SCHEMA = {
    type: "object",
    description: "A footer link. Clicking it sends linkClick with this text; answer with openUrl.",
    properties: {
        text: { type: "string", description: "Visible label. Rendered as text." },
    },
    required: ["text"],
    additionalProperties: false,
};

/**
 * Declared at `surface` conformance (readiness step 2 B8): a click on a group
 * or legal link emits linkClick through an additive on(). It carries no
 * value: it is excluded from the ADR-134 field convention for the reason
 * Sidebar and Toolbar are, as navigation chrome, and it has no view state to
 * restore (ADR-229).
 */
export const SITEFOOTER_MANIFEST: CapabilityManifest =
{
    name: "sitefooter",
    factory: "createSiteFooter",
    label: "Site Footer",
    icon: "bi-layout-text-window-reverse",
    category: "navigation",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Close a page with an organization block, contact details, grouped links and a legal row; you "
            + "hear each link click and open its page yourself.",
        avoidWhen: "For a trail to the current page use Breadcrumb; for an app's main navigation use Tabs.",
    },

    affords: [
        {
            shape: "collection",
            intents: ["browse"],
            // A comfort estimate for total links, not a limit the component
            // enforces — nothing rejects a longer list.
            cardinality: { min: 1, max: 24 },
            minViewport: { w: 320, h: 160 },
        },
    ],

    emits: [
        { name: "linkClick", payload: "record", multi: false },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-229, readiness step 2 B8).
    protocol: {
        hostOnly: {
            "organization.logo": "An element; over A2UI the organization block shows its name and description "
                + "until layouts take A2UI children (step 4).",
        },
        schemas: {
            // Without logo, an element (above), which no schema can carry.
            organization: {
                type: "object",
                description: "Organization block: its name and a one-line description.",
                properties: {
                    name: { type: "string", description: "Organization name." },
                    description: { type: "string", description: "One-line description of the organization." },
                },
                required: ["name"],
                additionalProperties: false,
            },
            // The link rule (ADR-229): every link's href is left out, so an agent's link is rejected and renders as a
            // button. Over A2UI, listen for linkClick and answer with openUrl.
            groups: {
                type: "array",
                description: "Navigation groups, each a titled column of links.",
                items: {
                    type: "object",
                    properties: {
                        title: { type: "string",
                            description: "Group heading. Also supplies the group's accessible name." },
                        headingLevel: { description: "Heading level for the group title. Default: 2.",
                            oneOf: [{ const: 2 }, { const: 3 }, { const: 4 }, { const: 5 }, { const: 6 }] },
                        links: { type: "array", description: "Links in the group.", items: LINK_SCHEMA },
                    },
                    required: ["title", "links"],
                    additionalProperties: false,
                },
            },
            legal: {
                type: "object",
                description: "Legal row: a copyright line and links such as Privacy and Terms.",
                properties: {
                    copyright: { type: "string", description: "Copyright line, such as \"© 2026 Outcrop Inc\"." },
                    links: { type: "array", description: "Legal links.", items: LINK_SCHEMA },
                },
                additionalProperties: false,
            },
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 4_000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 720, h: 240 },
    defaultOptions: { organization: { name: "Your organization" } },

    factoryStyle: "container-first",
    conformance: "surface",
    priority: 20,
};
