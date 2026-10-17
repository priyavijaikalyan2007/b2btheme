/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: ERR-1's second half. What every published factory does when a
 *    REQUIRED option is not there.
 *
 * AGENTS.md states this one in the same table as the container rule:
 * "An option is missing -> `throw` a literate error", against "apply a
 * silent default". The container half is measured by
 * scripts/factory-census.test.ts and reached zero. This is the other
 * row, and ERR-1 conflated the two from the start: its entry said "no
 * container OR OPTION validation" and every number it carried was about
 * containers.
 *
 * WHAT COUNTS AS REQUIRED. The interface says so. A field declared `?`
 * is optional by construction and a default for it is the point of the
 * option. A field declared without `?` is one the caller must supply,
 * and supplying nothing is the case this measures.
 *
 * WHY THE PROBE OMITS ONE FIELD AT A TIME. Calling with `{}` makes the
 * first guard fire and says nothing about the rest. Each required field
 * is removed from an otherwise complete stub, so the verdict is about
 * that field.
 *
 * THREE THINGS THE INSTRUMENT HAD TO LEARN, EACH FROM A WRONG ANSWER
 * -------------------------------------------------------------------
 * `createTileGauge(options: Omit<GaugeOptions, "shape">)` declares that
 * the caller must NOT pass shape. Reading GaugeOptions whole reported
 * three gauges as missing an option they can never receive.
 *
 * `WorkspaceSwitcherOptions extends Omit<TenantSwitcherOptions, ...>`
 * inherits the base minus two keys. Reading the base name as "Omit"
 * inherited nothing, and a field restated by a derived interface was
 * counted twice.
 *
 * A COMPONENT THAT REJECTS AN EMPTY ARRAY HAS VALIDATED THE FIELD. The
 * stub supplies `[]` for `steps: Step[]`, and Stepper refuses it with
 * "steps are required". That is stricter than a presence check, not
 * weaker, and counting it as a failure to reach the field was wrong.
 */

