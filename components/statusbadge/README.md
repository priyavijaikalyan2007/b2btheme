<!-- AGENT: Documentation for the StatusBadge component. -->

# StatusBadge

Colour-coded pills/dots communicating process or system state with animated pulse and click-for-detail support. Supports seven built-in statuses plus a custom mode, three visual variants, and four sizes.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/statusbadge/statusbadge.css` |
| JS | `components/statusbadge/statusbadge.js` |

## Quick Start

```html
<link rel="stylesheet" href="components/statusbadge/statusbadge.css">
<script src="components/statusbadge/statusbadge.js"></script>

<div id="status-container"></div>

<script>
    // Factory function — creates and shows in one call
    var badge = createStatusBadge("status-container", {
        status: "operational",
        variant: "indicator"
    });

    // Update status dynamically
    badge.setStatus("degraded");

    // Update label text
    badge.setLabel("Service Degraded");

    // Toggle pulse animation
    badge.setPulse(false);
</script>
```

## API

### createStatusBadge(containerId, options)

Creates a StatusBadge instance and appends it to the specified container. Returns the instance for further manipulation.

```javascript
var badge = createStatusBadge("my-container", {
    status: "in-progress",
    variant: "pill",
    clickable: true,
    onClick: function() { console.log("Clicked!"); }
});
```

### StatusBadgeOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `status` | `string` | Required | One of: `"operational"`, `"degraded"`, `"down"`, `"in-progress"`, `"failed"`, `"maintenance"`, `"unknown"`, `"custom"` |
| `variant` | `string` | `"indicator"` | Visual variant: `"dot"`, `"pill"`, or `"indicator"` |
| `label` | `string` | Auto | Override the auto-generated label text |
| `customColor` | `string` | — | CSS colour for `status="custom"` |
| `pulse` | `boolean` | Auto | Enable/disable pulse animation. Auto-enables for `operational` and `in-progress` |
| `clickable` | `boolean` | `false` | Whether the badge responds to click events |
| `onClick` | `function` | — | Callback invoked on click |
| `tooltip` | `string` | — | Tooltip text (title attribute) |
| `size` | `string` | `"md"` | Size variant: `"xs"`, `"sm"`, `"md"`, `"lg"` |
| `cssClass` | `string` | — | Additional CSS class(es) |

### Instance Methods

| Method | Description |
|--------|-------------|
| `show(containerId)` | Append the badge to a container element |
| `hide()` | Remove from DOM (preserves state) |
| `destroy()` | Remove from DOM and release all references |
| `getElement()` | Returns the root DOM element (or `null`) |
| `setStatus(status)` | Update the displayed status |
| `setLabel(label)` | Update the label text |
| `setPulse(enabled)` | Enable or disable pulse animation |

## Status Values

| Status | Colour | Default Label | Auto-Pulse |
|--------|--------|---------------|------------|
| `operational` | Green (`$green-600`) | Operational | Yes |
| `degraded` | Yellow (`$yellow-500`) | Degraded | No |
| `down` | Red (`$red-600`) | Down | No |
| `in-progress` | Blue (`$blue-600`) | In Progress | Yes |
| `failed` | Dark Red (`$red-800`) | Failed | No |
| `maintenance` | Orange (`$orange-500`) | Maintenance | No |
| `unknown` | Grey (`$gray-400`) | Unknown | No |
| `custom` | User-defined | User-defined | No |

## Variants

### Dot (`variant: "dot"`)

Displays only the coloured dot with no text label. Useful for compact status indicators in tables or lists.

### Pill (`variant: "pill"`)

Displays only the label text with a coloured background. The label inherits the status colour as its background and uses light text for contrast.

### Indicator (`variant: "indicator"`)

Default variant. Displays both the coloured dot and the text label side-by-side. Provides the most informative visual representation.

## Features

- 7 built-in status states plus a custom mode
- Animated pulse for live/active states (operational, in-progress)
- Clickable with callback support
- Keyboard accessible (Enter/Space activation, focus-visible ring)
- Size variants (xs, sm, md, lg)
- `prefers-reduced-motion` support disables pulse animation
- `role="status"` and `aria-label` for screen reader compatibility
- Tooltip support via the title attribute

## Accessibility

- `role="status"` with `aria-label` set to `"Status: {label}"` for screen reader announcements.
- When clickable, `role="button"` and `tabindex="0"` are applied for keyboard navigation.
- Enter and Space keys activate the click handler, matching native button semantics.
- `focus-visible` outline provides a clear keyboard focus indicator.
- `prefers-reduced-motion: reduce` disables the pulse animation for users who prefer reduced motion.

## Dependencies

- Bootstrap 5 CSS (for SCSS variables) and Enterprise Theme CSS.
- Does NOT require Bootstrap JS.
