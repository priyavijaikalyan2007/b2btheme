<!-- AGENT: Documentation for the BannerBar component. -->

# BannerBar

A fixed-to-top viewport banner for announcing significant events such as service status updates, critical issues, maintenance windows, and success confirmations.

## Features

- Four severity presets: info, warning, critical, success
- Full colour override support for custom branding
- Optional bold title, icon, and action link/button
- Closeable via X button (configurable)
- Optional auto-dismiss timer
- Scrollable overflow at configurable max height
- Slide-in/slide-out animation
- Single-instance model (new banner replaces the previous)
- Sets `--bannerbar-height` CSS custom property on `<html>` for layout offset
- WCAG AA accessible with appropriate ARIA attributes

## Assets

| Asset | Path |
|-------|------|
| CSS | `dist/components/bannerbar/bannerbar.css` |
| JS | `dist/components/bannerbar/bannerbar.js` |
| Types | `dist/components/bannerbar/bannerbar.d.ts` |

**Requires:** Bootstrap CSS (for SCSS variables), Bootstrap Icons CSS. Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/bannerbar/bannerbar.css">
<script src="dist/components/bannerbar/bannerbar.js"></script>
<script>
    var banner = createBannerBar({
        message: "Scheduled maintenance tonight at 02:00 UTC.",
        variant: "warning"
    });
</script>
```

## API

### `createBannerBar(options)` / `showBanner(options)`

Creates, shows, and returns a `BannerBar` instance. `showBanner` is an ergonomic alias.

### `new BannerBar(options)`

Creates a BannerBar instance without showing it. Call `.show()` to display.

### Options

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | auto | Unique identifier |
| `title` | string | — | Bold title text before the message |
| `message` | string | **(required)** | Main message text |
| `variant` | `"info"` \| `"warning"` \| `"critical"` \| `"success"` | `"info"` | Severity preset |
| `icon` | string | variant default | Bootstrap Icons class |
| `actionLabel` | string | — | Text for action link/button |
| `actionHref` | string | — | If set, action renders as `<a>` |
| `onAction` | function | — | Click handler for action |
| `closable` | boolean | `true` | Show the close X button |
| `autoDismissMs` | number | `0` | Auto-close after N ms (0 = disabled) |
| `maxHeight` | number | `200` | Max height in px before scrolling |
| `backgroundColor` | string | — | CSS colour override |
| `textColor` | string | — | CSS colour override |
| `borderColor` | string | — | CSS border-bottom colour override |
| `zIndex` | number | `1045` | CSS z-index |
| `cssClass` | string | — | Additional CSS classes |
| `onClose` | function | — | Called after close/destroy |

### Instance Methods

| Method | Description |
|--------|-------------|
| `show()` | Show the banner (replaces any active banner) |
| `hide()` | Hide the banner with slide-out animation |
| `destroy()` | Remove the banner and release all resources |
| `setMessage(msg)` | Update the message text |
| `setTitle(title)` | Update the title text (empty string hides it) |
| `setVariant(variant)` | Switch severity variant |
| `isVisible()` | Returns `true` if the banner is currently shown |

## Variants

| Variant | Use Case | Default Icon |
|---------|----------|-------------|
| `info` | Announcements, feature notices | `bi-info-circle-fill` |
| `warning` | Maintenance windows, degradation | `bi-exclamation-triangle-fill` |
| `critical` | Outages, breaking issues | `bi-exclamation-octagon-fill` |
| `success` | Completed operations, confirmations | `bi-check-circle-fill` |

## Examples

### Basic Info Banner

```javascript
createBannerBar({
    message: "New dashboard analytics are now available."
});
```

### Critical Banner with Title

```javascript
createBannerBar({
    title: "Service Disruption",
    message: "Payment processing is currently unavailable. We are investigating.",
    variant: "critical"
});
```

### Banner with Action Link

```javascript
createBannerBar({
    message: "Your subscription expires in 3 days.",
    variant: "warning",
    actionLabel: "Renew Now",
    actionHref: "/billing/renew"
});
```

### Auto-Dismissing Success Banner

```javascript
createBannerBar({
    message: "All records imported successfully.",
    variant: "success",
    autoDismissMs: 5000
});
```

### Custom Colours

```javascript
createBannerBar({
    message: "Beta feature enabled for your account.",
    backgroundColor: "#f0e6ff",
    textColor: "#4a1d8e",
    borderColor: "#7c3aed"
});
```

## CSS Custom Property

When visible, the banner sets `--bannerbar-height` on `<html>` to its measured pixel height. Other components (e.g., Sidebar) use this to offset their top position:

```css
.my-fixed-element {
    top: var(--bannerbar-height, 0px);
}
```

The property is removed when the banner is hidden or destroyed.

## Accessibility

- Root element has `role="alert"` with `aria-live="assertive"` for critical/warning variants, `aria-live="polite"` for info/success
- Close button has `aria-label="Close banner"`
- Action element is a standard focusable `<a>` or `<button>`
- All variant colour combinations meet WCAG AA contrast requirements
