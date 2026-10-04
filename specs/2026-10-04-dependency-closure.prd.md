<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 5e9a2c74-8b31-4f6d-a0e2-7c4b1d8f93a6
Created: 2026
-->

<!-- AGENT: Design for vendoring the frontend dependency closure with SRI. DEBT-SEC-4. -->

# Serve the frontend dependency closure with SRI

**Status:** Design — awaiting one decision (§6)
**Date:** 2026-10-04
**ADR:** ADR-149 (on approval)
**Responds to:** `2026-10-03-serve-the-dependency-closure.md` (apps #232, #212)
**Tracked as:** DEBT-SEC-4

---

## 1. What is being asked

Serve the **closure** of frontend third-party dependencies from
`static.knobby.io`, with immutable versioned URLs and published SRI hashes, so
the apps stop fetching executable code from public CDNs at page load.

The report's reasoning is accepted as written and is not re-argued here. Two
points from it govern the design:

- **Runtime loading is correct; the question is whose infrastructure.** Bundling
  was tried and reverted — several apps share maxGraph, and a bundled copy is
  re-pushed on every app deploy. Thinker's bundle went 462KB → 2.0MB.
- **Serving the closure and applying SRI are one requirement, not two.**
  `integrity` attaches to `<script src>`, never to a bare import specifier. An
  artifact that resolves further imports at runtime defeats the point, because
  each of those arrives unverified.

**DOMPurify first.** Every other asset degrades when substituted; a substituted
sanitizer *becomes* the attack.

## 2. What the investigation found

Each claim below was verified against the real packages, not assumed.

### 2.1 maxGraph bundles to a genuinely closed artifact

The hardest case, and it works. `@maxgraph/core@0.22.0` is ESM-only, so it must
be bundled to an IIFE that assigns `window.maxgraph` — which is what the apps'
canvas code already reads, so no consumer change beyond the tag.

```
esbuild entry.js --bundle --format=iife --global-name=maxgraph --minify
  -> 608 KB, 240 inputs bundled, ZERO external specifiers
  -> window.maxgraph.Graph instantiates in jsdom
```

The closure claim is **machine-checkable**: esbuild's `--metafile` lists every
input and marks any unresolved import as external. That assertion, not a regex
over the output, is the gate this work should ship with. (A regex pass was tried
first and produced three false positives from a class method named `import`.)

### 2.2 vditor cannot satisfy the one-file constraint

This is the finding that changes the shape of the request.

`vditor@3.11.2/dist/index.min.js` is 285 KB and looks self-contained, but it
hardcodes `https://unpkg.com/vditor@` as the default CDN for sub-resources and
fetches them **on demand at runtime**. Its `dist/js/` directory is **21 MB** of
third-party libraries loaded only when a document uses the relevant feature:

```
abcjs  echarts  flowchart.js  graphviz  highlight.js  i18n
icons  katex    lute          markmap   mathjax       mermaid
```

So vditor is precisely the case the report warns about — "a library that itself
fetches something at runtime leaves the same hole one level down" — and it
cannot be closed by serving one file. Worse, vditor injects those chunks as
script tags **without** an `integrity` attribute, so SRI on them is not
reachable without patching vditor itself.

Three honest options, none of them clean. See §6.

### 2.3 The real asset list is larger than the report's table

Scanned from the apps repo rather than taken from the report:

| Asset | In the report? |
|---|---|
| `@maxgraph/core@0.22.0` (`+esm`) | yes |
| `dompurify@3.2.4` | yes |
| `vditor@3.11.2` (js + css) | yes |
| `chart.js@4.4.6` | yes |
| `bootstrap@5.3.3`, `bootstrap-icons@1.11.3` | yes |
| `@microsoft/signalr@8.0.0` | yes |
| `font-awesome@6.4.0` **and `6.5.1`** | partly — two versions are live |
| **`cytoscape@3.26.0`** | **no — absent from the report** |

Two consequences. The apps already load **two font-awesome versions**, so the
"one canonical URL per asset" ask requires a decision on their side about which
survives. And cytoscape was missed, which is itself an argument for the manifest
in §4.3: the list should be generated and checked, not maintained by hand.

### 2.4 We already ship two of these, at different versions

This repo publishes `bootstrap@5.3.8` at `/js/bootstrap.bundle.min.js` and
bootstrap-icons at `/icons/`, while the apps pin `5.3.3` and `1.11.3` from
jsdelivr. Vendoring them at the apps' pinned versions would mean serving two
Bootstraps from one origin.

### 2.5 `/vendor/*` is not immutable today, and cannot simply be made so

The existing rule is `max-age=86400, stale-while-revalidate=604800` — correct,
because `/vendor/chart.js/chart.umd.min.js` carries no version and its content
*does* change on upgrade. Immutability requires versioned paths.

`cdn/_headers` also warns, in the file, that Cloudflare applies **every**
matching rule, so overlapping patterns emit duplicate `Cache-Control` headers.
A new `/vendor/pinned/*` rule would overlap the existing `/vendor/*`. The new
assets therefore need a **disjoint top-level prefix**.

Nothing currently consumes `/vendor/`, so the old path can stay as it is.

## 3. Sizes

| Artifact | Size |
|---|---|
| `dompurify-3.2.4.js` | 21 KB |
| `signalr-8.0.0.js` | 46 KB |
| `cytoscape-3.26.0.js` | 352 KB |
| `vditor-3.11.2.js` | 285 KB (+ 21 MB of on-demand chunks) |
| `maxgraph-0.22.0.js` | 608 KB |

Excluding vditor's chunk tree, roughly **1.3 MB** of artifacts, served once and
cached indefinitely because the paths are versioned.

## 4. Design

### 4.1 URL scheme — `/lib/<name>-<version>.<ext>`

Flat, versioned, and **disjoint from `/vendor/*`** so the headers stay
unambiguous:

```
https://static.knobby.io/lib/dompurify-3.2.4.js
https://static.knobby.io/lib/maxgraph-0.22.0.js
https://static.knobby.io/lib/signalr-8.0.0.js
```

The path never changes content, which is what makes `immutable` safe and lets
every app share one cache entry. A version bump is a new path.

### 4.2 Build step

Source versions are pinned as `devDependencies`, so the lockfile pins them, and
`npm audit` covers them — a vendored library with a known CVE is our problem
once we serve it.

`scripts/vendor-closure.mjs` reads a declarative table and, per asset, either
copies a UMD file or bundles ESM to IIFE via esbuild. It emits
`dist/lib/<name>-<version>.js` plus `dist/lib/manifest.json`.

### 4.3 The manifest is the deliverable, not a side effect

```jsonc
{
  "generated": "<build timestamp>",
  "assets": {
    "dompurify": {
      "version": "3.2.4",
      "url": "/lib/dompurify-3.2.4.js",
      "integrity": "sha384-eEu5CTj3qGvu9PdJuS+YlkNi7d2XxQROAFYOr59zgObtlcux1ae1Il3u7jvdCSWu",
      "global": "DOMPurify",
      "closure": "complete"
    }
  }
}
```

This is what unblocks apps #212: a consumer generates its `<script>` tags from
the manifest rather than transcribing hashes by hand. It is also how the
cytoscape omission in §2.3 stops recurring — the list becomes data.

### 4.4 Headers

```
/lib/*
  Cache-Control: public, max-age=31536000, immutable
  Access-Control-Allow-Origin: *

/lib/manifest.json
  Cache-Control: no-cache
```

`Access-Control-Allow-Origin: *` is required: SRI demands
`crossorigin="anonymous"`, which makes the request CORS even for a script tag.
Note the two patterns above **overlap** — `manifest.json` matches both — so the
manifest must live at `/lib-manifest.json` instead, or the rules collapse into
one. Taking the first: **`/lib-manifest.json`**, disjoint by construction.

### 4.5 The closure gate

`npm test` check `[10]` re-runs each ESM bundle with `--metafile` and fails if
any asset reports an external specifier, and verifies every manifest hash
against the file on disk. The guard that matters is the first one: it is what
makes "closure" an assertion rather than a claim.

## 5. Verification

| Property | How |
|---|---|
| Closure is complete | esbuild metafile reports zero externals |
| Hash matches the artifact | recompute sha384 at test time |
| The bundle actually works | instantiate in jsdom (`window.maxgraph.Graph`) |
| Headers are disjoint | pattern-overlap check over `cdn/_headers` |
| Immutable paths never change | version in the filename; CI fails on content change at a fixed path |

## 6. The one decision — vditor

Its 21 MB of on-demand chunks cannot be one file, and SRI on them is
unreachable without patching vditor.

- **(a) Serve the full `dist/` tree** at `/lib/vditor/3.11.2/…` and have the
  apps set vditor's `cdn` option to that prefix. Removes third-party trust for
  every chunk. ~23 MB in the deploy, and the chunks still load without
  `integrity` because vditor injects them itself.
- **(b) Serve only `index.min.js` + `index.css`.** Cheap and SRI-able, but
  chunks keep coming from unpkg, so the hole the report describes stays open
  one level down.
- **(c) Serve the subset actually used.** Smallest and fully closed *if* the
  used feature set is known and stays fixed — it silently breaks the day
  someone writes a mermaid block.

**Recommendation: (a).** It is the only option that actually closes the hole,
which is the point of the request. The SRI gap on injected chunks should be
reported back to the apps team as a known residual rather than hidden, since it
means vditor cannot reach the same assurance as the other assets.

## 7. Scope of the first slice

Proposed, so this ships rather than stalling on vditor:

1. Machinery — vendor script, manifest, headers, closure gate.
2. **DOMPurify** (the report's priority), **maxGraph** (the hardest, already
   proven), **signalr**, **cytoscape**. All four are self-contained today.
3. Deferred pending §6 and §2.4: **vditor**, **font-awesome** (two live
   versions), **bootstrap/bootstrap-icons** (we already serve different
   versions), **chart.js** (we already serve 4.5.1 unversioned).

## 8. What this does not fix, restated

From the report, because it stays true and matters more after this change than
before: **moving an asset to our origin gives a fixable host, not a guarantee of
presence.** Any runtime fetch can be absent. What makes absence safe is
fail-fast behaviour in the consumer — ADR-148 on this side, and shipped on
theirs.
