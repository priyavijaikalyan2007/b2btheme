<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-FileCopyrightText: 2026 Outcrop Inc
SPDX-License-Identifier: MIT
-->

# Touch & Mobile Friendliness Audit Findings

**Date:** 2026-04-14
**Scope:** All 110+ components in `components/`, demo pages, global SCSS variables
**Devices tested against:** iPad, iPhone, small laptop screens
**Standards referenced:** Apple HIG (44x44px min), Material Design (48x48dp min), WCAG 2.1 AA

---

## Executive Summary

The component library has **systemic mobile/touch issues** across multiple categories. While
some newer components (SplitLayout, Sidebar, Toolbar, TabbedPanel, ColorPicker, Slider) correctly
use the PointerEvent API, a significant number of interactive components use mouse-only events and
**completely fail on touch devices**. Additionally, there are zero responsive breakpoints in
component SCSS, undersized touch targets throughout, and hover-dependent UI patterns that are
inaccessible on touch.

### Key Statistics

| Metric | Value |
|--------|-------|
| Mouse event occurrences | 147 across 40 files |
| Pointer/touch event occurrences | 138 across 23 files |
| Files with mouse events but NO touch equivalent | ~17 |
| Components with responsive breakpoints | 1 (AppLauncher) |
| `:hover` rules across component SCSS | 264 across 60 files |
| Components with `@media (pointer: coarse)` | 1 (Toolbar) |
| Components with `@media (hover: none)` | 0 |

---

## 1. CRITICAL: Mouse-Only Event Handlers (Broken on Touch)

These components use `mousedown`/`mousemove`/`mouseup` instead of
`pointerdown`/`pointermove`/`pointerup`. Drag and resize interactions **completely fail on
iPad/iPhone/Android**.

| Component | File | Lines | Broken Feature |
|-----------|------|-------|----------------|
| TreeGrid | `treegrid/treegrid.ts` | 2838, 2883-2886 | Column resize handles |
| VisualTableEditor | `visualtableeditor/visualtableeditor.ts` | 1620, 2666-2667, 2730-2731, 3967 | Column + row resize handles |
| MarkdownEditor | `markdowneditor/markdowneditor.ts` | 1065, 1072-1073, 1285, 1384 | Panel resize, toolbar buttons, outside-click |
| GraphMinimap | `graphminimap/graphminimap.ts` | 348, 353-354 | Viewport drag-to-pan |
| HelpDrawer | `helpdrawer/helpdrawer.ts` | 364, 519-520 | Panel resize |
| PropertyInspector | `propertyinspector/propertyinspector.ts` | 575, 603-604 | Panel resize |
| ActionItems | `actionitems/actionitems.ts` | 2247, 3430-3431 | Item drag/reorder |
| Ruler | `ruler/ruler.ts` | 782-783 | Hover position tracking |
| TimePicker | `timepicker/timepicker.ts` | 983, 1282-1286, 1393-1445, 1631 | Spinner buttons, toggle, timezone options |
| DatePicker | `datepicker/datepicker.ts` | 746, 812-819 | Toggle button, help icon hover |
| ContextMenu | `contextmenu/contextmenu.ts` | 459-468, 674, 939-940 | Submenu mouseenter/mouseleave, outside-click |
| DiagramEngine | `diagramengine/diagramengine.ts` | 27811-27814 | All drawing/selection/manipulation tools |

### Components with Correct PointerEvent Usage (No Action Needed for Events)

| Component | Notes |
|-----------|-------|
| SplitLayout | `pointerdown`/`pointermove`/`pointerup` + `setPointerCapture` |
| Sidebar | Full pointer event support for drag and resize |
| Toolbar | Full pointer event support for grip drag and resize |
| TabbedPanel | Full pointer event support for drag-to-dock and resize |
| ColorPicker | Palette, hue strip, opacity bar all use pointer events |
| Slider | Track and thumb use pointer events with capture |
| AnglePicker | Dial uses pointer events (trigger button uses `click`) |
| GradientPicker | Gradient stop handles use pointer events |
| SpineMap | Uses pointer events |
| CommentOverlay | Uses pointer events |

