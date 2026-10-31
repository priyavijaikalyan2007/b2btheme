// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiCheckCli. `node scripts/agentui/check-a2ui.mjs <file>`
 *    (#30 spec §3.5): the format follows the extension, a scenario's header
 *    line selects its a2ui lines, exit 0/1/2, and a missing input names the
 *    command that produces it.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

import { writeMessageValidator } from "./message-validator.mjs";
import { run } from "./check-a2ui.mjs";

const REPO = path.resolve(__dirname, "..", "..");
const V = "v0.9.1";
const ID = "https://static.outcrop.us/a2ui/catalog/v1.json";
const VALID = [
    { version: V, createSurface: { surfaceId: "s", catalogId: ID } },
    { version: V, updateComponents: { surfaceId: "s", components: [{ id: "root", component: "Ruler" }] } },
    { version: V, updateDataModel: { surfaceId: "s", path: "/", value: {} } },
];
const INVALID = [VALID[0], { version: V, updateComponents: { surfaceId: "s", components: [{ id: "root",
    component: "Nope" }] } }];

let dir = "";

function file(name: string, text: string): string
{
    const p = path.join(dir, name);

    fs.writeFileSync(p, text);

    return p;
}

async function cli(args: string[], root = REPO): Promise<{ code: number; out: string; err: string }>
{
    let out = "";
    let err = "";
    const code = await run(args, { root, out: (s: string) => { out += s; }, err: (s: string) => { err += s; } });

    return { code, out, err };
}

beforeAll(async () =>
{
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-a2ui-"));
    await writeMessageValidator(REPO);
    // The first run() imports the generated validator and web_core, a one-time cost that took over 5s under the
    // full suite's load and failed whichever test came first, in CI too. Paid here, under this hook's 60s, every
    // test's own 5s limit still measures only its own work.
    await cli([file("warm.json", JSON.stringify(VALID))]);
}, 60_000);

describe("check-a2ui", () =>
{
    test("a valid .json array exits 0", async () =>
    {
        const r = await cli([file("ok.json", JSON.stringify(VALID))]);

        expect(r).toEqual({ code: 0, out: "OK: 3 message(s), no findings\n", err: "" });
    });

    test("an invalid .jsonl exits 1 and prints the findings", async () =>
    {
        const r = await cli([file("bad.jsonl", INVALID.map((m) => JSON.stringify(m)).join("\n"))]);

        expect(r.code).toBe(1);
        expect(r.out.startsWith('#1 updateComponents.components[0].component: unknown component "Nope"')).toBe(true);
        expect(r.out).toMatch(/1 finding\(s\) in 2 message\(s\)\n$/);
    });

    test("a scenario file checks only its a2ui lines", async () =>
    {
        const lines = [{ kind: "header", title: "t", provenance: "scripted" }, { kind: "user", text: "hi" },
            ...VALID.map((message) => ({ kind: "a2ui", message })), { kind: "say", text: "done" }];
        const r = await cli([file("scenario.jsonl", lines.map((l) => JSON.stringify(l)).join("\n"))]);

        expect(r).toEqual({ code: 0, out: "OK: 3 message(s), no findings\n", err: "" });
    });

    test("a blank line in .jsonl exits 2", async () =>
    {
        const r = await cli([file("blank.jsonl", `${JSON.stringify(VALID[0])}\n\n${JSON.stringify(VALID[1])}`)]);

        expect(r.code).toBe(2);
        expect(r.err).toMatch(/line 2 is blank; \.jsonl needs one message per line/);
    });

    test("a .json file that is not an array exits 2", async () =>
    {
        const r = await cli([file("obj.json", JSON.stringify(VALID[0]))]);

        expect(r.code).toBe(2);
        expect(r.err).toMatch(/must hold an array of messages/);
    });

    test("an unknown extension exits 2", async () =>
    {
        const r = await cli([file("x.txt", "[]")]);

        expect(r.code).toBe(2);
        expect(r.err).toMatch(/unknown extension \.txt; use \.json \(an array\) or \.jsonl \(one message per line\)/);
    });

    test("no argument exits 2 with usage", async () =>
    {
        const r = await cli([]);

        expect(r.code).toBe(2);
        expect(r.err).toMatch(/^Usage: node scripts\/agentui\/check-a2ui\.mjs <messages\.json\|messages\.jsonl>/);
    });

    test("a missing catalog exits 2 and names the command that builds it", async () =>
    {
        const empty = fs.mkdtempSync(path.join(os.tmpdir(), "check-a2ui-root-"));
        const r = await cli([file("ok2.json", JSON.stringify(VALID))], empty);

        expect(r.code).toBe(2);
        expect(r.err).toContain("dist/a2ui/catalog/v1.json is absent. Run `npm run build:agentui`");
    });

    test("a missing generated validator exits 2 and names the command that generates it", async () =>
    {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "check-a2ui-root-"));
        const catalog = path.join("dist", "a2ui", "catalog", "v1.json");

        fs.mkdirSync(path.join(root, path.dirname(catalog)), { recursive: true });
        fs.copyFileSync(path.join(REPO, catalog), path.join(root, catalog));

        const r = await cli([file("ok4.json", JSON.stringify(VALID))], root);

        expect(r.code).toBe(2);
        expect(r.err).toContain("message-validator.mjs is absent. Run `npm run build:demo:a2ui`");
    });

    test("the script runs as a command", () =>
    {
        const out = execFileSync("node", [path.join(REPO, "scripts", "agentui", "check-a2ui.mjs"),
            file("ok3.json", JSON.stringify(VALID))], { encoding: "utf8" });

        expect(out).toBe("OK: 3 message(s), no findings\n");
    });
});
