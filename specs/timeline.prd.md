<!-- AGENT: Product Requirements Document for the Timeline component — horizontal event timeline with point/span events, row packing, grouping, collapsing, selection, and viewport callbacks. -->

# Timeline Component — Product Requirements

**Status:** Draft
**Component name:** Timeline
**Folder:** `./components/timeline/`
**Spec author:** Agent
**Date:** 2026-02-12

---

## 1. Overview

### 1.1 What Is It

A programmable horizontal event timeline component for visualising point and span events across a configurable time range. Designed for enterprise B2B and B2C SaaS applications that need to display temporal data such as deployments, incidents, scheduled tasks, user activity sessions, and system events.

The timeline supports:

- **Two event types** — **points** (pins at a single moment in time) and **spans** (blocks stretching from a start to an end time).
- **Row packing** — overlapping spans stack vertically in separate rows; non-overlapping spans share rows to maximise density.
- **Groups** — events are organised into labelled groups with sticky left-aligned labels and independent row packing per group.
- **Collapsible groups** — collapsed groups replace individual span rows with a single-colour "presence band" showing merged time coverage; point events remain visible as dots above the band.
- **Selection** — items are clickable with `onItemClick` and `onItemSelect` callbacks so other components can react to selection state.
- **Viewport control** — defined start/end viewport bounds; only events within the viewport range are rendered.
- **Viewport visibility callbacks** — `onItemVisible` fires when items scroll into view via `IntersectionObserver`.
- **Now marker** — optional red vertical line at the current time.
- **Configurable sizing** — colours, sizes (sm/md/lg), pin sizes, span height, span colours, and max visible rows.
- **Scrollable overflow** — when rows exceed `maxVisibleRows`, the group content area scrolls vertically.
- **Pure DOM rendering** — all elements are standard HTML `div` elements; SVG is used only for point markers (pin shapes).

### 1.2 Why Build It

Enterprise SaaS applications frequently need temporal event visualisation for:

- Deployment and release timelines in CI/CD dashboards.
- Incident and alert timelines in operations consoles.
- User session and activity tracking in analytics tools.
- Scheduled task and job execution views in admin panels.
- Audit trail and compliance event logs.
- Project milestone and sprint tracking.

Thirteen open-source timeline libraries were evaluated:

### 1.3 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| vis-timeline | Not recommended | 250KB bundle, missing presence bands, buggy viewport callbacks, 265 open issues |
| DHTMLX Gantt | Not recommended | Commercial licence; project management focus, not event visualisation |
| Frappe Gantt | Not recommended | SVG-only rendering, no Bootstrap integration, no grouping, no collapse |
| Bryntum Scheduler | Not recommended | Commercial licence; $2,795+; massive bundle |
| TimelineJS | Not recommended | Narrative storytelling focus; no Gantt-style layout, no stacking |
| React-Calendar-Timeline | Not recommended | React dependency; no vanilla JS |
| PlanBy | Not recommended | React dependency; scheduling focus, not event timeline |
| jQuery Gantt | Not recommended | jQuery dependency; unmaintained (last update 2019) |
| Google Charts Timeline | Not recommended | Proprietary Google library; SVG-only, no collapse or presence bands |
| D3-Timeline | Not recommended | D3 dependency; too low-level, requires significant custom code |
| Chronoline.js | Not recommended | Abandoned (last update 2017); jQuery dependency; basic point events only |
| TimelinePointer | Not recommended | React dependency; minimal features |
| vis-timeline-graph2d | Not recommended | Fork of vis-timeline with same issues |

**Decision:** No library exceeds 65% of requirements. Critical gaps across all candidates: presence bands on collapse, IntersectionObserver-based visibility callbacks, row packing with point/span coexistence, Bootstrap 5 integration, and IIFE-wrapped vanilla TypeScript architecture. Build custom.

### 1.4 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| vis-timeline | Horizontal axis, item positioning, group rows, drag-to-scroll |
| DHTMLX Gantt | Row packing algorithm, group collapse, sticky group labels |
| Google Charts Timeline | Span block rendering, native tooltip display, colour coding |
| Azure DevOps Pipeline View | Presence band visualisation when groups are collapsed |
| GitHub Contribution Graph | Grid-based visual density, colour intensity mapping |

---

## 2. Use Cases

| Use Case | Event Types | Features Needed |
|----------|-------------|-----------------|
| CI/CD deployment timeline | Points (deploys), Spans (build jobs) | Groups by environment, now marker, colour by status |
| Incident management console | Points (alerts), Spans (incidents) | Collapsible groups, selection, viewport callbacks |
| User session analytics | Spans (sessions) | Row packing, presence bands, large datasets |
| Scheduled job execution | Spans (jobs), Points (triggers) | Groups by job type, overflow scrolling |
| Audit trail viewer | Points (events) | Viewport visibility, tooltip details, click handlers |
| Sprint/milestone tracker | Points (milestones), Spans (sprints) | Groups by team, now marker, size variants |

---

## 3. Anatomy

### 3.1 Full Component

```
+--[Group Label Width]--+--[Timeline Axis]--------------------------------+
|                        | 00:00   06:00   12:00   18:00   00:00          |
+------------------------+------------------------------------------------+
| > Frontend             | [====Deploy====]    [==Test==]                 |
|                        |        [===Build===]        *hotfix            |
|                        |                                 [===Release==] |
+------------------------+------------------------------------------------+
| v Backend (collapsed)  | ████████████    ████████████████               |
|                        |   *db-migrate      *cache-flush                |
+------------------------+------------------------------------------------+
| > DevOps               | [=====Monitor=====]                            |
|                        |    *alert-1   *alert-2     [===Rollback===]    |
+------------------------+------------------------------------------------+
|                        |              |  <-- now marker (red line)       |
+------------------------+------------------------------------------------+
```

