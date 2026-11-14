#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: VendorClosure
 * 📜 PURPOSE: Build the closure of third-party frontend libraries into single
 *    self-contained files at immutable versioned URLs, and publish an SRI
 *    manifest so consumers can emit integrity attributes without transcribing
 *    hashes by hand. DEBT-SEC-4 / ADR-149.
 * 🔗 RELATES: [[CdnContract]], [[NoFabricatedReads]]
 * ⚡ FLOW: [node_modules] -> [copy | esbuild bundle] -> [dist/lib/<name>-<ver>.js]
 *          -> [dist/lib-manifest.json] -> [consumer <script src integrity>]
 *
 * WHY A SINGLE FILE PER ASSET IS A HARD CONSTRAINT, NOT A PREFERENCE
 * ------------------------------------------------------------------
 * `integrity` attaches to a <script src> tag. It cannot attach to a bare
 * import specifier inside a module, so an artifact that resolves further
 * imports at runtime defeats the point — each of those arrives unverified.
 * Serving the closure and applying SRI are therefore ONE requirement.
 *
 * The closure claim is asserted from esbuild's metafile (which marks any
 * unresolved import as external), never from grepping the output. A regex
 * pass was tried first and reported three false positives from a class
 * method named `import`.
 */

import { createHash } from "node:crypto";
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

import { GATED_DIR, GATES } from "./gated.mjs";
import { RETAINED_DIR, currentProblems, noticeData, readRecord, recordCurrent, retainedPath, retainedProblems,
    sriOf, todayUtc, writeRecord } from "./lib-retention.mjs";
import { hashTable, patchEntry } from "./vditor-integrity.mjs";

const OUT_DIR = "dist/lib";
const MANIFEST = "dist/lib-manifest.json";

/**
 * The assets we serve. `kind` decides the strategy:
 *
 *   "copy"   the package already ships a self-contained UMD/IIFE build.
 *   "bundle" the package is ESM; esbuild inlines its closure into an IIFE
 *            that assigns `global`.
 *   "tree"   a directory, served whole, with one hashed entry.
 *   "patch"  a tree's entry, edited by a script and served as its own file.
 *
 * Versions are pinned as devDependencies so the lockfile pins them and
 * `npm audit` covers them — a vendored library with a known CVE becomes our
 * problem the moment we serve it.
 */
