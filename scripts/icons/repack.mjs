#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: IconPackRepack
 * 📜 PURPOSE: `npm run icons:repack -- <pack> [sourceDir]`. Fetches the
 *    pack's pinned source (or reads a local one), runs its adapter and
 *    rewrites icon-packs/<pack>/. Run deliberately when a pin moves; the
 *    output is committed and reviewed. specs/icon-packs.plan.md.
 * 🔗 RELATES: [[IconPackFetch]], [[IconPackWriter]], [[FluentUiAdapter]], [[CloudIconAdapter]]
 * ⚡ FLOW: [sources.json pin] -> [fetch] -> [adapter] -> [writePack] -> [summary]
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fetchNpmTarball, sparseCheckout } from "./fetch.mjs";
import { writePack } from "./write-pack.mjs";
import * as fluentUi from "./fluent-ui.mjs";
import * as cloud from "./cloud.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SOURCES = JSON.parse(fs.readFileSync(path.join(HERE, "sources.json"), "utf8"));
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(HERE, name), "utf8"));

/** A fresh, empty work directory for one pack's download. */
function workDir(packId)
{
    const dir = path.join(os.tmpdir(), `icon-packs-${packId}`);
    fs.rmSync(dir, { recursive: true, force: true });
    return dir;
}

const ADAPTERS = {
    "fluent-ui": (source) =>
    {
        const dir = workDir("fluent-ui");
        const pkg = fetchNpmTarball(source.svg, path.join(dir, "npm"));
        const git = sparseCheckout(source.git, path.join(dir, "git"));
        const icons = fluentUi.collect(path.join(pkg, "icons"), path.join(git, "assets"),
            readJson("fluent-ui.categories.json"));
        return { icons, licenseSrc: path.join(git, "LICENSE") };
    },
    aws: (source, sourceDir) => cloudPack("aws", source, sourceDir),
    azure: (source, sourceDir) => cloudPack("azure", source, sourceDir),
    gcp: (source, sourceDir) => cloudPack("gcp", source, sourceDir),
};

/** The cloud packs read a local directory: cloud-icons/<Provider> unless another is given. */
function cloudPack(packId, source, sourceDir = source.local.dir)
{
    if (!fs.existsSync(sourceDir))
    {
        throw new Error(`${packId}: ${sourceDir} does not exist. cloud-icons/ was removed after the migration; `
            + `run git worktree add <tmp> ${source.local.commit} and pass <tmp>/${source.local.dir}`);
    }
    return { icons: cloud.collect(packId, sourceDir, readJson("cloud.categories.json")[packId]), licenseSrc: null };
}

function main()
{
    const [packId] = process.argv.slice(2);
    const source = SOURCES[packId];
    const adapter = ADAPTERS[packId];
    if (!source || !adapter)
    {
        throw new Error(`unknown pack "${packId}"; known: ${Object.keys(ADAPTERS).join(", ")}`);
    }
    const { icons, licenseSrc } = adapter(source, process.argv[3]);
    const { fileCount, bytes, perCategory } = writePack(packId, icons, source, licenseSrc);
    const general = perCategory.general ?? 0;
    console.log(`[repack] ${packId}: ${icons.length} icons, ${fileCount} SVGs, ${(bytes / 1048576).toFixed(1)} MB`);
    for (const [category, n] of Object.entries(perCategory).sort(([, a], [, b]) => b - a))
    {
        console.log(`  ${String(n).padStart(5)}  ${category}`);
    }
    console.log(`  general: ${(100 * general / fileCount).toFixed(1)}% of files`);
    const noMeta = icons.filter((i) => i.description === undefined && i.keywords.length <= i.name.split("-").length);
    if (packId === "fluent-ui")
    {
        console.log(`  ${noMeta.length} icons have no upstream metadata; their keywords come from their names`);
    }
}

main();
