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

**Status:** Shipped. **Superseded in part by ADR-150** — every surface value in
§4 D2 was replaced on 2026-10-06 when the ladder was widened and chrome was
tinted. The hexes below are kept as the historical record of what ADR-147
shipped; for current values see `src/scss/_variables.scss`, `DARKMODE.md`, or
`specs/2026-10-06-surface-tint.prd.md`. Everything else here still holds.
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

**Amended 2026-10-09 — both halves of that limitation are gone.** Playwright
runs: `npx playwright install chromium` succeeds and the website-components
suite executes 12 tests, which is how the SiteFooter overflow bug was finally
caught (DEBT-WEB-3, ADR-157). And a contrast gate exists: structure check
`[12]`, plus `[13]` and `[15]` (DEBT-WEB-1, closed under ADR-158). The
weakest link is no longer verification; it is the part verification still
cannot reach — rendered pixels, and the 73 component-level translucent
backgrounds of DEBT-VR-10.

**Contrast.** An earlier draft of this spec asserted that "no ratio is reduced by
D2". That was reasoning, not measurement, and it was **wrong**. Computing every
text-on-surface pair in the browser against the built stylesheet found two failures
against the 4.5:1 AA floor, both introduced by this change:

| Pair | Measured | Cause |
|---|---|---|
| `--theme-text-muted` on `body` / `sunken`, light | 4.20 / 3.94 | The ladder's darker page ground. The old value already measured only 4.54 on the old body — it was inside rounding distance of the floor and nobody had checked. |
| `--theme-primary` as the active tab label on chrome, light | 3.91 | D5's decision to tint the active label. `--theme-primary` is tuned to be legible as a *fill*, not as *type*. |

Both are fixed rather than accepted:

- `--theme-text-muted` (light) darkens from `$gray-500` `#64748b` to `#556478`,
  measuring 5.00 on the darkest light surface and 5.94 on content, while staying
  clearly lighter than `--theme-text-secondary`.
- A new token **`--theme-primary-text`** (`$blue-700` light, `$blue-300` dark)
  carries primary *as type*: 5.68 on chrome, 7.47 in dark. `--theme-primary`
  remains the fill colour. Any future component putting primary on type should
  use the text token.

**Measured ladder**, confirming both directions are monotonic — relative luminance,
darkest to lightest:

```
light   sunken 0.820  <  body 0.877  <  raised 0.928  <  surface 0.983
dark    sunken 0.005  <  body 0.007  <  surface 0.012  <  raised 0.022
```

All remaining text-on-surface pairs measure between 9.15 and 17.56.

The state layers in D3 remain the one place a manual eye is still worth spending,
since a translucent hover over a tinted surface composites to a colour no token
names and no static audit can enumerate.

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

---

## 8. Amendment — round two (2026-09-08)

Round one was reviewed and the verdict was *"only a slight difference overall"*,
with specific reports that ribbon controls, dropdowns and the DataGrid inside
Dynamic UI were still square. Both were correct, and section 3's claim that the
change "lands in two files" turned out to be **optimistic**. It described where
the tokens live, not where they are consumed.

### Why the change was muted

| Cause | Detail |
|---|---|
| **Bootstrap never received the refresh** | `$body-bg` still compiled to `$gray-50`, so Bootstrap painted the page the *old* ground colour while components used the new one. In dark, `--bs-body-bg`, `--bs-secondary-bg` and `--bs-tertiary-bg` were pinned to raw greys off the ladder. |
| **Bootstrap has its own shadow scale** | `$box-shadow` / `$box-shadow-sm` / `$box-shadow-lg` were never overridden. Dropdowns and modals draw from these, not `$shadow-*` — so the most visible overlays in the library kept the single-blur smudge. The "nice" dropdown shadows noted in review were in fact the *old* style. |
| **17 ribbon call sites** | pinned to a local `$ribbon-ctrl-border-radius: 0`. |
| **34 further hardcoded zeros** | left over from the square era, several with comments actively enforcing the dead rule. |
| **Dynamic UI was never themed at all** | `dynamiccanvas.scss` referenced `var(--theme-border, …)` and `var(--theme-surface, …)`. **Neither token exists** — the names are `--theme-border-color` and `--theme-surface-bg` — so it silently resolved to its hardcoded fallbacks in both themes. A CSS custom-property fallback fails silently by design, which is why nothing ever reported it. |