const ASSETS = [
    {
        name: "dompurify",
        kind: "copy",
        from: "node_modules/dompurify/dist/purify.min.js",
        global: "DOMPurify",
        // First, deliberately. Every other asset degrades when substituted;
        // a substituted sanitizer becomes the attack.
        note: "HTML sanitizer — highest-value asset to remove third-party trust from",
    },
    {
        name: "codemirror6",
        kind: "bundle",
        // The version anchor. Fifteen packages ship on their own release
        // trains, so one filename cannot name them all. `view` is the
        // package the others depend on.
        pkg: "@codemirror/view",
        // WHAT THIS LIST IS FOR, since 2026-10-24: the packages the entry
        // below IMPORTS BY NAME, and therefore the packages that must be
        // pinned exactly in package.json. test-local.sh [28] reads it.
        //
        // It is no longer the record of what is in the file. The file
        // holds 28 packages and the manifest's `packages` field reports
        // all of them, read from esbuild's metafile. A list of this kind
        // maintained by hand answers for the half somebody remembered,
        // which is how @lezer/highlight went undeclared.
        //
        // The build asserts this list is a SUBSET of what was bundled, so
        // a member that stops being reachable fails rather than standing
        // as a pin on a package the artifact does not contain.
        members: [
            "@codemirror/view", "@codemirror/state", "@codemirror/commands",
            "@codemirror/language", "@codemirror/search",
            "@codemirror/autocomplete", "@codemirror/lint",
            "@codemirror/lang-javascript", "@codemirror/lang-json",
            "@codemirror/lang-html", "@codemirror/lang-css",
            "@codemirror/lang-sql", "@codemirror/lang-python",
            "@codemirror/lang-markdown",
            // Imported directly by the entry for `tags`, and undeclared
            // until 2026-10-24 — it resolved on npm hoisting alone, so a
            // consumer-visible feature rested on another package's
            // dependency tree. See the DEBT-VR-11 note below.
            "@lezer/highlight",
        ],
        // NO `global`. Every other asset publishes one namespace and the
        // page reads through it. CodeEditor probes about thirty BARE names
        // on `window`, so a namespace here would leave every consumer
        // writing the same thirty lines of glue the CDN version needed.
        // DEBT-SEC-9 counted that glue in the README as part of the
        // problem, so the vendored file does the publishing itself and the
        // consumer writes ONE tag.
        //
        // `history` and `search` are republished as `cmHistory` and
        // `cmSearch`. `window.history` is the browser's own, and
        // overwriting it breaks navigation. The renames are not cosmetic
        // and CodeEditor probes for exactly these spellings.
        entry: [
            'import { EditorView, keymap, lineNumbers, drawSelection, dropCursor, highlightActiveLine } from "@codemirror/view";',
            'import { EditorState } from "@codemirror/state";',
            'import { history, historyKeymap, defaultKeymap, undo, redo, indentSelection } from "@codemirror/commands";',
            'import { syntaxHighlighting, defaultHighlightStyle, HighlightStyle, indentOnInput, bracketMatching } from "@codemirror/language";',
            // DEBT-VR-11. `HighlightStyle` and `tags` are what let a
            // consumer define its OWN token colours. Without them the
            // only style on offer is `defaultHighlightStyle`, which is
            // light-only, so a dark editor was painted with #0000ff
            // keywords. `tags` lives in @lezer/highlight, a transitive
            // dependency of @codemirror/language rather than a new one.
            'import { tags } from "@lezer/highlight";',
            'import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";',
            'import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";',
            'import { setDiagnostics } from "@codemirror/lint";',
            'import { javascript } from "@codemirror/lang-javascript";',
            'import { json } from "@codemirror/lang-json";',
            'import { html } from "@codemirror/lang-html";',
            'import { css } from "@codemirror/lang-css";',
            'import { sql } from "@codemirror/lang-sql";',
            'import { python } from "@codemirror/lang-python";',
            'import { markdown } from "@codemirror/lang-markdown";',
            'Object.assign(window, {',
            '  EditorView, EditorState, keymap, lineNumbers, drawSelection, dropCursor,',
            '  highlightActiveLine, highlightSelectionMatches,',
            '  cmHistory: history, historyKeymap, defaultKeymap, undo, redo, indentSelection,',
            '  syntaxHighlighting, defaultHighlightStyle, HighlightStyle, tags,',
            '  indentOnInput, bracketMatching,',
            '  cmSearch: search, searchKeymap, closeBrackets, closeBracketsKeymap,',
            '  setDiagnostics, javascript, json, html, css, sql, python, markdown',
            '});',
        ].join("\n"),
        note: "CodeMirror 6, 15 imported packages and 28 in all, one hashed file; publishes 32 bare globals that CodeEditor probes for. DEBT-SEC-9 / ADR-211 / DEBT-VR-11",
    },
    {
        name: "maxgraph",
        kind: "bundle",
        entry: 'export * from "@maxgraph/core";',
        global: "maxgraph",
        note: "ESM-only; the apps' canvas already reads window.maxgraph",
    },
    {
        name: "a2ui-runtime",
        kind: "bundle",
        pkg: "@a2ui/web_core",
        members: ["@a2ui/lit"],
        entry: [
            'export { Catalog, MessageProcessor } from "@a2ui/web_core/v0_9";',
            'export { BASIC_FUNCTIONS, basicCatalog as coreBasicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";',
            'export { A2uiSurface, basicCatalog } from "@a2ui/lit/v0_9";',
        ].join("\n"),
        global: "A2uiRuntime",
        note: "The A2UI runtime the MCP Apps view runs (#19). Holds web_core's zod 3, excused by ADR-252",
    },
    {
        name: "mcp-ext-apps",
        kind: "bundle",
        pkg: "@modelcontextprotocol/ext-apps",
        members: ["@modelcontextprotocol/core", "@modelcontextprotocol/client", "zod"],
        entry: 'export { App, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } '
            + 'from "@modelcontextprotocol/ext-apps";',
        global: "McpExtApps",
        note: "The MCP Apps view's host bridge (#19)",
    },
    {
        name: "signalr",
        kind: "copy",
        from: "node_modules/@microsoft/signalr/dist/browser/signalr.min.js",
        global: "signalR",
    },
    {
        name: "cytoscape",
        kind: "copy",
        from: "node_modules/cytoscape/dist/cytoscape.min.js",
        global: "cytoscape",
        note: "absent from the original request; found by scanning the apps repo",
    },
    {
        name: "chart.js",
        kind: "copy",
        from: "node_modules/chart.js/dist/chart.umd.min.js",
        global: "Chart",
        note: "also served unversioned at /vendor/chart.js/ for existing consumers",
    },
    {
        // The stylesheet is copied VERBATIM — never rewritten to drop the
        // .ttf fallbacks it references, even though no browser that supports
        // woff2 will ever fetch one. Byte-identical output means anyone can
        // verify provenance by diffing against the npm package; editing it
        // to save ~700KB would trade that for nothing a user notices.
        //
        // CSS + webfonts, so it cannot be one file. The STYLESHEET carries an
        // SRI hash; the @font-face files it pulls cannot (CSS has no way to
        // express integrity for them). That residual is acceptable where it
        // would not be for executable code: a substituted font renders wrong
        // glyphs, it does not run.
        //
        // 6.5.1 over the 6.4.0 some pages use — verified a strict superset of
        // every fa- class the apps reference (2518 defined, 92 used, zero
        // missing), so consolidating loses nothing.
        /*
         * vditor is the exception the original request could not have known
         * about. It is NOT one self-contained file: it hardcodes
         * `CDN = "https://unpkg.com/vditor@3.11.2"` and lazily fetches its
         * markdown engine (lute, 3.9MB), icon set, language pack and every
         * optional renderer — mermaid, katex, mathjax, graphviz, echarts —
         * from there at runtime, injecting them as script tags WITHOUT an
         * integrity attribute.
         *
         * So we serve the whole tree and point the `cdn` option at it. The
         * alternative — serving only the always-needed subset — saves ~16MB
         * of deploy and breaks silently the first time a user writes a
         * mermaid block, because the fetch 404s against our origin instead
         * of falling through to unpkg. A feature that fails on user content
         * is exactly the class of defect this programme exists to remove.
         *
         * `types/` and `ts/` are excluded: typings and sources, never
         * fetched by a browser.
         *
         * The chunks this entry injects carry no SRI, because vditor adds
         * their tags itself. A page that needs them checked loads the
         * `vditor-integrity` asset below as its entry instead. That copy
         * holds a hash for each chunk. This tree stays a verbatim copy of
         * the npm release. Recorded in CDN_CONTRACT.md.
         */
        name: "vditor",
        kind: "tree",
        assetType: "script",
        global: "Vditor",
        version: "3.11.2",
        pkg: "vditor",
        entry: "dist/index.min.js",
        include: [
            { from: "node_modules/vditor/dist", to: "dist", exclude: ["types", "ts"] },
        ],
        // Installed here and bundled into dist/index.min.js, so it is
        // audited like any package.
        members: ["diff-match-patch"],
        /*
         * The libraries vditor ships prebuilt under dist/js and injects when a
         * note needs them. They are not installed here, so `packages` (and
         * audit:vendor) cannot hold them; the manifest lists them under
         * `bundled` instead, for licence notices. Each entry is proved
         * against the served file by a `marker` it must contain or its
         * `sha256` (a file with no version banner, matched byte for byte
         * against the npm release), and every dist/js directory but vditor's
         * own must be declared, so the next vditor bump that changes one
         * fails here. An entry with a `source` is not on npm. A null
         * `version` is a library whose release could not be identified.
         * Prebuilt files may bundle further libraries (zrender in echarts,
         * Raphael in flowchart.js, d3 and js-yaml in markmap); those are
         * not listed.
         */
        bundled: [
            { name: "abcjs", version: "5.10.3", file: "dist/js/abcjs/abcjs_basic.min.js",
                marker: "abcjs_basic v5.10.3" },
            { name: "echarts", version: "5.5.1", file: "dist/js/echarts/echarts.min.js",
                marker: "t.version=\"5.5.1\"" },
            { name: "flowchart.js", version: "1.14.1", file: "dist/js/flowchart.js/flowchart.min.js",
                marker: "flowchart.js, v1.14.1" },
            { name: "viz.js", version: "2.1.2", file: "dist/js/graphviz/viz.js",
                marker: "Viz.js 2.1.2 (Graphviz 2.40.1" },
            { name: "highlight.js", version: "11.7.0", file: "dist/js/highlight.js/highlight.min.js",
                marker: "Highlight.js v11.7.0" },
            { name: "highlightjs-sap-abap", version: "0.2.0", file: "dist/js/highlight.js/third-languages.js",
                marker: "highlightjs-sap-abap@0.2.0" },
            { name: "highlightjs-solidity", version: "2.0.5", file: "dist/js/highlight.js/third-languages.js",
                marker: "highlightjs-solidity@2.0.5" },
            { name: "katex", version: "0.16.9", file: "dist/js/katex/katex.min.js",
                marker: "version:\"0.16.9\",render:" },
            { name: "lute", version: "1.7.6", file: "dist/js/lute/lute.min.js",
                source: "https://github.com/88250/lute", marker: "{k:\"Version\",v:new $String(\"1.7.6\")}" },
            { name: "markmap-lib", version: "0.14.3", file: "dist/js/markmap/markmap.min.js",
                marker: "markmap-lib v0.14.3" },
            { name: "markmap-view", version: "0.14.3", file: "dist/js/markmap/markmap.min.js",
                marker: "markmap-view v0.14.3" },
            { name: "mathjax", version: "3.1.2", file: "dist/js/mathjax/tex-svg-full.js",
                marker: "MathJax={version:\"3.1.2\"" },
            { name: "mermaid", version: "11.6.0", file: "dist/js/mermaid/mermaid.min.js",
                marker: "{name:\"mermaid\",version:\"11.6.0\"" },
            { name: "plantuml-encoder", version: null, file: "dist/js/plantuml/plantuml-encoder.min.js",
                sha256: "42c936291042379a95657ec1fbcfb622f425d40a9cef6dea575b41090695a2aa",
                note: "its modules match the 1.2.6 release, but its bytes match no release" },
            { name: "smiles-drawer", version: "2.1.7", file: "dist/js/smiles-drawer/smiles-drawer.min.js",
                sha256: "955285fac52a7017b3c3658e2cb84bef7f1f76732f3f7cd565d1bb0903232dc2" },
        ],
        // vditor's own language packs and icon sets.
        ownDirs: ["dist/js/i18n", "dist/js/icons"],
        note: "whole dist tree; set vditor's `cdn` option to /lib/vditor-3.11.2",
    },
    {
        // Vditor's stylesheet as its own SRI-hashed asset, so the A2UI adapter
        // can load it with MarkdownEditor (readiness step 2 B5, ADR-230). The
        // tree above already serves it, unhashed, at dist/index.css; this
        // entry gives it a manifest URL and an integrity hash. Self-contained:
        // its one image is a data: URI.
        name: "vditor-css",
        kind: "tree",
        assetType: "stylesheet",
        version: "3.11.2",
        pkg: "vditor",
        entry: "index.css",
        include: [
            { from: "node_modules/vditor/dist/index.css", to: "index.css" },
        ],
        note: "vditor's stylesheet, hashed, for MarkdownEditor over A2UI",
    },
    {
        // Vditor's entry with a SHA-384 table of the tree above inside it,
        // and its loaders patched to put the matching hash on every script
        // and stylesheet they add (scripts/vditor-integrity.mjs). The page
        // hashes this file, and this file hashes the rest. MathJax is
        // refused, because vditor runs it from downloaded text. It must
        // come after `vditor` here, because it hashes the copied tree.
        name: "vditor-integrity",
        kind: "patch",
        tree: "vditor",
        global: "Vditor",
        pkg: "vditor",
        members: ["diff-match-patch"],
        note: "vditor's entry with a hash for every chunk it loads; set vditor's `cdn` option to /lib/vditor-3.11.2",
    },
    {
        name: "bootstrap",
        kind: "copy",
        from: "node_modules/bootstrap/dist/js/bootstrap.bundle.min.js",
        global: "bootstrap",
        // Its bundle registers document-wide data-API listeners, so a second copy doubles every
        // data-bs-toggle. The A2UI adapter uses the page's copy when it has one (ADR-245).
        shared: true,
        note: "Bootstrap's JS for components the A2UI adapter mounts: Toolbar's tooltips, the dialogs' modals",
    },
    {
        // MarkdownRenderer's parser (window.marked), so the A2UI adapter can
        // load it for DocViewer instead of the host fetching it from a public
        // CDN (#51, ADR-230). The UMD build is the one that assigns a global.
        name: "marked",
        kind: "copy",
        from: "node_modules/marked/lib/marked.umd.js",
        global: "marked",
        note: "MarkdownRenderer's parser; DocViewer reaches it through MarkdownRenderer (#51)",
    },
    {
        // LaTeX rendering (window.katex) for LatexEditor's preview and
        // MarkdownRenderer's math (#51, ADR-230). 0.19.0 rather than 0.19.1:
        // the newer one was six days old when pinned and fixes only a parsing
        // edge case; every KaTeX advisory was patched by 0.18.2.
        name: "katex",
        kind: "copy",
        from: "node_modules/katex/dist/katex.min.js",
        global: "katex",
        note: "LatexEditor's preview and MarkdownRenderer's math (#51)",
    },
    {
        // KaTeX's stylesheet and the fonts it pulls: a directory, like
        // font-awesome. The stylesheet carries the SRI hash; fonts cannot.
        name: "katex-css",
        kind: "tree",
        assetType: "stylesheet",
        version: "0.19.0",
        pkg: "katex",
        entry: "katex.min.css",
        include: [
            { from: "node_modules/katex/dist/katex.min.css", to: "katex.min.css" },
            { from: "node_modules/katex/dist/fonts", to: "fonts" },
        ],
        note: "the stylesheet katex renders against, with its fonts (#51)",
    },
    {
        name: "font-awesome",
        kind: "tree",
        assetType: "stylesheet",
        version: "6.5.1",
        pkg: "@fortawesome/fontawesome-free",
        entry: "css/all.min.css",
        include: [
            { from: "node_modules/@fortawesome/fontawesome-free/css/all.min.css", to: "css/all.min.css" },
            { from: "node_modules/@fortawesome/fontawesome-free/webfonts", to: "webfonts" },
        ],
        note: "consolidates the two versions the apps load (6.4.0 and 6.5.1)",
    },
    {
        // Bootstrap Icons as a hashed, CORS-served stylesheet with its fonts
        // beside it. /icons/bootstrap-icons.css stays for existing pages, but
        // it is unversioned and sends no CORS header, so a page cannot load
        // it with `crossorigin` to read its rules (the apps' icon pickers do)
        // or pin it with an integrity hash. Copied verbatim from the npm
        // package; /icons/ alone gets the font-display: swap edit.
        name: "bootstrap-icons",
        kind: "tree",
        assetType: "stylesheet",
        version: "1.13.1",
        pkg: "bootstrap-icons",
        entry: "bootstrap-icons.min.css",
        include: [
            { from: "node_modules/bootstrap-icons/font/bootstrap-icons.min.css", to: "bootstrap-icons.min.css" },
            { from: "node_modules/bootstrap-icons/font/fonts", to: "fonts" },
        ],
        note: "the same release as /icons/bootstrap-icons.css, hashed and served with CORS",
    },
];

