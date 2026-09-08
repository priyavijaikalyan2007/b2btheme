<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 3f2c9d81-5a44-4e7b-9c02-7d6e1b8a4c15
Created: 2026
-->

<!-- AGENT: Design spec for the 2026 visual refresh. Token-level adoption of selected Material Design 3 ideas. -->

# Visual Refresh 2026 — Selected Material Design 3 Ideas

**Status:** Approved (user delegated the detail decisions; review happens against the demos)
**Date:** 2026-09-08
**ADR:** ADR-147
**Branch:** `feat/md3-inspired-refinements`

---

## 1. The request

After building applications on this library and comparing them to Material Design 3
applications, five specific aspects of MD3 read as better:

1. Sidebars and menubars carry a slightly different background from content.
2. Tabs look more natural.
3. Shadows are subtle.
4. A small amount of corner rounding feels nice.
5. Slightly more spacing is more readable.

The request is explicitly **not** to adopt MD3. MD3 is too round and too airy for a
dense enterprise library. The goal is to move the feel from *2000s* to *2020s* by
taking the five ideas above and nothing else.

## 2. Diagnosis

The flatness has a precise, measurable cause rather than a stylistic one.

| Symptom | Root cause | Evidence |
|---|---|---|
| Flat, undifferentiated chrome | `--theme-body-bg` and `--theme-surface-bg` are **the same colour** (`$gray-50` `#f8fafc`) in light mode. A sidebar is separated from the page by a border alone. | `src/scss/_dark-mode.scss:21-24` |
| Hard corners everywhere | `$border-radius: 0`, consumed as a token in 80 places. | `src/scss/_variables.scss:167` |
| Shadows read as smudge, not lift | Single-layer, wide blur, high alpha (`0 2px 8px rgba(…, .12)`). Real depth needs a tight key shadow plus a wide ambient one. | `_variables.scss:408-413`, `_dark-mode.scss:68-73` |
| Tabs feel unnatural | Full-bleed 2px bottom border, hardcoded `$blue-600`. | `components/tabbedpanel/tabbedpanel.scss:263` |
| Cramped reading | `$line-height-base: 1.4` with 14px text; list, nav and table rows at 6px vertical padding. | `_variables.scss:119` |

**Two defects found during diagnosis, fixed as part of this work:**

- **`--theme-primary-rgb` does not match `$primary`.** The token is `37, 99, 235`
  (`#2563eb`) while `$primary` is `#1c7ed6` = `rgb(28, 126, 214)`. Dark mode has the
  same mismatch (`96, 165, 250` vs `$blue-400` `#4dabf7` = `rgb(77, 171, 247)`). Both
  stored values are Tailwind blues that entered by copy. Every focus ring and every
  hover glow in the library is therefore tinted a different hue than the primary it
  is meant to echo.
- **The tab indicator colour is not tokenised.** `$blue-600` is a light-mode value
  burned into a component, so the indicator does not respond to dark mode.

## 3. Architecture

The change is **token-first**. Two files carry the great majority of it:

```
src/scss/_variables.scss     Sass layer — Bootstrap overrides, compiled statically
src/scss/_dark-mode.scss     CSS custom property layer — runtime, light + dark
```

Everything else is a small number of component-level corrections. This matters for
two reasons: the blast radius is auditable, and reverting is a token edit rather
than a sweep.

**The duplication constraint.** Shadows exist in both layers — Sass `$shadow-*`
(30 uses in components) and CSS `--theme-shadow-*` (67 uses). They are independent
declarations of the same intent. Both are updated together, and the Sass layer is
annotated to say so, because a future edit to one alone will silently desynchronise
the library.

**The Bootstrap-variable constraint.** `$card-bg`, `$dropdown-bg`, `$list-group-bg`
and `$pagination-bg` are compiled statically to `white` and do not follow
`--theme-*`. The surface ladder must keep both layers agreeing or cards will
disagree with the surface they sit on.

## 4. Decisions

### D1 — Corner radius: 4px base, 2px small, 6px large

```scss
$border-radius:      4px;    // buttons, inputs, cards, alerts, panels
$border-radius-sm:   2px;    // badges, chips, dense controls
$border-radius-lg:   6px;    // modals, popovers, dialogs
$border-radius-xl:   8px;    // large overlays
$border-radius-pill: 50rem;  // restores the .rounded-pill utility
```

