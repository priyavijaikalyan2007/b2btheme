/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: IconPackLib
 * 📜 PURPOSE: The naming, SVG-safety and categorisation rules shared by the
 *    icon-pack repack tool and check [30]. Pure functions, no file access.
 *    specs/icon-packs.plan.md.
 * 🔗 RELATES: [[IconPackRepack]], [[IconPackCheck]]
 * ⚡ FLOW: [upstream names + SVG text] -> [slugify / validateSvg / categorize]
 *          -> [pack file names, problems, categories]
 */

import { JSDOM } from "jsdom";

const { DOMParser, NodeFilter } = new JSDOM("").window;
const SVG_NS = "http://www.w3.org/2000/svg";

// Elements that can run code, pull in other documents or rewrite attributes
// over time (SMIL can animate an href to javascript:). No icon needs any.
const BANNED = new Set([
    "script", "foreignobject", "iframe", "embed", "object",
    "animate", "set", "animatemotion", "animatetransform", "discard",
]);

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Turns an upstream name into a lowercase ASCII kebab-case name.
 * "Flag: United States" -> "flag-united-states"; "Piñata" -> "pinata".
 * @param {string} text
 * @returns {string}
 */
export function slugify(text)
{
    const s = text.normalize("NFKD").replace(/[̀-ͯ]/g, "")
        .replace(/&/g, " and ").replace(/#/g, " hash ").replace(/\*/g, " asterisk ")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!SLUG.test(s))
    {
        throw new Error(`slugify: "${text}" leaves no usable name`);
    }
    return s;
}

/**
 * @param {string} name
 * @param {number} size
 * @param {string} variant
 * @returns {string} "<name>-<size>-<variant>.svg"
 */
export function iconFileName(name, size, variant)
{
    return `${name}-${size}-${variant}.svg`;
}

/**
 * Inverse of iconFileName for one pack's variants.
 * @param {string} file
 * @param {string[]} variants
 * @returns {{ name: string, size: number, variant: string } | null} null when
 *    the file does not fit the scheme.
 */
export function parseIconFileName(file, variants)
{
    // Longest variant first, so "color-tone-medium-dark" is not read as a
    // name ending in "-tone-medium" with the variant "dark".
    for (const v of [...variants].sort((a, b) => b.length - a.length))
    {
        const m = new RegExp(`^([a-z0-9]+(?:-[a-z0-9]+)*)-(\\d+)-${v}\\.svg$`).exec(file);
        if (m)
        {
            return { name: m[1], size: Number(m[2]), variant: v };
        }
    }
    return null;
}

/**
 * Checks one SVG against the pack safety and sizing rules.
 * @param {string} text
 * @param {number} size The size the file name claims.
 * @param {{ square?: boolean }} [options] square: false allows a non-square
 *    viewBox, sized by its longer side rounded.
 * @returns {string[]} Problems; empty means valid.
 */
export function validateSvg(text, size, { square = true } = {})
{
    const problems = [];
    if (/<!DOCTYPE|<!ENTITY/i.test(text))
    {
        problems.push("DOCTYPE/ENTITY declarations are not allowed");
    }
    const root = parseSvgRoot(text);
    if (!root)
    {
        return [...problems, "not a well-formed <svg> document"];
    }
    problems.push(...checkSize(root, size, square));
    // A TreeWalker, not querySelectorAll: jsdom's selector engine keeps every
    // document it has queried alive, about 4 MB per large emoji, and a pack
    // of 3,000 of them runs out of heap.
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let el = root; el; el = walker.nextNode())
    {
        problems.push(...checkElement(el));
    }
    return problems;
}

/** @returns {Element | null} the <svg> root, or null when the text is not one. */
function parseSvgRoot(text)
{
    let doc;
    try
    {
        doc = new DOMParser().parseFromString(text, "image/svg+xml");
    }
    catch
    {
        return null;
    }
    const root = doc.documentElement;
    const bad = doc.getElementsByTagName("parsererror").length > 0
        || root.namespaceURI !== SVG_NS || root.localName !== "svg";
    return bad ? null : root;
}

function checkSize(root, size, square)
{
    const vb = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb.some(Number.isNaN) || vb[0] !== 0 || vb[1] !== 0)
    {
        return [`viewBox "${root.getAttribute("viewBox")}" must be "0 0 <w> <h>"`];
    }
    const [, , w, h] = vb;
    const problems = [];
    const sized = square ? (w === size && h === size) : Math.round(Math.max(w, h)) === size;
    if (!sized)
    {
        problems.push(square ? `viewBox must be "0 0 ${size} ${size}"`
            : `viewBox ${w}x${h} does not round to size ${size}`);
    }
    // width and height are not checked: they are the upstream's suggested
    // display size (Azure ships "0.25in", and "18" on a 100-unit viewBox),
    // and any CSS size overrides them. The viewBox is the design grid.
    return problems;
}

