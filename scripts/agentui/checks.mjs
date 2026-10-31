/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiPostChecks
 * 📜 PURPOSE: Catch a schema tool's silent drops: a data member missing from
 *    the schema, a JSDoc comment lost on the way, a manifest default the
 *    schema rejects. Spec §4.
 * 🔗 RELATES: [[AgentUiSchemaEmitter]], [[AgentUiNormalise]]
 * ⚡ FLOW: [normalised schema] -> [missingDataMembers | missingDescriptions
 *          | defaultOptionsErrors] -> [generator errors]
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;

/**
 * Data members absent from the schema's top-level properties.
 *
 * @param schema - Normalised schema.
 * @param names  - Member names the classifier called data.
 * @returns The missing names.
 */
export function missingDataMembers(schema, names)
{
    const props = schema.properties ?? {};

    return names.filter((n) => !(n in props));
}

/**
 * Members with JSDoc whose schema property has no description. typia 12.2.1
 * ignores JSDoc on the same line as the member (spec §4).
 *
 * @param schema  - Normalised schema.
 * @param members - MemberReport[] for the data props.
 * @returns The names that lost their description.
 */
export function missingDescriptions(schema, members)
{
    const props = schema.properties ?? {};

    return members.filter((m) => m.jsdoc !== "" && props[m.name] && !props[m.name].description).map((m) => m.name);
}

/**
 * Validates manifest defaults against the schema. `required` is not enforced,
 * because defaults are partial by nature.
 *
 * @param schema   - Normalised schema.
 * @param defaults - The manifest's defaultOptions.
 * @returns One message per error; empty when valid.
 */
export function defaultOptionsErrors(schema, defaults, commonTypes = undefined)
{
    const { required, ...relaxed } = schema;
    void required;
    const ajv = new Ajv2020({ strict: false, validateFormats: false, allErrors: true });

    // A child slot refers to A2UI's ComponentId (ADR-238), so the common types must resolve.
    if (commonTypes)
    {
        ajv.addSchema(commonTypes);
    }

    const validate = ajv.compile(relaxed);

    return validate(defaults) ? [] : validate.errors.map((e) => `${e.instancePath || "/"} ${e.message}`);
}
