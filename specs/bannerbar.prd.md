<!-- AGENT: Product requirements for the BannerBar component. -->

# BannerBar Component — Product Requirements

## 1. Overview

The BannerBar is a fixed-to-top viewport banner for announcing significant events such as service status updates, critical issues, maintenance windows, and success confirmations. It sits above all other fixed content (sidebars, status bar) and is the highest non-modal z-index element in the layout.

Only one banner is visible at a time. Showing a new banner replaces the previous one. The banner is closeable via an X button but reappears on next page load (no cross-session persistence).

## 2. Use Cases

| Use Case | Variant | Example |
|----------|---------|---------|
| Service disruption | critical | "Payment processing is currently unavailable." |
| Scheduled maintenance | warning | "Maintenance window: Saturday 02:00-04:00 UTC." |
| Feature announcement | info | "New dashboard analytics are now available." |
| Operation success | success | "All records imported successfully." |

## 3. Anatomy

```
+---------------------------------------------------------------+
| [icon] [title] [message]              [action]        [close] |
+---------------------------------------------------------------+
```

| Element | Required | Description |
|---------|----------|-------------|
| Icon | Optional | Bootstrap Icons class. Defaults per variant. |
| Title | Optional | Bold text before the message. |
| Message | Required | Main announcement text. |
| Action | Optional | Link or button for user action. |
| Close | Configurable | X button to dismiss. Default: shown. |

## 4. Variants

Four predefined severity presets with full colour override support.

| Variant | Background | Text | Border-bottom | Default Icon |
|---------|-----------|------|---------------|-------------|
| info | `$blue-100` | `$blue-900` | `$blue-300` | `bi-info-circle-fill` |
| warning | `$yellow-100` | `$gray-900` | `$yellow-500` | `bi-exclamation-triangle-fill` |
| critical | `$red-100` | `$red-900` | `$red-600` | `bi-exclamation-octagon-fill` |
| success | `$green-100` | `$green-900` | `$green-600` | `bi-check-circle-fill` |

Consumers may override colours with `backgroundColor`, `textColor`, and `borderColor` options.

## 5. API

### 5.1 Types

```typescript
type BannerBarVariant = "info" | "warning" | "critical" | "success";
```

### 5.2 Options Interface

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| id | string | auto | Unique identifier |
| title | string | — | Bold title text |
| message | string | **(required)** | Main message text |
| variant | BannerBarVariant | "info" | Severity preset |
| icon | string | variant default | Bootstrap Icons class |
| actionLabel | string | — | Text for action link/button |
| actionHref | string | — | If set, action renders as `<a>` |
| onAction | function | — | Click handler for action button |
| closable | boolean | true | Show close button |
| autoDismissMs | number | 0 | Auto-close timer (0 = disabled) |
| maxHeight | number | 200 | Max height in px before scrolling |
| backgroundColor | string | — | CSS override |
| textColor | string | — | CSS override |
| borderColor | string | — | CSS override |
| zIndex | number | 1045 | CSS z-index |
| cssClass | string | — | Additional CSS classes |
| onClose | function | — | Called after close |

### 5.3 Class Methods

| Method | Description |
|--------|-------------|
| `show()` | Append to body, replace any current banner, set CSS custom property |
| `hide()` | Remove from DOM, clear CSS custom property, clear auto-dismiss timer |
| `destroy()` | Hide + release references, fire onClose |
| `setMessage(msg)` | Update message text |
| `setTitle(title)` | Update title text |
| `setVariant(variant)` | Switch variant (updates classes and icon) |
| `isVisible()` | Boolean query |

### 5.4 Convenience Functions

| Function | Description |
|----------|-------------|
| `createBannerBar(options)` | Create, show, and return instance |
| `showBanner(options)` | Alias for `createBannerBar` |

### 5.5 Global Exports

`window.BannerBar`, `window.createBannerBar`, `window.showBanner`

## 6. DOM Structure

```html
<div class="bannerbar bannerbar-info" role="alert" aria-live="assertive">
    <div class="bannerbar-body">
        <i class="bi bi-info-circle-fill bannerbar-icon"></i>
        <div class="bannerbar-text">
            <strong class="bannerbar-title">Title</strong>
            <span class="bannerbar-message">Message text here</span>
        </div>
        <a class="bannerbar-action" href="...">Learn more</a>
    </div>
    <button class="bannerbar-close" aria-label="Close banner">
        <i class="bi bi-x-lg"></i>
    </button>
</div>
```

## 7. CSS Classes

| Class | Description |
|-------|-------------|
| `.bannerbar` | Root fixed container |
| `.bannerbar-info` / `-warning` / `-critical` / `-success` | Variant presets |
| `.bannerbar-body` | Flex container for icon + text + action |
| `.bannerbar-icon` | Left-aligned icon |
| `.bannerbar-text` | Flex-grow container for title + message |
| `.bannerbar-title` | Bold title text |
| `.bannerbar-message` | Main message text |
| `.bannerbar-action` | Action link/button |
| `.bannerbar-close` | Close X button |

## 8. Behaviour

1. **Single instance**: Module-level `activeBanner` variable. `show()` on a new banner calls `destroy()` on the previous.
2. **Slide-in animation**: `transform: translateY(-100%)` to `translateY(0)` with 300ms ease.
3. **Max height + scroll**: `max-height` on root with `overflow-y: auto` on `.bannerbar-body`.
4. **Auto-dismiss**: If `autoDismissMs > 0`, `setTimeout` calls `hide()`. Timer cleared on manual close or destroy.
5. **Height measurement**: After DOM insertion, reads `offsetHeight` to set `--bannerbar-height` on `<html>`.
6. **Sidebar offset**: Docked sidebars and dock zones read `--bannerbar-height` for their `top` value.

## 9. Z-Index

| Element | Z-Index |
|---------|---------|
| Bootstrap fixed | 1030 |
| Sidebar (docked) | 1035 |
| Sidebar (floating) | 1036 |
| Sidebar (drop zone) | 1037 |
| StatusBar | 1040 |
| **BannerBar** | **1045** |
| Bootstrap Modal | 1050+ |

## 10. CSS Custom Property

Sets `--bannerbar-height` on `<html>` when shown (measured via `offsetHeight`).

Consumers:
- Sidebar: `top: var(--bannerbar-height, 0px)`
- Page content: `padding-top: var(--bannerbar-height, 0px)` (optional)

## 11. Accessibility

- Root element: `role="alert"` with `aria-live="assertive"` for critical/warning, `aria-live="polite"` for info/success
- Close button: `aria-label="Close banner"`
- Action: standard focusable `<a>` or `<button>`
- All variant colour combinations meet WCAG AA contrast requirements

## 12. Files

| File | Purpose |
|------|---------|
| `components/bannerbar/bannerbar.ts` | TypeScript source |
| `components/bannerbar/bannerbar.scss` | Styles |
| `components/bannerbar/README.md` | Documentation |
| `specs/bannerbar.prd.md` | This specification |
