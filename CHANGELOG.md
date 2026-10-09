# Changelog

All notable changes to the Enterprise Bootstrap Theme project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This file is maintained by coding agents and updated at the end of each session when
user-visible changes are made. Entries are generated from `agentknowledge/history.jsonl`
and the git log. For the complete machine-readable history, see `agentknowledge/history.jsonl`.

---

## [Unreleased]

### Fixed
- **Three structure checks could not fail on macOS** (ADR-158). Checks `[4]`, `[5]` and `[6]` drove their loops from `grep -oP`, and BSD grep has no `-P`: grep aborted, the list came out empty, the body never ran, and the check reported PASS. They worked on CI's GNU grep, so the suite was green in both places for opposite reasons, and two of the four loops silenced stderr so the error printed twice a run unseen. All four now use POSIX `-oE`, and each check is mutation-proven to fail. **No developer-visible behaviour changed; what changed is that three checks now mean something locally.**
- **A dead link in the WorkspaceShell demo**, left by the TenantSwitcher rename — it pointed at `workspaceswitcher.html`, a page the rename had renamed away. Check `[4]` now validates links *between* demo pages, not only the ones the index lists.
- **SiteFooter no longer scrolls the page sideways on a narrow viewport** (ADR-157). A long unbroken string in the organisation description — a translated compound, a pasted URL, a long support address — pushed the page 254px wider than a 320px screen. `overflow-wrap` was set on the contact block and the links but not on the description, the one block whose job is prose; it is now declared once on `.sitefooter` and inherited by everything inside. Visible to anyone viewing a footer on a phone.

### Added
- **`npm test` check `[16]` — no failure branch may return something readable** (ADR-157). Check `[9]` matches names, so it only sees a stand-in that announces itself; the worst case ADR-148 found was anonymous and caught by hand. This one walks the TypeScript AST, because whether a `return` sits *inside* a `catch` is a structural question that a regex got wrong 21 times out of 25. Mutation-tested by reinstating the original bug.
- **`npm test` check `[14]` — the three elevation layers must agree** (ADR-155). The shadow scale is declared in Sass, in CSS custom properties, and in Bootstrap's own `$box-shadow`, and the copies drifted twice in four releases — once leaving every dropdown and modal on the old shadow, once leaving them casting light-tinted shadows in dark mode. The check compares geometry and alphas rather than bytes, since the layers legitimately spell the same colour differently.
- **`npm test` check `[15]` — chart and status palettes must survive colour-vision deficiency** (ADR-155). Simulates protanopia, deuteranopia and tritanopia and measures every pair of series colours. **Nothing was broken** — all five palettes already clear the floor — so this keeps it true rather than fixing it. It does *not* discharge WCAG 1.4.1: colour must still never be the only channel.
- **Check `[12]` now covers the GraphCanvas namespace group fills** (ADR-158). Five `--theme-group-bg-*` tokens that no gate had ever looked at. Curated to the one text token actually drawn on them rather than swept, because sweeping all four fails on a `muted`-on-pastel pair nothing renders. **The rect's `fill-opacity: 0.3` is modelled**, since the token value is not the colour on screen — in dark the token is itself translucent, so the two multiply to an effective 0.054, and treating the token as painted reports 8.40 where the browser renders 9.74.
- **MarketingHero gained the 320px overflow test the footer already had.** The pair's coverage was asymmetric, so one component's overflow was findable and the other's was not. The website-components suite is now 12 tests, and **runs for the first time** — all 11 of its predecessors had never executed (DEBT-WEB-3).

### Changed
- **Filled regions use `--theme-fill-strong` instead of an interaction-state token** (ADR-156). 26 regions across 23 components — a tab strip, a kbd chip, a skipped step marker, a progress track — were painted with `--theme-active-bg` despite not responding to a pointer, and became translucent when the state layers did. The new token is opaque and valued mid-range of what those sites previously composited to, so the appearance is near-unchanged by design.
- **Build-toolchain advisories cleared: `npm audit` back to 0** from 5 (1 critical, 4 high). `shell-quote` → 1.12.0 (a `quote()` command injection, and `npm-run-all` drives `build:css`), `source-map-js` → 1.2.2, `wrangler` → 4.149.0 (carrying `miniflare` and `sharp` with it). Exposure was build-time only — this package declares no runtime dependencies. **The rebuilt `dist/` is byte-identical**, and `sass` deliberately stays at 1.95.1 so the shipped-CSS delta in DEBT-SEC-3 remains a considered choice rather than a side effect.
- **Tech-debt bookkeeping.** Six resolved entries were still listed as open in `CODEBASE_FIXES.md`, left behind when their replacements were written; three more were resolved this cycle (DEBT-VR-1, DEBT-WEB-3, DEBT-FAB-2). DEBT-SEC-3's rationale was also re-measured rather than re-read: it had justified deferring a `sass` upgrade partly on "`npm audit` is already 0", which had stopped being true.
- **Five more debt items closed by measuring them** (ADR-158), taking the list to **14 open, 23 resolved**. Two were stale records rather than work: DEBT-WEB-1 had claimed for five weeks that no contrast gate existed, in six places, while three were built and passing; DEBT-VR-5b-ORIG asked for compositing coverage that its own successor had already delivered more strictly. DEBT-VR-3's never-quantified worry — "components not on a demo page were not eyeballed" — measured to an exposure of **zero**. DEBT-VR-4 was put to the user with both radii rendered and 4px kept, because the controls it worried about are transparent until hovered. The sass upgrade in DEBT-SEC-3 was taken, measured and reverted; it **breaks `postcss-svgo`**, so three data URIs would ship unminified, which makes the shipped stylesheet both larger and less optimised for no security or functional gain.
- **DEBT-TS-1 did not happen on its due date, by design.** The `WorkspaceSwitcher` aliases were scheduled for removal one release after 2026-10-08. Checked on the date: the consuming app still calls `createWorkspaceSwitcher`, `setWorkspaces` and `setActiveWorkspace` in live source, so removing them would reproduce the outage the compatibility layer was built for. **Both names keep working, and the deadline needs renegotiating with the apps team rather than enforcing.**
- **`WorkspaceSwitcher` is now `TenantSwitcher` (ADR-154).** The platform used "workspace" and "tenant" for one concept, and the ambiguity produced real bugs in the consuming app. The CDN path is now `/components/tenantswitcher/`.
  - **Both names work for one release.** `/components/workspaceswitcher/` serves byte-identical artifacts, `window.createWorkspaceSwitcher` still exists and accepts the old option names (`workspaces`, `activeWorkspaceId`), and `setWorkspaces` / `setActiveWorkspace` / `getActiveWorkspace` / `addWorkspace` / `removeWorkspace` forward to their replacements. The old factory logs a deprecation warning on every call.
  - **Migration:** `createWorkspaceSwitcher` → `createTenantSwitcher`, `workspaces` → `tenants`, `activeWorkspaceId` → `activeTenantId`, `WorkspaceItem` → `Tenant`. The item fields are unchanged.
  - ~~**Everything above comes out one release after 2026-10-08**~~ (DEBT-TS-1). **Deferred 2026-10-09:** the removal was checked on its due date and did not happen. The consuming app still calls the old names in live source, so the aliases stay until it has migrated. A new date will be agreed with the apps team rather than set here.


### Fixed (accessibility)
- **Nine component colour palettes could not carry their own text (ADR-153).** Avatar and tag palettes rendered white initials at ratios as low as **1.92** — white on `#eab308`. Three components (`activityfeed`, `applauncher`, `workspaceswitcher`) set only the background and let the foreground be inherited, so it flipped to near-white in dark mode and every entry failed. Palettes are now darkened hue-preserving until white clears 4.5, and the foreground is always set explicitly.
- **Caller-supplied colours are safe by construction.** `actionitems`, `facetsearch`, `logconsole` and `tagger` paint host-provided colours, where a fixed `#fff` fails on anything pale. They now pick the foreground at runtime by relative luminance.

### Added
- **`npm test` check `[13]`** — component colour palettes must carry their own text. Check `[12]` reads the compiled stylesheet and so covers only the theme ladder; colours declared in component TypeScript were invisible to it. Mutation-tested, including the vacuous case: a pattern matching no palette fails rather than reporting a clean sweep of nothing.
- **`scripts/derive-colour.py`** — derives accessible colours instead of picking them by eye. `fit` darkens a palette entry until a fixed foreground clears the floor; `twin` produces a dark-mode counterpart of a light tint. Validated by reproducing all four previously hand-derived values exactly.


### Fixed (dark mode)
- **Four `VisualTableEditor` presets rendered unreadable rows in dark mode (ADR-152).** `blue-header`, `dark-header`, `green-accent` and `warm` carried near-white alternating-row tints written as an inline `background-color`, which cannot respond to a theme — so every other row showed light text on a light background. Each now declares a dark twin at the same hue, handed to CSS as custom properties the stylesheet switches per theme. (`minimal` and `striped` were always correct; they use tokens.)
- **The rule is now written down where it will be read**: `AGENTS.md` carries it fleet-wide (never write a colour through `element.style`; a background and its foreground are a pair), and `components/visualtableeditor/README.md` documents the preset contract with a worked example.
- **Three demo pages hardcoded light backgrounds**, hiding their own text in dark mode — the Stepper demo's content panes and the SplitLayout demo's coloured panes. The components themselves were correct; the demos were not. Demo code now sets a foreground whenever it sets a background, since it is the first thing a consumer copies.


### Fixed (accessibility)
- **Eight text/background pairs were below WCAG AA on hovered and selected rows, and no check could see them (ADR-151).** The state layers are translucent, so text over a hovered row sits on a *composite* that no token names — invisible to a token-by-token audit. The worst was a toolbar button's own label at **3.69** on hover in dark mode, confirmed at `toolbar.scss:581`/`:586` where the muted colour and the state layer are set on the same element. 21 sites across the fleet pair a state layer with muted text.
- **`--theme-text-muted` now differs between themes, in opposite directions**: light `$gray-600` (darker), dark `$gray-350` (**lighter**). A light-mode state layer is dark and darkens the surface under the text; a dark-mode layer is white and lightens it. `--theme-primary-text` moves to `$blue-800`. **The state layers are unchanged** — the hover feel is exactly as approved.
- `DARKMODE.md` §2.3 claimed muted text was `$gray-500` "in BOTH modes" and had been stale since ADR-147.

### Changed
- **Check `[12]` now composites** every state layer over every surface and checks all text tokens against the result — 96 pairs per run. A layer that cannot be parsed **fails** rather than being skipped, because a skipped case is indistinguishable from a passing one.


### Added
- **`npm test` check `[12]` — an automated contrast gate** (`scripts/check-contrast.py`, DEBT-VR-5). Reads the *compiled* stylesheet and asserts surface-ladder ordering in both themes, the three on-screen adjacencies, and every text-token-on-surface pair against the 4.5 AA floor. Three accessibility problems shipped across ADR-147 and ADR-150 and every one was caught by a hand-run audit *after* the fact; all three were arithmetic. The gate prints its measurements on success as well as failure, so a pair sitting a hundredth above the floor is visible before it fails. Mutation-tested on four failure modes.
- **It found a gap on its first run:** `--theme-primary-text` on the sunken surface measures 4.65 — the tightest light-mode pair, and one no manual audit had checked. It passes, and is left as-is because the token's only consumer sits on chrome at 5.49; the gate now holds the line if that changes.


### Changed
- **Chrome is now a tinted surface, and the ladder is wider (ADR-150).** Side panels, toolbars and status bars were barely distinguishable from the content beside them — measured, chrome against content was **1.056**, where 1.000 means identical. The ADR-147 ladder separated planes by luminance alone (saturation never exceeded 0.33 across all four), so every surface was the same near-neutral material at a slightly different brightness. Chrome now carries a low-saturation cast toward the primary and reads as a different material rather than a dimmer white.
- **Every surface value moves, not only chrome.** Tinting chrome alone pushes it down into the step below — `chrome|ground` collapses to 1.013 — so the ladder had to widen. Content is now pure `#ffffff`. Measured on the adjacencies that actually occur on screen: `chrome|content` **1.108** light / **1.240** dark (from 1.056 / 1.151), `chrome|ground` 1.085 / 1.383, `sunken|content` 1.310 / 1.160.
- **Reviewed and accepted 2026-10-06.** Reference documentation caught up in the same change: `DARKMODE.md`'s token table (every ladder row was stale) now carries the current values plus the rules an edit must preserve, and the surface section of the ADR-147 spec is marked superseded-in-part rather than rewritten.
- **`--theme-text-muted` darkens** to `#4d5b6d`. On the widened ladder's darkest light surface the previous value measured 4.61 — passing AA by hundredths, which is the state that broke the last time a background moved. It measures 5.29 there now; the worst text pair overall is 5.29 light / 5.20 dark against a 4.5 floor.


