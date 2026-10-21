# ActivityFeed

Social-style activity feed with date grouping, infinite scroll, real-time additions, and compact mode.

## Usage

```html
<link rel="stylesheet" href="components/activityfeed/activityfeed.css">
<script src="components/activityfeed/activityfeed.js"></script>
```

```javascript
const feed = createActivityFeed({
    events: [
        {
            id: "1",
            actor: { id: "u1", name: "Jane Doe" },
            action: "commented on",
            target: "Project Alpha",
            targetUrl: "/projects/alpha",
            timestamp: new Date(),
            eventType: "comment",
            content: "Looking great! Let's ship this week."
        }
    ],
    height: "400px",
    onLoadMore: async () => fetchMoreEvents(),
    onEventClick: (ev) => console.log("Clicked:", ev.id),
}, "my-container");
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `events` | `ActivityEvent[]` | `[]` | Initial events |
| `groupByDate` | `boolean` | `true` | Group by Today/Yesterday/This Week/Earlier |
| `showAvatars` | `boolean` | `true` | Show actor avatars |
| `compact` | `boolean` | `false` | Compact mode |
| `maxInitialEvents` | `number` | `20` | Max initial render |
| `height` | `string` | `"auto"` | Container height |
| `onLoadMore` | `() => Promise<ActivityEvent[]>` | - | Infinite scroll callback |
| `onEventClick` | `(ev) => void` | - | Event card click |
| `onActorClick` | `(actor) => void` | - | Actor name click |
| `onTargetClick` | `(ev) => void` | - | Target link click |

## API

| Method | Description |
|--------|-------------|
| `show(containerId)` | Mount to container |
| `hide()` | Remove from DOM |
| `destroy()` | Full cleanup |
| `addEvent(ev)` | Prepend real-time event. Announces who did what to what |
| `addEvents(evs)` | Append events (pagination). Announces a count |
| `setEvents(evs)` | Replace all events |
| `getEvents()` | Get current events |
| `clear()` | Remove all events |
| `refresh()` | Re-render |
| `scrollToTop()` | Scroll to top |

## Accessibility

The feed mounts an `aria-live="polite"` `aria-atomic="true"` region, and
both methods that add activity write to it. `addEvent` announces the actor,
the verb and the target. `addEvents` announces a count rather than the
events, because `aria-atomic` makes the region read as a single utterance
and a bulk load would otherwise read the whole batch aloud.

Before 2026-10-21 the region was built and appended on every mount and
nothing ever wrote to it, so a screen-reader user was told nothing when new
activity arrived (UNUSED-1).

## Event Types

| Type | Icon | Colour |
|------|------|--------|
| `comment` | bi-chat-left-text | Blue |
| `status_change` | bi-arrow-repeat | Purple |
| `assignment` | bi-person-plus | Teal |
| `creation` | bi-plus-circle | Green |
| `deletion` | bi-trash | Red |
| `upload` | bi-cloud-upload | Cyan |
| `custom` | bi-circle | Gray |
