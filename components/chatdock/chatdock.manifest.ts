/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 434d8cf2-f029-423b-adfb-33b2c0f745b0
 * Created: 2026-08-04
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ChatDock / CapabilityManifest
 * 📜 PURPOSE: Declares what ChatDock can render, emit, and accept. See ADR-142.
 * 🔗 RELATES: [[ChatDock]], [[DynamicCanvas]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker chatdock-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Chrome rather than content: `affords` is empty because a workspace surface
 * is never something the resolver reaches for to display data. It is placed by
 * the application, not resolved from an intent. It is still `surface` because
 * the canvas must be able to feed it, subscribe to it, and restore it.
 */
export const CHATDOCK_MANIFEST: CapabilityManifest =
{
    name: "chatdock",
    factory: "createChatDock",
    factoryStyle: "container-first",
    label: "ChatDock",
    icon: "bi-chat-dots",
    category: "navigation",

    // What an agent's model reads to choose this component (ADR-222, #37).
    agent: {
        useWhen: "Show a running conversation with a message input, so the user can "
            + "talk to the agent inside the surface.",
        avoidWhen: "For a single free-text answer use TextField; for a static transcript use List with Text.",
    },

    affords: [],

    emits: [
        { name: "submit", payload: "scalar", multi: false, legacyOption: "onSubmit" },
        { name: "selectTurn", payload: "record", multi: false, legacyOption: "onSelectTurn" },
        { name: "branch", payload: "record", multi: false, legacyOption: "onBranch" }
    ],

    accepts: [
        { name: "turns", payload: "collection", required: false }
    ],

    actions: [],

    stateKeys: ["draft", "historyOpen"],

    regions: ["chatdock:turns"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 9_000, mountCost: "light", holdsResources: false },

    defaultSize: { w: 520, h: 200 },
    defaultOptions: {},

    conformance: "surface",
    priority: 20,
};
