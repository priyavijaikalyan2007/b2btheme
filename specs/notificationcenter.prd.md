<!-- AGENT: PRD specification for the Notification Center (Bell) component (MASTER_COMPONENT_LIST §17.1). -->

# Notification Center (In-App Bell) — PRD

## 1. Overview

Aggregated notification panel with categories (mentions, system alerts, task assignments), read/unread state, filtering, and deep-link to the source record. Triggered by a bell icon with unread badge.

**MASTER_COMPONENT_LIST §17.1** | **ADR-043**

## 2. Use Cases

- @mention alerts in collaborative apps
- Report-ready / export-complete notifications
- Approval requests and workflow triggers
- System health warnings and service incidents
- Task assignment and status change alerts

## 3. References

- Facebook/LinkedIn notification bell
- Slack notification panel
- Jira notification center
- GitHub notification inbox

## 4. Functional Requirements

### 4.1 Bell Trigger
- Bell icon button with unread count badge (hides when 0)
- Badge shows count up to 99, then "99+"
- Animated pulse on new notification arrival

### 4.2 Panel
- Slide-out panel from right edge (position: fixed, z-index: 1070)
- Header: title, "Mark all read" button, close button
- Category filter tabs: All, Mentions, Alerts, Tasks (configurable)
- Scrollable notification list with virtual boundary (max-height)

### 4.3 Notification Items
- Avatar/icon, title, message (truncated), timestamp (relative)
- Read/unread visual state (bold + accent bar for unread)
- Click handler for deep-link navigation
- Dismiss (×) button per notification
- Group by date: Today, Yesterday, Earlier

### 4.4 Programmatic API
- `addNotification(notification)` — push a new notification
- `removeNotification(id)` — remove by ID
- `markRead(id)` / `markAllRead()` — toggle read state
- `getUnreadCount()` — return current unread count
- `setNotifications(notifications)` — replace all
- `getNotifications()` — return all notifications
- `open()` / `close()` / `toggle()` — panel visibility
- `setCategories(categories)` — configure filter tabs
- `destroy()` — clean up

### 4.5 Size Variants
- `sm` / `md` (default) / `lg`

### 4.6 Keyboard
- `Enter` / `Space` — toggle panel from bell
- `Escape` — close panel
- `Arrow Up/Down` — navigate notifications
- `Delete` — dismiss focused notification

## 5. Non-Functional Requirements

- Accessibility: `aria-label` on bell, `role="region"` on panel, `aria-live="polite"` for count updates
- Performance: render up to 200 notifications without jank
- Security: `textContent` only, never `innerHTML` with user content

## 6. Status

| Phase | Status |
|-------|--------|
| PRD | Complete |
| TypeScript | Complete |
| SCSS | Complete |
| README | Complete |
| Demo | Complete |
| Build | Complete |
