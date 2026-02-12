<!-- AGENT: Product Requirements Document for the StatusBar component — structure, behaviour, API, and accessibility requirements. -->

# StatusBar Component

**Status:** Draft
**Component name:** StatusBar
**Folder:** `./components/statusbar/`
**Spec author:** Agent
**Date:** 2026-02-12

---

## 1. Overview

### 1.1 What Is It

A fixed-to-bottom viewport status bar that displays configurable label/value regions separated by pipe (`|`) dividers. The bar spans the full viewport width and sits below all page content but above the page scroll. It provides at-a-glance contextual information — connection status, user identity, environment name, record counts, timestamps, and similar metadata.

Text within the status bar is **natively selectable** so users can highlight and copy content (including dividers) with Ctrl+C.

### 1.2 Why Build It

Enterprise SaaS applications frequently need a persistent footer bar to show:

- Connection status and environment indicators (Dev, Staging, Production)
- Logged-in user and role information
- Current record or page context (e.g., "23 records selected")
- Timestamps such as last refresh or last saved
- Version strings and build identifiers

Without a dedicated component, developers build bespoke status bars that are inconsistent in styling, z-index handling, and accessibility. A reusable, programmable status bar solves all three problems.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| VS Code Status Bar | Fixed bottom bar, coloured sections, label-value pairs |
| JetBrains IDE Status Bar | Icon + label regions with `\|` dividers |
| Windows File Explorer Status Bar | Item count, selection info, view controls |

---

## 2. Anatomy

```
┌──────────────────────────────────────────────────────────────────────┐
│ ● Connected  |  Environment: Production  |  User: jsmith  |  v2.4.1 │
└──────────────────────────────────────────────────────────────────────┘
```

- **Regions** — Each region is a flex item containing an optional icon, optional label, and optional value.
- **Dividers** — A literal `|` text character between regions, styled in muted colour. Using text (not CSS borders) ensures the divider is captured when the user selects and copies text.
- **Bar** — A full-width, fixed-bottom container with dark background and light text.

---

## 3. API

### 3.1 Interfaces

```typescript
interface StatusBarRegion
{
    /** Unique identifier for this region. */
    id: string;

    /** Optional label displayed before the value in semi-bold. */
    label?: string;

    /** The value text. */
    value?: string;

    /** Optional Bootstrap Icons class (e.g., "bi-circle-fill"). */
    icon?: string;

    /** Optional minimum width (CSS value, e.g., "100px"). */
    minWidth?: string;
}

interface StatusBarOptions
{
    /** The regions to display, in order. */
    regions: StatusBarRegion[];

    /** Height variant. Default: "md". */
    size?: "sm" | "md" | "lg";

    /** Background colour (CSS value). Default: uses $gray-800. */
    backgroundColor?: string;

    /** Text colour (CSS value). Default: uses $gray-300. */
    textColor?: string;

    /** Label colour (CSS value). Default: uses $gray-400. */
    labelColor?: string;

    /** Font size (CSS value). Overrides the size-based default. */
    fontSize?: string;

    /** CSS z-index. Default: 1040. */
    zIndex?: number;

    /** Additional CSS class(es) to add to the root element. */
    cssClass?: string;

    /** Show pipe dividers between regions. Default: true. */
    showDividers?: boolean;

    /** Divider character. Default: "|". */
    dividerChar?: string;
}
```

### 3.2 Class: StatusBar

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the status bar with given options. |
| `show()` | Appends the bar to `document.body` and sets `--statusbar-height` on `<html>`. |
| `hide()` | Removes the bar from the DOM and clears `--statusbar-height`. |
| `destroy()` | Hides and cleans up all internal state. |
| `setValue(regionId, value)` | Updates the value text of a region by ID. O(1) lookup. |
| `getValue(regionId)` | Returns the current value text of a region. |
| `setIcon(regionId, iconClass)` | Updates the Bootstrap Icons class on a region. |
| `getAllText()` | Returns a plain-text representation of the full bar for clipboard use. |
| `addRegion(region, index?)` | Inserts a new region at the given index (end if omitted). |
| `removeRegion(regionId)` | Removes a region by ID. |

### 3.3 Globals

```typescript
window.StatusBar = StatusBar;
window.createStatusBar = createStatusBar;
```

`createStatusBar(options)` is a convenience function that creates and shows in one call.

---

## 4. Behaviour

### 4.1 Lifecycle

1. **Construction** — Builds the DOM tree but does not attach to the page.
2. **show()** — Appends to `<body>`, sets CSS custom property `--statusbar-height` on `<html>`.
3. **hide()** — Removes from DOM, clears the CSS property.
4. **destroy()** — Calls hide, nulls all references.

### 4.2 Region Updates

`setValue(regionId, value)` uses a `Map<string, HTMLElement>` for O(1) lookups. The value element's `textContent` is set directly (no innerHTML).

### 4.3 Dynamic Regions

`addRegion()` builds a new region element, inserts it at the specified index (with dividers on either side as needed), and registers it in the lookup map.

`removeRegion()` removes the region element and its adjacent divider, then deregisters from the map.

### 4.4 Text Selectability

**No `user-select: none` is applied anywhere** on the status bar. All text — labels, values, icons, and dividers — is natively selectable. When a user highlights the full bar and presses Ctrl+C, the copied text includes divider characters.

### 4.5 CSS Custom Property

On `show()`, the component sets `document.documentElement.style.setProperty("--statusbar-height", "<height>px")`. Other components can use `bottom: var(--statusbar-height, 0px)` to offset themselves above the status bar.

On `hide()` or `destroy()`, the property is removed.

---

## 5. Styling

### 5.1 CSS Classes

| Class | Element |
|-------|---------|
| `.statusbar` | Root container — fixed bottom, flex row |
| `.statusbar-sm` / `.statusbar-md` / `.statusbar-lg` | Size variants (24/28/34px height) |
| `.statusbar-region` | Individual region — flex item, nowrap, ellipsis |
| `.statusbar-divider` | `\|` character in muted colour |
| `.statusbar-label` | Semi-bold label text |
| `.statusbar-value` | Value text |
| `.statusbar-icon` | Bootstrap Icons `<i>` element |

### 5.2 Theme Integration

- Background: `$gray-800`
- Text: `$gray-300`
- Labels: `$gray-400`
- Dividers: `$gray-600`
- Values: `$gray-200`
- Font: inherits `$font-family-base`

### 5.3 Z-Index

Default `z-index: 1040` — above Bootstrap's fixed navbar (1030), below modal backdrop (1050).

---

## 6. Accessibility

- Root element: `role="status"` with `aria-live="polite"`.
- Region updates trigger screen reader announcements via the live region.
- No `user-select: none` — content is fully selectable.
- Sufficient colour contrast (light text on dark background meets WCAG AA).

---

## 7. Dependencies

- **Bootstrap 5 CSS** — for `$gray-*` variables in SCSS.
- **Bootstrap Icons** — optional, for region icons.
- No JavaScript framework dependencies.

---

## 8. Open Questions

None at this time.
