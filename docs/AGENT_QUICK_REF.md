<!-- AGENT: Auto-generated — do not edit. Run `npm run build` to regenerate. -->

# Agent Quick Reference

Machine-parseable reference for coding agents. Combines dist paths, design tokens, CSS classes, and component APIs.

## dist/ Asset Paths

```
dist/css/custom.css          — Compiled theme CSS
dist/js/bootstrap.bundle.min.js — Bootstrap 5 JS bundle
dist/icons/bootstrap-icons.css  — Bootstrap Icons CSS
dist/icons/fonts/              — Bootstrap Icons font files
dist/components/bannerbar/bannerbar.css — bannerbar component CSS
dist/components/bannerbar/bannerbar.js  — bannerbar component JS
dist/components/colorpicker/colorpicker.css — colorpicker component CSS
dist/components/colorpicker/colorpicker.js  — colorpicker component JS
dist/components/conversation/conversation.css — conversation component CSS
dist/components/conversation/conversation.js  — conversation component JS
dist/components/cronpicker/cronpicker.css — cronpicker component CSS
dist/components/cronpicker/cronpicker.js  — cronpicker component JS
dist/components/datepicker/datepicker.css — datepicker component CSS
dist/components/datepicker/datepicker.js  — datepicker component JS
dist/components/docklayout/docklayout.css — docklayout component CSS
dist/components/docklayout/docklayout.js  — docklayout component JS
dist/components/durationpicker/durationpicker.css — durationpicker component CSS
dist/components/durationpicker/durationpicker.js  — durationpicker component JS
dist/components/editablecombobox/editablecombobox.css — editablecombobox component CSS
dist/components/editablecombobox/editablecombobox.js  — editablecombobox component JS
dist/components/emptystate/emptystate.css — emptystate component CSS
dist/components/emptystate/emptystate.js  — emptystate component JS
dist/components/errordialog/errordialog.css — errordialog component CSS
dist/components/errordialog/errordialog.js  — errordialog component JS
dist/components/gauge/gauge.css — gauge component CSS
dist/components/gauge/gauge.js  — gauge component JS
dist/components/logconsole/logconsole.css — logconsole component CSS
dist/components/logconsole/logconsole.js  — logconsole component JS
dist/components/markdowneditor/markdowneditor.css — markdowneditor component CSS
dist/components/markdowneditor/markdowneditor.js  — markdowneditor component JS
dist/components/maskedentry/maskedentry.css — maskedentry component CSS
dist/components/maskedentry/maskedentry.js  — maskedentry component JS
dist/components/progressmodal/progressmodal.css — progressmodal component CSS
dist/components/progressmodal/progressmodal.js  — progressmodal component JS
dist/components/sidebar/sidebar.css — sidebar component CSS
dist/components/sidebar/sidebar.js  — sidebar component JS
dist/components/splitlayout/splitlayout.css — splitlayout component CSS
dist/components/splitlayout/splitlayout.js  — splitlayout component JS
dist/components/statusbar/statusbar.css — statusbar component CSS
dist/components/statusbar/statusbar.js  — statusbar component JS
dist/components/tabbedpanel/tabbedpanel.css — tabbedpanel component CSS
dist/components/tabbedpanel/tabbedpanel.js  — tabbedpanel component JS
dist/components/timeline/timeline.css — timeline component CSS
dist/components/timeline/timeline.js  — timeline component JS
dist/components/timepicker/timepicker.css — timepicker component CSS
dist/components/timepicker/timepicker.js  — timepicker component JS
dist/components/timezonepicker/timezonepicker.css — timezonepicker component CSS
dist/components/timezonepicker/timezonepicker.js  — timezonepicker component JS
dist/components/toolbar/toolbar.css — toolbar component CSS
dist/components/toolbar/toolbar.js  — toolbar component JS
dist/components/treegrid/treegrid.css — treegrid component CSS
dist/components/treegrid/treegrid.js  — treegrid component JS
dist/components/treeview/treeview.css — treeview component CSS
dist/components/treeview/treeview.js  — treeview component JS
dist/docs/                     — Consumer documentation (HTML)
```

## Design Tokens

