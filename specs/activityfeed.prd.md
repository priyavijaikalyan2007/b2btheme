<!-- AGENT: PRD for the ActivityFeed component — social-style feed of user and system activity events with date grouping, infinite scroll, and real-time additions. -->

# ActivityFeed Component

**Status:** Draft
**Component name:** ActivityFeed
**Folder:** `./components/activityfeed/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A social-style feed component that displays a chronological list of user and system activity events. Each event shows the actor's avatar, name, action description, optional target link, and relative timestamp. Events are grouped by date ("Today", "Yesterday", "This Week", "Earlier") and support infinite scroll pagination via an IntersectionObserver on a sentinel element.

The component supports:

- **Event types** -- comment, status_change, assignment, creation, deletion, upload, and custom, each with a default icon and colour.
- **Actor avatars** -- Image URL or automatic initials fallback with a deterministic background colour derived from the actor's name.
- **Relative timestamps** -- Human-friendly labels ("3 minutes ago", "yesterday", "2 hours ago") with the absolute date and time shown in a tooltip on hover.
- **Date grouping** -- Events are automatically grouped under date headers: "Today", "Yesterday", "This Week", and "Earlier".
- **Rich content** -- Optional content block below the action line for comment text, file previews, status change details, or other contextual information.
- **Infinite scroll** -- An IntersectionObserver on a sentinel element at the bottom of the feed triggers `onLoadMore` to fetch and append additional events.
- **Real-time additions** -- `addEvent()` prepends a new event at the top of the feed with an entrance animation.
- **Compact and full modes** -- A compact mode reduces vertical spacing and avatar size for sidebar or panel embedding.
- **Empty state** -- When no events are present, an integrated empty state is shown (compatible with the EmptyState component).

### 1.2 Why Build It

Enterprise SaaS applications frequently need activity feeds for:

- Project dashboards (who did what, when)
- Audit trails (compliance-oriented event logs)
- Collaboration tools (team activity stream)
- CRM systems (customer interaction history)
- Issue trackers (ticket activity and comments)
- Admin panels (system event monitoring)

Without a dedicated component, developers build bespoke event lists with inconsistent timestamp formatting, no date grouping, no pagination, and no accessibility semantics. A reusable ActivityFeed provides consistent visual language, accessible feed markup, efficient infinite scroll, and real-time update support.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| GitHub News Feed | Actor + action + target pattern, relative timestamps, event type icons |
| Asana Activity | Date-grouped activity list, compact layout, rich content previews |
| Salesforce Chatter | Avatar + action line, comment content inline, real-time updates |
| Linear Activity | Clean timeline layout, event type colours, minimal chrome |
| Jira Activity Stream | Date headers, actor-centric events, status change badges |
| Slack Activity | Actor avatar, action text, timestamps, inline content |

---

## 2. Anatomy

### 2.1 Full Layout

```
+--------------------------------------------------------------+
|   Today                                                       |  <-- date group header
| +----------------------------------------------------------+ |
| | [avatar] Jane Doe commented on Project Alpha    3 min ago | |
| |          "Looking great! Let's ship it this week."        | |  <-- rich content
| +----------------------------------------------------------+ |
| +----------------------------------------------------------+ |
| | [avatar] Bob Smith changed status of Task #42  1 hour ago | |
| |          In Progress --> Done                              | |
| +----------------------------------------------------------+ |
|                                                               |
|   Yesterday                                                   |  <-- date group header
| +----------------------------------------------------------+ |
| | [avatar] Alice Jones created Document Draft    yesterday  | |
| +----------------------------------------------------------+ |
| +----------------------------------------------------------+ |
| | [avatar] System uploaded report.pdf           yesterday   | |
| |          [file icon] report.pdf (2.4 MB)                  | |
| +----------------------------------------------------------+ |
|                                                               |
|   This Week                                                   |
| +----------------------------------------------------------+ |
| | [avatar] Carlos Ruiz assigned Task #17 to Jane   3d ago  | |
| +----------------------------------------------------------+ |
|                                                               |
|   [sentinel: loading more...]                                 |  <-- IntersectionObserver target
+--------------------------------------------------------------+
```

### 2.2 Compact Layout

```
+----------------------------------------------------+
|   Today                                             |
| [av] Jane Doe commented on Project Alpha   3m ago  |
| [av] Bob Smith changed status of Task #42  1h ago  |
|   Yesterday                                         |
| [av] Alice Jones created Document Draft    1d ago  |
+----------------------------------------------------+
```

### 2.3 Empty State

```
+--------------------------------------------------------------+
|                                                               |
|              [icon: bi-journal-text]                          |
|                                                               |
|              No activity yet                                  |
|                                                               |
|     Activity will appear here as your                         |
|     team starts working.                                      |
|                                                               |
+--------------------------------------------------------------+
```

### 2.4 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | Scrollable feed container with `role="feed"`. |
| Date group header | Auto | "Today", "Yesterday", "This Week", "Earlier" headers. Rendered when `groupByDate` is true. |
| Event card | Yes (0+) | Individual activity event. |
| Actor avatar | Configurable | Image or initials circle. Shown when `showAvatars` is true (default). |
| Action line | Yes | Text describing the event: "{actor} {action} {target} {timestamp}". |
| Rich content | Optional | Additional content block below the action line. |
| Relative timestamp | Yes | Human-friendly relative time with absolute time tooltip. |
| Event type icon | Optional | Small icon indicating event type (replaces or supplements avatar in compact mode). |
| Sentinel element | Auto | Invisible element at the bottom of the feed for IntersectionObserver pagination. |
| Loading indicator | Auto | Shown when `onLoadMore` is pending. |
| Empty state | Auto | Shown when there are no events. |

---

## 3. API

### 3.1 Interfaces

```typescript
interface ActivityActor
{
    /** Unique actor identifier. */
    id: string;