### Outside-Click Detection Using `mousedown` (Popups Won't Close on Touch)

These components use `document.addEventListener("mousedown", ...)` for detecting outside clicks.
On touch devices, popups/dropdowns may not close when tapping outside.

| Component | File | Line |
|-----------|------|------|
| ColorPicker | `colorpicker/colorpicker.ts` | 1696-1697 |
| GradientPicker | `gradientpicker/gradientpicker.ts` | 2101 |
| AnglePicker | `anglepicker/anglepicker.ts` | 939-940 |
| MarkdownEditor | `markdowneditor/markdowneditor.ts` | 1384 |
| FacetSearch | `facetsearch/facetsearch.ts` | 1283 |

---

## 2. CRITICAL: Touch Target Sizes Below 44px Minimum

### Global Variable Heights (`_variables.scss`)

| Variable | Size | Meets 44px? |
|----------|------|-------------|
| `$control-height-xs` | 22px | No |
| `$control-height-sm` | 28px | No |
| `$control-height-md` | 32px | No |
| `$control-height-lg` | 40px | No |
| `$control-height-xl` | 44px | Yes (only XL) |

### Computed Button Heights

| Button Size | Calculation | Result | Meets 44px? |
|-------------|------------|--------|-------------|
| Default `.btn` | 6px + 14px * 1.4 + 6px | ~31.6px | No |
| Small `.btn-sm` | 4px + 12.8px * 1.4 + 4px | ~25.9px | No |
| Large `.btn-lg` | 8px + 16px * 1.5 + 8px | ~40px | No |

### Per-Component Touch Target Issues

| Component | Element | Current Size | File:Line |
|-----------|---------|-------------|-----------|
| Toolbar | Tool buttons | 32px | `toolbar/toolbar.scss:26` |
| DataGrid | Header rows | 36px | `datagrid/datagrid.scss:56` |
| DatePicker | Day cells | 32px (2rem) | `datepicker/datepicker.scss:141-142` |
| DatePicker SM | Day cells | 28px (1.75rem) | `datepicker/datepicker.scss:357-358` |
| DatePicker LG | Day cells | 36px (2.25rem) | `datepicker/datepicker.scss:369-370` |
| Slider | Thumb default | 16px | `slider/slider.scss:18` |
| Slider Mini | Thumb | 10px | `slider/slider.scss:157-160` |
| Slider SM | Thumb | 12px | `slider/slider.scss:177-180` |
| ColorPicker | Palette cursor | 12px | `colorpicker/colorpicker.scss:164-165` |
| ColorPicker | Hue indicator | 4px height | `colorpicker/colorpicker.scss:189-190` |
| ColorPicker | Opacity thumb | 6px width | `colorpicker/colorpicker.scss:225-226` |
| TabbedPanel | Collapse/Float/Close btns | 22px | `tabbedpanel/tabbedpanel.scss:177-178` |
| TabbedPanel | Tab close button | 16px | `tabbedpanel/tabbedpanel.scss:292-293` |
| Sidebar | Collapse/Float/Close btns | 22px | `sidebar/sidebar.scss:176-177` |
| TreeGrid | Toggle arrow | 20px | `treegrid/treegrid.scss:171-172` |
| Pill | Dismiss button | 16px | `pill/pill.scss:128-129` |
| TypeBadge SM | Badge height | 20px | `typebadge/typebadge.scss:37` |
| FacetSearch | Chip remove button | ~20px | `facetsearch/facetsearch.ts:757` |

---

## 3. CRITICAL: Resize Handles Too Small for Touch

