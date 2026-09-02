<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
-->

<!-- AGENT: Per-component progress log for SiteFooter. Short context for resuming work. -->

<!-- ⚓ SPEC-PROGRESS: SiteFooter -->
<!-- 🔗 RELATES: [[SiteFooter]], [[MarketingHero]], specs/marketinghero-sitefooter.prd.md, ADR-146 -->

# SiteFooter — progress

**Status:** Shipped 2026-09-02. Design in `specs/marketinghero-sitefooter.prd.md`,
plan in `specs/marketinghero-sitefooter.plan.md`, decisions in ADR-146.

## What it is

The footer for a public page. Organization details, grouped navigation, contact
details, legal links, optional build information, in one to four responsive
columns.

Same contract as MarketingHero: the stylesheet is the deliverable, the factory
is a convenience, and a canonical-structure test keeps them identical.

## Files

| File | Note |
|---|---|
| `components/sitefooter/sitefooter.scss` | The contract |
| `components/sitefooter/sitefooter.ts` | Factory, ~380 lines |
| `components/sitefooter/sitefooter.manifest.ts` | `display`, `container-first` |
| `components/sitefooter/sitefooter.test.ts` | 25 tests |
| `components/sitefooter/README.md` | Markup contract, options, link-colour note |
| `demo/components/sitefooter.html` | Six sections, one hand-authored |

Also touched: `stencils-ui-components.ts` (Tier B stencil),
`demo/studio/component-studio.html` (entry plus help block).

## Decisions worth remembering

- **Unvisited links are muted; visited links take the accent colour.** This
  inverts the usual convention and was chosen deliberately, to keep the footer
  quiet while making the visited state obvious. ADR-146 D5, DEBT-WEB-2. It is
  recorded in the stylesheet comment, the README, the Component Studio help
  block, and here, because it reads as a bug to anyone meeting it cold.
- **`minmax(0, 1fr)`, not `1fr`.** A bare `1fr` means "at least the content's
  minimum size", so one long email address forces its track wider than its share
  and overflows the row. The zero minimum plus `overflow-wrap: anywhere` is what
  actually satisfies the overflow requirement.
- **Nothing here uses `order`.** Stacking is the grid collapsing to one track, so
  small-screen sequence equals source sequence by construction. This is the
  opposite of MarketingHero and the contrast is intentional.
- **Group heading ids carry the instance counter**, so two footers on one page do
  not collide. There is a test for it.
- **`headingLevel` is configurable, default `h2`.** A footer that hardcodes `h2`
  can break the heading outline of a page whose content stops at `h3`.
- **`buildInfo` alone still renders the legal row** — the build string has
  nowhere else to live. Tested explicitly so the behaviour is not accidental.

## Registration

The component is reachable from `demo/index.html` under **Public Surfaces**, from
Component Studio, and from the Layout Studio stencil palette. The demo card was
missed on first delivery and added in a follow-up — see AGENT_INSIGHTS 6.7.

## Verification status

- 25 unit tests pass. Fleet conformance gate passes at 191; not in `EXEMPT`.
- `npm run build` exits 0. CSS carries all four column rules with
  `minmax(0,1fr)`, the `:visited` inversion, and the focus outline.
- **Never rendered in a browser.** The overflow and stacking assertions in
  `tests/website-components.spec.ts` have never executed — Chromium will not
  install under Node 26. See DEBT-WEB-3. The four-column demo section carries a
  57-character email address and a German compound specifically so a human can
  check overflow by eye until then.
