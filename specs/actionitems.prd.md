<!-- AGENT: PRD for the ActionItems component — rich stateful checklist with status tracking, assignments, comments, nesting, drag-and-drop, and filtering. -->

# ActionItems Component

**Status:** Draft
**Component name:** ActionItems
**Folder:** `./components/actionitems/`
**Spec author:** Agent + User
**Date:** 2026-03-16

---

## 1. Overview

### 1.1 What Is It

A rich, stateful action item list that goes beyond a simple checklist. Each item
has a lifecycle (Not Started → In Progress → Done → Archived), an assigned
person, priority, due date, comment thread, edit history, and nestable
sub-items. Items are drag-and-drop reorderable, filterable by facets, sortable
by multiple criteria, and support bulk operations.

The component is designed for composition — it manages the visual presentation,
ordering, grouping, filtering, and keyboard interactions, while delegating
persistence, commenting, assignment picking, and history tracking to the
consuming application via event callbacks. This makes it usable in documents,
standalone apps, project notes, diagrams, and any other context.

### 1.2 Why Build It

Action items are ubiquitous in enterprise software — meeting notes, project
plans, code reviews, incident responses, design documents, and sprint boards
all need trackable, assignable tasks. Without a dedicated component, each app
builds its own checklist with inconsistent state management, no assignment
tracking, no filtering, and poor keyboard accessibility.

A reusable ActionItems component provides:
- Consistent visual language across all apps
- Full keyboard navigation and accessibility
- Touch-friendly interactions (long-press multi-select)
- Rich metadata (assignee, priority, due date, comments)
- Drag-and-drop reordering with nested sub-items
- Faceted filtering and multi-criteria sorting
- Bulk operations for efficient triage
- Export/import for interoperability

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|---|---|
| Notion | Inline creation (Tab/Enter), nested blocks, drag-to-reorder |
| Linear | Status grouping, priority badges, keyboard-first navigation |
| Asana | Assignee chips, due dates, subtasks, bulk actions |
| GitHub Issues | Labels/tags, filter facets, sort controls |
| Apple Reminders | Long-press multi-select on touch, completion animation |
| Google Tasks | Indent/outdent for sub-items, clean minimal design |

---

## 2. Data Model

### 2.1 ActionItem

```typescript
/** A person reference for assignments and attribution. */
interface ActionItemPerson
{
    /** Unique person identifier. */
    id: string;

    /** Display name. */
    name: string;

    /** Avatar URL (optional). */
    avatarUrl?: string;
}

/** Priority levels for action items. */
type ActionItemPriority = "high" | "medium" | "low";

/** Lifecycle states for action items. */
type ActionItemStatus = "not-started" | "in-progress" | "done" | "archived";

/** A tag/label attached to an action item. */
interface ActionItemTag
{
    /** Tag identifier. */
    id: string;

    /** Display label. */
    label: string;

    /** Tag colour (used by the Pill component). */
    color?: string;
}

/** A single action item with full metadata. */
interface ActionItem
{
    /** Unique immutable identifier. */
    id: string;

    /**
     * Monotonically increasing creation index (immutable).
     * Assigned at creation time and never changes, even when items
     * are reordered. Used for stable references.
     */
    index: number;

    /**
     * Display order within the list. Mutable via drag-and-drop.
     * Lower values appear first. Fractional values allowed for
     * insertion between existing items without renumbering.
     */
    order: number;

    /** The action item text content. May contain rich text markup. */
    content: string;

    /** Current lifecycle state. */
    status: ActionItemStatus;

    /** Optional priority level. */
    priority?: ActionItemPriority;

    /** Optional due date (ISO 8601 date string). */
    dueDate?: string;

    /** Currently assigned person (null = unassigned). */
    assignee?: ActionItemPerson;

    /** Tags/labels attached to this item. */
    tags: ActionItemTag[];

    /**
     * Parent item ID for nesting. Null or undefined = top-level.
     * Sub-items can nest to any depth.
     */
    parentId?: string;

    /** ISO 8601 creation timestamp. */
    createdAt: string;

    /** ISO 8601 last modification timestamp. */
    updatedAt: string;

    /** Person who last modified this item. */
    updatedBy?: ActionItemPerson;

    /** Person who created this item. */
    createdBy?: ActionItemPerson;

    /**
     * Number of comments on this item. The component displays
     * this count but does not manage comment data — the app
     * renders comments into the comment slot via callback.
     */
    commentCount: number;
}
```

