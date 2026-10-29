/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 3b9cd2a5-a261-44c8-af25-cc82fda0fa78
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Log Console / CapabilityManifest
 * PURPOSE: Declares what Log Console can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Log Console]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker logconsole-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance (readiness step 2 B6): it shows the
 * entries the agent supplies, through the additive entries option, and emits
 * nothing.
 */
export const LOGCONSOLE_MANIFEST: CapabilityManifest =
{
    name: "logconsole",
    factory: "createLogConsole",
    mountMethod: "getElement",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Log Console",
    icon: "bi-terminal-fill",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a scrolling log of timestamped messages with level filters, such as a build or job output.",
        avoidWhen: "For a timeline of user actions use ActivityFeed; for an audit trail use AuditLogViewer.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B6).
    protocol: {
        hostOnly: {
            theme: "Deprecated and ignored: colours follow the design tokens, so there is nothing for an agent to set.",
            onClear: "Fires when the user clears the console's own view; nothing an agent acts on.",
            onExport: "Writes a file in the user's browser; an agent cannot receive it.",
            onEntry: "Fires as each entry is added, echoing what the agent or host just logged.",
        },
    },

    regions: ["logconsole:body"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 10565, mountCost: "light", holdsResources: false },

    defaultSize: { w: 500, h: 250 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
