/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 1a51c882-9b22-4ac0-97bf-808abf7387c8
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Comment Overlay / CapabilityManifest
 * PURPOSE: Declares what Comment Overlay can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Comment Overlay]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker commentoverlay-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down, but it is not yet wired. Promotion to `field` or `surface`
 * happens in plan phase 9, once the component satisfies the fuller contract
 * and the conformance suite proves it.
 */
export const COMMENTOVERLAY_MANIFEST: CapabilityManifest =
{
    name: "commentoverlay",
    factory: "createCommentOverlay",
    label: "Comment Overlay",
    icon: "bi-chat-right-dots",
    category: "social",

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: [],

    // Out of the agent catalog by design (#64, ADR-260).
    protocol: {
        outOfCatalog: "It places each pin over a live anchorElement on the host page, so in an A2UI surface no "
            + "pin can be created or placed. Comments an agent can read and write belong in the planned "
            + "Comment Thread and Comment Panel (MASTER_COMPONENT_LIST.md 17.3 and 17.4), which attach them "
            + "to ids.",
    },

    regions: [
        "commentoverlay:thread-body",
        "commentoverlay:mention-dropdown",
    ],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 29698, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