**This amends a written project rule.** `AGENTS.md` states a preference for
"rectangular components with 0-2 border radius", and `_variables.scss:174-177`
describes `$radius-affordance: 2px` as "the one sanctioned exception". Both are
updated in this change rather than quietly contradicted. The rule becomes 0–6px
with the tier named per role.

`$radius-affordance` is **retained as an alias** of `$border-radius`. Its six call
sites (annotation, chatdock, workspaceshell) exist because everything else was
square; now that a base radius exists, a tab lifting off a strip should use the
same corner as everything else. Retaining the name keeps those call sites working
and avoids an unnecessary edit to three components.

**Not changed:** the 28 `border-radius: 50%` circles and the four `9999px` pills are
deliberate shapes, not softening. They stay.

**Outliers normalised** to the new scale (they predate it and now conflict):
`commentoverlay` 8px→lg, `contextmenu` 8px→lg, `ribbon` 8px→lg,
`notificationcenter` 9px→circle, and four `1px` values→`sm`.

### D2 — A tonal surface ladder

This is the change that does the most work, and it is the direct answer to
"sidebars and menubars have slightly different backgrounds".

The existing semantics are preserved exactly — in light mode `raised` is *darker*
than `surface`, and in dark mode it is *lighter*. Inverting that direction would
break 140 call sites. What changes is the **separation between the steps** and the
introduction of a faint cool cast so the planes read as tinted rather than dirty.

**Light**

| Token | Before | After | Role |
|---|---|---|---|
| `--theme-surface-sunken-bg` | `#e2e8f0` | `#e6eaf1` | wells, code blocks, inset areas |
| `--theme-body-bg` | `#f8fafc` | `#eef1f6` | the page ground |
| `--theme-surface-raised-bg` | `#f1f5f9` | `#f5f7fa` | **chrome — sidebars, toolbars, headers** |
| `--theme-surface-bg` | `#f8fafc` | `#fdfdfe` | content surfaces |

Ordering is `sunken < body < raised < surface`. Previously `body` was equal to
`surface`, which is why the page had no ground. It now sits a clear step below the
chrome, so a sidebar reads as a plane in front of the page instead of a bordered
region of it.

**Dark**

| Token | Before | After |
|---|---|---|
| `--theme-body-bg` | `#0f172a` | `#0d1420` |
| `--theme-surface-bg` | `#1e293b` | `#151d2b` |
| `--theme-surface-raised-bg` | `#334155` | `#1f2937` |
| `--theme-surface-sunken-bg` | `#0f172a` | `#090f19` |

Dark chrome at `#334155` was washed out — closer to mid-grey than to a dark surface.
The new ladder is tighter and darker, which is what lets a subtle shadow read at all.

### D3 — State layers replace opaque hover fills

`--theme-hover-bg` and `--theme-active-bg` are currently **opaque greys**
(`$gray-100` / `$gray-200`). On a tinted sidebar an opaque grey hover punches a hole
in the surface instead of shading it. MD3's state-layer idea — a translucent overlay
that takes the colour of whatever is beneath it — is what makes D2 hold up in
practice, so it is part of this change rather than optional polish.

```scss
// light
--theme-hover-bg:  rgba(15, 23, 42, 0.045);
--theme-active-bg: rgba(15, 23, 42, 0.085);
// dark
--theme-hover-bg:  rgba(255, 255, 255, 0.06);
--theme-active-bg: rgba(255, 255, 255, 0.11);
```

### D4 — Two-layer shadows at lower alpha

A single wide blur reads as a smudge. Depth comes from a tight key shadow plus a
wider ambient one, both at low opacity.

```scss
$shadow-xs: 0 1px 1px rgba(k,.04), 0 1px 2px  rgba(k,.06);
$shadow-sm: 0 1px 2px rgba(k,.05), 0 2px 4px  rgba(k,.07);
$shadow-md: 0 2px 4px rgba(k,.06), 0 4px 8px  rgba(k,.08);
$shadow-lg: 0 4px 8px rgba(k,.07), 0 8px 16px rgba(k,.10);
$shadow-xl: 0 8px 16px rgba(k,.08), 0 16px 32px rgba(k,.12);
```

Applied identically to the `--theme-shadow-*` CSS layer, with dark-mode alphas
roughly doubled because shadow on a dark ground needs more force to register.

**Out of scope:** the hover-glow idiom (`--theme-glow-color-hover`, 91 uses) is an
existing signature of this library and is not part of the request. It is left alone,
though it changes hue as a side effect of the `--theme-primary-rgb` fix — which is a
correction, not a redesign.