### Security
- **The Markdown editor no longer loads its engine from `unpkg.com`.** Vditor lazily fetches its markdown engine, icon set, language pack and optional renderers (mermaid, katex, mathjax, graphviz, echarts) as script tags it injects itself — executable third-party code on pages that may be showing an admin session. The full tree is now served from this origin at `/lib/vditor-3.11.2/` and `MarkdownEditor` points vditor at it. **Consuming apps need no change**; they use `createMarkdownEditor` rather than vditor directly. Known residual: the injected chunks carry no SRI, because vditor injects them itself.

### Added
- **`font-awesome` 6.5.1 and `chart.js` 4.5.1 join the dependency closure.** font-awesome is CSS + webfonts, so it ships as a versioned directory at `/lib/font-awesome-6.5.1/`; the stylesheet is hashed and byte-identical to the npm package. **It consolidates the two versions the apps currently load** — 6.5.1 is a verified strict superset of all 92 `fa-` classes in use.
- **[`docs/CDN_INTEGRATION_GUIDE.md`](docs/CDN_INTEGRATION_GUIDE.md)** — the entry point for consuming applications: loading the theme and components, reading `/lib-manifest.json` to emit `integrity` attributes, why `crossorigin="anonymous"` is mandatory, why the theme's own tags deliberately carry no hash, and what your code must do when a load fails. Linked from `README.md`, `AGENTS.md`, `COMPONENTS.md`, `DOCUMENTATION.md`, `CDN_CONTRACT.md` and the docs index.
- **`npm test` check `[11]`** — fails the build when a file in `docs/` is not registered for publication.

### Changed
- **Bootstrap and bootstrap-icons are deliberately NOT vendored under `/lib/`** — this origin already serves them at `/js/` and `/icons/`. Verified rather than assumed: our bootstrap-icons 1.13.1 is a strict superset of every `bi-` class the apps use, so migrating off jsdelivr 1.11.3 is safe. Three `bi-` classes used in consuming apps resolve in *neither* version and render nothing today; the intended names are recorded in `CDN_CONTRACT.md`.

### Fixed
- **Seven documents existed but were never published, and the docs index linked three of them** — so `static.knobby.io/docs/` carried broken links while every file was present in the repository. `APPS_TEAM_USAGE_GUIDE.md`, `BEGINNERS_GUIDE.md`, `SURFACE_CONTRACT.md`, `CAPABILITY_MANIFEST.md`, `DYNAMIC_UI_GUIDE.md`, `DYNAMIC_UI_MIGRATION.md` and `ABOUT_DEPRECATION_WARNINGS.md` are now generated and reachable.


### Added — dependency closure served from this origin (ADR-149)
- **Four third-party libraries now ship from `static.knobby.io` instead of public CDNs**, at immutable versioned URLs with published SRI hashes: `dompurify`, `maxgraph`, `signalr`, `cytoscape`. Each is a single self-contained file at `/lib/<name>-<version>.js`; consumers read `/lib-manifest.json` to emit `integrity` attributes rather than transcribing hashes. See `CDN_CONTRACT.md` for the consumption pattern.
- **`npm test` check `[10]`** re-pairs every published hash with its artifact, mutation-tested. A stale hash is a hard browser load failure — the outage SRI exists to prevent, not cause.

### Security
- **The sanitizer the apps pin was itself vulnerable.** Vendoring `dompurify` put it under this repo's `npm audit` for the first time and surfaced **19 open advisories against 3.2.4**, including XSS bypasses. It is served at **3.4.16**. Applications should move their pin regardless of which host they fetch from — changing the host would not have changed the exposure.
- `postcss-cli` 11 → 12, clearing three high advisories published against existing tooling since the last audit. Compiled `custom.css` is byte-identical across the upgrade.


## 2026-10-04

### Fixed — a component that cannot read now refuses rather than fabricating (ADR-148)

Twelve sites across seven components answered a read after failing to initialise, returning a plausible value a host would then persist over the user's own. This is the shape that destroyed unrecoverable production data in a consuming app on 2026-10-03.

- **`DynamicFormSwitcher` — the aggregation point.** `readFieldValue()` turned an adapter throw into `undefined`, and `fallbackDefault()` invented a typed value for a field that never mounted; both fed `getValues()`, which is exactly what a host hands to `api.save()`. **`getValues()` and `getAllValues()` now throw, naming every unreadable field**, rather than returning a partial form. `fallbackDefault` is deleted. **This is a breaking change**, and it is the one the reporting team asked for — a partial save is now impossible instead of silent.
- **`PromptTemplateManager` — the most damaging single site.** A rejected save called `replaceTemplate()` with the local copy, then ran `clearDirty()` *unconditionally* and logged `"Saved"`. The editor showed the template as saved and dropped the unsaved-changes marker, so a user who navigated away lost the work with no error. A failed save now keeps the edit, keeps the marker, and says so. A failed template load no longer replaces the list with `[]` (and no longer logs `"Refreshed: 0 templates"`); a failed duplicate no longer adds a template the backend has never heard of.
- **Five pickers throw on a missing container** instead of returning a null object that answered `getValue()` with a fabricated setting — `orientationpicker` (`"portrait"`), `columnspicker`, `spacingpicker`, `toolcolorpicker`, and `layoutpicker`. The null objects are deleted. No internal caller is affected: every in-repo reference is a registry name string. `layoutpicker` is included although the bug report cleared it — its `getValue()` returned `null` against a `LayoutAlgorithm | null` contract, so `null` is a legitimate "nothing selected" and the stand-in was indistinguishable from a real user choice.
- **Recents caches withdraw from the write, not the read.** `commandpalette` and `fontdropdown` may still show an empty recents list when the load fails, but no longer overwrite stored recents they could not read.

### Added
- **`npm test` check `[9]`** — `scripts/check-stand-in-reads.py` fails the build when a stand-in factory answers a read instead of refusing. Mutation-tested. Its header states plainly what it cannot see: inline failure branches, `catch`-swallows, and aggregation-point defaults, all of which this audit found by hand.
- **`layoutpicker` has a test file for the first time**, which is why its defect went unnoticed by the bug report, the suite, and three prior sessions.

### Changed
- **`FRONTEND.md` and `AGENTS.md` now carry the rule.** The line that permitted this here was not a contradiction but an omission — *"log the error and leave the DOM unchanged"* mandates the two things the defective code already did correctly and was silent on the third, *do not answer*.


## 2026-09-11

### Changed
- **Dependency currency:** `marked` 17 → 18, `npm-run-all` 1.1.3 → 4.1.5, `@playwright/test` 1.58 → 1.63. All three are build tooling that does not touch the published stylesheet; the compiled `custom.css` is byte-identical before and after. `marked` 18's only output difference across the whole docs set is two dropped newlines after an HTML comment.
- **`sass` deliberately held at 1.95.x.** 1.104 changes the *shipped* stylesheet: colours inside SVG data URIs serialise as percentage `rgb()` rather than hex (valid, and it decodes to the same colour), plus off-by-one rounding in a few Bootstrap-derived values. Valid output, no security benefit, and a CSS delta is unwelcome while the visual refresh is still under review. Worth taking deliberately later with the accordion icons eyeballed — not as a side-effect of a security pass.

### Security
- **All 18 dependency vulnerabilities resolved — `npm audit` reports 0.** 11 high (postcss, undici, sharp, svgo, ws, nanoid, vite, wrangler, browserslist, immutable, miniflare), 5 moderate, 2 low. Every fix was non-breaking: `package.json` moved only `vitest` and `@vitest/coverage-v8` from `^4.1.3` to `^4.1.11` (the patch that closes the `@vitest/mocker` path-traversal advisory), and everything else resolved in the lockfile.
- **Scope, for the record: none of these shipped to consumers.** This package declares **no runtime dependencies** — every entry is `devDependencies` build tooling, and the two libraries that do ship (`bootstrap.bundle.min.js`, `chart.umd.js`) are the published artifacts themselves. The exposure was build-time supply chain, not the CDN.

### Fixed
- **The `undici` override had no upper bound and silently broke the entire test suite.** It read `">=7.24.1"`, so it resolved to undici 8, which jsdom@29 does not support — all 142 test files failed to start and vitest reported **"no tests"** rather than a failure. Now `^7.24.3`, matching jsdom's own requirement, with the reasoning recorded in `package.json` so the ceiling is not removed again as "tidying".


## 2026-09-09

### Fixed (knowledge base)
- **`agentknowledge/history.jsonl` was not valid JSONL and had not been since February.** Three lines failed to parse, so any agent reading the file programmatically would fail on it — undetected for six months because nothing ever parsed it. Two causes, both from writing JSON with shell text tools instead of a serializer: two entries were appended without a trailing newline, putting a second object on the same line, and one carried `\!` — bash history-expansion escaping — which is not a valid JSON escape. Repaired without touching content: 241 lines to 243, and a hash of both files with newlines and the escape normalised away is identical.
- **`npm test` now parses the knowledge base.** `test-local.sh` check [8] validates `history.jsonl` as JSONL and the three `.yaml` files as YAML, so a malformed append fails the build instead of sitting unnoticed. `AGENTS.md` now requires appending with a JSON serializer and explains why.

### Fixed (round three)
- **Dark mode now has visible elevation.** It had none, and raising the shadow opacity could never have fixed it: against the `#0d1420` page ground a black shadow reaches only 1.034 contrast at alpha 0.22 and 1.106 at 0.75, while a light-mode shadow at 0.08 already reaches 1.192. The ground is near-black, so a darker shadow has nowhere to go. Every dark elevation now leads with a hairline light ring, which is what actually reads as lifted.
- **Bootstrap's shadow scale was never redefined for dark mode**, so dropdowns and modals were casting light-tinted shadows on a dark ground — invisible twice over.
- **Docked panel edges are visible in dark mode.** `--theme-edge-shadow-color` was black at 0.25, the same physics; a docked edge now reads as a faint lit seam.
- **71 components never declared a corner radius at all** and so rendered square regardless of the token — the previous round only fixed components that explicitly set it to `0`. A sharp LineWidthPicker beside a rounded CronPicker was exactly this: components built on Bootstrap primitives inherited the refresh for free, hand-rolled ones never consumed the token. 163 rules across 46 components now take a radius by role. Layouts, full-bleed bars, text renderers, drag handles and edge-docked roots are deliberately excluded, and the exclusion list is written down.

### Changed
- **Type is a little larger.** `$font-size-sm` carries 481 call sites against base's 201, so it — not base — is what decides whether the interface reads small: 12.8 → 13.6px, with base 14 → 15px and lg 16 → 17px. `$font-size-xs` and `-2xs` deliberately hold, because 12px at line-height 1.45 already needs 17.4px and the ribbon's group-label row is 16px.
- **Control heights grew 2px** (22/28/32/40/44 → 24/30/34/42/46). 15px text needs a 21.75px line box, which left a 22px control with no slack at all.
- **`$spacer` 12 → 13px.** The `$sp-*` fixed-pixel scale used for component internals deliberately stays put; it is sized against fixed control heights and moving it wholesale produces uneven layouts.


## 2026-09-08

### Fixed (round two — the refresh reached Bootstrap and the stragglers)
- **Bootstrap never received the refresh, which is why it read as a slight difference.** `$body-bg` still compiled to `$gray-50`, so Bootstrap painted the page the *old* ground colour while every component used the new one; the dark `--bs-*` surface overrides were pinned to raw greys off the ladder. Both layers now agree in both themes.
- **Bootstrap's own shadow scale is now two-layer.** `$box-shadow` / `-sm` / `-lg` were never overridden — dropdowns and modals draw from those rather than `$shadow-*`, so the most visible overlays in the library kept the old single-blur smudge.
- **Ribbon controls are no longer square.** They were pinned to a local `$ribbon-ctrl-border-radius: 0` across 17 call sites.
- **34 further components** hardcoded `border-radius: 0` from the square era and now take a radius by role — popovers and dialogs `lg`, panels and controls base, chips and icon buttons `sm`. Three stay square deliberately and say why.
- **Dynamic UI was never themed.** `dynamiccanvas.scss` referenced `var(--theme-border, …)` and `var(--theme-surface, …)`; neither token exists (`--theme-border-color` / `--theme-surface-bg`), so it silently used its hardcoded fallbacks in both light and dark. A CSS custom-property fallback fails quietly by design.
- **ContextMenu, HoverCard and NotificationCenter** carried raw `box-shadow` values instead of tokens. HoverCard's separate dark-mode shadow rule is now redundant and removed.
- **AuthCard** drew its card on `var(--bs-body-bg)` — the page ground — so the card was the same colour as the page behind it.