Legend:
- `[====Label====]` = span event (block with start-to-end)
- `*label` = point event (pin at a single moment)
- `████` = presence band (collapsed group, merged time ranges)
- `>` = expanded group toggle
- `v` = collapsed group toggle
- `|` = now marker (red vertical line)

### 3.2 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `role="region"` with `aria-label` |
| Header | Optional | Sticky top axis with time ticks |
| Header spacer | Auto | Empty cell matching group label width |
| Axis | Yes | Positioned tick marks with time labels |
| Tick | Yes (1+) | Individual tick mark and label on the axis |
| Body | Yes | Scrollable container for groups |
| Group | Yes (1+) | Container for a labelled set of rows |
| Group label | Optional | Sticky left label with collapse toggle |
| Group toggle | Optional | Chevron button for collapse/expand |
| Group label text | Yes | Group name display |
| Group content | Yes | Rows container within a group |
| Row | Yes (1+) | Single horizontal lane for non-overlapping items |
| Item (span) | Optional | Block element positioned by start/end time |
| Item label | Optional | Text label within a span block |
| Item (point) | Optional | Pin marker positioned at a single time |
| Point marker | Yes | SVG pin/dot shape for point events |
| Presence band | Auto | Collapsed-mode merged time range indicator |
| Presence range | Auto | Individual filled segment within a presence band |
| Presence dot | Auto | Point event marker within a collapsed presence band |
| Now marker | Optional | Red vertical line at current time |

---

## 4. API

### 4.1 Types

```typescript
/** Event type — a point in time or a span of time. */
type TimelineItemType = "point" | "span";

/** Size variant for the timeline component. */
type TimelineSize = "sm" | "md" | "lg";
```

### 4.2 Interfaces

```typescript
/** A single event item on the timeline. */
interface TimelineItem
{
    /** Unique identifier for this item. */
    id: string;

    /** Whether this is a point or span event. */
    type: TimelineItemType;

    /** Start time of the event. For points, this is the event time. */
    start: Date;

    /** End time of the event. Required for spans, ignored for points. */
    end?: Date;

    /** Display label shown on or beside the item. */
    label: string;

    /** Tooltip text shown on hover (native title attribute). */
    tooltip?: string;

    /** CSS colour value for the item. */
    color?: string;

    /** Additional CSS class(es) for the item element. */
    cssClass?: string;

    /** Group ID this item belongs to. Ungrouped if omitted. */
    group?: string;

    /** Arbitrary consumer data attached to this item. */
    data?: unknown;
}

/** A group of related events displayed in a labelled section. */
interface TimelineGroup
{
    /** Unique identifier for this group. */
    id: string;

    /** Display label for the group (shown in the sticky left column). */
    label: string;

    /** Whether the group can be collapsed. Default: true. */
    collapsible?: boolean;

    /** Initial collapsed state. Default: false. */
    collapsed?: boolean;

    /** Sort order. Lower values appear first. Default: 0. */
    order?: number;

    /** Additional CSS class(es) for the group element. */
    cssClass?: string;
}

/** Configuration options for the Timeline component. */
interface TimelineOptions
{
    /** ID of the container element to render into. */
    containerId: string;

    /** Viewport start time — left edge of the visible range. */
    start: Date;

    /** Viewport end time — right edge of the visible range. */
    end: Date;

    /** Initial set of timeline items. Default: []. */
    items?: TimelineItem[];

    /** Initial set of groups. Default: []. */
    groups?: TimelineGroup[];

    /** Maximum visible rows per group before vertical scroll. Default: 5. */
    maxVisibleRows?: number;

    /** Show the time axis header. Default: true. */
    showHeader?: boolean;

    /** Show sticky group labels on the left. Default: true. */
    showGroupLabels?: boolean;

    /** Show the now marker (red vertical line at current time). Default: false. */
    showNowMarker?: boolean;

    /** Point marker diameter in pixels. Default: size-dependent (8/10/14). */
    pointSize?: number;

    /** Span block height in pixels. Default: size-dependent (18/24/32). */
    spanHeight?: number;

    /** Vertical gap between rows in pixels. Default: 2. */
    rowGap?: number;

    /** Width of the group label column in pixels. Default: 140. */
    groupLabelWidth?: number;

    /** Height of the collapsed presence band in pixels. Default: 8. */
    collapsedBandHeight?: number;

    /** Default colour for the collapsed presence band. Default: "$blue-200". */
    collapsedBandColor?: string;

    /** Size variant. Default: "md". */
    size?: TimelineSize;

    /** Explicit height CSS value. Default: "auto". */
    height?: string;

    /** Explicit width CSS value. Default: "100%". */
    width?: string;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** ID of the initially selected item. Default: null. */
    selectedItemId?: string | null;

    /** Disabled state — disables click and selection. Default: false. */
    disabled?: boolean;

    // -- Callbacks --

    /** Called when an item is clicked. */
    onItemClick?: (item: TimelineItem) => void;

    /** Called when an item is selected or deselected (null = deselected). */
    onItemSelect?: (item: TimelineItem | null) => void;

    /** Called when items become visible in the viewport via IntersectionObserver. */
    onItemVisible?: (items: TimelineItem[]) => void;

    /** Called when the viewport time range changes. */
    onViewportChange?: (start: Date, end: Date) => void;

    /** Called when a group is collapsed or expanded. */
    onGroupToggle?: (group: TimelineGroup, collapsed: boolean) => void;
}
```

