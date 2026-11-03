/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: FluentEmojiAdapter
 * 📜 PURPOSE: Turns the microsoft/fluentui-emoji checkout into fluent-emoji
 *    pack icons: the Color style at 32 px, with every skin tone an emoji
 *    declares, named by its CLDR name and filed by its Unicode group.
 *    specs/icon-packs.plan.md, Task 5.
 * 🔗 RELATES: [[IconPackLib]], [[IconPackRepack]], [[IconPackCheck]]
 * ⚡ FLOW: [assets/<Name>/metadata.json + Color/*.svg | <Tone>/Color/*.svg]
 *          -> [collect] -> [Icon[]]
 */

import fs from "node:fs";
import path from "node:path";
import { slugify, iconFileName } from "./lib.mjs";

const SIZE = 32;
const CATALOG = JSON.parse(fs.readFileSync(new URL("./fluent-emoji.categories.json", import.meta.url), "utf8"));
const TONES = {
    "Default": "color",
    "Light": "color-tone-light",
    "Medium-Light": "color-tone-medium-light",
    "Medium": "color-tone-medium",
    "Medium-Dark": "color-tone-medium-dark",
    "Dark": "color-tone-dark",
};

/** The nine category slugs, one per Unicode emoji group. */
export const CATEGORIES = Object.values(CATALOG.groups);

/** @returns {string} the pack variant for an upstream skin-tone folder. */
export function toneVariant(folder)
{
    if (!Object.hasOwn(TONES, folder))
    {
        throw new Error(`fluent-emoji: unknown skin-tone folder "${folder}"`);
    }
    return TONES[folder];
}

/** @returns {string} the category slug for a Unicode emoji group. */
export function groupCategory(group)
{
    if (!Object.hasOwn(CATALOG.groups, group))
    {
        throw new Error(`fluent-emoji: unknown emoji group "${group}"`);
    }
    return CATALOG.groups[group];
}

/** The one Color SVG in dir, as a path relative to assetsDir; throws on none or several. */
function colorSvg(assetsDir, dir)
{
    const colorDir = path.join(assetsDir, dir, "Color");
    const svgs = fs.existsSync(colorDir) ? fs.readdirSync(colorDir).filter((f) => f.endsWith(".svg")) : [];
    if (svgs.length !== 1)
    {
        throw new Error(`fluent-emoji: ${dir}/Color holds ${svgs.length} SVGs, expected exactly 1`);
    }
    return path.join(dir, "Color", svgs[0]);
}

/** variant -> upstream SVG (relative to assetsDir) for one asset folder. */
function sourcesOf(assetsDir, folder)
{
    const tones = fs.readdirSync(path.join(assetsDir, folder), { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name !== "Color").map((e) => e.name);
    if (tones.length === 0)
    {
        return { color: colorSvg(assetsDir, folder) };
    }
    if (fs.existsSync(path.join(assetsDir, folder, "Color")))
    {
        throw new Error(`fluent-emoji: ${folder} has both a Color folder and skin-tone folders`);
    }
    return Object.fromEntries(tones.map((t) => [toneVariant(t), colorSvg(assetsDir, path.join(folder, t))]));
}

/**
 * @param {string} assetsDir The checkout's assets/ directory.
 * @param {{ exclude?: Record<string, string> }} [catalog] exclude: upstream
 *    SVG (relative to assetsDir) -> why it is left out.
 * @returns {object[]} Icons with id, name, category, keywords, glyph, unicode, files.
 */
export function collect(assetsDir, catalog = CATALOG)
{
    const excluded = new Set(Object.keys(catalog.exclude ?? {}));
    for (const rel of excluded)
    {
        if (!fs.existsSync(path.join(assetsDir, rel)))
        {
            throw new Error(`fluent-emoji exclude entry ${rel} names no upstream file; remove it`);
        }
    }
    const icons = new Map();
    for (const folder of fs.readdirSync(assetsDir).sort())
    {
        const meta = JSON.parse(fs.readFileSync(path.join(assetsDir, folder, "metadata.json"), "utf8"));
        const name = slugify(meta.cldr);
        if (icons.has(name))
        {
            throw new Error(`fluent-emoji: ${icons.get(name).folder} and ${folder} both name "${name}"`);
        }
        const category = groupCategory(meta.group);
        const files = {};
        for (const [variant, rel] of Object.entries(sourcesOf(assetsDir, folder)))
        {
            if (!excluded.has(rel))
            {
                files[`${SIZE}-${variant}`] = {
                    src: path.join(assetsDir, rel), rel: `${category}/${iconFileName(name, SIZE, variant)}`,
                };
            }
        }
        const keywords = [...new Set([...meta.keywords, meta.tts].map((k) => k.toLowerCase()))];
        const { glyph, unicode } = meta;
        icons.set(name, { id: `${category}/${name}`, name, category, keywords, glyph, unicode, files, folder });
    }
    return [...icons.values()].filter((i) => Object.keys(i.files).length > 0)
        .map(({ folder, ...icon }) => icon).sort((a, b) => a.id.localeCompare(b.id));
}
