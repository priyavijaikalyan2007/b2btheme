<!-- AGENT: Product Requirements Document for the EmptyState component — centered placeholder shown when a view, list, or table has no data. -->

# EmptyState Component

**Status:** Draft
**Component name:** EmptyState
**Folder:** `./components/emptystate/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview
### 1.1 What Is It
A centered placeholder component shown when a view, list, table, or container has no data to display. It presents a large icon (or custom illustration), a heading, an optional description, an optional primary CTA button, and an optional secondary action link. Supports three size variants and a compact mode for embedding inside panels or cards.

### 1.2 Why Build It
Every data-driven SaaS application has screens that start empty: a project list before the first project, a search pane with no matches, a table after all rows are filtered out. Without a dedicated component, developers leave blank voids or build inconsistent one-off placeholders. A reusable EmptyState ensures consistent visual language, guided next actions, accessible semantic markup, and compact/full-page variants for any container context.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Stripe empty dashboards | Muted icon, clear heading, description, single CTA |
| Linear empty views | Centered layout, minimal illustration, action-oriented copy |
| Notion blank page | Large icon, welcoming heading, secondary help link |
| Shopify empty states | Illustration slot, primary and secondary actions |
| GitHub empty repos | Instructional description, prominent CTA button |

---

## 2. Anatomy
```
+----------------------------------+
|                                  |
|          +----------+            |
|          |  icon    |            |  (or custom illustration HTMLElement)
|          +----------+            |
|                                  |
|       No projects found          |  <-- heading (h3/h4/h5 by size)
|                                  |
|   Create your first project to   |  <-- description (muted text)
|   get started with the platform  |
|                                  |
|       [ + Create Project ]       |  <-- primary CTA button
|         Learn more               |  <-- secondary link
|                                  |
+----------------------------------+
```

| Element | Required | Description |
|---------|----------|-------------|
| Icon | Optional | Bootstrap Icons `<i>`. Default: `bi-inbox`. Hidden when `illustration` provided. |
| Illustration | Optional | Custom `HTMLElement` replacing the icon. |
| Heading | Required | `<h3>`, `<h4>`, or `<h5>` depending on size variant. |
| Description | Optional | Muted paragraph text below the heading. |
| Primary CTA | Optional | Bootstrap-styled `<button>` with optional icon. |
| Secondary link | Optional | Muted text link below the CTA. |

---

## 3. API
### 3.1 Interfaces
```typescript
interface EmptyStateOptions
{
    icon?: string;               // Bootstrap Icons class. Default: "bi-inbox"
    iconColor?: string;          // CSS colour for icon. Default: uses $gray-400
    heading: string;             // Primary heading text. Required.
    description?: string;        // Descriptive text below the heading
    actionLabel?: string;        // Primary CTA button label
    actionIcon?: string;         // CTA button Bootstrap Icons class
    actionVariant?: string;      // Bootstrap button variant. Default: "primary"
    onAction?: () => void;       // CTA click handler
    secondaryLabel?: string;     // Secondary link text
    onSecondary?: () => void;    // Secondary link handler
    illustration?: HTMLElement;  // Custom illustration (replaces icon)
    size?: "sm" | "md" | "lg";  // Default: "md"
    compact?: boolean;           // Reduced padding for panels. Default: false
    cssClass?: string;           // Additional CSS class(es) on root
}
```

### 3.2 Class: EmptyState

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the DOM tree. Does not attach to the page. |
| `show(containerId)` | Appends to container by ID string or `HTMLElement`. |
| `hide()` | Removes from DOM without destroying state. |
| `destroy()` | Hides and releases all internal references. |
| `getElement()` | Returns the root `HTMLElement`. |
| `setHeading(text)` | Updates heading via `textContent`. |
| `setDescription(text)` | Updates description via `textContent`. |
| `setIcon(iconClass)` | Replaces the icon class on the `<i>` element. |
| `showAction(label, callback)` | Shows or updates the CTA button with label and handler. |
| `hideAction()` | Hides the primary CTA button. |

### 3.3 Globals
```typescript
window.EmptyState = EmptyState;
window.createEmptyState = createEmptyState;   // convenience: create + show
```

---

## 4. Behaviour
### 4.1 Lifecycle
1. **Construction** -- Builds the full DOM tree. Applies size and compact classes. Does not attach.
2. **show(containerId)** -- Resolves container, appends root. Falls back to `document.body` with warning.
3. **hide()** -- Removes from DOM. State preserved for re-show.
4. **destroy()** -- Calls hide, nulls references, sets destroyed flag. Subsequent calls warn and no-op.

### 4.2 Icon vs Illustration
When `illustration` is provided, the icon `<i>` element is not created. The custom `HTMLElement` is inserted in the icon region. If both are specified, `illustration` takes precedence.

### 4.3 Dynamic Updates
`setHeading()`, `setDescription()`, and `setIcon()` update via `textContent` (never `innerHTML`). `showAction()` creates the button if absent, or updates label and rebinds click handler. `hideAction()` sets `display: none` so it can be re-shown without reconstruction.

### 4.4 Size Variants

| Size | Heading | Icon Size | Vertical Padding |
|------|---------|-----------|------------------|
| `sm` | `<h5>` | 2rem | 1.5rem |
| `md` | `<h4>` | 3rem | 3rem |
| `lg` | `<h3>` | 4rem | 5rem |

### 4.5 Compact Mode
When `compact: true`, vertical padding is halved and icon size reduced by one step. Intended for cards, sidebar panels, or tabbed panel content areas.

---

## 5. Styling
### 5.1 CSS Classes

| Class | Element |
|-------|---------|
| `.emptystate` | Root container -- flex column, centered |
| `.emptystate-sm` / `-md` / `-lg` | Size variants |
| `.emptystate-compact` | Reduced padding for panel embedding |
| `.emptystate-icon` | Icon `<i>` element |
| `.emptystate-illustration` | Wrapper for custom illustration |
| `.emptystate-heading` | Heading element (`h3`/`h4`/`h5`) |
| `.emptystate-description` | Description paragraph |
| `.emptystate-action` | Primary CTA `<button>` |
| `.emptystate-secondary` | Secondary link |

### 5.2 Theme Integration
- Icon colour: `$gray-400` (overridable via `iconColor` inline style)
- Heading colour: `$gray-900`
- Description colour: `$gray-500`
- Secondary link: `$gray-500`, hover `$gray-700`
- CTA button: standard Bootstrap `.btn-{variant}` classes
- Background: transparent (inherits from container)
- SCSS import: `@import '../../src/scss/variables'`

---

## 6. Keyboard Interaction

| Key | Element | Action |
|-----|---------|--------|
| Tab | CTA button | Focuses the primary CTA button |
| Enter / Space | CTA button | Activates `onAction` |
| Tab | Secondary link | Focuses the secondary link |
| Enter / Space | Secondary link | Activates `onSecondary` |

No custom key handlers needed -- relies on native `<button>` behaviour.

---

## 7. Accessibility
- **Heading**: native `<h3>`/`<h4>`/`<h5>` element, maintains document outline.
- **Icon / Illustration**: `aria-hidden="true"` (decorative).
- **Description**: auto-generated `id`; CTA button references it via `aria-describedby`.
- **CTA button**: native `<button>` element.
- **Secondary link**: native `<button>` styled as link.
- All colour combinations meet WCAG AA contrast.

---

## 8. Dependencies
- **Bootstrap 5 CSS** -- `$gray-*` variables, `.btn-*` classes, spacing utilities.
- **Bootstrap Icons** -- default icon and optional CTA button icon.
- No JavaScript framework dependencies.

---

## 9. Open Questions
None at this time.