### 2.2 Numbering

Items are displayed with hierarchical numbering:
- Top-level items: 1, 2, 3, ...
- First-level sub-items: 1.1, 1.2, 2.1, ...
- Second-level: 1.1.1, 1.1.2, ...

Numbering is display-only and recalculated on every reorder. It is NOT stored
in the data model. The `index` field is the immutable creation counter; the
displayed number is the visual position.

### 2.3 Order vs Index

| Field | Purpose | Mutability | Example |
|---|---|---|---|
| `index` | Creation sequence number | Immutable (assigned at creation) | 1, 2, 3, 4, 5 |
| `order` | Display position in the list | Mutable (drag-and-drop changes it) | 1.0, 1.5, 2.0, 3.0 |

Using fractional `order` values allows inserting between items without
renumbering all subsequent items (the same technique used by Figma and Linear).

---

## 3. Visual Layout

### 3.1 Full Mode

```
┌──────────────────────────────────────────────────────────────────┐
│ Action Items (12)                              [Filter▾] [Sort▾] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ▼ Not Started (5)                                                │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ⬡ 1. [👤 Alice] Review API specification          🔴 High  │ │
│ │      Edited by Bob · 2h ago · Due Mar 20                     │ │
│ │      [Bug] [Backend]                           💬 3 ▸        │ │
│ │   ├─ ⬡ 1.1 [👤 Carol] Check auth endpoints                 │ │
│ │   └─ ⬡ 1.2 Check pagination              [unassigned]       │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ ⬡ 2. [unassigned] Update deployment docs                    │ │
│ │      Created by Alice · yesterday                            │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ▼ In Progress (4)                                                │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ◐ 3. [👤 Bob] Implement caching layer         🟡 Medium    │ │
│ │      Edited by Bob · 30 min ago                              │ │
│ │   └─ ◐ 3.1 [👤 Dave] Redis integration                     │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ▼ Done (3)                                                       │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ✓ 4. [👤 Alice] Set up CI pipeline            🟢 Low       │ │
│ │      Completed · Mar 14                                      │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [Show 2 archived items]                                          │
│                                                                  │
│ + Add action item...                                   [Tab ↹]  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Compact Mode

```
┌──────────────────────────────────────────────────┐
│ Action Items (12)                                │
├──────────────────────────────────────────────────┤
│ ⬡ [👤 Alice] Review API specification            │
│ ⬡ [unassigned] Update deployment docs            │
│ ◐ [👤 Bob] Implement caching layer               │
│ ✓ [👤 Alice] Set up CI pipeline                  │
│ + Add...                                         │
└──────────────────────────────────────────────────┘
```

Compact mode shows: status indicator + assignee chip + text. No metadata, no
grouping, no sub-items, no tags, no comments.

### 3.3 Status Indicators

| Status | Icon | Colour |
|---|---|---|
| Not Started | ⬡ (hollow circle) | `var(--theme-text-muted)` |
| In Progress | ◐ (half-filled circle) | `var(--theme-primary)` |
| Done | ✓ (check in filled circle) | `var(--theme-success)` |
| Archived | ⊘ (circle with line) | `var(--theme-text-muted)` at 50% opacity |

Clicking the status indicator cycles: Not Started → In Progress → Done.
Right-clicking shows all states including Archive.

### 3.4 Priority Badges

| Priority | Badge | Colour |
|---|---|---|
| High | 🔴 or `!!! ` | `var(--theme-danger)` |
| Medium | 🟡 or `!! ` | `var(--theme-warning)` |
| Low | 🟢 or `! ` | `var(--theme-success)` |
| None | (no badge) | — |

### 3.5 Metadata Line

Below the main item text, a secondary line shows contextual metadata:

```
Edited by Bob · 2 hours ago · Due Mar 20
```

Components:
- **Attribution**: "Edited by {name}" or "Created by {name}" (whoever last touched it)
- **Relative timestamp**: "2h ago", "yesterday", "Mar 14"
- **Due date**: "Due Mar 20" (red if overdue, amber if due today)
- **Tags**: Pill components rendered inline

### 3.6 Comment Slot

Each item has a collapsible comment slot:
- Shows comment count badge: `💬 3`
- Click to expand/collapse
- When expanded, the app renders its comment system into the slot via
  `onRenderCommentSlot(itemId, containerElement)`
- When `showComments: false`, the slot is hidden entirely

---

## 4. Interactions

### 4.1 Inline Creation

Three modes for adding new items:

1. **Tab from last item**: Pressing Tab on the last item in a section creates
   a new empty row below it.
2. **"+ Add" button**: Clicking the button at the bottom creates a new item
   in the "Not Started" section.
3. **Auto-grow**: Pressing Enter on an empty row creates another below it.
   An empty row with no text is removed when the user navigates away.

New items are created with:
- Status: "not-started"
- Index: next monotonic value
- Order: placed at the end of the Not Started section
- Assignee: unassigned
- Content: empty (cursor placed for immediate typing)

### 4.2 Inline Editing

- Click on item text to place cursor and edit
- Rich text support via SmartTextInput integration (optional — app configures)
- Changes fire `onContentEdit` on blur or after a debounce
- Escape cancels the current edit and reverts to previous content

### 4.3 Status Changes

- **Click** the status indicator: cycles Not Started → In Progress → Done
- **Right-click** the status indicator: context menu with all states + Archive
- **Keyboard**: Space bar on focused item toggles status
- Status changes fire `onStatusChange(itemId, oldStatus, newStatus)`
- Moving an item to "Done" records a completion timestamp
- Moving from "Done" back to "In Progress" clears the completion timestamp

### 4.4 Assignment

- Click the person chip or "(unassigned)" text
- Component fires `onAssignmentRequest(itemId, currentAssignee)`
- The app shows its own picker (e.g., PeoplePicker)
- App calls `component.setAssignee(itemId, person)` to update
- Assignment changes fire `onAssignmentChange(itemId, old, new)`

### 4.5 Drag-and-Drop Reordering

- Drag handle on the left of each item (grip dots icon)
- Drag within a status section to reorder
- Drag between sections to change status AND reorder
- Drag into the indent zone of another item to nest as sub-item
- Drop indicators: line above/below for position, indented highlight for nesting
- Reorder fires `onItemReorder(itemId, newOrder, newParentId)`

### 4.6 Keyboard Operations

| Key | Action |
|---|---|
| `↑` / `↓` | Navigate between items |
| `Enter` | Begin editing current item / create new item below |
| `Shift+Enter` | New line within item (rich text mode) |
| `Escape` | Cancel edit / exit selection mode |
| `Space` | Toggle status (cycle) |
| `Tab` | Indent item (make sub-item of item above) |
| `Shift+Tab` | Outdent item (promote to parent's level) |
| `Delete` / `Backspace` | Delete empty item; on non-empty, delete char |
| `Ctrl+C` | Copy selected items as markdown |
| `Ctrl+X` | Cut selected items |
| `Ctrl+V` | Paste items (parses markdown checklists) |
| `Ctrl+A` | Select all items |
| `Ctrl+Shift+↑` / `↓` | Move item up/down in order |

### 4.7 Multi-Select

**Desktop (mouse/keyboard):**
- `Shift+Click`: Range select
- `Ctrl+Click` / `Cmd+Click`: Toggle individual selection

**Touch (iPad/mobile):**
- Long-press on any item enters selection mode
- In selection mode: tap to toggle selection
- Header shows "N selected" with "Select All" / "Done" buttons
- Bottom toolbar appears with bulk actions

### 4.8 Bulk Operations

Available when 2+ items are selected:
- **Change Status**: Set all selected to a specific status
- **Assign**: Assign all to a person (fires `onBulkAssign`)
- **Set Priority**: Set priority on all selected
- **Delete**: Delete all selected (with confirmation)
- **Archive**: Archive all selected

### 4.9 Filtering

Faceted filter panel (dropdown from the Filter button):

| Facet | Options |
|---|---|
| Status | Not Started, In Progress, Done, Archived (checkboxes) |
| Assignee | List of all assignees + "Unassigned" |
| Priority | High, Medium, Low, None |
| Due Date | Overdue, Due Today, Due This Week, No Due Date |
| Tags | All tags present in current items |

Active filters show as chips below the header that can be individually removed.

### 4.10 Sorting

Sort dropdown with options:
- Created (oldest first / newest first)
- Last modified
- Priority (high → low / low → high)
- Due date (soonest first / latest first)
- Assignee name (A-Z / Z-A)
- Display order (manual)

Sorting applies within each status group.

---

## 5. Component Integration

### 5.1 PersonChip

Each item's assignee is rendered as a PersonChip component with avatar and name.
Unassigned items show a ghost chip with a "+" icon.

### 5.2 Pill (Tags)

Tags are rendered as Pill components with configurable colours.

### 5.3 SmartTextInput / RichTextInput

Item content editing optionally integrates with SmartTextInput for inline
suggestions or RichTextInput for formatting. Configured via the `textEditor`
option.

### 5.4 EmptyState

When the list has zero items, the EmptyState component renders with a
configurable message and illustration.

### 5.5 Comment Slot

The comment slot is an empty `<div>` that the app populates via callback.
The component manages expand/collapse and shows the count badge.

---

## 6. Configuration

```typescript
interface ActionItemsOptions
{
    /** Container element or ID string. */
    container: string | HTMLElement;

