/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: fe42477c-0b2d-43e7-b8b2-e890b523c877
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Card Layout / CapabilityManifest
 * PURPOSE: Declares what Card Layout can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[Card Layout]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker cardlayout-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * A card over A2UI (readiness step 4 L2, ADR-240). Closed, so the generator
 * can place ComponentId at `child`.
 */
const CARDS_SCHEMA = {
    type: "array",
    description: "The cards; one shows at a time.",
    items: {
        type: "object",
        description: "A card holding one component.",
        properties: {
            key: { type: "string", description: "Unique card key, which activeKey names." },
            lazyLoad: { type: "boolean", description: "Render the card only when it is first shown." },
        },
        required: ["key", "child"],
        additionalProperties: false,
    },
};

/**
 * Declared at `surface` conformance (readiness step 4 L2, ADR-240): each card
 * holds an A2UI component, and the shown card is its state, so an agent's
 * change to activeKey switches cards in place, with the transition, and a
 * rebuild keeps the card the user arrowed to. It emits no channels; cardCount
 * is reported, not restored.
 */
export const CARDLAYOUT_MANIFEST: CapabilityManifest =
{
    name: "cardlayout",
    factory: "createCardLayout",
    factoryStyle: "options-first",
    label: "Card Layout",
    icon: "bi-stack",
    category: "layout",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show one of several components at a time in the same space, switching with activeKey, such as "
            + "the steps of a flow you drive; give each card's content as a component id.",
        avoidWhen: "When the user picks the view with visible tabs use Tabs or TabbedPanel; for steps with Back and "
            + "Next buttons use Stepper.",
    },

    affords: [],
    emits: [],
    accepts: [],
    actions: [],
    stateKeys: ["activeKey", "cardCount"],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-240).
    protocol: {
        children: { "cards[].child": "one" },
        schemas: { cards: CARDS_SCHEMA },
        hostOnly: {
            id: "Every A2UI component already has an id of its own, so this option cannot be set separately.",
            onLayoutChange: "Fires as the shown card changes; that is view state, which activeKey restores.",
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 7243, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 400, h: 300 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
