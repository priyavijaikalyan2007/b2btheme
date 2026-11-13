<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: d927cb50-075a-4a69-a88a-25e6bc0eb8e2
Created: 2026
-->

<!-- AGENT: The compatibility, caching, and versioning contract for consumers of static.knobby.io. -->
<!-- ⚓ DOC: CdnContract -->
<!-- 📜 PURPOSE: Defines what cross-origin consumers (the knobby app AND the Keycloak theme on auth.knobby.io) may rely on, and how breaking changes are handled. -->
<!-- 🔗 RELATES: [[ThemeInit]], [[AuthCard]], specs/keycloak-theme-parity-requirements.md (R4), cdn/_headers -->

# CDN Contract — static.knobby.io

This document is the compatibility contract between the
`enterprise-bootstrap-theme` CDN (this repo, deployed to `static.knobby.io`)
and its cross-origin consumers — chiefly the **knobby app**
(`prod.knobby.io`) and the **Keycloak FreeMarker theme**
(`auth.knobby.io`), per `specs/keycloak-theme-parity-requirements.md` §R4.

## 1. Consumption model: "latest + contract", not hard pinning

Consumers link **unversioned URLs** (`/css/custom.css`, `/js/theme-init.js`,
`/components/<name>/<name>.{css,js}`). The CDN promises **additive-only
evolution** of the parity asset set (§2) instead of requiring consumers to
pin versions.

**Why not pinned URLs or SRI hashes?** Hard pinning is the most
tamper-resistant option, but it couples the Keycloak Docker image to every
theme release: each CDN advance would require an IdP rebuild + redeploy to
stay current, and an SRI hash mismatch would break the login page outright
on *any* CDN byte change. The deliberate trade-off here:

- Both origins are operated by the same organisation; the trust boundary is
  the Cloudflare account, exactly the same trust the app itself already
  places in the CDN. The Keycloak page adds **no new attack surface**.
- Keycloak's realm CSP allowlists only `static.knobby.io` for
  `script-src`/`style-src`, bounding what the page can ever load.
- Integrity therefore rests on Cloudflare account controls (2FA, scoped API
  tokens, deploy audit) — not on consumer-side pinning.

**Escape hatch:** if a breaking change is ever unavoidable, the CDN
publishes a **versioned snapshot tree** (`/v<major>/css/custom.css`, …) for
the old contract, the IDP team is notified (§4), and the unversioned URLs
move forward. Until that day, no snapshot tree exists.

## 2. The parity asset set (frozen surface)

These assets and behaviours are load-bearing for the Keycloak login pages.
Changes to them follow §4.

| Asset | Frozen surface |
|---|---|
| `/css/custom.css` | Bootstrap 5 + theme tokens; `data-bs-theme="dark"` flips `--bs-*` / `--theme-*` custom properties. Token *names* are append-only. |
| `/js/theme-init.js` | Resolution order cookie → localStorage → `prefers-color-scheme` → `light`; strict `light\|dark\|auto` validation; sets `data-bs-theme` synchronously; `auto`/unset tracks OS changes live. See `components/themeinit/README.md`. |
| `/components/authcard/authcard.css` | Class names `.brand-logo(.lg/.brand-logo-img)`, `.auth-main`, `.auth-container`, `.auth-card`, `.auth-step(.active)`, `.idp-button`, `.idp-icon`, `.divider(::before)`, `.divider-text`, keyframes `slideUp`/`fadeIn` — mirrored verbatim by FreeMarker templates. See `components/authcard/README.md`. |
| Cookie `knobby-theme` | Name, value set, and attributes per spec §R3. Written by the app's ThemeManager; read by theme-init. |

**Additive-only** means: new classes, new tokens, new options — fine.
Renames, removals, structural changes, or behaviour changes to the above —
breaking, follow §4. The unit tests in `components/authcard/authcard.test.ts`
("canonical structure") and `components/themeinit/themeinit.test.ts` are the
CI drift guards.

