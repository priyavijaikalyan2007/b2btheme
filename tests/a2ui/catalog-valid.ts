/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiCatalogValid
 * 📜 PURPOSE: Asserts that a value a component wrote back is valid for that
 *    prop in the built catalog (readiness spec §6.2), with the checker's own
 *    precompiled per-component validators, so "a real click wrote something"
 *    becomes "a real click wrote what the catalog promises".
 * 🔗 RELATES: [[AgentUiMessageChecker]], [[A2uiAdapterPage]]
 * ----------------------------------------------------------------------------
 */

import path from "node:path";
import { pathToFileURL } from "node:url";

type AjvError = { instancePath: string; schemaPath: string; message?: string };
type Validate = ((value: unknown) => boolean) & { errors?: AjvError[] | null };

const ROOT = path.join(__dirname, "..", "..");
let validators: Promise<Record<string, Validate>> | undefined;

/** Regenerates the validators from the current dist catalog once per worker, then imports them. */
function componentValidators(): Promise<Record<string, Validate>>
{
    validators ??= (async () =>
    {
        const build = await import(path.join(ROOT, "scripts", "agentui", "message-validator.mjs"));
        const out: string = await build.writeMessageValidator(ROOT);
        const mod = await import(`${pathToFileURL(out).href}?t=${Date.now()}`);

        return mod.messageValidators.components as Record<string, Validate>;
    })();

    return validators;
}

/**
 * Throws, with Ajv's errors, unless `{ component, [prop]: value }` is a valid
 * instance of `component` in the built catalog.
 */
export async function expectCatalogValid(component: string, prop: string, value: unknown): Promise<void>
{
    const validate = (await componentValidators())[component];

    if (!validate)
    {
        throw new Error(`${component} is not in the built catalog; run \`npm run build\`.`);
    }

    if (!validate({ id: "x", component, [prop]: value }))
    {
        throw new Error(`${component}.${prop} = ${JSON.stringify(value)} is not valid in the catalog: `
            + literalArmErrors(validate.errors ?? [], prop));
    }
}

/**
 * The errors from the prop's literal arm (anyOf/0): a value written back is a
 * literal, so the binding and function-call arms' complaints are noise.
 */
function literalArmErrors(errors: AjvError[], prop: string): string
{
    const arm = errors.filter((e) => e.schemaPath.includes(`/properties/${prop}/anyOf/0`));

    return (arm.length > 0 ? arm : errors).map((e) => `${e.instancePath} ${e.message ?? ""}`.trim()).join("; ");
}
