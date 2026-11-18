#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
// SPDX-License-Identifier: MIT
/*
 * ⚓ COMPONENT: QueryLanguage / BuildPipeline
 * 📜 PURPOSE: Builds dist/components/querylanguage/querylanguage.js (#205).
 *    The component imports the lexer and parser that ANTLR generated, and
 *    they import the `antlr4` runtime, so tsc's one-file-per-module output
 *    cannot serve it as one script. esbuild joins the component and the
 *    generated code into one file.
 *
 *    The runtime is NOT bundled in. It is served on its own from /lib/, under
 *    the library rule (LIB_MAINTENANCE.md), so its version is pinned, hashed
 *    and retired like every other library. Each `antlr4` import here reads
 *    window.antlr4, which /lib/antlr4-<version>.js publishes.
 * 🔗 RELATES: [[QueryLanguage]], [[BuildPipeline]], [[VendorClosure]]
 */

import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { build } from "esbuild";

const ANTLR4 = JSON.parse(readFileSync("package.json", "utf8")).devDependencies.antlr4;

/**
 * Every `antlr4` import becomes the namespace the served runtime publishes. Without it, the generated classes
 * would fail as they load with "Class extends value undefined", so the file says which script is missing.
 */
const antlr4FromWindow = {
    name: "antlr4-from-window",
    setup(b)
    {
        b.onResolve({ filter: /^antlr4$/ }, () => ({ path: "antlr4", namespace: "antlr4-global" }));
        b.onLoad({ filter: /.*/, namespace: "antlr4-global" }, () => ({
            contents: [
                "if (typeof window.antlr4 !== \"object\" || window.antlr4 === null) {",
                `  throw new Error("[QueryLanguage] Load /lib/antlr4-${ANTLR4}.js before querylanguage.js. `
                    + `It is the ANTLR runtime the generated parser needs.");`,
                "}",
                "module.exports = window.antlr4;",
            ].join("\n"),
            loader: "js",
        }));
    },
};

const result = await build({
    entryPoints: ["components/querylanguage/querylanguage.ts"],
    bundle: true,
    format: "iife",
    target: "es2020",
    outfile: "dist/components/querylanguage/querylanguage.js",
    plugins: [antlr4FromWindow],
    metafile: true,
    logLevel: "warning",
});

// Nothing but the component and its generated code may be in the file.
const inputs = Object.keys(result.metafile.inputs).filter((p) => !p.startsWith("antlr4-global:"));
const stray = inputs.filter((p) => !p.startsWith("components/querylanguage/"));

if (stray.length > 0)
{
    throw new Error(`[bundle-querylanguage] the file would hold more than the component: ${stray.join(", ")}`);
}
console.log(`[bundle-querylanguage] wrote dist/components/querylanguage/querylanguage.js from ${inputs.length} files`);

// The types a page reads, as every component publishes them. tsc writes the generated code's types too, and
// nothing outside the component imports those, so they are removed.
execFileSync("npx", ["tsc", "-p", "tsconfig.querylanguage.json", "--noEmit", "false", "--declaration",
    "--emitDeclarationOnly", "--rootDir", "components", "--outDir", "dist/components"], { stdio: "inherit" });
rmSync("dist/components/querylanguage/generated", { recursive: true, force: true });
console.log("[bundle-querylanguage] wrote dist/components/querylanguage/querylanguage.d.ts");