function versionOf(pkg)
{
    const path = `node_modules/${pkg}/package.json`;
    return JSON.parse(readFileSync(path, "utf8")).version;
}

/**
 * The package a bundled input belongs to, with the version that was
 * ACTUALLY resolved for it.
 *
 * The last `node_modules/` segment wins, because npm nests a second copy
 * under the dependent when two versions are needed. Reading the top-level
 * `node_modules/<name>/package.json` would then report a version this
 * artifact does not contain.
 *
 * Returns null for the synthetic `<stdin>` entry, which is our own code.
 */
function packageOfInput(inputPath)
{
    const at = inputPath.lastIndexOf("node_modules/");
    if (at === -1) { return null; }

    const rest = inputPath.slice(at + "node_modules/".length);
    const parts = rest.split("/");
    const name = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
    const root = inputPath.slice(0, at) + "node_modules/" + name;

    return { name, version: JSON.parse(
        readFileSync(`${root}/package.json`, "utf8")).version };
}

function copyDirRecursive(from, to, exclude)
{
    mkdirSync(to, { recursive: true });

    for (const name of readdirSync(from))
    {
        if (exclude.includes(name)) { continue; }

        const src = join(from, name);
        const dst = join(to, name);

        if (statSync(src).isDirectory()) { copyDirRecursive(src, dst, exclude); }
        else { copyFileSync(src, dst); }
    }
}

