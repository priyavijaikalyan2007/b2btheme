/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 13062c0c-58a1-4d0f-afb2-b9ef8b731039
 * Created: 2026-10-20
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DynamicFormSwitcher / CapabilityManifest
 * PURPOSE: Declares what DynamicFormSwitcher can render, so the Dynamic UI
 *    canvas can resolve, mount, and budget it. See ADR-142.
 * RELATES: [[DynamicFormSwitcher]], [[DynamicUIRuntime]], [[PropertyInspector]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicformswitcher-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * EXEMPT UNTIL 2026-10-20, AND THE DESIGN QUESTION HAD ONE ANSWER.
 *
 * The exemption read: "It is the ADR-134 form host, so what its manifest
 * declares (one `affords` entry per field type it switches over? one for the
 * form?) is a design question with consumer-visible answers."
 *
 * The two options were not comparable. `affords.shape` is a `DataShape`, and
 * the vocabulary is ten entries long — scalar, record, collection, hierarchy,
 * graph, timeseries, document, media, geo, diff. "text", "password", "url"
 * and "code" are not among them and cannot be: they are HTML input types, not
 * shapes of data. One entry per field type was never expressible, so the
 * question posed a choice between something and nothing.
 *
 * What the component renders is one variant's worth of named values, which is
 * a `record` — the same answer PropertyInspector gives for the same reason.
 * Its variant catalogue is data the host supplies, not a second affordance.
 *
 * ADR-134's exclusion table is about the FIELD contract, and ADR-142
 * supersedes it for canvas purposes with three levels. A form HOST at
 * `display` was never excluded by either.
 */
export const DYNAMICFORMSWITCHER_MANIFEST: CapabilityManifest =
{
    name: "dynamicformswitcher",
    factory: "createDynamicFormSwitcher",
    factoryStyle: "container-first",
    label: "Dynamic Form Switcher",
    icon: "bi-ui-checks",
    category: "input",

    affords: [
        {
            shape: "record",
            intents: ["edit", "author"],
            // One variant is in front of the user at a time, by definition:
            // the component exists to show exactly one of N forms.
            cardinality: { min: 1, max: 1 },
            // Field count within that variant. The ceiling is the point at
            // which a single-column form stops being readable rather than a
            // limit the component enforces, and it is stated here so the
            // resolver can decay the score instead of guessing.
            density: { min: 1, max: 40 },
            minViewport: { w: 280, h: 200 },
        },
    ],

    // Declared empty at `display`. `onChange`, `onVariantChange` and
    // `onValidate` are live constructor callbacks; turning them into channels
    // is the promotion to `surface`, which belongs with the component's own
    // arc rather than with clearing an exemption.
    emits: [],

    accepts: [],
    actions: [],
    stateKeys: [],

    // The one scrolling region the component creates: the textarea a
    // `type: "code"` field renders. Already named in the source (DEBT-DUI-5).
    regions: ["dynamicformswitcher:code"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 0, mountCost: "light", holdsResources: false },

    defaultSize: { w: 420, h: 360 },

    // `variants` and `initialVariant` are REQUIRED and the factory throws
    // without them, so neither has an honest default. They are deliberately
    // absent: a variant catalogue invented here would ship to consumers in
    // capability-manifest.json and put a made-up form in front of real users.
    // The conformance fixture lives in dynamicformswitcher.conformance.ts.
    defaultOptions: {},

    conformance: "display",
    priority: 50,
};
