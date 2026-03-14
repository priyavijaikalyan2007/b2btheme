# Dark Mode Guidelines

This document describes the dark mode architecture and the rules every component
MUST follow to be dark-mode compatible from day one. It is referenced from
`AGENTS.md` and is mandatory reading before creating or modifying any component.

---

## 1. Architecture Overview

Dark mode is controlled by the `data-bs-theme="dark"` attribute on the `<html>`
element. The `ThemeToggle` component (`components/themetoggle/`) manages this
attribute at runtime, persisting the preference to `localStorage`.

All theme-aware colours are defined as **CSS custom properties** (tokens) in
`src/scss/_dark-mode.scss`:

| Scope | Purpose |
|---|---|
| `:root { ... }` | Light-mode defaults (`--theme-*` tokens). |
| `[data-bs-theme="dark"] { ... }` | Dark-mode overrides for the same tokens. |
| `[data-bs-theme="dark"] .bootstrap-class { ... }` | Bootstrap component-scoped CSS variable overrides (required because Bootstrap sets component vars on CLASS selectors, not `:root`). |

---

## 2. Rules for Component SCSS

### 2.1 Always Use `var(--theme-*)` Tokens

Never use raw Sass colour variables (`$gray-100`, `$blue-600`, etc.) for any
property that affects the visual appearance in both modes. Use the semantic
tokens instead:

```scss
// WRONG — hardcoded, breaks in dark mode
background-color: $gray-100;
color: $gray-800;
border: 1px solid $gray-300;

// CORRECT — adapts automatically
background-color: var(--theme-surface-raised-bg);
color: var(--theme-text-primary);
border: 1px solid var(--theme-border-color);
```

### 2.2 Token Reference (Quick Lookup)

| Token | Light | Dark | Use for |
|---|---|---|---|
| `--theme-body-bg` | `$gray-50` | `$gray-900` | Page/body background |
| `--theme-surface-bg` | `$gray-50` | `$gray-800` | Component backgrounds |
| `--theme-surface-raised-bg` | `$gray-100` | `$gray-700` | Headers, sidebars, raised panels |
| `--theme-surface-sunken-bg` | `$gray-200` | `$gray-900` | Inset areas, code blocks |
| `--theme-text-primary` | `$gray-900` | `$gray-100` | Primary text, headings |
| `--theme-text-secondary` | `$gray-700` | `$gray-300` | Body text, descriptions |
| `--theme-text-muted` | `$gray-500` | `$gray-500` | Subtle labels, hints |
| `--theme-text-on-primary` | `$gray-50` | `$gray-50` | Text on primary-coloured bg |
| `--theme-border-color` | `$gray-300` | `$gray-600` | Standard borders |
| `--theme-border-subtle` | `$gray-200` | `$gray-700` | Subtle separators |
| `--theme-hover-bg` | `$gray-100` | `$gray-700` | Hover states |
| `--theme-active-bg` | `$gray-200` | `$gray-600` | Active/pressed states |
| `--theme-selected-bg` | blue@0.08 | blue@0.15 | Selected/highlight rows |
| `--theme-primary` | `$blue-600` | `$blue-400` | Primary action colour |
| `--theme-primary-hover` | `$blue-700` | `$blue-300` | Primary hover |
| `--theme-success` | `$green-600` | `$green-500` | Success indicators |
| `--theme-warning` | `$yellow-500` | `$yellow-500` | Warning indicators |
| `--theme-danger` | `$red-600` | `$red-500` | Error/danger indicators |
| `--theme-input-bg` | `$gray-50` | `$gray-800` | Form input backgrounds |
| `--theme-input-border` | `$gray-300` | `$gray-600` | Form input borders |
| `--theme-input-color` | `$gray-900` | `$gray-100` | Form input text |
| `--theme-input-placeholder` | `$gray-400` | `$gray-500` | Placeholder text |
| `--theme-shadow-*` | subtle | stronger | Box shadows (xs/sm/md/lg/xl) |

### 2.3 Contrast Requirements

- **Muted text** (`--theme-text-muted`) is `$gray-500` in BOTH modes. Use it
  only for non-essential labels, timestamps, or hints — never for primary
  content or interactive controls.
- **Section headers** (like "CONTENTS", "ON THIS PAGE") must use
  `--theme-text-secondary` at minimum, not `--theme-text-muted`.
- **Interactive controls** (close, collapse, popout buttons) must use
  `--theme-text-secondary` at minimum so they remain visible on dark surfaces.

### 2.4 Bootstrap Variable Overrides

Bootstrap sets component CSS variables on CLASS selectors (`.card`, `.modal`,
`.dropdown-menu`, etc.), not on `:root`. This means overriding them in
`[data-bs-theme="dark"]` alone does NOT work. You must scope inside the class:

```scss
// WRONG — ignored by Bootstrap specificity
[data-bs-theme="dark"] {
    --bs-card-bg: #{$gray-800};
}

// CORRECT — inside the class selector
[data-bs-theme="dark"] {
    .card {
        --bs-card-bg: #{$gray-800};
        --bs-card-color: #{$gray-100};
    }
}
```

