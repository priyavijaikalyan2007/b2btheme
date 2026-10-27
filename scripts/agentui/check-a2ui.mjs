#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiCheckCli
 * 📜 PURPOSE: Check agent-written A2UI messages against this library's
 *    catalog from the command line (#30 spec §3.5). File reading, format
 *    selection and the exit code only; the judging is a2ui-check.mjs, the
 *    same module the playground and the reference agent run.
 * 🔗 RELATES: [[AgentUiMessageChecker]], [[AgentUiMessageValidator]]
 * ⚡ FLOW: [file] -> [messages] -> [check] -> [findings] -> [exit 0 | 1 | 2]
 *
 * Usage: node scripts/agentui/check-a2ui.mjs <messages.json|messages.jsonl>
 *   .json  — an array of server-to-client messages
 *   .jsonl — one message per line, or a playground scenario (header line first)
 * Exit: 0 valid, 1 invalid, 2 usage error or missing input.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { check, formatFindings } from "./a2ui-check.mjs";
import { MESSAGE_VALIDATOR_OUT } from "./message-validator.mjs";

const USAGE = "Usage: node scripts/agentui/check-a2ui.mjs <messages.json|messages.jsonl>";
const VENDOR = path.join("scripts", "agentui", "vendor", "a2ui-v0_9_1");

/** A usage or input problem: exit 2 with this message. */
class InputError extends Error {}

/**
 * Runs the check.
 *
 * @param {string[]} args - Command-line arguments after the script.
 * @param {{root: string, out: (s: string) => void, err: (s: string) => void}} io
 * @returns {Promise<number>} The exit code.
 */
export async function run(args, io)
{
    try
    {
        if (args.length !== 1) { throw new InputError(USAGE); }

        const messages = readMessages(args[0]);
        const result = check(messages, await loadDeps(io.root));

        return report(result, messages.length, io);
    }
    catch (err)
    {
        if (!(err instanceof InputError)) { throw err; }

        io.err(`${err.message}\n`);
        return 2;
    }
}

/** The messages in `file`; the format follows the extension, never the content. */
function readMessages(file)
{
    const ext = path.extname(file);

    if (!fs.existsSync(file)) { throw new InputError(`${file} does not exist.`); }

    const text = fs.readFileSync(file, "utf8");

    if (ext === ".json") { return jsonArray(text, file); }
    if (ext === ".jsonl") { return jsonLines(text); }

    throw new InputError(`unknown extension ${ext || "(none)"}; use .json (an array) or .jsonl (one message per line).`);
}

function jsonArray(text, file)
{
    const value = parse(text, file);

    if (!Array.isArray(value)) { throw new InputError(`${file} must hold an array of messages.`); }

    return value;
}

/** One message per line; a first line `{"kind":"header",…}` marks a scenario, whose a2ui lines are checked. */
function jsonLines(text)
{
    const lines = text.replace(/\n$/, "").split("\n").map((line, i) =>
    {
        if (line.trim() === "") { throw new InputError(`line ${i + 1} is blank; .jsonl needs one message per line.`); }

        return parse(line, `line ${i + 1}`);
    });

    if (lines[0]?.kind !== "header") { return lines; }

    return lines.filter((l) => l.kind === "a2ui").map((l) => l.message);
}

function parse(text, where)
{
    try { return JSON.parse(text); }
    catch (err) { throw new InputError(`${where} is not valid JSON: ${err.message}`); }
}

/** The checker's dependencies: the generated validator, the catalogs, and web_core. */
async function loadDeps(root)
{
    const validatorPath = path.join(root, MESSAGE_VALIDATOR_OUT);
    const catalogPath = path.join(root, "dist", "a2ui", "catalog", "v1.json");

    if (!fs.existsSync(catalogPath)) { throw new InputError(`${catalogPath} is absent. Run \`npm run build:agentui\`.`); }
    if (!fs.existsSync(validatorPath))
    {
        throw new InputError(`${validatorPath} is absent. Run \`npm run build:demo:a2ui\` to generate it.`);
    }

    const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
    const { messageValidators } = await import(pathToFileURL(validatorPath).href);
    const { Catalog, MessageProcessor } = await import("@a2ui/web_core/v0_9");
    const { BASIC_FUNCTIONS, basicCatalog } = await import("@a2ui/web_core/v0_9/basic_catalog");
    const ours = read(catalogPath);

    return { validators: messageValidators, catalogJson: ours,
        webCore: { Catalog, MessageProcessor, basicCatalog, BASIC_FUNCTIONS },
        catalogs: { ours, basic: read(path.join(root, VENDOR, "catalogs", "basic", "catalog.json")),
            commonTypes: read(path.join(root, VENDOR, "common_types.json")) } };
}

function report(result, count, io)
{
    if (result.ok)
    {
        io.out(`OK: ${count} message(s), no findings\n`);
        return 0;
    }

    io.out(`${formatFindings(result.findings)}\n${result.findings.length} finding(s) in ${count} message(s)\n`);
    return 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

    process.exitCode = await run(process.argv.slice(2),
        { root, out: (s) => process.stdout.write(s), err: (s) => process.stderr.write(s) });
}
