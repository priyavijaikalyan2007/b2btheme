<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT
File GUID: 5af158bf-c82e-4eff-9eb9-ac4931a6f9f9
Created: 2026
-->

<!-- ⚓ COMPONENT: AuthCard -->
<!-- 📜 PURPOSE: Canonical login-card pattern README — frozen Keycloak-parity contract (markup + CSS) and factory usage. -->
<!-- 🔗 RELATES: [[ThemeInit]], [[ThemeToggle]], [[DarkMode]], specs/keycloak-theme-parity-requirements.md -->

# AuthCard — Shared Auth Surface (Frozen Parity Contract)

The canonical login-card pattern: brand header, error alert, identity-provider
buttons, divider, and footer link. Promoted to the CDN from the knobby app's
`frontend/static/app.css` so **one source of truth** drives both:

- the app login at `prod.knobby.io/auth/login`, and
- the Keycloak fallback login at `auth.knobby.io` (plain FreeMarker theme).

All colors use runtime `--bs-*` tokens, so the card renders correctly in
light **and** dark mode wherever `custom.css` is loaded — pair with
[`themeinit`](../themeinit/README.md) for pre-paint theme selection.

## ⚠️ Breaking-change policy

The class names and structure below are mirrored **verbatim** by the Keycloak
FreeMarker templates (IDP team) and by the app. Renaming a class, removing a
rule, or restructuring the markup is a **breaking change**: it must be
versioned and communicated to the IDP team *before* release (see
`CDN_CONTRACT.md`). Additive changes are fine. The unit tests' *"canonical
structure"* block ([authcard.test.ts](./authcard.test.ts)) fails on drift.

Frozen classes: `.brand-logo` (`.lg`, `.brand-logo-img`), `.auth-main`,
`.auth-container`, `.auth-card`, `.auth-step` (`.active`), `.idp-button`,
`.idp-icon`, `.divider`, `.divider-text`, keyframes `slideUp` / `fadeIn`.

## Files

| File | CDN URL |
|---|---|
| CSS | `https://static.knobby.io/components/authcard/authcard.css` |
| JS (optional factory) | `https://static.knobby.io/components/authcard/authcard.js` |

**The CSS is the contract; the JS is a convenience.** Server-rendered
consumers (Keycloak FreeMarker) link only the CSS and emit the canonical
markup themselves — the login must work with JavaScript disabled.

## Canonical markup (spec Appendix A)

```html
<div class="auth-main"> <!-- page-level: centers the card in the chrome -->
  <div class="auth-container">
    <div class="auth-card card shadow-lg p-4">
      <div class="text-center mb-4">
        <img src="<LOGO_URL>" alt="knobby.io" class="brand-logo lg mx-auto mb-3 brand-logo-img">
        <h1 class="h3 fw-bold mb-1">knobby.io</h1>
        <p class="text-muted small">Engineering &amp; Organizational Productivity</p>
      </div>
      <div id="error-alert" class="alert alert-danger d-none" role="alert"></div>
      <div class="auth-step active">
        <h2 class="h5 fw-semibold mb-1 text-center">Welcome back</h2>
        <p class="text-muted text-center mb-4">Continue with your account</p>
        <!-- One .idp-button per provider (SVG icon + "Continue with <name>").
             Keycloak renders these from social.providers. -->
        <button class="btn btn-outline-secondary w-100 idp-button mb-2">
          <svg class="idp-icon" viewBox="0 0 48 48" aria-hidden="true">…</svg>
          Continue with Google
        </button>
        <div class="divider mt-3"><span class="divider-text">New to knobby.io?</span></div>
        <a href="/auth/signup.html"
           class="link-primary text-decoration-none fw-semibold small d-block text-center">Create an account</a>
      </div>
    </div>
  </div>
</div>
```

## Factory usage (app pages)

```html
<link rel="stylesheet" href="https://static.knobby.io/components/authcard/authcard.css">
<script src="https://static.knobby.io/components/authcard/authcard.js"></script>

<div id="login-card"></div>
<script>
  const card = createAuthCard("login-card", {
      logoUrl: "/logo.png",
      brandTitle: "knobby.io",
      brandSubtitle: "Engineering & Organizational Productivity",
      heading: "Welcome back",
      subheading: "Continue with your account",
      providers: [
          { id: "google", label: "Continue with Google", iconSvg: GOOGLE_SVG },
          { id: "microsoft-oidc", label: "Continue with Microsoft", iconSvg: MS_SVG },
      ],
      dividerText: "New to knobby.io?",
      footerLink: { text: "Create an account", href: "/auth/signup.html" },
      onProviderSelect: (id) => redirectToKeycloak(id),
  });

  card.showError("We could not sign you in — try again.");
</script>
```

### Options

| Option | Type | Notes |
|---|---|---|
| `logoUrl`, `logoAlt` | `string?` | Omit `logoUrl` → no `<img>`; `logoAlt` defaults to `brandTitle`. |
| `brandTitle`, `brandSubtitle` | `string?` | Brand header lines; omitted → not rendered. |
| `heading`, `subheading` | `string?` | Step heading lines. |
| `providers` | `AuthCardProvider[]` | `{ id, label, iconSvg?, href?, onClick? }`. `href` renders an `<a>` (top-level navigation hand-off); otherwise a `<button>`. |
| `dividerText` | `string?` | Omitted → no divider. |
| `footerLink` | `{ text, href }?` | Omitted → not rendered. |
| `onProviderSelect` | `(id) => void` | Fires before the provider's own `onClick`. |

### Handle

`showError(message)` / `clearError()` — plain-text error surface
(`textContent`, never HTML). `getElement()` — root `.auth-container`.
`destroy()` — idempotent teardown.

### Security notes

- All option strings render via `textContent` — user-influenced values
  cannot inject markup.
- `iconSvg` is the one **trusted-markup** input: it must be an
  application-authored static literal (brand SVG icons), never user input.
  Anything that does not parse to a single `<svg>` root is discarded with a
  console warning.

## Scope notes

- **Excluded from the DynamicFormSwitcher field convention (ADR-134):** the
  card is a workflow surface (like FormDialog), not a value-bearing field.
- `.auth-main` is page-level scaffolding (centers the card inside the app
  chrome); `createAuthCard` renders from `.auth-container` down, so the page
  decides its own vertical centering strategy.
- Provider button ids are `authcard-idp-<providerId>` — one card per page.
