<!-- AGENT: Documentation for the Notification Center (Bell) component. -->

# Notification Center (In-App Bell)

Aggregated notification panel with bell trigger, unread badge, category filters, read/unread state, dismiss per item, date grouping, and deep-link navigation.

## Assets

| Asset | Path |
|-------|------|
| CSS | `components/notificationcenter/notificationcenter.css` |
| JS | `components/notificationcenter/notificationcenter.js` |
| Types | `components/notificationcenter/notificationcenter.d.ts` |

## Requirements

- **Bootstrap CSS** — SCSS variables and utility classes
- **Bootstrap Icons** — bell icon, notification icons (`bi-*` classes)
- Does **not** require Bootstrap JS.

## Quick Start

```html
<link rel="stylesheet" href="components/notificationcenter/notificationcenter.css">
<script src="components/notificationcenter/notificationcenter.js"></script>
<script>
    var nc = createNotificationCenter({
        container: document.getElementById("bell-slot"),
        notifications: [
            { id: "1", title: "New comment", message: "Alice mentioned you", category: "mentions", timestamp: new Date() }
        ],
        categories: [
            { id: "mentions", label: "Mentions", icon: "bi-at" },
            { id: "alerts", label: "Alerts", icon: "bi-exclamation-triangle" }
        ],
        onNotificationClick: function(n) { console.log("Open:", n.id); }
    });

    // Push a new notification
    nc.addNotification({ id: "2", title: "Build complete", timestamp: new Date() });
</script>
```

## API

### `createNotificationCenter(options): NotificationCenterHandle`

### NotificationCenterOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | **required** | Mount target for bell trigger |
| `notifications` | `NotificationItem[]` | `[]` | Initial notifications |
| `categories` | `NotificationCategory[]` | `[]` | Filter tabs (auto-prepends "All") |
| `panelWidth` | `number` | `380` | Panel width in px |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `cssClass` | `string` | — | Extra CSS class(es) on bell |
| `onNotificationClick` | `(n) => void` | — | Click callback for notification items |
| `onDismiss` | `(id) => void` | — | Callback when item is dismissed |
| `onUnreadCountChange` | `(count) => void` | — | Callback when unread count changes |
| `onMarkAllRead` | `() => void` | — | Callback when "Mark all read" is clicked |
| `emptyMessage` | `string` | `"No notifications"` | Empty state text |

### NotificationItem

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (required) |
| `title` | `string` | Notification title (required) |
| `message` | `string` | Detail message text |
| `category` | `string` | Category key for filtering |
| `icon` | `string` | Bootstrap Icons class |
| `avatarUrl` | `string` | Avatar image URL (alternative to icon) |
| `timestamp` | `string \| Date` | ISO string or Date (required) |
| `read` | `boolean` | Read state. Default: `false` |
| `data` | `unknown` | Arbitrary payload |

### NotificationCategory

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique key matching `NotificationItem.category` |
| `label` | `string` | Display label |
| `icon` | `string` | Bootstrap Icons class |

### NotificationCenterHandle

| Method | Returns | Description |
|--------|---------|-------------|
| `addNotification(n)` | `void` | Push a new notification (prepends to list) |
| `removeNotification(id)` | `void` | Remove by ID |
| `markRead(id)` | `void` | Mark single notification as read |
| `markAllRead()` | `void` | Mark all notifications as read |
| `getUnreadCount()` | `number` | Current unread count |
| `setNotifications(items)` | `void` | Replace all notifications |
| `getNotifications()` | `NotificationItem[]` | Return all notifications |
| `setCategories(cats)` | `void` | Replace category tabs |
| `open()` / `close()` / `toggle()` | `void` | Panel visibility |
| `getElement()` | `HTMLElement` | Return bell button element |
| `destroy()` | `void` | Tear down DOM and listeners |

## Pointer and touch

- **A press outside** the panel closes it, from `pointerdown`, so a tap on blank space closes it in Safari on iOS too (`TOUCH_EXPERIENCE.md` section 9, item 1).
- **Targets.** Under a coarse pointer the bell, the close button, the tabs, **Mark all read** and each dismiss button are 44 px. Hover colors show only on a device with hover.
- **The dismiss button** shows on hover or focus with a mouse. On a device with no hover it shows always, so a finger can see what it taps.
- **The panel** fills the screen's height with `100dvh`, so its bottom stays above Safari's toolbar on iOS. The list keeps its scroll to itself at the end.

## Keyboard

| Key | Action |
|-----|--------|
| `Enter` / `Space` | Toggle panel from bell |
| `Escape` | Close panel |
| `Arrow Down` / `Arrow Up` | Navigate notification items |
| `Delete` | Dismiss focused notification |

## Accessibility

- Bell: `aria-label="Notifications"`, `aria-haspopup`, `aria-expanded`
- Panel: `role="region"`, `aria-label="Notification Center"`
- List: `role="list"`, items `role="listitem"`
- Live region: `aria-live="polite"` announces new notifications