    /** Display name of the actor. Required. */
    name: string;

    /** URL to the actor's avatar image. */
    avatar?: string;
}

interface ActivityEvent
{
    /** Unique event identifier. */
    id: string;

    /** The actor who performed the action. Required. */
    actor: ActivityActor;

    /** Description of the action (e.g., "commented on", "created", "changed status of"). Required. */
    action: string;

    /** Name of the target entity (e.g., "Project Alpha", "Task #42"). */
    target?: string;

    /** URL for the target entity. If provided, the target is rendered as a clickable link. */
    targetUrl?: string;

    /** When the event occurred. Required. */
    timestamp: Date;

    /** Event type, used for default icon and colour selection. Default: "custom". */
    eventType?: "comment" | "status_change" | "assignment" | "creation" | "deletion" | "upload" | "custom";

    /** Rich content displayed below the action line (comment text, file info, status diff). */
    content?: string;

    /** Bootstrap Icons class for this event. Overrides the type-based default icon. */
    icon?: string;

    /** CSS colour value for this event's accent. Overrides the type-based default colour. */
    color?: string;

    /** Arbitrary consumer data attached to this event. */
    metadata?: Record<string, unknown>;
}

interface ActivityFeedOptions
{
    /** Initial events to display. Default: []. */
    events?: ActivityEvent[];

    /** Group events by date ("Today", "Yesterday", etc.). Default: true. */
    groupByDate?: boolean;

    /** Show actor avatars. Default: true. */
    showAvatars?: boolean;

    /** Compact display mode with reduced spacing and smaller avatars. Default: false. */
    compact?: boolean;

    /** Maximum number of events to render initially. Default: 20. */
    maxInitialEvents?: number;

    /** Configuration for the empty state when no events are present. Passed to EmptyState component. */
    emptyStateOptions?: object;

    /** CSS height value for the feed container. Enables scrolling. Default: "auto". */
    height?: string;

    /** Additional CSS class(es) on the root element. */
    cssClass?: string;