### 4.3 Constructor

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the timeline DOM tree from `options`. Sets defaults, initialises internal state, builds the axis, groups, and rows. Does not attach to the page. |

### 4.4 Methods

#### Item API

| Method | Description |
|--------|-------------|
| `addItem(item)` | Adds a single item. Triggers row repacking for the item's group. Returns the `TimelineItem`. |
| `addItems(items)` | Adds multiple items in a single batch. Triggers row repacking once per affected group. |
| `removeItem(id)` | Removes an item by ID. Triggers row repacking for the affected group. |
| `updateItem(id, updates)` | Updates item properties (label, tooltip, color, start, end, group). Triggers re-render. |
| `getItems()` | Returns a copy of the current items array. |

#### Selection API

| Method | Description |
|--------|-------------|
| `selectItem(id)` | Selects an item by ID. Pass `null` to deselect. Fires `onItemSelect`. |
| `getSelectedItem()` | Returns the currently selected `TimelineItem` or `null`. |

#### Group API

| Method | Description |
|--------|-------------|
| `addGroup(group)` | Adds a new group. Items already present with matching `group` ID are assigned to it. |
| `removeGroup(id)` | Removes a group by ID. Items in the group become ungrouped. |
| `updateGroup(id, updates)` | Updates group properties (label, collapsible, collapsed, order, cssClass). |
| `toggleGroup(id)` | Toggles the collapsed state of a group. Fires `onGroupToggle`. |
| `collapseAll()` | Collapses all collapsible groups. Fires `onGroupToggle` for each. |
| `expandAll()` | Expands all collapsed groups. Fires `onGroupToggle` for each. |

#### Viewport API

| Method | Description |
|--------|-------------|
| `setViewport(start, end)` | Changes the visible time range. Re-renders all items and ticks. Fires `onViewportChange`. |
| `getViewport()` | Returns `{ start: Date, end: Date }` of the current viewport. |
| `scrollToDate(date)` | Centres the viewport on the given date without changing the time span width. Fires `onViewportChange`. |

#### Lifecycle

| Method | Description |
|--------|-------------|
| `show(container?)` | Appends to container (ID string or HTMLElement). Defaults to `document.body`. Initialises `IntersectionObserver`. |
| `hide()` | Removes from DOM without destroying state. Disconnects `IntersectionObserver`. |
| `destroy()` | Hides, releases all references, event listeners, and observers. |
| `isVisible()` | Returns whether the timeline is in the DOM. |
| `getElement()` | Returns the root DOM element. |

### 4.5 Convenience Functions

| Function | Description |
|----------|-------------|
| `createTimeline(options, container?)` | Create, show, and return a Timeline instance. |

### 4.6 Global Exports

```
window.Timeline
window.createTimeline
```

---

## 5. Rendering

### 5.1 Row Packing Algorithm

Row packing determines which items share a horizontal row and which must be placed on a new row. The algorithm runs independently for each group.

**For spans:**

1. Sort items by `start` ascending, then by duration descending (longer spans first).
2. Maintain an array of rows. Each row tracks the latest `end` time of its last placed item.
3. For each item, find the first row where `row.end <= item.start` (no overlap).
4. If found, place the item in that row and update `row.end = item.end`.
5. If no row has space, create a new row and place the item there.

**For points:**

Points occupy a small logical width for overlap detection (equal to `pointSize` converted to time units based on the current viewport scale). This prevents points at similar times from visually overlapping.

1. Convert `pointSize` pixels to a time duration: `pointDuration = (pointSize / containerWidth) * (viewportEnd - viewportStart)`.
2. Treat each point as a micro-span: `[start, start + pointDuration]`.
3. Pack using the same row packing algorithm as spans.

**Mixed events within a group:**

Points and spans are packed together into the same row set. A point's micro-span must not overlap with any span in the same row.

### 5.2 Presence Band Algorithm

When a group is collapsed, individual items are replaced by a presence band showing merged time coverage.

1. Collect all span items in the group.
2. Sort by `start` ascending.
3. Merge overlapping or adjacent spans into contiguous ranges: if `current.start <= previous.end`, extend `previous.end = max(previous.end, current.end)`.
4. Render each merged range as a filled `div.timeline-presence-range` within `div.timeline-presence-band`.
5. Collect all point items in the group.
6. Render each point as a `div.timeline-presence-dot` positioned at its time, above the presence band.
7. Use `collapsedBandColor` (default `$blue-200`) for the band fill. Individual item colours are not shown in collapsed mode.

### 5.3 Tick Interval Selection

The axis displays time ticks at intervals that depend on the viewport duration.

| Viewport Duration | Tick Interval | Label Format |
|-------------------|---------------|--------------|
| <= 2 hours | 10 minutes | `HH:mm` |
| <= 6 hours | 30 minutes | `HH:mm` |
| <= 24 hours | 2 hours | `HH:mm` |
| <= 3 days | 6 hours | `ddd HH:mm` |
| <= 7 days | 1 day | `ddd MMM D` |
| <= 30 days | 7 days | `MMM D` |
| <= 90 days | 14 days | `MMM D` |
| > 90 days | 1 month | `MMM YYYY` |