function copyTree(asset, baseDir)
{
    let entryPath = null;

    for (const item of asset.include)
    {
        const dest = join(baseDir, item.to);

        if (statSync(item.from).isDirectory())
        {
            copyDirRecursive(item.from, dest, item.exclude ?? []);

            const candidate = join(baseDir, asset.entry);
            if (existsSync(candidate)) { entryPath = candidate; }
        }
        else
        {
            mkdirSync(dirname(dest), { recursive: true });
            copyFileSync(item.from, dest);
            if (item.to === asset.entry) { entryPath = dest; }
        }
    }

    return entryPath;
}

/**
 * A tree's prebuilt libraries, proved against the files just copied: each
 * entry's file holds its `marker` or has its `sha256`, and every directory
 * beside them is declared. Throws on the first gap; a manifest that names a
 * version the file does not carry is the defect this exists to prevent.
 */
export function bundledOf(asset, baseDir)
{
    if (!asset.bundled) { return null; }

    const problems = [];

    for (const b of asset.bundled)
    {
        const bytes = readFileSync(join(baseDir, b.file));
        const proved = b.sha256
            ? createHash("sha256").update(bytes).digest("hex") === b.sha256
            : bytes.toString("utf8").includes(b.marker);

        if (!proved) { problems.push(`${b.name}: ${b.file} no longer carries ${b.sha256 ? "its hash" : b.marker}`); }
    }

    const declared = new Set([...asset.ownDirs, ...asset.bundled.map((b) => dirname(b.file))]);
    const dirs = readdirSync(join(baseDir, "dist/js")).map((d) => `dist/js/${d}`)
        .filter((d) => statSync(join(baseDir, d)).isDirectory());

    for (const d of dirs.filter((d) => !declared.has(d)))
    {
        problems.push(`${d} is served but no \`bundled\` entry names a file in it`);
    }

    if (problems.length > 0)
    {
        throw new Error(`[vendor-closure] ${asset.name}'s bundled libraries do not match the tree. `
            + `Update \`bundled\` in scripts/vendor-closure.mjs:\n  ${problems.join("\n  ")}`);
    }

    return Object.fromEntries(asset.bundled.map(({ name, version, file, source, note }) => [name, {
        version,
        url: `/lib/${asset.name}-${asset.version}/${file}`,
        ...(source ? { source } : {}),
        ...(note ? { note } : {}),
    }]));
}

