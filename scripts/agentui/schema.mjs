/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiSchemaEmitter
 * 📜 PURPOSE: Emit JSON Schema for the approved data members of each
 *    factory's options with typia 12.2.1. Spec §4.
 * 🔗 RELATES: [[AgentUiClassifier]], [[AgentUiNormalise]]
 * ⚡ FLOW: [entry descriptor] -> [entrySource] -> [ts.Program + typia transform]
 *          -> [evaluated unit] -> [normalise.mjs]
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

import { readTsconfig } from "./classify.mjs";

const require = createRequire(import.meta.url);

// @dependency: typia 12.2.1 (devDependency, exact pin). Do not move to 15.x
// without the nested-hazard gate: 15 inlines DOM types silently (spec §4).
const typiaTransform = require("typia/lib/transform").default;

/**
 * The TypeScript source of one typia entry file.
 *
 * @param entry    - { alias, file, factory, paramIndex, pick, providers }.
 * @param cacheDir - Directory the entry file is written to.
 * @returns The source text.
 */
export function entrySource(entry, cacheDir)
{
    const pick = entry.pick.length > 0 ? entry.pick.map((n) => JSON.stringify(n)).join(" | ") : "never";
    const extras = entry.providers.flatMap((p) => [
        `    ${p.params}?: Parameters<NonNullable<Options[${JSON.stringify(p.option)}]>>[0];`,
        `    ${p.response}?: Awaited<ReturnType<NonNullable<Options[${JSON.stringify(p.option)}]>>>;`,
    ]);
    const shape = extras.length > 0 ? [`Pick<Options, ${pick}> & {`, ...extras, "}"] : [`Pick<Options, ${pick}>`];

    return [
        "import typia from \"typia\";",
        `import type { ${entry.factory} } from ${JSON.stringify(importPath(cacheDir, entry.file))};`,
        `type Options = NonNullable<Parameters<typeof ${entry.factory}>[${entry.paramIndex}]>;`,
        `export type ${entry.alias} = ${shape.join("\n")};`,
        `export default typia.json.schema<${entry.alias}, "3.1">();`,
        "",
    ].join("\n");
}

/** A relative, extensionless import path from the cache directory to a module. */
function importPath(cacheDir, file)
{
    const rel = path.relative(cacheDir, file).replace(/\.ts$/, "").split(path.sep).join("/");

    return rel.startsWith(".") ? rel : `./${rel}`;
}

/**
 * Emits a typia schema unit for every entry, in one TypeScript program.
 *
 * @param entries - Entry descriptors (see entrySource).
 * @param opts    - { tsconfigPath, cacheDir }.
 * @returns Map from entry id to { unit } or { error }.
 */
// @entrypoint
export function emitSchemas(entries, { tsconfigPath, cacheDir })
{
    fs.mkdirSync(cacheDir, { recursive: true });
    const files = entries.map((entry) =>
    {
        const file = path.join(cacheDir, `entry-${entry.id}.ts`);
        fs.writeFileSync(file, entrySource(entry, cacheDir));
        return file;
    });
    const config = readTsconfig(tsconfigPath);
    const program = ts.createProgram([...config.fileNames, ...files], emitOptions(config.options));

    return new Map(entries.map((entry, i) => [entry.id, emitOne(program, files[i])]));
}

/** The repo's compiler options, switched to emitting CommonJS. */
function emitOptions(options)
{
    return { ...options, module: ts.ModuleKind.CommonJS, noEmit: false, declaration: false,
        sourceMap: false, outDir: undefined, rootDir: undefined, noUnusedLocals: false };
}

/** Emits one entry through typia's transformer and evaluates it. */
function emitOne(program, file)
{
    const diagnostics = [];
    let js = "";
    const before = [typiaTransform(program, {}, { addDiagnostic: (d) => diagnostics.push(d) })];

    program.emit(program.getSourceFile(file), (name, text) =>
    {
        if (name.endsWith(".js")) { js = text; }
    }, undefined, false, { before });

    if (diagnostics.length > 0)
    {
        return { error: diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join(" | ") };
    }

    const out = file.replace(/\.ts$/, ".cjs");
    fs.writeFileSync(out, js);
    delete require.cache[out];

    return { unit: require(out).default };
}