### Fonts / icons (R4.1)

The parity path serves **no web font** from this CDN (system font stack).
Consumers — including the Keycloak theme — MUST load icon fonts from the
public CDNs the app already uses (bootstrap-icons via jsdelivr, font-awesome
via cdnjs). `/icons/fonts/*` on this CDN now sends
`Access-Control-Allow-Origin: *` (see `cdn/_headers`) as future-proofing,
but self-hosting icons for auth.knobby.io remains **not recommended** until
that path is exercised by tests.

## 2b. Dynamic UI assets (additive, not parity-frozen)

The Dynamic UI layer (ADR-140 … ADR-144) adds the assets below. They are **not**
part of the Keycloak parity surface — the login pages do not use them — so they
are governed by the ordinary additive-only rule in §1 rather than the stricter
change protocol in §4.

| Asset | Notes |
|---|---|
| `/runtime/runtime.js` | The headless Dynamic UI runtime, exposing `window.EnterpriseRuntime`. **Load-order dependency:** it MUST be loaded before `components/dynamiccanvas/dynamiccanvas.js`, which consumes it as a global rather than importing it (ADR-028 external-globals pattern). A canvas whose runtime is missing throws a literate error naming the missing script. |
| `/capability-manifest.json` | Every component's capability manifest, aggregated at build time by `scripts/build-manifest.js`. `weight.js` carries the real compiled byte count, so a consumer's mount budget is based on measured sizes rather than authored estimates. |
| `/components/dynamiccanvas/*` | The canvas surface. |
| `/components/workspaceshell/*`, `/components/chatdock/*` | Workspace and conversation chrome. |
| `/components/stickynote/*`, `/components/annotation/*` | Canvas citizens. |

**What consumers may rely on:** the `window.EnterpriseRuntime` function names
listed in `runtime/bundle.test.ts`, and the `capability-manifest.json` schema
version. Both are additive-only — new functions and new manifest fields may
appear; existing ones will not be renamed or removed without §4 treatment.

**What consumers must not rely on:** anything not on the
`window.EnterpriseRuntime` object. The bundle is concatenated into one scope
and its internal helpers are implementation detail, wrapped in an IIFE
precisely so they are unreachable.

## 2c. Agent-protocol artefacts (ADR-219)

