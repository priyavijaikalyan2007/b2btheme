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
