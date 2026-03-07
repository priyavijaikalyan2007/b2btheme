<!-- AGENT: Auto-generated — do not edit. Run `npm run build` to regenerate. -->

# Design Tokens

All design tokens defined in `src/scss/_variables.scss`, grouped by category.
These are the SCSS variables that control every aspect of the enterprise theme.

## COLOR PALETTE - Enterprise Blues, Grays, Blacks, Reds, and Greens

| Variable | Value | Description |
|----------|-------|-------------|
| `$blue-900` | `#0a2540` | Primary Blues (Professional, trustworthy) |
| `$blue-800` | `#0d3b66` |  |
| `$blue-700` | `#1864ab` |  |
| `$blue-600` | `#1c7ed6` |  |
| `$blue-500` | `#2196f3` |  |
| `$blue-400` | `#4dabf7` |  |
| `$blue-300` | `#74c0fc` |  |
| `$blue-200` | `#a5d8ff` |  |
| `$blue-100` | `#d0ebff` |  |
| `$gray-900` | `#0f172a` | Almost black |
| `$gray-800` | `#1e293b` |  |
| `$gray-700` | `#334155` |  |
| `$gray-600` | `#475569` |  |
| `$gray-500` | `#64748b` |  |
| `$gray-400` | `#94a3b8` |  |
| `$gray-300` | `#cbd5e1` |  |
| `$gray-200` | `#e2e8f0` |  |
| `$gray-100` | `#f1f5f9` |  |
| `$gray-50` | `#f8fafc` |  |
| `$green-900` | `#1b4332` | Greens (Success, positive actions) |
| `$green-800` | `#2d6a4f` |  |
| `$green-700` | `#40916c` |  |
| `$green-600` | `#52b788` |  |
| `$green-500` | `#2e7d32` |  |
| `$green-400` | `#74c69d` |  |
| `$green-300` | `#95d5b2` |  |
| `$green-200` | `#b7e4c7` |  |
| `$green-100` | `#d8f3dc` |  |
| `$red-900` | `#7f1d1d` | Reds (Errors, warnings, critical actions) |
| `$red-800` | `#991b1b` |  |
| `$red-700` | `#b91c1c` |  |
| `$red-600` | `#dc2626` |  |
| `$red-500` | `#ef4444` |  |
| `$red-400` | `#f87171` |  |
| `$red-300` | `#fca5a5` |  |
| `$red-200` | `#fecaca` |  |
| `$red-100` | `#fee2e2` |  |
| `$yellow-500` | `#f59e0b` | Additional accent colors |
| `$yellow-100` | `#fef3c7` |  |
| `$orange-500` | `#f97316` |  |
| `$orange-100` | `#ffedd5` |  |

## THEME COLORS

| Variable | Value | Description |
|----------|-------|-------------|
| `$primary` | `$blue-600 (#1c7ed6)` |  |
| `$secondary` | `$gray-600 (#475569)` |  |
| `$success` | `$green-600 (#52b788)` |  |
| `$info` | `$blue-500 (#2196f3)` |  |
| `$warning` | `$yellow-500 (#f59e0b)` |  |
| `$danger` | `$red-600 (#dc2626)` |  |
| `$light` | `$gray-100 (#f1f5f9)` |  |
| `$dark` | `$gray-900 (#0f172a)` |  |
| `$body-bg` | `$gray-50 (#f8fafc)` | Body |
| `$body-color` | `$gray-900 (#0f172a)` |  |
| `$link-color` | `$blue-700 (#1864ab)` | Links - Higher contrast for accessibility |
| `$link-decoration` | `none` |  |
| `$link-hover-color` | `$blue-800 (#0d3b66)` |  |
| `$link-hover-decoration` | `underline` |  |

## TYPOGRAPHY - Compact and professional

