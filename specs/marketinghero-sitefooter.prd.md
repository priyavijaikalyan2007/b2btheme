<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
File GUID: 5bda82a5-c7dc-49f7-bcb8-38bdc08ec4be
Created: 2026-09-01
-->

<!-- AGENT: Design spec for MarketingHero and SiteFooter — two CSS-first public-surface components requested by the Outcrop Inc website. -->

<!-- ⚓ SPEC: MarketingHeroAndSiteFooter -->
<!-- 📜 PURPOSE: The agreed design for the two public-site components, before any implementation plan exists. -->
<!-- 🔗 RELATES: [[AuthCard]], [[EmptyState]], [[ThemeToggle]], specs/feature_request_website.md, CDN_CONTRACT.md, DARKMODE.md -->

# MarketingHero and SiteFooter

**Status:** Implemented and shipped 2026-09-02 (ADR-146). Plan: `specs/marketinghero-sitefooter.plan.md`. Progress: `specs/marketinghero.md`, `specs/sitefooter.md`.
**Date:** 2026-09-01
**Origin:** `specs/feature_request_website.md`
**Folders:** `./components/marketinghero/`, `./components/sitefooter/`
**Spec author:** Agent + User

---

## 1. Goal

Add two components that the Outcrop Inc website needs and that Bootstrap does
not provide: an introduction area for public pages, and a semantic public-site
footer.

Neither exists today. `MASTER_COMPONENT_LIST.md` contains no hero and no
footer, and none of the 123 component folders overlaps either surface.

## 2. Scope

In scope:

- `MarketingHero` — heading, supporting text, eyebrow, up to two actions, and
  an optional media or callout slot, in one-column, centered, and two-column
  layouts.
- `SiteFooter` — organization details, grouped navigation, contact details,
  legal links, and optional build information, in one to four columns.

Out of scope:

- A navigation bar, cards, badges, buttons, or grid utilities. The website uses
  Bootstrap's own for these.
- A theme switch. `ThemeToggle` already exists and must not be duplicated.
- Any new spacing or type tokens. See decision D2.
- An automated contrast gate. See section 8.

## 3. Decisions taken during design

These were settled with the user before this spec was written. They are
recorded here so a later reader does not undo them by accident.

| Id | Decision | Reason |
|---|---|---|
| D1 | Both ship as first-class library components under the normal additive contract, not as a frozen parity contract and not in the website repository. | The website is the first consumer, not the only one. A freeze like AuthCard's is warranted only when another team mirrors the markup verbatim, which is not the case here. |
| D2 | Both use the existing compact enterprise scale. No new spacing or type tokens. | The public site should look unmistakably like the product. A separate public-surface scale would add tokens that only two components use. |
| D3 | The stylesheet is the contract. A thin factory exists as a convenience. | Matches AuthCard, which already proved the pattern against an external consumer. The factory is what earns the Layout Studio stencil, the Component Studio entry, and a passing conformance gate. |
| D4 | In `MarketingHero`, the eyebrow follows the heading in the DOM and is lifted above it with `order: -1`. | The request asks both for an eyebrow and for the heading to stay first in document order. Nothing in that block is focusable, so displaced visual order carries no keyboard hazard. Nesting the eyebrow inside the heading would pollute the heading's accessible name. |
| D5 | In `SiteFooter`, unvisited links use muted text and visited links pick up the accent colour. | The user chose this to make the visited state genuinely obvious while keeping the footer quiet by default. It inverts the usual convention, so it is written down rather than left to look like an accident. Colour is not the only signal: hover and focus add an underline. |

## 4. Architecture

### 4.1 Files

Each component ships the same set:

```
components/<name>/
    <name>.scss           the contract; the only file a static site needs
    <name>.ts             convenience factory
    <name>.manifest.ts    capability manifest, display level
    <name>.test.ts        unit and canonical-structure tests
    README.md
```

### 4.2 The rule that makes the contract real

The stylesheet never depends on the TypeScript. Every class works on
hand-authored markup with no script on the page. The factory emits exactly the
markup documented in the README and nothing else.

