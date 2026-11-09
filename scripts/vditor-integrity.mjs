/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: VditorIntegrity
 * 📜 PURPOSE: Build a copy of Vditor's entry file that loads its renderers
 *    with integrity hashes. Vditor adds the script and stylesheet tags for
 *    lute, highlight.js, KaTeX, Mermaid and its other renderers itself, with
 *    no `integrity`. This copy holds a SHA-384 table of every script and
 *    stylesheet in the served tree, and its loaders put the matching hash on
 *    each tag. The page hashes the entry, the entry hashes the rest.
 * 🔗 RELATES: [[VendorClosure]], [[CdnContract]], [[MarkdownEditor]]
 * ⚡ FLOW: [/lib/vditor-<ver>/ tree] -> [hashTable] -> [patchEntry]
 *          -> [dist/lib/vditor-integrity-<ver>.js]
 *
 * WHY A NEW FILE, NOT AN EDIT OF THE SERVED ENTRY
 * -----------------------------------------------
 * `/lib/vditor-3.11.2/dist/index.min.js` is immutable, and pages already pin
 * its hash. Changing its bytes would make every one of those pages refuse it.
 * The tree stays a verbatim copy of the npm release, and this file is the one
 * place that differs from it.
 *
 * WHY EACH PATCH MUST MATCH EXACTLY ONCE
 * --------------------------------------
 * The patches find minified code by its text. The next Vditor release renames
 * those variables, so a patch would find nothing and the copy would load its
 * renderers unchecked. A missed or doubled match therefore fails the build.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** The parts of the tree the loaders fetch from. */
const HASHED_DIRS = ["dist/js", "dist/css"];
const HASHED_FILE = /\.(?:js|css)$/;

/**
 * A served path the lookup can read back from a URL unchanged. The browser
 * reports a URL's path percent-encoded, so a name with any other character
 * would never match its own entry.
 */
const SAFE_PATH = /^[A-Za-z0-9._/-]+$/;

function sriOf(buffer)
{
    return "sha384-" + createHash("sha384").update(buffer).digest("base64");
}

function filesUnder(baseDir, dir)
{
    const found = [];

    for (const name of readdirSync(join(baseDir, dir)))
    {
        const rel = `${dir}/${name}`;

        if (statSync(join(baseDir, rel)).isDirectory()) { found.push(...filesUnder(baseDir, rel)); }
        else if (HASHED_FILE.test(name)) { found.push(rel); }
    }

    return found;
}

/**
 * The SHA-384 of every script and stylesheet the loaders can fetch, keyed by
 * its path in the tree ("dist/js/lute/lute.min.js").
 *
 * Sorted, because `readdirSync` order differs between macOS and the Linux
 * build that deploys. An unsorted table would give the deployed file a
 * different hash from a local build.
 *
 * @param {string} baseDir The copied tree, such as dist/lib/vditor-3.11.2.
 * @returns {Record<string, string>} Path to SRI hash.
 */
export function hashTable(baseDir)
{
    const paths = HASHED_DIRS.flatMap((dir) => filesUnder(baseDir, dir)).sort();
    const problems = [];

    for (const path of paths)
    {
        if (!SAFE_PATH.test(path)) { problems.push(`${path} has a character a URL path encodes`); }
        if (path.indexOf("/dist/") !== -1) { problems.push(`${path} holds a second /dist/, so its key is ambiguous`); }
    }

    if (problems.length > 0)
    {
        throw new Error(`[vditor-integrity] The tree cannot be hashed by path:\n  ${problems.join("\n  ")}`);
    }

    return Object.fromEntries(paths.map((path) => [path, sriOf(readFileSync(join(baseDir, path)))]));
}

/**
 * The code put at the top of Vditor's module scope: the table, and the lookup
 * the loaders call. The key is the URL's path from its last `/dist/`, with no
 * query, so `?v=11.7.0` and any `cdn` host give the same key. Integrity holds
 * the bytes, not the host, so a match from another host is still checked.
 */