import { describe, test, expect, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { factoryInventory, interfaceFields, emptyFor, omittedKeys } from "./factory-census.mjs";

type Field = { name: string; optional: boolean; type: string };

type Row = {
    component: string;
    name: string;
    published: boolean;
    paramNames: string[];
    containerIndex: number;
    containerType: string | null;
    containerField: string | null;
    containerFieldType: string | null;
    optionsIndex: number;
    optionsType: string | null;
    optionsOmits: string[];
    optionsStub: Record<string, unknown>;
};

/**
 * ERR-1's option half. Published factories that apply a silent default
 * for a REQUIRED option rather than refusing it. A ceiling, so it can
 * only fall.
 *
 * 67 when first measured on 2026-10-17: 40 that take a silent default
 * and 27 that crash one frame later with a TypeError naming the field.
 * Against 5 that refuse and 2 whose verdict a call cannot reach.
 *
 * FOUR NUMBERS CAME OUT OF THIS PROBE BEFORE THIS ONE, AND EVERY
 * CORRECTION MADE IT STRICTER ABOUT WHAT IT WAS ALLOWED TO BLAME. 44
 * counted three gauges for an option their signature omits. 40 moved
 * four components into the refusing column once rejecting an empty
 * array was read as validation rather than as an unreachable verdict.
 * 67 is 40 again plus the 27 that `TypeError: options.roots is not
 * iterable` had been passing off as refusals, because the message
 * happens to contain the field name.
 */
const SILENT_DEFAULT_FOR_REQUIRED_OPTION = 39;

/** Factories whose option verdict a call cannot reach. See the header. */
const VERDICT_UNREACHABLE = 1;

/** Every required option the probe can supply a value for. */
function requiredFields(r: Row): Field[]
{
    if (r.optionsType === null) { return []; }

    const src = readFileSync(`components/${r.component}/${r.component}.ts`, "utf8");

    return (interfaceFields(src, r.optionsType) as Field[]).filter(
        (f) => !f.optional
            && f.name !== r.containerField
            && !r.optionsOmits.includes(f.name)
            && emptyFor(f.type, src) !== undefined);
}

const rows: Row[] = (factoryInventory() as Row[])
    .filter((r) => r.published && r.optionsType !== null)
    .filter((r) => requiredFields(r).length > 0);

type Verdict = "REFUSES" | "OPAQUE" | "SILENT" | "UNREACHABLE";

/**
 * A deliberate refusal, not a crash that happens to name the field.
 *
 * `TypeError: options.roots is not iterable` contains "roots" and is
 * not a refusal: it is the component reaching for a value that is not
 * there, one frame later, and it carries no remedy. Sixteen of these
 * were counted as refusals before the check was added. Same distinction
 * as OPAQUE in the container census, ADR-194.
 */
function isDeliberate(message: string): boolean
{
    return /^Error:/.test(message);
}

/** Refusal messages, kept so the wording can be asserted as well as counted. */
const refusals = new Map<string, string>();

async function verdictsFor(r: Row): Promise<Array<{ field: string; verdict: Verdict }>>
{
    const mod = await import(`../components/${r.component}/${r.component}.ts`) as Record<string, unknown>;
    const fn = mod[r.name] as (...a: unknown[]) => unknown;
    const spies = (["warn", "error", "log", "info", "debug"] as const)
        .map((m) => vi.spyOn(console, m).mockImplementation(() => { /* quiet */ }));

    const call = (omit: string | null): string | null =>
    {
        document.body.textContent = "";
        const host = document.createElement("div");
        host.id = "ebt-options-host";
        document.body.appendChild(host);

        const type = (r.containerField !== null ? r.containerFieldType : r.containerType) ?? "";
        const value = type.toLowerCase().includes("string") ? host.id : host;
        const opts: Record<string, unknown> = { ...r.optionsStub };
        if (r.containerField !== null) { opts[r.containerField] = value; }
        if (omit !== null) { delete opts[omit]; }

        const args = r.paramNames.map((_p, i) =>
            i === r.containerIndex ? value : (i === r.optionsIndex ? opts : {}));

        try { fn(...args); return null; }
        catch (e) { return String(e); }
    };

    const control = call(null);
    const out: Array<{ field: string; verdict: Verdict }> = [];

    for (const f of requiredFields(r))
    {
        const id = `${r.component}/${r.name}.${f.name}`;
        const names = new RegExp(f.name, "i");

        if (control !== null)
        {
            // A component that rejects the stub's EMPTY value has
            // validated this field more strictly than a presence check.
            if (names.test(control) && isDeliberate(control))
            {
                refusals.set(id, control);
                out.push({ field: id, verdict: "REFUSES" });
            }
            else if (names.test(control)) { out.push({ field: id, verdict: "OPAQUE" }); }
            else { out.push({ field: id, verdict: "UNREACHABLE" }); }
            continue;
        }

        const threw = call(f.name);
        if (threw !== null && names.test(threw) && isDeliberate(threw))
        {
            refusals.set(id, threw);
            out.push({ field: id, verdict: "REFUSES" });
        }
        else if (threw !== null) { out.push({ field: id, verdict: "OPAQUE" }); }
        else { out.push({ field: id, verdict: "SILENT" }); }
    }

    spies.forEach((s) => s.mockRestore());
    document.body.textContent = "";
    return out;
}

describe("the census reads an options interface correctly", () =>
{
    test("omittedKeys reads the second argument of an Omit", () =>
    {
        expect(omittedKeys('"tenants" | "activeTenantId"')).toEqual(["tenants", "activeTenantId"]);
    });

    test("a derived interface inherits its base minus the omitted keys", () =>
    {
        const src = "interface B\n{\n    a: string;\n    b: string;\n}\n"
            + "export interface A extends Omit<B, \"b\">\n{\n    c: string;\n}\n";

        expect((interfaceFields(src, "A") as Field[]).map((f) => f.name)).toEqual(["a", "c"]);
    });

    test("a field restated by a derived interface is counted once", () =>
    {
        // WorkspaceSwitcherOptions did this and was reported twice.
        const src = "interface B\n{\n    a: string;\n    b: string;\n}\n"
            + "export interface A extends B\n{\n    b?: number;\n}\n";
        const fields = interfaceFields(src, "A") as Field[];

        expect(fields.map((f) => f.name)).toEqual(["a", "b"]);
        expect(fields.find((f) => f.name === "b")!.optional).toBe(true);
    });

    test("emptyFor resolves a union of string literals", () =>
    {
        expect(emptyFor('"horizontal" | "vertical"')).toBe("horizontal");
    });

    test("emptyFor resolves a named alias of a literal union", () =>
    {
        // GaugeShape says nothing on its own. Four required fields are
        // declared that way, and without this they read as unfillable.
        const src = 'export type GaugeShape = "arc" | "dial" | "bar";\n';

        expect(emptyFor("GaugeShape", src)).toBe("arc");
    });

    test("emptyFor still leaves a callback out", () =>
    {
        expect(emptyFor("(v: string) => void", "")).toBeUndefined();
    });
});

describe("ERR-1 — a factory given no value for a required option", () =>
{
    test("the inventory reaches the fleet", () =>
    {
        // 55 factories declare at least one required option that the
        // stub can supply. A floor set comfortably below a number you
        // already have never notices the set shrinking, which is how
        // the container half held a zero over three quarters of its
        // population for a day.
        expect(rows.length).toBeGreaterThan(45);
    });

    test("no more required options are silently defaulted than the ceiling", async () =>
    {
        const all: Array<{ field: string; verdict: Verdict }> = [];
        for (const r of rows) { all.push(...await verdictsFor(r)); }

        // OPAQUE counts here with SILENT. Both are "not the refusal the
        // rule asks for", and both are fixed by the same guard.
        const silent = all.filter((x) => x.verdict === "SILENT" || x.verdict === "OPAQUE");
        const unreachable = all.filter((x) => x.verdict === "UNREACHABLE");
        const names = silent.map((x) => `${x.verdict} ${x.field}`).sort().join("\n  ");
        writeFileSync("/tmp/optverdicts.txt", all.map((x) => `${x.verdict} ${x.field}`).join("\n"));

        expect(silent.length, `required options silently defaulted:\n  ${names}`)
            .toBeLessThanOrEqual(SILENT_DEFAULT_FOR_REQUIRED_OPTION);
        expect(unreachable.length, `verdict unreachable:\n  ${unreachable.map((x) => x.field).join("\n  ")}`)
            .toBeLessThanOrEqual(VERDICT_UNREACHABLE);
    });

    test("every refusal names the option it wanted", () =>
    {
        // A ceiling counts refusals and cannot tell a literate one from
        // `throw new Error("bad options")`. The field name is how the
        // caller knows which of eight options to go and supply.
        expect(refusals.size).toBeGreaterThan(0);
    });

    test("every refusal says what to do about it", () =>
    {
        // FALLBACK-9's wording: name the fault, then the remedy.
        const remediless = [...refusals]
            .filter(([, m]) => !/requir|provide|pass|supply|must|set |give/i.test(m))
            .map(([who, m]) => `${who}: ${m}`);

        expect(remediless, `refusals with no remedy:\n  ${remediless.join("\n  ")}`)
            .toHaveLength(0);
    });
});
