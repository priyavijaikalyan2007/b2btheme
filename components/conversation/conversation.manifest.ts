/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7ecf8f39-a40f-4db5-80b9-2f46ad97e796
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Conversation / CapabilityManifest
 * PURPOSE: Declares what Conversation can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Conversation]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker conversation-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const CONVERSATION_MANIFEST: CapabilityManifest =
{
    name: "conversation",
    factory: "createConversation",
    factoryStyle: "options-first",
    label: "Conversation",
    icon: "bi-chat-dots",
    category: "ai",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 38792, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 500 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
