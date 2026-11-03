<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 732725ca-936e-40cb-ae36-6325bd09d082
Created: 2026
-->

<!-- AGENT: Implementation plan for repackaging Fluent UI System Icons and Fluent Emoji into icon-packs/ and serving them from the CDN at /icons/<pack>/ with licences and attribution. Colour-icon support in Ribbon and SymbolPicker is a later, separate spec. -->

# Icon packs: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (the owner has said no subagents). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** repackage two Microsoft icon sets into a clean, categorised, consistently named hierarchy in `icon-packs/`. Serve them from the CDN at `/icons/<pack>/`, with each licence, the attribution and links to the upstream sites published both beside the files and in the CDN docs.

**Architecture:**
- **Repack tool (dev-only).** `npm run icons:repack -- <pack>` fetches one pinned upstream source and runs that pack's adapter, which picks the subset, names each file and assigns its category. The shared writer then copies the SVGs byte for byte, validates every file, and writes `manifest.json`, `LICENSE` and `ATTRIBUTION.md`.
- **Committed output.** The output is committed under `icon-packs/<pack>/`, like `cloud-icons/`. A version bump is a reviewable, revertable commit, and the build never touches the network.
- **Build and checks.** `npm run build` copies `icon-packs/` into `dist/icons/`. Check [30] in `test-local.sh` re-validates the committed files and enforces the file budget.

**Tech Stack:** Node 24 ESM scripts (`.mjs`), jsdom's `DOMParser` (already a devDependency) for SVG validation, vitest, bash (`test-local.sh`), Cloudflare Workers static assets (`cdn/_headers`).

## Global Constraints

- **Budget:** at most **15,000** files under `icon-packs/` in total. All of `dist/` must stay under Cloudflare's Free-plan limit of **20,000** files per deploy. Check [30] fails at 19,500 and warns at 18,000.
- **Packs and subsets:**
  - `fluent-ui`: regular and filled at sizes 16 and 24, plus every colour icon at every size it comes in.
  - `fluent-emoji`: the Color style only, with all six skin tones. No 3D, flat or high-contrast.
- **Pinned sources:**
  - Fluent UI SVGs: `@fluentui/svg-icons@1.1.345`, integrity `sha512-Mz5e5BFKtvRN5Yiwrs5JqZRKgd8Rt8S3YiCAuwOWudmm7NA14Y8Ijr8QzMrE6gtNdoUP6/om7ue0lBQJLL57Mw==`.
  - Fluent UI metadata and LICENSE: `microsoft/fluentui-system-icons` at `73ec879377b1f412f33aca4a128aa967e6c238f0`, the npm `gitHead`.
  - Fluent Emoji: `microsoft/fluentui-emoji` at `1ffb34c752ecf5d402f04cfb4b392c77f57c54bc`.
- **Licences:** both packs are MIT, © Microsoft Corporation. Each pack ships its upstream `LICENSE` verbatim.
- **Artwork:** never modified. SVGs are copied byte for byte, and only names and folders change.
- **Path:** `/icons/<pack>/<category>/<name>-<size>-<variant>.svg`.
- **Naming:**
  - `<name>` and `<category>` are lowercase ASCII kebab-case, `[a-z0-9]+(-[a-z0-9]+)*`, with no spaces.
  - `<size>` is the SVG's design-grid size in pixels and must equal its `viewBox` width and height.
  - `<variant>` comes from the pack's fixed list.
- **Variants:**
  - `fluent-ui`: `regular`, `filled` or `color`.
  - `fluent-emoji`: `color`, or `color-tone-light`, `color-tone-medium-light`, `color-tone-medium`, `color-tone-medium-dark`, `color-tone-dark`.
- **SVG safety:** every file must pass `validateSvg`, which allows:
  - no `<script>`, `<foreignObject>`, `<iframe>`, `<embed>`, `<object>` or SMIL animation elements;
  - no `on*` attributes;
  - no `href` other than `#fragment`;
  - no `url(` other than `url(#`, and no `@import`, `javascript:`, `<!DOCTYPE` or `<!ENTITY`.
- **Non-breaking:** nothing that is served today changes. `/icons/bootstrap-icons.css` and `/icons/fonts/*` stay byte-identical.
- **No fallback code.** An unknown category, an unmatched metadata entry or a name collision is an error, unless it is listed in an explicit overrides file with a reason.
- **Owner's working rules:**
  - no new runtime or served dependencies, and no new devDependencies;
  - commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and never contain session links;
  - run `gh` as `GH_TOKEN="$(gh auth token --user priyavijaikalyan2007)" gh …`;
  - never push to or merge main without approval, because a merge deploys.
- **Delivery:** two sequential PRs, never stacked.
  - **PR 1** covers Tasks 1–4: the pipeline, `fluent-ui`, serving, the check and the docs.
  - **PR 2** covers Task 5, `fluent-emoji`, and opens only after PR 1 is merged.

---

## File structure