| Component | Handle Size | File:Line | Min Recommended |
|-----------|------------|-----------|-----------------|
| Sidebar | 4px | `sidebar/sidebar.scss:31` | 12-16px |
| TabbedPanel | 4px | `tabbedpanel/tabbedpanel.scss:32` | 12-16px |
| Toolbar | 4px | `toolbar/toolbar.scss:31` | 12-16px |
| DataGrid | 6px | `datagrid/datagrid.scss:120` | 12-16px |
| TreeGrid | 6px (1px indicator) | `treegrid/treegrid.scss:28,266` | 12-16px |
| SplitLayout | 2px | `splitlayout/splitlayout.scss:139` | 12-16px |
| VisualTableEditor | 6px | `visualtableeditor/visualtableeditor.scss:238` | 12-16px |
| TabbedPanel corner | 12px | `tabbedpanel/tabbedpanel.scss:554-555` | 16-20px |
| Sidebar corner | 12px | `sidebar/sidebar.scss:273-274` | 16-20px |

---

## 4. HIGH: No Responsive Breakpoints in Components

Only **1 component** (AppLauncher) has `min-width`/`max-width` responsive media queries out of
110+ components. The `@media` rules found in ~50 component SCSS files are exclusively
`prefers-color-scheme` (dark mode), not responsive breakpoints.

- `_variables.scss` defines no custom breakpoints (Bootstrap defaults are available but unused)
- No `@media (pointer: coarse)` rules exist except in `toolbar.scss` (1 instance — the good pattern)
- No `@media (hover: none)` rules anywhere
- Demo shell has only 1 breakpoint at 768px

### Fixed-Width Panels That Won't Fit Small Screens

| Component | Width | File:Line | Issue |
|-----------|-------|-----------|-------|
| ColorPicker | 280px fixed | `colorpicker/colorpicker.scss:135` | Exceeds 320px phone width |
| ColorPicker SM | 240px fixed | `colorpicker/colorpicker.scss:437` | Still rigid |
| DatePicker | 280px min-width | `datepicker/datepicker.scss:52-54` | Doesn't fit 320px screens |
| ContextMenu | Fixed positioning | `contextmenu/contextmenu.scss` | Can overflow screen edge |

---

## 5. HIGH: Hover-Only Interactions (Invisible on Touch)

264 `:hover` rules across 60 SCSS files. The following control visibility or core functionality:

| Component | Issue | File:Lines | Impact |
|-----------|-------|-----------|--------|
| TabbedPanel | Tab close button `opacity: 0` until `:hover` | `tabbedpanel/tabbedpanel.scss:303-322` | Cannot close tabs on touch |
| Sidebar | Close/Float buttons hidden until hover | `sidebar/sidebar.scss` (similar pattern) | Cannot access on touch |
| HelpTooltip | Popup only shows on `:hover` | `helptooltip/helptooltip.scss:84-98` | Help text inaccessible |
| DatePicker | Help tooltip requires hover | `datepicker/datepicker.scss:307-310` | Help inaccessible |
| ContextMenu | Submenu open via `mouseenter` | `contextmenu/contextmenu.ts:459-468` | Submenus unreachable |
| DataGrid | Row hover glow effect | `datagrid/datagrid.scss:211-214` | No visual feedback on touch |
| ColorPicker | Swatch hover scale | `colorpicker/colorpicker.scss:393-396` | No feedback on touch |

### Touch-Unfriendly Interaction Patterns

| Component | Pattern | Issue |
|-----------|---------|-------|
| GradientPicker | `dblclick` to edit stop | Unreliable on touch devices |
| GradientPicker | `contextmenu` to remove stop | Right-click unavailable on touch |
| VisualTableEditor | `contextmenu` for table operations | Right-click unavailable on touch |
| ContextMenu | `mouseenter`/`mouseleave` for submenus | No touch equivalent |

---

## 6. MEDIUM: Missing Touch-Specific CSS Properties

| Property | Current Status | Impact | Recommendation |
|----------|---------------|--------|----------------|
| `touch-action: none` | Only 8 components | Draggable elements fight with browser scroll | Add to all drag/resize targets |
| `-webkit-tap-highlight-color` | Missing everywhere | Default blue highlight flash on tap | Set to `transparent` on interactive elements |
| `-webkit-overflow-scrolling: touch` | Missing everywhere | No momentum scrolling on older iOS | Add to scrollable containers |
| `overscroll-behavior: contain` | Missing everywhere | Scroll containers trigger pull-to-refresh | Add to nested scroll containers |
| `@media (pointer: coarse)` | Only `toolbar.scss` | No touch-size adaptation | Add to all interactive components |
| `@media (hover: none)` | Missing everywhere | Hover-hidden elements invisible | Show hover-dependent elements |

