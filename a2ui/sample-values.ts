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
const IGNORED = new Set(["description", "additionalProperties", "title", "deprecated"]);

const SCALARS: Record<string, [unknown, unknown]> = {
    string: ["a", "b"], number: [1, 2], integer: [1, 2], boolean: [false, true],
};

/**
 * String patterns the catalog uses whose values the plain samples do not
 * match, with two valid values each: the hex colour every component's colour
 * takes (readiness step 2 B7, B8).
 */
const PATTERNS: Record<string, [string, string]> = {
    "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$": ["#336699", "#c0392b"],
};

/** String formats the catalog uses, with two valid values each (readiness step 2 B2). */
const FORMATS: Record<string, [string, string]> = {
    "date-time": ["2026-01-15T09:30:00.000Z", "2026-02-20T14:45:00.000Z"],
};

/**
 * Props whose string must parse, by name: a generic string sample is not a
 * language tag or a timezone, and a component rightly fails to mount on one
 * (readiness step 2 B2: DatePicker.locale threw "Invalid language tag: a").
 */
const NAMED: Record<string, [string, string]> = {
    locale: ["en-US", "fr-FR"],
    timezone: ["UTC", "Asia/Tokyo"],
    // An image that loads: a relative "a" 404s and logs a console error (step 3, UserMenu).
    avatarUrl: ["data:image/gif;base64,R0lGODlhAQABAAAAACw=", "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACw="],
};

/**
 * A value for catalog prop `prop`: a NAMED sample when its schema is a plain
 * string, else sampleValue().
 */
export function sampleProp(prop: string, schema: Schema, variant: Variant, root: Schema, pointer = "#"): unknown
{
    return prop in NAMED && schema.type === "string" && Object.keys(schema).every((k) => k === "type" || IGNORED.has(k))
        ? NAMED[prop][variant] : sampleValue(schema, variant, root, pointer);
}

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

    // A child slot (ADR-238): an id the surface may not hold, which leaves the slot empty, as streaming does.
    if (schema.$ref === COMPONENT_ID) { return ["sample-child-a", "sample-child-b"][variant]; }

    if (typeof schema.$ref === "string") { return sampleValue(resolve(schema.$ref, root), variant, root, schema.$ref); }

    if ("const" in schema) { return schema.const; }

    if (Array.isArray(schema.oneOf)) { return sampleOneOf(schema.oneOf as Schema[], variant, root, pointer); }

    return sampleTyped(schema, variant, root, pointer);
}

const COMPONENT_ID = "https://a2ui.org/specification/v0_9/common_types.json#/$defs/ComponentId";

const HANDLED = new Set(["$ref", "const", "oneOf", "type", "items", "properties", "required", "format", "pattern"]);

/**
 * Samples a oneOf, skipping a null arm (`{ type: "null" }` or `{ const: null }`): an A2UI data model cannot
 * hold null (setting it deletes the key), so a bound null would never arrive.
 */
function sampleOneOf(arms: Schema[], variant: Variant, root: Schema, pointer: string): unknown
{
    const usable = arms.map((arm, i) => ({ arm, i })).filter(({ arm }) => arm.type !== "null" && arm.const !== null);

    if (usable.length === 0) { throw new Error(`sampleValue: every arm of the oneOf at ${pointer} is null.`); }

    const pick = variant === 1 && usable.length > 1 ? usable[1] : usable[0];
    const inner: Variant = variant === 1 && usable.length > 1 ? 0 : variant;

    return sampleValue(pick.arm, inner, root, `${pointer}/oneOf/${pick.i}`);
}

function sampleTyped(schema: Schema, variant: Variant, root: Schema, pointer: string): unknown
{
    const type = schema.type as string;

    if (typeof schema.format === "string") { return sampleFormat(type, schema.format, variant, pointer); }

    if (typeof schema.pattern === "string") { return samplePattern(type, schema.pattern, variant, pointer); }

    if (type in SCALARS) { return SCALARS[type][variant]; }

    if (type === "array") { return [sampleValue(schema.items as Schema, variant, root, `${pointer}/items`)]; }

    if (type === "object")
    {
        const props = (schema.properties ?? {}) as Record<string, Schema>;
        const required = (schema.required ?? []) as string[];

        return Object.fromEntries(required.map((k) =>
            [k, sampleValue(props[k], variant, root, `${pointer}/properties/${k}`)]));
    }

    throw new Error(`sampleValue: no type, const, oneOf or $ref at ${pointer}; extend a2ui/sample-values.ts.`);
}

function sampleFormat(type: string, format: string, variant: Variant, pointer: string): string
{
    if (type !== "string" || !(format in FORMATS))
    {
        throw new Error(`sampleValue: unsupported format "${format}" on type "${type}" at ${pointer}; extend `
            + "FORMATS in a2ui/sample-values.ts.");
    }

    return FORMATS[format][variant];
}

/**
 * A string pattern takes its PATTERNS samples, or the plain string sample
 * when that already matches it, such as a class-token pattern (ExplorerPicker's
 * icon, readiness step 2 B7); any other pattern is refused rather than guessed.
 */
function samplePattern(type: string, pattern: string, variant: Variant, pointer: string): string
{
    const sample = type === "string" && pattern in PATTERNS ? PATTERNS[pattern][variant]
        : SCALARS.string[variant] as string;

    if (type !== "string" || !new RegExp(pattern, "u").test(sample))
    {
        throw new Error(`sampleValue: the sample "${sample}" does not match pattern "${pattern}" on type "${type}" `
            + `at ${pointer}; extend a2ui/sample-values.ts rather than guessing a value.`);
    }

    return sample;
}

function resolve(ref: string, root: Schema): Schema
{
    const m = /^#\/\$defs\/(.+)$/.exec(ref);
    const target = m ? (root.$defs as Record<string, Schema> | undefined)?.[m[1]] : undefined;

    if (!target) { throw new Error(`sampleValue: cannot resolve $ref ${ref} against the catalog's $defs.`); }

    return target;
}
