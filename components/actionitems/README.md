# ActionItems

A rich, stateful action item list with status lifecycle tracking, person assignments, priority badges, due dates, comment slots, tags, hierarchical numbering, inline editing, section-based grouping, drag-and-drop reordering, nesting, keyboard navigation, multi-select, bulk operations, faceted filtering, sorting, clipboard, and export.

## Quick Start

```html
<link rel="stylesheet" href="components/actionitems/actionitems.css">
<script src="components/actionitems/actionitems.js"></script>
```

```javascript
const list = createActionItems({
    container: "my-container",
    items: [
        {
            id: "1",
            index: 1,
            order: 1,
            content: "Review Q3 budget",
            status: "not-started",
            priority: "high",
            dueDate: "2026-03-20",
            tags: [],
            commentCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ],
    onStatusChange: (id, oldS, newS) => console.log(id, oldS, "->", newS)
});
```

## Features

- **Status lifecycle** -- Not Started, In Progress, Done, Archived with click-to-cycle and keyboard toggle
- **Priority badges** -- High, Medium, Low with colour-coded indicators
- **Due dates** -- relative display (overdue, today, this week) with overdue highlighting
- **Person assignment** -- PersonChip integration with avatar and name display
- **Tags** -- Pill-based coloured labels per item
- **Comment slots** -- expandable comment area with count badge; consumer renders content via callback
- **Hierarchical nesting** -- parent/child items with indented rendering and Tab/Shift+Tab indent/outdent
- **Inline editing** -- double-click to edit content; Enter to confirm, Escape to cancel
- **Section grouping** -- items grouped by status with collapsible section headers and counts
- **Drag-and-drop reordering** -- drag handle with visual drop indicator and cross-section moves
- **Keyboard navigation** -- full arrow key nav, Space to cycle status, Enter to edit, Delete to remove
- **Multi-select** -- click with Ctrl/Shift for range selection; visual selection indicators
- **Bulk operations** -- bulk status change, bulk delete, bulk assign on selected items
- **Faceted filtering** -- filter by status, assignee, priority, due date facet, and tags
- **Sorting** -- 10 sort options including manual order, created, modified, priority, due date, assignee
- **Clipboard** -- Ctrl+C/X/V/A for copy/cut/paste/select-all in markdown checklist format
- **Export** -- JSON and markdown export with import from markdown checklists
- **Full/Compact modes** -- full mode with all features; compact mode for sidebars and dashboards
- **Dark mode** -- fully compatible via `var(--theme-*)` CSS custom properties

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `string \| HTMLElement` | *required* | Container element or ID string |
| `items` | `ActionItem[]` | `[]` | Initial items to render |
| `mode` | `"full" \| "compact"` | `"full"` | Display mode |
| `groupByStatus` | `boolean` | `true` | Group items by status with section headers |
| `showPriority` | `boolean` | `true` | Show priority badges |
| `showDueDates` | `boolean` | `true` | Show due date display |
| `showComments` | `boolean` | `true` | Show comment count and comment slot |
| `showTags` | `boolean` | `true` | Show tags/labels on items |
| `allowNesting` | `boolean` | `true` | Allow sub-item nesting |
| `allowCreate` | `boolean` | `true` | Allow inline creation of new items |
| `allowReorder` | `boolean` | `true` | Allow drag-and-drop reordering |
| `defaultSort` | `SortOption` | `"order"` | Default sort order |
| `placeholder` | `string` | `"Add a new item..."` | Placeholder text for new items |
| `emptyMessage` | `string` | `"No items yet"` | Message for empty state |

## Public API

| Method | Signature | Description |
|--------|-----------|-------------|
| `addItem` | `(item: Partial<ActionItem>) => ActionItem` | Add a new item; returns the created item with generated ID and timestamps |
| `removeItem` | `(itemId: string) => void` | Remove an item by ID |
| `updateItem` | `(itemId: string, changes: Partial<ActionItem>) => void` | Update an item's properties |
| `setAssignee` | `(itemId: string, person?: ActionItemPerson) => void` | Set or clear the assignee |
| `setCommentCount` | `(itemId: string, count: number) => void` | Set the comment count badge value |
| `getItems` | `() => ActionItem[]` | Get all items |
| `getItem` | `(itemId: string) => ActionItem \| null` | Get a single item by ID |
| `getItemsByStatus` | `(status: ActionItemStatus) => ActionItem[]` | Get items filtered by status |
| `getSelectedIds` | `() => string[]` | Get selected item IDs |
| `setSelection` | `(ids: string[]) => void` | Set selection programmatically |
| `clearSelection` | `() => void` | Clear all selections |
| `toggleSection` | `(status: ActionItemStatus, expanded: boolean) => void` | Expand or collapse a status section |
| `setFilter` | `(filter: ActionItemFilter) => void` | Apply a faceted filter |
| `clearFilters` | `() => void` | Clear all filters |
| `setSort` | `(sort: SortOption) => void` | Set the sort order |
| `export` | `(format: "json" \| "markdown") => string` | Export items in the specified format |
| `importMarkdown` | `(markdown: string) => ActionItem[]` | Import items from markdown checklist format |
| `scrollToItem` | `(itemId: string) => void` | Scroll to a specific item |
| `getElement` | `() => HTMLElement` | Get the root DOM element |
| `destroy` | `() => void` | Destroy the component and clean up |