Tick labels are formatted using `Date.toLocaleString()` with appropriate options. No external date library is required.

### 5.4 Time-to-Position Mapping

All items are positioned using a linear mapping from time to horizontal pixel position:

```typescript
function timeToX(time: Date, viewportStart: Date, viewportEnd: Date, containerWidth: number): number
{
    const totalMs = viewportEnd.getTime() - viewportStart.getTime();
    const offsetMs = time.getTime() - viewportStart.getTime();
    return (offsetMs / totalMs) * containerWidth;
}
```

Items outside the viewport (`time < viewportStart` or `time > viewportEnd`) are not rendered. Items partially overlapping the viewport are clipped to the container bounds.

---

## 6. Events & Callbacks

| Callback | Trigger | Payload |
|----------|---------|---------|
| `onItemClick` | User clicks an item (span or point) | `TimelineItem` |
| `onItemSelect` | Item selection changes (click to select, click again or another item to change, `selectItem(null)` to deselect) | `TimelineItem` or `null` |
| `onItemVisible` | Items enter the visible viewport area (IntersectionObserver with `threshold: 0.1`) | `TimelineItem[]` (batch of newly visible items) |
| `onViewportChange` | Viewport time range changes via `setViewport()` or `scrollToDate()` | `(start: Date, end: Date)` |
| `onGroupToggle` | Group collapsed or expanded via toggle button, `toggleGroup()`, `collapseAll()`, or `expandAll()` | `(TimelineGroup, collapsed: boolean)` |

**IntersectionObserver setup:**

1. On `show()`, create an `IntersectionObserver` with the timeline body as the root and `threshold: [0.1]`.
2. Observe every `.timeline-item` element.
3. When items intersect, batch them into a single `onItemVisible` call using `requestAnimationFrame` to coalesce rapid intersection events.
4. Each item fires `onItemVisible` only once per viewport change. A `Set<string>` of visible item IDs is reset on `setViewport()`.
5. On `hide()` or `destroy()`, disconnect the observer.

**Callback safety:**

All consumer callbacks are wrapped in try/catch. Errors are logged with `LOG_PREFIX = "[Timeline]"` but do not break internal component state.

---

## 7. Collapsible Groups

### 7.1 Toggle Behaviour

- Groups with `collapsible: true` (default) show a chevron toggle button in the group label.
- Clicking the toggle or calling `toggleGroup(id)` switches between expanded and collapsed states.
- Expanded state: individual items rendered in packed rows.
- Collapsed state: items replaced by a single presence band row.
- The chevron rotates 90 degrees to indicate state (right = collapsed, down = expanded).
- `collapseAll()` and `expandAll()` operate on all groups with `collapsible: true`.

### 7.2 Collapsed Rendering

In collapsed state:

1. Remove all `.timeline-row` elements from the group content.
2. Compute the presence band (see Section 5.2).
3. Render a single `div.timeline-presence-band` with height `collapsedBandHeight`.
4. Point events render as small dots (`div.timeline-presence-dot`) positioned above the band.
5. Presence band segments and dots remain clickable — clicking fires `onItemClick` with the nearest item.

### 7.3 Transition Animation

Collapse and expand use a CSS `max-height` transition (200ms ease-out) for smooth visual feedback. The `prefers-reduced-motion: reduce` media query disables the transition.

---

## 8. Scrolling & Overflow

### 8.1 Vertical Overflow

When a group's packed rows exceed `maxVisibleRows`:

1. Set the group content container to `max-height: maxVisibleRows * (spanHeight + rowGap)`.
2. Enable `overflow-y: auto` on the group content container.
3. A subtle scrollbar appears (styled to match the theme via `::-webkit-scrollbar` customisation).

### 8.2 Horizontal Scrolling

The timeline does not support horizontal scrolling. All content is mapped to the viewport range and rendered within the container width. Consumers change the visible range via `setViewport()` or `scrollToDate()`.

---

## 9. Now Marker

When `showNowMarker` is `true`:

1. Render a `div.timeline-now-marker` as an absolutely positioned vertical line.
2. Position at `timeToX(new Date(), viewportStart, viewportEnd, containerWidth)`.
3. The marker spans the full height of the timeline body (all groups).
4. Colour: `$red-600`, width: `2px`, `z-index: 1` (above items, below tooltips).
5. If the current time is outside the viewport, the marker is hidden (`display: none`).
6. The marker position updates every 60 seconds via `setInterval`. The interval is cleared on `hide()` or `destroy()`.

---

## 10. CSS Classes

