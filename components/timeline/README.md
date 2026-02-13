<!-- AGENT: Documentation for the Timeline component — horizontal event timeline with point/span events. -->

# Timeline

A horizontal event timeline component for displaying point and span events along a time axis. Supports grouped rows, collapsible sections, viewport panning, a "now" marker, and item selection.

## Features

- **Point and span events** -- circular markers for moments; horizontal bars for durations
- **Grouped rows** -- organise items into labelled, sortable groups
- **Collapsible groups** -- expand or collapse groups to manage visual density
- **Viewport control** -- set, pan, and query the visible date range programmatically
- **Drag-to-pan** -- drag left/right on the body or axis, Shift+wheel for fine panning
- **Timezone support** -- display labels in any IANA timezone; optional built-in selector
- **Configurable tick intervals** -- auto or explicit (5min, 10min, 15min, 30min, 1h, etc.)
- **Now marker** -- optional vertical line indicating the current time
- **Item selection** -- click or programmatic selection with change callbacks
- **Size variants** -- small, medium, and large density presets (`sm`, `md`, `lg`)
- **Scrollable rows** -- vertical scroll after a configurable maximum row count
- **Full keyboard accessibility** -- ARIA roles, roving tabindex, keyboard navigation
- **Security** -- all user-supplied text rendered via `textContent`; no `innerHTML`

## Assets

| Asset | Path | Description |
|-------|------|-------------|
| TypeScript source | `components/timeline/timeline.ts` | Component source code |
| Compiled JS | `dist/components/timeline/timeline.js` | IIFE-wrapped JavaScript |
| Type declarations | `dist/components/timeline/timeline.d.ts` | TypeScript declaration file |
| SCSS source | `components/timeline/timeline.scss` | Component styles |
| Compiled CSS | `dist/components/timeline/timeline.css` | Compiled stylesheet |

**Requires:** Bootstrap CSS (for SCSS variables). Does **not** require Bootstrap JS or Bootstrap Icons.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/timeline/timeline.css">
<script src="dist/components/timeline/timeline.js"></script>

<div id="my-timeline"></div>

<script>
    var timeline = createTimeline({
        containerId: "my-timeline",
        start: new Date("2026-01-01"),
        end: new Date("2026-12-31"),
        items: [
            {
                id: "release-1",
                type: "point",
                start: new Date("2026-03-15"),
                label: "v2.0 Release"
            },
            {
                id: "sprint-4",
                type: "span",
                start: new Date("2026-04-01"),
                end: new Date("2026-04-14"),
                label: "Sprint 4",
                color: "#2b8a3e"
            }
        ],
        onItemClick: function(item) { console.log("Clicked:", item.id); }
    });