    /** Initial items to render. */
    items?: ActionItem[];

    /** Display mode. Default: "full". */
    mode?: "full" | "compact";

    /** Group items by status with section headers. Default: true. */
    groupByStatus?: boolean;

    /** Show priority badges and allow priority setting. Default: true. */
    showPriority?: boolean;

    /** Show due date display and allow date setting. Default: true. */
    showDueDates?: boolean;

    /** Show comment count badge and comment slot. Default: true. */
    showComments?: boolean;

    /** Show tags/labels on items. Default: true. */
    showTags?: boolean;

    /** Allow sub-item nesting. Default: true. */
    allowNesting?: boolean;

    /** Allow drag-and-drop reordering. Default: true. */
    allowReorder?: boolean;

    /** Allow inline creation of new items. Default: true. */
    allowCreate?: boolean;

    /** Text editor integration. Default: "plain". */
    textEditor?: "plain" | "smart" | "rich";

    /** Default sort. Default: "order". */
    defaultSort?: SortOption;

    /** Placeholder text for new items. */
    placeholder?: string;

    /** Message for empty state. */
    emptyMessage?: string;

    // ── Event callbacks ──

    /** Fired when a new item is created. */
    onItemCreate?: (item: ActionItem) => void;

    /** Fired when any item property changes. */
    onItemUpdate?: (itemId: string, changes: Partial<ActionItem>) => void;

