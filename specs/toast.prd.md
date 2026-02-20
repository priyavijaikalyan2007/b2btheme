<!-- AGENT: Product Requirements Document for the Toast component — transient non-blocking notification messages with stacking, auto-dismiss, and action support. -->

# Toast Component

**Status:** Draft
**Component name:** Toast
**Folder:** `./components/toast/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A transient, non-blocking notification system for displaying short-lived messages at configurable screen edges. Toasts communicate the outcome of user actions (save confirmed, error occurred), system events (connection lost), or background processes (upload complete) without interrupting the user's workflow.

The system consists of two collaborating pieces:

- **Toast** — A single notification card with icon, title, message, optional action button, close button, and auto-dismiss countdown progress bar.
- **ToastContainer** — A singleton manager that positions toasts at a chosen viewport corner, manages the visible stack (newest on top), queues excess toasts beyond the configurable maximum, and orchestrates entrance/exit animations.

The ToastContainer is created automatically on first use. Consumers interact exclusively through global convenience functions and never need to instantiate the container manually.

### 1.2 Why Build It

Enterprise SaaS applications frequently need lightweight feedback for:

- CRUD confirmations ("Record saved", "Item deleted — Undo")
- Validation warnings ("Field X exceeds maximum length")
- Background task completion ("Report generated", "Export ready — Download")
- Connection status changes ("Reconnected to server")
- Error notifications ("Failed to save — Retry")

Without a dedicated component, developers reach for `alert()` (blocking), custom `<div>` banners (inconsistent), or heavyweight libraries (extra dependencies). A purpose-built toast component provides consistent UX, accessible announcements, and zero external dependencies.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Material UI Snackbar | Bottom-anchored transient message with action button |
| Ant Design Message / Notification | Top-positioned, variant-coloured, stacking notifications |
| Stripe Dashboard Toasts | Compact, auto-dismiss, progress indicator |
| VS Code Notifications | Stacked corner notifications with actions |
| macOS Notification Centre | Slide-in animation, newest on top, dismiss on click |

---

## 2. Anatomy

### 2.1 Toast Container (top-right position)

```
                                    ┌──────────────────────────────┐
                                    │ ✓ Changes saved successfully  ✕│
                                    │   ████████████░░░░░░░░░░░░░░ │
                                    └──────────────────────────────┘
                                    ┌──────────────────────────────┐
                                    │ ⚠ Connection unstable         ✕│
                                    │   Retry automatically in 5s   │
                                    │   [ Retry Now ]               │
                                    │   ██████████████████████░░░░░ │
                                    └──────────────────────────────┘
```

### 2.2 Single Toast

```
┌──────────────────────────────────────┐
│ [icon] [title]                    [✕]│
│        [message text]                │
│        [action button]               │
│ [████████████░░░░░░░░░ progress bar] │
└──────────────────────────────────────┘
```

### 2.3 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Icon | Auto | Bootstrap Icons class. Auto-set per variant if omitted. |
| Title | Optional | Bold heading text above the message. |
| Message | Required | Main notification text. |
| Close button | Configurable | Dismiss button (X). Default: shown. |
| Action button | Optional | Labelled button for contextual action (e.g., "Undo"). |
| Progress bar | Configurable | Countdown indicator showing remaining auto-dismiss time. Default: shown. |

---

## 3. API

### 3.1 Interfaces

```typescript
interface ToastOptions
{
    /** Main notification text. Required. */
    message: string;

    /** Bold heading text above the message. */
    title?: string;

    /** Severity variant determining colour and default icon. Default: "info". */
    variant?: "info" | "success" | "warning" | "error";

    /** Bootstrap Icons class. Auto-set per variant if omitted. */
    icon?: string;

    /** Auto-dismiss duration in milliseconds. 0 = persistent. Default: 5000. */
    duration?: number;

    /** Show the close (X) button. Default: true. */
    dismissible?: boolean;

    /** Show the countdown progress bar. Default: true. */
    showProgress?: boolean;

    /** Action button label text (e.g., "Undo"). */
    actionLabel?: string;

    /** Callback fired when the action button is clicked. */
    onAction?: () => void;