function prelude(table, version)
{
    return "var __vditorIntegrityTable=" + JSON.stringify(table) + ","
        + "__vditorIntegrity=function(u){"
        + "var p=new URL(u,document.baseURI).pathname,at=p.lastIndexOf(\"/dist/\"),"
        + "h=at<0?void 0:__vditorIntegrityTable[p.slice(at+1)];"
        + "if(!h)throw new Error(\"[vditor-integrity] \"+u+\" is not a script or stylesheet of vditor "
        + version + ", so it has no hash and is not loaded. Point vditor's cdn option at /lib/vditor-"
        + version + ".\");"
        + "return h};";
}

const MATHJAX_REFUSED = "[vditor-integrity] MathJax cannot be loaded with an integrity check, "
    + "because vditor runs it from downloaded text. Set math.engine to \\\"KaTeX\\\".";

/**
 * The edits, each with the exact text it replaces in Vditor 3.11.2's
 * dist/index.min.js. Module 413 holds the two script loaders, and module 290
 * holds the stylesheet loader. Vditor.preview() and the editor share them.
 */
export const PATCHES = [
    {
        name: "prelude",
        why: "the hash table and its lookup, in scope for every module",
        find: "return(()=>{var e={173:",
        replace: (table, version) => "return(()=>{" + prelude(table, version) + "var e={173:",
    },
    {
        name: "script loader",
        why: "lute, the language pack and every renderer: the tag gets its hash before it is added",
        find: "var i=document.createElement(\"script\");i.src=e,i.async=!0,",
        replace: () => "var i=document.createElement(\"script\");"
            + "i.integrity=__vditorIntegrity(e),i.crossOrigin=\"anonymous\",i.src=e,i.async=!0,",
    },
    {
        name: "stylesheet loader",
        why: "KaTeX's stylesheet, the highlight.js themes and the content theme",
        find: "var n=document.createElement(\"link\");n.id=t,",
        replace: () => "var n=document.createElement(\"link\");"
            + "n.integrity=__vditorIntegrity(e),n.crossOrigin=\"anonymous\",n.id=t,",
    },
    {
        // The browser cannot check a script made from downloaded text. Its
        // two callers are the icon set, which only adds an SVG sprite and so
        // can load like any other script, and MathJax, whose caller uses it
        // at once and so cannot.
        name: "synchronous loader",
        why: "icons load through the script loader; MathJax is refused",
        find: "var r=function(e,t){if(document.getElementById(t))return!1;var n=new XMLHttpRequest;"
            + "n.open(\"GET\",e,!1),n.setRequestHeader(\"Accept\",\"text/javascript, application/javascript, "
            + "application/ecmascript, application/x-ecmascript, */*; q=0.01\"),n.send(\"\");"
            + "var r=document.createElement(\"script\");r.type=\"text/javascript\",r.text=n.responseText,"
            + "r.id=t,document.head.appendChild(r)},",
        replace: () => "var r=function(e,t){if(/\\/dist\\/js\\/mathjax\\//.test(e))"
            + "throw new Error(\"" + MATHJAX_REFUSED + "\");return i(e,t)},",
    },
];

function occurrences(text, find)
{
    let count = 0;

    for (let at = text.indexOf(find); at !== -1; at = text.indexOf(find, at + 1)) { count += 1; }

    return count;
}

/**
 * Vditor's entry with the hash table in it and its three loaders patched.
 *
 * @param {string} source The tree's dist/index.min.js.
 * @param {Record<string, string>} table From hashTable().
 * @param {string} version The vditor version the tree serves.
 * @returns {string} The patched entry.
 */
export function patchEntry(source, table, version)
{
    const misses = PATCHES
        .map((p) => ({ p, count: occurrences(source, p.find) }))
        .filter(({ count }) => count !== 1)
        .map(({ p, count }) => `${p.name}: found ${count} times, not once`);

    if (misses.length > 0)
    {
        throw new Error(`[vditor-integrity] vditor ${version}'s entry no longer matches the patches. `
            + `Rewrite PATCHES in scripts/vditor-integrity.mjs for this release:\n  ${misses.join("\n  ")}`);
    }

    // A function replacement, so `$` in the table is never read as a pattern.
    return PATCHES.reduce((text, p) => text.replace(p.find, () => p.replace(table, version)), source);
}
