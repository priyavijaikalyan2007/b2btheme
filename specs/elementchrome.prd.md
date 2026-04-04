<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT
-->

<!-- AGENT: Specification for Element Chrome — subtle shadows, glows, and transitions across interactive components. -->

# Element Chrome — Subtle Visual Polish

| Field         | Value                                              |
|---------------|----------------------------------------------------|
| Status        | Draft                                              |
| Scope         | Cross-cutting (SCSS mixins + per-component updates)|
| Folder        | `src/scss/_chrome.scss` (new mixin library)        |
| Spec author   | PVK + Claude                                       |
| Date          | 2026-04-02                                         |

---

## 1. Overview

### 1.1 What Is It

A set of SCSS mixins and CSS custom properties that add subtle visual chrome to
interactive UI components: **directional edge shadows** on docked panels,
**hover glows** on clickable surfaces, and **smooth transitions** on state
changes. Always-on — no toggle required.

### 1.2 What It Is NOT

- **Not a redesign.** The flat, zero-border-radius, muted enterprise aesthetic
  remains. This adds a thin layer of depth cues on top.
- **Not for data elements.** Tables, grids, list rows, chart bars, and other
  dense data presentation elements are excluded. Chrome is for interactive
  chrome (toolbars, panels, buttons, tabs) only.
- **Not heavy.** Shadows stay in the `xs`–`sm` range. No outer glows larger
  than 12 px blur. No `drop-shadow` filter chains or layered multi-shadow
  stacks.

### 1.3 Why Build It

| Problem                                                     | How Chrome Solves It                                    |
|-------------------------------------------------------------|---------------------------------------------------------|
| Docked panels visually merge with their content area        | Directional edge shadow separates panel from content    |
| Cards and buttons feel "flat" on hover — low affordance     | Subtle glow on hover signals interactivity              |
| State changes (hover, focus, active) are instant/jarring    | Smooth 150 ms transitions ease state changes            |
| No visual depth hierarchy between stacked panels            | Edge shadows communicate which panel is "on top"        |

### 1.4 Design Principles

1. **Mild and subtle.** Start with the lightest possible shadows. We can always
   turn the dial up; turning it down later is harder.
2. **Directional.** Shadows only appear on the open/exposed edge of a docked
   element, reinforcing spatial orientation.
3. **Interactive only.** Only elements the user can click, hover, drag, or
   focus receive chrome. Static labels, headings, and data cells do not.
4. **Theme-aware.** All shadow values flow through CSS custom properties that
   adapt to light and dark modes.
5. **Print-safe.** All chrome is suppressed in `@media print`.
6. **Performance-conscious.** `box-shadow` and `opacity` are GPU-composited.
   Avoid `filter: drop-shadow()` on elements with many children.

---

## 2. Architecture

### 2.1 New File: `src/scss/_chrome.scss`

A mixin library imported by components that opt in. No global side-effects —
components must explicitly `@include` the mixins they need.

### 2.2 New CSS Custom Properties (in `_dark-mode.scss`)

Added to the existing `:root` and `[data-bs-theme="dark"]` blocks:

```scss
// ── :root (light mode) ──
--theme-glow-color:       rgba(var(--theme-primary-rgb), 0.10);
--theme-glow-color-hover: rgba(var(--theme-primary-rgb), 0.18);
--theme-edge-shadow-rgb:  var(--theme-shadow-rgb);
--theme-edge-shadow-opacity: 0.07;

// ── [data-bs-theme="dark"] ──
--theme-glow-color:       rgba(var(--theme-primary-rgb), 0.08);
--theme-glow-color-hover: rgba(var(--theme-primary-rgb), 0.14);
--theme-edge-shadow-opacity: 0.25;
```

### 2.3 Approach

Components `@import "../../src/scss/chrome";` (or via the shared import path)
and `@include` the relevant mixin. Each mixin generates a small, predictable
block of CSS. No magic — every shadow value is readable in the component's own
`.scss` file.

---

## 3. Mixin Catalogue

### 3.1 Edge Shadow Strategy — Hybrid Approach

Edge shadows use a **hybrid** of two mechanisms depending on whether the
component's dock side can change at runtime:

| Mechanism              | When to use                                      | App developer action |
|------------------------|--------------------------------------------------|----------------------|
| **`data-dock` attribute** | Component can change dock side at runtime (e.g. Sidebar left↔right, TabbedPanel tab position) | **None** — the component factory sets `data-dock` automatically from the existing `position` / `tabPosition` option |
| **Hardcoded SCSS**     | Component is always fixed to one edge (e.g. Ribbon = top, StatusBar = bottom) | **None** — shadow direction baked into SCSS |

**How `data-dock` works:**

The component's TypeScript factory sets the attribute on the root element
based on the option the developer already provides:

```typescript
// In createSidebar() — no change to the public API
setAttr(rootEl, { "data-dock": options.position });  // "left" | "right"

// If position changes at runtime:
setAttr(rootEl, { "data-dock": newPosition });
```

The `_chrome.scss` mixin library provides automatic directional rules:

```scss
@mixin auto-edge-shadow($blur: 6px)
{
    &[data-dock="left"]   { box-shadow:  2px 0 $blur 0 rgba(var(--theme-edge-shadow-rgb), var(--theme-edge-shadow-opacity)); }
    &[data-dock="right"]  { box-shadow: -2px 0 $blur 0 rgba(var(--theme-edge-shadow-rgb), var(--theme-edge-shadow-opacity)); }
    &[data-dock="top"]    { box-shadow: 0  2px $blur 0 rgba(var(--theme-edge-shadow-rgb), var(--theme-edge-shadow-opacity)); }
    &[data-dock="bottom"] { box-shadow: 0 -2px $blur 0 rgba(var(--theme-edge-shadow-rgb), var(--theme-edge-shadow-opacity)); }
}
```

For fixed-dock components, the existing `edge-shadow($side)` mixin is used
directly in their SCSS — no attribute needed.

### 3.2 `edge-shadow($side, $blur, $spread)`

Applies a single-direction `box-shadow` to simulate depth on the exposed edge
of a docked element. Only one edge casts a shadow at a time. Used for
**fixed-dock** components only.

```scss
@mixin edge-shadow($side: "bottom", $blur: 6px, $spread: 0px)
{
    $opacity: var(--theme-edge-shadow-opacity);
    $rgb:     var(--theme-edge-shadow-rgb);

    @if $side == "bottom" {
        box-shadow: 0 2px $blur $spread rgba($rgb, $opacity);
    } @else if $side == "top" {
        box-shadow: 0 -2px $blur $spread rgba($rgb, $opacity);
    } @else if $side == "right" {
        box-shadow: 2px 0 $blur $spread rgba($rgb, $opacity);
    } @else if $side == "left" {
        box-shadow: -2px 0 $blur $spread rgba($rgb, $opacity);
    }
}
```

**Parameters:**

| Param     | Default    | Description                            |
|-----------|------------|----------------------------------------|
| `$side`   | `"bottom"` | `"top"`, `"bottom"`, `"left"`, `"right"` |
| `$blur`   | `6px`      | Shadow blur radius                     |
| `$spread` | `0px`      | Shadow spread (usually keep at 0)      |

### 3.3 `hover-glow($radius)`

Adds a soft glow on `:hover` with a smooth transition. Uses the theme's
primary colour at very low opacity.

```scss
@mixin hover-glow($radius: 8px)
{
    transition: box-shadow 150ms ease, border-color 150ms ease;

    &:hover
    {
        box-shadow: 0 0 $radius var(--theme-glow-color-hover);
    }
}
```

### 3.4 `focus-glow()`

Adds a focus ring glow for keyboard navigation. Builds on the existing
`$shadow-focus` pattern but uses theme-aware properties.

```scss
@mixin focus-glow()
{
    &:focus-visible
    {
        box-shadow: 0 0 0 3px var(--theme-glow-color-hover);
        outline: none;
    }
}
```

### 3.5 `chrome-transition($properties...)`

A convenience mixin for applying the standard 150 ms ease transition to one or
more properties.

```scss
@mixin chrome-transition($properties...)
{
    transition-property: $properties;
    transition-duration: 150ms;
    transition-timing-function: ease;
}
```