    /** Callback fired when the toast is dismissed (auto or manual). */
    onDismiss?: () => void;
}

interface ToastContainerOptions
{
    /** Screen position for the toast stack. Default: "top-right". */
    position?: "top-right" | "top-left" | "bottom-right"
             | "bottom-left" | "top-center" | "bottom-center";

    /** Maximum number of visible toasts. Excess toasts are queued. Default: 5. */
    maxVisible?: number;

    /** Gap in pixels between stacked toasts. Default: 8. */
    gap?: number;

    /** CSS z-index for the container. Default: 1070. */
    zIndex?: number;

    /** Additional CSS class(es) on the container element. */
    cssClass?: string;
}
```

### 3.2 ToastHandle

The object returned by `showToast()` and convenience functions.

```typescript
interface ToastHandle
{
    /** Programmatically dismiss the toast. */
    dismiss(): void;

    /** The toast's root DOM element. */
    element: HTMLElement;
}
```

### 3.3 Global Functions

| Function | Description |
|----------|-------------|
| `showToast(options)` | Show a toast with full options. Returns a `ToastHandle`. |
| `showInfoToast(message, title?)` | Convenience: info variant. Returns a `ToastHandle`. |
| `showSuccessToast(message, title?)` | Convenience: success variant. Returns a `ToastHandle`. |
| `showWarningToast(message, title?)` | Convenience: warning variant. Returns a `ToastHandle`. |
| `showErrorToast(message, title?)` | Convenience: error variant. Returns a `ToastHandle`. |
| `clearAllToasts()` | Dismiss all visible toasts and clear the queue. |
| `configureToasts(options)` | Configure container position, max visible, gap, z-index. |

### 3.4 Global Exports

```typescript
window.showToast = showToast;
window.showInfoToast = showInfoToast;
window.showSuccessToast = showSuccessToast;
window.showWarningToast = showWarningToast;
window.showErrorToast = showErrorToast;
window.clearAllToasts = clearAllToasts;
window.configureToasts = configureToasts;
```

---

## 4. Behaviour

### 4.1 Singleton Container

A module-level `toastContainer` variable holds the single ToastContainer instance. It is created lazily on the first call to `showToast()` or any convenience function. Calling `configureToasts()` before any toasts are shown pre-creates the container with the desired settings. Calling `configureToasts()` after the container exists updates its configuration and repositions existing toasts.

### 4.2 Toast Lifecycle

```
[Created] --> [Queued] --> [Visible/Animating In] --> [Auto-dismiss / Manual dismiss]
                                                         --> [Animating Out] --> [Removed]
