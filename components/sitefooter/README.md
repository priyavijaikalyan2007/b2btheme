<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
-->

<!-- AGENT: Documentation for the SiteFooter component — semantic public-site footer, CSS-first. -->

<!-- ⚓ COMPONENT: SiteFooter -->
<!-- 📜 PURPOSE: Markup contract, options, and the deliberate visited-link inversion. -->
<!-- 🔗 RELATES: [[MarketingHero]], [[AuthCard]], [[EnterpriseTheme]], specs/marketinghero-sitefooter.prd.md -->

# SiteFooter

The footer for a public page: organization details, grouped navigation,
contact details, legal links, and optional build information, in one to four
responsive columns.

**The CSS is the contract; the JS is a convenience.** A static page links the
stylesheet, writes the markup below, and loads no script. The factory exists
for applications that would rather pass data than write HTML, and it renders
exactly the markup documented here — a canonical-structure test in
[sitefooter.test.ts](./sitefooter.test.ts) fails if the two ever drift.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/sitefooter/sitefooter.css` |
| JS (optional) | `components/sitefooter/sitefooter.js` |
| Types | `components/sitefooter/sitefooter.d.ts` |

## Requirements

- **Bootstrap CSS** — for the `--theme-*` tokens.
- Does **not** require Bootstrap JS.
- Does **not** require Bootstrap Icons.

## Canonical markup

```html
<footer class="sitefooter">
  <div class="sitefooter-grid sitefooter-cols-3">
    <div class="sitefooter-org">
      <p class="sitefooter-orgname">Outcrop Inc</p>
      <p class="sitefooter-orgdesc">Enterprise software.</p>
      <address class="sitefooter-contact">
        <p><a href="mailto:hello@example.test">hello@example.test</a></p>
      </address>
    </div>
    <nav class="sitefooter-group" aria-labelledby="ft-product">
      <h2 class="sitefooter-grouptitle" id="ft-product">Product</h2>
      <ul class="sitefooter-links">
        <li><a href="/overview">Overview</a></li>
      </ul>
    </nav>
    <nav class="sitefooter-group" aria-labelledby="ft-company">
      <h2 class="sitefooter-grouptitle" id="ft-company">Company</h2>
      <ul class="sitefooter-links">
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </div>
  <div class="sitefooter-legal">
    <p class="sitefooter-copyright">© 2026 Outcrop Inc</p>
    <ul class="sitefooter-legallinks">
      <li><a href="/privacy">Privacy</a></li>
    </ul>
    <p class="sitefooter-build">2026.09.01 · a1b2c3d</p>
  </div>
</footer>
```

Each group must be a `<nav>` named by its own heading through
`aria-labelledby`. That is what distinguishes several footer navigations from
each other for assistive technology, and hand-authored markup has to supply
the ids itself.

## Link colours — read before "fixing" them

**Unvisited links are muted; visited links take the accent colour.** That
inverts what most sites do, and it is deliberate.

The requirement was a clear visited state in a footer that stays quiet by
default. Colouring every link with the accent would make the footer the
loudest thing on the page; colouring visited links instead keeps it calm and
makes the distinction obvious. Colour is not the only signal — hover and focus
both add an underline.

Recorded as ADR-146 decision D5 and tracked as DEBT-WEB-2, because it will
read as a bug to anyone who meets it without this note.

| State | Token |
|---|---|
| Link | `--theme-text-secondary` |
| Visited | `--theme-primary` |
| Hover | `--theme-text-primary`, underlined |
| Focus visible | `2px solid $primary`, offset 2px |

## Classes

| Class | Role |
|---|---|
| `.sitefooter` | Root. Top border and surface background. |
| `.sitefooter-grid` | Column container. One track by default. |
| `.sitefooter-cols-{1,2,3,4}` | Column count at and above `md`. Below it, always one track. |
| `.sitefooter-org` | Organization block. |
| `.sitefooter-orgname` | Organization name. |
| `.sitefooter-orgdesc` | Organization description. |
| `.sitefooter-contact` | Contact block. Must be an `<address>`. |
| `.sitefooter-group` | One navigation group. Must be a `<nav>`. |
| `.sitefooter-grouptitle` | Group heading. Any level; supplies the group's accessible name. |
| `.sitefooter-links` | Link list inside a group. |
| `.sitefooter-legal` | Legal row beneath the grid. |
| `.sitefooter-copyright` | Copyright line. |
| `.sitefooter-legallinks` | Inline legal links. |
| `.sitefooter-build` | Build information. Pushed to the end of the row. |

## Columns and overflow

`repeat(N, minmax(0, 1fr))` — the `0` minimum is load-bearing. A bare `1fr`
means "at least the content's minimum size", so a single long email address
would force its track wider than its share and overflow the row. With the
zero minimum, plus `overflow-wrap: anywhere` on the contact block and the
links, long addresses and long translated compounds wrap instead.

**Nothing in this component uses `order`.** Stacking is the grid collapsing to
one track, so the small-screen sequence is the source sequence by
construction. That is the opposite of MarketingHero, where the eyebrow is
displaced deliberately.

## Quick start (factory)

```html
<link rel="stylesheet" href="components/sitefooter/sitefooter.css">
<script src="components/sitefooter/sitefooter.js"></script>
<script>
    var footer = createSiteFooter("footer-host", {
        organization: { name: "Outcrop Inc", description: "Enterprise software." },
        contact: { email: "hello@example.test" },
        groups: [
            { title: "Product", links: [{ text: "Overview", href: "/overview" }] },
            { title: "Company", links: [{ text: "About", href: "/about" }] }
        ],
        legal: { copyright: "© 2026 Outcrop Inc",
                 links: [{ text: "Privacy", href: "/privacy" }] },
        buildInfo: "2026.09.01 · a1b2c3d"
    });
</script>
```

## Options (SiteFooterOptions)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `organization` | `{ name, description?, logo? }?` | none | `logo` is an `HTMLElement`, appended as a node. |
| `contact` | `{ email?, phone?, address? }?` | none | Email renders as `mailto:`, phone as `tel:`. |
| `groups` | `SiteFooterGroup[]?` | none | Each `{ title, headingLevel?, links }`. |
| `legal` | `{ copyright?, links? }?` | none | Omitted entirely renders no legal row. |
| `buildInfo` | `string?` | none | A string you pass. No fetch, no global read. |
| `columns` | `1 \| 2 \| 3 \| 4` | derived | Derived from rendered blocks, clamped to 4. |
| `cssClass` | `string?` | none | Extra class(es) on the root. |

`headingLevel` defaults to `2` and accepts `2` through `6`. A footer that
hardcodes `h2` can break the heading outline of a page whose main content
stops at `h3`, so pick the level that fits the page.

Supplying `buildInfo` with no `legal` still renders the legal row — the build
string has nowhere else to live.

### Handle

`getElement()` — the root `<footer>`, or `null` after teardown.
`destroy()` — removes the DOM. Idempotent. Every action here is a link, so
there are no listeners to detach.
`show(containerId?)` / `hide()` — attach and detach without discarding state.

## Build information

`buildInfo` is a value the consumer passes. The component performs no fetch
and reads no global. The repository already produces that value at build time
through `npm run build:info`, so it belongs in the page template.

## Scope notes

- **Excluded from the DynamicFormSwitcher field convention (ADR-134):** the
  footer is navigation chrome, not a value-bearing field.
- **`display` conformance** in the capability manifest.
- Two footers on one page do not collide: group heading ids carry the
  instance counter.
- Contrast is verified by eye against the token table in `DARKMODE.md`. There
  is no automated contrast gate in this repository; see DEBT-WEB-1.