function packageOf(asset)
{
    if (asset.pkg) { return asset.pkg; }

    if (asset.kind === "copy")
    {
        // node_modules/<pkg...>/dist/... -> <pkg...>
        const parts = asset.from.split("/").slice(1);
        return parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
    }
    return asset.pkg ?? `@${asset.name}/core`;
}

/** Every file under dir, as paths relative to it. */
function filesUnder(dir)
{
    return readdirSync(dir, { recursive: true }).map(String).filter((rel) => statSync(join(dir, rel)).isFile());
}

/** A tree's served files, path to SRI, read from the copy just made. */
function treeFiles(baseDir, servedBase)
{
    return Object.fromEntries(filesUnder(baseDir).sort()
        .map((rel) => [`${servedBase}/${rel}`, sriOf(readFileSync(join(baseDir, rel)))]));
}

/**
 * Checks this build against cdn/lib-versions.json, or updates the record's
 * `current` with `--record`; then serves each deprecated version's frozen
 * bytes. specs/lib-retention.prd.md §6 (#147).
 *
 * `--record` adds new assets only. `--record --moved a,b` also takes the new
 * version of a and b, which lib:deprecate has just deprecated. Any other
 * change is refused, so recording cannot skip a deprecation.
 */
function applyRetention(built, outDir, recording, moved)
{
    const record = readRecord();

    if (recording)
    {
        const { current, problems } = recordCurrent(record, built, moved);

        if (problems.length > 0) { throw new Error(`[vendor-closure] ${problems.join("\n  ")}`); }

        record.current = current;
        writeRecord(record);
        console.log(`  record   -> cdn/lib-versions.json (${Object.keys(current).length} current assets)`);
    }
    else
    {
        const problems = currentProblems(record, built);

        if (problems.length > 0) { throw new Error(`[vendor-closure] ${problems.join("\n  ")}`); }
    }

    const retainedRoot = RETAINED_DIR;
    const present = existsSync(retainedRoot) ? filesUnder(retainedRoot).map((rel) => `/lib/${rel}`) : [];
    const read = (served) => (existsSync(retainedPath(served)) ? readFileSync(retainedPath(served)) : null);
    const frozen = retainedProblems(record, read, () => present);

    if (frozen.length > 0) { throw new Error(`[vendor-closure] ${frozen.join("\n  ")}`); }

    for (const entry of record.deprecated)
    {
        for (const served of Object.keys(entry.files))
        {
            const dest = join(outDir, served.slice("/lib/".length));

            mkdirSync(dirname(dest), { recursive: true });
            copyFileSync(retainedPath(served), dest);
        }

        console.log(`  ${entry.asset.padEnd(12)} ${entry.version.padEnd(9)} deprecated, retires after ${entry.retireAfter}`);
    }

    return record;
}