### Changes

- The ladder is declared **once** as Sass variables (`$surface-ground` and
  friends) and interpolated into the CSS tokens, removing the hex duplication
  round one introduced and giving Bootstrap variables something to reference.
- `$body-bg`, `$card-cap-bg`, `$breadcrumb-bg`, `$table-striped-bg`, `$input-bg`
  and the dark `--bs-*` overrides now track the ladder.
- Bootstrap's `$box-shadow` scale points at the two-layer values.
- Ribbon controls take the base radius. **If this reads too soft in the 3-high
  stack, `$border-radius-sm` is a one-line change** — flagged for review rather
  than decided unilaterally.
- 34 zero-radius sites assigned by role. Three stay 0 deliberately and now
  document why.
- ContextMenu, HoverCard and NotificationCenter move from raw `box-shadow` to
  the tokens. HoverCard's separate dark rule became redundant and was removed.
- AuthCard's card background was `var(--bs-body-bg)` — the page ground — so it
  was the same colour as the page behind it. Now the content surface.

### Shadow policy, stated because it was asked

Overlays carry elevation; inline controls do not. Menus, dropdowns, popovers,
dialogs and toasts float above the page and cast a shadow; buttons and inputs
sit *on* a surface and are described by their border and fill. This is
deliberate and unchanged. What looked inconsistent was that three overlay
components were never on the token system, so their shadows were arbitrary
rather than absent.

### Measured after round two

```
--bs-body-bg vs --theme-body-bg    light MATCH   dark MATCH   (both DRIFTED before)
--bs-box-shadow                    two-layer in both themes
ladder monotonic                   light and dark
worst text-on-surface pair         5.00 light / 5.72 dark   (floor is 4.5)
primary-as-type on chrome          5.67 light / 7.47 dark
```

### Known debt, deliberately not fixed here

`DEBT-VR-1` — 38 sites use `--theme-hover-bg` / `--theme-active-bg` as a
**static** background (avatar circles, chips, progress tracks, tab strips)
rather than as an interaction state. Since D3 made those tokens translucent
these now composite rather than fill. The result is very close to the old
value in light mode — `rgba(15,23,42,.085)` over the content surface resolves
to roughly `#e8e9ec` against the previous `$gray-200` `#e2e8f0` — and slightly
darker in dark mode, so nothing looks broken. It is nonetheless the wrong token
for the job: a filled neutral chip is not an interaction state. The correct fix
is a `--theme-fill-subtle` token and 38 reassignments, which is its own change
with its own review.

---

## 9. Amendment 2 — round three (2026-09-09)

Three further reports, three different causes. Section 3's "lands in two files"
is now conclusively wrong and should be read as a record of how the estimate
failed rather than as guidance.

### 9.1 Dark mode had no visible elevation

Not a tuning problem. **A black shadow on a near-black ground carries almost no
signal, and no alpha fixes it** — measured against `--theme-body-bg` `#0d1420`:

| alpha | contrast vs ground | | alpha | contrast vs ground |
|---|---|---|---|---|
| 0.22 | 1.034 | | 0.55 | 1.081 |
| 0.36 | 1.056 | | 0.75 | 1.106 |

A *light*-mode shadow at alpha 0.08 already reaches **1.192**. Even at triple
the opacity the dark shadow never catches up, because the ground is already
near-black and there is nowhere darker to go.

Dark elevation is therefore a different mechanism: each `--theme-shadow-*` now
leads with a hairline light ring (`0 0 0 1px rgba(255,255,255,.04–.08)`), which
is what actually reads as lifted, with the black layers retained for spread.

Two further gaps found with it:

- **`--bs-box-shadow` was never redefined in the dark block.** Round two pointed
  `$box-shadow` at `$shadow-lg`, but that compiles the *light* values statically
  into `:root` — so Bootstrap dropdowns and modals were casting light-tinted
  `rgba(15,23,42,…)` shadows on a dark ground. Invisible twice over. This is the
  third time the same Sass-vs-custom-property desync has bitten this work.
- **`--theme-edge-shadow-color`** — the `_chrome.scss` docked-panel mixins, and
  most likely the literal "chrome shadows" reported missing — was
  `rgba(0,0,0,0.25)` in dark, same physics. A docked edge now reads as a faint
  *lit seam*, which is how dark IDEs separate panels.

### 9.2 Radius by omission — the real majority

Round two swept the 51 sites that **set** `border-radius: 0`. It could not see
the larger group: **71 of 125 components never declare a radius at all**, and so
render square regardless of the token. They had not opted out; they had never
opted in, and an absent declaration is invisible to grep.

The reported symptom — a sharp LineWidthPicker beside a rounded CronPicker on
the same ribbon — is exactly this split: **components built on Bootstrap
primitives inherited the refresh for free; components that draw their own DOM
never consumed any radius token.**

163 rules across 46 components were assigned by role via a suffix-keyed sweep
(`-dropdown`/`-panel`/`-menu` → `lg`; `-trigger`/`-input`/`-btn` → base;
`-item`/`-option`/`-swatch`/`-chip` → `sm`), applied only to rules that actually
paint a fill or an edge.

**Deliberately excluded, so the sweep is auditable:**

| Excluded | Why |
|---|---|
| 11 layout components | Containers organise children and carry no shape of their own |
| `statusbar`, `bannerbar`, `ruler`, `graphminimap`, `logutility` | Full-bleed chrome; a corner would float it off its frame |
| `markdownrenderer`, `marketinghero`, `sitefooter` | Text and public-page surfaces, not controls |
| `helpdrawer`, `graphtoolbar` roots | Docked to an edge |
| drag handles, `stickynote-bar` | Thin strips and title bars where a corner reads as an error |
| `errordialog` | Rides Bootstrap's `.modal-content`, already covered by `$modal-content-border-radius` |

### 9.3 Type and spacing

`$font-size-sm` carries **481 call sites against base's 201** — it, not
`$font-size-base`, is what decides whether the interface reads small.

| Token | Before | After |
|---|---|---|
| `$font-size-base` | 14px | 15px |
| `$font-size-sm` | 12.8px | 13.6px |
| `$font-size-lg` | 16px | 17px |
| `$font-size-xs` / `-2xs` | 12px / 10px | **unchanged** |
| `$control-height-*` | 22/28/32/40/44 | 24/30/34/42/46 |
| `$spacer` | 12px | 13px |

`xs` and `2xs` hold because 12px at line-height 1.45 already needs 17.4px and
the ribbon's group-label row is 16px. Control heights grew because 15px text
needs a 21.75px line box, which left a 22px control with no slack. The `$sp-*`
fixed-pixel internals deliberately stay put (AGENT_INSIGHTS 6.9).

### 9.4 Verification

Measured in a browser against the built stylesheet:

```
LineWidthPicker  trigger 4px, dropdown 6px with a shadow   (was square)
ProgressModal    6px                                        (was square)
Ribbon           buttons and tabs 4px
Ribbon overflow  ZERO vertically-overflowing elements at the larger type
Dark elevation   light ring present in all 5 --theme-shadow-* and in --bs-box-shadow
```

The ribbon overflow scan is the only machine check available for the type bump
while Playwright cannot run (DEBT-WEB-3).

### 9.5 Unrelated defect found, not fixed

`agentknowledge/history.jsonl` has **three malformed lines** — 43, 58 and 104,
dated 2026-02-20 and 2026-03-07 — that fail `json.loads`. Two contain a second
object on the same line; one has an invalid escape. They are present on `main`
and predate this work by months. Any agent parsing the file programmatically
will fail on them. **Not repaired here**, because `AGENTS.md` declares the file
append-only and repairing it is a decision for its owner rather than a
side-effect of a styling change. Tracked as `DEBT-KB-1`.