A canonical-structure test asserts that equality for both components. Without
it the two can drift silently, and the site — which loads only the CSS — would
be the place the drift shows up.

### 4.3 Conformance

Both declare `conformance: "display"`. Both are excluded from the ADR-134 field
convention for the reason Sidebar and Toolbar are: they are chrome, not
value-bearing controls, and nothing in either round-trips as a JSON value.

The handle exposes `getElement()` and an idempotent `destroy()`. The manifests
declare empty `emits`, `accepts`, `actions`, and `stateKeys`.

Neither name may appear in the `EXEMPT` list of
`runtime/fleet-conformance.test.ts`.

### 4.4 Factory signature

Both are new components, so both use the canonical ADR-134 form that AGENTS.md
requires of new work:

```typescript
createMarketingHero(containerId: string, options): Handle
createSiteFooter(containerId: string, options): Handle
```

Manifests declare `factoryStyle: "container-first"`. The signature problem
recorded in ADR-144 does not apply, because there are no existing consumers.

### 4.5 Affordances

| Component | `shape` | `intents` | Note |
|---|---|---|---|
| MarketingHero | `document` | `browse` | Renders prose and actions. |
| SiteFooter | `collection` | `browse` | Renders groups of links. |

Both declare a generous `minViewport` width. Neither is usable in a narrow
canvas cell.

## 5. MarketingHero

### 5.1 Canonical markup

```html
<section class="marketinghero marketinghero-split marketinghero-stack-lg"
         aria-labelledby="hero-title">
  <div class="marketinghero-content">
    <h1 class="marketinghero-title" id="hero-title">…</h1>
    <p class="marketinghero-eyebrow">…</p>
    <p class="marketinghero-lede">…</p>
    <div class="marketinghero-actions">
      <a class="btn btn-primary" href="…">Primary</a>
      <a class="btn btn-outline-secondary" href="…">Secondary</a>
    </div>
  </div>
  <aside class="marketinghero-aside">…</aside>
</section>
```

The eyebrow follows the heading in source and sits above it on screen, per
decision D4.

### 5.2 Classes

| Class | Role |
|---|---|
| `.marketinghero` | Root. Flex container. |
| `.marketinghero-centered` | Layout modifier: one centred column. |
| `.marketinghero-split` | Layout modifier: two columns. |
| `.marketinghero-stack-{sm,md,lg,xl}` | Breakpoint below which a split collapses. Default `lg`. |
| `.marketinghero-content` | Text column. Flex column; carries the eyebrow's `order`. |
| `.marketinghero-eyebrow` | Small label above the heading. `order: -1`. |
| `.marketinghero-title` | Heading. |
| `.marketinghero-lede` | Supporting paragraph. |
| `.marketinghero-actions` | Flex row for the actions. Wraps. |
| `.marketinghero-aside` | Optional media, illustration, or callout slot. |

With no layout modifier the hero is a single left-aligned column. In both
single-column modes the aside renders below the content, so one markup shape
serves all three layouts.

### 5.3 Breakpoint classes

A Sass loop over `$grid-breakpoints` generates the `.marketinghero-stack-*`
classes. "Configurable breakpoint" is therefore a class swap, not a script.

**Amended 2026-09-01, during planning.** `src/scss/_variables.scss` imports
nothing and does not define `$grid-breakpoints`, so component SCSS cannot see
Bootstrap's map — today `components/applauncher/applauncher.scss:451` hardcodes
`@media (min-width: 768px)` for want of it. The map is therefore added to
`_variables.scss` with Bootstrap's own values and `!default`, which leaves the
compiled `custom.css` byte-identical and makes the names available fleet-wide.
That is Task 1 of `specs/marketinghero-sitefooter.plan.md`.

### 5.4 Actions

Actions use Bootstrap's own `.btn` classes. The component contributes the flex
row, the gap, and wrapping. It does not restyle buttons.

### 5.5 Motion and forced colours