Generated by `scripts/agentui/generate.mjs` during `npm run build` and checked
by structure check `[29]`. They let an AI agent drive the components over
**A2UI** and **MCP Apps** (epic #16). Like §2b they sit outside the Keycloak
parity surface. No existing CDN bundle changed to add them; the adapter is a
new, opt-in bundle that a page loads only when it hosts A2UI.

| Asset | Contract | Cache rule |
|---|---|---|
| `/a2ui/catalog/v<N>.json` | The A2UI v0.9.1 catalog. **Its URL is its `catalogId`, a permanent public identifier** that hosts hard-code. Within one `N` it changes **additively only**; a removal, rename, retype or new requirement raises `N`, and every older major **stays served**. Retiring one is a separate decision. Today `N = 1`. | `max-age=300, stale-while-revalidate=86400` + CORS `*` |
| `/a2ui/catalog/v<N>.agent.json` | The catalog rendered for agent prompts (#49, ADR-233): every component, prop, required flag, enum value and description of `v<N>.json`, without the binding and function-call alternatives each data prop repeats. It lists the basic catalog's components and functions by name; an agent needs the basic catalog beside it. Built in the same swap as `v<N>.json` and proven lossless by the build. **A prompt aid, not a contract:** its layout may change within `N`, so hosts paste it whole and validate messages against `v<N>.json`. Only the current major is served. | `max-age=300, stale-while-revalidate=86400` + CORS `*` |
| `/schemas/<name>.options.json` | The JSON Schema of one component's protocol-visible options. Present only for components in the catalog. | `max-age=300, stale-while-revalidate=86400` + CORS `*` |
| `/mcp/renderer.meta.json` | The `_meta.ui` block for the MCP Apps renderer resource: the CSP `resourceDomains` the view needs, and no `connectDomains`. | `max-age=300, stale-while-revalidate=86400` + CORS `*` |
| `/mcp/renderer.html` | The MCP Apps view's page (#19; served since ADR-252). A server returns these bytes as the text of its `ui://` resource (MIME `text/html;profile=mcp-app`). Its body may change on any deploy, for example to name a new pinned runtime; what it accepts is the server contract below. | `max-age=300, stale-while-revalidate=86400` + CORS `*` |
| `/mcp/view/v1.js` | The view script (ESM), loaded by the page. Not called by servers. | `max-age=300, stale-while-revalidate=86400` + CORS `*` |
| `/lib/a2ui-runtime-<version>.js`, `/lib/mcp-ext-apps-<version>.js` | The MCP Apps view's pinned runtime (#19). They follow the `/lib/` rules: immutable, SRI in `/lib-manifest.json`. `a2ui-runtime` holds zod 3, whose advisory is excused by a recorded, expiring exception (ADR-252). | `/lib/` rules |
| `/a2ui/adapter/v<N>.js` + `v<N>.d.ts` | The A2UI adapter (#18, ADR-220): an ESM bundle exporting `createOutcropCatalog(webCore, { assetBaseUrl, injectBaseTheme?, providerTimeoutMs? })` and `catalogJson`. It renders every component of catalog `v<N>` as a custom element named `outcrop-<kebab-case name>` (`outcrop-sticky-note`), and reports the A2UI error codes `OUTCROP_BINDING_LOST`, `OUTCROP_ASSET_LOAD_FAILED`, `OUTCROP_MOUNT_FAILED` and `OUTCROP_PROVIDER_TIMEOUT` (plus `VALIDATION_FAILED`). **The export names, the options, the tag rule and the error codes are public names.** Within one `N` they change additively only, built in the same swap as catalog `v<N>`. It bundles no `@a2ui/*` code; the host supplies its own `web_core`. | `max-age=300, stale-while-revalidate=86400` + CORS `*` |
| `/agentui-report.json` | The build report: components left out of the catalog with the reasons, and every host-only member with its reason. Informational, not a contract; its shape may change. | no rule; the platform default |

**The MCP Apps server contract (#19, ADR-251).** These are public names. Within `version: 1` they change additively only. `docs/MCP_APPS_INTEGRATION_GUIDE.md` explains them.

- **A tool result:** `content` (a text summary) and `structuredContent.outcrop = { version: 1, messages, routes? }`. `messages` holds A2UI v0.9.1 server-to-client messages. `routes = { default?, byName? }` replaces the routes of the surfaces the result touches; a result without it keeps them.
- **A route:** `{ "tool": "<name>" }` or `"message"`.
- **A tool route calls the tool with** `{ outcrop: { version: 1, surfaceId, action: { version: "v0.9.1", action } } }`, where `action` is the A2UI action. The tool must return a result as above.
- **A message route sends `ui/message`:** a user turn whose text is `The user chose "<name>" on "<sourceComponentId>" in surface "<surfaceId>".`, then a newline, then `{"version":"v0.9.1","action":…}`.
- **The error codes:** `OUTCROP_MCP_BAD_RESULT`, `OUTCROP_MCP_NO_ROUTE`, `OUTCROP_MCP_TOOL_ERROR`, `OUTCROP_MCP_MESSAGE_FAILED`, `OUTCROP_MCP_NOT_CONNECTED`, logged with the prefix `[outcrop-mcp]`.

**`static.outcrop.us` is the host-neutral name for this same origin (D13).**
Every identifier and origin inside these files uses it, and none names
`static.knobby.io`, so the artefacts carry no consumer's brand. The owner
CNAMEs it to the primary CDN base. Check `[29]` fails `npm test` if any emitted
file contains `knobby`.

## 2d. Icon packs (additive, not parity-frozen)

`/icons/fluent-ui/*`, `/icons/fluent-emoji/*`, `/icons/aws/*`, `/icons/azure/*`
and `/icons/gcp/*` serve the SVG icon packs described in
[docs/ICON_PACKS.md](docs/ICON_PACKS.md), built from the committed
`icon-packs/` folder. They are not part of the Keycloak
parity surface, and Bootstrap Icons at `/icons/bootstrap-icons.css` and
`/icons/fonts/*` are untouched.

**What consumers may rely on:** a published icon path, icon stylesheet class,
`manifest.json`, `legacy-map.json` entry or manifest field is never renamed or
removed without §4 treatment. New icons, categories and packs may appear at any time. Check
`[30]` keeps every pack consistent with its manifest and within the file
budget.

## 3. Caching policy (R4.3)

Source of truth: [`cdn/_headers`](./cdn/_headers), copied to `dist/_headers`
at build time and honoured by Cloudflare Workers static assets. Patterns are
kept **disjoint** because Cloudflare appends headers from every matching
rule.

| Path | Policy | Rationale |
|---|---|---|
| `/icons/fonts/*` | `max-age=31536000, immutable` + CORS `*` | Changes only with the bootstrap-icons package. |
| `/vendor/*` | `max-age=86400, swr=604800` | Vendored libs change only on dependency upgrades. |
| `/css/*`, `/js/*`, `/components/*` | `max-age=300, stale-while-revalidate=86400` | Parity-critical "latest": fixes reach auth.knobby.io within ~5 min, SWR keeps loads fast. |
| `/build.json` | `no-cache` | Deploy introspection must always be fresh. |
| `/a2ui/*`, `/schemas/*`, `/mcp/*` | `max-age=300, stale-while-revalidate=86400` + CORS `*` | Agent-protocol artefacts (§2c). Third-party tools fetch the catalog cross-origin, so CORS is open. |
| `/icons/fluent-ui/*`, `/icons/fluent-emoji/*`, `/icons/aws/*`, `/icons/azure/*`, `/icons/gcp/*` | `max-age=86400, stale-while-revalidate=604800` + CORS `*`, `nosniff`, a `default-src 'none'` CSP | Icon packs (§2d). Unversioned paths, so never immutable; the CSP stops an SVG opened directly from running anything. |

## 4. Change protocol for the parity asset set

1. **Additive change** → ship freely; note it in `CHANGELOG.md`.
2. **Breaking change** (rename/removal/behaviour change in §2):
   - Requires an ADR in `agentknowledge/decisions.yaml`.
   - Notify the IDP team **before** deploy (they own the FreeMarker mirror
     and the realm CSP) and agree on a migration window.
   - Publish the `/v<major>/` snapshot of the previous contract (§1 escape
     hatch) so the Keycloak image keeps working until it is rebuilt.
3. **Brand logo**: bundled into the Keycloak theme JAR by the IDP team (spec
   §R5.2) — notify them when `apps/frontend/logo.png` changes.

## 5. Version introspection

`GET https://static.knobby.io/build.json` returns the package version, git
commit, branch, and build timestamp of the live deploy (generated by
`scripts/build-info.sh`). Consumers verifying "what is deployed" — e.g. the
IDP team validating a release against the contract — should use this, never
scrape file contents.

---

## Dependency closure — `/lib/` (ADR-149, DEBT-SEC-4)

> This section is the **contract**. For a worked integration — code to read
> the manifest, build tags, and fail safely — see
> [docs/CDN_INTEGRATION_GUIDE.md](docs/CDN_INTEGRATION_GUIDE.md).

Third-party frontend libraries served from this origin instead of a public
CDN, so the apps stop fetching executable code from infrastructure we do not
control.

### The contract

| Property | Value |
|---|---|
| URL | `https://static.knobby.io/lib/<name>-<version>.js` |
| Caching | `max-age=31536000, immutable` — the version is in the path, so content never changes |
| CORS | `Access-Control-Allow-Origin: *` — **required**, not cosmetic (see below) |
| Manifest | `https://static.knobby.io/lib-manifest.json`, `no-cache` |
| Closure | Each file is self-contained. No runtime module fetches. Asserted at build time from esbuild's metafile, not claimed. |

### Consuming it

Read the manifest and emit tags from it, rather than transcribing hashes:

```js
const lib = await fetch("https://static.knobby.io/lib-manifest.json")
    .then((r) => r.json());

const { url, integrity } = lib.assets.dompurify;

const tag = document.createElement("script");
tag.src = "https://static.knobby.io" + url;
tag.integrity = integrity;        // sha384-...
tag.crossOrigin = "anonymous";    // mandatory with integrity
document.head.appendChild(tag);
```

Each artifact assigns its documented global — `manifest.assets.<name>.global`
— so `window.DOMPurify`, `window.maxgraph`, `window.signalR`,
`window.cytoscape` are available once the tag loads. maxGraph in particular is
a drop-in: the apps' canvas already reads `window.maxgraph`.

**`crossorigin="anonymous"` is not optional.** `integrity` makes the request
CORS even for a `<script src>`, so without it the browser refuses the
response and the tag fails to load. That is why `/lib/*` carries
`Access-Control-Allow-Origin: *`.

### Bumping a version

A version bump is a **new URL**, because the old path must keep serving the
old bytes — that is what makes `immutable` honest. Consumers must update the
URL and the hash **together**; reading both from the manifest in the same
fetch does this for free, which is the main reason the manifest exists.

The old artifact is not deleted. A page cached mid-rollout still resolves.

### Currently served

| Asset | Version | Note |
|---|---|---|
| `dompurify` | 3.4.17 | **Not the 3.2.4 the apps pin** — that version carries 19 open advisories including XSS bypasses. Required by Ribbon gallery `preview` HTML, which throws without it (2026-11-10, ADR-258) |
| `maxgraph` | 0.22.0 | ESM bundled to IIFE; 240 inputs, zero externals |
| `signalr` | 8.0.0 | |
| `cytoscape` | 3.26.0 | Was missing from the original request |
| `chart.js` | 4.5.1 | Also still at `/vendor/chart.js/` unversioned, for existing consumers |
| `font-awesome` | 6.5.1 | CSS + webfonts at `/lib/font-awesome-6.5.1/`. Consolidates the two versions the apps load — verified a strict superset of all 92 `fa-` classes in use |
| `marked` | 18.1.3 | MarkdownRenderer's parser (`window.marked`). The A2UI adapter loads it for DocViewer (ADR-230) |
| `katex` | 0.19.0 | LaTeX rendering (`window.katex`); 0.19.0 over the six-day-old 0.19.1, which fixes only a parsing edge case. Every KaTeX advisory was patched by 0.18.2 |
| `vditor-css` | 3.11.2 | Vditor's stylesheet with an SRI hash at `/lib/vditor-css-3.11.2/index.css`, for MarkdownEditor over A2UI (the vditor tree serves it unhashed) |
| `vditor-integrity` | 3.11.2 | Vditor's entry with a hash for every chunk it loads, at `/lib/vditor-integrity-3.11.2.js`. Load it in place of `/lib/vditor-3.11.2/dist/index.min.js`. MathJax is refused. The A2UI adapter loads it for MarkdownEditor and Conversation. See below |
| `katex-css` | 0.19.0 | KaTeX's stylesheet and fonts at `/lib/katex-css-0.19.0/`; the stylesheet is hashed, the fonts cannot be |
| `bootstrap-icons` | 1.13.1 | The stylesheet, hashed, with its fonts beside it, at `/lib/bootstrap-icons-1.13.1/`. The same release as `/icons/bootstrap-icons.css`, served with CORS so a page loaded with `crossorigin` can read its rules. See below |
| `bootstrap` | 5.3.8 | Bootstrap's JS bundle (`window.bootstrap`), the same file as `/js/bootstrap.bundle.min.js`, with an SRI hash. Marked `shared`: the A2UI adapter loads it for Toolbar and the dialogs only when the page has no `window.bootstrap`, because a second copy doubles Bootstrap's document-wide listeners (ADR-245) |

`font-awesome` is CSS plus webfonts rather than a script, so it is served as a
versioned **directory**:

```html
<link rel="stylesheet"
      href="https://static.knobby.io/lib/font-awesome-6.5.1/css/all.min.css"
      integrity="sha384-t1nt8BQoYMLFN5p42tRAtuAAFQaCQODekUVeKKZrEnEyp4H2R0RHFz0KWpmj7i8g" crossorigin="anonymous">
```

The stylesheet carries an SRI hash. The `@font-face` files it pulls **cannot**
— CSS has no way to express integrity for them. That residual is acceptable
here where it would not be for executable code: a substituted font renders
wrong glyphs, it does not run. The stylesheet is copied verbatim from the npm
package, so provenance is verifiable by diffing against it.

### Bootstrap and bootstrap-icons — use what this origin already serves

Both are published at their original paths, which have been served for
longer than `/lib/` has existed:

```html
<script src="https://static.knobby.io/js/bootstrap.bundle.min.js"></script>
<link rel="stylesheet" href="https://static.knobby.io/icons/bootstrap-icons.css">
```

Those paths are unversioned, so they cannot carry a hash, and
`/icons/bootstrap-icons.css` sends no CORS header. Both are also in `/lib/`,
with hashes in the manifest: `bootstrap` (above) and `bootstrap-icons`.

`bootstrap-icons` is the same release's stylesheet, copied verbatim, at
`/lib/bootstrap-icons-1.13.1/bootstrap-icons.min.css`, with its fonts at
`fonts/` beside it. It is served immutable and with CORS. Use it when a page
needs either of these:

- an integrity hash;
- to read the stylesheet's rules, through `document.styleSheets[n].cssRules`.

A browser allows reading those rules only for a stylesheet loaded with
`crossorigin` and answered with `Access-Control-Allow-Origin`.

```html
<link rel="stylesheet"
      href="https://static.knobby.io/lib/bootstrap-icons-1.13.1/bootstrap-icons.min.css"
      integrity="sha384-CK2SzKma4jA5H/MXDUU7i1TqZlCFaD4T01vtyDFvPlD97JQyS+IsSh1nI2EFbpyk" crossorigin="anonymous">
```

The `/icons/` copy changes `font-display` from `block` to `swap`. The `/lib/`
copy keeps the package's `block`, so its icons stay invisible, not drawn as
fallback glyphs, until the font arrives.

Verified safe to migrate to, rather than assumed: this origin serves
**bootstrap-icons 1.13.1**, which defines 2078 classes and is a **strict
superset** of every `bi-` class the apps use. Bootstrap 5.3.8 against the
pinned 5.3.3 is a patch-level difference within the same minor.

Three `bi-` classes used in the apps resolve in **neither** version, so they
render nothing today and are pre-existing defects rather than migration risk:

| Used | Problem | Intended |
|---|---|---|
| `bi-bi-arrow-right` | doubled prefix | `bi-arrow-right` |
| `bi-folder-open` | a Font Awesome name | `bi-folder2-open` |
| `bi-trash-alt` | a Font Awesome name | `bi-trash` |

### vditor — a whole tree, and an entry that hashes it

vditor cannot be one file. It hardcodes `https://unpkg.com/vditor@3.11.2` and
lazily fetches its markdown engine (`lute`, 3.9 MB), icon set, language pack
and every optional renderer — mermaid, katex, mathjax, graphviz, echarts — as
script tags it injects itself.

The **whole tree** is served at `/lib/vditor-3.11.2/`, and this library's
`MarkdownEditor` points vditor's `cdn` option at it. **No consuming app needs
to change anything** — the apps never instantiate vditor directly, they use
`createMarkdownEditor`, so this was ours to fix rather than theirs.

Serving only the always-needed subset would have saved ~16 MB of deploy and
broken silently the first time a user wrote a mermaid block, because the fetch
would 404 against this origin instead of falling through to unpkg.

**The tree's own entry does not hash its chunks.** Vditor adds the tags for
its chunks itself, with no `integrity` attribute. The tree is a verbatim copy
of the npm release, so `/lib/vditor-3.11.2/dist/index.min.js` keeps that
behaviour, and pages that pin its hash keep working.

**`vditor-integrity` is the entry that does.** It is Vditor's entry with two
changes, made at build time by `scripts/vditor-integrity.mjs`:

- **A hash table.** It holds the SHA-384 of every script and stylesheet under
  `dist/js/` and `dist/css/` in the tree, 329 files.
- **Patched loaders.** Each script and stylesheet tag Vditor adds gets the
  hash of its file and `crossorigin="anonymous"`. A file that is not in the
  table is refused with an error, not loaded unchecked.

The page hashes the entry, and the entry hashes the rest. Load it in place of
the tree's entry, and keep `cdn` pointed at the tree:

```html
<script src="https://static.knobby.io/lib/vditor-integrity-3.11.2.js"
        integrity="sha384-bVs+HxsNugl+IJwcSL4cX9K+U0+KViSkI0lGbVt2e8TXahI5cJk7ATZRPOHbAB7o"
        crossorigin="anonymous"></script>
```

Take the hash from the manifest's `vditor-integrity` asset. Its `cdn` field
names the tree it checks, `/lib/vditor-3.11.2`.

Two behaviours differ from the tree's entry:

- **MathJax is refused.** Vditor runs MathJax from downloaded text, which a
  browser cannot check. Setting `math.engine` to `"MathJax"` throws an error
  that says to use KaTeX. MarkdownEditor and Conversation already use KaTeX.
- **The icon set loads without blocking.** Vditor fetched it with a
  synchronous request. It now loads like any other script, so the toolbar
  icons can appear a moment after the editor.

Each patch must match Vditor's minified code exactly once, or the build fails.
A Vditor upgrade therefore needs the patches rewritten, and cannot ship
unchecked chunks by accident.

**What the tree contains, for licence notices.** The vditor entry in the
manifest has two lists:

- `packages`: vditor and `diff-match-patch`, which `dist/index.min.js` bundles.
  Both are installed here and checked by `npm run audit:vendor`, as every
  other asset's `packages` are.
- `bundled`: the libraries vditor ships prebuilt under `dist/js` and injects
  when a note needs them, such as mermaid, katex, lute and highlight.js. Each
  has a `version` and the `url` of its file. They are not installed here, so
  `audit:vendor` does not check them.

```json
"bundled": {
  "mermaid": { "version": "11.6.0", "url": "/lib/vditor-3.11.2/dist/js/mermaid/mermaid.min.js" },
  "lute":    { "version": "1.7.6", "url": "…/dist/js/lute/lute.min.js", "source": "https://github.com/88250/lute" }
}
```

How the build keeps `bundled` correct:

- Each version is proved from the served file at build time, by a version
  string the file must contain or by a byte-for-byte hash.
- Every `dist/js` directory except vditor's own `i18n` and `icons` must be
  listed, so a vditor upgrade that changes one fails the build.

Exceptions:

- An entry with `source` is not on npm; `source` is where it comes from.
- A `version` of `null` means the release could not be identified; a `note`
  says why. Today that is `plantuml-encoder`.

A prebuilt file can itself bundle further libraries, such as zrender in
echarts, Raphael in flowchart.js, and d3 and js-yaml in markmap. Those are not
listed.

### Everything in the original request is now served

Nothing from `2026-10-03-serve-the-dependency-closure.md` remains outstanding.

### What this does not fix

Moving an asset here gives a fixable host, **not a guarantee of presence**.
Any runtime fetch can be absent. What makes absence safe rather than
destructive is fail-fast behaviour in the consumer — ADR-148 on this side.