| Path | Responsibility |
|---|---|
| `scripts/icons/sources.json` | Pinned upstream sources and attribution facts per pack (single source of truth for ATTRIBUTION.md and docs tables) |
| `scripts/icons/lib.mjs` | Pure helpers: `slugify`, `iconFileName`, `parseIconFileName`, `validateSvg`, `categorize`, `buildManifest` |
| `scripts/icons/fetch.mjs` | `fetchNpmTarball` (integrity-checked) and `sparseCheckout` (commit-pinned) into a temp dir |
| `scripts/icons/write-pack.mjs` | `writePack(packId, icons, sourceInfo)`: wipe and rewrite `icon-packs/<pack>/`, validate, write manifest, LICENSE, ATTRIBUTION.md, print summary |
| `scripts/icons/fluent-ui.mjs` | Adapter: select subset, map npm filenames to metadata, categorise |
| `scripts/icons/fluent-ui.categories.json` | Ordered category rules plus per-icon overrides for Fluent UI |
| `scripts/icons/fluent-emoji.mjs` | Adapter: walk Color assets, map Unicode groups to categories, name skin-tone variants |
| `scripts/icons/repack.mjs` | CLI entry: `node scripts/icons/repack.mjs <pack>` |
| `scripts/icons/check-packs.mjs` | Check [30]: re-validate committed packs and enforce the budget; exports `checkPack` for tests |
| `scripts/icons/*.test.ts` | vitest unit tests (node environment) |
| `icon-packs/<pack>/…` | Committed, generated output |
| `docs/ICON_PACKS.md` | CDN docs page: what's served, URL scheme, licences, attribution, links, usage |
| `package.json`, `cdn/_headers`, `test-local.sh`, `scripts/generate-docs.js`, `docs/INDEX.md`, `NOTICE.md`, `README.md`, `CDN_CONTRACT.md`, `docs/CDN_INTEGRATION_GUIDE.md` | Wiring and docs edits |

Every new script carries the repo's header and markers: SPDX lines, then `⚓ COMPONENT`, `📜 PURPOSE`, `🔗 RELATES` and `⚡ FLOW`, in the same format as `scripts/copy-docs.sh` and `scripts/agentui/a2ui-check.test.ts`. MARKERS.md and COMMENTING.md give the rules. Test files start with `// @vitest-environment node`.

---

### Task 0: Branch

- [ ] `git switch main && git pull && git switch -c feat/icon-packs`

### Task 1: Shared library, pinned sources and fetchers

**Files:**
- Create: `scripts/icons/sources.json`, `scripts/icons/lib.mjs`, `scripts/icons/fetch.mjs`
- Test: `scripts/icons/lib.test.ts`

**Interfaces (produced):**
```js
/** "Flag: United States" -> "flag-united-states"; "Piñata" -> "pinata"; "#" -> "hash". Throws on empty result. */
export function slugify(text: string): string
/** iconFileName("table", 24, "regular") -> "table-24-regular.svg" */
export function iconFileName(name: string, size: number, variant: string): string
/** Inverse, given the pack's variant list; returns null when the name does not fit the scheme. */
export function parseIconFileName(file: string, variants: string[]): { name, size, variant } | null
/** Returns a list of problems; empty means valid. `size` is the expected square viewBox size. */
export function validateSvg(text: string, size: number): string[]
/** First rule whose regex matches `haystack` wins; overrides[name] beats rules; returns "general" when none match. */
export function categorize(name: string, haystack: string, rules: {category, pattern}[], overrides: Record<string,string>): string
/** icons: [{ name, category, keywords, description?, glyph?, unicode?, files: { "<size>-<variant>": "<category>/<file>" } }] */
export function buildManifest(packId: string, source: object, icons: object[]): object
```

- [ ] **Step 1: Write `sources.json`.**
```json
{
  "fluent-ui": {
    "title": "Fluent UI System Icons",
    "license": "MIT",
    "copyright": "Copyright (c) 2020 Microsoft Corporation",
    "homepage": "https://github.com/microsoft/fluentui-system-icons",
    "svg": { "npm": "@fluentui/svg-icons", "version": "1.1.345",
             "integrity": "sha512-Mz5e5BFKtvRN5Yiwrs5JqZRKgd8Rt8S3YiCAuwOWudmm7NA14Y8Ijr8QzMrE6gtNdoUP6/om7ue0lBQJLL57Mw==" },
    "git": { "repo": "https://github.com/microsoft/fluentui-system-icons.git",
             "commit": "73ec879377b1f412f33aca4a128aa967e6c238f0",
             "paths": ["/LICENSE", "/assets/*/metadata.json"] },
    "variants": ["regular", "filled", "color"],
    "subset": "regular and filled at 16 and 24 px; color at every size"
  },
  "fluent-emoji": {
    "title": "Fluent Emoji",
    "license": "MIT",
    "copyright": "Copyright (c) Microsoft Corporation.",
    "homepage": "https://github.com/microsoft/fluentui-emoji",
    "git": { "repo": "https://github.com/microsoft/fluentui-emoji.git",
             "commit": "1ffb34c752ecf5d402f04cfb4b392c77f57c54bc",
             "paths": ["/LICENSE", "/assets/*/metadata.json", "/assets/*/Color/*.svg", "/assets/*/*/Color/*.svg"] },
    "variants": ["color", "color-tone-light", "color-tone-medium-light", "color-tone-medium", "color-tone-medium-dark", "color-tone-dark"],
    "subset": "Color style, 32 px, all six skin tones; 3D, Flat and High Contrast are not included"
  }
}
```

