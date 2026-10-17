/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: ERR-1. What every published factory does with a container that
 *    is not there.
 *
 * AGENTS.md states the rule as a table: "Container not found -> throw a
 * literate error", against "return a null object". ERR-1 recorded ten
 * offenders from a sample of fifteen and cited LITERATE_ERRORS.md, which is
 * about user-facing ErrorDialog copy and says nothing about factories.
 *
 * THE CEILING HERE IS BEHAVIOURAL, NOT TEXTUAL, AND THAT IS THE POINT.
 * scripts/audit-counts.mjs cannot hold this one. Every ratchet there reads
 * source text, and the thing being measured is two hops from the text: the
 * factory forwards to a constructor or to `show()`, and the decision to
 * warn rather than throw is taken there. A static read of the factory body
 * reported 2 of 46 validating. Calling them reports 9 of 74. The first
 * number was wrong in both directions, so this file calls them.
 *
 * A container is a PARAMETER for 76 factories and an OPTIONS FIELD for 31.
 * Both are located, and the probe writes the container to whichever place
 * the factory declares. See WHY A CONTAINER IS NOT ALWAYS A PARAMETER in
 * scripts/factory-census.mjs.
 *
 * Each factory is called twice. Once with a container that exists, which
 * proves the call reached the component, and once with one that does not.
 * A component that refuses a missing DEPENDENCY on both calls never saw the
 * container, and is counted apart rather than counted as passing.
 */

import { describe, test, expect, vi } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { factoryInventory, splitParams, emptyFor, stubFromInterface, interfaceFields } from "./factory-census.mjs";

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
    optionsStub: Record<string, unknown>;
};

/**
 * ERR-1. Published factories that take a container and do NOT throw when it
 * is absent. A ceiling, so it can only fall. It is not a floor on the ones
 * that do throw, because a floor cannot see a new unvalidated factory being
 * added beside the old ones.
 *
 * It was 65 when the census was first taken on 2026-10-17, then 51 after
 * the fourteen that failed without a word, and then 0.
 *
 * THAT ZERO WAS WRONG, AND IT IS WORTH KNOWING WHY BEFORE TRUSTING THIS ONE.
 * It was measured over the 76 factories that NAME a container parameter,
 * and 31 more carry the container on their options. Widening the scan the
 * same day found ten of those quiet, nine refusing with no remedy and one
 * refusing without naming the container. A zero over the wrong set reads
 * exactly like a zero over the right one, which is the failure DEBT-GATE-1
 * and DEBT-SEC-6 both were, and this ceiling has now had it once.
 *
 * So the zero below is worth something only because of its company: the
 * two wording tests, and "the inventory reaches the fleet", which fails if
 * the scan ever stops reaching the whole hundred and seven.
 */
const SILENT_ON_MISSING_CONTAINER = 0;

/** Factories whose container verdict a call cannot reach. See the header. */
const VERDICT_UNREACHABLE = 2;

const rows: Row[] = (factoryInventory() as Row[])
    .filter((r) => r.published && (r.containerIndex >= 0 || r.containerField !== null));

/** Where this factory takes its container, and what it will accept there. */
function containerTypeOf(r: Row): string
{
    return (r.containerField !== null ? r.containerFieldType : r.containerType) ?? "";
}

const MENTIONS = /container|no element with id|not found|no such|selector|is required/i;

type Verdict = "THROWS" | "OPAQUE" | "WARNS-AND-RETURNS" | "SILENT" | "UNREACHABLE";

/** The refusal message, kept so its wording can be asserted as well as counted. */
const refusals = new Map<string, { message: string; byId: boolean }>();