```
# COLOR PALETTE - Enterprise Blues, Grays, Blacks, Reds, and Greens
$blue-900=#0a2540
$blue-800=#0d3b66
$blue-700=#1864ab
$blue-600=#1c7ed6
$blue-500=#2196f3
$blue-400=#4dabf7
$blue-300=#74c0fc
$blue-200=#a5d8ff
$blue-100=#d0ebff
$gray-900=#0f172a
$gray-800=#1e293b
$gray-700=#334155
$gray-600=#475569
$gray-500=#64748b
$gray-400=#94a3b8
$gray-300=#cbd5e1
$gray-200=#e2e8f0
$gray-100=#f1f5f9
$gray-50=#f8fafc
$green-900=#1b4332
$green-800=#2d6a4f
$green-700=#40916c
$green-600=#52b788
$green-500=#2e7d32
$green-400=#74c69d
$green-300=#95d5b2
$green-200=#b7e4c7
$green-100=#d8f3dc
$red-900=#7f1d1d
$red-800=#991b1b
$red-700=#b91c1c
$red-600=#dc2626
$red-500=#ef4444
$red-400=#f87171
$red-300=#fca5a5
$red-200=#fecaca
$red-100=#fee2e2
$yellow-500=#f59e0b
$yellow-100=#fef3c7
$orange-500=#f97316
$orange-100=#ffedd5
# THEME COLORS
$primary=$blue-600 (#1c7ed6)
$secondary=$gray-600 (#475569)
$success=$green-600 (#52b788)
$info=$blue-500 (#2196f3)
$warning=$yellow-500 (#f59e0b)
$danger=$red-600 (#dc2626)
$light=$gray-100 (#f1f5f9)
$dark=$gray-900 (#0f172a)
$body-bg=$gray-50 (#f8fafc)
$body-color=$gray-900 (#0f172a)
$link-color=$blue-700 (#1864ab)
$link-decoration=none
$link-hover-color=$blue-800 (#0d3b66)
$link-hover-decoration=underline
# TYPOGRAPHY - Compact and professional
$font-family-sans-serif="Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
$font-family-monospace="JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace
$font-size-base=0.875rem
$font-size-sm=0.8rem
$font-size-lg=1rem
$h1-font-size=1.575rem
$h2-font-size=1.35rem
$h3-font-size=1.17rem
$h4-font-size=1.035rem
$h5-font-size=1rem
$h6-font-size=0.875rem
$font-weight-light=300
$font-weight-normal=400
$font-weight-semibold=600
$font-weight-bold=700
$line-height-base=1.4
$line-height-sm=1.3
$line-height-lg=1.5
# SPACING - Adjusted for larger text
$spacer=0.75rem
# BORDERS & BORDER RADIUS - Sharp, professional edges
$border-width=1px
$border-color=$gray-300 (#cbd5e1)
$border-radius=0
$border-radius-sm=0
$border-radius-lg=0
$border-radius-xl=0
$border-radius-pill=0
# COMPONENTS - Compact sizing
$padding-y-sm=0.25rem
$padding-x-sm=0.5rem
$padding-y=0.375rem
$padding-x=0.75rem
$padding-y-lg=0.5rem
$padding-x-lg=1rem
$btn-padding-y=0.375rem
$btn-padding-x=0.75rem
$btn-font-size=$font-size-base (0.875rem)
$btn-line-height=$line-height-base (1.4)
$btn-padding-y-sm=0.25rem
$btn-padding-x-sm=0.5rem
$btn-font-size-sm=$font-size-sm (0.8rem)
$btn-padding-y-lg=0.5rem
$btn-padding-x-lg=1rem
$btn-font-size-lg=$font-size-lg (1rem)
$btn-border-radius=$border-radius (0)
$btn-border-radius-sm=$border-radius-sm (0)
$btn-border-radius-lg=$border-radius-lg (0)
$input-btn-padding-y=0.375rem
$input-btn-padding-x=0.75rem
$input-btn-font-size=$font-size-base (0.875rem)
$input-btn-line-height=$line-height-base (1.4)
$input-btn-padding-y-sm=0.25rem
$input-btn-padding-x-sm=0.5rem
$input-btn-font-size-sm=$font-size-sm (0.8rem)
$input-btn-padding-y-lg=0.5rem
$input-btn-padding-x-lg=1rem
$input-btn-font-size-lg=$font-size-lg (1rem)
$input-bg=$gray-50 (#f8fafc)
$input-disabled-bg=$gray-200 (#e2e8f0)
$input-disabled-border-color=$gray-300 (#cbd5e1)
$input-color=$body-color ($gray-900)
$input-border-color=$gray-300 (#cbd5e1)
$input-border-width=$border-width (1px)
$input-border-radius=$border-radius (0)
$input-focus-border-color=$primary ($blue-600)
$input-focus-box-shadow=0 0 0 0.15rem rgba($primary, 0.25)
$input-placeholder-color=$gray-500 (#64748b)
$form-label-margin-bottom=0.375rem
$form-label-font-size=$font-size-sm (0.8rem)
$form-label-font-weight=$font-weight-semibold (600)
$form-label-color=$gray-700 (#334155)
$table-cell-padding-y=0.375rem
$table-cell-padding-x=0.75rem
$table-cell-padding-y-sm=0.25rem
$table-cell-padding-x-sm=0.5rem
$table-striped-bg=$gray-50 (#f8fafc)
$table-hover-bg=rgba($primary, 0.05)
$table-border-color=$gray-300 (#cbd5e1)
$card-spacer-y=0.75rem
$card-spacer-x=1rem
$card-border-width=$border-width (1px)
$card-border-radius=$border-radius (0)
$card-border-color=$gray-300 (#cbd5e1)
$card-bg=white
$card-cap-bg=$gray-100 (#f1f5f9)
$dropdown-padding-y=0.375rem
$dropdown-spacer=0.125rem
$dropdown-font-size=$font-size-base (0.875rem)
$dropdown-bg=white
$dropdown-border-color=$gray-300 (#cbd5e1)
$dropdown-border-radius=$border-radius (0)
$dropdown-divider-bg=$gray-200 (#e2e8f0)
$dropdown-link-color=$gray-900 (#0f172a)
$dropdown-link-hover-color=$gray-900 (#0f172a)
$dropdown-link-hover-bg=$gray-100 (#f1f5f9)
$dropdown-link-active-color=white
$dropdown-link-active-bg=$primary ($blue-600)
$dropdown-item-padding-y=0.375rem
$dropdown-item-padding-x=0.75rem
$modal-inner-padding=1rem
$modal-header-padding-y=0.75rem
$modal-header-padding-x=1rem
$modal-header-border-color=$gray-300 (#cbd5e1)
$modal-content-border-radius=$border-radius-lg (0)
$nav-link-padding-y=0.375rem
$nav-link-padding-x=0.75rem
$nav-link-font-size=$font-size-base (0.875rem)
$nav-link-color=$gray-700 (#334155)
$nav-link-hover-color=$primary ($blue-600)
$navbar-padding-y=0.5rem
$navbar-padding-x=1rem
$navbar-brand-font-size=$font-size-lg (1rem)
$alert-padding-y=0.75rem
$alert-padding-x=1rem
$alert-border-radius=$border-radius (0)
$badge-font-size=$font-size-sm (0.8rem)
$badge-font-weight=$font-weight-semibold (600)
$badge-padding-y=0.25rem
$badge-padding-x=0.5rem
$badge-border-radius=$border-radius-sm (0)
$breadcrumb-padding-y=0.5rem
$breadcrumb-padding-x=0.75rem
$breadcrumb-item-padding-x=0.5rem
$breadcrumb-font-size=$font-size-sm (0.8rem)
$breadcrumb-bg=$gray-100 (#f1f5f9)
$breadcrumb-divider-color=$gray-500 (#64748b)
$breadcrumb-active-color=$gray-700 (#334155)
$pagination-padding-y=0.375rem
$pagination-padding-x=0.75rem
$pagination-font-size=$font-size-base (0.875rem)
$pagination-border-radius=$border-radius (0)
$pagination-color=$gray-700 (#334155)
$pagination-bg=white
$pagination-border-color=$gray-300 (#cbd5e1)
$pagination-hover-color=$primary ($blue-600)
$pagination-hover-bg=$gray-100 (#f1f5f9)
$pagination-hover-border-color=$gray-300 (#cbd5e1)
$pagination-active-color=white
$pagination-active-bg=$primary ($blue-600)
$pagination-active-border-color=$primary ($blue-600)
$toast-padding-x=0.75rem
$toast-padding-y=0.5rem
$toast-font-size=$font-size-sm (0.8rem)
$toast-border-radius=$border-radius (0)
$progress-height=0.75rem
$progress-font-size=$font-size-sm (0.8rem)
$progress-bg=$gray-200 (#e2e8f0)
$progress-border-radius=$border-radius (0)
$list-group-item-padding-y=0.5rem
$list-group-item-padding-x=0.75rem
$list-group-bg=white
$list-group-border-color=$gray-300 (#cbd5e1)
$list-group-border-radius=$border-radius (0)
$list-group-hover-bg=$gray-100 (#f1f5f9)
$list-group-active-color=white
$list-group-active-bg=$primary ($blue-600)
$list-group-active-border-color=$primary ($blue-600)
# ACCESSIBILITY
$min-contrast-ratio=4.5
$focus-ring-width=0.15rem
$focus-ring-opacity=0.25
$focus-ring-color=rgba($primary, $focus-ring-opacity)
$focus-ring-blur=0
$focus-ring-box-shadow=0 0 $focus-ring-blur $focus-ring-width $focus-ring-color
```