- [ ] **Step 2: Write the failing tests** in `scripts/icons/lib.test.ts`:
```ts
// @vitest-environment node
import { describe, expect, test } from "vitest";
import { slugify, iconFileName, parseIconFileName, validateSvg, categorize } from "./lib.mjs";

const OK = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
const svg = (inner: string, attrs = "") =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"${attrs}>${inner}</svg>`;

describe("slugify", () => {
    test.each([
        ["Access Time", "access-time"], ["access_time", "access-time"],
        ["Flag: United States", "flag-united-states"], ["Piñata", "pinata"],
        ["keycap: #", "keycap-hash"], ["keycap: *", "keycap-asterisk"],
        ["Rock & Roll", "rock-and-roll"], ["1st place medal", "1st-place-medal"],
    ])("%s -> %s", (input, out) => expect(slugify(input)).toBe(out));
    test("throws when nothing is left", () => expect(() => slugify("!!!")).toThrow());
});

describe("file names", () => {
    const V = ["regular", "filled", "color"];
    test("round-trips", () => {
        expect(iconFileName("table", 24, "regular")).toBe("table-24-regular.svg");
        expect(parseIconFileName("table-24-regular.svg", V)).toEqual({ name: "table", size: 24, variant: "regular" });
    });
    test("a name may itself end in digits", () =>
        expect(parseIconFileName("number-1-16-filled.svg", V)).toEqual({ name: "number-1", size: 16, variant: "filled" }));
    test.each(["Table-24-regular.svg", "table 24 regular.svg", "table-24-bold.svg", "table-regular.svg", "table-24-regular.png"])(
        "rejects %s", (f) => expect(parseIconFileName(f, V)).toBeNull());
    test("multi-part variants", () =>
        expect(parseIconFileName("artist-32-color-tone-medium-dark.svg", ["color", "color-tone-medium-dark"]))
            .toEqual({ name: "artist", size: 32, variant: "color-tone-medium-dark" }));
});

describe("validateSvg", () => {
    test("accepts plain artwork and internal gradients", () => {
        expect(validateSvg(OK, 24)).toEqual([]);
        expect(validateSvg(svg('<defs><linearGradient id="a"/></defs><rect fill="url(#a)" width="1" height="1"/>'), 24)).toEqual([]);
    });
    test.each([
        ["script", svg("<script>alert(1)</script>")],
        ["foreignObject", svg("<foreignObject/>")],
        ["SMIL", svg('<animate attributeName="href" to="javascript:alert(1)"/>')],
        ["event handler", svg("<path/>", ' onload="x()"')],
        ["external href", svg('<use href="https://evil.example/a.svg#x"/>')],
        ["external url()", svg('<rect style="fill:url(https://evil.example/x)"/>')],
        ["@import", svg("<style>@import url(x.css);</style>")],
        ["doctype", '<!DOCTYPE svg [<!ENTITY x "y">]>' + OK],
        ["wrong size", OK.replace(/24/g, "20")],
        ["not square", svg("<path/>").replace("0 0 24 24", "0 0 24 20")],
        ["not svg", "<html/>"],
    ])("rejects %s", (_label, text) => expect(validateSvg(text, 24).length).toBeGreaterThan(0));
});