| Class | Description |
|-------|-------------|
| `.timeline` | Root container — `position: relative`, `display: flex`, `flex-direction: column`, `overflow: hidden` |
| `.timeline-sm` | Small size variant — compact spacing, smaller fonts and items |
| `.timeline-md` | Medium size variant (default) |
| `.timeline-lg` | Large size variant — generous spacing, larger items |
| `.timeline-disabled` | Disabled state — reduced opacity, `pointer-events: none` on items |
| `.timeline-header` | Sticky top axis container — `position: sticky`, `top: 0`, `z-index: 2` |
| `.timeline-header-spacer` | Empty cell matching group label column width |
| `.timeline-axis` | Horizontal axis with positioned ticks |
| `.timeline-tick` | Individual tick mark with time label |
| `.timeline-body` | Scrollable body container for groups |
| `.timeline-group` | Group container — `display: flex` |
| `.timeline-group-label` | Sticky left label column — `position: sticky`, `left: 0`, `z-index: 1` |
| `.timeline-group-toggle` | Collapse/expand chevron button |
| `.timeline-group-toggle-collapsed` | Rotated chevron state (pointing right) |
| `.timeline-group-label-text` | Group name text |
| `.timeline-group-content` | Rows container within a group — `position: relative` |
| `.timeline-row` | Single horizontal lane for packed items |
| `.timeline-item` | Base item class — `position: absolute`, clickable |
| `.timeline-item-span` | Span event modifier — coloured block |
| `.timeline-item-point` | Point event modifier — centred on time position |
| `.timeline-item-selected` | Selected item state — highlight border |
| `.timeline-item-label` | Text label within a span item |
| `.timeline-point-marker` | SVG element for the point pin shape |
| `.timeline-presence-band` | Collapsed group merged time visualisation |
| `.timeline-presence-range` | Individual filled segment within the presence band |
| `.timeline-presence-dot` | Point event marker within a collapsed presence band |
| `.timeline-now-marker` | Red vertical line at current time |

---

## 11. Size Variants

| Property | sm | md | lg |
|----------|----|----|-----|
| Span height | 18px | 24px | 32px |
| Point size (diameter) | 8px | 10px | 14px |
| Row gap | 1px | 2px | 4px |
| Group label font | `$font-size-sm` | `$font-size-base` | `$font-size-base` |
| Tick label font | 10px | 11px | 12px |
| Item label font | 10px | 11px | 12px |
| Group label width | 100px | 140px | 180px |
| Collapsed band height | 6px | 8px | 12px |
| Axis height | 20px | 24px | 30px |
| Presence dot size | 4px | 6px | 8px |

---

## 12. Accessibility

### 12.1 ARIA Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Root | `role="region"` | Landmark region |
| Root | `aria-label` | "Timeline" or consumer-provided label |
| Group | `role="group"` | Logical grouping |
| Group | `aria-label` | Group label text |
| Group toggle | `aria-expanded` | `"true"` or `"false"` |
| Group toggle | `aria-label` | "Collapse {group}" or "Expand {group}" |
| Item (span) | `role="button"` | Clickable element |
| Item (span) | `aria-label` | "{label}, {start} to {end}" |
| Item (span) | `tabindex` | `"0"` for focusable item, `"-1"` otherwise |
| Item (point) | `role="button"` | Clickable element |
| Item (point) | `aria-label` | "{label}, {start}" |
| Item (point) | `tabindex` | `"0"` for focusable item, `"-1"` otherwise |
| Selected item | `aria-pressed` | `"true"` |
| Now marker | `aria-hidden` | `"true"` — decorative |
| Presence band | `aria-label` | "{group} summary: {n} events" |
| Tick | `aria-hidden` | `"true"` — decorative axis element |

### 12.2 Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| **Tab** | Anywhere | Moves focus into the timeline, then to the first focusable item |
| **Arrow Right** | Item focused | Moves focus to the next item (by start time) |
| **Arrow Left** | Item focused | Moves focus to the previous item (by start time) |
| **Arrow Down** | Item focused | Moves focus to the next row or next group |
| **Arrow Up** | Item focused | Moves focus to the previous row or previous group |
| **Enter / Space** | Item focused | Selects the focused item, fires `onItemClick` and `onItemSelect` |
| **Escape** | Item selected | Deselects the current item |
| **Enter / Space** | Group toggle focused | Toggles group collapse state |
| **Home** | Item focused | Moves focus to the first item in the timeline |
| **End** | Item focused | Moves focus to the last item in the timeline |

### 12.3 Focus Management

- Items use roving tabindex within each group. Only the focused item has `tabindex="0"`.
- Group toggles are part of the tab order and focusable.
- On `show()`, focus is not automatically moved (timeline is typically a passive display).
- Selected item receives a visible focus ring matching `$blue-600`.

---

## 13. Security

### 13.1 Content Rendering

- **Item labels** — rendered via `textContent` only. No HTML parsing.
- **Tooltips** — set via the native `title` attribute. No custom tooltip HTML.
- **Group labels** — rendered via `textContent` only.
- **Presence band** — no user content; colours are validated CSS values.

### 13.2 Event Handling

- No inline event handlers (`onclick`, `onload`, etc.) in generated HTML.
- No `eval()`, `Function()`, or `setTimeout(string)`.
- All event listeners are attached programmatically via `addEventListener()`.

### 13.3 Data Handling

- `TimelineItem.data` is stored by reference and never rendered to the DOM.
- Consumer-provided colour values are applied via `style.backgroundColor`; no CSS injection path exists because values are set as DOM properties, not concatenated into strings.

---

## 14. Demo Scenarios

### 14.1 Basic Point Events

Eight point events distributed across a 24-hour viewport with different colours. Demonstrates time-to-position mapping, point marker rendering, tooltip display on hover, and click selection.