| Variable | Value | Description |
|----------|-------|-------------|
| `$font-family-sans-serif` | `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | Inter — screen-optimised variable sans-serif with excellent legibility at small sizes |
| `$font-family-monospace` | `"JetBrains Mono", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace` | JetBrains Mono - clear distinction between similar characters (0/O, 1/l/I) |
| `$font-size-base` | `0.875rem` | 14px (was 12px) |
| `$font-size-sm` | `0.8rem` | 12.8px (was 11px) |
| `$font-size-lg` | `1rem` | 16px (was 14px) |
| `$h1-font-size` | `1.75rem` | 28px — page titles |
| `$h2-font-size` | `1.5rem` | 24px — section headings |
| `$h3-font-size` | `1.25rem` | 20px — sub-section headings |
| `$h4-font-size` | `1.125rem` | 18px — card/dialog titles |
| `$h5-font-size` | `1rem` | 16px — group labels |
| `$h6-font-size` | `0.875rem` | 14px — matches body size |
| `$font-weight-light` | `300` |  |
| `$font-weight-normal` | `400` |  |
| `$font-weight-medium` | `500` |  |
| `$font-weight-semibold` | `600` |  |
| `$font-weight-bold` | `700` |  |
| `$line-height-base` | `1.4` | Compact UI elements |
| `$line-height-sm` | `1.3` | Tight: labels, badges, status text |
| `$line-height-lg` | `1.5` | Comfortable: dialog body, descriptions |
| `$line-height-relaxed` | `1.6` | Reading: articles, documentation, markdown |

## SPACING - Adjusted for larger text

| Variable | Value | Description |
|----------|-------|-------------|
| `$spacer` | `0.75rem` | 12px (was 10px) - increased for larger text |

## BORDERS & BORDER RADIUS - Sharp, professional edges

| Variable | Value | Description |
|----------|-------|-------------|
| `$border-width` | `1px` |  |
| `$border-color` | `$gray-300 (#cbd5e1)` |  |
| `$border-radius` | `0` | No rounding |
| `$border-radius-sm` | `0` | No rounding |
| `$border-radius-lg` | `0` | No rounding |
| `$border-radius-xl` | `0` | No rounding |
| `$border-radius-pill` | `0` | No rounding (pills become rectangles) |

## COMPONENTS - Compact sizing

| Variable | Value | Description |
|----------|-------|-------------|
| `$padding-y-sm` | `0.25rem` | 4px (was 3px) |
| `$padding-x-sm` | `0.5rem` | 8px (was 6px) |
| `$padding-y` | `0.375rem` | 6px (was 5px) |
| `$padding-x` | `0.75rem` | 12px (was 10px) |
| `$padding-y-lg` | `0.5rem` | 8px (was 7px) |
| `$padding-x-lg` | `1rem` | 16px (was 14px) |
| `$btn-padding-y` | `0.375rem` | 6px (was 5px) |
| `$btn-padding-x` | `0.75rem` | 12px (was 10px) |
| `$btn-font-size` | `$font-size-base (0.875rem)` |  |
| `$btn-line-height` | `$line-height-base (1.4)` |  |
| `$btn-padding-y-sm` | `0.25rem` | 4px (was 3px) |
| `$btn-padding-x-sm` | `0.5rem` | 8px (was 6px) |
| `$btn-font-size-sm` | `$font-size-sm (0.8rem)` |  |
| `$btn-padding-y-lg` | `0.5rem` | 8px (was 7px) |
| `$btn-padding-x-lg` | `1rem` | 16px (was 14px) |
| `$btn-font-size-lg` | `$font-size-lg (1rem)` |  |
| `$btn-border-radius` | `$border-radius (0)` |  |
| `$btn-border-radius-sm` | `$border-radius-sm (0)` |  |
| `$btn-border-radius-lg` | `$border-radius-lg (0)` |  |
| `$input-btn-padding-y` | `0.375rem` | 6px (was 5px) |
| `$input-btn-padding-x` | `0.75rem` | 12px (was 10px) |
| `$input-btn-font-size` | `$font-size-base (0.875rem)` |  |
| `$input-btn-line-height` | `$line-height-base (1.4)` |  |
| `$input-btn-padding-y-sm` | `0.25rem` | 4px (was 3px) |
| `$input-btn-padding-x-sm` | `0.5rem` | 8px (was 6px) |
| `$input-btn-font-size-sm` | `$font-size-sm (0.8rem)` |  |
| `$input-btn-padding-y-lg` | `0.5rem` | 8px (was 7px) |
| `$input-btn-padding-x-lg` | `1rem` | 16px (was 14px) |
| `$input-btn-font-size-lg` | `$font-size-lg (1rem)` |  |
| `$input-bg` | `$gray-50 (#f8fafc)` |  |
| `$input-disabled-bg` | `$gray-200 (#e2e8f0)` |  |
| `$input-disabled-border-color` | `$gray-300 (#cbd5e1)` |  |
| `$input-color` | `$body-color ($gray-900)` |  |
| `$input-border-color` | `$gray-300 (#cbd5e1)` |  |
| `$input-border-width` | `$border-width (1px)` |  |
| `$input-border-radius` | `$border-radius (0)` |  |
| `$input-focus-border-color` | `$primary ($blue-600)` |  |
| `$input-focus-box-shadow` | `0 0 0 0.15rem rgba($primary, 0.25)` |  |
| `$input-placeholder-color` | `$gray-500 (#64748b)` |  |
| `$form-label-margin-bottom` | `0.375rem` | 6px (was 5px) |
| `$form-label-font-size` | `$font-size-sm (0.8rem)` |  |
| `$form-label-font-weight` | `$font-weight-semibold (600)` |  |
| `$form-label-color` | `$gray-700 (#334155)` |  |
| `$table-cell-padding-y` | `0.375rem` | 6px (was 5px) |
| `$table-cell-padding-x` | `0.75rem` | 12px (was 10px) |
| `$table-cell-padding-y-sm` | `0.25rem` | 4px (was 3px) |
| `$table-cell-padding-x-sm` | `0.5rem` | 8px (was 6px) |
| `$table-striped-bg` | `$gray-50 (#f8fafc)` |  |
| `$table-hover-bg` | `rgba($primary, 0.05)` |  |
| `$table-border-color` | `$gray-300 (#cbd5e1)` |  |
| `$card-spacer-y` | `0.75rem` | 12px (was 10px) |
| `$card-spacer-x` | `1rem` | 16px (was 14px) |
| `$card-border-width` | `$border-width (1px)` |  |
| `$card-border-radius` | `$border-radius (0)` |  |
| `$card-border-color` | `$gray-300 (#cbd5e1)` |  |
| `$card-bg` | `white` |  |
| `$card-cap-bg` | `$gray-100 (#f1f5f9)` |  |
| `$dropdown-padding-y` | `0.375rem` | 6px (was 5px) |
| `$dropdown-spacer` | `0.125rem` |  |
| `$dropdown-font-size` | `$font-size-base (0.875rem)` |  |
| `$dropdown-bg` | `white` |  |
| `$dropdown-border-color` | `$gray-300 (#cbd5e1)` |  |
| `$dropdown-border-radius` | `$border-radius (0)` |  |
| `$dropdown-divider-bg` | `$gray-200 (#e2e8f0)` |  |
| `$dropdown-link-color` | `$gray-900 (#0f172a)` |  |
| `$dropdown-link-hover-color` | `$gray-900 (#0f172a)` |  |
| `$dropdown-link-hover-bg` | `$gray-100 (#f1f5f9)` |  |
| `$dropdown-link-active-color` | `white` |  |
| `$dropdown-link-active-bg` | `$primary ($blue-600)` |  |
| `$dropdown-item-padding-y` | `0.375rem` | 6px (was 5px) |
| `$dropdown-item-padding-x` | `0.75rem` | 12px (was 10px) |
| `$modal-inner-padding` | `1rem` | 16px (was 14px) |
| `$modal-header-padding-y` | `0.75rem` | 12px (was 10px) |
| `$modal-header-padding-x` | `1rem` | 16px (was 14px) |
| `$modal-header-border-color` | `$gray-300 (#cbd5e1)` |  |
| `$modal-content-border-radius` | `$border-radius-lg (0)` |  |
| `$nav-link-padding-y` | `0.375rem` | 6px (was 5px) |
| `$nav-link-padding-x` | `0.75rem` | 12px (was 10px) |
| `$nav-link-font-size` | `$font-size-base (0.875rem)` |  |
| `$nav-link-color` | `$gray-700 (#334155)` |  |
| `$nav-link-hover-color` | `$primary ($blue-600)` |  |
| `$navbar-padding-y` | `0.5rem` | 8px (was 7px) |
| `$navbar-padding-x` | `1rem` | 16px (was 14px) |
| `$navbar-brand-font-size` | `$font-size-lg (1rem)` |  |
| `$alert-padding-y` | `0.75rem` | 12px (was 10px) |
| `$alert-padding-x` | `1rem` | 16px (was 14px) |
| `$alert-border-radius` | `$border-radius (0)` |  |
| `$badge-font-size` | `$font-size-sm (0.8rem)` | Badges - adjusted |
| `$badge-font-weight` | `$font-weight-semibold (600)` |  |
| `$badge-padding-y` | `0.25rem` | 4px (was 3px) |
| `$badge-padding-x` | `0.5rem` | 8px (was 6px) |
| `$badge-border-radius` | `$border-radius-sm (0)` |  |
| `$breadcrumb-padding-y` | `0.5rem` | 8px (was 7px) |
| `$breadcrumb-padding-x` | `0.75rem` | 12px (was 10px) |
| `$breadcrumb-item-padding-x` | `0.5rem` | 8px (was 7px) |
| `$breadcrumb-font-size` | `$font-size-sm (0.8rem)` |  |
| `$breadcrumb-bg` | `$gray-100 (#f1f5f9)` |  |
| `$breadcrumb-divider-color` | `$gray-500 (#64748b)` |  |
| `$breadcrumb-active-color` | `$gray-700 (#334155)` |  |
| `$pagination-padding-y` | `0.375rem` | 6px (was 5px) |
| `$pagination-padding-x` | `0.75rem` | 12px (was 10px) |
| `$pagination-font-size` | `$font-size-base (0.875rem)` |  |
| `$pagination-border-radius` | `$border-radius (0)` |  |
| `$pagination-color` | `$gray-700 (#334155)` |  |
| `$pagination-bg` | `white` |  |
| `$pagination-border-color` | `$gray-300 (#cbd5e1)` |  |
| `$pagination-hover-color` | `$primary ($blue-600)` |  |
| `$pagination-hover-bg` | `$gray-100 (#f1f5f9)` |  |
| `$pagination-hover-border-color` | `$gray-300 (#cbd5e1)` |  |
| `$pagination-active-color` | `white` |  |
| `$pagination-active-bg` | `$primary ($blue-600)` |  |
| `$pagination-active-border-color` | `$primary ($blue-600)` |  |
| `$toast-padding-x` | `0.75rem` | 12px (was 10px) |
| `$toast-padding-y` | `0.5rem` | 8px (was 7px) |
| `$toast-font-size` | `$font-size-sm (0.8rem)` |  |
| `$toast-border-radius` | `$border-radius (0)` |  |
| `$progress-height` | `0.75rem` | 12px (was 10px) |
| `$progress-font-size` | `$font-size-sm (0.8rem)` |  |
| `$progress-bg` | `$gray-200 (#e2e8f0)` |  |
| `$progress-border-radius` | `$border-radius (0)` |  |
| `$list-group-item-padding-y` | `0.5rem` | 8px (was 7px) |
| `$list-group-item-padding-x` | `0.75rem` | 12px (was 10px) |
| `$list-group-bg` | `white` |  |
| `$list-group-border-color` | `$gray-300 (#cbd5e1)` |  |
| `$list-group-border-radius` | `$border-radius (0)` |  |
| `$list-group-hover-bg` | `$gray-100 (#f1f5f9)` |  |
| `$list-group-active-color` | `white` |  |
| `$list-group-active-bg` | `$primary ($blue-600)` |  |
| `$list-group-active-border-color` | `$primary ($blue-600)` |  |

## ACCESSIBILITY

| Variable | Value | Description |
|----------|-------|-------------|
| `$min-contrast-ratio` | `4.5` | Ensure minimum contrast ratios meet WCAG AA standards |
| `$focus-ring-width` | `0.15rem` | Focus visible styles for keyboard navigation |
| `$focus-ring-opacity` | `0.25` |  |
| `$focus-ring-color` | `rgba($primary, $focus-ring-opacity)` |  |
| `$focus-ring-blur` | `0` |  |
| `$focus-ring-box-shadow` | `0 0 $focus-ring-blur $focus-ring-width $focus-ring-color` |  |

## SPACING TOKENS — fixed-pixel scale for component internals

| Variable | Value | Description |
|----------|-------|-------------|
| `$sp-1` | `1px` |  |
| `$sp-2` | `2px` |  |
| `$sp-4` | `4px` |  |
| `$sp-6` | `6px` |  |
| `$sp-8` | `8px` |  |
| `$sp-10` | `10px` |  |
| `$sp-12` | `12px` |  |
| `$sp-16` | `16px` |  |
| `$sp-20` | `20px` |  |
| `$sp-24` | `24px` |  |
| `$sp-32` | `32px` |  |
| `$sp-40` | `40px` |  |
| `$sp-48` | `48px` |  |

## EXTENDED FONT SIZES

| Variable | Value | Description |
|----------|-------|-------------|
| `$font-size-2xs` | `0.625rem` | 10px |
| `$font-size-xs` | `0.75rem` | 12px |
| `$font-size-xl` | `1.125rem` | 18px |
| `$font-size-2xl` | `1.25rem` | 20px |
| `$font-size-3xl` | `1.5rem` | 24px |

## SHADOW ELEVATION SYSTEM

| Variable | Value | Description |
|----------|-------|-------------|
| `$shadow-xs` | `0 1px 2px rgba($gray-900, 0.06)` |  |
| `$shadow-sm` | `0 2px 8px rgba($gray-900, 0.12)` |  |
| `$shadow-md` | `0 4px 12px rgba($gray-900, 0.15)` |  |
| `$shadow-lg` | `0 4px 16px rgba($gray-900, 0.15)` |  |
| `$shadow-xl` | `0 8px 24px rgba($gray-900, 0.2)` |  |
| `$shadow-focus` | `0 0 0 0.15rem rgba($blue-600, 0.25)` |  |

## COMPONENT SIZING

| Variable | Value | Description |
|----------|-------|-------------|
| `$icon-size-xs` | `12px` |  |
| `$icon-size-sm` | `16px` |  |
| `$icon-size-md` | `20px` |  |
| `$icon-size-lg` | `24px` |  |
| `$icon-size-xl` | `32px` |  |
| `$control-height-xs` | `22px` |  |
| `$control-height-mini` | `$control-height-xs (22px)` | 22px — Ribbon 3-high stacking |
| `$control-height-sm` | `28px` |  |
| `$control-height-md` | `32px` |  |
| `$control-height-lg` | `40px` |  |
| `$control-height-xl` | `44px` |  |

