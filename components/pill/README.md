<!-- AGENT: Documentation for the Pill component — inline entity reference element. -->

# Pill

A reusable inline pill element for mentions, issues, documents, tags, and other entity references. Designed to flow naturally within text content, following the rounded-end style of Google Docs and GitHub.

**Note:** The rounded border-radius (`9999px`) is an explicit exception to the theme's zero-radius rule (see ADR-034).

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/pill/pill.css` |
| JS | `components/pill/pill.js` |
| Types | `components/pill/pill.d.ts` |

## Requirements

- **Bootstrap CSS** — for SCSS variables (`$blue-500`, `$gray-100`, etc.)
- **Bootstrap Icons** — for optional icon and dismiss button (`bi bi-x`)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/pill/pill.css">
<script src="components/pill/pill.js"></script>
<script>
    var pill = createPill({ label: "@Alice Chen", icon: "bi bi-person" });
    document.getElementById("container").appendChild(pill.getElement());

    var dismissible = createPill({
        label: "PROJ-101",
        color: "green",
        dismissible: true,
        onDismiss: function(p) { console.log("Dismissed"); }
    });
    document.getElementById("container").appendChild(dismissible.getElement());
</script>
```

## API

### Global Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `createPill(options)` | `Pill` | Create a pill instance |

### Pill Class

| Method | Returns | Description |
|--------|---------|-------------|
| `getElement()` | `HTMLElement` | Get the root DOM element |
| `setLabel(text)` | `void` | Update label text and aria-label |
| `setColor(color)` | `void` | Swap colour preset class |
| `setStyle(overrides)` | `void` | Apply inline style overrides via CSS custom properties |
| `destroy()` | `void` | Remove listeners, remove from DOM, null refs |

### PillOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `label` | `string` | **required** | Display text |
| `icon` | `string` | — | Bootstrap icon class, e.g. `"bi bi-person"` |
| `color` | `PillColor` | `"blue"` | Preset: `blue`, `gray`, `green`, `red`, `purple`, `orange` |
| `background` | `string` | — | CSS override (takes precedence over preset) |
| `foreground` | `string` | — | CSS text colour override |
| `borderColor` | `string` | — | CSS border-color override |
| `borderRadius` | `string` | — | CSS override, default `9999px` |
| `size` | `string` | `"md"` | `"sm"`, `"md"`, `"lg"` |
| `dismissible` | `boolean` | `false` | Show close button |
| `clickable` | `boolean` | `false` | Pointer cursor + click/keyboard activation |
| `href` | `string` | — | Render as `<a>` instead of `<span>` |
| `tooltip` | `string` | — | Native title attribute |
| `cssClass` | `string` | — | Additional CSS class(es) |
| `metadata` | `Record<string, string>` | — | `data-*` attributes |
| `onClick` | `(pill) => void` | — | Click/keyboard activation callback |
| `onDismiss` | `(pill) => void` | — | Dismiss button callback |
| `onHover` | `(pill, event) => void` | — | mouseenter callback |
| `onHoverOut` | `(pill, event) => void` | — | mouseleave callback |

### PillStyleOverrides

| Property | Type | Description |
|----------|------|-------------|
| `background` | `string` | Sets `--pill-bg` |
| `foreground` | `string` | Sets `--pill-fg` |
| `borderColor` | `string` | Sets `--pill-border-color` |
| `borderRadius` | `string` | Sets `--pill-border-radius` |

## Colour Presets

| Preset | Background | Text |
|--------|-----------|------|
| `blue` (default) | `rgba($blue-500, 0.10)` | `$blue-700` |
| `gray` | `$gray-100` | `$gray-700` |
| `green` | `rgba($green-600, 0.10)` | `$green-800` |
| `red` | `rgba($red-600, 0.10)` | `$red-800` |
| `purple` | `rgba(139, 92, 246, 0.10)` | `rgb(91, 33, 182)` |
| `orange` | `rgba($orange-500, 0.10)` | `#c2410c` |

## Size Variants

| Size | Padding | Font Size |
|------|---------|-----------|
| `sm` | `1px 6px` | `$font-size-sm * 0.9` |
| `md` | `2px 8px` | `$font-size-sm` |
| `lg` | `3px 10px` | `$font-size-base` |

## CSS Custom Properties

All visual properties use CSS custom properties for runtime override:

```css
.pill {
    --pill-bg: ...;
    --pill-fg: ...;
    --pill-border-color: ...;
    --pill-border-radius: ...;
    --pill-padding: ...;
    --pill-font-size: ...;
    --pill-max-width: ...;
}
```

Override via JavaScript:

```javascript
pill.setStyle({ background: "pink", borderRadius: "4px" });
```

Or via inline style:

```javascript
pill.getElement().style.setProperty("--pill-max-width", "300px");
```

## STIE Integration

Pill is designed to complement the Smart Text Input Engine (STIE). Apps wanting full Pill features in STIE tokens use both class sets:

```javascript
className: "stie-token-pill pill pill-blue"
```

When Pill CSS is loaded alongside STIE CSS, the Pill's custom properties layer on top.

## Accessibility

- `role="status"` and `aria-label` on root element
- Dismiss button has `aria-label="Remove"`
- Clickable pills have `tabindex="0"` and respond to Enter/Space
- Icons use `aria-hidden="true"`
- Entrance animation respects `prefers-reduced-motion`

## DOM Structure

```html
<span class="pill pill-blue pill-md" role="status" aria-label="Alice Chen">
    <i class="bi bi-person pill-icon" aria-hidden="true"></i>
    <span class="pill-label">@Alice Chen</span>
    <button class="pill-dismiss" aria-label="Remove" tabindex="-1">
        <i class="bi bi-x" aria-hidden="true"></i>
    </button>
</span>
```
