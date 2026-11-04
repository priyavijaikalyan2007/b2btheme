/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: IconPackWriter
 * 📜 PURPOSE: Rewrites icon-packs/<pack>/ from an adapter's icons: copies
 *    every SVG byte for byte, validates each copy, and writes manifest.json,
 *    the licence file (upstream LICENSE, or TERMS.md for the cloud packs),
 *    ATTRIBUTION.md, the icon stylesheets for packs that list css groups,
 *    and, for icons with legacy paths, legacy-map.json.
 *    specs/icon-packs.plan.md.
 * 🔗 RELATES: [[IconPackLib]], [[IconPackRepack]], [[IconPackCheck]]
 * ⚡ FLOW: [Icon[] + sources.json entry] -> [writePack] -> [icon-packs/<pack>/]
 */

import fs from "node:fs";
import path from "node:path";
import { buildManifest, buildPackCss, sourceLabel, validateSvg, parseIconFileName } from "./lib.mjs";

export const PACKS_ROOT = "icon-packs";
const DOCS_URL = "https://static.outcrop.us/docs/ICON_PACKS.html";

/** @returns {Record<string, string>} old cloud-icons path -> new pack-relative path. */
export function legacyMap(icons)
{
    const map = {};
    for (const icon of icons)
    {
        for (const [key, legacy] of Object.entries(icon.legacyPaths ?? {}))
        {
            map[legacy] = icon.files[key];
        }
    }
    return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
}

function attribution(source, manifest, categoryCount)
{
    const licenceFile = source.licenseFile;
    return `# ${source.title}

Redistributed by static.outcrop.us under ${source.license}. See ${licenceFile} in this folder.

- Copyright: ${source.copyright}
- Upstream: ${source.homepage}
- Source: ${sourceLabel(source)}
- Subset: ${source.subset}
- Files: ${manifest.fileCount} SVGs in ${categoryCount} categories (see manifest.json)

Changes: files were renamed to \`<name>-<size>-<variant>.svg\` and grouped into
category folders. The SVG files are otherwise byte-for-byte identical to the
source. Docs: ${DOCS_URL}
`;
}

function terms(source)
{
    const provider = source.title.replace(/ (Architecture )?Icons$/, "");
    return `# ${source.title}: terms of use

These icons are not under an open licence. They are redistributed here so
that apps can depict ${provider} services in architecture and infrastructure
diagrams, as the provider permits.

- Icon page: ${source.homepage}
- Terms: ${source.terms}

Use these icons only to depict ${provider} services in architecture and
infrastructure diagrams. Their inclusion implies no endorsement by,
sponsorship by or affiliation with the provider.

${source.copyright}
`;
}

/**
 * @param {string} packId
 * @param {object[]} icons Adapter output; files map "<size>-<variant>" to { src, rel }.
 * @param {object} source The pack's sources.json entry.
 * @param {string | null} licenseSrc Upstream LICENSE to copy verbatim; null
 *    for packs whose licenceFile is TERMS.md.
 * @returns {{ fileCount: number, bytes: number, perCategory: Record<string, number> }}
 */
export function writePack(packId, icons, source, licenseSrc)
{
    const dir = path.join(PACKS_ROOT, packId);
    fs.rmSync(dir, { recursive: true, force: true });
    const problems = [];
    let bytes = 0;
    const perCategory = {};
    const manifestIcons = icons.map((icon) =>
    {
        const files = {};
        for (const [key, { src, rel }] of Object.entries(icon.files))
        {
            const dest = path.join(dir, rel);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(src, dest);
            const parsed = parseIconFileName(path.basename(rel), source.variants);
            const found = parsed
                ? validateSvg(fs.readFileSync(dest, "utf8"), parsed.size, { square: source.square })
                : ["file name does not fit <name>-<size>-<variant>.svg"];
            problems.push(...found.map((p) => `${rel}: ${p}`));
            bytes += fs.statSync(dest).size;
            perCategory[icon.category] = (perCategory[icon.category] ?? 0) + 1;
            files[key] = rel;
        }
        return { ...icon, files };
    });
    if (problems.length > 0)
    {
        throw new Error(`${packId}: ${problems.length} problem(s)\n  ${problems.join("\n  ")}`);
    }
    const manifest = buildManifest(packId, source, manifestIcons);
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    for (const [file, text] of Object.entries(source.css ? buildPackCss(packId, source, manifest.icons) : {}))
    {
        fs.writeFileSync(path.join(dir, file), text);
    }
    fs.writeFileSync(path.join(dir, "ATTRIBUTION.md"),
        attribution(source, manifest, Object.keys(perCategory).length));
    if (source.licenseFile === "LICENSE")
    {
        fs.copyFileSync(licenseSrc, path.join(dir, "LICENSE"));
    }
    else
    {
        fs.writeFileSync(path.join(dir, "TERMS.md"), terms(source));
        fs.writeFileSync(path.join(dir, "legacy-map.json"), JSON.stringify(legacyMap(manifestIcons), null, 2) + "\n");
    }
    return { fileCount: manifest.fileCount, bytes, perCategory };
}