## Event Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onItemCreate` | `(item: ActionItem) => void` | Fired when a new item is created |
| `onItemUpdate` | `(itemId: string, changes: Partial<ActionItem>) => void` | Fired when any item property changes |
| `onItemDelete` | `(itemId: string) => void` | Fired when an item is deleted |
| `onStatusChange` | `(itemId, oldStatus, newStatus) => void` | Fired when an item's status changes |
| `onContentEdit` | `(itemId: string, newContent: string) => void` | Fired when item content is edited |
| `onCommentToggle` | `(itemId: string, expanded: boolean) => void` | Fired when a comment slot is toggled |
| `onRenderCommentSlot` | `(itemId: string, container: HTMLElement) => void` | Fired to render comments into the slot |
| `onAssignmentRequest` | `(itemId, currentAssignee?) => void` | Fired when the user clicks the assignee chip |
| `onPriorityChange` | `(itemId: string, priority?: ActionItemPriority) => void` | Fired when priority changes |
| `onDueDateChange` | `(itemId: string, dueDate?: string) => void` | Fired when due date changes |
| `onSelectionChange` | `(selectedIds: string[]) => void` | Fired on selection changes |
| `onTagChange` | `(itemId: string, tags: ActionItemTag[]) => void` | Fired on tag add/remove |
| `onItemReorder` | `(itemId, newOrder, newParentId?) => void` | Fired when an item is reordered via drag-and-drop |
| `onBulkStatusChange` | `(itemIds: string[], newStatus) => void` | Fired on bulk status change |
| `onBulkDelete` | `(itemIds: string[]) => void` | Fired on bulk delete request |
| `onBulkAssign` | `(itemIds: string[], currentAssignee?) => void` | Fired on bulk assign request |
| `onExport` | `(format, items: ActionItem[]) => void` | Fired on export request |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Arrow Up / Down` | Navigate between items |
| `Ctrl+Shift+Arrow Up / Down` | Move item up/down in order |
| `Space` | Cycle focused item status (Not Started -> In Progress -> Done) |
| `Enter` | Begin inline editing on focused item |
| `Escape` | Cancel editing or clear selection |
| `Tab` | Indent item (nest as sub-item) |
| `Shift+Tab` | Outdent item (un-nest) |
| `Delete / Backspace` | Delete focused or selected items |
| `Ctrl+C` | Copy selected items as markdown checklist |
| `Ctrl+X` | Cut selected items |
| `Ctrl+V` | Paste items from clipboard |
| `Ctrl+A` | Select all items |

## Compact Mode

```javascript
createActionItems({
    container: "sidebar-tasks",
    items: myItems,
    mode: "compact",
    groupByStatus: false,
    showComments: false,
    showTags: false,
    allowNesting: false,
    placeholder: "Quick add..."
});
```

Compact mode reduces padding and hides comment slots and tag displays for use in space-constrained contexts such as sidebar panels and dashboard widgets.

## Sort Options

| Value | Label |
|-------|-------|
| `"order"` | Manual order |
| `"created-asc"` | Created (oldest) |
| `"created-desc"` | Created (newest) |
| `"modified"` | Last modified |
| `"priority-desc"` | Priority (high first) |
| `"priority-asc"` | Priority (low first) |
| `"due-date-asc"` | Due date (soonest) |
| `"due-date-desc"` | Due date (latest) |
| `"assignee-asc"` | Assignee (A-Z) |
| `"assignee-desc"` | Assignee (Z-A) |

## Integration Notes

- **PersonChip** -- assignee display renders as a PersonChip (avatar + name) when the PersonChip component is loaded. Falls back to a plain text span.
- **Pill** -- tags render as Pill elements when the Pill component is loaded. Falls back to coloured spans.
- **Comment slot** -- the `onRenderCommentSlot` callback receives a container element; the consumer is responsible for rendering comment UI (e.g., a CommentOverlay or custom thread) into it.
- **Clipboard** -- copy/paste uses markdown checklist format (`- [ ] item`, `- [x] done`) for interoperability with external tools.
- **Export** -- JSON export includes all item metadata; markdown export produces a human-readable checklist with priority and due date annotations.

## Status Lifecycle

```
Not Started  ──>  In Progress  ──>  Done
    ⬡                ◐              ✓
```

Items cycle through statuses via click on the status indicator or `Space` key. The `"archived"` status is available programmatically via `updateItem()` but does not appear in the cycle.