```typescript
const timeline = createTimeline({
    containerId: "demo-1",
    start: new Date("2026-02-12T00:00:00"),
    end: new Date("2026-02-13T00:00:00"),
    items: [
        { id: "p1", type: "point", start: new Date("2026-02-12T02:00:00"), label: "Deploy v1.0", color: "#1c7ed6", tooltip: "Production deploy at 02:00" },
        { id: "p2", type: "point", start: new Date("2026-02-12T05:30:00"), label: "Alert fired", color: "#e03131", tooltip: "CPU spike alert" },
        { id: "p3", type: "point", start: new Date("2026-02-12T08:00:00"), label: "Standup", color: "#2f9e44", tooltip: "Daily standup" },
        { id: "p4", type: "point", start: new Date("2026-02-12T10:15:00"), label: "PR merged", color: "#7048e8", tooltip: "Feature branch merged" },
        { id: "p5", type: "point", start: new Date("2026-02-12T13:00:00"), label: "Lunch deploy", color: "#1c7ed6", tooltip: "Staging deploy" },
        { id: "p6", type: "point", start: new Date("2026-02-12T16:45:00"), label: "Rollback", color: "#e8590c", tooltip: "Rollback to v0.9" },
        { id: "p7", type: "point", start: new Date("2026-02-12T19:00:00"), label: "Hotfix", color: "#e03131", tooltip: "Hotfix deployed" },
        { id: "p8", type: "point", start: new Date("2026-02-12T22:30:00"), label: "Nightly build", color: "#868e96", tooltip: "Scheduled nightly build" }
    ]
});
```

### 14.2 Basic Span Events

Six span events with deliberate overlaps to demonstrate row packing. Overlapping spans stack into separate rows; non-overlapping spans share rows.

```typescript
const timeline = createTimeline({
    containerId: "demo-2",
    start: new Date("2026-02-12T08:00:00"),
    end: new Date("2026-02-12T20:00:00"),
    items: [
        { id: "s1", type: "span", start: new Date("2026-02-12T08:00:00"), end: new Date("2026-02-12T11:00:00"), label: "Build pipeline", color: "#1c7ed6" },
        { id: "s2", type: "span", start: new Date("2026-02-12T09:30:00"), end: new Date("2026-02-12T12:30:00"), label: "Integration tests", color: "#2f9e44" },
        { id: "s3", type: "span", start: new Date("2026-02-12T12:00:00"), end: new Date("2026-02-12T14:00:00"), label: "Staging deploy", color: "#7048e8" },
        { id: "s4", type: "span", start: new Date("2026-02-12T13:00:00"), end: new Date("2026-02-12T16:00:00"), label: "Load testing", color: "#e8590c" },
        { id: "s5", type: "span", start: new Date("2026-02-12T16:30:00"), end: new Date("2026-02-12T18:00:00"), label: "Canary release", color: "#1c7ed6" },
        { id: "s6", type: "span", start: new Date("2026-02-12T17:00:00"), end: new Date("2026-02-12T19:30:00"), label: "Monitoring", color: "#2f9e44" }
    ]
});
```

### 14.3 Mixed Events with Groups

Three groups (Frontend, Backend, DevOps) with a mix of point and span events. Demonstrates group labels, per-group row packing, and group ordering.

```typescript
const timeline = createTimeline({
    containerId: "demo-3",
    start: new Date("2026-02-12T00:00:00"),
    end: new Date("2026-02-13T00:00:00"),
    groups: [
        { id: "frontend", label: "Frontend", order: 1 },
        { id: "backend", label: "Backend", order: 2 },
        { id: "devops", label: "DevOps", order: 3 }
    ],
    items: [
        { id: "f1", type: "span", start: new Date("2026-02-12T09:00:00"), end: new Date("2026-02-12T12:00:00"), label: "UI build", group: "frontend", color: "#1c7ed6" },
        { id: "f2", type: "point", start: new Date("2026-02-12T14:00:00"), label: "Hotfix", group: "frontend", color: "#e03131" },
        { id: "b1", type: "span", start: new Date("2026-02-12T08:00:00"), end: new Date("2026-02-12T11:00:00"), label: "API tests", group: "backend", color: "#2f9e44" },
        { id: "b2", type: "span", start: new Date("2026-02-12T10:00:00"), end: new Date("2026-02-12T15:00:00"), label: "DB migration", group: "backend", color: "#7048e8" },
        { id: "d1", type: "span", start: new Date("2026-02-12T06:00:00"), end: new Date("2026-02-12T18:00:00"), label: "Monitoring", group: "devops", color: "#868e96" },
        { id: "d2", type: "point", start: new Date("2026-02-12T12:00:00"), label: "Alert", group: "devops", color: "#e03131" }
    ]
});
```

### 14.4 Collapsible Groups

Same data as Demo 3 but with collapsible groups. Backend group starts collapsed to show the presence band. Includes toggle buttons and `collapseAll` / `expandAll` demo buttons.

### 14.5 Selection & Click

Click events log the clicked item to a side panel. Programmatic `selectItem()` and `selectItem(null)` (deselect) are wired to demo buttons. The selected item highlights with a distinct border.

### 14.6 Viewport Visibility

Uses `onItemVisible` callback to increment a visible item counter displayed beside the timeline. Demonstrates IntersectionObserver integration and the visibility batch mechanism.

### 14.7 Large Dataset with Now Marker

50+ items across 7 days with `showNowMarker: true`. Groups have more rows than `maxVisibleRows` (default 5) to demonstrate vertical scroll overflow. The now marker is visible within the current day.

### 14.8 Size Variants

Three timelines rendered side by side using `sm`, `md`, and `lg` size variants with identical data. Demonstrates the visual scaling differences across all size-dependent properties.

---

## 15. DOM Structure

