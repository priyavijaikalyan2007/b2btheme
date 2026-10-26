/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: b7d68b6d-3d15-411e-9e98-f5661e0fcc93
 * Created: 2026-10-26
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapter / SampleValues (tests only)
 * 📜 PURPOSE: Two distinct valid values for a catalog literal arm, so the
 *    fleet gate (G3) can mount every catalog component and change every prop
 *    without a hand-written fixture per component. It understands exactly the
 *    keywords catalog literal arms use, and refuses the rest.
 * 🔗 RELATES: [[A2uiAdapter]], [[AgentUiCatalog]]
 * ⚡ FLOW: [literal arm schema] -> [sampleValue(schema, variant)] -> [value]
 * ----------------------------------------------------------------------------
 */

type Schema = Record<string, unknown>;
type Variant = 0 | 1;

/** Keywords that carry no constraint. */
const IGNORED = new Set(["description", "additionalProperties", "title"]);

const SCALARS: Record<string, [unknown, unknown]> = {
    string: ["a", "b"], number: [1, 2], integer: [1, 2], boolean: [false, true],
};

/**
 * A value of `schema`; variants 0 and 1 differ wherever the schema allows.
 *
 * @param schema  - A literal-arm schema from the catalog.
 * @param variant - Which of the two values.
 * @param root    - The catalog, for "#/$defs/..." references.
 * @param pointer - Where `schema` sits, for error messages.
 * @throws On a keyword this sampler does not understand.
 */
export function sampleValue(schema: Schema, variant: Variant, root: Schema, pointer = "#"): unknown
{
    const unknown = Object.keys(schema).find((k) => !IGNORED.has(k) && !HANDLED.has(k));

    if (unknown !== undefined)
    {
        throw new Error(`sampleValue: unsupported keyword "${unknown}" at ${pointer}; extend a2ui/sample-values.ts `
            + "rather than guessing a value.");
    }

    if (typeof schema.$ref === "string") { return sampleValue(resolve(schema.$ref, root), variant, root, schema.$ref); }

    if ("const" in schema) { return schema.const; }

    if (Array.isArray(schema.oneOf)) { return sampleOneOf(schema.oneOf as Schema[], variant, root, pointer); }

    return sampleTyped(schema, variant, root, pointer);
}

const HANDLED = new Set(["$ref", "const", "oneOf", "type", "items", "properties", "required"]);

function sampleOneOf(arms: Schema[], variant: Variant, root: Schema, pointer: string): unknown
{
    if (variant === 1 && arms.length > 1) { return sampleValue(arms[1], 0, root, `${pointer}/oneOf/1`); }

    return sampleValue(arms[0], variant, root, `${pointer}/oneOf/0`);
}

function sampleTyped(schema: Schema, variant: Variant, root: Schema, pointer: string): unknown
{
    const type = schema.type as string;

    if (type in SCALARS) { return SCALARS[type][variant]; }

    if (type === "array") { return [sampleValue(schema.items as Schema, variant, root, `${pointer}/items`)]; }

    if (type === "object")
    {
        const props = (schema.properties ?? {}) as Record<string, Schema>;
        const required = (schema.required ?? []) as string[];

        return Object.fromEntries(required.map((k) => [k, sampleValue(props[k], variant, root, `${pointer}/properties/${k}`)]));
    }

    throw new Error(`sampleValue: no type, const, oneOf or $ref at ${pointer}; extend a2ui/sample-values.ts.`);
}

function resolve(ref: string, root: Schema): Schema
{
    const m = /^#\/\$defs\/(.+)$/.exec(ref);
    const target = m ? (root.$defs as Record<string, Schema> | undefined)?.[m[1]] : undefined;

    if (!target) { throw new Error(`sampleValue: cannot resolve $ref ${ref} against the catalog's $defs.`); }

    return target;
}