</script>
```

## API Reference

### 5.1 Types

```typescript
type TimelineItemType = "point" | "span";
type TimelineSize = "sm" | "md" | "lg";
type TickIntervalPreset = "1min" | "5min" | "10min" | "15min" | "30min" | "1h" | "3h" | "6h" | "12h" | "1d";
```

### 5.2 TimelineItem Interface

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `string` | Yes | -- | Unique identifier for the item |
| `type` | `TimelineItemType` | Yes | -- | `"point"` for a single moment or `"span"` for a duration |
| `start` | `Date` | Yes | -- | Start date and time |
| `end` | `Date` | For spans | -- | End date and time (required when `type` is `"span"`) |
| `label` | `string` | Yes | -- | Display label rendered on or beside the item |
| `tooltip` | `string` | No | -- | Native browser tooltip via the `title` attribute |
| `color` | `string` | No | `"#0d6efd"` | CSS colour applied to the item |
| `cssClass` | `string` | No | -- | Additional CSS class added to the item element |
| `group` | `string` | No | -- | Group ID that this item belongs to |
| `data` | `unknown` | No | -- | Arbitrary user data passed through to callbacks |

### 5.3 TimelineGroup Interface

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | `string` | Yes | -- | Unique group identifier |
| `label` | `string` | Yes | -- | Display label shown in the group label column |
| `collapsible` | `boolean` | No | `true` | Whether the group can be collapsed |
| `collapsed` | `boolean` | No | `false` | Whether the group is initially collapsed |
| `order` | `number` | No | `0` | Sort order; lower values appear first |
| `cssClass` | `string` | No | -- | Additional CSS class on the group row |

### 5.4 TimelineOptions Interface

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `containerId` | `string` | Yes | -- | DOM container element ID |
| `start` | `Date` | Yes | -- | Viewport start date |
| `end` | `Date` | Yes | -- | Viewport end date |
| `items` | `TimelineItem[]` | No | `[]` | Initial items |
| `groups` | `TimelineGroup[]` | No | `[]` | Group definitions |
| `maxVisibleRows` | `number` | No | `8` | Max rows before scroll |
| `showHeader` | `boolean` | No | `true` | Show time axis header |
| `showGroupLabels` | `boolean` | No | `true` | Show group label column |
| `showNowMarker` | `boolean` | No | `false` | Show "now" marker line |
| `pointSize` | `number` | No | `10` | Point marker diameter (px) |
| `spanHeight` | `number` | No | `24` | Span bar height (px) |
| `rowGap` | `number` | No | `4` | Vertical row gap (px) |
| `groupLabelWidth` | `number` | No | `120` | Label column width (px) |
| `collapsedBandHeight` | `number` | No | `6` | Collapsed band height (px) |
| `collapsedBandColor` | `string` | No | `"#adb5bd"` | Collapsed band colour |
| `size` | `TimelineSize` | No | `"md"` | Density variant |
| `height` | `string` | No | -- | CSS height (e.g., `"400px"`) |
| `width` | `string` | No | `"100%"` | CSS width |
| `cssClass` | `string` | No | -- | Extra CSS class on root |
| `selectedItemId` | `string` | No | `null` | Initially selected item ID |
| `disabled` | `boolean` | No | `false` | Disable all interactions |
| `timezone` | `string` | No | Browser local | IANA timezone for display labels (e.g. `"UTC"`, `"America/New_York"`) |
| `showTimezoneSelector` | `boolean` | No | `false` | Show timezone badge/dropdown in header |
| `tickInterval` | `number \| TickIntervalPreset \| "auto"` | No | `"auto"` | Tick interval in ms, named preset, or auto-select |
| `pannable` | `boolean` | No | `false` | Enable drag-to-pan on body and axis |
| `onItemClick` | `(item) => void` | No | -- | Item click callback |
| `onItemSelect` | `(item \| null) => void` | No | -- | Selection change callback |
| `onItemVisible` | `(items[]) => void` | No | -- | Visible items change callback |
| `onViewportChange` | `(start, end) => void` | No | -- | Viewport change callback |
| `onGroupToggle` | `(group, collapsed) => void` | No | -- | Group toggle callback |
| `onTimezoneChange` | `(timezone) => void` | No | -- | Timezone change callback |

### 5.5 Methods

**Item API**

| Method | Description |
|--------|-------------|
| `addItem(item)` | Add a single item and re-render. |
| `addItems(items)` | Add multiple items in one batch. |
| `removeItem(id)` | Remove an item by ID. |
| `updateItem(item)` | Replace item matching `item.id`. |
| `getItems()` | Return a copy of all items. |

**Selection API**

| Method | Description |
|--------|-------------|
| `selectItem(id)` | Select by ID, or pass `null` to clear. |
| `getSelectedItem()` | Return selected item or `null`. |

**Group API**

| Method | Description |
|--------|-------------|
| `addGroup(group)` | Add a group definition. |
| `removeGroup(id)` | Remove a group by ID. |
| `updateGroup(group)` | Replace group matching `group.id`. |
| `toggleGroup(id)` | Toggle collapsed state. |
| `collapseAll()` | Collapse all groups. |
| `expandAll()` | Expand all groups. |

**Viewport API**

| Method | Description |
|--------|-------------|
| `setViewport(start, end)` | Set the visible date range. |
| `getViewport()` | Return `{ start, end }` dates. |
| `scrollToDate(date)` | Centre viewport on date. |

**Timezone API**

| Method | Description |
|--------|-------------|
| `setTimezone(tz)` | Set display timezone (IANA string). Re-renders labels. |
| `getTimezone()` | Return current timezone string. |

**Tick Interval API**

| Method | Description |
|--------|-------------|
| `setTickInterval(interval)` | Set tick interval (ms, preset, or `"auto"`). |
| `getTickInterval()` | Return current tick interval setting. |

**Lifecycle**

| Method | Description |
|--------|-------------|
| `show()` | Render into the container element. |
| `hide()` | Remove from DOM without destroying state. |
| `destroy()` | Hide and release all references and listeners. |
| `setDisabled(disabled)` | Enable or disable interactions. |

### Convenience Functions

```typescript
createTimeline(options)    // Create, show, and return
```

### Global Exports

```
window.Timeline
window.createTimeline
```

## Examples

### Grouped timeline with collapsible sections

```javascript
var timeline = createTimeline({
    containerId: "project-timeline",
    start: new Date("2026-01-01"),
    end: new Date("2026-06-30"),
    groups: [
        { id: "backend", label: "Backend", order: 1 },
        { id: "frontend", label: "Frontend", order: 2 },
        { id: "milestones", label: "Milestones", order: 0, collapsible: false }
    ],
    items: [
        { id: "api", type: "span", start: new Date("2026-01-15"),
          end: new Date("2026-02-28"), label: "API Design", group: "backend" },
        { id: "ui", type: "span", start: new Date("2026-02-01"),
          end: new Date("2026-04-15"), label: "UI Build", group: "frontend", color: "#2b8a3e" },
        { id: "launch", type: "point", start: new Date("2026-05-01"),
          label: "Launch", group: "milestones", color: "#e67700" }
    ],
    showNowMarker: true,
    onGroupToggle: function(group, collapsed)
    {
        console.log(group.label, collapsed ? "collapsed" : "expanded");
    }
});
```

### Dynamic item management

```javascript
timeline.addItem({ id: "hotfix-1", type: "point", start: new Date("2026-03-10"), label: "Hotfix deployed" });