describe("categorize", () => {
    const rules = [{ category: "media", pattern: "image|video" }, { category: "data-charts", pattern: "table|chart" }];
    test("first matching rule wins", () => expect(categorize("video-table", "video table", rules, {})).toBe("media"));
    test("override beats rules", () => expect(categorize("table", "table", rules, { table: "documents-files" })).toBe("documents-files"));
    test("no match is general", () => expect(categorize("zz", "zz", rules, {})).toBe("general"));
});
```

- [ ] **Step 3: Run the tests and watch them fail.** Run `npx vitest run scripts/icons/lib.test.ts`. They should fail because `./lib.mjs` can't be resolved yet.

- [ ] **Step 4: Implement `lib.mjs`.** Key pieces:
```js
import { JSDOM } from "jsdom";
const { DOMParser } = new JSDOM("").window;
const SVG_NS = "http://www.w3.org/2000/svg";
const BANNED = new Set(["script", "foreignobject", "iframe", "embed", "object",
    "animate", "set", "animatemotion", "animatetransform", "discard"]);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(text)
{
    const s = text.normalize("NFKD").replace(/[̀-ͯ]/g, "")
        .replace(/&/g, " and ").replace(/#/g, " hash ").replace(/\*/g, " asterisk ")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!SLUG.test(s)) { throw new Error(`slugify: "${text}" leaves no usable name`); }
    return s;
}

export function iconFileName(name, size, variant) { return `${name}-${size}-${variant}.svg`; }

export function parseIconFileName(file, variants)
{
    // Longest variant first, so "color-tone-medium-dark" is not read as "dark".
    for (const v of [...variants].sort((a, b) => b.length - a.length))
    {
        const m = new RegExp(`^([a-z0-9]+(?:-[a-z0-9]+)*)-(\\d+)-${v}\\.svg$`).exec(file);
        if (m) { return { name: m[1], size: Number(m[2]), variant: v }; }
    }
    return null;
}

export function validateSvg(text, size)
{
    const problems = [];
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) { problems.push("DOCTYPE/ENTITY declarations are not allowed"); }
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const root = doc.documentElement;
    if (doc.getElementsByTagName("parsererror").length || root.namespaceURI !== SVG_NS || root.localName !== "svg")
    {
        return [...problems, "not a well-formed <svg> document"];
    }
    const vb = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
    if (vb.length !== 4 || vb[0] !== 0 || vb[1] !== 0 || vb[2] !== size || vb[3] !== size)
    {
        problems.push(`viewBox must be "0 0 ${size} ${size}"`);
    }
    for (const dim of ["width", "height"])
    {
        const v = root.getAttribute(dim);
        if (v !== null && Number(v) !== size) { problems.push(`${dim}="${v}" must equal ${size}`); }
    }
    for (const el of [root, ...root.querySelectorAll("*")])
    {
        if (BANNED.has(el.localName.toLowerCase())) { problems.push(`<${el.localName}> is not allowed`); }
        for (const a of el.attributes)
        {
            const n = a.localName.toLowerCase();
            if (n.startsWith("on")) { problems.push(`event handler ${a.name}`); }
            if (n === "href" && !a.value.startsWith("#")) { problems.push(`external reference ${a.value}`); }
            if (unsafeCss(a.value)) { problems.push(`unsafe value in ${a.name}`); }
        }
        if (el.localName === "style" && unsafeCss(el.textContent ?? "")) { problems.push("unsafe <style> content"); }
    }
    return problems;
}