The hero ships no animation. That is a stronger guarantee than honouring
`prefers-reduced-motion`, and it follows from the compact register in D2.

A `forced-colors: active` block keeps the aside's border visible when the
system palette takes over.

### 5.6 Factory options

```typescript
createMarketingHero("hero-host", {
    eyebrow?: string,
    title: string,
    lede?: string,
    layout?: "stacked" | "centered" | "split",   // default "stacked"
    stackBelow?: "sm" | "md" | "lg" | "xl",      // default "lg"
    primaryAction?:   { text: string, href?: string, onClick?: () => void },
    secondaryAction?: { text: string, href?: string, onClick?: () => void },
    aside?: HTMLElement,
});
```

Every string renders through `textContent`. `aside` takes an `HTMLElement`.
There is deliberately no `asideHtml` option: AuthCard's single trusted-markup
input needed a warning in its README, and this component does not need to
repeat that.

An action with an `href` renders an `<a>`; one with only `onClick` renders a
`<button>`. Omitted options render nothing, not an empty element.

## 6. SiteFooter

### 6.1 Canonical markup

```html
<footer class="sitefooter">
  <div class="sitefooter-grid sitefooter-cols-3">
    <div class="sitefooter-org">
      <p class="sitefooter-orgname">Outcrop Inc</p>
      <p class="sitefooter-orgdesc">…</p>
      <address class="sitefooter-contact">…</address>
    </div>
    <nav class="sitefooter-group" aria-labelledby="ft-product">
      <h2 class="sitefooter-grouptitle" id="ft-product">Product</h2>
      <ul class="sitefooter-links"><li><a href="…">…</a></li></ul>
    </nav>
  </div>
  <div class="sitefooter-legal">
    <p class="sitefooter-copyright">© 2026 Outcrop Inc</p>
    <ul class="sitefooter-legallinks">…</ul>
    <p class="sitefooter-build">2026.09.01 · a1b2c3d</p>
  </div>
</footer>
```

### 6.2 Columns

`.sitefooter-cols-1` through `.sitefooter-cols-4` set
`grid-template-columns: repeat(N, minmax(0, 1fr))`, collapsing to one track
below `md`.

The `minmax(0, 1fr)` is load-bearing. It is what stops a long email address or
a long translated compound from forcing a track wider than its share. Paired
with `overflow-wrap: anywhere` on the contact block, it meets the overflow
requirement by construction rather than by hope.

CSS Grid is used here in preference to Bootstrap's row and column utilities
because the column count stays a single class on the container instead of
`col-*` classes on every child, and because `minmax(0, 1fr)` has no clean
equivalent in the utility set.

### 6.3 Reading order

Nothing in `SiteFooter` uses `order`. Stacking is the grid collapsing to one
track, so the small-screen sequence is the source sequence by construction.

### 6.4 Navigation groups

Each group is a `<nav>` named by its own heading through `aria-labelledby`.
That is what supplies the accessible names the request asks for.

The factory renders `h2` by default and accepts `headingLevel`. A footer that
hardcodes `h2` can break the heading outline of a page whose main content stops
at `h3`. Hand-authored markup chooses its own level; the class does not care.

### 6.5 Links

Per decision D5:

| State | Token |
|---|---|
| Link | `--theme-text-secondary` |
| Visited | `--theme-primary` |
| Hover | `--theme-text-primary`, underlined |
| Focus visible | `outline: 2px solid $primary`, `outline-offset: 2px` |

### 6.6 Build information

`buildInfo` is a string the consumer passes. The component performs no fetch
and reads no global. The site already produces that value at build time through
`npm run build:info`, so it belongs in the template.

### 6.7 Factory options

```typescript
createSiteFooter("footer-host", {
    organization?: { name: string, description?: string, logo?: HTMLElement },
    contact?:      { email?: string, phone?: string, address?: string },
    groups?:       Array<{
                       title: string,
                       headingLevel?: 2 | 3 | 4 | 5 | 6,   // default 2
                       links: Array<{ text: string, href: string }>,
                   }>,
    legal?:        { copyright?: string, links?: Array<{ text: string, href: string }> },
    buildInfo?:    string,
    columns?:      1 | 2 | 3 | 4,   // default: derived from content
});
```