## Custom CSS Classes (from custom.scss)

```
.container
.container-fluid
.container-sm
.container-md
.container-lg
.container-xl
.container-xxl
.text-compact
.p-compact
.m-compact
.table-enterprise
.card-compact
.sidebar
.badge-status
.form-inline-compact
.form-label-inline
.btn-group-compact
.metric-card
.layout-dense
.modal-header-enterprise
.toolbar
.skip-link
```

## Component APIs

### bannerbar

- CSS: `dist/components/bannerbar/bannerbar.css`
- JS: `dist/components/bannerbar/bannerbar.js`

### colorpicker

- CSS: `dist/components/colorpicker/colorpicker.css`
- JS: `dist/components/colorpicker/colorpicker.js`

### conversation

- CSS: `dist/components/conversation/conversation.css`
- JS: `dist/components/conversation/conversation.js`
- Exports: `class names`, `class or`, `function pump`

### cronpicker

- CSS: `dist/components/cronpicker/cronpicker.css`
- JS: `dist/components/cronpicker/cronpicker.js`

### datepicker

- CSS: `dist/components/datepicker/datepicker.css`
- JS: `dist/components/datepicker/datepicker.js`

### docklayout

- CSS: `dist/components/docklayout/docklayout.css`
- JS: `dist/components/docklayout/docklayout.js`