    /** Fired when an item is deleted. */
    onItemDelete?: (itemId: string) => void;

    /** Fired when an item is reordered via drag-and-drop. */
    onItemReorder?: (itemId: string, newOrder: number, newParentId?: string) => void;

    /** Fired when an item's status changes. */
    onStatusChange?: (itemId: string, oldStatus: ActionItemStatus, newStatus: ActionItemStatus) => void;

    /** Fired when the user requests to assign/reassign an item. */
    onAssignmentRequest?: (itemId: string, currentAssignee?: ActionItemPerson) => void;

    /** Fired when an item's content is edited. */
    onContentEdit?: (itemId: string, newContent: string) => void;

    /** Fired when the comment slot for an item is toggled. */
    onCommentToggle?: (itemId: string, expanded: boolean) => void;

    /** Fired to render comments into the comment slot. */
    onRenderCommentSlot?: (itemId: string, container: HTMLElement) => void;

    /** Fired when priority changes. */
    onPriorityChange?: (itemId: string, priority?: ActionItemPriority) => void;

    /** Fired when due date changes. */
    onDueDateChange?: (itemId: string, dueDate?: string) => void;

    /** Fired on bulk status change. */
    onBulkStatusChange?: (itemIds: string[], newStatus: ActionItemStatus) => void;

    /** Fired on bulk delete. */
    onBulkDelete?: (itemIds: string[]) => void;

    /** Fired on export request. */
    onExport?: (format: "json" | "markdown", items: ActionItem[]) => void;

    /** Fired when selection changes. */
    onSelectionChange?: (selectedIds: string[]) => void;

    /** Fired on any tag change (add/remove). */
    onTagChange?: (itemId: string, tags: ActionItemTag[]) => void;
}
```

---

## 7. Public API

```typescript
interface ActionItemsHandle
{
    /** Add a new item to the list. */
    addItem(item: Partial<ActionItem>): ActionItem;

    /** Remove an item by ID. */
    removeItem(itemId: string): void;

    /** Update an item's properties. */
    updateItem(itemId: string, changes: Partial<ActionItem>): void;

    /** Set the assignee for an item (called by app after picker closes). */
    setAssignee(itemId: string, person?: ActionItemPerson): void;

