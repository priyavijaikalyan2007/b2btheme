/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7d7f3ad9-7b14-4be3-930b-3b9d4cb74bbf
 * Created: 2026-11-01
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Type Badge / CapabilityManifest
 * 📜 PURPOSE: Declares what Type Badge can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it, and the A2UI catalog can publish it.
 *    See ADR-142, ADR-243.
 * 🔗 RELATES: [[Type Badge]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker typebadge-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `surface` conformance (readiness step 5, ADR-243): a clickable
 * badge emits "click" with its typeKey through mountTypeBadge's handle, the
 * handle-returning factory beside createTypeBadge, which returns a bare
 * element. It has no view state, so stateKeys is empty (ADR-229).
 */
export const TYPEBADGE_MANIFEST: CapabilityManifest =
{
    name: "typebadge",
    factory: "mountTypeBadge",
    factoryStyle: "container-first",
    label: "Type Badge",
    icon: "bi-bookmark",
    category: "other",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show what kind of thing an item is, such as an OKR, a risk or a document, as a small badge with the "
            + "type's icon and colour, optionally clickable to open the type.",
        avoidWhen: "For a status such as Operational use StatusBadge; for a removable tag or filter use Pill.",
    },

    affords: [],
    emits: [
        { name: "click", payload: "record", multi: false, legacyOption: "onClick" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-243).
    protocol: {
        // The factory is mountTypeBadge, whose name would otherwise become the catalog name.
        name: "TypeBadge",
        // The badge throws on a colour it cannot read, and the icon becomes part of a class attribute,
        // so it takes class characters and spaces only (as ConfirmDialog's icon does).
        schemas: {
            color: { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
                description: "Hex colour for the badge, such as \"#C0392B\". Default: the theme's colour." },
            icon: { type: "string", pattern: "^[A-Za-z0-9 _-]+$",
                description: "A Bootstrap icon name such as \"crosshair\", or a full class string such as "
                    + "\"fa-solid fa-user\" or \"fluent-ui-people-team-16-regular\"." },
        },
    },

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 3000, mountCost: "trivial", holdsResources: false },

    defaultSize: { w: 80, h: 24 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