```

1. **Created** -- `showToast()` builds the toast DOM element.
2. **Queued** -- If the visible stack has reached `maxVisible`, the toast is placed in a FIFO queue.
3. **Visible** -- The toast is appended to the container and its entrance animation plays (slide-in + opacity, 200ms).
4. **Auto-dismiss** -- After `duration` milliseconds, the exit animation plays and the toast is removed.
5. **Manual dismiss** -- User clicks the close button or calls `handle.dismiss()`.
6. **Removed** -- After the exit animation completes (200ms), the DOM element is removed. If queued toasts exist, the next one is promoted to visible.

### 4.3 Stacking Order

Newest toasts appear at the top of the stack (for top-positioned containers) or the bottom of the stack (for bottom-positioned containers). This ensures the most recent notification is closest to the user's natural eye position for each corner.

### 4.4 Auto-Dismiss and Progress Bar

When `duration > 0` and `showProgress` is true:

- A thin progress bar appears at the bottom of the toast.
- The bar starts at 100% width and shrinks to 0% over the `duration` period using a CSS animation (`linear` timing).
- When the bar reaches 0%, the toast auto-dismisses.

### 4.5 Pause on Hover

When the user hovers over a toast with an active auto-dismiss timer:

- The countdown timer pauses.
- The progress bar animation pauses (`animation-play-state: paused`).
- On mouse leave, the timer and animation resume from where they paused.

### 4.6 Action Button

When `actionLabel` and `onAction` are provided:

- A styled button appears below the message text.
- Clicking the button fires `onAction()` and immediately dismisses the toast.
- The action button uses the `btn btn-sm btn-outline-*` Bootstrap pattern, coloured per variant.

### 4.7 Queue Draining

When a visible toast is dismissed and the queue is non-empty:

- The next queued toast is promoted to visible.
- Its entrance animation plays.
- Its auto-dismiss timer starts at that moment (not when it was originally created).

### 4.8 Entrance and Exit Animations

| Position | Entrance Transform | Exit Transform |
|----------|-------------------|----------------|
| top-right | `translateX(100%)` to `translateX(0)` | `translateX(0)` to `translateX(100%)` |
| top-left | `translateX(-100%)` to `translateX(0)` | `translateX(0)` to `translateX(-100%)` |
| bottom-right | `translateX(100%)` to `translateX(0)` | `translateX(0)` to `translateX(100%)` |
| bottom-left | `translateX(-100%)` to `translateX(0)` | `translateX(0)` to `translateX(-100%)` |
| top-center | `translateY(-100%)` to `translateY(0)` | `translateY(0)` to `translateY(-100%)` |
| bottom-center | `translateY(100%)` to `translateY(0)` | `translateY(0)` to `translateY(100%)` |

All animations include an `opacity: 0` to `opacity: 1` transition (entrance) and the reverse (exit). Duration: 200ms, easing: `ease-out` (entrance), `ease-in` (exit).

---

## 5. Styling

### 5.1 CSS Classes

All classes use the `.pvk-toast-` prefix to avoid collision with Bootstrap's built-in `.toast` class.

| Class | Description |
|-------|-------------|
| `.pvk-toast-container` | Fixed-position stack container at the chosen viewport corner |
| `.pvk-toast-container-top-right` | Position modifier: top-right |
| `.pvk-toast-container-top-left` | Position modifier: top-left |
| `.pvk-toast-container-bottom-right` | Position modifier: bottom-right |
| `.pvk-toast-container-bottom-left` | Position modifier: bottom-left |
| `.pvk-toast-container-top-center` | Position modifier: top-center |
| `.pvk-toast-container-bottom-center` | Position modifier: bottom-center |
| `.pvk-toast` | Individual toast card |
| `.pvk-toast-info` | Info variant (blue) |
| `.pvk-toast-success` | Success variant (green) |
| `.pvk-toast-warning` | Warning variant (yellow) |
| `.pvk-toast-error` | Error variant (red) |
| `.pvk-toast-entering` | Entrance animation state |
| `.pvk-toast-exiting` | Exit animation state |
| `.pvk-toast-header` | Flex row: icon + title + close button |
| `.pvk-toast-icon` | Left-aligned variant icon |
| `.pvk-toast-title` | Bold title text |
| `.pvk-toast-close` | Close (X) button |
| `.pvk-toast-body` | Message text container |
| `.pvk-toast-action` | Action button |
| `.pvk-toast-progress` | Progress bar track |
| `.pvk-toast-progress-fill` | Animated progress bar fill |
| `.pvk-toast-paused` | Modifier: pauses progress bar animation on hover |

### 5.2 Variants

| Variant | Left Border | Icon Colour | Default Icon | Background |
|---------|------------|-------------|-------------|------------|
| info | `$blue-500` | `$blue-600` | `bi-info-circle-fill` | `$gray-50` |
| success | `$green-600` | `$green-600` | `bi-check-circle-fill` | `$gray-50` |
| warning | `$yellow-500` | `$yellow-600` | `bi-exclamation-triangle-fill` | `$gray-50` |
| error | `$red-600` | `$red-600` | `bi-exclamation-octagon-fill` | `$gray-50` |

Each toast has a 4px left border in the variant colour for quick visual identification. The background is a neutral `$gray-50` for all variants to maintain readability.

### 5.3 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Background | `$gray-50` | Neutral card background |
| Text | `$gray-900` | Primary text colour |
| Title | `$gray-900`, `$font-weight-semibold` | Bold heading |
| Message | `$gray-700` | Secondary text colour |
| Border | `1px solid $gray-300` | Card border (top, right, bottom) |
| Left border | `4px solid` variant colour | Variant accent |
| Close button | `$gray-500`, hover `$gray-700` | Subtle dismiss affordance |
| Action button | `btn-outline-*` per variant | Bootstrap outline style |
| Progress track | `$gray-200` | Subtle background |
| Progress fill | Variant colour | Matches left border |
| Box shadow | `0 2px 8px rgba($gray-900, 0.12)` | Subtle elevation |
| Toast width | `min(360px, calc(100vw - 2rem))` | Responsive max width |
| Font | inherits `$font-family-base` | Theme font |

### 5.4 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Toolbar popups | 1060 | Above modals, below toasts |
| **Toast container** | **1070** | Above all layout components and modals |
| Bootstrap Modal | 1050 | Below toasts |
| BannerBar | 1045 | Below modals |
| StatusBar | 1040 | Below BannerBar |
| Sidebar | 1035-1037 | Below StatusBar |

Toasts sit at z-index 1070 so they remain visible over modals, toolbar popups, and all other fixed UI elements. This follows ADR-032 which establishes the toast notification tier above the toolbar popup tier (1060).

### 5.5 Reduced Motion

A `prefers-reduced-motion: reduce` media query disables the slide transform animations. Toasts still use a simple `opacity` fade (instant or 100ms) for entrance and exit so that the appearance and disappearance remain perceptible without vestibular-triggering motion.

---

## 6. Keyboard Interaction

| Key | Action |
|-----|--------|
| Tab | Moves focus into the toast (if it has an action or dismiss button). |
| Shift+Tab | Moves focus out of the toast. |
| Enter / Space | Activates the focused button (action or close). |
| Escape | Dismisses the currently focused toast. |

When a toast is dismissed via keyboard, focus moves to the next toast in the stack. If no toasts remain, focus returns to the previously focused element.

---

## 7. Accessibility

### 7.1 Container ARIA

| Attribute | Value |
|-----------|-------|
| `role` | `"region"` |
| `aria-label` | `"Notifications"` |
| `aria-live` | `"polite"` |

### 7.2 Toast ARIA

| Variant | Role | Rationale |
|---------|------|-----------|
| error | `role="alert"` | Errors demand immediate attention; `alert` triggers assertive announcement. |
| info, success, warning | `role="status"` | Non-critical updates; `status` triggers polite announcement. |

### 7.3 Element ARIA

| Element | Attribute | Value |
|---------|-----------|-------|
| Close button | `aria-label` | `"Dismiss notification"` |
| Action button | Inherits `actionLabel` text | Self-labelled via text content |
| Progress bar | `role` | `"progressbar"` |
| Progress bar | `aria-valuenow` | Current remaining percentage (100 to 0) |
| Progress bar | `aria-valuemin` | `0` |
| Progress bar | `aria-valuemax` | `100` |
| Progress bar | `aria-label` | `"Time remaining before auto-dismiss"` |

### 7.4 Screen Reader Behaviour

- When a toast appears, the screen reader announces the toast message via the container's `aria-live` region.
- Error toasts use `role="alert"` which triggers an assertive announcement, interrupting the current speech output.
- The progress bar percentage is not announced on every tick to avoid noise; screen readers poll `aria-valuenow` at their own cadence.

---

## 8. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `$gray-*`, `$blue-*`, `$green-*`, `$yellow-*`, `$red-*` SCSS variables and `btn` classes |
| Bootstrap Icons | Yes | For `bi-info-circle-fill`, `bi-check-circle-fill`, `bi-exclamation-triangle-fill`, `bi-exclamation-octagon-fill`, `bi-x-lg` |
| Enterprise Theme CSS | Yes | For theme variable overrides |
| No JavaScript framework dependencies | -- | Vanilla TypeScript only |

---

## 9. Open Questions

1. Should persistent toasts (duration = 0) count against `maxVisible`, or should they have a separate limit to prevent them from blocking the entire stack?
2. Should `clearAllToasts()` animate each toast out or remove them all instantly?
3. Should duplicate detection be supported (e.g., suppress a second identical toast if one with the same message is already visible)?