    /** Set the comment count for an item (app manages actual comments). */
    setCommentCount(itemId: string, count: number): void;

    /** Get all items. */
    getItems(): ActionItem[];

    /** Get a single item by ID. */
    getItem(itemId: string): ActionItem | null;

    /** Get items filtered by status. */
    getItemsByStatus(status: ActionItemStatus): ActionItem[];

    /** Get selected item IDs. */
    getSelectedIds(): string[];

    /** Set selection programmatically. */
    setSelection(ids: string[]): void;

    /** Clear selection. */
    clearSelection(): void;

    /** Expand or collapse a status section. */
    toggleSection(status: ActionItemStatus, expanded: boolean): void;

    /** Apply a filter. */
    setFilter(filter: ActionItemFilter): void;

    /** Clear all filters. */
    clearFilters(): void;

    /** Set the sort order. */
    setSort(sort: SortOption): void;

    /** Export items in the specified format. */
    export(format: "json" | "markdown"): string;

    /** Import items from markdown checklist format. */
    importMarkdown(markdown: string): ActionItem[];

    /** Scroll to a specific item. */
    scrollToItem(itemId: string): void;

    /** Get the root DOM element. */
    getElement(): HTMLElement;

    /** Destroy the component and clean up. */
    destroy(): void;
}
```

---

## 8. Keyboard Accessibility

- Component container has `role="list"` with `aria-label="Action items"`
- Each item has `role="listitem"` with `aria-level` for nesting depth
- Status indicator has `role="checkbox"` with `aria-checked` state
- Focus management: arrow keys move between items, Tab moves to internal controls
- Screen reader announces: item number, content, status, assignee, priority
- Bulk selection announced via `aria-live` region

---

## 9. Clipboard and Export

### 9.1 Copy

Selected items are copied as markdown:

```markdown
- [ ] Review API specification @Alice #high
  - [ ] Check auth endpoints @Carol
  - [ ] Check pagination
- [x] Set up CI pipeline @Alice #low
```

### 9.2 Paste

Pasting text is parsed as markdown checklists:
- `- [ ] text` → Not Started
- `- [x] text` → Done
- Indented items become sub-items
- `@Name` parsed as assignee hint
- `#high` / `#medium` / `#low` parsed as priority

### 9.3 Export

JSON export includes full ActionItem data. Markdown export uses the checklist
format above.

---

## 10. Implementation Phases

### Phase 1: Core
- ActionItem data model and types
- List rendering with status grouping and section counts
- Status indicator with click-to-cycle
- Item content editing (plain text)
- Header with total count
- Empty state integration
- Auto-numbering (hierarchical)

### Phase 2: Rich Features
- Person chip integration for assignees
- Priority badges
- Due date display with overdue highlighting
- Metadata line (edited by, timestamp)
- Tags via Pill component
- Comment slot (expand/collapse, count badge)

### Phase 3: Interactions
- Drag-and-drop reordering within and between sections
- Nesting (Tab/Shift+Tab for indent/outdent)
- Inline creation (Tab, Enter, + button)
- Full keyboard navigation
- Multi-select (desktop + touch long-press)
- Bulk operations toolbar

### Phase 4: Filtering, Sorting, Export
- Filter panel with facets
- Sort dropdown
- Active filter chips
- Copy/paste (markdown format)
- Export/import
- Compact mode
- Archived items toggle

---

## 11. Dark Mode

All colours via `var(--theme-*)` tokens. Status indicator colours, priority
badges, metadata text, section headers, and the comment slot all adapt
automatically via the existing dark mode architecture.

---

## 12. Performance

| Metric | Target |
|---|---|
| Items rendered (smooth) | 500+ |
| Items rendered (virtual scroll) | 10,000+ |
| Drag-and-drop reorder latency | < 16ms (60fps) |
| Filter apply | < 50ms for 1,000 items |
| Initial render (100 items) | < 100ms |

For lists exceeding 500 items, virtual scrolling renders only visible items
plus a buffer above/below the viewport.

---

## 13. Dependencies

| Dependency | Required | Purpose |
|---|---|---|
| PersonChip | Yes | Assignee display |
| Pill | Yes | Tag/label rendering |
| EmptyState | Yes | Empty list state |
| SmartTextInput | Optional | Inline text editing with suggestions |
| RichTextInput | Optional | Rich text formatting |
| PeoplePicker | Optional | Assignment picker (app-provided) |