function checkElement(el)
{
    const problems = [];
    if (BANNED.has(el.localName.toLowerCase()))
    {
        problems.push(`<${el.localName}> is not allowed`);
    }
    for (const a of el.attributes)
    {
        const n = a.localName.toLowerCase();
        if (n.startsWith("on"))
        {
            problems.push(`event handler ${a.name}`);
        }
        if (n === "href" && !a.value.startsWith("#"))
        {
            problems.push(`external reference ${a.value}`);
        }
        if (unsafeCss(a.value))
        {
            problems.push(`unsafe value in ${a.name}`);
        }
    }
    if (el.localName === "style" && unsafeCss(el.textContent ?? ""))
    {
        problems.push("unsafe <style> content");
    }
    return problems;
}

/** True for CSS that can reach outside the file: any url() not to a #fragment. */
function unsafeCss(v)
{
    return /@import|javascript:|expression\(/i.test(v) || /url\(\s*(?!['"]?#)/i.test(v);
}

/**
 * @param {string} name
 * @param {string} haystack Lowercased words to match the rules against.
 * @param {{ category: string, pattern: string }[]} rules First match wins.
 * @param {Record<string, string>} overrides name -> category; beats the rules.
 * @returns {string} The category; "general" when no rule matches.
 */
export function categorize(name, haystack, rules, overrides)
{
    if (Object.hasOwn(overrides, name))
    {
        return overrides[name];
    }
    const hit = rules.find((r) => new RegExp(r.pattern).test(haystack));
    return hit ? hit.category : "general";
}

/**
 * @param {object} source The pack's sources.json entry.
 * @returns {string} Where the files came from, for manifests and attribution.
 */
export function sourceLabel(source)
{
    if (source.svg)
    {
        return `${source.svg.npm}@${source.svg.version} (git ${source.git.commit.slice(0, 12)})`;
    }
    if (source.git)
    {
        return `${source.git.repo.replace(/\.git$/, "")}@${source.git.commit}`;
    }
    return `${source.local.dir}/ at ${source.local.commit} (this repository)`;
}

/**
 * @param {string} packId
 * @param {object} source The pack's sources.json entry.
 * @param {{ id: string, files: Record<string, string> }[]} icons
 * @returns {object} The manifest.json content, icons sorted by id.
 */
export function buildManifest(packId, source, icons)
{
    const fileCount = icons.reduce((n, i) => n + Object.keys(i.files).length, 0);
    return {
        pack: packId, title: source.title, license: source.license, copyright: source.copyright,
        homepage: source.homepage, source: sourceLabel(source), subset: source.subset,
        variants: source.variants, fileCount,
        icons: [...icons].sort((a, b) => a.id.localeCompare(b.id)),
    };
}

/**
 * @param {string} packId
 * @param {string} name
 * @param {string} key "<size>-<variant>"
 * @returns {string} The icon's CSS class: "<packId>-<name>-<size>-<variant>".
 */
export function iconClass(packId, name, key)
{
    return `${packId}-${name}-${key}`;
}

/**
 * Builds a pack's icon stylesheets, so a component that takes icon classes
 * (Ribbon, Toolbar, SymbolPicker) can show a pack icon as
 * <i class="fluent-ui-table-24-color">. Colour icons are background images;
 * monochrome icons are masks over currentColor, so they follow the text
 * colour as Bootstrap Icons do. URLs are relative to the stylesheet, so the
 * CSS works on any host that serves the pack.
 * @param {string} packId
 * @param {object} source The pack's sources.json entry; source.css lists
 *    { file, match, mask } groups: match is a regex on the files key.
 * @param {{ name: string, files: Record<string, string> }[]} icons Manifest icons.
 * @returns {Record<string, string>} file name -> stylesheet text, icons sorted by class.
 */
export function buildPackCss(packId, source, icons)
{
    for (const icon of icons)
    {
        for (const key of Object.keys(icon.files))
        {
            const n = source.css.filter((g) => new RegExp(g.match).test(key)).length;
            if (n !== 1)
            {
                throw new Error(`${packId}: ${icon.name} ${key} matches ${n} stylesheets, expected exactly 1`);
            }
        }
    }
    const sheets = {};
    for (const group of source.css)
    {
        const match = new RegExp(group.match);
        const rules = [];
        for (const icon of icons)
        {
            for (const [key, rel] of Object.entries(icon.files))
            {
                if (match.test(key))
                {
                    const url = `url("${rel}")`;
                    const body = group.mask
                        ? `background-color:currentColor;mask:${url} center/contain no-repeat`
                        : `background-image:${url}`;
                    rules.push(`.${iconClass(packId, icon.name, key)}{${body}}`);
                }
            }
        }
        rules.sort();
        const copyright = source.copyright.replace(/\.?$/, ".");
        sheets[group.file] = `/* ${source.title}: ${group.file}. ${source.license}, ${copyright} `
            + `See LICENSE and ATTRIBUTION.md beside this file. */\n`
            + `[class^="${packId}-"],[class*=" ${packId}-"]{display:inline-block;width:1em;height:1em;`
            + `vertical-align:-.125em;background-repeat:no-repeat;background-position:center;background-size:contain}\n`
            + rules.join("\n") + "\n";
    }
    return sheets;
}