/** Bundle an ESM package to a self-contained IIFE; assert the closure. */
async function bundleAsset(asset, outFile)
{
    const result = await build({
        stdin: {
            contents: asset.entry,
            resolveDir: process.cwd(),
            loader: "js",
        },
        bundle: true,
        format: "iife",
        // An asset that publishes its own globals has no single namespace,
        // so esbuild is given no `globalName` and the entry does the
        // assigning. See the codemirror6 asset.
        ...(asset.global ? { globalName: asset.global } : {}),
        minify: true,
        outfile: outFile,
        metafile: true,
        logLevel: "silent",
    });

    // THE closure assertion. esbuild marks anything it could not resolve as
    // external; an external specifier means a second asset will arrive at
    // runtime, unverified, and the SRI on this file guarantees nothing about it.
    const externals = new Set();

    for (const input of Object.values(result.metafile.inputs))
    {
        for (const imp of input.imports ?? [])
        {
            if (imp.external) { externals.add(imp.path); }
        }
    }

    if (externals.size > 0)
    {
        throw new Error(
            `[vendor-closure] ${asset.name} is NOT closed — ` +
            `${externals.size} external specifier(s): ${[...externals].join(", ")}. ` +
            `Serving it would leave the same hole one level down, because ` +
            `integrity cannot attach to a runtime import.`);
    }

    // WHAT IS ACTUALLY IN THE FILE, read from the metafile rather than
    // declared by hand. codemirror6 names fourteen packages in `members`
    // and bundles twenty-eight: the @lezer grammars, style-mod, crelt and
    // w3c-keyname arrive as dependencies of those fourteen. A reader
    // asking "do we serve the package in this advisory" needs all of
    // them, and a list maintained by hand answers for the half somebody
    // remembered. scripts/vendor-audit.mjs reads this set.
    const packages = new Map();

    for (const inputPath of Object.keys(result.metafile.inputs))
    {
        const found = packageOfInput(inputPath);
        if (!found) { continue; }

        const seen = packages.get(found.name);

        // Two versions of one name inside a single hashed file is a real
        // change in what this origin serves. Let it break.
        if (seen !== undefined && seen !== found.version)
        {
            throw new Error(
                `[vendor-closure] ${asset.name} bundles ${found.name} at ` +
                `two versions, ${seen} and ${found.version}. One file ` +
                `cannot publish one version of a package it holds twice.`);
        }

        packages.set(found.name, found.version);
    }

    // A declared member that was not bundled means the pin list check
    // [28] holds is a list of packages this artifact does not contain.
    for (const member of asset.members ?? [])
    {
        if (!packages.has(member))
        {
            throw new Error(
                `[vendor-closure] ${asset.name} declares member ${member} ` +
                "and does not bundle it. The declared list is what " +
                "test-local.sh [28] pins, so it must not name a package " +
                "that is absent from the file.");
        }
    }

    return {
        inputs: Object.keys(
            Object.values(result.metafile.outputs)[0].inputs).length,
        packages: Object.fromEntries([...packages].sort(
            (a, b) => a[0].localeCompare(b[0]))),
    };
}