async function verdictFor(r: Row): Promise<Verdict>
{
    const mod = await import(`../components/${r.component}/${r.component}.ts`) as Record<string, unknown>;
    const fn = mod[r.name] as (...a: unknown[]) => unknown;

    const logs: string[] = [];
    const grab = (...a: unknown[]): void => { logs.push(a.map((x) => String(x)).join(" ")); };
    const spies = (["warn", "error", "log", "info", "debug"] as const)
        .map((m) => vi.spyOn(console, m).mockImplementation(grab));

    const call = (missing: boolean): { threw: string | null; logs: string[] } =>
    {
        document.body.textContent = "";
        const host = document.createElement("div");
        host.id = "ebt-census-host";
        document.body.appendChild(host);
        logs.length = 0;

        const wantsString = containerTypeOf(r).toLowerCase().includes("string");
        const value = missing
            ? (wantsString ? "ebt-census-absent" : null)
            : (wantsString ? host.id : host);

        const args: unknown[] = r.paramNames.map((p, i) =>
        {
            if (i === r.containerIndex) { return value; }
            if (i !== r.optionsIndex) { return {}; }

            // A container carried on the options goes in with the options.
            const opts: Record<string, unknown> = { ...r.optionsStub };
            if (r.containerField !== null) { opts[r.containerField] = value; }
            return opts;
        });

        try { fn(...args); return { threw: null, logs: [...logs] }; }
        catch (e) { return { threw: String(e), logs: [...logs] }; }
    };

    const control = call(false);
    const absent = call(true);
    spies.forEach((s) => s.mockRestore());
    document.body.textContent = "";

    if (absent.threw !== null && MENTIONS.test(absent.threw))
    {
        refusals.set(`${r.component}/${r.name}`, {
            message: absent.threw,
            byId: containerTypeOf(r).toLowerCase().includes("string"),
        });
        return "THROWS";
    }

    const strip = (s: string): string => s.replace(/ebt-census-\S+/g, "");
    if (control.threw !== null && absent.threw !== null
        && strip(control.threw) === strip(absent.threw)) { return "UNREACHABLE"; }
    if (control.threw !== null) { return "UNREACHABLE"; }

    // A throw that does not mention the container is still a refusal, and
    // it is still not the refusal the rule asks for. `container.appendChild`
    // on a null container reads "Cannot read properties of null", which
    // names the line that broke rather than the thing the caller got wrong.
    if (absent.threw !== null)
    {
        refusals.set(`${r.component}/${r.name}`, {
            message: absent.threw,
            byId: containerTypeOf(r).toLowerCase().includes("string"),
        });
        return "OPAQUE";
    }

    return absent.logs.some((l) => MENTIONS.test(l)) ? "WARNS-AND-RETURNS" : "SILENT";
}

describe("the census reads a signature correctly", () =>
{
    test("splitParams keeps a generic type argument whole", () =>
    {
        // The bug this exists for. Four gauge factories declare
        // `Omit<GaugeOptions, "shape">`, and a naive split read the comma
        // inside it as a parameter boundary.
        expect(splitParams('options: Omit<GaugeOptions, "shape">, container?: string'))
            .toHaveLength(2);
    });

    test("splitParams keeps an inline object and a callback whole", () =>
    {
        expect(splitParams("a: { x: 1, y: 2 }, b: (p: number, q: number) => void"))
            .toHaveLength(2);
    });

    test("splitParams returns one part for a single parameter", () =>
    {
        expect(splitParams("options: ToolbarOptions")).toHaveLength(1);
    });

    test("splitParams returns nothing for an empty list", () =>
    {
        expect(splitParams("")).toHaveLength(0);
    });

    test("emptyFor gives each shape an empty of its own type", () =>
    {
        expect(emptyFor("string[]")).toEqual([]);
        expect(emptyFor("ReadonlyArray<string>")).toEqual([]);
        expect(emptyFor("string")).toBe("x");
        expect(emptyFor("number")).toBe(0);
        expect(emptyFor("boolean")).toBe(false);
    });

    test("emptyFor leaves a callback out rather than inventing one", () =>
    {
        // A component that needs a callback should say so, and a stub that
        // supplied a no-op would hide that.
        expect(emptyFor("(value: string) => void")).toBeUndefined();
    });

    test("stubFromInterface fills required fields and skips optional ones", () =>
    {
        const src = "export interface XOptions\n{\n    items: string[];\n    title?: string;\n    count: number;\n}\n";
        expect(stubFromInterface(src, "XOptions")).toEqual({ items: [], count: 0 });
    });

    test("stubFromInterface is empty for an interface it cannot find", () =>
    {
        expect(stubFromInterface("", "Missing")).toEqual({});
    });

    test("emptyFor gives a Date rather than leaving one out", () =>
    {
        // createTimeline requires start and end. Omitting them made
        // `new Date(undefined)` an Invalid Date, and the component threw
        // on both calls, so its container verdict read as unreachable.
        expect(emptyFor("Date")).toBeInstanceOf(Date);
    });

    test("interfaceFields inherits the fields of a base interface", () =>
    {
        // The edge this exists for. A container declared on the base is
        // still a container, and a scan that stops at the brace would
        // call the deriving factory container-less.
        const src = "interface BOptions\n{\n    container: HTMLElement;\n}\n"
            + "export interface AOptions extends BOptions\n{\n    label: string;\n}\n";

        expect(interfaceFields(src, "AOptions").map((f: { name: string }) => f.name))
            .toEqual(["container", "label"]);
    });
});