### 3.6 `print-safe()`

Strips all box-shadow and transitions in print context. Applied once at the
root level in `_chrome.scss` — no need for individual components to worry
about it.

```scss
@media print
{
    *
    {
        box-shadow: none !important;
        transition: none !important;
    }
}
```

---

## 4. Component Application Map

Components are grouped into tiers based on the type of chrome they receive.

### 4.1 Tier 1 — Docked Panels (edge shadow)

These are docked/anchored elements that benefit from a directional shadow on
their exposed edge. The **Mechanism** column shows whether the shadow direction
is automatic via `data-dock` or hardcoded in SCSS. App developers make **zero
changes** in either case.

| Component        | Shadow Side(s)                                      | Mechanism                        | TS Change Needed            |
|------------------|-----------------------------------------------------|----------------------------------|-----------------------------|
| **Sidebar**      | Right edge (left-docked), left edge (right-docked)  | `data-dock` (auto from `position` option) | `setAttr(root, { "data-dock": position })` |
| **HelpDrawer**   | Left edge (right-docked), right edge (left-docked)  | `data-dock` (auto from `position` option) | `setAttr(root, { "data-dock": position })` |
| **Ribbon**       | Bottom edge                                         | Hardcoded SCSS `edge-shadow("bottom")` | None                   |
| **StatusBar**    | Top edge                                            | Hardcoded SCSS `edge-shadow("top")` | None                      |
| **Ruler** (H)    | Bottom edge                                         | Hardcoded SCSS `edge-shadow("bottom")` | None                   |
| **Ruler** (V)    | Right edge                                          | Hardcoded SCSS `edge-shadow("right")` | None                    |
| **InlineToolbar**| Bottom edge                                         | Hardcoded SCSS `edge-shadow("bottom")` | None                   |
| **ContextMenu**  | Already has shadow — keep `shadow-md`               | No change                        | None                        |

### 4.2 Tier 2 — Tabbed Panels (edge shadow + tab hover glow)

| Component         | Edge Shadow                                        | Mechanism                  | Tab Hover                      |
|-------------------|----------------------------------------------------|----------------------------|--------------------------------|
| **TabbedPanel**   | Bottom edge on tab strip (when tabs on top)        | `data-dock` (auto from `tabPosition` option) | Subtle glow on individual tab hover |
|                   | Top edge on tab strip (when tabs on bottom)        |                            |                                |
|                   | Right edge on tab strip (when tabs on left)        |                            |                                |
|                   | Left edge on tab strip (when tabs on right)        |                            |                                |

**TS change:** `setAttr(headerEl, { "data-dock": tabPosition })` — set once
on init and updated if `tabPosition` changes at runtime.

### 4.3 Tier 3 — Clickable Surfaces (hover glow)

Cards and card-like containers that respond to clicks.

| Component           | Chrome                                          |
|---------------------|-------------------------------------------------|
| **Demo cards**      | Already has hover shadow — enhance to glow      |
| **ActionItems**     | Hover glow on individual action items           |
| **NotificationCenter** | Hover glow on notification items             |
| **Toast**           | Subtle static `shadow-sm` (already has it)      |
| **Modal/FormDialog**| Already has `shadow-lg` — no change needed      |

### 4.4 Tier 4 — Buttons & Form Controls (hover glow + focus glow)

Small interactive controls that benefit from a hover glow and improved focus
ring.

| Component            | Chrome                                         |
|----------------------|------------------------------------------------|
| **Toolbar buttons**  | `hover-glow(6px)` + `focus-glow()`            |
| **Ribbon buttons**   | `hover-glow(6px)` + `focus-glow()`            |
| **Tab titles**       | `hover-glow(6px)` on inactive tabs            |
| **Dropdown triggers**| `hover-glow(6px)` + `focus-glow()`            |
| **ToggleSwitch**     | `focus-glow()` (hover changes track color)     |
| **Checkbox/Radio**   | `focus-glow()` only (hover is background)      |
| **ColorPicker swatch**| `hover-glow(4px)` on clickable swatches       |
| **SymbolPicker cells**| `hover-glow(4px)` on icon cells               |

---

## 5. Shadow Values

