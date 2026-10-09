<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT
File GUID: 31305fe6-61a2-4999-b056-6092cdff7776
Created: 2026
-->

<!-- ⚓ COMPONENT: ThemeInit -->
<!-- 📜 PURPOSE: Pre-paint theme initializer README — integration guide for app pages and the Keycloak FreeMarker theme. -->
<!-- 🔗 RELATES: [[ThemeToggle]], [[DarkMode]], [[AuthCard]], specs/keycloak-theme-parity-requirements.md -->

# ThemeInit — Pre-Paint Theme Initializer

A tiny (~1.2 KB minified), dependency-free script that sets `data-bs-theme`
on `<html>` **before first paint**, so pages render in the user's chosen
theme with no flash of the wrong mode. It is the shared reader side of the
cross-subdomain theme-parity contract: the knobby app writes the preference,
and any `*.knobby.io` page — including the Keycloak login pages on
`auth.knobby.io` — reads it through this script.

Unlike the other entries in `components/`, ThemeInit is **not a UI
component**: it renders nothing, has no factory, and takes no options. It
lives here to reuse the component build pipeline (TypeScript → IIFE →
minify) and is additionally published at a stable top-level URL.

## URLs

| URL | Purpose |
|---|---|
| `https://static.knobby.io/js/theme-init.js` | **Canonical.** Use this in `<head>`. |
| `https://static.knobby.io/components/themeinit/themeinit.js` | Build-pipeline twin. **Internal — do not link this one.** It exists because the source lives under `components/` to reuse the component build pipeline (ADR-137), and the deploy publishes that directory wholesale. It is byte-identical today and carries no promise to stay reachable. See DEBT-PAR-1. |

## Usage

Include as a **blocking** external script in `<head>`, before any stylesheets
paint content — do **not** add `defer` or `async` (that would re-introduce
the flash):

```html
<head>
    <link href="https://static.knobby.io/css/custom.css" rel="stylesheet">
    <script src="https://static.knobby.io/js/theme-init.js"></script>
    <!-- rest of head -->
</head>
```

No inline JavaScript is required, so the script is compatible with a strict
`Content-Security-Policy` (e.g. Keycloak's) without a nonce or hash — only
`script-src https://static.knobby.io` needs allowlisting.

## Resolution order

1. **Cookie** `knobby-theme` (Domain `.knobby.io`) — value must be exactly
   `light`, `dark`, or `auto`; anything else is ignored (strict validation).
2. **localStorage** `knobby-theme` — the same-origin app case; same strict
   validation; read is try/catch-guarded for privacy modes.
3. **`prefers-color-scheme`** — no stored preference follows the OS.
4. **`light`** — final default when `matchMedia` is unavailable.

The stored value is the **mode**, never the resolved theme: `auto` resolves
at read time via `matchMedia('(prefers-color-scheme: dark)')`, and while the
mode is `auto` (or no preference exists) the script keeps a `change`
listener attached so the page follows OS appearance changes live. Explicit
`light`/`dark` modes attach no listener.

## The cookie contract (written by the app, read here)

| Attribute | Value |
|---|---|
| Name | `knobby-theme` |
| Value | `light` \| `dark` \| `auto` (mode, not resolved) |
| Domain | `.knobby.io` |
| Path | `/` |
| SameSite | `Lax` |
| Secure | yes (on HTTPS) |
| HttpOnly | no (client JS must read it) |
| Max-Age | 1 year, refreshed on write |

The writer is `ThemeManager` (`typescript/shared/theme/theme-manager.ts` in
the apps repo). The cookie is a **non-sensitive UI preference only** — it
must never carry identity or tokens.

## Testing hooks

The module exports pure functions (`parseThemeCookie`, `readThemeMode`,
`resolveThemeMode`) and an injectable `runThemeInit(env)` used by the unit
tests; the published IIFE strips all exports and leaks nothing onto
`window`. `runThemeInit` returns a cleanup function that detaches the OS
listener (test use only).

## Non-goals

- **No persistence.** It never writes the cookie or localStorage.
- **No THEME_CHANGED bridge.** Shell/iframe live-sync stays in the app's
  `ThemeManager.setupSubAppTheme()`; pages that converge onto this script
  keep that wiring separately if they are embedded in the shell.
- **No UI.** Pair with the [`themetoggle`](../themetoggle/README.md)
  component for a visible switcher.