```html
<div class="timeline timeline-md"
     id="timeline-1"
     role="region"
     aria-label="Event Timeline">

    <div class="timeline-header">
        <div class="timeline-header-spacer"
             style="width: 140px;"></div>
        <div class="timeline-axis">
            <div class="timeline-tick"
                 style="left: 0%;"
                 aria-hidden="true">
                <span class="timeline-tick-label">00:00</span>
            </div>
            <div class="timeline-tick"
                 style="left: 25%;"
                 aria-hidden="true">
                <span class="timeline-tick-label">06:00</span>
            </div>
            <!-- More ticks... -->
        </div>
    </div>

    <div class="timeline-body">
        <div class="timeline-group"
             role="group"
             aria-label="Frontend"
             data-group-id="frontend">
            <div class="timeline-group-label"
                 style="width: 140px;">
                <button class="timeline-group-toggle"
                        type="button"
                        aria-expanded="true"
                        aria-label="Collapse Frontend">
                    <i class="bi bi-chevron-down"></i>
                </button>
                <span class="timeline-group-label-text">Frontend</span>
            </div>
            <div class="timeline-group-content"
                 style="position: relative;">
                <div class="timeline-row">
                    <div class="timeline-item timeline-item-span"
                         role="button"
                         tabindex="0"
                         aria-label="UI build, 09:00 to 12:00"
                         title="UI build: 09:00 - 12:00"
                         style="left: 37.5%; width: 12.5%; height: 24px; background-color: #1c7ed6;"
                         data-item-id="f1">
                        <span class="timeline-item-label">UI build</span>
                    </div>
                </div>
                <div class="timeline-row">
                    <div class="timeline-item timeline-item-point"
                         role="button"
                         tabindex="-1"
                         aria-label="Hotfix, 14:00"
                         title="Hotfix: 14:00"
                         style="left: 58.3%;"
                         data-item-id="f2">
                        <svg class="timeline-point-marker"
                             width="10" height="10"
                             viewBox="0 0 10 10"
                             aria-hidden="true">
                            <circle cx="5" cy="5" r="5" fill="#e03131"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>

        <!-- Collapsed group -->
        <div class="timeline-group"
             role="group"
             aria-label="Backend"
             data-group-id="backend">
            <div class="timeline-group-label"
                 style="width: 140px;">
                <button class="timeline-group-toggle timeline-group-toggle-collapsed"
                        type="button"
                        aria-expanded="false"
                        aria-label="Expand Backend">
                    <i class="bi bi-chevron-right"></i>
                </button>
                <span class="timeline-group-label-text">Backend</span>
            </div>
            <div class="timeline-group-content">
                <div class="timeline-presence-band"
                     aria-label="Backend summary: 2 events"
                     style="height: 8px;">
                    <div class="timeline-presence-range"
                         style="left: 33.3%; width: 29.2%; background-color: var(--timeline-band-color);">
                    </div>
                </div>
            </div>
        </div>

        <div class="timeline-now-marker"
             aria-hidden="true"
             style="left: 50%;">
        </div>
    </div>
</div>
```

---

## 16. Styling

### 16.1 Theme Integration

| Property | Value | Source |
|----------|-------|--------|
| Root background | `$white` | Clean timeline surface |
| Root border | `1px solid $gray-300` | Consistent with cards and panels |
| Header background | `$gray-50` | Subtle differentiation from body |
| Header border | `1px solid $gray-200` bottom | Separator |
| Tick line colour | `$gray-300` | Subtle grid lines |
| Tick label colour | `$gray-500` | De-emphasised |
| Group label background | `$gray-50` | Match header |
| Group label border | `1px solid $gray-200` right | Separator |
| Group toggle colour | `$gray-600` | Interactive affordance |
| Group toggle hover | `$gray-800` | Hover highlight |
| Item (span) default | `$blue-500` background, `$white` text | Primary colour |
| Item (span) hover | 10% darker background | Visual feedback |
| Item (span) selected | `2px solid $blue-800` border | Clear selection |
| Item (point) default | `$blue-500` fill | Matches spans |
| Item (point) selected | `2px solid $blue-800` ring | Clear selection |
| Presence band | `$blue-200` | Muted coverage indicator |
| Presence dot | `$gray-600` | Subtle point marker |
| Now marker | `$red-600`, `2px` width | High visibility |
| Row divider | `$gray-100` | Subtle row separation |

### 16.2 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Timeline root | `auto` | Participates in parent stacking context |
| Header (sticky) | 2 (relative) | Above body content during scroll |
| Group label (sticky) | 1 (relative) | Above items, below header |
| Now marker | 1 (relative) | Above items, below labels |
| Items | `auto` | Default stacking |
| Selected item | 1 (relative) | Above other items for border visibility |

### 16.3 Reduced Motion

A `prefers-reduced-motion: reduce` media query disables the group collapse/expand transition. The state change is immediate.

---

## 17. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Zero items | Renders empty groups with labels and axis; no rows |
| Zero groups, items without group | All items placed in a single implicit "ungrouped" section with no label |
| Item with `start` == `end` (zero-duration span) | Rendered as a minimum-width span (4px) for visibility |
| Item with `start` > `end` | Logged as warning; `start` and `end` are swapped |
| Item with `start` outside viewport | Not rendered; skipped during packing |
| Item partially overlapping viewport | Clipped to viewport bounds; rendered with partial width |
| 1000+ items | Batches DOM creation via `DocumentFragment`; row packing runs in O(n log n) |
| All items in a single group | Single group renders; no dividers between groups |
| Group with no items | Renders empty group with label; no rows |
| `maxVisibleRows` = 0 | No row limit; all rows visible (no scroll) |
| `maxVisibleRows` = 1 | Only one row visible; excess rows scroll |
| `destroy()` called while IntersectionObserver active | Observer disconnected cleanly |
| `show()` called twice | Logs warning; second call is no-op |
| `show()` after `destroy()` | Logs warning; no-op |
| Consumer callback throws | Caught and logged; component state remains consistent |
| `setViewport()` with `start` >= `end` | Logged as warning; no-op |
| `selectItem()` with non-existent ID | Logged as warning; no-op |
| `removeItem()` during IntersectionObserver batch | Observer unobserves the element; item removed from pending batch |
| Now marker outside viewport | Hidden via `display: none` |
| Browser without IntersectionObserver | `onItemVisible` never fires; logged as info |