describe("ERR-1 — a factory given a container that is not there", () =>
{
    test("the inventory reaches the fleet", () =>
    {
        // 107, derived another way: 128 published factories less the 21
        // that take no container at all. This floor was 50 while the scan
        // reached 76, which is the trouble with a floor set comfortably
        // below the number you already have. It never had to notice that
        // 31 factories were missing.
        expect(rows.length).toBeGreaterThan(100);
    });

    test("no more factories stay quiet than the recorded ceiling", async () =>
    {
        const verdicts = [];
        for (const r of rows) { verdicts.push({ r, v: await verdictFor(r) }); }
        const quiet = verdicts.filter((x) =>
            x.v === "WARNS-AND-RETURNS" || x.v === "SILENT" || x.v === "OPAQUE");
        const unreachable = verdicts.filter((x) => x.v === "UNREACHABLE");

        const names = quiet.map((x) => `${x.v} ${x.r.component}/${x.r.name}`).sort().join("\n  ");
        expect(quiet.length, `factories quiet on a missing container:\n  ${names}`)
            .toBeLessThanOrEqual(SILENT_ON_MISSING_CONTAINER);
        const blocked = unreachable.map((x) => `${x.r.component}/${x.r.name}`).sort().join("\n  ");
        expect(unreachable.length, `verdict unreachable:\n  ${blocked}`)
            .toBeLessThanOrEqual(VERDICT_UNREACHABLE);
    });

    test("every refusal names the container it could not find", () =>
    {
        // A ceiling counts refusals. It cannot tell a literate one from
        // `throw new Error("failed")`, and the rule asks for literate.
        // The container the caller actually passed has to appear, because
        // a message that does not name it cannot be acted on.
        expect(refusals.size).toBeGreaterThan(0);

        // Only when there was a value to name. A container typed as an
        // element is probed with null, and quoting "null" back at the
        // caller tells them nothing they did not just type.
        //
        // Collected rather than asserted one at a time. A gate that stops
        // at the first name makes you re-run it once per offender, and the
        // second census found ten at once.
        const anonymous = [...refusals]
            .filter(([, r]) => r.byId && !r.message.includes("ebt-census-absent"))
            .map(([who, r]) => `${who}: ${r.message}`);

        expect(anonymous, `refusals that do not name the container:\n  ${anonymous.join("\n  ")}`)
            .toHaveLength(0);
    });

    test("every refusal says what to do about it", () =>
    {
        // FALLBACK-9's wording: name the fault, then the remedy.
        const remediless = [...refusals]
            .filter(([, r]) => !/insert|load|create|provide|pass|omit|before/i.test(r.message))
            .map(([who, r]) => `${who}: ${r.message}`);

        expect(remediless, `refusals with no remedy:\n  ${remediless.join("\n  ")}`)
            .toHaveLength(0);
    });
});
