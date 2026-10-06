<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
Repository: enterprise-bootstrap-theme
File GUID: 2a7f4e18-6c93-4b05-8d1a-9e3b7c0f52d4
Created: 2026
-->

<!-- AGENT: Current surface ladder values and the rules for changing them. Supersedes the surface section of the ADR-147 spec. -->

# Surface tint — chrome as a material, not a dimmer white

**Status:** Shipped 2026-10-06, reviewed and accepted
**ADR:** ADR-150
**Supersedes:** the surface values in `specs/visual-refresh-2026.prd.md` §4 D2
(ADR-147). Everything else in that spec still holds.

---

## 1. The report

> side panels, top bars, status bars etc. aren't particularly well
> differentiated via color. A moderate tint would be nice.

## 2. What the measurement said

Chrome against content measured **1.056**, where **1.000 means the two
colours are identical**. A sidebar was separated from the document beside it
almost entirely by its one-pixel border. Dark measured 1.151 — better, which
is why this read as mostly a light-mode problem.

Two faults in the ADR-147 ladder, and the second is the one that shaped the
fix.

### 2.1 It separated planes by luminance alone

Saturation never exceeded 0.33 across all four surfaces. Every plane was the
same near-neutral material at a slightly different brightness, so nothing said
*"this is chrome"* except *"this is slightly darker"*.

### 2.2 It had run out of room

Four steps were packed between `#e6eaf1` and white, chrome sitting 0.051 of
luminance below content and 0.051 above ground.

**Tinting chrome alone was tried first and makes things worse.** Chrome moves
*down* into the step below it, and `chrome|ground` collapses from 1.055 to
**1.013** — one boundary fixed by destroying its neighbour. The whole ladder
has to widen, which is why every value changed and not only the one named in
the report.

## 3. Current values

Declared once in `src/scss/_variables.scss` and interpolated into the CSS
tokens in `_dark-mode.scss`. **Change them there, never at a call site.**

| Token | Light | Dark | Role |
|---|---|---|---|
| `--theme-surface-sunken-bg` | `#d8e2ee` | `#090f19` | wells, code blocks, insets |
| `--theme-body-bg` | `#e3ebf5` | `#0d1420` | the page ground |
| `--theme-surface-raised-bg` | `#edf4fc` | `#223044` | **chrome** — sidebars, toolbars, status bars |
| `--theme-surface-bg` | `#ffffff` | `#161f2e` | content surfaces |
| `--theme-text-muted` | `#4d5b6d` | `$gray-400` | subtle labels |

Chrome carries a low-saturation cast toward the primary. That is the one
Material Design 3 idea in play — a *tonal* surface — and it is what makes a
panel read as chrome at a glance rather than on inspection.

## 4. Two properties any future edit must preserve

### 4.1 Ordering

Light ascends `sunken < ground < raised < content`. Dark inverts, with
`raised` **highest**. About 140 call sites depend on that direction; flipping
it would invert chrome and content across the fleet.

```
light   sunken 0.7516  <  ground 0.8234  <  chrome 0.8973  <  content 1.0000
dark    sunken 0.0047  <  ground 0.0069  <  content 0.0135  <  chrome 0.0287
```

### 4.2 Separation, measured on what actually abuts

| Adjacency | Light | Dark | Where it appears |
|---|---|---|---|
| `chrome` \| `content` | **1.108** | **1.240** | a sidebar meeting the document |
| `chrome` \| `ground` | 1.085 | 1.383 | a toolbar over the page |
| `sunken` \| `content` | 1.310 | 1.160 | a well inside a card |

`sunken|ground` measures **1.040** in dark and that is **deliberate**. Wells
sit inside content; the page ground is behind chrome. The two never touch, so
tightening that pair would cost contrast on pairs that do. See DEBT-VR-6 —
recorded precisely so nobody "fixes" it from a contrast matrix.

Worst text-on-surface pair: **5.29** light, **5.20** dark, against a 4.5
floor.

## 5. Why `--theme-text-muted` moved again

`$gray-550` darkens from `#556478` to `#4d5b6d`. The widened ladder puts the
darkest light surface at `#d8e2ee`, where the previous value measured **4.61**
— passing AA by hundredths, which is the exact state that broke the last time
a background moved (AGENT_INSIGHTS 6.8). It measures 5.29 there now.

This is the second time this token has moved for this reason. The token exists
*because* `$gray-500` fails on the ladder; it will need checking again on any
future surface change, which is the argument for DEBT-VR-5.

## 6. Verification

Measured in a browser against the built stylesheet, both themes, covering
ordering, the three real adjacencies and every text-on-surface pair.

A bug in the measuring script was caught mid-verification and is worth
recording: the browser returns `#fff` shorthand for white and the hex parser
assumed six digits, so two light adjacencies came back `null`. The numbers
were re-measured rather than reported. *A checker is code and can be wrong;
a `null` is not a pass.*

`npm test` 23/23 structure checks, 4842 unit tests, `npm run build` exit 0.

## 7. Known gaps

- **DEBT-VR-5** — no automated contrast gate. Three AA problems across ADR-147
  and ADR-150 were each found by a hand-run audit after the fact. Until a gate
  exists, any `$surface-*` change must be followed by a manual contrast pass in
  both themes.
- **DEBT-VR-6** — `sunken|ground` at 1.040 in dark, deliberate, see §4.2.

## 8. If the tint is wrong

One dial each, all in `src/scss/_variables.scss`:

| Symptom | Change |
|---|---|
| chrome reads too blue | `$surface-raised` toward neutral |
| chrome still not distinct enough | `$surface-raised` further from `$surface-content` — but re-check `chrome\|ground` |
| the page feels too dark | `$surface-ground` lighter — but re-check `chrome\|ground` |
| muted text looks heavy | `$gray-550` lighter — but re-check it against `$surface-sunken` |

Every one of those requires re-running the contrast pass, because the planes
are a ladder and moving one changes two boundaries.
