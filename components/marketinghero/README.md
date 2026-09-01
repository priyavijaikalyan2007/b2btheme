<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
-->

<!-- AGENT: Documentation for the MarketingHero component — public-page introduction area, CSS-first. -->

<!-- ⚓ COMPONENT: MarketingHero -->
<!-- 📜 PURPOSE: Markup contract, options, and the document-order rule for the public-page hero. -->
<!-- 🔗 RELATES: [[SiteFooter]], [[AuthCard]], [[EnterpriseTheme]], specs/marketinghero-sitefooter.prd.md -->

# MarketingHero

The introduction area for a public page: an optional eyebrow, a heading, a
supporting paragraph, up to two actions, and an optional media slot. Three
layouts — stacked, centered, and split.

**The CSS is the contract; the JS is a convenience.** A static page links the
stylesheet, writes the markup below, and loads no script. The factory exists
for applications that would rather pass data than write HTML, and it renders
exactly the markup documented here — a canonical-structure test in
[marketinghero.test.ts](./marketinghero.test.ts) fails if the two ever drift.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/marketinghero/marketinghero.css` |
| JS (optional) | `components/marketinghero/marketinghero.js` |
| Types | `components/marketinghero/marketinghero.d.ts` |

## Requirements

- **Bootstrap CSS** — for the `.btn-*` classes the actions use, and for the
  `--theme-*` tokens.
- Does **not** require Bootstrap JS.
- Does **not** require Bootstrap Icons.

## Canonical markup

```html
<section class="marketinghero marketinghero-split marketinghero-stack-lg"
         aria-labelledby="hero-title">
  <div class="marketinghero-content">
    <h1 class="marketinghero-title" id="hero-title">Ship enterprise UI faster</h1>
    <p class="marketinghero-eyebrow">New</p>
    <p class="marketinghero-lede">A compact Bootstrap 5 theme and component library.</p>
    <div class="marketinghero-actions">
      <a class="btn btn-primary" href="/signup">Get started</a>
      <a class="btn btn-outline-secondary" href="/docs">Read the docs</a>
    </div>
  </div>
  <aside class="marketinghero-aside">
    <img src="/product.png" alt="The workspace, showing a populated dashboard.">
  </aside>
</section>
```

## Document order — read before reformatting

**The eyebrow follows the heading in the DOM and is lifted above it on screen**
with `order: -1`. That is deliberate, not a mistake to tidy up.

The requirement was an eyebrow above the heading *and* a heading that stays
first in document order. Those cannot both hold in plain source order. Nothing
in the content column is focusable, so displaced visual order carries no
keyboard hazard, while assistive technology still reaches the `h1` first.
Nesting the eyebrow inside the heading — the obvious alternative — would fold
it into the heading's accessible name.

Recorded as ADR-146, decision D4.

## Classes

| Class | Role |
|---|---|
| `.marketinghero` | Root. Flex container. |
| `.marketinghero-centered` | Layout modifier: one centred column. |
| `.marketinghero-split` | Layout modifier: two columns. |
| `.marketinghero-stack-{sm,md,lg,xl,xxl}` | Width at and above which a split sits side by side. Below it the hero stacks. Only meaningful with `.marketinghero-split`. |
| `.marketinghero-content` | Text column. Carries the eyebrow's `order`. |
| `.marketinghero-eyebrow` | Small label above the heading. |
| `.marketinghero-title` | Heading. |
| `.marketinghero-lede` | Supporting paragraph. Capped at a 60-character measure. |
| `.marketinghero-actions` | Flex row for the actions. Wraps. |
| `.marketinghero-aside` | Media, illustration, or callout slot. |

With no layout modifier the hero is a single left-aligned column. In both
single-column modes the aside renders below the content, so one markup shape
serves all three layouts.

## Quick start (factory)

```html
<link rel="stylesheet" href="components/marketinghero/marketinghero.css">
<script src="components/marketinghero/marketinghero.js"></script>
<script>
    var hero = createMarketingHero("hero-host", {
        eyebrow: "New",
        title: "Ship enterprise UI faster",
        lede: "A compact Bootstrap 5 theme and component library.",
        layout: "split",
        primaryAction: { text: "Get started", href: "/signup" },
        secondaryAction: { text: "Read the docs", href: "/docs" }
    });
</script>
```

## Options (MarketingHeroOptions)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | `string` | — | **Required.** Heading text. |
| `eyebrow` | `string?` | none | Small label above the heading. Omitted renders no element. |
| `lede` | `string?` | none | Supporting paragraph. Omitted renders no element. |
| `layout` | `"stacked" \| "centered" \| "split"` | `"stacked"` | Layout variant. |
| `stackBelow` | `"sm" \| "md" \| "lg" \| "xl"` | `"lg"` | Breakpoint below which a split stacks. Ignored unless `layout` is `"split"`. |
| `primaryAction` | `{ text, href?, onClick? }?` | none | Rendered `btn btn-primary`. |
| `secondaryAction` | `{ text, href?, onClick? }?` | none | Rendered `btn btn-outline-secondary`. |
| `aside` | `HTMLElement?` | none | Media slot. Appended as a node. |
| `cssClass` | `string?` | none | Extra class(es) on the root. |

An action with an `href` renders an `<a>`; one with only `onClick` renders a
`<button type="button">`. Both may be supplied.

The stylesheet also ships `.marketinghero-stack-xxl`, which hand-authored
markup can use. `stackBelow` stops at `xl` because a hero that only goes
side-by-side above 1400px is a single-column hero on nearly every screen.

### Handle

`getElement()` — the root `<section>`, or `null` after teardown.
`destroy()` — removes listeners and DOM. Idempotent.
`show(containerId?)` / `hide()` — attach and detach without discarding state.

## Motion and forced colours

The hero ships **no animation at all**, which is a stronger guarantee than
honouring `prefers-reduced-motion`. Under `forced-colors: active` the aside
takes a system-coloured border so it stays a distinct region when the system
palette replaces the theme.

## Scope notes

- **Excluded from the DynamicFormSwitcher field convention (ADR-134):** the
  hero is chrome, not a value-bearing field. Nothing in it round-trips as a
  JSON value.
- **`display` conformance** in the capability manifest — it mounts, renders,
  and tears down, and emits nothing the canvas wires.
- Contrast is verified by eye against the token table in `DARKMODE.md`. There
  is no automated contrast gate in this repository; see DEBT-WEB-1.
