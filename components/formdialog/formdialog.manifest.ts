/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 9a4d7f20-3e1c-4b5a-8d96-1f0e2c7b4a63
 * Created: 2026-11-02
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Form Dialog / CapabilityManifest
 * 📜 PURPOSE: Declares what Form Dialog can render, so the Dynamic UI canvas
 *    can resolve, mount, and budget it, and the A2UI catalog can publish it.
 *    See ADR-142, ADR-246.
 * 🔗 RELATES: [[FormDialog]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker formdialog-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

const VALIDATE = "Host code that checks a value; an agent checks the values the submit event carries.";
const ELEMENT = "A host DOM element; an agent has none to pass.";

/** Every field type but "custom", which shows a host element (ADR-246). */
const FIELD_TYPES = ["text", "email", "password", "url", "number", "select", "radio", "textarea", "readonly",
    "hidden", "checkbox", "toggle", "date", "datetime", "time", "color", "code", "richtext"];

/** One field. Closed, so validate and customElement are rejected. */
const FIELD = {
    type: "object",
    description: "One form field; its value is reported under its name in the submit event.",
    properties: {
        name: { type: "string", description: "Key of the value in the submit event." },
        label: { type: "string", description: "Visible label." },
        type: { description: "Input kind.", oneOf: FIELD_TYPES.map((t) => ({ const: t })) },
        placeholder: { type: "string", description: "Hint shown while empty." },
        required: { type: "boolean", description: "Submit is refused while it is empty." },
        value: { type: "string", description: "Initial value." },
        checked: { type: "boolean", description: "Initially on, for a checkbox or toggle." },
        options: { type: "array", description: "Choices, for a select or radio.",
            items: { type: "object", properties: { value: { type: "string" }, label: { type: "string" } },
                required: ["value", "label"], additionalProperties: false } },
        helpText: { type: "string", description: "A short note under the field." },
        rows: { type: "integer", minimum: 1, description: "Visible lines, for a textarea or code field." },
        disabled: { type: "boolean", description: "Shown dimmed; it cannot be changed." },
        autocomplete: { type: "string", description: "The browser autocomplete hint, such as \"email\"." },
        width: { description: "Share of the row. Default: \"full\".",
            oneOf: [{ const: "full" }, { const: "half" }, { const: "third" }] },
        section: { type: "string", description: "Id of the section the field sits in." },
    },
    required: ["name", "label", "type"],
    additionalProperties: false,
};

/** One collapsible group of fields. */
const SECTION = {
    type: "object",
    properties: {
        id: { type: "string", description: "Id fields name in their section." },
        label: { type: "string", description: "Visible heading." },
        collapsed: { type: "boolean", description: "Starts collapsed." },
        icon: { type: "string", description: "Bootstrap Icons class, such as \"bi-person\"." },
    },
    required: ["id", "label"],
    additionalProperties: false,
};

/** One wizard step. Closed, so validate is rejected. */
const STEP = {
    type: "object",
    properties: {
        id: { type: "string", description: "Stable id." },
        label: { type: "string", description: "Visible name in the step bar." },
        description: { type: "string", description: "A sentence under the step's name." },
        icon: { type: "string", description: "Bootstrap Icons class." },
        fields: { type: "array", items: FIELD, description: "The step's fields, in order." },
        sections: { type: "array", items: SECTION, description: "The step's collapsible groups." },
    },
    required: ["id", "label", "fields"],
    additionalProperties: false,
};

/**
 * Declared at `surface` conformance (readiness step 5, ADR-246): Submit is a
 * "submit" event carrying every field's value, and cancelling is a "cancel"
 * event, through createFormDialog's handle. Over A2UI it is contained
 * (protocol.fixed), so it renders in its surface, blocks nothing outside it,
 * and shows as soon as it mounts. The values travel in the event, so it has
 * no view state (ADR-229).
 */
export const FORMDIALOG_MANIFEST: CapabilityManifest =
{
    name: "formdialog",
    factory: "createFormDialog",
    factoryStyle: "options-only",
    containerOption: "container",
    label: "Form Dialog",
    icon: "bi-ui-checks",
    category: "input",

    // What an agent's model reads to choose this component (ADR-222).
    agent: {
        useWhen: "Collect a few values from the user in one step, such as a name, an email and a role, or in a "
            + "short wizard of steps, and hear them all at once when the user submits.",
        avoidWhen: "For a yes-or-no question use ConfirmDialog; for one value use TextField or another field "
            + "directly in the surface.",
    },

    affords: [],
    emits: [
        { name: "submit", payload: "record", multi: false, legacyOption: "onSubmit" },
        { name: "cancel", payload: "record", multi: false, legacyOption: "onCancel" },
    ],
    accepts: [],
    actions: [],
    stateKeys: [],

    // How this component appears to agent protocols (ADR-219, ADR-222, ADR-246).
    protocol: {
        fixed: { contained: true },
        schemas: {
            fields: { type: "array", items: FIELD,
                description: "The fields of a single-page form, in order. Ignored when steps is given." },
            sections: { type: "array", items: SECTION,
                description: "Collapsible groups; a field joins one by naming its id in its section." },
            steps: { type: "array", items: STEP,
                description: "Wizard steps, each with its own fields; given, the dialog is a wizard." },
        },
        hostOnly: {
            "fields[].validate": VALIDATE,
            "fields[].customElement": ELEMENT,
            "steps[].validate": VALIDATE,
            "steps[].fields[].validate": VALIDATE,
            "steps[].fields[].customElement": ELEMENT,
            panel: "A host element or render function shown beside the form; an agent puts content beside the "
                + "dialog in its surface instead.",
            customContent: ELEMENT,
            onStepChange: "Fires as the user moves between wizard steps; that is view state, not information for an "
                + "agent.",
            onFieldChange: "Fires on each keystroke; the submit event carries every value at once.",
            warnOnDirty: "Its prompt is a page modal, which a contained dialog must not open.",
            keyBindings: "Over A2UI the dialog's keys work only inside its box, where the default Escape suffices.",
            closeOnBackdrop: "A contained dialog has no backdrop to click.",
        },
    },

    regions: ["formdialog:steps", "formdialog:form", "formdialog:code", "formdialog:panel"],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 30000, mountCost: "light", holdsResources: false },

    defaultSize: { w: 560, h: 480 },
    defaultOptions: {},

    conformance: "surface",
    priority: 50,
};