/**
 * Which assets this run builds, and where.
 *
 * A gated asset (gated.mjs) is built only with `--gated`, into gated/,
 * whose layout mirrors dist/. A plain run never writes one into dist/,
 * because Cloudflare deploys whatever dist/ holds.
 *
 * @param {boolean} gated True for `--gated`.
 * @returns {{assets: object[], outDir: string, manifestPath: string}}
 */
/**
 * What a plain run would build from node_modules now, without building it:
 * each asset's version and the package that version comes from (#147).
 *
 * @returns {Object<string, {version: string, namedBy: string}>}
 */
export function servedVersions()
{
    return Object.fromEntries(ASSETS.filter((asset) => !asset.gate).map((asset) =>
    {
        const pkg = packageOf(asset);

        return [asset.name, { version: versionOf(pkg), namedBy: pkg }];
    }));
}

function runPlan(gated)
{
    for (const asset of ASSETS)
    {
        if (asset.gate && !GATES[asset.gate])
        {
            throw new Error(`[vendor-closure] ${asset.name} names gate ${asset.gate}, ` +
                "which scripts/gated.mjs does not define. A gate needs a recorded reason.");
        }
    }

    return {
        assets: ASSETS.filter((asset) => Boolean(asset.gate) === gated),
        outDir: gated ? join(GATED_DIR, "lib") : OUT_DIR,
        manifestPath: gated ? join(GATED_DIR, "lib-manifest.json") : MANIFEST,
    };
}

