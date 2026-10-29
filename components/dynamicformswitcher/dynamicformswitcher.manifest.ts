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
 *
 * Declared at `surface` conformance (readiness step 2 B5): it emits "change"
 * with the variant and its values through an additive on(); value is
 * one-way. Over agent protocols only the built-in field types that need no
 * other component are offered (protocol.schemas.variants).
 */
/** A field value an agent can set or read. */
const SCALAR = {
    anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "array", items: { type: "string" } }],
};

export const DYNAMICFORMSWITCHER_MANIFEST: CapabilityManifest =
{
    name: "dynamicformswitcher",
    factory: "createDynamicFormSwitcher",
    factoryStyle: "container-first",
    label: "Dynamic Form Switcher",
    icon: "bi-ui-checks",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Show a form whose fields the agent defines, optionally in several variants the user switches "
            + "between; read the values from eventData.",
        avoidWhen: "For one or two inputs use TextField or ChoicePicker; for a fixed set of choices use ChoicePicker.",
    },

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
    emits: [
        { name: "change", payload: "record", multi: false, legacyOption: "onChange" },
    ],

    accepts: [],
    actions: [],
    stateKeys: ["variant", "values"],

    // How this component appears to agent protocols (ADR-219, ADR-222, readiness step 2 B5).
    protocol: {
        // onChange passes the variant id and the values, which cannot map to value: value is one-way.
        change: "event",
        hostOnly: {
            "variants[].fields[].customElement": "An element for a custom field; over A2UI only the built-in field "
                + "types are offered.",
            "variants[].fields[].mount": "A function that mounts a custom field; over A2UI only the built-in field "
                + "types are offered.",
            "variants[].fields[].validate": "A check that must answer synchronously, which an agent round trip "
                + "cannot; the required rule still applies.",
            "variants[].fields[].componentOptions": "Options for a component-backed field type, which needs host "
                + "code; over A2UI only the built-in types are offered.",
            "variants[].fields[].value": "Its TypeScript type is unknown; protocol.schemas.variants narrows it to a "
                + "string, number, boolean or list of strings.",
            value: "Its TypeScript type is an open record; protocol.schemas.value narrows it to field names mapped to "
                + "strings, numbers, booleans or lists of strings.",
            onVariantChange: "Fires as the user switches variants; the change event carries the new variant and its "
                + "values.",
            onValidate: "A check that must answer synchronously, which an agent round trip cannot.",
        },
        schemas: {
            // Built-in field types that need no other component; "file" yields browser File objects and
            // "custom" needs a mount function, so neither is offered (readiness step 2 B5).
            variants: {
                type: "object",
                additionalProperties: {
                    type: "object",
                    properties: {
                        label: { type: "string", description: "The variant's name in the selector." },
                        description: { type: "string", description: "Help text for the variant." },
                        icon: { type: "string", description: "Bootstrap Icons class." },
                        fields: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string", description: "The field's key in the values." },
                                    label: { type: "string", description: "Label shown above the field." },
                                    type: {
                                        enum: ["text", "email", "password", "url", "number", "textarea", "select",
                                            "multiselect", "radio", "checkbox", "toggle", "date", "datetime", "time",
                                            "color", "code", "richtext"],
                                        description: "The input to show.",
                                    },
                                    placeholder: { type: "string", description: "Shown while the field is empty." },
                                    required: { type: "boolean", description: "The field must be filled in." },
                                    value: { ...SCALAR, description: "Initial value." },
                                    options: {
                                        type: "array",
                                        description: "Choices for select, multiselect and radio.",
                                        items: {
                                            type: "object",
                                            properties: { value: { type: "string" }, label: { type: "string" } },
                                            required: ["value", "label"],
                                            additionalProperties: false,
                                        },
                                    },
                                    helpText: { type: "string", description: "Help text under the field." },
                                    rows: { type: "number", description: "Rows for textarea and code." },
                                    min: { type: "number", description: "Minimum for number." },
                                    max: { type: "number", description: "Maximum for number." },
                                    step: { type: "number", description: "Step for number." },
                                    disabled: { type: "boolean", description: "Shows the field read-only." },
                                    autocomplete: { type: "string", description: "The input's autocomplete hint." },
                                    width: { enum: ["full", "half", "third"], description: "Share of the row." },
                                },
                                required: ["name", "label", "type"],
                                additionalProperties: false,
                            },
                        },
                    },
                    required: ["label", "fields"],
                    additionalProperties: false,
                },
            },
            value: { type: "object", additionalProperties: SCALAR },
        },
    },

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

    conformance: "surface",
    priority: 50,
};