### Changed
- **Surfaces are now a tonal ladder rather than one flat field (ADR-147).** `--theme-body-bg` and `--theme-surface-bg` previously held the *same* colour (`#f8fafc`), so the page had no ground and a sidebar was separated from the content beside it by a one-pixel border and nothing else. Both themes now carry four ordered planes — sunken, ground, chrome, content. The light-mode direction is unchanged: `--theme-surface-raised-bg` remains *darker* than `--theme-surface-bg`, and still inverts in dark mode.
- **Hover and active are translucent state layers** instead of opaque greys, so one token shades a white card, a tinted sidebar and a coloured row correctly. An opaque grey punches a visible hole in any surface that is not that exact grey — which, since the ladder, is every surface.
- **Corner radius is a small, deliberate scale tiered by role** — 2px for badges and dense controls, 4px for buttons, inputs and cards, 6px for modals and popovers, 8px for large overlays. This amends the previous "0-2 border radius" rule in `AGENTS.md`. Setting the tokens back to 0 returns the library to hard corners in one edit. Genuine circles (`50%`) and capsules are untouched.
- **Shadows are two layers at lower alpha** — a tight key shadow that reads as contact plus a wider ambient one that reads as distance — replacing a single wide blur that read as a smudge beneath the element.
- **Tabs**: the active indicator is now a 3px bar inset from the tab edges with rounded top corners, so it marks the label rather than the whole cell, and it cross-fades between tabs. All four orientations carry the equivalent treatment.
- **Slightly more reading room** in list-like surfaces: line height 1.4 → 1.45, and small increases to nav, menu, list-group and table row padding. Control heights and the `$sp-*` fixed-pixel scale are deliberately unchanged — `$spacer` does not drive them, so a global bump would move layouts unevenly.

### Fixed
- **`--theme-primary-rgb` did not match `$primary`** in either theme — both held Tailwind blues (`#2563eb` light, `#60a5fa` dark) rather than the theme's own `#1c7ed6` / `#4dabf7`. Every focus ring and hover glow in the library was tinted a hue the theme does not otherwise use. Expect a visible, and correct, shift in glow colour. `--theme-surface-bg-rgb` had drifted from `--theme-surface-bg` in the same way.
- **The tab indicator now works in dark mode.** Its colour was a hardcoded light-mode `$blue-600` rather than a token, so it never responded to the theme.
- **Muted text meets WCAG AA on every surface.** `--theme-text-muted` measured 4.54:1 on the old page background — already inside rounding distance of the 4.5 floor — and the new darker ground took it to 3.94:1. Darkened to `#556478`, measuring 5.00:1 on the darkest light surface.
- **New `--theme-primary-text` token** (`$blue-700` light, `$blue-300` dark) for primary carrying *type*. `--theme-primary` is tuned as a fill and measures only 3.91:1 as a label on chrome; the active tab label uses the text token instead.

## 2026-09-02

### Added
- **`MarketingHero`** — the introduction area for a public page: optional eyebrow, heading, supporting paragraph, up to two actions, and an optional media slot, in stacked, centered, and split layouts with a configurable collapse breakpoint. The stylesheet is the contract: a static page links `marketinghero.css`, writes the documented markup, and loads no script; `createMarketingHero(containerId, options)` is a convenience that emits exactly the same markup, and a canonical-structure test fails if the two drift. The eyebrow follows the heading in the DOM and is lifted with `order: -1`, so the heading stays first in document order (ADR-146, D4). Ships no animation at all.
- **`SiteFooter`** — a semantic public-site footer: organization details, grouped navigation, contact details, legal links, and optional build information in one to four responsive columns, each group a `<nav>` named by its own heading. Columns use `repeat(N, minmax(0, 1fr))`, so a long email address wraps instead of forcing its track wider than its share. Unvisited links are muted and visited links take the accent colour — a deliberate inversion of the usual convention (ADR-146, D5).
- **Named grid breakpoints** — `$grid-breakpoints` is now declared in `src/scss/_variables.scss` with Bootstrap's own values, so component SCSS can name a breakpoint instead of hardcoding pixels. Compiled `custom.css` is byte-identical.
- Demo pages for both components, each ending with a hand-authored section that uses no factory call — the section that actually tests the CSS-is-the-contract claim. Layout Studio stencils and Component Studio entries for both.

### Fixed
- **The test suite runs on Node 22 and later.** 137 tests across 4 suites failed with `Cannot read properties of undefined (reading 'removeItem')`: Node ships its own experimental `localStorage` global that shadows jsdom's and is undefined without `--localstorage-file`. `tests/setup.ts` now supplies a minimal in-memory `Storage` when the global is missing, beside the existing `ResizeObserver` and `matchMedia` polyfills. Inert on older Node.
- **Both new demo pages are reachable from the gallery.** `MarketingHero` and `SiteFooter` shipped with working demo pages that nothing linked to; `demo/index.html` is the only page that indexes component demos. Added a **Public Surfaces** category matching section 28 of the master component list. AGENTS.md now states that registering the demo card is part of creating a demo page.
- **`npm run build` runs on macOS.** Three GNU-only `sed -i` calls — in `bundle-diagramengine.sh`, `wrap-iife.sh`, and the `build:icons` script — aborted the build under BSD sed, which reads the substitution as a backup-file suffix. All three now use `sed -i.bak` and remove the backup, which behaves identically on GNU.

## 2026-09-01

### Added
- **Design spec for `MarketingHero` and `SiteFooter`** (`specs/marketinghero-sitefooter.prd.md`) — two public-surface components requested by the Outcrop Inc website, for the hero and site-footer patterns Bootstrap does not provide. Both follow the AuthCard shape: the stylesheet is the contract and works on hand-authored markup with no script on the page, while a thin `container-first` factory renders exactly the documented markup so each component still earns its Layout Studio stencil, Component Studio entry, and a passing conformance gate. Design only — no implementation yet (ADR-146).

## 2026-08-10

### Fixed
- **DiagramEngine e2e suite now runs.** All 67 tests failed on `createDiagramEngine not found on window` because the spec navigated to the component gallery index, which loads no component scripts. Repointed at the DiagramEngine demo page; all 67 pass with no engine changes — nothing was broken behind the broken harness.

## 2026-08-09

### Added
- **Click-to-place on `DynamicCanvas`** — `startPlacement(spec)` arms the canvas; the user's next click places a component exactly where they point. The canvas resolves what was clicked, records a fractional position within that node's scrollable content, and emits it as an ordinary patch. An application persists the patch; it never converts a screen coordinate into an anchor (ADR-145, amended). `cancelPlacement()` and `isPlacing()` complete the API; Escape cancels, and the click never reaches the component underneath.
- **Spot anchoring** — a node anchor may carry `spot: {x, y}`, a fraction of the target's scrollable *content*, so a mark placed on the fortieth line stays there through scrolling and resizing. `within` records which scrolling region the fraction was measured against, so a component that scrolls internally is handled as well as one whose frame body takes the overflow.
- **Inline editing on `Annotation`** — the expanded callout is a text field. `editable: false` restores read-only text for labels the application owns.
- Demo: `demo/components/dynamiccanvas.html` gained *Place annotation…*, *Add long document* and *Add long note*, covering both scrolling shapes; `demo/components/annotation.html` gained an editing section.

### Changed
- **`Annotation` rests as a permanent pin** with its card opening beside it, and the card no longer draws a tail. Expanding used to swap the pin for a card, which pulled the element out from under the pointer and produced a self-sustaining expand/collapse flicker; a tail that points somewhere the card does not open was claiming something false.
- **`ChatDock` transcript is fixed-height and scrolls** rather than growing with the conversation.
- Node anchors are validated further: `spot` must be a pair of fractions in 0..1 and `within` a non-negative integer. A NaN fraction from a model-authored document was previously accepted, and places a mark at no coordinates rather than raising.

### Fixed
- The packer marched **every** unanchored overlay along the top of the main region, discarding the coordinates a dropped mark was given.
- A fixed-placement overlay was added to the packer's obstacle list, so a mark dropped on bare canvas pushed nearby nodes aside — the displacement overlays exist to avoid.
- `demo/components/dynamiccanvas.html` loaded `datagrid.js` without `datagrid.css`, so the grid rendered unstyled and overflowed its frame instead of scrolling inside it.

## 2026-08-03

### Added
- **Dynamic UI layer** — a canvas that assembles live components on demand, wires them declaratively, and persists as an append-only patch log. The library ships the runtime and the contract; the consuming application ships the model and the storage through a six-function host interface (ADR-140). Spec in `specs/dynamicui.prd.md`.
- **`runtime/`** — headless runtime, bundled to `runtime/runtime.js` as `window.EnterpriseRuntime`: document validation and folding, declarative wiring with cycle rejection and three cardinality policies, an intent resolver that explains every choice, allowlist-only component registry, mount lifecycle with weight budget and lossless demotion, and a deterministic layout packer.
- **`DynamicCanvas`** — the rendered surface. Layout is authored as intent and resolved deterministically; dragging a node promotes it to fixed coordinates that the packer then flows around, so the canvas never overrides a position the user chose. Off-screen nodes virtualize; untouched nodes collapse to restorable chips.
- **`StickyNote`** and **`Annotation`** — canvas citizens written after the Surface contract and only against its public API, proving it needs no private hooks. Both exercise all three anchor modes, including entity anchoring, where a note follows its data across canvases.
- **Capability manifests** for 96 components, colocated per component and aggregated at build time (ADR-142).
- **Fleet conformance gate** (`runtime/fleet-conformance.test.ts`) — every component directory is migrated, explicitly exempt with a recorded blocker, or permanently excluded with a written rationale. A new component that is not canvas-capable cannot land.
- **Demo** at `demo/dynamic-ui.html`, whose host is a lookup table rather than a model — the substitution that proves the boundary holds, and the reference host implementation.
- Docs: `docs/DYNAMIC_UI_GUIDE.md`, `docs/DYNAMIC_UI_MIGRATION.md`.

### Changed
- **`AGENTS.md`** — new `(CRITICAL)` Surface contract section: the three conformance levels, manifest rules, the additive `emitChannel` pattern, and a new-component checklist. Corrects the factory-signature guidance: only 35 of 118 components follow ADR-134's canonical `create(containerId, options)`, so argument order is now recorded as manifest data rather than migrated (ADR-144).
- **`SECURITY_GUIDELINES.md`**, **`PERFORMANCE.md`**, **`TESTING.md`** — new sections on untrusted scene documents, the weight budget and virtualization, and the conformance gate.
- `DataGrid` and `TreeView` gained the Surface contract. Purely additive — their existing suites pass unchanged.

### Fixed
- **`SplitLayout`** — the constructor early-returned on a degenerate configuration while still returning a live object, leaving `this.options` undefined so `hide()`/`destroy()` threw during teardown. Found by the conformance gate.


## 2026-07-12

### Documentation
- **`AGENT_INSIGHTS.md`** — new accumulated-insights file for this repo (mirrors the apps-repo convention), seeded with seven principles from the Keycloak parity workstream (cross-repo verification, executable drift guards, AC-vs-requirement gaps, pinning-vs-redeploy trade-off, disjoint `_headers` patterns, pipeline reuse for non-UI scripts, trusted-markup boundaries).
- **`CODEBASE_FIXES.md`** — new "ACCEPTED DEBT — Keycloak Theme Parity" section (DEBT-PAR-1..4) recording the deliberate trade-offs from ADR-137/-138/-139 so future audits keep their context.
- `@entrypoint` markers added to `createAuthCard()` and `runThemeInit()`; repository index rebuilt.

## 2026-07-11

### Added
- **ThemeInit** (`/js/theme-init.js`, `components/themeinit/`) — pre-paint theme initializer for the Keycloak parity programme (spec `specs/keycloak-theme-parity-requirements.md` R2/R3, ADR-137). Dependency-free ~1.2 KB `<head>` script: resolves the `knobby-theme` cookie → `localStorage` → `prefers-color-scheme` → `light` (strict `light|dark|auto` validation), sets `data-bs-theme` synchronously so there is no flash of the wrong theme, and tracks OS appearance changes live while the mode is `auto`/unset. CSP-clean (external script, no inline). 34 unit tests.
- **AuthCard** (`components/authcard/`) — canonical login-card surface promoted verbatim from the knobby app's `app.css` (spec R5, ADR-138). The class structure is a **frozen parity contract** mirrored by the Keycloak FreeMarker theme; the "canonical structure" unit tests are the CI drift guard. `createAuthCard()` renders the canonical markup for app pages; server-rendered consumers link only the CSS. Dark-mode automatic via `--bs-*` tokens. Stencil, Component Studio entry, and demo page included. 32 unit tests.
- **CDN contract** (`CDN_CONTRACT.md`, `cdn/_headers`, ADR-139) — the versioning/caching contract for static.knobby.io (spec R4): "latest + contract" consumption model (no hard pinning/SRI, so theme releases never force an IdP redeploy), additive-only guarantee on the parity asset set, disjoint cache rules (immutable icon fonts with CORS, stale-while-revalidate for latest assets, `no-cache` build.json), and a breaking-change protocol with a versioned-snapshot escape hatch.

### Fixed
- **generate-docs description extraction** — multi-line HTML comments (SPDX headers) in component READMEs no longer leak into `COMPONENT_INDEX.md` descriptions (also fixes the pre-existing `explorerpicker` entry).

## 2026-05-15

