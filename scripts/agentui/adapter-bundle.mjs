/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiAdapterBundle
 * 📜 PURPOSE: Bundles a2ui/src with the catalog text, descriptors and
 *    validators the generator just produced into one ESM file, in-process,
 *    so the adapter and the catalog are written in the same dist swap and
 *    can never disagree (spec §3.4). The closure gate keeps @a2ui/* (and
 *    anything but Ajv's runtime helpers) out of what this origin serves.
 * 🔗 RELATES: [[AgentUiGenerator]], [[AgentUiAdapterValidators]], [[A2uiAdapter]]
 * ⚡ FLOW: [catalog + descriptors + validators] -> [esbuild] -> [v1.js + v1.d.ts]
 */

import fs from "node:fs";
import path from "node:path";

/** The only packages the adapter may serve: Ajv's standalone runtime helpers (spec §5.4). */
export const ALLOWED_PACKAGES = Object.freeze(["ajv", "fast-deep-equal"]);

const VIRTUAL = /^virtual:outcrop\/(catalog|descriptors|validators)$/;

/**
 * Builds the adapter bundle.
 *
 * @param input - { catalogText, descriptors, validatorsSource, repoRoot }.
 * @returns { js, dts, packages }.
 * @throws When the bundle would serve a package outside ALLOWED_PACKAGES.
 */
// @entrypoint
export async function bundleAdapter({ catalogText, descriptors, validatorsSource, repoRoot })
{
    const contents = {
        catalog: `export default ${JSON.stringify(catalogText)};`,
        descriptors: `export default ${JSON.stringify(descriptors)};`,
        validators: validatorsSource,
    };
    // Imported here, not at the top: esbuild refuses to load under jsdom, where the generator's tests run.
    const esbuild = await import("esbuild");
    const result = await esbuild.build({
        entryPoints: [path.join(repoRoot, "a2ui", "src", "index.ts")], bundle: true, format: "esm", platform: "browser",
        target: "es2020", minify: true, write: false, metafile: true, legalComments: "eof", logLevel: "silent",
        plugins: [virtualModules(contents, repoRoot)],
    });

    return {
        js: result.outputFiles[0].text,
        dts: fs.readFileSync(path.join(repoRoot, "a2ui", "src", "public.d.ts"), "utf8"),
        packages: closureOf(result.metafile),
    };
}

/** Resolves virtual:outcrop/* to the generated sources. */
function virtualModules(contents, repoRoot)
{
    return {
        name: "outcrop-virtual",
        setup(build)
        {
            build.onResolve({ filter: VIRTUAL }, (args) => ({ path: args.path, namespace: "outcrop-virtual" }));
            build.onLoad({ filter: /.*/, namespace: "outcrop-virtual" }, (args) =>
                ({ contents: contents[VIRTUAL.exec(args.path)[1]], loader: "js", resolveDir: repoRoot }));
        },
    };
}

/** The packages behind every node_modules input, checked against ALLOWED_PACKAGES. */
function closureOf(metafile)
{
    const found = new Map();

    for (const input of Object.keys(metafile.inputs))
    {
        const m = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(input);
        if (m) { found.set(m[1], input); }
    }

    const banned = [...found].filter(([pkg]) => !ALLOWED_PACKAGES.includes(pkg));

    if (banned.length > 0)
    {
        const list = banned.map(([pkg, input]) => `${pkg} (${input})`).join(", ");
        throw new Error(`The A2UI adapter bundle would serve ${list}. Only Ajv's runtime helpers `
            + `(${ALLOWED_PACKAGES.join(", ")}) are allowed; the element must not import @a2ui/* or any other package `
            + "(spec §4.1, §5.4).");
    }

    return [...found.keys()].sort();
}