timeline.addItems([
    { id: "testing", type: "span", start: new Date("2026-03-01"),
      end: new Date("2026-03-14"), label: "QA Testing", group: "backend" },
    { id: "freeze", type: "point", start: new Date("2026-03-15"), label: "Code Freeze" }
]);

timeline.updateItem({ id: "hotfix-1", type: "point", start: new Date("2026-03-12"),
    label: "Hotfix (rescheduled)", color: "#dc3545" });

timeline.removeItem("hotfix-1");
```

### Viewport control and selection

```javascript
timeline.setViewport(new Date("2026-04-01"), new Date("2026-06-30"));
timeline.scrollToDate(new Date());
timeline.selectItem("sprint-4");
timeline.selectItem(null);

var vp = timeline.getViewport();
console.log("Showing:", vp.start, "to", vp.end);
```

### Timezone and tick interval control

```javascript
var timeline = createTimeline({
    containerId: "tz-timeline",
    start: new Date("2026-02-13T00:00:00Z"),
    end: new Date("2026-02-14T00:00:00Z"),
    timezone: "UTC",
    showTimezoneSelector: true,
    tickInterval: "1h",
    onTimezoneChange: function(tz) { console.log("Now showing:", tz); }
});

// Switch timezone programmatically
timeline.setTimezone("America/New_York");

// Change tick interval
timeline.setTickInterval("15min");
timeline.setTickInterval("auto");
```

### Drag-to-pan

```javascript
var timeline = createTimeline({
    containerId: "pan-timeline",
    start: new Date("2026-02-10"),
    end: new Date("2026-02-17"),
    pannable: true,
    onViewportChange: function(start, end)
    {
        console.log("Viewport:", start, "to", end);
    }
});
```

Drag left/right on the body or axis to scroll through time. Shift+mouse wheel also pans horizontally.

### Callbacks for application integration

```javascript
var timeline = createTimeline({
    containerId: "ops-timeline",
    start: new Date("2026-01-01"),
    end: new Date("2026-12-31"),
    onItemClick: function(item) { showDetailPanel(item.data); },
    onItemSelect: function(item) { item ? highlightRelated(item.id) : clearHighlights(); },
    onViewportChange: function(start, end)
    {
        fetchEventsForRange(start, end).then(function(events) { timeline.addItems(events); });
    },
    onItemVisible: function(items) { console.log(items.length, "items visible"); }
});
```

## Accessibility

| Feature | Implementation |
|---------|----------------|
| Region landmark | Root element uses `role="region"` with `aria-label`. |
| Group headings | Interactive headings that toggle collapse state. |
| Item roles | `role="button"` with `aria-label` containing label and date. |
| Selection state | Selected items indicated with `aria-pressed="true"`. |
| Disabled state | Root element has `aria-disabled="true"`; items become inert. |
| Tooltips | `tooltip` field maps to native `title` attribute. |

| Key | Action |
|-----|--------|
| Tab | Focus timeline / navigate between groups |
| Arrow Left / Right | Navigate between items in a row |
| Arrow Up / Down | Navigate between rows or groups |
| Enter / Space | Select or activate focused item |
| Escape | Clear selection |
| Home / End | First or last item in current row |

## Security

The Timeline component applies the following measures to prevent cross-site scripting (XSS):

- **All labels and tooltips** are rendered using `textContent` only. User-supplied strings are never interpreted as HTML.
- **No `innerHTML`** is used anywhere in the component. All DOM construction uses `createElement` and `textContent`.
- **Colour values** are applied via inline `style` properties and are restricted to CSS colour syntax.
- **The `data` field** is opaque to the component and is never rendered into the DOM.

See `specs/timeline.prd.md` for the complete specification.
