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
| `dompurify` | 3.4.16 | **Not the 3.2.4 the apps pin** — that version carries 19 open advisories including XSS bypasses |
| `maxgraph` | 0.22.0 | ESM bundled to IIFE; 240 inputs, zero externals |
| `signalr` | 8.0.0 | |
| `cytoscape` | 3.26.0 | Was missing from the original request |
| `chart.js` | 4.5.1 | Also still at `/vendor/chart.js/` unversioned, for existing consumers |
| `font-awesome` | 6.5.1 | CSS + webfonts at `/lib/font-awesome-6.5.1/`. Consolidates the two versions the apps load — verified a strict superset of all 92 `fa-` classes in use |

`font-awesome` is CSS plus webfonts rather than a script, so it is served as a
versioned **directory**:

```html
<link rel="stylesheet"
      href="https://static.knobby.io/lib/font-awesome-6.5.1/css/all.min.css"
      integrity="<from the manifest>" crossorigin="anonymous">
```

The stylesheet carries an SRI hash. The `@font-face` files it pulls **cannot**
— CSS has no way to express integrity for them. That residual is acceptable
here where it would not be for executable code: a substituted font renders
wrong glyphs, it does not run. The stylesheet is copied verbatim from the npm
package, so provenance is verifiable by diffing against it.

### Bootstrap and bootstrap-icons — use what this origin already serves

Do **not** vendor these under `/lib/`. They are already published, and have
been for longer than `/lib/` has existed:

```html
<script src="https://static.knobby.io/js/bootstrap.bundle.min.js"></script>
<link rel="stylesheet" href="https://static.knobby.io/icons/bootstrap-icons.css">
```

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

### Not served yet

- **vditor** — cannot be one file. It lazily fetches from a 21 MB `dist/js`
  tree (echarts, mermaid, katex, mathjax, …) and injects those chunks without
  `integrity`. Needs a decision; see `specs/2026-10-04-dependency-closure.prd.md` §6.

### What this does not fix

Moving an asset here gives a fixable host, **not a guarantee of presence**.
Any runtime fetch can be absent. What makes absence safe rather than
destructive is fail-fast behaviour in the consumer — ADR-148 on this side.