### Fixed
- **FormDialog wizard: toggle (and every field type) state was lost across step navigation.** The wizard renderer rebuilds the live DOM on every step transition and the old code cleared `fieldMap` without preserving values, so navigating Step B → C → B (or reading `getValues()` from Step C) returned the *declared* defaults, not the user's input. Reported by the apps team for `type: "toggle"`; the underlying defect affected every field type.
  - **Fix:** FormDialog now maintains an internal `valueCache` that survives step rebuilds. Live values are snapshotted into the cache before each transition wipes `fieldMap`, and the cache is reapplied via `writeFieldElementValue` when fields are rebuilt. `getValue(name)` falls back to the cache when the field isn't currently mounted; `getValues()` returns a complete snapshot from any step, including declared defaults for fields the user has not yet visited. `setValue(name, value)` writes the cache too, so values seeded from one step are applied when the wizard rebuilds the target step.
  - Covered by seven new regression tests in `FormDialog wizard state persistence` (toggle, checkbox, radio, text, textarea, cross-step `setValue`, declared-defaults visibility).
  - No public API change. Apps that wrote a closure-backed custom-element workaround can now remove it.

### Documentation
- **`docs/APPS_TEAM_USAGE_GUIDE.md`** — new consumer-facing guide for apps teams that embed CDN components. Codifies the workflow ("read the README first, pin and read CHANGELOG on bump, add a CI grep guard"), the form-field-capable stable surface, the slug→factory-name gotchas table, and a CI guard recipe (bash + ESLint). Sets the policy that future public-API renames will ship a runtime deprecation warning for at least one minor cycle and a `BREAKING` CHANGELOG entry. Filed in response to apps-team feedback about three silent renames in eight weeks (Breadcrumb `segments`→`items`, SymbolPicker `onChange`→`onInsert`, MultiselectCombo factory-name case flip).
- **FormDialog README** — new "Wizard value persistence" subsection under "Wizard Mode" documenting the value cache and the guarantees `getValues()` / `setValue()` now provide from any step.

## 2026-05-14

### Fixed
- **DynamicFormSwitcher auto-discovery: container is a string id** — every conforming CDN factory in the codebase takes `(containerId: string, options)` and calls `document.getElementById(containerId)`. The first iteration of `tryAutoDiscover` passed the host `HTMLElement` directly, so factories logged "Container not found" and never rendered. Fixed: DFS now assigns a stable `host.id` (`${dfsId}-host-${fieldName}`) and attaches the host into `fieldsEl` BEFORE invoking the factory, then passes `host.id` as the first arg. `buildFieldGroup` re-parents the host into its label/error wrapper afterwards; the factory-rendered children move with the host.
- **AGENTS.md convention** clarified to state explicitly that the factory takes a `containerId: string` (id of an element already in the DOM), not an `HTMLElement` directly. Some factories accept both — the string form is the canonical convention.
- **Test fakes** updated to resolve the id via `document.getElementById(containerId)` to match the real-factory contract.

### Changed
- **CODING_STYLE pass** — `DynamicFormSwitcher.tryAutoDiscover`, `buildCustomField`, `validateField`, plus `FormDialog.setValue` and `FormDialog.buildRichTextInput` extracted into focused helpers, all now under the 30-line limit per CODING_STYLE.md. `builtinTypeValidate` lifted to module-level for reuse. `buildRichTextEditor` / `buildRichTextMirror` lifted out of FormDialog impl.

### Documentation
- New per-component spec progress file `specs/dynamicformswitcher.md` per AGENTS.md.
- `CONVERSATION.md` session entry for the 2026-05-13 / -14 work.
- `DynamicFormSwitcher` header marker block gained the `⚡ FLOW:` line per MARKERS.md.

## 2026-05-13

### Added (later same day)
- **DynamicFormSwitcher: mount adapter + auto-discovery + registry (ADR-134)** — DynamicFormSwitcher can now host **any conforming value-bearing component in the library** through one auto-discovery path. New surface:
  - `field.mount: (host, fieldName) => DynamicFormFieldAdapter` on `type: "custom"` — caller returns a full adapter (`getValue/setValue?/validate?/destroy?`), DFS owns lifecycle.
  - `field.componentOptions: Record<string, unknown>` — verbatim forwarded to an auto-discovered factory or to a registered provider.
  - **Auto-discovery**: any `field.type` that isn't a built-in is resolved via `window.create<PascalCase>` (kebab-case canonical; camelCase + single-token-lowercase fallbacks). The discovered handle is adapted onto the field protocol. Literate error renders in-place when no factory matches.
  - **Registry**: `registerDynamicFormFieldProvider(typeName, factory)` / `unregisterDynamicFormFieldProvider(typeName)` for non-conformant components or test overrides.
- **AGENTS.md (CRITICAL)** — new "Form-field-capable Components — DynamicFormSwitcher Convention" section. Every value-bearing component MUST expose `createXxx → { getValue, setValue, destroy }` + accept `value` / `onChange` options. Carries the per-PR checklist and the out-of-scope taxonomy (layout / dialog / chrome / selection panels / AI inputs / diagrams).
- **Retrofits to convention** — 7 components:
  - `latexeditor` — `setValue(latex)` added; `value` option aliases `expression`.
  - `symbolpicker` — `setValue(code)` added; `onChange(code)` fires alongside `onSelect`.
  - `sprintpicker` — `value` option added; init applies via `setValue`.
  - `timezonepicker` — `value` option aliases `timezone`.
  - `peoplepicker` — `getValue/setValue` alias `getSelected/setSelected`; `value` option aliases `selected`.
  - `multiselectcombo` — `getValue/setValue` alias `getSelectedValues/setSelected`; `value` option aliases `selected`.
  - `visualtableeditor` — `getValue/setValue` alias `getData/setData`; `value` option aliases `data`.
- **17 new DFS tests** covering mount, auto-discovery (kebab + lowercase scan), registry overrides, literate error rendering, missing-setValue tolerance, and a parameterised retrofit-compliance fixture (one test per retrofitted component asserting the auto-discovery contract). Total DFS suite: 68 tests.

### Decisions (later same day)
- **ADR-134** — Form-field-capable Components Convention. Audit log: 26 components conform as-is, 7 retrofitted, 2 explicitly excluded (`explorerpicker` — read-only nav panel; `smarttextinput` — multi-shape AI input). The exclusion taxonomy is documented so future components are classified deliberately.

### Removed
- **`demo/all-components.html` deprecated and removed.** The single-page aggregate demo grew tedious to maintain — every new component had to be added in two places (its own demo + this aggregate), and the page itself had become the most likely surface to drift. The per-component demos under `demo/components/` remain the canonical demo surface; `demo/studio/component-studio.html` continues to serve the interactive "see-everything-together" use case (with the bonus that components render in context). `demo/index.html` lost the "Looking for the complete demo?" link and `scripts/copy-docs.sh` no longer rewrites paths for the removed page. Spec docs that historically said "add a section to `all-components.html`" should no longer add that step; updating component plans / specs is a follow-up cleanup.

### Added
- **DynamicFormSwitcher (ADR-132)** — new CDN component: a container that holds N pre-defined form variants and shows exactly one at a time, retaining values per variant across switches. Three selector styles (`dropdown`, `segmented`, `tabs`), or selector-less mode for embedding inside FormDialog. Full field-type coverage (`text/email/password/url/number/textarea/select/multiselect/radio/checkbox/toggle/date/datetime/time/file/color/code/richtext/custom`) with native-typed value extraction — no string coercion at output time. `validate()` runs the active variant's per-field validators followed by an optional `onValidate` cross-field veto. `getValues()` returns the active variant's values; `getAllValues()` returns the per-variant nested map of every touched/seeded variant. `reset()` + `resetAll()`. Dark-mode-ready via `--theme-*` tokens; ARIA region + tablist roles + arrow-key navigation. Files: `components/dynamicformswitcher/{dynamicformswitcher.ts,scss,test.ts,README.md}`, demo at `demo/components/dynamicformswitcher.html`, stencil + Component Studio entry. 51 tests.

### Changed
- **FormDialog (ADR-133)** — field-type expansion. Added `url`, `datetime`, `time`, `color`, `radio`, `code`, `richtext` so FormDialog and DynamicFormSwitcher share the same vocabulary for the common case. `url` gets cheap URL validation when non-empty. `radio` returns the selected option value. `code` is a monospace textarea. `richtext` is rendered as `contenteditable` paired with a hidden mirror input so the existing `getValue()`/`getValues()` (`Record<string, string>`) contract is preserved. New SCSS classes: `.formdialog-color`, `.formdialog-code`, `.formdialog-radio-group`, `.formdialog-radio-wrap`, `.formdialog-richtext`, `.formdialog-richtext-wrap`. 7 new tests.

### Decisions
- **ADR-132** — inline field renderer (not shared with FormDialog) because IIFE wrapping prevents cross-module imports. Variant catalog stays in the calling app (rejected building a closed catalog of auth methods on the CDN).
- **ADR-133** — additive expansion only. `multiselect` and `file` are intentionally deferred from FormDialog because adding them would force a breaking change to FormDialog's `getValues(): Record<string, string>` contract (8 internal callers). Until that breaking refactor lands, DynamicFormSwitcher is the path for `multiselect`/`file`, since its value contract is already `Record<string, unknown>`.

## 2026-04-28

### Changed
- **NavRail (ADR-131)** — the collapse/expand chevron is now rendered at the **top** of the rail (was previously at the bottom, after the footer slot). Apps-team integration testing flagged the inconsistency with `Sidebar`, whose collapse button lives in its actions row at the top — same edge of the screen, two different gesture locations. `buildDOM` now inserts `buildToggleButton()` as the first child of the rail; `.navrail-toggle` border flipped from `border-top` to `border-bottom` so the visual divider stays on the correct side. Footer slot is now reserved purely for account/settings content. No public API change — the toggle still resolves by `.navrail-toggle` class (47/47 tests green without modification).

### Added
- **NavRail (ADR-131)** — one-shot **dev-mode overlap warning**. NavRail is `position: fixed` and publishes `--navrail-{left|right}-width` so consuming pages can either consume the variables on a content wrapper or wrap NavRail + content in a `DockLayout` (`contained: true`). When a host page does neither, content slides under the rail. After two `requestAnimationFrame` ticks, the rail probes `elementFromPoint` just past its outer edge; if the topmost non-rail element extends back under the rail's footprint, a `[NavRail]` `logWarn` names the CSS variable to consume and the DockLayout alternative. Skipped when `contained: true`. New `suppressOverlapWarning?: boolean` option (`NavRailOptions`) silences the check for layouts that intentionally trip the heuristic. README §"CSS Custom Properties" gained a paragraph; new `NavRailOverlapCheck` concept registered in `agentknowledge/concepts.yaml`.

### Decisions
- **NavRail resizable rail explicitly *not* added.** ADR-131 records the rationale: NavRail's value is two stable widths (icon rail / labeled drawer); apps that need a draggable edge already have `Sidebar` (resizable, dockable, floatable). Adding resize would blur the README's NavRail-vs-Sidebar boundary and would not fix the overlap issue — the published CSS var would still need to be consumed.

## 2026-04-27 (polish)

### Changed
- **ChartPanel demos** — switched from `cdn.jsdelivr.net` to a locally vendored Chart.js bundle (`dist/vendor/chart.js/chart.umd.min.js`) for the standalone, all-components, and Component Studio demos. Added `chart.js@^4.4.7` to devDeps; the existing `npm run copy:js` step now mirrors `node_modules/chart.js/dist/chart.umd*.js` alongside Bootstrap. Demos work offline / behind strict CSPs / past ad-blockers without depending on jsdelivr availability. README continues to list the CDN URL as an alternative for end consumers who prefer cross-app caching. ADR-130 logic unchanged — `chartpanel.ts` still reads `window.Chart` and renders a literate error if missing.
- **ChartPanel internals** — `buildScales` and `destroy` split below the 30-line CODING_STYLE.md limit (`buildYTicks` and `tearDownObservers` helpers extracted). `tooltip.enabled: !isSpark || true` simplified to `true` (the original expression always evaluated `true` — leftover from a half-applied edit).
- **Theme tokens** — `--theme-metric-positive` / `--theme-metric-negative` added to light-mode `:root` in `src/scss/_dark-mode.scss` (were defined only under `[data-bs-theme="dark"]`). MetricCard's trend colours now resolve through the token in both modes consistently with what its README documents.
- **ADR-130** — amended in place with a paragraph explaining why `FALLBACK_INTENT_HEX` constants are kept (jsdom / pre-CSS-load safety net only; runtime paint always tries `--theme-*` first), so the next reader doesn't flag the hex literals as drift from the spec's "no hex anywhere in JS" rule.

### Removed
- **ChartPanel demo** — the synthetic "Missing dependency (literate error)" card on `demo/components/chartpanel.html` is removed. It deleted `window.Chart`, instantiated a panel to render the literate error block, and restored the global. The card produced an `[ERROR]` console line that was indistinguishable from a real Chart.js load failure, and the `delete window.Chart` snippet was a tempting copy-target for adopters. The literate-error path remains documented in `chartpanel/README.md`.

### Fixed
- **DiagramEngine embed tests** — bumped four pinned shape counts in `diagramengine-embed.test.ts` (152→154, 108→110 ×2, 164→166) and `UI_SHAPE_COUNT` 93→95 in `stencils-ui-components.ts` to match the two new Tier C stencils (`metriccard`, `chartpanel`). CI caught this; my local `tail -15` had truncated the failure summary, so the "green" line I reported in the previous commit came from a partial buffer.