When using Bootstrap component variables (e.g., `$card-bg`,
`$modal-header-border-color`, `$progress-bg`) in custom component SCSS, replace
them with `var(--theme-*)` tokens so they automatically adapt:

```scss
// WRONG — $card-bg is a compiled Sass value, not theme-aware
background-color: $card-bg;

// CORRECT
background-color: var(--theme-surface-bg);
```

---

## 3. Rules for Component TypeScript

### 3.1 SVG / Canvas Colours

Components that render SVG or `<canvas>` elements cannot use CSS `var()` in
attribute values. Use the `resolveThemeColor()` helper:

```ts
function resolveThemeColor(prop: string, fallback: string): string
{
    const val = getComputedStyle(document.documentElement)
        .getPropertyValue(prop).trim();
    return val || fallback;
}

// Usage:
const fill = resolveThemeColor("--theme-text-primary", "#0f172a");
```

**Important:** `resolveThemeColor` captures the value at call time. If the
theme toggles after the component is rendered, the baked-in SVG attributes
will be stale. Components that use `resolveThemeColor` SHOULD listen for
theme changes and re-render:

```ts
const observer = new MutationObserver(() => this.reRender());
observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-bs-theme"]
});
```

### 3.2 Inline Styles

Avoid setting colour-related inline styles (`el.style.color`,
`el.style.backgroundColor`) from TypeScript. Prefer CSS classes that use
`var(--theme-*)` tokens. If inline styles are unavoidable (e.g., LogConsole
per-level colours), resolve the values from theme tokens at construction AND
re-resolve on theme change.

---

## 4. Rules for Embedded / Injected Content

Components like `Conversation`, `DocViewer`, `HelpDrawer`, and
`MarkdownEditor` render user-provided or Vditor-generated HTML. This content
may include hardcoded backgrounds, Bootstrap utility classes, or third-party
styles that break in dark mode.

### 4.1 Vditor / Markdown Table Fix

Vditor's `.vditor-reset` class may inject opaque table backgrounds. Override
them inside the component's message content scope:

```scss
.conversation-message-content {
    .vditor-reset table td {
        background: transparent !important;
        color: inherit;
    }
}
```

The global override in `_dark-mode.scss` handles this for `[data-bs-theme="dark"]`.

### 4.2 Bootstrap Utility Overrides

Always override these classes inside content areas:

| Class | Dark mode override |
|---|---|
| `.bg-light` | `var(--theme-surface-raised-bg)` |
| `.bg-white` | `var(--theme-surface-bg)` |
| `.text-dark` | `var(--theme-text-primary)` |
| `.text-muted` | `var(--theme-text-muted)` |

---

## 5. Testing Checklist

Before submitting a component, verify in BOTH light and dark mode:

1. **Text contrast**: All text is readable against its background. Use
   browser DevTools' contrast checker. Aim for WCAG AA (4.5:1 for normal
   text, 3:1 for large text).
2. **Borders visible**: Borders and separators are visible but not glaring.
3. **Interactive controls**: Close, collapse, expand, popout buttons are
   clearly visible — not dark-on-dark or light-on-light.
4. **Tables**: Header row has raised background, body rows are transparent
   or use subtle striping. Text in all cells is readable.
5. **Badges / pills**: Status badges (success, warning, danger, info) use
   `var(--theme-*)` status tokens with semi-transparent backgrounds.
6. **Inputs / forms**: All form controls have visible borders and readable text.
7. **SVG / Canvas**: If the component renders SVG or canvas, toggle themes
   and verify labels and fills update.
8. **Embedded content**: If the component renders user HTML or Markdown,
   inject a table, a code block, and a `.bg-light` div, then verify in dark.

---

## 6. Where to Add Dark Mode Overrides

| Scenario | Location |
|---|---|
| Component uses `var(--theme-*)` tokens | Component SCSS file — no override needed |
| Component inherits from Bootstrap class | `src/scss/_dark-mode.scss` → `[data-bs-theme="dark"] .class { }` |
| Component sets inline styles from TS | `src/scss/_dark-mode.scss` → override with `!important` |
| New semantic token needed | `:root` + `[data-bs-theme="dark"]` in `_dark-mode.scss` |

---

## 7. Common Mistakes to Avoid

1. **Using `$gray-*` Sass variables** for colours instead of `var(--theme-*)`
   tokens. Sass variables are compiled to static values and do not switch.
2. **Using `--theme-text-muted`** for interactive controls or section headers.
   It is `$gray-500` in both modes — too faint on dark backgrounds for
   important elements.
3. **Forgetting Bootstrap specificity** — overriding `--bs-*` vars without
   scoping them inside the Bootstrap class selector.
4. **Baking SVG fills** with `resolveThemeColor` at render time without a
   theme-change listener.
5. **Using `$white` or `$black`** directly — these may not be in scope and
   do not adapt. Use `$gray-50` / `$gray-900` or, better, theme tokens.
6. **Hardcoded `rgba()` with fixed colours** — use the RGB channel tokens
   (`--theme-text-primary-rgb`, `--theme-surface-bg-rgb`) for alpha control:
   `rgba(var(--theme-text-primary-rgb), 0.5)`.