function unsafeCss(v)
{
    return /@import|javascript:|expression\(/i.test(v) || /url\(\s*(?!['"]?#)/i.test(v);
}

export function categorize(name, haystack, rules, overrides)
{
    if (Object.hasOwn(overrides, name)) { return overrides[name]; }
    const hit = rules.find((r) => new RegExp(r.pattern).test(haystack));
    return hit ? hit.category : "general";
}

export function buildManifest(packId, source, icons)
{
    const fileCount = icons.reduce((n, i) => n + Object.keys(i.files).length, 0);
    return { pack: packId, title: source.title, license: source.license, copyright: source.copyright,
             homepage: source.homepage, source: sourceLabel(source), subset: source.subset, fileCount,
             icons: [...icons].sort((a, b) => a.name.localeCompare(b.name)) };
}
```
`sourceLabel(source)` returns a string. With an npm source it gives `"@fluentui/svg-icons@1.1.345 (git 73ec879…)"`, and with git only it gives `"<repo>@<commit>"`.

- [ ] **Step 5: Implement `fetch.mjs`**, with no new dependencies. It shells out to `npm` and `git` through `execFileSync`, never through a shell string.
```js
/** npm pack into workDir, verify the tarball's integrity against the pin, extract; returns the "package/" dir. */
export function fetchNpmTarball({ npm, version, integrity }, workDir)
// npm pack <npm>@<version> --pack-destination <workDir> --json -> [{ filename, integrity }]
// throw if integrity !== pin; then tar -xzf <file> -C <workDir>; return path.join(workDir, "package")

/** Sparse, blobless, depth-1 checkout of exactly `commit`; verifies HEAD; returns workDir. */
export function sparseCheckout({ repo, commit, paths }, workDir)
// git init; git remote add origin <repo>; git sparse-checkout set --no-cone ...paths
// git fetch --depth 1 --filter=blob:none origin <commit>; git checkout FETCH_HEAD
// throw unless `git rev-parse HEAD` === commit
```
Work directories go under `os.tmpdir()/icon-packs-<pack>`, never inside the repo.

- [ ] **Step 6: Run the tests and watch them pass.** Run `npx vitest run scripts/icons/lib.test.ts`.

- [ ] **Step 7: Commit.** Message: `feat(icons): shared repack library, pinned sources and fetchers`.

### Task 2: Fluent UI adapter, pack writer and the committed pack

**Files:**
- Create: `scripts/icons/write-pack.mjs`, `scripts/icons/fluent-ui.mjs`, `scripts/icons/fluent-ui.categories.json`, `scripts/icons/repack.mjs`
- Test: `scripts/icons/fluent-ui.test.ts`
- Modify: `package.json`, adding `"icons:repack": "node scripts/icons/repack.mjs"` to scripts. It's dev-only and not part of `build`.
- Generate: `icon-packs/fluent-ui/**`

**Interfaces:**
- Consumes everything from Task 1.
- `fluent-ui.mjs` exports:
  - `parseNpmName(file)`: `"access_time_20_filled.svg"` becomes `{ stem: "access_time", size: 20, style: "filled" }`. It returns `null` for anything else.
  - `keep({ size, style })`: true for `color` at any size, or for `regular` and `filled` at 16 and 24.
  - `collect(svgDir, metaDir, catalog)`: returns `Icon[]`, where each `Icon` is `{ name, category, keywords, description, files: { "<size>-<variant>": { src, rel } } }`.
- `write-pack.mjs` exports `writePack(packId, icons, source, licenseSrc)`. It deletes `icon-packs/<packId>`, then copies each `src` to `rel` with `fs.copyFileSync` (byte for byte). It runs `validateSvg` on every copy and throws, listing every problem, if any fail. It writes `manifest.json` (2-space JSON) and the verbatim `LICENSE`. It generates `ATTRIBUTION.md` from `source` (template in Task 4, Step 3). Finally it prints the file count per category, the total file count, the total bytes and the share in `general`.

- [ ] **Step 1: Write the failing tests** in `scripts/icons/fluent-ui.test.ts`:
```ts
// @vitest-environment node
import { describe, expect, test } from "vitest";
import { parseNpmName, keep } from "./fluent-ui.mjs";

describe("parseNpmName", () => {
    test("splits stem, size and style", () => {
        expect(parseNpmName("access_time_20_filled.svg")).toEqual({ stem: "access_time", size: 20, style: "filled" });
        expect(parseNpmName("text_align_left_rtl_16_regular.svg")).toEqual({ stem: "text_align_left_rtl", size: 16, style: "regular" });
    });
    test.each(["README.md", "access_time.svg", "access_time_20_bold.svg"])("rejects %s", (f) => expect(parseNpmName(f)).toBeNull());
});

describe("keep", () => {
    test.each([[16, "regular", true], [24, "filled", true], [20, "regular", false], [32, "filled", false],
               [48, "color", true], [32, "light", false], [12, "color", true]])(
        "%i %s -> %s", (size, style, out) => expect(keep({ size, style })).toBe(out));
});
```

- [ ] **Step 2: Run the tests and watch them fail.** Run `npx vitest run scripts/icons/fluent-ui.test.ts`.

- [ ] **Step 3: Implement `fluent-ui.mjs`.**
  - `parseNpmName` uses `/^([a-z0-9_]+?)_(\d+)_(regular|filled|color|light)\.svg$/`.
  - **Metadata map.** For each `assets/<Folder>/metadata.json`, key the entry by `slugify(meta.name)`.
  - **Matching icons to metadata:**
    1. Slugify the stem with `slugify(stem)`.
    2. If there's no exact match, strip a trailing `-rtl` or `-ltr` and look again.
    3. If there's still no match, the icon must appear in `catalog.unmatched` with a reason. Otherwise throw, listing every unmatched stem.
  - **Keywords** are `meta.metaphor`, plus the comma-separated `meta.keyword` minus `fluent-icon`, plus the words of the name.
  - **Haystack:** `categorize` receives the name, the keywords and `meta.description`, joined with spaces.
  - **Name collisions:** if two stems slugify to the same name, throw.

- [ ] **Step 4: Write `fluent-ui.categories.json`.** The rules are ordered and the first match wins. Patterns are matched against the lowercased haystack.
```json
{
  "rules": [
    { "category": "ai",              "pattern": "\\b(sparkle|bot|agents?|brain|copilot|wand)\\b" },
    { "category": "arrows",          "pattern": "\\b(arrow|chevron|caret|expand|collapse|undo|redo|swipe)" },
    { "category": "text-editing",    "pattern": "\\b(text|font|paragraph|align|bold|italic|underline|strikethrough|highlight|subscript|superscript|indent|bullet|clipboard|cut|copy|paste|eraser|pen|pencil|edit|ink|ruler|spell|format)" },
    { "category": "documents-files", "pattern": "\\b(document|folder|file|page|notebook|book|archive|attach|draft|save|print|library|note|form|slide)" },
    { "category": "data-charts",     "pattern": "\\b(data|chart|table|poll|gauge|database|filter|sort|math|calculator|number|sum|excel)" },
    { "category": "communication",   "pattern": "\\b(mail|chat|comment|call|send|share|megaphone|mention|voicemail|inbox|rss|conversation)" },
    { "category": "people",          "pattern": "\\b(person|people|contact|guest|accessibility|emoji|hand|team)" },
    { "category": "calendar-time",   "pattern": "\\b(calendar|clock|timer|time|hourglass|history|alarm|stopwatch|shifts|date)" },
    { "category": "media",           "pattern": "\\b(image|video|camera|mic|speaker|music|play|pause|record|headphones|headset|movie|film|album|gif|sound|volume)" },
    { "category": "devices",         "pattern": "\\b(laptop|desktop|phone|tablet|keyboard|mouse|printer|device|tv|watch|usb|battery|plug|cpu|server|drive|wifi|bluetooth|router|cellular|scan)" },
    { "category": "security",        "pattern": "\\b(lock|shield|key|password|fingerprint|vault|certificate|eye|privacy|guardian)" },
    { "category": "status-alerts",   "pattern": "\\b(alert|warning|error|info|question|checkmark|dismiss|block|prohibited|badge|important|flag)" },
    { "category": "layout-shapes",   "pattern": "\\b(layout|panel|window|tab|square|circle|rectangle|shape|grid|column|row|border|resize|maximize|minimize|full screen|split|layer|frame|position)" },
    { "category": "maps-places",     "pattern": "\\b(location|map|globe|building|home|earth|compass|airplane|vehicle|car|bus|train|road|pin|navigation)" },
    { "category": "commerce",        "pattern": "\\b(money|coin|cart|payment|wallet|savings|receipt|gift|tag|premium|currency|bank|store|shopping)" },
    { "category": "weather-nature",  "pattern": "\\b(weather|sun|moon|cloud|leaf|tree|animal|paw|drop|fire|flash|snowflake|planet)" },
    { "category": "settings-tools",  "pattern": "\\b(settings|options|wrench|toolbox|developer|code|bug|braces|terminal|beaker|puzzle|apps)" },
    { "category": "objects",         "pattern": "\\b(food|drink|sport|trophy|ribbon|star|heart|lightbulb|game|briefcase)" }
  ],
  "overrides": {},
  "unmatched": {}
}
```
The allowed categories are the rule categories plus `general`. Check [30] reads them from this file.

- [ ] **Step 5: Implement `repack.mjs`.** It reads `sources.json` and switches on the pack id. For `fluent-ui` it calls `fetchNpmTarball` and `sparseCheckout`, then `collect`, then `writePack`. Any other id throws `unknown pack <id>; known: fluent-ui, fluent-emoji`.

- [ ] **Step 6: Run the tests and watch them pass.** Run `npx vitest run scripts/icons/`.

- [ ] **Step 7: Run the repack.** Run `npm run icons:repack -- fluent-ui`. It should produce about 9,870 SVGs and 3 support files. Iterate on the rules and overrides until `general` is at most 5%. Spot-check about 20 random icons per category for sense, and print a sample with `ls icon-packs/fluent-ui/*/ | head`. Leave `unmatched` empty unless the run names real gaps, and give each entry a reason.

- [ ] **Step 8: Commit, as two commits** so the generated output doesn't bury the code:
  1. `feat(icons): Fluent UI adapter, pack writer and repack CLI`
  2. `feat(icons): fluent-ui pack (16/24 regular+filled, all colour), generated`, with the summary numbers in the body.

### Task 3: Serving, budget check [30]

**Files:**
- Create: `scripts/icons/check-packs.mjs`; Test: `scripts/icons/check-packs.test.ts`
- Modify: `package.json`, `cdn/_headers`, `test-local.sh`

**Interfaces:**
- `checkPack(packDir, packId, spec, allowedCategories)` returns `string[]` problems.
- `countFiles(dir)` returns a `number`.
- The CLI runs `checkPack` for every pack in `sources.json` and checks the budgets. It exits 1 if there are any problems.

- [ ] **Step 1: Write the failing tests.** Build a temporary pack in `os.tmpdir()` from a valid fixture: `general/` plus `data-charts/table-24-regular.svg`, a matching `manifest.json`, `LICENSE` and `ATTRIBUTION.md`. Assert `checkPack` returns `[]`. Then assert one problem for each of these breakages:
  - a file missing from the manifest;
  - a manifest entry with no file;
  - a bad file name (`Table 24.svg`);
  - an unknown category folder;
  - a viewBox that doesn't match the size;
  - a `<script>` in the SVG;
  - a missing LICENSE;
  - `general` above 5%.

- [ ] **Step 2: Run the tests and watch them fail.** Run `npx vitest run scripts/icons/check-packs.test.ts`.

- [ ] **Step 3: Implement `check-packs.mjs`.**
  - Walk each pack directory. Only `LICENSE`, `ATTRIBUTION.md` and `manifest.json` may sit at the top level, and everything else must be `<category>/<file>.svg`.
  - Check each file with `parseIconFileName`, then `validateSvg`, using the size from the name.
  - Compare the manifest's file set with the files on disk, in both directions.
  - Check the share in `general`.
  - **Budgets:** `icon-packs/` may hold at most 15,000 files. If `dist/` exists, it fails above 19,500 files and warns above 18,000.

- [ ] **Step 4: Run the tests and watch them pass.**

- [ ] **Step 5: Wire up the build.**
  - Add `"build:iconpacks": "mkdir -p dist/icons && cp -R icon-packs/. dist/icons/"` to `package.json`.
  - Insert `npm run build:iconpacks` into `build` straight after `npm run build:icons`.
  - The copy has to live in `npm run build`, because that is the command Cloudflare Workers Builds runs. `build.sh` only copies `cloud-icons/`.

- [ ] **Step 6: Add the `cdn/_headers` rules.** First run `grep -n '^/' cdn/_headers` and confirm no existing pattern (such as `/*` or `/icons/*`) also matches these paths, because Cloudflare appends the headers of every matching rule. Then add:
```
# Icon packs (docs/ICON_PACKS.md). Unversioned paths: a repack changes content
# in place, so these can never be immutable. CORS is open so apps can fetch()
# and inline them; the CSP stops an SVG opened directly from running anything.
/icons/fluent-ui/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
  Access-Control-Allow-Origin: *
  X-Content-Type-Options: nosniff
  Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src data:

/icons/fluent-emoji/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
  Access-Control-Allow-Origin: *
  X-Content-Type-Options: nosniff
  Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src data:
```

- [ ] **Step 7: Add check [30] to `test-local.sh`,** before the summary block and in the style of [29]:
```bash
echo "[30] Icon packs are well-formed, safe, attributed and within the file budget"
if node scripts/icons/check-packs.mjs; then
    pass "Every icon pack matches its manifest, naming scheme and SVG safety rules; budgets hold"
else
    fail "an icon pack is malformed or over budget (see above)"
fi
echo ""
```

- [ ] **Step 8: Verify.**
  - Run `npm run build`, then `find dist -type f | wc -l`. Expect about 13,000 files, under 18,000.
  - `diff -r node_modules/bootstrap-icons/font dist/icons --exclude=fluent-ui --exclude=fluent-emoji` reports only the build's existing `font-display` change to `bootstrap-icons.css` and `.min.css`, which is unchanged behaviour.
  - Run `npm run test:structure` and confirm [30] passes.

- [ ] **Step 9: Commit.** Message: `feat(icons): serve icon packs at /icons/<pack>/ with headers and check [30]`.

### Task 4: Licences, attribution and the CDN docs page (fluent-ui)

**Files:**
- Create: `docs/ICON_PACKS.md`
- Modify: `scripts/icons/write-pack.mjs` (ATTRIBUTION template), `scripts/generate-docs.js` (`HAND_WRITTEN_DOCS`), `docs/INDEX.md`, `docs/CDN_INTEGRATION_GUIDE.md`, `NOTICE.md`, `README.md`, `CDN_CONTRACT.md`
- Regenerate: `icon-packs/fluent-ui/ATTRIBUTION.md`

- [ ] **Step 1: Check the links.** Run `curl -sI` against every URL that will appear, and expect a 200 or a 301 to a 200 from each:
  - https://github.com/microsoft/fluentui-system-icons
  - https://www.npmjs.com/package/@fluentui/svg-icons
  - https://fluent2.microsoft.design/iconography
  - https://github.com/microsoft/fluentui-emoji
  - https://opensource.org/license/mit

  Drop any link that fails rather than guess a replacement.

- [ ] **Step 2: Write `docs/ICON_PACKS.md`,** with the repo's SPDX/GUID header and an AGENT comment. The sections:
  1. **What's served.** A table with pack, title, subset, file count, URL root, licence, and links to the upstream site and source.
  2. **URL scheme.** `https://static.knobby.io/icons/<pack>/<category>/<name>-<size>-<variant>.svg`, plus each pack's variant list and category list. Give an example for each pack.
  3. **Manifest.** `/icons/<pack>/manifest.json`: its fields and how to search by keyword.
  4. **Using the icons.** `<img src>`, CSS `background-image`, and `fetch()` then inline. Note that inlined SVGs from `fluent-emoji` share gradient ids. Note that `fluent-ui` regular and filled icons have no fill attribute, so CSS `fill` or `mask-image` recolours them. Cover the caching and CORS policy.
  5. **Licences and attribution.** For each pack: the copyright line, MIT, links to `/icons/<pack>/LICENSE` and `ATTRIBUTION.md`, the upstream homepage, and the exact version or commit.
  6. **What we changed.** Files are renamed and regrouped into categories, and the subset is as stated. The artwork bytes are unchanged.
  7. **Trademarks.** "Microsoft" and "Fluent" are trademarks of Microsoft Corporation. The MIT licence grants no trademark rights, and nothing here implies endorsement by or affiliation with Microsoft.
  8. **Updating a pack.** Bump `scripts/icons/sources.json`, run `npm run icons:repack -- <pack>`, review the diff, and run the tests.

- [ ] **Step 3: Write the ATTRIBUTION.md template** in `write-pack.mjs`. All values come from `sources.json` and the run:
```md
# <title>

Redistributed by static.knobby.io under the <license> licence. See LICENSE in this folder.

- Copyright: <copyright>
- Upstream: <homepage>
- Source: <sourceLabel>
- Subset: <subset>
- Files: <fileCount> SVGs in <categoryCount> categories (see manifest.json)

Changes: files were renamed to `<name>-<size>-<variant>.svg` and grouped into
category folders. The SVG files are otherwise byte-for-byte identical to the
upstream release. Docs: https://static.knobby.io/docs/ICON_PACKS.html
```
Re-run `npm run icons:repack -- fluent-ui`. The diff should touch only `ATTRIBUTION.md`.

- [ ] **Step 4: Wire up the rest of the docs.**
  - **`HAND_WRITTEN_DOCS`:** add `"ICON_PACKS.md": "Icon Packs"`.
  - **`docs/INDEX.md`:** link the new page.
  - **`docs/CDN_INTEGRATION_GUIDE.md`:** add a short "Icon packs" pointer under the existing icons section.
  - **`NOTICE.md`:** add a "Fluent UI System Icons" section with the copyright, MIT, the upstream link, the subset, "artwork unmodified" and the trademark line, in the style of the cloud-icons section.
  - **`README.md`:** add a row to the third-party table.
  - **`CDN_CONTRACT.md`:** add an `/icons/fluent-ui/*` and `/icons/fluent-emoji/*` row to the headers table, and an additive-assets note saying these paths may grow but existing file paths never move or disappear without a deprecation.

- [ ] **Step 5: Verify.**
  - Run `npm run build`.
  - Run `ls dist/docs/ICON_PACKS.html dist/icons/fluent-ui/{LICENSE,ATTRIBUTION.md,manifest.json}`.
  - Open the HTML page locally (`npm run` serve, or `npx serve dist`) and click every link.

- [ ] **Step 6: Commit.** Message: `docs(icons): licences, attribution and the Icon Packs CDN page`.

- [ ] **Step 7: Run the full suite** (`npm test`, `npm run test:e2e`, `npm run test:structure`), then run `python3 ./scripts/repo-index.py rebuild` if the repo index tracks `scripts/`. Commit any index change.

- [ ] **Step 8: Open PR 1.**
  - Push `feat/icon-packs` and confirm `origin/feat/icon-packs` matches `HEAD`.
  - Open the PR with `GH_TOKEN=… gh pr create`. The body summarises scope, counts, budget and licences, and ends with "🤖 Generated with [Claude Code](https://claude.com/claude-code)".
  - Wait for CI to pass, then report. Merging deploys, so the owner decides.

### Task 5: Fluent Emoji pack (PR 2, after PR 1 is merged)

**Files:**
- Create: `scripts/icons/fluent-emoji.mjs`; Test: `scripts/icons/fluent-emoji.test.ts`
- Modify: `scripts/icons/repack.mjs`, `NOTICE.md`, `README.md`, `docs/ICON_PACKS.md`
- Generate: `icon-packs/fluent-emoji/**`

**Interfaces:**
- `toneVariant(folder)` maps `"Default"` to `"color"`, `"Light"` to `"color-tone-light"`, `"Medium-Light"` to `"color-tone-medium-light"`, `"Medium"` to `"color-tone-medium"`, `"Medium-Dark"` to `"color-tone-medium-dark"` and `"Dark"` to `"color-tone-dark"`. Anything else throws.
- `groupCategory(group)` maps `"Smileys & Emotion"` to `smileys-emotion`, `"People & Body"` to `people-body`, `"Animals & Nature"` to `animals-nature`, `"Food & Drink"` to `food-drink`, `"Travel & Places"` to `travel-places`, `"Activities"` to `activities`, `"Objects"` to `objects`, `"Symbols"` to `symbols` and `"Flags"` to `flags`. Anything else throws.
- `collect(repoDir)` returns `Icon[]`, each with `glyph` and `unicode` from the metadata.

- [ ] **Step 1: Branch.** `git switch main && git pull && git switch -c feat/icon-packs-emoji`

- [ ] **Step 2: Write the failing tests.**
  - `toneVariant`: all six folders, plus a throw on `"Purple"`.
  - `groupCategory`: all nine groups, plus a throw on `"Component"`.
  - `collect` on a fixture: two assets, one plain (`assets/1st place medal/Color/1st_place_medal_color.svg`) and one toned (`assets/Artist/<Tone>/Color/artist_color_<tone>.svg`), each with a `metadata.json`. Assert names `1st-place-medal` and `artist`, keys `32-color` through `32-color-tone-dark`, and the categories.

- [ ] **Step 3: Run the tests and watch them fail.**

- [ ] **Step 4: Implement `fluent-emoji.mjs`.**
  - The name is `slugify(meta.cldr)`, and the size is 32.
  - Every asset must have exactly one Color SVG per tone it declares. Throw otherwise.
  - Keywords are `meta.keywords` plus `meta.tts`.
  - Two emoji with the same name is an error.
  - Wire the pack into `repack.mjs` with `sparseCheckout`, then `collect`, then `writePack`.

- [ ] **Step 5: Run the repack.** Run `npm run icons:repack -- fluent-emoji`. Expect about 3,145 SVGs and 3 support files, with `icon-packs/` totalling no more than about 13,030.
  - **Stop and ask the owner before committing if the pack's total bytes exceed 40 MB.** Skin-toned people emoji run up to about 75 KB each, and dropping the tones would halve the count.

- [ ] **Step 6: Run the tests,** then `npm run build` and `npm run test:structure`. Confirm [30] passes and `dist/` stays under 18,000 files.

- [ ] **Step 7: Add the docs.** Add the Fluent Emoji rows and sections to `docs/ICON_PACKS.md`, `NOTICE.md` and `README.md`, in the same shape as Task 4.

- [ ] **Step 8: Commit as two commits** (adapter and docs, then the generated pack). Run the full suite. Push, verify the remote matches, open PR 2 and wait for CI.

---

## Out of scope (later specs)

- Colour icons in Ribbon and SymbolPicker: CSS icon classes, greyscale for the disabled state, discovery in SymbolPicker.
- IconPark, Icons8 Flat Color, the 3D, Flat and High Contrast emoji styles, and other Fluent sizes.
- `cloud-icons/` is copied by `build.sh` only, and Cloudflare runs `npm run build`, so the cloud icons aren't on the CDN today (`/Azure/General/Workbooks.svg` returns 404). This plan doesn't change that. It's noted for the owner.