When `columns` is omitted the factory derives it from the number of rendered
blocks, capped at four.

## 7. Tokens, dark mode, and focus

Every colour comes from a `var(--theme-*)` token. No hex values. Spacing comes
from the existing `$spacer` steps and type from the existing `$font-size-*`
ladder, per D2.

Neither component contains a dark-mode rule. The tokens are already redefined
under the dark selector, so `data-bs-theme="light"` and `data-bs-theme="dark"`
work with no component-specific code. The requirement is met by architecture
rather than by duplication.

Focus is never removed, only styled: `outline: 2px solid $primary` with
`outline-offset: 2px`, matching `EmptyState` and the rest of the fleet.

## 8. Accessibility verification, and its limit

Both components use only the token pairs documented in the DARKMODE.md table,
which carry rated light and dark values. Muted text is never placed on a raised
surface, where `$gray-500` gets thin.

**There is no automated contrast gate in this repository today.** Contrast is
verified by eye on the demo pages, in both themes. Mechanising it is worthwhile
and is deliberately not part of this work: it is fleet-wide, since all 123
components carry the same unverified claim. Tracked as **DEBT-WEB-1** in
`CODEBASE_FIXES.md` rather than claimed here.

## 9. Testing

### 9.1 Unit, per component

Written before the implementation, per the AGENTS.md loop.

- Canonical structure: the factory's DOM matches the README markup exactly.
  This is the drift guard for section 4.2, modelled on `authcard.test.ts`.
- Options render as documented.
- Omitted options render nothing, not an empty element.
- A missing container logs and returns cleanly rather than throwing.
- A title containing `<script>` appears as text, proving the `textContent`
  path.
- `destroy()` called twice is safe.
- `MarketingHero`: each layout modifier and each `stackBelow` value emits the
  expected class.
- `SiteFooter`: `headingLevel` is honoured; `columns` is derived correctly when
  omitted.

### 9.2 Conformance

`runtime/fleet-conformance.test.ts` picks both up once the manifests exist. A
test asserts neither appears in `EXEMPT`.

### 9.3 End to end

Playwright, against the two new demo pages:

- The split hero collapses at its configured breakpoint under a viewport
  resize.
- The footer stacks in source order.
- Focus rings are visible on actions and footer links.
- Both render in light and dark.

## 10. Deliverables

The work is incomplete until every item is done, for each component:

- [ ] `<name>.scss`, `<name>.ts`, `<name>.manifest.ts`, `<name>.test.ts`, `README.md`
- [ ] Demo page at `demo/components/<name>.html`
- [ ] Demo card registered in `demo/index.html` — the gallery's only index
- [ ] Layout Studio stencil in `stencils-ui-components.ts`, per the Tier A/B/C pattern
- [ ] Component Studio entry with its `factory` string
- [ ] Progress spec at `specs/<name>.md`
- [ ] Entries in `COMPONENTS.md`, `COMPONENT_INDEX.md`, `MASTER_COMPONENT_LIST.md`
- [ ] Concepts added to `agentknowledge/concepts.yaml` — held until the code
      exists, because a concept entry points at an anchor file
- [x] One ADR in `agentknowledge/decisions.yaml` recording D1 through D5 —
      **ADR-146**, written at design time because the decisions were made then
- [ ] One line appended to `agentknowledge/history.jsonl`
- [ ] `CHANGELOG.md` entry
- [ ] `CONVERSATION.md` updated
- [ ] `npm run build` and `npm test` green

## 11. Accepted limits

| Id | Limit |
|---|---|
| L1 | Contrast is verified manually. No automated gate exists. See section 8. |
| L2 | The footer's visited-link colouring inverts the common convention, by choice. See D5. |
| L3 | Neither component is internally scrollable, so the annotation-durability caveat in AGENTS.md (DEBT-DUI-5) does not apply to either. |