async function main()
{
    const gated = process.argv.includes("--gated");
    const recording = process.argv.includes("--record");
    const movedAt = process.argv.indexOf("--moved");
    const moved = movedAt === -1 ? [] : process.argv[movedAt + 1].split(",");
    const { assets, outDir, manifestPath } = runPlan(gated);

    if (gated && assets.length === 0)
    {
        console.log("[vendor-closure] No asset names a gate; nothing to build into gated/.");
        return;
    }

    mkdirSync(outDir, { recursive: true });

    const manifest = { generated: null, assets: {} };
    // What this run wrote, per asset: served path to SRI (#147).
    const published = {};

    for (const asset of assets)
    {
        const pkg = packageOf(asset);
        const version = versionOf(pkg);
        const fileName = `${asset.name}-${version}.js`;
        const outFile = join(outDir, fileName);

        let inputs = 1;

        // Every asset publishes the packages it contains, so the union
        // across the manifest is the set this origin serves. A `copy` or
        // a `tree` asset ships one prebuilt package; a `bundle` reports
        // what esbuild actually pulled in.
        let packages = { [pkg]: version };

        if (asset.kind === "tree")
        {
            const baseDir = join(outDir, `${asset.name}-${version}`);
            const entryFile = copyTree(asset, baseDir);
            const bytes = readFileSync(entryFile);
            const bundled = bundledOf(asset, baseDir);

            published[asset.name] = { version, files: treeFiles(baseDir, `/lib/${asset.name}-${version}`) };

            for (const member of asset.members ?? []) { packages[member] = versionOf(member); }

            manifest.assets[asset.name] = {
                version,
                url: `/lib/${asset.name}-${version}/${asset.entry}`,
                integrity: sriOf(bytes),
                type: asset.assetType ?? "stylesheet",
                ...(asset.global ? { global: asset.global } : {}),
                packages,
                ...(bundled ? { bundled } : {}),
                bytes: bytes.length,
                // Honest: the stylesheet is hashed, the fonts it pulls are not.
                closure: asset.assetType === "script"
                    ? "entry hashed; lazily-injected chunks are served from this origin but carry no SRI"
                    : "stylesheet hashed; @font-face files are not SRI-able",
                ...(asset.note ? { note: asset.note } : {}),
            };

            const kb = String(Math.round(bytes.length / 1024)).padStart(4);
            const kind = asset.assetType === "script" ? "entry + lazy chunks" : "css + webfonts";
            console.log(`  ${asset.name.padEnd(12)} ${version.padEnd(9)} ${kb} KB (${kind})`);
            continue;
        }

        if (asset.kind === "patch")
        {
            const tree = ASSETS.find((a) => a.name === asset.tree);
            const built = manifest.assets[asset.tree];

            if (!tree || !built)
            {
                throw new Error(`[vendor-closure] ${asset.name} patches ${asset.tree}, `
                    + "which must be listed and built before it.");
            }

            const baseDir = join(outDir, `${tree.name}-${built.version}`);
            const table = hashTable(baseDir);
            const source = readFileSync(join(baseDir, tree.entry), "utf8");

            writeFileSync(outFile, patchEntry(source, table, built.version));

            const bytes = readFileSync(outFile);

            published[asset.name] = { version, files: { [`/lib/${fileName}`]: sriOf(bytes) } };

            for (const member of asset.members ?? []) { packages[member] = versionOf(member); }

            manifest.assets[asset.name] = {
                version,
                url: `/lib/${fileName}`,
                integrity: sriOf(bytes),
                global: asset.global,
                packages,
                ...(built.bundled ? { bundled: built.bundled } : {}),
                bytes: bytes.length,
                cdn: `/lib/${tree.name}-${built.version}`,
                hashed: Object.keys(table).length,
                closure: `entry hashed; each of the ${Object.keys(table).length} scripts and stylesheets `
                    + `it can load from /lib/${tree.name}-${built.version} carries SRI from a table `
                    + "inside the entry; MathJax is refused",
                ...(asset.note ? { note: asset.note } : {}),
            };

            const kb = String(Math.round(bytes.length / 1024)).padStart(4);
            console.log(`  ${asset.name.padEnd(12)} ${version.padEnd(9)} ${kb} KB `
                + `(${Object.keys(table).length} chunks hashed)`);
            continue;
        }

        if (asset.kind === "copy")
        {
            mkdirSync(dirname(outFile), { recursive: true });
            copyFileSync(asset.from, outFile);
        }
        else
        {
            const built = await bundleAsset(asset, outFile);
            inputs = built.inputs;
            packages = built.packages;
        }

        const bytes = readFileSync(outFile);

        published[asset.name] = { version, files: { [`/lib/${fileName}`]: sriOf(bytes) } };

        manifest.assets[asset.name] = {
            version,
            url: `/lib/${fileName}`,
            integrity: sriOf(bytes),
            ...(asset.global ? { global: asset.global } : {}),
            ...(asset.shared ? { shared: true } : {}),
            ...(asset.gate ? { gate: asset.gate } : {}),
            packages,
            bytes: bytes.length,
            closure: "complete",
            ...(asset.note ? { note: asset.note } : {}),
        };

        const kb = String(Math.round(bytes.length / 1024)).padStart(4);
        const detail = asset.kind === "bundle"
            ? ` (${inputs} inputs, ${Object.keys(packages).length} `
                + `package${Object.keys(packages).length === 1 ? "" : "s"}, 0 external)`
            : "";
        console.log(`  ${asset.name.padEnd(12)} ${version.padEnd(9)} ${kb} KB${detail}`);
    }

    // A gated run publishes nothing to dist/, so it has no retention record.
    const record = gated ? null : applyRetention(published, outDir, recording, moved);
    const generated = new Date().toISOString();

    if (record)
    {
        const notice = noticeData(record, manifest.assets, todayUtc(), generated);

        manifest.deprecated = notice.deprecated;
        manifest.retired = notice.retired;
    }

    // Stamped last so a failed run leaves no manifest claiming success —
    // a degraded build must not report success (ADR-148, clause 1).
    manifest.generated = generated;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    console.log(`  manifest -> ${manifestPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
{
    main().catch((err) =>
    {
        console.error(String(err.message ?? err));
        process.exit(1);
    });
}