---

## 18. Files

| File | Purpose |
|------|---------|
| `specs/timeline.prd.md` | This specification |
| `components/timeline/timeline.ts` | TypeScript source |
| `components/timeline/timeline.scss` | Styles |
| `components/timeline/README.md` | Documentation |

---

## 19. Implementation Notes

### 19.1 Row Packing Performance

The packing algorithm sorts items once (O(n log n)) and performs a single pass to assign rows. For each item, scanning existing rows is O(r) where r is the number of rows, yielding overall O(n * r). For typical datasets (< 1000 items, < 20 rows), this is negligible. For very large datasets, consider a binary-search optimisation on row end times.

### 19.2 IntersectionObserver Configuration

```typescript
private setupIntersectionObserver(): void
{
    if (typeof IntersectionObserver === "undefined")
    {
        console.info(LOG_PREFIX, "IntersectionObserver not available; onItemVisible disabled.");
        return;
    }

    this.observer = new IntersectionObserver(
        (entries) =>
        {
            const newlyVisible: TimelineItem[] = [];

            for (const entry of entries)
            {
                if (entry.isIntersecting)
                {
                    const id = (entry.target as HTMLElement).dataset.itemId;
                    if (id && !this.visibleItemIds.has(id))
                    {
                        this.visibleItemIds.add(id);
                        const item = this.itemsMap.get(id);
                        if (item)
                        {
                            newlyVisible.push(item);
                        }
                    }
                }
            }

            if (newlyVisible.length > 0 && this.options.onItemVisible)
            {
                requestAnimationFrame(() =>
                {
                    this.safeCallback(() => this.options.onItemVisible!(newlyVisible));
                });
            }
        },
        {
            root: this.bodyEl,
            threshold: [0.1]
        }
    );
}
```

### 19.3 Now Marker Update Interval

```typescript
private startNowMarkerInterval(): void
{
    if (!this.options.showNowMarker)
    {
        return;
    }

    this.updateNowMarker();
    this.nowMarkerInterval = window.setInterval(() => this.updateNowMarker(), 60000);
}

private updateNowMarker(): void
{
    const now = new Date();
    const x = this.timeToX(now);

    if (x < 0 || x > this.containerWidth)
    {
        this.nowMarkerEl.style.display = "none";
        return;
    }

    this.nowMarkerEl.style.display = "";
    this.nowMarkerEl.style.left = x + "px";
}
```

### 19.4 Presence Band Merge

```typescript
private mergeRanges(spans: TimelineItem[]): Array<{ start: Date; end: Date }>
{
    if (spans.length === 0)
    {
        return [];
    }

    const sorted = spans
        .filter(s => s.type === "span" && s.end)
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    const merged: Array<{ start: Date; end: Date }> = [];
    let current = { start: sorted[0].start, end: sorted[0].end! };

    for (let i = 1; i < sorted.length; i++)
    {
        if (sorted[i].start.getTime() <= current.end.getTime())
        {
            current.end = new Date(Math.max(current.end.getTime(), sorted[i].end!.getTime()));
        }
        else
        {
            merged.push(current);
            current = { start: sorted[i].start, end: sorted[i].end! };
        }
    }

    merged.push(current);
    return merged;
}
```

### 19.5 Performance

- DOM creation for large item sets uses `DocumentFragment` to batch insertions.
- Item elements are cached in a `Map<string, HTMLElement>` for O(1) lookup by ID.
- Row packing runs once per group per `addItem`/`addItems`/`removeItem` call; not per render frame.
- `timeToX()` calculations are pure arithmetic with no DOM reads.
- `ResizeObserver` on the root container triggers re-render on width changes (debounced 150ms).
- Now marker updates are throttled to 60-second intervals.

### 19.6 Callback Safety

```typescript
private safeCallback(fn: () => void): void
{
    try
    {
        fn();
    }
    catch (error)
    {
        console.error(LOG_PREFIX, "Callback error:", error);
    }
}
```

All consumer callbacks (`onItemClick`, `onItemSelect`, `onItemVisible`, `onViewportChange`, `onGroupToggle`) are invoked through `safeCallback`.

---

## 20. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Drag-to-resize spans** — dragging span edges to change start/end times.
- **Drag-to-move items** — repositioning items by dragging along the axis.
- **Horizontal pan/zoom** — mouse wheel zoom and click-drag panning of the viewport.
- **Multi-select** — selecting multiple items with Ctrl/Shift-click.
- **Item linking** — visual lines connecting related items (e.g., dependency arrows).
- **Nested groups** — hierarchical group nesting beyond a single level.
- **Custom item renderers** — consumer-provided DOM for item content.
- **Export** — export timeline as SVG or PNG image.
- **Snap-to-grid** — aligning items to tick intervals.
- **Tooltip custom content** — rich HTML tooltips beyond native `title` attribute.