We use the **lightest** values from the existing elevation system. The goal is
barely-perceptible depth, not dramatic drop shadows.

### 5.1 Edge Shadows (Tier 1 & 2)

```
Light mode:  0 2px 6px rgba(15, 23, 42, 0.07)    — ~equivalent to shadow-xs+
Dark mode:   0 2px 6px rgba(0, 0, 0, 0.25)        — slightly stronger for contrast
```

### 5.2 Hover Glows (Tier 3 & 4)

```
Light mode:  0 0 8px rgba(37, 99, 235, 0.18)      — primary-blue, very faint
Dark mode:   0 0 8px rgba(96, 165, 250, 0.14)      — lighter blue, muted
```

### 5.3 Focus Glows (Tier 4)

```
Light mode:  0 0 0 3px rgba(37, 99, 235, 0.18)    — ring style, consistent w/ hover
Dark mode:   0 0 0 3px rgba(96, 165, 250, 0.14)
```

### 5.4 Transitions

All chrome transitions use: `150ms ease`. Applied to `box-shadow` and
`border-color` only. No transitions on `background-color` unless the component
already has one.

---

## 6. Excluded Elements

These explicitly do **not** receive chrome:

| Category                | Reason                                          |
|-------------------------|-------------------------------------------------|
| Table cells/rows        | Performance — hundreds of elements              |
| TreeView nodes          | Too many nodes, would be noisy                  |
| Chart bars/slices       | Data visualization, not interactive chrome      |
| Breadcrumb segments     | Inline text, not container-like                 |
| Label/Badge             | Static display elements                         |
| Code blocks             | Content, not interactive                        |
| Scrollbar thumbs        | OS-native, can't style consistently             |
| DiagramEngine shapes    | SVG — box-shadow doesn't apply; separate system |

---

## 7. Implementation Plan

### Phase 1 — Foundation (mixin library + tokens)

| File                         | Action |
|------------------------------|--------|
| `src/scss/_chrome.scss`      | Create — mixin library                       |
| `src/scss/_dark-mode.scss`   | Edit — add glow/edge CSS custom properties   |
| `src/scss/_variables.scss`   | Edit — add `$chrome-*` SCSS defaults         |

**Tasks:**
1. Create `_chrome.scss` with all 6 mixins (`edge-shadow`, `auto-edge-shadow`,
   `hover-glow`, `focus-glow`, `chrome-transition`, `print-safe`)
2. Add CSS custom properties to `:root` and `[data-bs-theme="dark"]` blocks
3. Add `$chrome-blur`, `$chrome-glow-radius` defaults to `_variables.scss`
4. Add `@media print` reset block
5. Verify build

### Phase 2 — Docked Panels (Tier 1)

**Fixed-dock components (SCSS only, no TS changes):**

| Component        | File                                 | SCSS Change                               |
|------------------|--------------------------------------|-------------------------------------------|
| Ribbon           | `components/ribbon/ribbon.scss`      | `@include edge-shadow("bottom")`          |
| StatusBar        | `components/statusbar/statusbar.scss`| `@include edge-shadow("top")`             |
| Ruler (H)        | `components/ruler/ruler.scss`        | `@include edge-shadow("bottom")`          |
| Ruler (V)        | `components/ruler/ruler.scss`        | `@include edge-shadow("right")`           |
| InlineToolbar    | `components/inlinetoolbar/inlinetoolbar.scss` | `@include edge-shadow("bottom")` |

**Dynamic-dock components (SCSS + small TS change):**

| Component   | SCSS File                               | SCSS Change                    | TS File                              | TS Change                                  |
|-------------|-----------------------------------------|--------------------------------|--------------------------------------|--------------------------------------------|
| Sidebar     | `components/sidebar/sidebar.scss`       | `@include auto-edge-shadow()`  | `components/sidebar/sidebar.ts`      | `setAttr(root, { "data-dock": position })` |
| HelpDrawer  | `components/helpdrawer/helpdrawer.scss` | `@include auto-edge-shadow()`  | `components/helpdrawer/helpdrawer.ts`| `setAttr(root, { "data-dock": position })` |