## 2026-04-27

### Added
- **MetricCard (ADR-129)** — new component (`components/metriccard/`) for dashboard "KPI strips". Single-value cards with optional trend (intent-override semantics — e.g. "errors increased" can be `direction: "up", intent: "negative"`), optional inline 24px sparkline, optional secondary stat, and four lifecycle states (`ready` / `loading` / `error` / `empty`). Click semantics are native: `href` → `<a>`, `onClick`-only → `<button>` (no `role="link"` on a `<div>` with manual key handlers). Two sizes (`sm` 11/22px, `md` 12/32px) for dense analytics rows. Card height is reserved across states so `loading → ready` produces no layout jump. Theme tokens via the project's `--theme-*` layer with SCSS-variable fallbacks. Closes the planned-not-built §10.2 entry in `MASTER_COMPONENT_LIST.md`. **52 unit tests, all green.**
- **ChartPanel (ADR-130)** — new component (`components/chartpanel/`) — a theme-aware Chart.js wrapper supporting `bar`, `line`, `area`, and `sparkline`. Reads `window.Chart` (Chart.js >= 4.4, < 5) following the established **ADR-028 external-globals pattern** used by CodeMirror, marked, hljs, KaTeX, mermaid; the consuming app loads Chart.js itself via a `<script>` tag and the wrapper renders a literate error if it's missing. Re-themes automatically on `data-bs-theme` toggle via a `MutationObserver` on `<html>`. ResizeObserver-debounced resize. `setData` with the same series IDs updates in place with no animation (avoids jank on poll-driven dashboards). `ariaLabel` is required by the TS type; a visually-hidden `<table>` fallback (default on) renders the same data for screen readers. Sparkline kind defaults to no axes / no legend / no value labels. `exportPNG()` provided; `exportSVG` deliberately not (Chart.js renders to canvas). Wrapper alone is ≤ 8 KB gzip — Chart.js itself is the consuming app's deployment concern. **23 unit tests, all green.**
- **Stencils** — `metriccard` and `chartpanel` registered in `stencils-ui-components.ts` Tier C (with custom render functions) so both place and preview correctly in the Layout Studio.
- **Component Studio** — entries added under the "Feedback" category for both new components, including a Chart.js CDN tag for `chartpanel` (loaded before `chartpanel.js`).
- **Demo** — new `metriccard-section` and `chartpanel-section` in `demo/all-components.html` covering all four states, intent overrides, and all four chart kinds.
- **Spec** — `specs/2026-04-27-tenant-admin-cdn-components.md` filed by the apps team for the Tenant Admin reorg; reviewed and resolved by the UI team in the same document (theme tokens, slug names, Chart.js loading model, click semantics, sparkline addition, `exportSVG` dropped).

## 2026-04-26 (amendment)

### Changed
- **ActionItems** — alpha sort moved from the InlineToolbar to the existing sort dropdown (ADR-128 amendment). The dropdown gained two new `SortOption` values: `"alpha-asc"` ("Title A-Z") and `"alpha-desc"` ("Title Z-A"). The InlineToolbar (when `showInlineToolbar: true`) now exposes **only** expand-all and collapse-all — sort buttons would have duplicated the dropdown's surface area and split the sort control. Single-source-of-truth via the existing dropdown is cleaner. Removed the parallel `alphaSortMode` state and its public API: `setAlphaSortMode` / `getAlphaSortMode` methods, `initialAlphaSortMode` / `onAlphaSortModeChange` options, the `applyAlphaOverlay` helper, and the exported `ActionItemsAlphaSortMode` type. RelationshipManager, Timeline, and TreeView are unaffected — they retain the canonical four-action shape because none of them ship a comparable multi-mode sort dropdown. Demo, README, concepts.yaml entry, and ADR-128 updated. Full suite: **3,937 / 3,937 green** (net −2 tests vs. previous batch — dropped 6 alpha-via-toolbar tests, added 4 alpha-via-dropdown tests).

## 2026-04-26

### Added
- **CategorizedDataInlineToolbar UX pattern (ADR-128)** — codified in `agentknowledge/concepts.yaml` and applied across four components. Whenever a component renders multiple grouped cards or a tree to convey categorization, it now exposes an *optional* InlineToolbar (or extends its existing toolbar) offering sort group names asc/desc, expand-all, and collapse-all. **Default is OFF — host opts in.** All actions are hookable via `onSortModeChange` / `onCollapseStateChange` callbacks; state round-trips through `initialSortMode` / `initialCollapsed` options + public setters.
- **RelationshipManager** — new options `showInlineToolbar`, `initialSortMode`, `initialCollapsed`, `onSortModeChange`, `onCollapseStateChange`; new methods `setSortMode(mode)` / `getSortMode()`. Sort applies to relationship-type group keys. 14 new tests.
- **Timeline** — same option surface; sort applies to `TimelineGroup[]` ordering by `label`. New optional header strip above the time axis when `showInlineToolbar: true`. 12 new tests.
- **ActionItems** — new options `showInlineToolbar`, `initialAlphaSortMode`, `initialCollapsed`, `onAlphaSortModeChange`, `onCollapseStateChange`; new methods `setAlphaSortMode` / `getAlphaSortMode` / `expandAll` / `collapseAll`. **Coexists with the existing 5-mode sort dropdown** — alpha-asc/desc is a secondary alpha-by-title sort layered on top of the primary sort and applies to items WITHIN sections (section order remains by status enum). 11 new tests.
- **TreeView** — new option `showDefaultGroupActions` (default false). When true, four default actions (sort siblings asc/desc, expand-all, collapse-all) are *prepended* to the existing `.treeview-toolbar` — TreeView already ships a toolbar, so this adoption extends it rather than mounting a second InlineToolbar. New callbacks `onSortModeChange` / `onCollapseStateChange` round-trip through the existing `setSort` / `expandAll` / `collapseAll` paths. 9 new tests.
- **InlineToolbar README** — new "When to adopt" section pointing at ADR-128 with the four-action minimum and adopter list.

### Fixed
- **TreeView** — `buildToolbarButton` now splits `action.icon` on whitespace so callers can pass a multi-class icon string like `"bi bi-x"` (matches Bootstrap Icons convention). Previously `classList.add` rejected the space-containing token with `InvalidCharacterError`. ADR-128 default actions and any host-supplied multi-class icons are now safe.

### Notes
- DataGrid and ExplorerPicker were considered for adoption but dropped: DataGrid is flat tabular with per-column sort UI (no grouping); ExplorerPicker uses sections as a UI layout device for search results, not data categorization (no public sort API). The CategorizedDataInlineToolbar pattern does not apply.
- Full suite: **3,939 / 3,939 green** (46 new tests across 4 components).

## 2026-04-22

### Fixed
- **GraphCanvas** — hub-node edge labels no longer stack illegibly (P2, ADR-127). Root cause: every edge label rendered at Bézier midpoint `t = 0.5`; the existing per-pair perpendicular offset only separates parallel edges between the same node pair, so different edges sharing a hub piled up when layouts clustered neighbors together. See `specs/2026-04-21-graphcanvas-edge-label-stacking-at-hubs.md`.

### Added
- **GraphCanvas** — `edgeLabelDensity: "all" | "hub-compact" | "none"` on `GraphCanvasOptions` (default **`"hub-compact"`**). Hub-incident edges (either endpoint with visible degree ≥ `hubDegreeThreshold`, default `5`) render a 2–3 char abbreviation on canvas; full label is still surfaced via the edge HoverCard on hover. Non-hub edges keep full labels. All label placement now steps along the Bézier parameter `t` to avoid overlap; falls back to midpoint if no step is free (never hides).
- **GraphCanvas** — short-form rule: multi-word labels use word initials (`"Sourced From"` → `"SF"`), single-word labels use first two chars uppercased (`"Mirrors"` → `"MI"`). Deterministic, testable.
- **GraphCanvas** — new CSS hooks `.gc-edge-label` (all edge labels) and `.gc-edge-label-compact` (hub abbreviations; slight weight + letter-spacing bump).
- **GraphCanvas** — `hubDegreeThreshold` option (default `5`) to tune when an endpoint counts as a hub.
- 12 new tests in `components/graphcanvas/graphcanvas-edge-labels.test.ts` covering density modes, short-form rules, sparse-graph non-regression, threshold override, hover-channel integrity on abbreviated edges, and collision stepping producing distinct positions. Full suite: **3,893 / 3,893 green**.

### Behavior change
- The default `edgeLabelDensity` is `"hub-compact"` — apps that previously relied on full labels at every edge's midpoint will see hub labels abbreviated out of the box. Set `edgeLabelDensity: "all"` on the `createGraphCanvas` call to restore the old behavior. The legacy `showEdgeLabels: false` still works and now forces density to `"none"`.

## 2026-04-21

### Added
- HoverCard adopted in ActionItems and DiagramEngine (ADR-126) — same primitive, same `(window as any).createHoverCard` runtime lookup pattern.
- ActionItems — new options `itemHoverCardMode` (`"builtin"` | `"custom"` | `"off"`, default `"builtin"`) and `renderItemHoverCard(item)`. Default extractor shows *extra* context rather than repeating the visible row: full content as title, assignee (or "Unassigned") as subtitle, status badge, properties {Priority?, Due?, Created, Updated, Comments?}, tag labels in the footer.
- DiagramEngine — new options `objectHoverCardMode` (default `"off"` — canvas editor opt-in), `renderObjectHoverCard(obj)`, `renderConnectorHoverCard(conn)`. When enabled, the card only shows while the active tool is `"select"` and no drag / pan / connect interaction is in progress. Object default extractor: title ← first text run · `semantic.type` · shape; subtitle ← shape; badge ← first `semantic.tags`; properties ← flattened `semantic.data`; description ← `semantic.data.description` if string. Connector extractor adds `{source, target}` and pulls the title from the first connector label.
- Tool interface gained optional `isInteracting(): boolean`; ToolManager forwards it; SelectTool / ConnectorTool / PanTool implement it (used by the DiagramEngine hover-card guard).
- `specs/hovercard-adoption.prd.md` + `specs/hovercard-adoption.plan.md` (ADR-126).
- 21 new tests — 11 in `actionitems-hovercard.test.ts`, 10 in `diagramengine-hovercard.test.ts` (including explicit drag-suppression coverage for the `isInteracting()` path). Full suite: **3,881 / 3,881 green** (up from 3,860).
- `demo/components/actionitems.html` and `demo/components/diagramengine.html` now include `hovercard.css` + `hovercard.js` and a note pointing at the new affordance. DiagramEngine demo sets `objectHoverCardMode: "builtin"`.
- ADR-126 in `agentknowledge/decisions.yaml`; HoverCard concept entry lists ActionItems + DiagramEngine as adopters; `history.jsonl` updated.

### Fixed
- HoverCard anchored to the viewport edge instead of the hovered graph node — `resolveAnchorRect` tested `instanceof HTMLElement`, which silently fell through for SVG `<g>` nodes (SVGElement is a sibling of HTMLElement under Element, not a subclass). Broadened `HoverCardAnchor` to `Element` and switched all three `instanceof HTMLElement` checks to `instanceof Element` (`resolveAnchorRect`, scroll-ancestor wiring, anchor-detach watch). Regression test added.
- HoverCard anchored to the bottom-left of the GraphCanvas container — portal was `this.root` (a `transform`/`filter` ancestor degrades `position: fixed` to "absolute relative to that ancestor"). Let HoverCard default-portal to `document.body`.

### Changed
- Split six over-budget HoverCard functions into ≤30-line helpers (CODING_STYLE.md): `appendHeader` → `buildHeaderIcon` + `buildTitleBlock`; `attachHoverCard` → `openOnAnchor` + `closeOnAnchor` + `detachAnchorListeners`; `tryPlace` → `rawPlacement` + `verticalPlacement` + `horizontalPlacement` + `primaryFits`; `ensureRoot` → `buildRootElement`; `appendProperties` → `renderPropertyRow` + `renderPropertyOverflow`; `buildState` → `resolveOptions`
- Added `⚓ createHoverCard` and `⚓ attachHoverCard` context anchors per MARKERS.md

## 2026-04-20

