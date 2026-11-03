/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: FluentUiAdapter
 * 📜 PURPOSE: Turns the @fluentui/svg-icons release plus the upstream
 *    metadata.json files into fluent-ui pack icons: keeps regular and filled
 *    at 16 and 24 px and colour at every size, names and categorises each.
 *    specs/icon-packs.plan.md, Task 2.
 * 🔗 RELATES: [[IconPackLib]], [[IconPackRepack]]
 * ⚡ FLOW: [icons/*.svg + assets/<Name>/metadata.json] -> [collect] -> [Icon[]]
 */

import fs from "node:fs";
import path from "node:path";
import { slugify, categorize, iconFileName } from "./lib.mjs";

const NPM_NAME = /^([a-z0-9_]+?)_(\d+)_(regular|filled|color|light)\.svg$/;
const MONO_SIZES = new Set([16, 24]);

/**
 * @param {string} file An entry of the package's icons/ directory.
 * @returns {{ stem: string, size: number, style: string } | null}
 */
export function parseNpmName(file)
{
    const m = NPM_NAME.exec(file);
    return m ? { stem: m[1], size: Number(m[2]), style: m[3] } : null;
}

/** @returns {boolean} whether the pack keeps this size and style. */
export function keep({ size, style })
{
    return style === "color" || ((style === "regular" || style === "filled") && MONO_SIZES.has(size));
}

/** Upstream metadata keyed by the slug of its display name. Not every asset publishes one. */
function readMetadata(metaDir)
{
    const meta = new Map();
    for (const folder of fs.readdirSync(metaDir))
    {
        const file = path.join(metaDir, folder, "metadata.json");
        if (fs.existsSync(file))
        {
            const m = JSON.parse(fs.readFileSync(file, "utf8"));
            meta.set(slugify(m.name), m);
        }
    }
    return meta;
}

function keywordsOf(name, m)
{
    const words = name.split("-");
    if (!m)
    {
        return words;
    }
    const upstream = (m.keyword ?? "").split(",").map((k) => k.trim().toLowerCase())
        .filter((k) => k && k !== "fluent-icon");
    return [...new Set([...words, ...(m.metaphor ?? []).map((k) => k.toLowerCase()), ...upstream])];
}

/**
 * Fluent names read <object>_<modifier> (document_edit, calendar_clock), so
 * the first name word that matches a rule decides; the metadata words are
 * consulted only when no name word matches. An override beats both.
 * @returns {string}
 */
function categoryOf(name, haystack, catalog)
{
    if (Object.hasOwn(catalog.overrides, name))
    {
        return catalog.overrides[name];
    }
    for (const word of name.split("-"))
    {
        const category = categorize(name, word, catalog.rules, {});
        if (category !== "general")
        {
            return category;
        }
    }
    return categorize(name, haystack, catalog.rules, {});
}

/**
 * @param {string} svgDir The package's icons/ directory (top level only;
 *    its RTL/, LTR/ and per-language subfolders are not part of the pack).
 * @param {string} metaDir The checkout's assets/ directory.
 * @param {{ rules: { category: string, pattern: string }[], overrides: Record<string, string>,
 *    exclude?: Record<string, string> }} catalog exclude: upstream file -> why it is left out.
 * @returns {object[]} Icons with id, name, category, keywords, description?, files.
 */
export function collect(svgDir, metaDir, catalog)
{
    const allowed = new Set([...catalog.rules.map((r) => r.category), "general"]);
    for (const [name, category] of Object.entries(catalog.overrides))
    {
        if (!allowed.has(category))
        {
            throw new Error(`fluent-ui override ${name} -> "${category}" is not a known category`);
        }
    }
    const meta = readMetadata(metaDir);
    const excluded = new Set(Object.keys(catalog.exclude ?? {}));
    for (const file of excluded)
    {
        if (!fs.existsSync(path.join(svgDir, file)))
        {
            throw new Error(`fluent-ui exclude entry ${file} names no upstream file; remove it`);
        }
    }
    const icons = new Map();
    for (const entry of fs.readdirSync(svgDir, { withFileTypes: true }))
    {
        const parsed = entry.isFile() ? parseNpmName(entry.name) : null;
        if (!parsed || !keep(parsed) || excluded.has(entry.name))
        {
            continue;
        }
        const name = slugify(parsed.stem);
        let icon = icons.get(name);
        if (icon && icon.stem !== parsed.stem)
        {
            throw new Error(`fluent-ui: ${icon.stem} and ${parsed.stem} both name "${name}"`);
        }
        if (!icon)
        {
            const m = meta.get(name) ?? meta.get(name.replace(/-(rtl|ltr)$/, ""));
            const keywords = keywordsOf(name, m);
            const haystack = [...keywords, m?.description ?? ""].join(" ").toLowerCase();
            const category = categoryOf(name, haystack, catalog);
            icon = { id: `${category}/${name}`, name, category, keywords, files: {}, stem: parsed.stem };
            if (m?.description)
            {
                icon.description = m.description;
            }
            icons.set(name, icon);
        }
        icon.files[`${parsed.size}-${parsed.style}`] = {
            src: path.join(svgDir, entry.name),
            rel: `${icon.category}/${iconFileName(name, parsed.size, parsed.style)}`,
        };
    }
    return [...icons.values()].map(({ stem, ...icon }) => icon).sort((a, b) => a.id.localeCompare(b.id));
}