### D5 — Tabs

Four changes to `tabbedpanel`, matched in the ribbon and sidebar tab variants:

1. Indicator colour `$blue-600` → `var(--theme-primary)`. Fixes the dark-mode bug.
2. Indicator becomes an **inset bar** — 3px tall, inset from the tab edges by the
   horizontal padding, with `2px 2px 0 0` top corners — rather than a full-bleed
   2px border. This is the single detail that makes MD3 tabs read as "natural":
   the indicator marks the label, not the whole cell.
3. Active label takes `var(--theme-primary)` and `$font-weight-medium`.
4. Hover uses the D3 state layer rather than an opaque fill.

The vertical (left/right) tab orientations get the equivalent inset treatment on
their respective edges.

### D6 — Spacing: targeted, not global

Deliberately the smallest change of the five, because it is the highest-risk one.
`$spacer` drives only Bootstrap-level padding; the `$sp-*` fixed-pixel scale and
`$control-height-*` do not follow it, so a global bump moves layouts **unevenly** —
some components grow, others do not, and the result is less coherent than the
starting point, not more.

Instead, four targeted values that govern reading density in list-like surfaces:

```scss
$line-height-base:           1.4     -> 1.45
$nav-link-padding-y:         0.375   -> 0.5rem
$dropdown-item-padding-y:    0.375   -> 0.4375rem
$list-group-item-padding-y:  0.5     -> 0.5625rem
$table-cell-padding-y:       0.375   -> 0.4375rem
```

Control heights, ribbon density and grid row heights are untouched. If the result
still reads tight in real applications, a second pass can widen the fixed-pixel
scale deliberately — but that is a separate decision with a separate blast radius.

### D7 — Correct `--theme-primary-rgb`

`37, 99, 235` → `28, 126, 214` (light), `96, 165, 250` → `77, 171, 247` (dark).
Every focus ring and glow in the library shifts to the actual primary hue. Written
down because the change is visible and will otherwise look like an unexplained
colour shift.

## 5. Non-goals

- No adoption of MD3 shape, type or colour systems.
- No change to fonts, font sizes or the type scale.
- No change to control heights or the `$sp-*` fixed-pixel spacing scale.
- No change to the glow idiom or the edge-shadow chrome mixins.
- No component API change of any kind. This is presentation only, so the additive
  guarantee (ADR-141) is not engaged — no manifest, factory or channel is touched.

## 6. Verification

| Check | Method |
|---|---|
| No behavioural regression | `npm test` — 4825 unit tests must stay green |
| Build integrity | `npm run build` exits 0 |
| Structure | `npm run test:structure` |
| Token application | New demo page rendering every affected surface side by side, light and dark |
| Visual review | `demo/full-demo.html` and the component gallery, both themes |

**Known limitation.** Playwright cannot run on this machine — Chromium will not
install under Node 26 (DEBT-WEB-3). The e2e suite therefore cannot confirm the
visual result, and no automated contrast gate exists in this repo (DEBT-WEB-1).
Verification of appearance is manual review against the demo pages. This is stated
rather than glossed because it is the weakest link in the change.

**Contrast.** The surface ladder moves backgrounds but not text colours. The
lightest surface gets lighter and the darkest gets darker, so light-mode contrast
ratios improve or hold. Dark chrome moving from `#334155` to `#1f2937` **increases**
contrast against `--theme-text-primary`. No ratio is reduced by D2. The state
layers in D3 are the one place worth a manual check, since a translucent hover over
a tinted surface produces a composited colour that no token names.

## 7. Deliverables

- [ ] `src/scss/_variables.scss` — D1, D4, D6
- [ ] `src/scss/_dark-mode.scss` — D2, D3, D4, D7
- [ ] `components/tabbedpanel/tabbedpanel.scss` — D5
- [ ] Radius outliers normalised in seven components — D1
- [ ] `AGENTS.md` — the 0-2 radius rule amended to the new tier
- [ ] `demo/visual-refresh.html` — before/after comparison surface
- [ ] Demo page registered as a card in `demo/index.html` (AGENT_INSIGHTS 6.7 —
      creation plus registration is the deliverable)
- [ ] `agentknowledge/decisions.yaml` — ADR-147
- [ ] `agentknowledge/history.jsonl` — appended
- [ ] `CHANGELOG.md`, `CONVERSATION.md`, `DARKMODE.md` token table refreshed