    /** Called when the sentinel becomes visible, requesting more events. Returns a promise of additional events to append. */
    onLoadMore?: () => Promise<ActivityEvent[]>;

    /** Called when the user clicks on an event card. */
    onEventClick?: (event: ActivityEvent) => void;

    /** Called when the user clicks on an actor's avatar or name. */
    onActorClick?: (actor: ActivityActor) => void;

    /** Called when the user clicks on a target link within an event. */
    onTargetClick?: (event: ActivityEvent) => void;
}
```

### 3.2 Class: ActivityFeed

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the DOM tree. Does not attach to the page. |
| `show(containerId)` | Appends to container by ID string or `HTMLElement`. Starts IntersectionObserver. |
| `hide()` | Removes from DOM, disconnects IntersectionObserver. State preserved. |
| `destroy()` | Hides, disconnects observer, nulls all references. Subsequent calls warn and no-op. |
| `getElement()` | Returns the root `HTMLElement`. |
| `addEvent(event)` | Prepends a single event at the top of the feed with an entrance animation. Updates date grouping if needed. |
| `addEvents(events)` | Appends multiple events to the bottom of the feed. Used for pagination results. Updates date grouping. |
| `setEvents(events)` | Replaces all events and re-renders the feed. |
| `getEvents()` | Returns a copy of the current events array. |
| `clear()` | Removes all events and shows the empty state. |
| `refresh()` | Re-renders all events from the current data. Useful after timezone changes or locale updates. |
| `scrollToTop()` | Scrolls the feed container to the top. |

### 3.3 Globals

```typescript
window.ActivityFeed = ActivityFeed;
window.createActivityFeed = createActivityFeed;
```

- `createActivityFeed(options)` -- Convenience function: creates an ActivityFeed instance and returns it without calling `show()`.

---

## 4. Behaviour

### 4.1 Lifecycle

1. **Construction** -- Builds the DOM tree, renders initial events (up to `maxInitialEvents`), applies date grouping. Does not attach to the page.
2. **show(containerId)** -- Appends to the container. Creates an IntersectionObserver on the sentinel element. If `onLoadMore` is provided and initial events are fewer than `maxInitialEvents`, the observer is active.
3. **hide()** -- Removes from DOM. Disconnects IntersectionObserver. State and event data preserved for re-show.
4. **destroy()** -- Calls hide, nulls all references. Sets a destroyed flag. Subsequent method calls log a warning and no-op.

### 4.2 Date Grouping

When `groupByDate` is true (default), events are grouped under date headers:

| Label | Condition |
|-------|-----------|
| "Today" | Event timestamp is today (same calendar date in local timezone) |
| "Yesterday" | Event timestamp is yesterday |
| "This Week" | Event timestamp is within the last 7 days (excluding today and yesterday) |
| "Earlier" | Event timestamp is more than 7 days ago |

Date headers are rendered as styled `<div>` elements with `role="heading"` and `aria-level="3"`. They are inserted dynamically when events span multiple groups.

When `groupByDate` is false, events are rendered as a flat list without headers.

### 4.3 Relative Timestamps

Timestamps are displayed as relative human-friendly strings:

| Elapsed Time | Display |
|-------------|---------|
| < 1 minute | "just now" |
| 1-59 minutes | "{n} minutes ago" (singular: "1 minute ago") |
| 1-23 hours | "{n} hours ago" (singular: "1 hour ago") |
| 1 day (yesterday) | "yesterday" |
| 2-6 days | "{n} days ago" |
| 7-29 days | "{n} weeks ago" (singular: "1 week ago") |
| 30+ days | Absolute date formatted as "MMM D, YYYY" (e.g., "Jan 15, 2026") |

Timestamps are rendered inside a `<time>` element with the `datetime` attribute set to the ISO 8601 string. The absolute date and time ("February 20, 2026 at 3:45 PM") is shown in a `title` attribute tooltip.

Relative timestamps are not auto-updated on a timer. They reflect the time at render. Calling `refresh()` recalculates all relative times.

### 4.4 Actor Avatars

For each event's actor:

1. If `actor.avatar` is provided, render an `<img>` element with `width`/`height` matching the size variant (36px default, 24px compact) and rounded corners.
2. If `actor.avatar` is not provided, generate an initials avatar: take the first letter of the actor's name, display it in a coloured circle. The background colour is deterministically derived from the actor name using a hash function that selects from a predefined palette of 8 muted colours.

Avatar elements are decorative and use `aria-hidden="true"`.

### 4.5 Event Type Icons and Colours

Each event type has a default Bootstrap Icons class and colour:

| Event Type | Default Icon | Default Colour |
|------------|-------------|----------------|
| comment | `bi-chat-left-text` | `$blue-600` |
| status_change | `bi-arrow-repeat` | `$purple-600` |
| assignment | `bi-person-plus` | `$teal-600` |
| creation | `bi-plus-circle` | `$green-600` |
| deletion | `bi-trash` | `$red-600` |
| upload | `bi-cloud-upload` | `$cyan-600` |
| custom | `bi-circle` | `$gray-500` |

These defaults can be overridden per event via the `icon` and `color` properties.

In compact mode, the event type icon replaces the left-side avatar for a more condensed layout. In full mode, the icon is shown as a small badge overlapping the bottom-right corner of the avatar.

### 4.6 Rich Content

When `event.content` is provided, a content block is rendered below the action line:

- Content is inserted via `textContent` (never `innerHTML`). No HTML parsing.
- The content block has a muted text colour (`$gray-600`) and slightly smaller font size.
- Long content is truncated at 3 lines with a "Show more" toggle that expands to the full text.
- Content is indented to align with the action text (past the avatar column).

### 4.7 Infinite Scroll Pagination

When `onLoadMore` is provided:

1. An IntersectionObserver watches a sentinel `<div>` element at the bottom of the event list.
2. When the sentinel enters the viewport (threshold: 0.1), `onLoadMore()` is called.
3. A loading indicator replaces the sentinel while the promise is pending.
4. When the promise resolves, the returned events are appended via `addEvents()`.
5. If the promise resolves with an empty array, the observer is disconnected and the sentinel is replaced with an "End of activity" message (or hidden entirely).
6. If the promise rejects, an error state is shown at the sentinel position with a "Retry" button. Clicking "Retry" calls `onLoadMore()` again.
7. The observer is temporarily disconnected during loading to prevent duplicate requests.

### 4.8 Real-Time Event Addition

`addEvent(event)` prepends a single event to the top of the feed:

1. The event is inserted at the beginning of the events array.
2. The corresponding DOM element is created and prepended to the appropriate date group (or a new date group header is created if needed).
3. An entrance animation plays: the event slides down from `translateY(-10px)` and fades in from `opacity: 0` over 200ms.
4. If the feed is scrolled down, the new event is added at the top without forcing a scroll position change (the user's current scroll position is preserved).

### 4.9 Empty State

When the events array is empty:

- An empty state is rendered using the EmptyState component (if available) or a built-in fallback.
- Default empty state: icon `bi-journal-text`, heading "No activity yet", description "Activity will appear here as events occur."
- The empty state configuration can be overridden via `emptyStateOptions`.
- When the first event is added, the empty state is automatically removed.

### 4.10 Compact Mode

When `compact` is true:

- Avatar size reduces from 36px to 24px.
- Vertical padding between events reduces from `0.75rem` to `0.375rem`.
- The event type icon replaces the avatar (icon displayed in a small inline circle instead of the avatar image).
- Rich content blocks are hidden (only the action line is shown).
- Date group headers use a smaller font size.
- Intended for sidebars, panels, and constrained containers.

---

## 5. Styling

### 5.1 CSS Classes

| Class | Description |
|-------|-------------|
| `.activityfeed` | Root container -- scrollable, `role="feed"` |
| `.activityfeed-compact` | Compact mode modifier |
| `.activityfeed-group` | Date group wrapper |
| `.activityfeed-group-header` | Date group heading ("Today", "Yesterday", etc.) |
| `.activityfeed-event` | Individual event card, `role="article"` |
| `.activityfeed-event-entering` | Entrance animation state for new events |
| `.activityfeed-avatar` | Avatar container (image or initials) |
| `.activityfeed-avatar-img` | Avatar `<img>` element |
| `.activityfeed-avatar-initials` | Initials fallback circle |
| `.activityfeed-avatar-badge` | Event type icon badge overlapping the avatar corner |
| `.activityfeed-body` | Event body: action line + content |
| `.activityfeed-action` | Action text line ("{actor} {action} {target}") |
| `.activityfeed-actor` | Actor name (clickable if `onActorClick` is set) |
| `.activityfeed-target` | Target name (clickable link if `targetUrl` is set) |
| `.activityfeed-timestamp` | Relative timestamp `<time>` element |
| `.activityfeed-content` | Rich content block below the action line |
| `.activityfeed-content-expanded` | Expanded content (after "Show more") |
| `.activityfeed-show-more` | "Show more" toggle button |
| `.activityfeed-type-icon` | Inline event type icon (compact mode) |
| `.activityfeed-sentinel` | IntersectionObserver target element |
| `.activityfeed-loading` | Loading indicator during pagination |
| `.activityfeed-end` | "End of activity" message |
| `.activityfeed-error` | Error state with retry button |
| `.activityfeed-empty` | Empty state container |

### 5.2 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Background | `transparent` | Inherits from container |
| Event card background | `transparent` | No card chrome; uses spacing and borders for separation |
| Event card hover | `$gray-100` background | Subtle highlight (only when `onEventClick` is set) |
| Event card border-bottom | `1px solid $gray-200` | Light separator between events |
| Actor name | `$gray-900`, `$font-weight-semibold` | Bold, clickable |
| Actor name hover | `$blue-600` (when `onActorClick` set) | Link-like affordance |
| Action text | `$gray-700` | Secondary text colour |
| Target text | `$blue-600` | Link colour |
| Target hover | `$blue-700`, underline | Standard link hover |
| Timestamp | `$gray-400`, `$font-size-sm` | De-emphasized, right-aligned |
| Content text | `$gray-600`, `$font-size-sm` | Muted content block |
| Date group header | `$gray-500`, `$font-weight-semibold`, `$font-size-sm`, uppercase | Section divider |
| Date group header border-bottom | `1px solid $gray-200` | Light underline |
| Avatar initials background | Deterministic palette | Consistent per actor |
| Avatar initials text | `$gray-50` | Light text on coloured background |
| Event type badge | Variant colour background, `$gray-50` icon | Small icon overlay |
| Loading indicator | `$gray-400` spinner | Subtle loading feedback |
| End message | `$gray-400`, `$font-size-sm` | De-emphasized terminus |
| "Show more" button | `$blue-600`, `$font-size-sm` | Action link |
| SCSS import | `@import '../../src/scss/variables'` | Theme variables |

### 5.3 Dimensions

| Property | Full Mode | Compact Mode |
|----------|-----------|-------------|
| Avatar size | 36px | 24px |
| Event vertical padding | `0.75rem` | `0.375rem` |
| Event horizontal padding | `0.5rem` | `0.375rem` |
| Content indent | 48px (avatar + gap) | 32px |
| Date header margin-top | `1.5rem` | `0.75rem` |
| Date header margin-bottom | `0.5rem` | `0.25rem` |
| Minimum height (with scroll) | Per `height` option | Per `height` option |

### 5.4 Z-Index

The ActivityFeed does not use fixed positioning and does not require z-index management. It flows within the normal document layout or within a scrollable parent container.

---

## 6. Keyboard Interaction

| Key | Context | Action |
|-----|---------|--------|
| Tab | Feed | Moves focus to the next focusable event (or actor link, target link, show more button within an event) |
| Shift+Tab | Feed | Moves focus to the previous focusable element |
| Enter | Focused event card | Fires `onEventClick` (if set) |
| Enter | Actor name | Fires `onActorClick` (if set) |
| Enter | Target link | Fires `onTargetClick` or navigates to `targetUrl` |
| Enter / Space | "Show more" button | Expands truncated content |
| Enter / Space | "Retry" button (error state) | Retries `onLoadMore` |

No custom keyboard navigation (arrow keys between events) is implemented. Standard Tab-based navigation follows the WAI-ARIA `role="feed"` pattern, which recommends Tab navigation between articles.

---

## 7. Accessibility

### 7.1 Feed Container

| Attribute | Value |
|-----------|-------|
| `role` | `"feed"` |
| `aria-label` | `"Activity feed"` |
| `aria-busy` | `"true"` while loading more events, `"false"` otherwise |

### 7.2 Event Articles

| Element | Attribute | Value |
|---------|-----------|-------|
| Event card | `role` | `"article"` |
| Event card | `aria-labelledby` | ID of the action line element (announces the action text) |
| Event card | `tabindex` | `"0"` (focusable when `onEventClick` is set) |

### 7.3 Date Group Headers

| Attribute | Value |
|-----------|-------|
| `role` | `"heading"` |
| `aria-level` | `"3"` |

### 7.4 Timestamps

- Rendered as `<time>` elements with the `datetime` attribute set to the ISO 8601 string.
- The `title` attribute provides the absolute date and time on hover.
- The displayed text content is the relative timestamp (e.g., "3 minutes ago").

### 7.5 Avatars

- All avatar elements (images and initials): `aria-hidden="true"` (decorative).
- The actor's name is always present as text content in the action line, so no alt text is needed on the avatar.

### 7.6 Pagination Sentinel

| Attribute | Value |
|-----------|-------|
| `aria-label` | `"Loading more events"` |
| `role` | `"status"` (during loading) |

### 7.7 Rich Content

- Content blocks are associated with their parent event via DOM nesting inside the `role="article"` element.
- "Show more" / "Show less" buttons: `aria-expanded="true"` or `"false"`.

### 7.8 General

- All colour combinations meet WCAG AA contrast.
- Focus ring: visible `2px solid $blue-600` outline on focusable elements.
- `prefers-reduced-motion`: entrance animations are replaced with a simple opacity fade.

---

## 8. Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| Bootstrap 5 CSS | Yes | For `$gray-*`, `$blue-*`, `$green-*`, `$red-*`, `$purple-*`, `$teal-*`, `$cyan-*` SCSS variables |
| Bootstrap Icons | Yes | For event type default icons (`bi-chat-left-text`, `bi-arrow-repeat`, `bi-person-plus`, `bi-plus-circle`, `bi-trash`, `bi-cloud-upload`, `bi-circle`, `bi-journal-text`) |
| Enterprise Theme CSS | Yes | For theme variable overrides |
| EmptyState component | Optional | Used for the empty state when available. Falls back to built-in empty state. |
| No JavaScript framework dependencies | -- | Vanilla TypeScript only |

---

## 9. Open Questions

1. Should relative timestamps auto-update on a timer (e.g., every 60 seconds), or is render-time calculation sufficient? Auto-updating adds complexity and potential performance concerns for large feeds.
2. Should the component support event threading (replies nested under a parent event), or is that a separate "Conversation" component concern?
3. Should the "Show more" toggle on rich content have a configurable line count threshold (currently hardcoded to 3 lines)?
4. Should the IntersectionObserver use a root margin to trigger loading slightly before the sentinel becomes visible (e.g., `rootMargin: "200px"`) for smoother perceived performance?
5. Should the feed support event deletion (`removeEvent(id)`) with an exit animation, or is `setEvents()` sufficient for removing events?