### durationpicker

- CSS: `dist/components/durationpicker/durationpicker.css`
- JS: `dist/components/durationpicker/durationpicker.js`

### editablecombobox

- CSS: `dist/components/editablecombobox/editablecombobox.css`
- JS: `dist/components/editablecombobox/editablecombobox.js`

### emptystate

- CSS: `dist/components/emptystate/emptystate.css`
- JS: `dist/components/emptystate/emptystate.js`

### errordialog

- CSS: `dist/components/errordialog/errordialog.css`
- JS: `dist/components/errordialog/errordialog.js`

### gauge

- CSS: `dist/components/gauge/gauge.css`
- JS: `dist/components/gauge/gauge.js`

### logconsole

- CSS: `dist/components/logconsole/logconsole.css`
- JS: `dist/components/logconsole/logconsole.js`

### markdowneditor

- CSS: `dist/components/markdowneditor/markdowneditor.css`
- JS: `dist/components/markdowneditor/markdowneditor.js`

### maskedentry

- CSS: `dist/components/maskedentry/maskedentry.css`
- JS: `dist/components/maskedentry/maskedentry.js`

### progressmodal

- CSS: `dist/components/progressmodal/progressmodal.css`
- JS: `dist/components/progressmodal/progressmodal.js`

### sidebar

- CSS: `dist/components/sidebar/sidebar.css`
- JS: `dist/components/sidebar/sidebar.js`

### splitlayout

- CSS: `dist/components/splitlayout/splitlayout.css`
- JS: `dist/components/splitlayout/splitlayout.js`

### statusbar

- CSS: `dist/components/statusbar/statusbar.css`
- JS: `dist/components/statusbar/statusbar.js`

### tabbedpanel

- CSS: `dist/components/tabbedpanel/tabbedpanel.css`
- JS: `dist/components/tabbedpanel/tabbedpanel.js`
- Exports: `class for`

### timeline

- CSS: `dist/components/timeline/timeline.css`
- JS: `dist/components/timeline/timeline.js`
- Exports: `class added`, `class on`, `class on`

### timepicker

- CSS: `dist/components/timepicker/timepicker.css`
- JS: `dist/components/timepicker/timepicker.js`

### timezonepicker

- CSS: `dist/components/timezonepicker/timezonepicker.css`
- JS: `dist/components/timezonepicker/timezonepicker.js`

### toolbar

- CSS: `dist/components/toolbar/toolbar.css`
- JS: `dist/components/toolbar/toolbar.js`

### treegrid

- CSS: `dist/components/treegrid/treegrid.css`
- JS: `dist/components/treegrid/treegrid.js`
- Exports: `class on`, `class for`, `function for`

### treeview

- CSS: `dist/components/treeview/treeview.css`
- JS: `dist/components/treeview/treeview.js`
- Exports: `class on`, `class override`