### Components That Already Have `touch-action: none` (Good)

- `splitlayout/splitlayout.scss:61`
- `tabbedpanel/tabbedpanel.scss:521,540,559`
- `slider/slider.scss:55`
- `toolbar/toolbar.scss:815`
- `gauge/gauge.scss:291`
- `stacklayout/stacklayout.scss:122`
- `sidebar/sidebar.scss:248,268,277`
- `anglepicker/anglepicker.scss:64`

---

## 7. LOW: Small Font Sizes on Mobile

| Component | Font Size | File:Line | Risk |
|-----------|-----------|-----------|------|
| Slider Mini | 10px (`$font-size-2xs`) | `slider/slider.scss:150` | Hard to read on mobile |
| Toolbar Keytips | 10px | `toolbar/toolbar.scss:34` | Very small on touch screens |
| HelpTooltip | 12px (`$font-size-xs`) | `helptooltip/helptooltip.scss:92` | Borderline on mobile |
| ColorPicker | 12px (`$font-size-xs`) | `colorpicker/colorpicker.scss:276` | Borderline |
| Badge Status | 11.2px (0.7rem) | `custom.scss:194` | Below 12px minimum |

---

## 8. Positive Findings

- All demo HTML files have correct `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- No `user-scalable=no` or `maximum-scale=1` (pinch-to-zoom not blocked)
- 10 core components properly use PointerEvent API with `setPointerCapture`
- `prefers-color-scheme` dark mode support is present across all demos
- Demo shell has basic responsive layout at 768px breakpoint
- Font smoothing (`-webkit-font-smoothing: antialiased`) applied globally
- `user-select: none` properly applied to interactive non-text elements

---

## Proposed Fix Strategy

### Phase 1: Global Touch Foundation

1. Create `_touch.scss` mixin file with:
   - `@mixin touch-target($min: 44px)` — ensures minimum hit area via padding on `(pointer: coarse)`
   - `@mixin hover-visible` — shows hover-hidden elements on `(hover: none)` devices
   - `@mixin touch-action-none` — prevents browser scroll during drag
   - Global `-webkit-tap-highlight-color: transparent` on interactive elements
   - Global `overscroll-behavior: contain` on nested scroll containers

2. Add `@media (pointer: coarse)` block to `_variables.scss` for touch-size overrides of
   control heights and button padding.

### Phase 2: Mouse-to-Pointer Migration (10 Components)

Replace all `mousedown`/`mousemove`/`mouseup` with `pointerdown`/`pointermove`/`pointerup`
plus `setPointerCapture` in:

1. TreeGrid — column resize
2. VisualTableEditor — column + row resize
3. MarkdownEditor — panel resize + outside-click
4. GraphMinimap — viewport drag
5. HelpDrawer — panel resize
6. PropertyInspector — panel resize
7. ActionItems — item drag/reorder
8. TimePicker — spinner buttons + toggle
9. DatePicker — toggle + help icon
10. ContextMenu — submenu handling + outside-click

Also fix outside-click detection in ColorPicker, GradientPicker, AnglePicker, FacetSearch
(`mousedown` → `pointerdown` on document).

### Phase 3: Touch Target Sizing

Add `@media (pointer: coarse)` blocks to enlarge interactive elements to 44px minimum:

- Buttons, toggles, close/collapse icons
- Calendar day cells
- Slider thumbs
- Resize handles (4-6px → 12-16px)
- Tab close buttons
- Pill dismiss buttons
- TreeGrid toggle arrows
- Spinner up/down buttons

### Phase 4: Hover Visibility Fix

Add `@media (hover: none)` rules to show hover-dependent elements by default:

- TabbedPanel tab close buttons
- Sidebar close/float buttons
- HelpTooltip popup (convert to tap-to-toggle)
- DatePicker help tooltip

### Phase 5: Responsive Breakpoints

Add responsive rules for fixed-width components:

- ColorPicker: `max-width: 90vw` on small screens
- DatePicker: `max-width: 90vw` on small screens
- ContextMenu: viewport boundary clamping
- Toolbar: overflow menu for narrow viewports (already partially done)

### Phase 6: Touch Interaction Patterns

- Long-press as right-click fallback for context menus
- Tap-to-toggle for tooltips (instead of hover)
- Touch-friendly alternatives for `dblclick` (e.g., tap + edit button)

---

## Backward Compatibility Assessment

### Consumer App Audit

The Knobby apps team (`~/work/knobby/apps/`) was audited for backward compatibility. The shell
and 5 apps (Thinker, Diagrams, Strukture, Checklists, Admin) consume 9 library components via
CDN `<script>` tags: TabbedPanel, EditableComboBox, MaskedEntry, Toast, ConfirmDialog,
WorkspaceSwitcher, UserMenu, AppLauncher, FormDialog.

### Will Existing Apps Break? **No.**

| Change Category | Desktop Impact | Touch Impact | Apps Impact |
|-----------------|---------------|-------------|-------------|
| Mouse → Pointer events (Phase 2) | None — PointerEvent fires for mouse | Fixes broken features | None — internal handlers only |
| Touch target sizing (Phase 3) | None — `(pointer: coarse)` only | Larger tap targets | None — media query gated |
| Hover visibility (Phase 4) | None — `(hover: none)` only | Hidden elements visible | None — media query gated |
| Responsive breakpoints (Phase 5) | None — only affects small screens | Better layout | None — additive CSS only |

**Why no breakage:**

1. **Public API unchanged** — Factory function signatures (`createTabbedPanel`, `createToolbar`,
   etc.), options interfaces, and return types are identical. No fields added or removed.
2. **Callbacks pass abstracted values** — e.g., `onColumnResize(column, newWidth: number)`,
   `onResize(width: number)`. No raw `MouseEvent` objects are passed to consumers.
3. **CSS changes are media-query-gated** — `@media (pointer: coarse)` and `@media (hover: none)`
   only activate on touch/hover-less devices. Desktop rendering is pixel-identical.
4. **PointerEvent extends MouseEvent** — On the rare case a consumer accesses event properties
   like `.clientX`, `.button`, `.shiftKey`, these exist on both types.
5. **CDN loading unchanged** — Script/CSS paths remain the same, IIFE wrapping unchanged.

### Apps' Own Touch Issues (Separate from Library)

The apps team has their own touch/mobile problems independent of library changes:

- **Thinker/Diagrams**: Canvas interaction uses mouse-only events (their own code, not library)
- **Diagrams**: Delete buttons hidden until hover (their own CSS)
- **Checklists**: Stage/step actions hidden until hover (their own CSS)
- **Shell**: 32px buttons below 44px touch minimum (their own sizing)
- **All apps**: Zero `@media (pointer: coarse)` or `@media (hover: none)` rules

These should be flagged to the apps team as a separate initiative.

---

## DiagramEngine Note

The DiagramEngine (`diagramengine.ts`, ~25,000 lines) uses `mousedown`/`mousemove`/`mouseup`
on its main SVG canvas (line 27811-27814) for all 12 drawing tools. This is the largest single
component and will require its own dedicated touch migration effort. It is excluded from the
Phase 2 scope above and should be handled as a separate initiative given its size and complexity.

---

## Testing Checklist

After fixes are applied, verify on:

- [ ] iPhone Safari (375px width, touch-only)
- [ ] iPad Safari (768px/1024px, touch-only)
- [ ] Android Chrome (360px width, touch-only)
- [ ] Small laptop (1024px, mouse + touchpad)
- [ ] Chrome DevTools touch emulation (various sizes)

For each component verify:

- [ ] All interactive elements reachable via touch
- [ ] Drag/resize operations work on touch
- [ ] Popups/dropdowns close when tapping outside
- [ ] No hover-hidden elements are inaccessible
- [ ] No content clipped or overflowing on small screens
- [ ] Scroll containers don't trigger pull-to-refresh
- [ ] No 300ms tap delay on interactive elements
