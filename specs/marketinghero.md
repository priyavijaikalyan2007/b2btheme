<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
-->

<!-- AGENT: Per-component progress log for MarketingHero. Short context for resuming work. -->

<!-- ⚓ SPEC-PROGRESS: MarketingHero -->
<!-- 🔗 RELATES: [[MarketingHero]], [[SiteFooter]], specs/marketinghero-sitefooter.prd.md, ADR-146 -->

# MarketingHero — progress

**Status:** Shipped 2026-09-02. Design in `specs/marketinghero-sitefooter.prd.md`,
plan in `specs/marketinghero-sitefooter.plan.md`, decisions in ADR-146.

## What it is

The introduction area for a public page. Optional eyebrow, heading, supporting
paragraph, up to two actions, optional media slot. Stacked, centered, split.

The stylesheet is the contract: a static page links `marketinghero.css`, writes
the documented markup, and loads no script. `createMarketingHero` is a
convenience that emits exactly the same markup, and a canonical-structure test
fails if the two drift.

## Files

| File | Note |
|---|---|
| `components/marketinghero/marketinghero.scss` | The contract |
| `components/marketinghero/marketinghero.ts` | Factory, ~330 lines |
| `components/marketinghero/marketinghero.manifest.ts` | `display`, `container-first` |
| `components/marketinghero/marketinghero.test.ts` | 23 tests |
| `components/marketinghero/README.md` | Markup contract, options, document-order note |
| `demo/components/marketinghero.html` | Five sections, last one hand-authored |

Also touched: `stencils-ui-components.ts` (Tier B stencil),
`demo/studio/component-studio.html` (entry plus help block).

## Decisions worth remembering

- **The eyebrow follows the heading in the DOM** and is lifted with `order: -1`.
  The request asked for both an eyebrow above the heading and a heading first in
  document order; those cannot both hold in source order. Nothing in the content
  column is focusable, so displaced visual order carries no keyboard hazard,
  while nesting the eyebrow inside the `h1` would pollute its accessible name.
  ADR-146, D4. **Do not "fix" this.**
- **No animation at all** — a stronger guarantee than honouring
  `prefers-reduced-motion`, and it follows from the compact register (D2).
- **`stackBelow` stops at `xl`** in the TypeScript type even though the
  stylesheet also emits `.marketinghero-stack-xxl` for hand-authored markup. A
  hero that only goes side-by-side above 1400px is single-column on nearly every
  screen.
- **The `aside` option takes an `HTMLElement`, never an HTML string.** There is
  deliberately no `asideHtml` escape hatch; AuthCard's one trusted-markup input
  needed a warning in its README and this component does not repeat that.

## Prerequisite this component created

`src/scss/_variables.scss` did not define `$grid-breakpoints`, so component SCSS
could not name a breakpoint — `applauncher.scss` hardcodes `768px` for want of
it. The map was added with Bootstrap's own values and `!default`, verified by a
byte-for-byte diff of the compiled `custom.css` (272645 bytes, unchanged).

## Verification status

- 23 unit tests pass. Fleet conformance gate passes; not in `EXEMPT`.
- `npm run build` exits 0; CSS emits `stack-sm` through `stack-xxl`, no
  `stack-xs`, zero hex literals, zero transitions.
- **Never rendered in a browser.** Playwright's Chromium will not install on the
  development machine under Node 26, and the layout assertions in
  `tests/website-components.spec.ts` have never executed. See DEBT-WEB-3.
