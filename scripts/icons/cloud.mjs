/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: CloudIconAdapter
 * 📜 PURPOSE: Migrates the cloud-icons/<Provider>/ layout into the aws, azure
 *    and gcp packs. Every source file becomes exactly one pack file; nothing
 *    is merged or dropped. Records each file's old path so apps can switch.
 *    One-shot migration tooling for that layout. specs/icon-packs.plan.md,
 *    Task 2b.
 * 🔗 RELATES: [[IconPackLib]], [[IconPackRepack]]
 * ⚡ FLOW: [cloud-icons/<Provider>/**.svg] -> [collect] -> [Icon[] with legacyPaths]
 */

import fs from "node:fs";
import path from "node:path";
import { slugify, categorize, iconFileName } from "./lib.mjs";

const AWS_KINDS = { Services: "service", Resources: "resource", Categories: "category" };

/** Every .svg under dir, as paths relative to it with "/" separators. */
function listSvgs(dir)
{
    return fs.readdirSync(dir, { recursive: true })
        .filter((rel) => rel.endsWith(".svg"))
        .map((rel) => rel.split(path.sep).join("/"))
        .sort();
}

/** The SVG's longer viewBox side, rounded: the size its file name carries. */
function sizeOf(file)
{
    const m = /viewBox="([^"]+)"/.exec(fs.readFileSync(file, "utf8"));
    if (!m)
    {
        throw new Error(`${file}: no viewBox`);
    }
    const [, , w, h] = m[1].trim().split(/[\s,]+/).map(Number);
    return Math.round(Math.max(w, h));
}

function alias(rules, slug)
{
    return rules.aliases?.[slug] ?? slug;
}

/** AWS: <Kind>/<Category>/<Name>.svg, or Categories/<Name>.svg. */
function placeAws(parts, rules)
{
    const variant = AWS_KINDS[parts[0]];
    const depth = variant === "category" ? 2 : 3;
    if (!variant || parts.length !== depth)
    {
        throw new Error(`aws: unexpected path ${parts.join("/")}`);
    }
    const stem = parts.at(-1).replace(/\.svg$/, "");
    const category = alias(rules, slugify(variant === "category" ? stem : parts[1]));
    return { stem, category, variant };
}

/** Azure: <Category>/<Name>.svg. */
function placeAzure(parts, rules)
{
    if (parts.length !== 2)
    {
        throw new Error(`azure: unexpected path ${parts.join("/")}`);
    }
    return { stem: parts[1].replace(/\.svg$/, ""), category: alias(rules, slugify(parts[0])), variant: "color" };
}

/** GCP: <Product>/<Product>.svg, with no categories upstream; rules decide. */
function placeGcp(parts, rules)
{
    if (parts.length !== 2)
    {
        throw new Error(`gcp: unexpected path ${parts.join("/")}`);
    }
    const stem = parts[1].replace(/\.svg$/, "");
    const name = slugify(stem);
    return { stem, category: categorize(name, name.replace(/-/g, " "), rules.rules, rules.overrides), variant: "color" };
}

const PLACERS = { aws: placeAws, azure: placeAzure, gcp: placeGcp };

function checkOverrides(provider, rules)
{
    if (!rules.rules)
    {
        return;
    }
    const allowed = new Set([...rules.rules.map((r) => r.category), "general"]);
    for (const [name, category] of Object.entries(rules.overrides))
    {
        if (!allowed.has(category))
        {
            throw new Error(`${provider} override ${name} -> "${category}" is not a known category`);
        }
    }
}

/**
 * @param {"aws" | "azure" | "gcp"} provider
 * @param {string} sourceDir cloud-icons/<Provider>; its basename prefixes legacy paths.
 * @param {object} rules This provider's entry in cloud.categories.json.
 * @returns {object[]} Icons with id, name, category, keywords, files,
 *    legacyPaths and, when the name is in other categories too, alsoIn.
 */
export function collect(provider, sourceDir, rules)
{
    checkOverrides(provider, rules);
    const place = PLACERS[provider];
    const prefix = path.basename(sourceDir);
    const icons = new Map();
    for (const rel of listSvgs(sourceDir))
    {
        const src = path.join(sourceDir, rel);
        const { stem, category, variant } = place(rel.split("/"), rules);
        const name = slugify(stem);
        const size = sizeOf(src);
        const id = `${category}/${name}`;
        const key = `${size}-${variant}`;
        const icon = icons.get(id) ?? { id, name, category, keywords: name.split("-"), files: {}, legacyPaths: {} };
        if (icon.files[key])
        {
            throw new Error(`${provider}: ${icon.legacyPaths[key]} and ${prefix}/${rel} both map to ${id} ${key}`);
        }
        icon.files[key] = { src, rel: `${category}/${iconFileName(name, size, variant)}` };
        icon.legacyPaths[key] = `${prefix}/${rel}`;
        icons.set(id, icon);
    }
    const byName = new Map();
    for (const icon of icons.values())
    {
        byName.set(icon.name, [...(byName.get(icon.name) ?? []), icon.category]);
    }
    for (const icon of icons.values())
    {
        const others = byName.get(icon.name).filter((c) => c !== icon.category);
        if (others.length > 0)
        {
            icon.alsoIn = others.sort();
        }
    }
    return [...icons.values()].sort((a, b) => a.id.localeCompare(b.id));
}