**Tasks:**
1. Import `_chrome` in each component SCSS
2. Fixed-dock: apply `edge-shadow($side)` mixin to root container
3. Dynamic-dock: apply `auto-edge-shadow()` mixin to root container
4. Dynamic-dock: add `setAttr(root, { "data-dock": position })` in factory
   and in any `setPosition()` / runtime update method
5. Verify in demo pages (light + dark mode)
6. Test print suppression

### Phase 3 — Tabbed Panels (Tier 2)

| Component    | Change                                                    |
|--------------|-----------------------------------------------------------|
| TabbedPanel  | Edge shadow on tab strip via `data-dock` (auto-directional) |
|              | `hover-glow(6px)` on inactive `.tabbedpanel-tab`         |

**Tasks:**
1. SCSS: import `_chrome`, apply `auto-edge-shadow()` to `.tabbedpanel-header`
2. TS: add `setAttr(headerEl, { "data-dock": tabPosition })` in factory and
   in any `setTabPosition()` runtime update method
3. Add hover glow to `.tabbedpanel-tab:not(.active)`
4. Verify all 4 tab positions (top, bottom, left, right)

### Phase 4 — Clickable Surfaces (Tier 3)

| Element              | Change                                          |
|----------------------|-------------------------------------------------|
| Demo cards           | Enhance existing hover shadow to glow style     |
| ActionItems          | `hover-glow(8px)` on `.action-item`             |
| NotificationCenter   | `hover-glow(6px)` on notification items         |

**Tasks:**
1. Update `demo-shell.css` card hover to use glow
2. Apply `hover-glow` to ActionItems, NotificationCenter
3. Verify in demo pages

### Phase 5 — Buttons & Form Controls (Tier 4)

| Element              | Change                                          |
|----------------------|-------------------------------------------------|
| Toolbar buttons      | `hover-glow(6px)` + `focus-glow()`             |
| Ribbon buttons       | `hover-glow(6px)` + `focus-glow()`             |
| Tab titles           | `hover-glow(6px)` on inactive tabs             |
| Dropdown triggers    | `hover-glow(6px)` + `focus-glow()`             |
| ToggleSwitch         | `focus-glow()`                                  |
| Checkbox/Radio       | `focus-glow()`                                  |
| ColorPicker swatches | `hover-glow(4px)`                               |
| SymbolPicker cells   | `hover-glow(4px)`                               |

**Tasks:**
1. Apply mixins to each control type
2. Verify keyboard focus ring appearance
3. Verify no double-shadow conflicts with existing styles
4. Check performance with many buttons visible (Ribbon)

### Phase 6 — Review & Tune

1. Visual review of every affected component in light + dark mode
2. Print preview test
3. Performance spot-check (Ribbon with 50+ buttons, large TreeView)
4. Adjust opacity/blur values if anything feels too heavy
5. Update knowledge base, commit

---

## 8. Risks & Mitigations

| Risk                                           | Mitigation                                       |
|------------------------------------------------|--------------------------------------------------|
| Shadows conflict with existing `box-shadow`    | Audit each component; use comma-separated stacks where needed |
| Dark mode glows look too bright                | Separate dark mode glow opacity (lower)          |
| Performance on Ribbon with 50+ buttons         | `hover-glow` only fires on `:hover` — no paint cost at rest |
| Print outputs show shadows                     | Global `@media print` reset in `_chrome.scss`    |
| SCSS import path issues                        | Use same relative path pattern as `_variables`   |

---

## 9. Success Criteria

- [ ] `_chrome.scss` mixin library created with 6 mixins (incl. `auto-edge-shadow`)
- [ ] CSS custom properties added for glow/edge in both light and dark mode
- [ ] Dynamic-dock components (Sidebar, HelpDrawer, TabbedPanel) set `data-dock`
      attribute automatically — shadow direction follows with zero app-developer config
- [ ] Fixed-dock components (Ribbon, StatusBar, Ruler, InlineToolbar) have
      hardcoded directional edge shadows in SCSS
- [ ] Demo cards have hover glow
- [ ] Buttons and form controls have focus glow
- [ ] All shadows suppressed in `@media print`
- [ ] No visual regressions in existing components
- [ ] Build passes, no SCSS compile errors