### Added
- HoverCard component — informational floating card for rich-on-hover detail previews; declarative `HoverCardContent` (title/subtitle/icon/iconColor/badge/properties/description/footer) plus `HTMLElement`/`string` escape hatches; `textContent` only; `role="tooltip"` + `aria-describedby`; `pointer-events: none`; `maxHeight` ceiling with CSS `::after` fade mask; 250ms open / 100ms close default delays; z-index 1005 (ADR-125) (`components/hovercard/`)
- `createHoverCard(options?)` factory and `attachHoverCard(anchor, getContent, { shared })` helper — the `shared` option lets a single DOM node back hundreds of anchors (critical for graphs); touch-primary devices no-op
- HoverCard dismisses on `Escape`, scroll-ancestor scroll, window resize, browser-native `contextmenu` DOM event (covers apps that don't use our ContextMenu), custom `hovercard:yield` CustomEvent (opt-in), and anchor detachment
- Pure `computePosition()` with 4-way placement fallback (auto → bottom/top/right/left) and cross-axis viewport clamping
- GraphCanvas adopts HoverCard — new `tooltipMode` (`"builtin"` | `"custom"` | `"off"`), `renderNodeTooltip`, `renderEdgeTooltip` options; new `GraphNode.description` and `GraphEdge.description` fields (non-breaking); legacy private `.gc-tooltip` DOM and `TOOLTIP_DELAY` removed
- HoverCard demo — standalone page at `demo/components/hovercard.html` (6 hover tiles + GraphCanvas integration + custom-renderer toggle)
- HoverCard section in `demo/all-components.html` and card in `demo/index.html`
- HoverCard tile in Component Studio (`demo/studio/component-studio.html`) with `COMPONENT_HELP` entry under Interactive
- HoverCard stencil in Layout Studio via `stencils-ui-components.ts` (dashed anchor rect + floating card with header, badge, 3 properties, description hint)
- `specs/hovercard.prd.md` — full product spec with all 7 design decisions captured in §7
- `specs/hovercard.plan.md` — 9-phase implementation plan tracking progress
- ADR-125 in `agentknowledge/decisions.yaml`; HoverCard and HoverCardStyles entries in `concepts.yaml`; history entry

### Changed
- GraphCanvas private `tooltipEl`, `tooltipTimer`, `showTooltip`, `hideTooltip`, `updateTooltipPosition`, `buildNodeTooltipContent`, `buildEdgeTooltipContent` replaced by HoverCard-backed `showNodeHoverCard` / `showEdgeHoverCard` / `hideHoverCard` and declarative `buildNodeHoverContent` / `buildEdgeHoverContent`
- GraphCanvas `.gc-tooltip` SCSS block removed; comment left pointing at `components/hovercard/`

## 2026-04-19

### Added
- NavRail component — app-level primary navigation with collapsed icon rail and expanded categorized drawer; brand header, delegating search row, categories with badges and sub-pages (indented or flyout), footer, active-page highlight (`components/navrail/`)
- `--theme-navrail-*` CSS tokens in `src/scss/_dark-mode.scss` for light and dark mode parity
- NavRail demo — standalone page at `demo/components/navrail.html` with six sections (expanded, collapsed, right edge, sub-pages, size variants, dark-mode)
- NavRail section + TOC entry in `demo/all-components.html`
- NavRail entry in Component Studio (`demo/studio/component-studio.html`) under Navigation
- NavRail stencil in Layout Studio (`components/diagramengine/src/stencils-ui-components.ts`) with detailed SVG wireframe
- `specs/navrail.prd.md` — full product spec
- `specs/navrail.md` — per-component progress log (resume-friendly for future sessions)
- ADR-124 in `agentknowledge/decisions.yaml`; concepts and entities entries for NavRail, NavRailStyles, NavRailOptions, NavRailItem, NavRailCategory, NavRailHeader, NavRailSearch, NavRailFooter, NavRailHandle, NavRailManager
- CONVERSATION.md entry for the NavRail session

### Changed
- NavRail `buildItemEl` split into `buildItemButtonShell` + `attachParentChrome` + `attachItemListeners` + `applyInitialActiveState` to respect the ≤30-line function budget (CODING_STYLE.md)
- NavRail `onItemClick` split into `handleParentClick`; `onItemKeyDown` split out `onArrowRight`; `setBadge` split into `clearItemBadge` + `applyItemBadge`
- NavRail `⚓` context anchors added for `NavRail`, `NavRailManager`, `createNavRail` and `@entrypoint` markers on class + factory (MARKERS.md)

## 2026-04-17

### Added
- LayoutPicker semantic anchors — `⚓ COMPONENT`, `⚓ AlgorithmRegistry`, `⚓ ThumbnailBuilder`, `⚓ createLayoutPicker` markers for navigation
- LayoutPicker knowledge-base coverage — 6 entity entries (`LayoutAlgorithm`, `LayoutCategory`, `LayoutPickerOptions`, `CustomAlgorithmDefinition`, `LayoutPickerAPI`, `createLayoutPicker`) in `agentknowledge/entities.yaml`

### Changed
- LayoutPicker `positionPanel()` split into `positionPanel` + `clampHorizontal` + `applyVerticalPlacement` to respect the ≤30-line function budget (CODING_STYLE.md)
- LayoutPicker `onDocumentKey()` switch replaced with a `KEY_HANDLERS` dispatch table — same behaviour, shorter, single-responsibility per key

### Removed
- LayoutPicker unused `SPECIAL_THUMB_IDS` constant (was flagged by `noUnusedLocals`)

## 2026-04-16

### Added
- GraphCanvas multi-edge routing — parallel edges between the same node pair fan out via perpendicular Bezier offsets with staggered labels (ADR-122)
- GraphCanvas icon name resolution — `resolveIconChar()` maps CSS class names, Feather icon names (26-entry mapping), and `bi-` prefixed names to Unicode glyphs via CSS `::before` content lookup with caching (ADR-123)
- GraphCanvas demo sections for multi-edge routing and icon name resolution

### Fixed
- GraphCanvas `buildNodeIcon()` rendered literal icon name strings instead of Bootstrap Icons glyphs (ADR-123)
- GraphCanvas overlapping edge paths and unreadable labels when multiple edges connected the same node pair (ADR-122)

## 2026-04-14

### Fixed
- DockLayout `mountComponent()` silently dropped plain `HTMLElement` args — toolbar/sidebar/statusbar stayed on `document.body`, pushing the 100vh grid past the viewport; added `instanceof HTMLElement` fallback branch (ADR-118)
- Ribbon `show()` and `createRibbon()` only accepted string container IDs unlike every other component — updated to accept `string | HTMLElement` via `resolveContainer()` helper (ADR-118)
- RelationshipManager SCSS used hardcoded `$gray-500`/`$gray-600`/`#6f42c1` for text colours that didn't adapt to `data-bs-theme="dark"` — replaced 8 values with `var(--theme-text-muted)`, `var(--theme-text-secondary)`, and component-scoped `--rm-confidence-*` tokens (ADR-119)
- 17 components with mouse-only events broken on touch devices — migrated to Pointer Events with `setPointerCapture` for reliable drag/resize on touch (TreeGrid, GraphMinimap, HelpDrawer, PropertyInspector, MarkdownEditor, ActionItems, VisualTableEditor, TimePicker, DatePicker, ContextMenu, Ruler, ColorPicker, GradientPicker, AnglePicker, FacetSearch, HelpTooltip) (ADR-120)
- Touch targets below 44px WCAG 2.5.8 minimum — added `@media (pointer: coarse)` rules to 15 SCSS files enlarging buttons to 44px and resize handles to 16px (ADR-120)
- Hover-hidden UI elements invisible on touch devices — tab close buttons (TabbedPanel), help tooltips (HelpTooltip, DatePicker) now visible via `@media (hover: none)` (ADR-120)
- ColorPicker and DatePicker popups overflowing 320px viewports — added `@media (max-width: 320px)` responsive breakpoints (ADR-120)

### Added
- DockLayout plain `HTMLElement` support in all slot setters (`setToolbar`, `setLeftSidebar`, `setRightSidebar`, `setBottomPanel`, `setStatusBar`)
- Ribbon `resolveContainer()` private helper for consistent `string | HTMLElement` resolution
- RelationshipManager dark mode confidence badge tokens (`--rm-confidence-color`, `--rm-confidence-bg`) with `[data-bs-theme="dark"]` override
- `_touch.scss` mixin library — `touch-target`, `hover-visible`, `touch-drag`, `touch-resize-handle` mixins + global tap-highlight removal for all interactive elements (ADR-120)
- ContextMenu `attachLongPress()` utility function — 500ms long-press to open context menu on touch devices with 10px move cancellation threshold (ADR-120)
- HelpTooltip tap-to-toggle pattern — first tap shows tooltip, second tap opens help drawer on touch devices (ADR-120)

## 2026-04-13

### Fixed
- DockLayout did not observe toolbar cell height changes — when Ribbon collapsed/expanded, `grid-template-rows` stayed stale, causing status bar and bottom panels to disappear; added `ResizeObserver` on `.dock-layout-toolbar` cell (ADR-116)
- Ribbon used hardcoded inline color overrides that prevented automatic dark mode adaptation via `data-bs-theme`; added `resetColors()` method to clear all inline overrides and revert to CSS custom property defaults (ADR-117)

### Added
- Ribbon `resetColors()` method — clears all inline `--ribbon-*` CSS custom property overrides, letting the SCSS-defined `var(--theme-*)` defaults drive dark mode adaptation automatically

## 2026-04-12

### Fixed
- Sidebar rendered Close (x) and Float/Undock buttons unconditionally even when configuration disabled them — Float button now conditionally rendered only when `draggable: true`; Close button now conditionally rendered only when `closable: true` (ADR-115)

### Added
- Sidebar `closable` option (`SidebarOptions.closable?: boolean`, default `true`) to control whether the Close button appears in the header
- Migration guide for apps team: `specs/2026-04-12-sidebar-button-migration-guide.md` — step-by-step checklist for removing CSS workarounds in Explorer, Diagrams, Thinker, Checklists, and Strukture

## 2026-04-08

### Fixed
- FormDialog dual-footer when `customContent` manages its own buttons — new `showFooter: false` option hides the built-in Submit/Cancel footer; also disables Enter-to-submit keyboard shortcut when footer is hidden (ADR-114)
- RelationshipManager "+Add" button always visible when `readOnly: false` even without `onCreateRelationship` callback — button now inferred from callback presence, overridable via new `showAddButton` option; five apps (Strukture, Diagrams, Thinker, Checklists, Explorer) can use display+delete+navigate mode without a non-functional add button

### Changed
- Renamed `explorer-picker` component to `explorerpicker` for naming consistency — all 112 components now use concatenated lowercase directory/file names with no hyphens

## 2026-04-07

### Fixed
- Component Studio and Layout Studio losing JSON property edits on selection change — `propOpts`/`propCompOpts` textarea used `change` event (fires on blur) but selection handler ran first, overwriting textarea before the event could fire; added `flushPendingOptions()`/`flushPendingComponentOptions()` to capture and apply dirty edits before selection changes

### Added
- HTML primitives category in Component Studio and Layout Studio — 12 building-block elements (Heading, Text, Bold, Small, Icon, Panel, Divider, Link, Badge, Image, List, Blockquote) with HTML render functions, COMPONENT_HELP entries, SVG wireframe stencils, and palette integration; generalized `addBootstrapShapes()` → `addShapePaletteEntries()` for extensible shape categories

## 2026-04-06

### Fixed
- DataGrid column resize handles triggering column move instead of resize — `pointerdown` on resize handle called `stopPropagation()` but not `preventDefault()`, so HTML5 drag-and-drop on the parent `draggable="true"` cell still fired; added `preventDefault()` and a `dragstart` guard
- SymbolPicker dialog not dismissing when Insert button clicked in RibbonBuilder — `handleSymbolInsert()` called `deactivateIconPicker()` (disable-only) instead of `hideIconPicker()` (disable + hide overlay); also added `closePopup()` in SymbolPicker's `insertSymbol()` for non-inline consumers
- SymbolPicker stale search state on reopen — filter query and search input were not cleared when popup reopened or picker was re-enabled; added `resetFilterState()` helper called from `openPopup()` and `enable()`, refactored `switchMode()` to reuse it

### Added
- FileExplorer flat content panel mode — host-driven `setItems()`/`setBreadcrumb()` API for flat item arrays without tree sidebar; custom `FileExplorerColumn` definitions for detail view; `groupBy` option (`type-first`, `none`, or custom function); `showLoading()`/`showEmpty()` states; selection API (`selectItem`, `selectItems`, `deselectAll`, `getSelectedIds`); drag-and-drop with `onDragStart`/`onDrop`/`onExternalDrop` callbacks; dynamic context menu via function; `readOnly`/`isSystem` guards on rename/delete; `iconColor`, `typeLabel`, `owner` node fields; 15 CSS custom properties (`--file-explorer-*`) for host theming; Apps Team integration guide (`docs/fileexplorer-flat-mode-guide.md`); 38 tests
- DataGrid `sizeHint` column option (`xs`/`s`/`m`/`l`/`xl`) for semantic initial column sizing — resolves to `width` and `minWidth` (60/100/160/240/360px)

## 2026-04-05

### Added
- ExplorerPicker component (#110) — resource-selection widget with tree browsing, search, quick-access sections (recent/starred), ontology-driven icon resolution, virtual scrolling, keyboard navigation, state export/restore, chrome integration (82 tests)

### Fixed
- Chrome effects invisible in CDN-consuming apps — added CSS `var()` fallback values to all 99 chrome token references across 44 SCSS files; chrome now self-contained in each component CSS without requiring `custom.css`
- Edge shadow imperceptible at 7% opacity (17px contrast delta) — increased to 12% (29px delta, matching `--theme-shadow-sm`)
- Raw HTML inputs (`<input>`, `<textarea>`, `<select>`) without Bootstrap `.form-control` class now get hover glow via native element selectors
- Edge shadows invisible on Sidebar, TabbedPanel, Ruler in DockLayout — parent grid cells (`overflow: hidden`) clipped children's box-shadows; removed overflow from toolbar/left/right/bottom grid cells (components manage their own overflow). Also elevated contained-mode docked panels to `z-index: 1` and added `z-index: 1` to Ruler
- ExplorerPicker tree disabled in resource mode — container nodes were dimmed with pointer-events:none, blocking expand toggles; separated dimming from selectability
- ExplorerPicker missing from main demo index and full-demo pages

## 2026-03-29

### Added
- ContextMenu component (#104) — theme-aware right-click menu with icons, shortcuts, sub-menus, keyboard navigation, accessibility (43 tests)
- InlineToolbar component (#105) — compact toolbar that renders inside containers with icon buttons and toggles, 3 sizes (33 tests)
- StackLayout component (#106) — vertically/horizontally stacked collapsible panels with drag dividers, collapsed vertical strips (47 tests)
- GraphLegend component (#96) — collapsible legend panel for graph node/edge types (67 tests)
- GraphMinimap component (#97) — SVG minimap with viewport rectangle and click-to-pan (36 tests)
- 6 rich visual picker components (#98-#103): OrientationPicker, SizesPicker, MarginsPicker, ToolColorPicker, ColumnsPicker, SpacingPicker
- 15 Bootstrap 5 base component stencils for Layout Studio (Card, Button, Accordion, Modal, Nav, Alert, Badge, ListGroup, Table, Form, Pagination, Dropdown, Progress, Spinner, Toggle)
- Component Studio — live component playground with 117 components, device frames, trigger buttons, CodeEditor modal, multi-select, README help tab
- Layout Studio — Balsamiq-quality wireframe stencils for all 93+ components, clean/sketch render mode toggle
- Shape Studio — custom vector shapes with 14 tools, shape library
- Ribbon Studio — visual ribbon toolbar designer with file management and inline help
- Studio Apps section in README with localStorage warning
- CronPicker dropdown mode (`mode: "dropdown"`) — compact trigger button + popup panel
- SymbolPicker categories as dropdown with "All" option and cross-category search
- RibbonBuilder SymbolPicker rendered as modal dialog
- Help panels in all 4 studios (F1 toggle, context-sensitive documentation)
- 398 new tests in coverage pass (Ribbon 20→238, CronPicker 25→72, SymbolPicker 30→64, 6 pickers enhanced)

### Fixed
- Ribbon row-break now flushes stack for proper 2-column layout
- Ribbon custom control size property respected (ribbon-size-small/mini classes)
- Ribbon gallery control API convenience aliases (galleryItems, galleryColumns, onGallerySelect)
- Ribbon groups with empty labels collapse label area
- Ribbon custom control uses width (not minWidth) for consistent sizing
- All 5 dropdown pickers use position:fixed and append to document.body for ribbon overflow escape
- Dropdown panels use display:block (not empty string) for body-appended panels
- Picker triggers 22px height for ribbon mini mode
- wrap-iife.sh strips ALL export keywords (was missing export const/type/enum)
- DiagramEngine embed factory name lookup from registry (was generating wrong case)
- DiagramEngine embed container div gets unique ID for getElementById
- DiagramEngine setRenderStyle() for global clean/sketch mode switching
- Device frame shape names corrected (mobile-iphone, tablet-ipad, desktop-macos, dialog-modal)
- Studio app links work on CDN (copy-docs.sh rewrites studio/ paths)
- Component Studio CDN help path (README.md not index.html)
- DataGrid embed row format (id + data object, not flat)

### Changed
- Component count: 95 → 106
- Test count: 2476 → 3355
- Demo index updated to 106 components with Studio Apps section

## 2026-03-18

### Added
- MarkdownRenderer component — shared markdown rendering using marked with auto-detected extensions (highlight.js, KaTeX, Mermaid, Graphviz via @viz-js/viz WASM, PlantUML). HTML sanitised. Replaces Vditor for preview rendering in HelpDrawer and DocViewer. ADR-085
- ThemeToggle demo page with 5 sections: default/auto, dark, light, programmatic API, onChange callback

### Fixed
- First-open popup offset bug across 6 picker components (TimePicker, DatePicker, LineShapePicker, DurationPicker, TimezonePicker, MultiselectCombo) — set position:fixed before measuring in positionDropdown()
- DatePicker calendar max-width:340px to prevent stretching to full parent width
- SymbolPicker category bar scroll arrows — left/right buttons appear only when overflow exists

## 2026-03-17

### Added
- Extracted all 100 component demos into individual pages

### Fixed
- Demo extraction — isolated init scripts per component, eliminated cross-contamination
- Restored full 94-component demo page, kept card index as secondary nav
- Demo cards — disabled non-demo cards with 'coming soon' label, prevented 404s
- Demo shell — removed font-family:inherit that overrode Bootstrap's Inter font
- Demo cards — made non-demo cards clickable (was pointer-events: none)
- SymbolPicker — added max-height and overflow-y to panel for scrolling

### Changed
- Demo page refactored into multi-page structure

## 2026-03-16

### Added
- ActionItems component Phases 1-4 — core rendering, rich features, drag-drop, nesting, multi-select, filtering, sorting, clipboard (2,880 lines)
- ActionItems demo page, README, and knowledge base updates
- ActionItems PRD spec (720 lines, 13 sections)
- DiagramEngine Phase 1 rebuild — modular architecture, production quality
- DiagramEngine Phase 2 — extended shapes, draw/text tools, groups, clipboard, alignment
- DiagramEngine Phase 3 — connectors, routing, arrow markers, ConnectorTool
- DiagramEngine Phase 4 — pen/brush/measure tools, alignment and spacing guides
- DiagramEngine Phase 5 — flowchart, UML, BPMN, ER, network stencil packs
- DiagramEngine Phase 6 — templates, layouts, export, find/replace, graph analysis, comments
- DiagramEngine Phase 7 — comprehensive demo page
- DiagramEngine Phase 9 — Playwright test infrastructure + 45 test cases
- DiagramEngine page frames module — 35 predefined sizes across 7 categories, SVG rendering
- DiagramEngine connectors module — arrow markers, edge-to-edge routing, 4 path algorithms, labels
- Page Frames section added to DiagramEngine spec

### Fixed
- DiagramEngine tests — fixed SVG element selectors, all 67 tests pass
- DiagramEngine — 9 connection ports, edge-aware routing, pen tool UX
- ActionItems demo — passed container as first arg to createActionItems()

### Changed
- DiagramEngine Phase 8 — eliminated all as-any casts, proper class methods
- Deleted redundant engine-phase2.ts, updated knowledge base, standards check
- Updated knowledge base for DiagramEngine rebuild (concepts, decisions, history)

## 2026-03-15

### Added
- DiagramEngine component — universal vector canvas engine (~6600 lines TS), SVG-based rendering with 6 stencil packs, 8 interactive tools, alignment guides, undo/redo, layers, templates, graph analysis, comments, export. ADR-082
- DiagramEngine PRD spec (3,685 lines, 21 sections)
- DiagramEngine Phases 1-11 — document model, SVG renderer, tools, shapes, groups, clipboard, connectors, alignment guides, template engine, layout engine, rotation, inline text editing, pen/measure/brush tools, flowchart and UML stencil packs, demo page, BPMN/ER/network packs, control points, graph analysis, comments

### Fixed
- DiagramEngine — 17 bug fixes from quality audit
- DiagramEngine — fixed 8 demo bugs, added path shape, fixed hit testing

### Changed
- DiagramEngine — added JSDoc to 60+ public methods, updated knowledge base
- Deleted DiagramEngine prototype, prepared for production rebuild

## 2026-03-14

### Added
- FontDropdown Google Fonts integration — 48 curated Google Fonts + 15 system fonts (63 total) across 4 categories, lazy two-stage loading, category grouping. ADR-081
- DARKMODE.md with comprehensive dark mode component guidelines

### Fixed
- Dark mode round 4 — fixed 12 remaining component issues (GuidedTour, UserMenu, ProgressModal, AuditLogViewer, DocViewer, PropertyInspector)
- Dark mode round 5 — comprehensive fixes for GraphCanvasMx, DataTable, TreeView/TreeGrid, TabbedPanel, SpineMap, Sidebar, HelpDrawer, CommentOverlay, MarkdownEditor, DocViewer
- Bootstrap component specificity — moved card/list-group/dropdown/nav-tabs/accordion/modal/pagination dark overrides into class-scoped selectors. ADR-074
- npm audit — added undici >=7.24.1 override to fix 3 high-severity vulnerabilities. ADR-079
- Lighthouse performance — CSS/JS minification (cssnano, terser), font-display:swap, preconnect hints, defer scripts
- Lighthouse accessibility — fixed 17 components (DatePicker, AuditLogViewer, Ruler, HelpDrawer, SpineMap, TreeGrid, TabbedPanel, Tagger, PermissionMatrix, NotificationCenter, ColorPicker, EditableComboBox, TimePicker, ActivityFeed, DocViewer)

## 2026-03-13

### Added
- AnglePicker component — circular dial input with inline/dropdown modes, pointer drag, keyboard nav, tick marks, shadow preview, cardinal labels
- Mini size to AnglePicker and integrated with RibbonBuilder

### Fixed
- Centered AnglePicker input by removing conflicting inline position styles

### Changed
- Reworked LineShapePicker: 5 to 6 maxGraph-aligned shapes (straight, orthogonal, segment, manhattan, elbow, entity), rewrote SVG paths
- Reworked LineEndingPicker: 9 to 12 standard + 6 ER notation endings, showERNotation option, rewritten SVG markers
- Updated demo page for new line picker values

## 2026-03-12

### Fixed
- Dark mode bug fixes — migrated 20+ remaining component files to var(--theme-*) tokens. Canvas/SVG components use resolveThemeColor(). LogConsole refactored to design token resolution. ADR-073
- Dark mode comprehensive round 3 — ErrorDialog, EditableComboBox, 10 picker components, GraphCanvas/GraphCanvasMx, HelpDrawer, DocViewer, MarkdownEditor, Conversation MCP UI, DataGrid, global Bootstrap utility overrides. ADR-075

## 2026-03-11

### Added
- Dark mode Phase 2 — created _dark-mode.scss with 30+ semantic --theme-* CSS custom properties on :root and [data-bs-theme=dark] overrides. ADR-070
- ThemeToggle component — compact 3-state switcher (Light/Auto/Dark) with OS prefers-color-scheme auto-detection. ADR-072

### Changed
- Dark mode Phase 1 — light-first normalization: normalized 10 dark-bg elements, replaced white literals, parameterized intentional dark overlays. ADR-069
- Dark mode Phase 3 — migrated 60 component SCSS files from hardcoded colors to var(--theme-*) semantic tokens. ADR-071

## 2026-03-10

### Added
- Demo page TOC sidebar — searchable alphabetical Table of Contents with 95 implemented + 83 planned items, search/filter, scroll-spy. ADR-066, ADR-067
- Ribbon deferred state — pendingState queue so control state APIs work on lazily-rendered tabs, getControlState() API. ADR-065

### Fixed
- LineTypePicker — changed to return semantic names instead of SVG dash-array strings. ADR-068

## 2026-03-09

### Added
- RibbonBuilder SymbolPicker integration — persistent full-width icon picker, enabled/disabled via API, fallback to curated 62-icon picker. ADR-064

## 2026-03-08

### Added
- Mini size variant added to all 14 Ribbon-compatible components (22px height, $control-height-xs). ADR-059
- Ribbon custom control width property and size-based label positioning. ADR-062
- Slider component — range input with single/dual-thumb, pointer capture, keyboard nav, tick marks, vertical orientation (~600 lines TS). ADR-058
- SymbolPicker CSS auto-discovery — scans stylesheets for .bi-*/.fa-* selectors, discovers ~2000 Bootstrap Icons + Font Awesome support
- RibbonBuilder expanded from 6 to 14 component picker types

### Fixed
- Font-family: inherit enforced on all component roots for consistent Inter font theming. ADR-060
- Ribbon buildCustomControl() now renders label property. ADR-061
- Ribbon stack layout replaced with CSS grid + subgrid for cross-row alignment. ADR-063

## 2026-03-07

### Added
- RibbonBuilder component — visual WYSIWYG editor for Ribbon layouts via drag-and-drop, structure tree, property inspector, icon picker, exports Markdown/JSON (~2900 lines TS)
- LineWidthPicker component — visual dropdown for stroke width selection with CSS border previews (~610 lines TS). ADR-057
- LineTypePicker component — visual dropdown for dash pattern selection with inline SVG previews (~665 lines TS). ADR-057
- Ribbon statusBar slot — accepts HTMLElement or factory, right-aligned in tab bar

### Changed
- Visual consistency polish — switched Open Sans to Inter, added font weight/size tokens, standardized dialog padding, shadow elevation hierarchy, unified close button/menu item sizing. ADR-055, ADR-056

## 2026-03-06

### Added
- Ribbon statusBar slot — optional right-aligned HTMLElement or factory in tab bar with setStatusBar()/getStatusBarElement() methods

## 2026-03-05

### Added
- HelpDrawer, HelpTooltip, DocViewer, GuidedTour — 4 documentation and onboarding components. ADR-053, ADR-054

### Fixed
- GraphCanvasMx feature parity — mouse wheel zoom, left-button panning, tooltips, onNodeHover/onEdgeHover, zoom-to-fit, real group-by-namespace with swimlane vertices

## 2026-03-04

### Added
- TypeBadge component — inline chip/badge with icon, color, label, 3 sizes, 3 variants (~250 lines TS). ADR-049
- GraphCanvas component — interactive SVG graph with 5 layout algorithms, schema/instance modes, zoom/pan/selection/edge creation (~1800 lines TS). ADR-050
- RelationshipManager component — typed relationship CRUD panel with grouped list, AI suggestions (~900 lines TS). ADR-051
- GraphCanvasMx component — maxGraph-powered graph visualization with identical API to GraphCanvas (~400 lines TS). ADR-052

## 2026-03-03

### Fixed
- SpineMap code standards compliance — refactored 15 long functions into 30-line-max helpers, fixed Allman brace violations, fixed border-radius for pill shape

## 2026-03-01

### Added
- PeriodPicker component — coarse time-period selector with month/quarter/half/year granularities, grid layout, year navigation (~600 lines TS). ADR-046
- SprintPicker component — agile sprint selector with list and calendar views, 4 naming modes, 8-color cycling bands (~900 lines TS). ADR-047
- SpineMap configurable popover fields — field adapter pattern supporting 30+ field types with runtime fallback. ADR-048

## 2026-02-28

### Added
- SpineMap component — interactive SVG capability/feature map with 4 layout algorithms, cross-branch connections, 3 editing modes, export (~1700 lines TS). ADR-041
- Breadcrumb Navigation component — interactive path display with overflow truncation, per-item icons, terminal dropdown (~500 lines TS). ADR-042
- NotificationCenter component — bell trigger, slide-out panel, category filters, date grouping, dismiss, keyboard nav (~530 lines TS). ADR-043
- Stepper (Wizard) component — multi-stage progression with horizontal/vertical, async validation, completion bar (~430 lines TS). ADR-044
- PropertyInspector (Drawer) component — slide-out drawer with drag-to-resize, tabbed sections, optional backdrop (~490 lines TS). ADR-045
- ShareDialog onRemoveConfirm callback — optional async confirmation gate before removing access

### Fixed
- SpineMap bugs — popover clipping, sidebar resize, sidebar sync, add-child from sidebar, refactored long methods
- PeoplePicker dropdown not opening — added ensureDropdownVisible(), fixed FormDialog CSS containing-block trap
- PeoplePicker dropdown moved to document.body — fixes first-render mispositioning and CSS containing-block traps
- PeoplePicker dropdown z-index raised to 2050 for portal pattern in FormDialog/ShareDialog overlays
- Code standards cleanup — refactored long methods in PropertyInspector and Stepper

## 2026-02-27

### Added
- PersonChip component — compact inline person-identity chip with avatar, name, status dot, email/role detail, 3 sizes (~300 lines TS)
- PeoplePicker component — searchable person selector with PersonChip integration, async search, single/multi-select (~800 lines TS). ADR-037
- PresenceIndicator component — overlapping avatar stack with collapsed/expanded views, PersonChip bridge (~480 lines TS)
- ShareDialog component — modal share dialog composing PeoplePicker and PersonChip with access levels, diff computation, promise-based API. ADR-039

### Fixed
- Dropdown overflow fix — migrated 8 components from position:absolute to position:fixed to prevent clipping inside overflow:hidden containers. ADR-040

## 2026-02-26

### Added
- Pill component — reusable inline pill element for mentions, issues, tags with 6 color presets, 3 sizes, dismissible (~300 lines TS). ADR-034
- MarkdownEditor naked mode — chrome-free editable Vditor surface with CSS resize, form-control border
- RichTextInput component — lightweight contenteditable rich text with inline formatting, lists, paste sanitization, floating toolbar, STIE composition (~900 lines TS). ADR-035

## 2026-02-25

### Added
- SmartTextInput (STIE) component — behavioral middleware with trigger registry, state machine detector, token model, popover coordination (~2200 lines TS)
- MarkdownEditor display mode — chrome-free read-only rendering with no header/toolbar/tabs
- ColorPicker enhancements — onInput real-time callback, label option, getPopupElement(), enhanced disabled state
- MarkdownEditor display-mode enhancements — isolated, compact, theme dark, onReady callback
- Ribbon FontDropdown integration — custom control in Ribbon Font group demonstrating third-party picker hosting

### Fixed
- FontDropdown fixed positioning — position:fixed instead of position:absolute to escape overflow:hidden containers

## 2026-02-24

### Added
- Ribbon component — Microsoft Office-style tabbed toolbar with adaptive groups, QAT, menu bar, backstage, KeyTips, 13 control types
- FontDropdown component — dropdown picker rendering each font name in its own typeface, 17 web-safe defaults, search filtering, recently-used
- SymbolPicker component — grid-based picker for Unicode characters (~500) and Bootstrap Icons (~200), category tabs, search, preview panel

## 2026-02-23

### Added
- FormDialog component — modal dialog for form workflows with single-page and wizard modes, 12 field types, collapsible sections, resizable, validation, focus trapping (~1500 lines TS)

## 2026-02-21

### Added
- 8 layout container components — BoxLayout, FlowLayout, GridLayout, BorderLayout, FlexGridLayout, CardLayout, LayerLayout, AnchorLayout
- 5 new components — StatusBadge, ConfirmDialog, SearchBox, UserMenu, FileUpload
- AppLauncher component — grid-based launcher with dropdown/modal/fullpage views, favourites, recent apps, search (~950 lines TS)
- Toolbar checkbox, toggle switch, number spinner, and color picker input types
- Keyboard bindings audit — added overridable keyBindings to all 31 interactive components

### Fixed
- TabbedPanel and Sidebar not respecting collapsed:true at init
- DataGrid pagination footer rendering unstyled — moved flexbox to nav element, added three-zone layout

## 2026-02-20

### Added
- MaskedEntry component — masked input for sensitive data with show/hide toggle, clipboard copy (~500 lines TS)
- Toast notification system — transient notifications with stacking, auto-dismiss, severity variants, action buttons (~550 lines TS)
- SkeletonLoader component — animated placeholder with CSS shimmer, 6 presets (~300 lines TS)
- EmptyState component — centered placeholder for empty views with CTA (~350 lines TS)
- ColorPicker component — canvas-based colour selection with hue/opacity, hex/RGB/HSL, swatches (~900 lines TS)
- SplitLayout component — draggable resizable split pane container with nested layouts, persistence (~800 lines TS)
- MultiselectCombo component — multi-select combo box with chips, checkboxes, filtering, grouping (~900 lines TS)
- DataGrid component — high-performance flat data table with sorting, filtering, pagination, virtual scrolling (~2400 lines TS)
- CodeEditor component — Bootstrap 5-themed CodeMirror 6 wrapper with toolbar, themes, fallback (~1100 lines TS)
- Tagger component — combined freeform and taxonomy tag input with colored chips, autocomplete (~750 lines TS)
- FacetSearch component — facet-aware search bar with structured key:value parsing, facet chips (~750 lines TS)
- FileExplorer component — two-pane file navigation with folder tree, breadcrumbs, 3 view modes (~1100 lines TS)
- CommentOverlay component — transparent annotation overlay with pins, threaded comments, @mentions (~1500 lines TS)
- ReasoningAccordion component — collapsible accordion for AI chain-of-thought with status states, shimmer, timing (~650 lines TS)
- CommandPalette component — singleton Ctrl+K/Cmd+K omnibar with fuzzy search, categories, recents (~600 lines TS)
- PromptTemplateManager component — two-pane CRUD interface for prompt templates with variable extraction, preview, import/export
- WorkspaceSwitcher component — multi-tenant workspace switcher with trigger button, searchable dropdown/modal
- ActivityFeed component — social-style activity feed with date grouping, infinite scroll, 7 event types
- AuditLogViewer component — read-only filterable audit log with severity badges, expandable detail rows, CSV/JSON export
- PermissionMatrix component — RBAC permission matrix with tri-state checkboxes, inheritance resolution, change tracking
- GraphToolbar extension — factory function wrapping Toolbar for graph editing (undo/redo/delete, layout, zoom, export)
- 21 component PRD specs across 5 tiers + GraphToolbar extension. ADR-028 through ADR-032

### Changed
- KEYBOARD.md created — comprehensive keyboard shortcut registry for all components

## 2026-02-19

### Changed
- Sidebar maxWidth changed from fixed 600px to viewport-relative cap (50% of window width)
- TabbedPanel title resolution via resolveTitle() helper — returns explicit title, active tab title, or default

## 2026-02-18

### Fixed
- 6 toolbar demo bugs — portaled gallery popups and split menus to escape overflow:hidden, bumped popup z-index to 1060, fixed orientation toggle with closeAllPopups()/rebuildRegionsDOM()

## 2026-02-17

### Added
- LogConsole component — in-app logging console with 5 log levels, dark/light themes, rAF-batched rendering, FIFO eviction
- Toolbar enhancements — title width, left/right alignment, rightContent slot, 3 new item types (Input, Dropdown, Label). ADR-026

### Fixed
- DockLayout mountComponent — hide() before show(cell) for already-visible components
- Toolbar overflow algorithm — replaced tool-width-only measurement with full child-size summation, added dual per-group overflow buttons

## 2026-02-16

### Added
- DockLayout component — CSS Grid layout coordinator with 6 named areas, auto-contained child mounting. ADR-024, ADR-025
- Contained mode added to Sidebar, Toolbar, StatusBar, TabbedPanel, BannerBar, and MarkdownEditor

### Fixed
- TreeGrid critical bugs — deepCopyOptions, column resize, column picker, cell editor sizing, sort preserving widths, type-aware sort, per-column comparator, externalSort, updateColumn() API. ADR-022, ADR-023

## 2026-02-15

### Added
- TabbedPanel component — dockable, collapsible tabbed panel with dynamic tabs, drag-to-dock, pointer-capture resize. ADR-018
- TreeView component — highly configurable tree view with lazy loading, multi-select, DnD, context menu, inline rename, search, starred, sort, WAI-ARIA. ADR-019
- TreeView performance optimization — O(1) node index maps, virtual scrolling with element recycling, incremental DOM updates, three-tier search. ADR-020

## 2026-02-13

### Added
- Timeline component — horizontal event timeline with point/span events, row packing, grouping, IntersectionObserver, adaptive ticks. ADR-016
- Timeline refinements — configurable IANA timezone, configurable tick intervals, drag-to-pan
- Conversation MCP Apps specification — sandboxed iframe rendering with JSON-RPC bridge, canvas side panel, 4 demo scenarios. ADR-017

## 2026-02-12

### Added
- StatusBar component — fixed-bottom viewport status bar with configurable regions, pipe dividers, O(1) updates
- Sidebar component — dockable, floatable, resizable panel with tab grouping, collapse-to-icon-strip, SidebarManager singleton
- BannerBar component — fixed-to-top viewport banner with severity presets, auto-dismiss, CSS custom property
- Toolbar component — programmable action bar with regions, split buttons, docked/floating modes, KeyTips, Priority+ overflow. ADR-013
- Gauge component — visual measure with tile/ring/bar shapes, value/time modes, colour thresholds, ARIA. ADR-014
- Conversation component — turn-by-turn AI chat UI with Vditor rendering, streaming, session management, feedback. ADR-015
- TreeGrid component — tree-table hybrid with inline editing, column resize/reorder/sort, 2D keyboard nav, virtual scrolling. ADR-021

## 2026-02-11

### Added
- TimezonePicker component — searchable IANA timezone dropdown with live time preview
- CronPicker component — visual 6-field CRON expression builder with presets and description generator
- MarkdownEditor component — Vditor-based Bootstrap 5 Markdown editor with tab/side-by-side modes, GFM/Mermaid/Graphviz/PlantUML support

## 2026-02-10

### Added
- EditableComboBox component — combined text input and dropdown with filtering, keyboard navigation, WAI-ARIA combobox pattern, grouping, size variants

## 2026-02-09

### Added
- ErrorDialog component — vanilla TypeScript modal for literate errors with suggestion box, technical accordion, clipboard copy, retry
- Documentation system — auto-generation script, DESIGN_TOKENS, COMPONENT_REFERENCE, AGENT_QUICK_REF, Getting Started, Font Guide, Custom Classes

### Changed
- Rewrote 10 instruction files to align with Bootstrap theme scope; removed C#/.NET, Python, React, database content
- Added semantic markers to all source files, created knowledge base
- Changed body font from Rubik/Atkinson Hyperlegible to Open Sans, monospace to JetBrains Mono

## 2025-01-15

### Changed
- Changed primary font to Atkinson Hyperlegible from Google Fonts for accessibility
- Reduced base font to 14px, base spacer to 0.75rem, removed all border radius

## 2025-01-01

### Added
- Created Bootstrap 5 theme with compact spacing, enterprise colour palette, and zero border radius
