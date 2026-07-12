<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT
File GUID: 685010c0-9a92-4761-bc17-b37b7474d82a
Created: 2026
-->

<!-- [agent:claude] [purpose:spec-progress:keycloak-theme-parity] -->
<!-- ⚓ SPEC-PROGRESS: KeycloakThemeParity -->
<!-- 📜 PURPOSE: Progress log + cross-team handoff notes for the theme-repo side of specs/keycloak-theme-parity-requirements.md. -->
<!-- 🔗 RELATES: [[ThemeInit]], [[AuthCard]], [[CdnContract]], specs/keycloak-theme-parity-requirements.md -->

# Keycloak Theme Parity — Theme-Repo Progress

**Requirements:** `specs/keycloak-theme-parity-requirements.md` (IDP team, Draft v1.0)
**This file:** per-workstream progress + handoff notes, per AGENTS.md session conventions.

## Status (2026-07-11) — theme-repo deliverables COMPLETE

| Req | Deliverable | Status | Where |
|---|---|---|---|
| R2 | Pre-paint `theme-init.js` on CDN | ✅ Done | `components/themeinit/` → `/js/theme-init.js` (ADR-137) |
| R3 (read) | Strict cookie validation | ✅ Done | `parseThemeCookie()` — `light\|dark\|auto` literals only |
| R4.1 | Fonts/CORS | ✅ Done (no blocker) + ACAO added on `/icons/fonts/*` as future-proofing | `cdn/_headers` |
| R4.2 | Versioning/pinning contract | ✅ Done — "latest + contract" | `CDN_CONTRACT.md` (ADR-139) |
| R4.3 | Cache headers | ✅ Done | `cdn/_headers` → `dist/_headers` (build `copy:cdn`) |
| R5.a | Auth surface promoted to CDN | ✅ Done — component + factory | `components/authcard/` (ADR-138) |
| R5.1 | Canonical markup documented | ✅ Done | `components/authcard/README.md` |
| R1 | Cookie write in ThemeManager | ✅ **Already implemented in apps repo** — verified | `apps: typescript/shared/theme/theme-manager.ts` |
| R5.2 | Logo bundling | N/A — IDP team (per spec) | — |

Verification: full build green; 4160 unit tests + 16 structure checks pass;
`theme-init.js` is 1.2 KB minified and runs clean standalone.

## Handoff notes → apps team

1. **R1 is done on your side** — `buildThemeCookie()` / `syncThemeCookie()`
   in `theme-manager.ts` match the R3 contract exactly (mode-not-resolved,
   guarded `Domain=.knobby.io`, `SameSite=Lax`, `Secure`, 1-year, refreshed
   via `applyTheme()` on every init/change). One nit, cosmetic only:
   `setTheme()` early-returns when the mode is unchanged, so a clobbered
   cookie is not rewritten until the next real change or page load
   (`initTheme()` → `applyTheme()` covers reloads).
2. **R2.6 convergence** (replace `admin-theme.js` with the CDN
   `theme-init.js`): be aware this **changes fresh-user behavior** — with
   no stored preference, `admin-theme.js` defaults to *light*, while
   `theme-init.js` follows `prefers-color-scheme` (which is what spec
   AC#4 requires). Also `theme-init.js` deliberately does NOT carry the
   `THEME_CHANGED` postMessage bridge — iframe sub-apps keep that via
   `ThemeManager.setupSubAppTheme()`.
3. **Auth-card CSS dedup**: `components/authcard/authcard.css` on the CDN
   is a verbatim port of your `frontend/static/app.css` auth rules
   (`.brand-logo(.lg/.brand-logo-img)`, `.auth-main`, `.auth-container`,
   `.auth-card`, `.auth-step`, `.idp-button`, `.idp-icon`, `.divider`,
   `.divider-text`, `slideUp`/`fadeIn`). Once you link the CDN asset you
   can delete those rules from `app.css` (NOT ported, intentionally:
   `.tenant-badge-logo`, `.tenant-logo`, `.spinner`, `.hidden` — app-local,
   not part of the parity surface).

## Handoff notes → IDP team

1. Everything you need is live on the CDN after the next deploy:
   `custom.css`, `/js/theme-init.js`, `components/authcard/authcard.css`,
   canonical markup in `components/authcard/README.md`, and the
   compatibility promises in `CDN_CONTRACT.md`.
2. **Spec gap flagged (R2 vs AC#3):** acceptance criterion 3 ("toggling OS
   appearance while on the page updates it") requires a live `matchMedia`
   *change listener*, not just the pre-paint set described in R2.3. The
   shipped `theme-init.js` implements the listener (attached while the
   mode is `auto` or unset). Suggest updating R2's text to match.
3. Load `theme-init.js` **blocking** in `<head>` (no `defer`/`async`), and
   source icon fonts from the public CDNs per R4.1 — do not self-host from
   `static.knobby.io/icons/…` (ACAO is now sent on `/icons/fonts/*`, but
   the path is untested in the parity flow).

## Session log

- **2026-07-12** — Close-out: @entrypoint markers, repo index rebuilt,
  AGENT_INSIGHTS.md created, accepted-debt log (DEBT-PAR-1..4) added to
  CODEBASE_FIXES.md, standards audit passed, changelog updated; committed
  and pushed. User sign-off on AuthCard.
- **2026-07-11** — Spec reviewed with user; plan approved. Phases A–D
  delivered: ThemeInit (ADR-137, 34 tests), AuthCard (ADR-138, 32 tests,
  stencil + studio + demo), CDN contract (ADR-139, `_headers` +
  `CDN_CONTRACT.md`), knowledge base + docs updated. Discovered during
  review: apps repo had already shipped R1 and documented the expected
  `/js/theme-init.js` URL in `apps/specs/infra/keycloak.prd.md` — the
  theme repo was the blocking side.
