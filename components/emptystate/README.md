<!-- AGENT: Documentation for the EmptyState component — centered placeholder for empty views. -->

# EmptyState

A centered placeholder component shown when a view, list, table, or container has no data. Presents a large icon (or custom illustration), heading, optional description, primary CTA button, and secondary link. Supports three size variants and compact mode.

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/emptystate/emptystate.css` |
| JS | `dist/components/emptystate/emptystate.js` |
| Types | `dist/components/emptystate/emptystate.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$gray-*`) and `.btn-*` classes
- **Bootstrap Icons** — for default and CTA button icons
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/emptystate/emptystate.css">
<script src="dist/components/emptystate/emptystate.js"></script>
<script>
    var empty = createEmptyState("my-container", {
        heading: "No projects found",
        description: "Create your first project to get started.",
        actionLabel: "Create Project",
        actionIcon: "bi-plus-lg",
        onAction: function() { console.log("Create clicked"); }
    });
</script>
```

## Options (EmptyStateOptions)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `icon` | `string` | `"bi-inbox"` | Bootstrap Icons class |
| `iconColor` | `string` | — | CSS colour for icon |
| `heading` | `string` | **required** | Primary heading text |
| `description` | `string` | — | Descriptive text below heading |
| `actionLabel` | `string` | — | Primary CTA button label |
| `actionIcon` | `string` | — | CTA button icon class |
| `actionVariant` | `string` | `"primary"` | Bootstrap button variant |
| `onAction` | `function` | — | CTA click handler |
| `secondaryLabel` | `string` | — | Secondary link text |
| `onSecondary` | `function` | — | Secondary link handler |
| `illustration` | `HTMLElement` | — | Custom element replacing icon |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `compact` | `boolean` | `false` | Reduced padding for panels |
| `cssClass` | `string` | — | Additional CSS class(es) |

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `show(containerId?)` | `void` | Append to container (or body) |
| `hide()` | `void` | Remove from DOM, keep state |
| `destroy()` | `void` | Hide, clean up, null references |
| `getElement()` | `HTMLElement` | Root DOM element |
| `setHeading(text)` | `void` | Update heading text |
| `setDescription(text)` | `void` | Update description text |
| `setIcon(iconClass)` | `void` | Replace icon class |
| `showAction(label, callback)` | `void` | Show/update CTA button |
| `hideAction()` | `void` | Hide CTA button |

### Global Exports

```
window.EmptyState
window.createEmptyState
```

## Accessibility

- Heading uses native `<h3>`/`<h4>`/`<h5>` for document outline
- Icon/illustration has `aria-hidden="true"` (decorative)
- CTA button references description via `aria-describedby`
- Secondary link is a native `<button>` element

See `specs/emptystate.prd.md` for the complete specification.
