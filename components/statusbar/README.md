<!-- AGENT: Documentation for the StatusBar component. -->

# StatusBar

A fixed-to-bottom viewport status bar with configurable label/value regions separated by pipe dividers. Text is natively selectable for Ctrl+C copying.

## Quick Start

```html
<link rel="stylesheet" href="https://static.knobby.io/components/statusbar/statusbar.css">
<script src="https://static.knobby.io/components/statusbar/statusbar.js"></script>

<script>
    var bar = createStatusBar({
        regions: [
            { id: "status", icon: "bi-circle-fill", value: "Connected" },
            { id: "env", label: "Environment:", value: "Production" },
            { id: "user", label: "User:", value: "jsmith" },
            { id: "version", value: "v2.4.1" }
        ]
    });

    // Update a value dynamically
    bar.setValue("user", "adoe");

    // Read a value
    var user = bar.getValue("user"); // "adoe"

    // Get all text (including dividers)
    var text = bar.getAllText();
    // "Connected | Environment: Production | User: adoe | v2.4.1"
</script>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `regions` | `StatusBarRegion[]` | Required | Regions to display |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Height variant (24/28/34px) |
| `backgroundColor` | `string` | `$gray-800` | Background colour |
| `textColor` | `string` | `$gray-300` | Text colour |
| `labelColor` | `string` | `$gray-400` | Label colour |
| `fontSize` | `string` | — | Font size override |
| `zIndex` | `number` | `1040` | CSS z-index |
| `cssClass` | `string` | — | Additional CSS class(es) |
| `showDividers` | `boolean` | `true` | Show pipe dividers |
| `dividerChar` | `string` | `"\|"` | Divider character |

## Region Definition

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Required. Unique identifier |
| `label` | `string` | Optional semi-bold label |
| `value` | `string` | Optional value text |
| `icon` | `string` | Optional Bootstrap Icons class (e.g., `"bi-circle-fill"`) |
| `minWidth` | `string` | Optional minimum width (CSS value) |

## Instance Methods

| Method | Description |
|--------|-------------|
| `show()` | Append to body, set `--statusbar-height` |
| `hide()` | Remove from DOM, clear CSS property |
| `destroy()` | Hide and release all references |
| `setValue(id, value)` | Update region value text |
| `getValue(id)` | Get region value text |
| `setIcon(id, cls)` | Update region icon class |
| `getAllText()` | Get full bar text with dividers |
| `addRegion(region, index?)` | Add a region dynamically |
| `removeRegion(id)` | Remove a region by ID |
| `isVisible()` | Check visibility state |

## Size Variants

| Size | Height | Font Size |
|------|--------|-----------|
| `sm` | 24px | ~11.5px |
| `md` | 28px | 12.25px |
| `lg` | 34px | 14px (base) |

## CSS Custom Property

When visible, the bar sets `--statusbar-height` on `<html>`. Other components can use:

```css
.my-fixed-element {
    bottom: var(--statusbar-height, 0px);
}
```

## Accessibility

- `role="status"` with `aria-live="polite"` for screen reader announcements.
- No `user-select: none` — all text is natively selectable.
- Light text on dark background meets WCAG AA contrast requirements.

## Dependencies

- Bootstrap 5 CSS (for SCSS variables), Bootstrap Icons (optional), Enterprise Theme CSS.
- Does NOT require Bootstrap JS.
