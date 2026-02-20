<!-- AGENT: PRD for the AuditLogViewer component — read-only filterable log viewer for audit trails and compliance. -->

# AuditLogViewer Component

**Status:** Draft
**Component name:** AuditLogViewer
**Folder:** `./components/auditlogviewer/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A read-only, filterable log viewer for displaying audit trails and compliance data. The AuditLogViewer renders timestamped events in a tabular layout with fixed columns: timestamp, actor, action, resource, IP address, and severity. It provides expandable row detail (JSON before/after change data), a top-mounted filter bar with active filter chips, client-side and server-side pagination, CSV and JSON export, and severity colour coding.

The AuditLogViewer is a standalone component -- it is **not** a DataGrid subclass. It is purpose-built for audit-specific use cases with a simpler, more focused API, fixed columns, and an immutable (read-only, no editing, no deletion) interaction model.

The AuditLogViewer supports:

- **Fixed columns** -- timestamp, actor, action, resource, IP address, and severity. No column reorder, resize, or editing.
- **Expandable row detail** -- clicking a row reveals a JSON detail panel below showing before/after change data.
- **Filter bar** -- date range picker, actor search, action type dropdown, severity checkboxes, and free-text search. Active filters displayed as removable chips.
- **Client-side pagination** -- slice, sort, and filter in the browser for small-to-medium datasets.
- **Server-side pagination** -- fire callbacks and let the consumer provide paginated data from a backend.
- **CSV and JSON export** -- export the current filtered view as a downloadable file.
- **Severity colour coding** -- info (neutral), warning (yellow), critical (red) badges on each row.
- **Immutable display** -- purely read-only. No inline editing, no row deletion, no row creation. The viewer is a compliance window, not a data editor.
- **Auto-refresh** -- optional polling interval for live tail of new audit events.
- **Footer summary** -- row count and date range of the current view.

### 1.2 Why Build It

Enterprise SaaS applications require audit log viewers for:

- Compliance and regulatory auditing (SOC 2, HIPAA, GDPR, PCI DSS)
- Security incident investigation and forensic analysis
- Change tracking and accountability across admin operations
- Operator troubleshooting of user-reported issues
- Internal governance dashboards

No existing open-source library provides a Bootstrap 5 compatible, vanilla TypeScript, audit-specific log viewer with expandable detail rows, filter chips, severity coding, and dual-mode pagination. Building custom ensures alignment with the project's zero-dependency, IIFE-wrapped, Bootstrap-themed architecture.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Stripe Audit Logs | Clean table layout, severity badges, expandable JSON detail, active filter chips |
| Datadog Audit Trail | Date range filtering, actor search, action type facets, free-text search |
| Okta System Log | Timestamped events, actor and target columns, severity indicators, CSV export |
| AWS CloudTrail | Event history with before/after change data, pagination, date range filter |
| Azure Activity Log | Resource-centric audit events, severity levels, JSON detail panel |
| Splunk Search | Filter bar with removable chips, time range picker, export options |

### 1.4 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| AG Grid | Not recommended | Commercial licence; overkill for read-only fixed-column table |
| DataTables.net | Not recommended | jQuery dependency; no expandable detail row built-in; not Bootstrap 5 native |
| react-table / TanStack | Not recommended | React-only (headless); no vanilla JS support |
| Bootstrap Table | Useful reference | MIT, Bootstrap 5 compatible; lacks severity coding, filter chips, expandable JSON detail |
| LogRocket / Sentry UI | Useful reference | Proprietary; good UX patterns for audit event display |

**Decision:** Build custom. The audit log viewer is a narrow, domain-specific component. A standalone implementation with a focused API is simpler and more maintainable than wrapping a general-purpose grid for this use case.

---

## 2. Anatomy

```
+------------------------------------------------------------------------+
| Audit Log                                       [Export CSV] [Export JSON]|
+------------------------------------------------------------------------+
| [From date] [To date] [Actor search] [Action v] [Severity v] [Search] |
| Active: [Jan 1 - Feb 20 x] [severity:critical x] [actor:admin x]      |
+----------+--------+--------------+--------------+-----------+----------+
| Time     | Actor  | Action       | Resource     | IP        | Severity |
+----------+--------+--------------+--------------+-----------+----------+
| 14:32:05 | jsmith | user.login   | Session #42  | 10.0.1.5  | * info   |
| 14:28:11 | admin  | role.update  | Admin Role   | 10.0.1.1  | * warn   |
| v expanded detail:                                                      |
| | Before: { "permissions": ["read"] }                                   |
| | After:  { "permissions": ["read", "write", "admin"] }                 |
| 14:15:03 | system | backup.fail  | DB Backup    | internal  | * crit   |
+------------------------------------------------------------------------+
| Showing 1-50 of 2,847 entries | < 1 2 3 ... 57 > | 50 per page         |
| Date range: Jan 1, 2026 - Feb 20, 2026                                 |
+------------------------------------------------------------------------+
```

### 2.1 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `div.auditlog` wrapping the entire component |
| Header bar | Yes | Title text and export buttons |
| Filter bar | Optional | Date range, actor, action, severity, and search inputs |
| Filter chips | Optional | Active filter indicators with remove buttons |
| Table header | Yes | Fixed column headers: Time, Actor, Action, Resource, IP, Severity |
| Table row | Yes (0+) | `div.auditlog-row` with `role="row"` and `role="gridcell"` cells |
| Row detail panel | Optional | Expandable JSON detail panel below a row |
| Severity badge | Optional | Coloured badge indicating info, warning, or critical |
| Pagination bar | Optional | Page controls, row count, page size selector |
| Footer summary | Optional | Row count and date range of the current view |
| Empty state | Conditional | Message when no entries match filters |
| Live region | Yes | `div.visually-hidden[aria-live="polite"]` for announcements |

---

## 3. API

### 3.1 Interfaces

```typescript
/** A single audit log entry. */
interface AuditLogEntry
{
    /** Unique identifier for this entry. */
    id: string;

    /** When the event occurred. */
    timestamp: Date;

    /** Display name of the actor who performed the action. */
    actor: string;

    /** Unique identifier for the actor (optional). */
    actorId?: string;

    /** Machine-readable action identifier (e.g., "user.login", "role.update"). */
    action: string;

    /** Human-readable name of the affected resource. */
    resource: string;

    /** Type category of the resource (e.g., "user", "role", "backup"). */
    resourceType?: string;

    /** IP address of the actor at time of event. */
    ipAddress?: string;

    /** Severity level. Default: "info". */
    severity?: "info" | "warning" | "critical";

    /** Before/after change data and additional context. Shown in expandable detail panel. */
    detail?: Record<string, unknown>;

    /** Arbitrary metadata attached to this entry. Not rendered in the table. */
    metadata?: Record<string, unknown>;
}

/** Filter state for the audit log. */
interface AuditLogFilters
{
    /** Start of date range (inclusive). */
    dateFrom?: Date;

    /** End of date range (inclusive). */
    dateTo?: Date;

    /** Actor name substring filter. */
    actor?: string;

    /** Action type exact match filter. */
    action?: string;

    /** Resource type filter. */
    resourceType?: string;

    /** Severity levels to include (e.g., ["warning", "critical"]). */
    severity?: string[];

    /** Free-text search across all visible fields. */
    search?: string;
}

/** Configuration options for the AuditLogViewer component. */
interface AuditLogViewerOptions
{
    /** Initial entries to display. Default: []. */
    entries?: AuditLogEntry[];

    /** Number of entries per page. Default: 50. */
    pageSize?: number;

    /**
     * Server-side data mode. When true, the viewer does not sort, filter,
     * or paginate internally. It fires callbacks and expects the consumer
     * to provide updated entries. Default: false.
     */
    serverSide?: boolean;

    /** Show the filter bar. Default: true. */
    showFilters?: boolean;

    /** Show the CSV and JSON export buttons. Default: true. */
    showExport?: boolean;

    /** Show expandable detail rows on click. Default: true. */
    showDetail?: boolean;

    /** Show the severity column and badges. Default: true. */
    showSeverity?: boolean;

    /** Show the IP address column. Default: true. */
    showIPAddress?: boolean;

    /**
     * Auto-refresh interval in milliseconds.
     * 0 = disabled. Default: 0.
     * When enabled, fires onLoadPage at the given interval to poll for new entries.
     */
    autoRefresh?: number;

    /** CSS height of the viewer. Default: "500px". */
    height?: string;

    /**
     * Date format string. Default: locale-aware via Intl.DateTimeFormat.
     * Accepts "iso" for ISO 8601 or "locale" for browser default.
     */
    dateFormat?: string;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    // -- Callbacks -------------------------------------------------------

    /** Called when filter values change. */
    onFilter?: (filters: AuditLogFilters) => void;

    /** Called when the active page changes (client-side or server-side). */
    onPageChange?: (page: number) => void;

    /**
     * Called to load a page of data in server-side mode.
     * Must return a Promise resolving to the entries for the requested page
     * and the total entry count.
     */
    onLoadPage?: (
        page: number,
        filters: AuditLogFilters
    ) => Promise<{ entries: AuditLogEntry[]; total: number }>;

    /** Called when an export is triggered. */
    onExport?: (format: "csv" | "json", filters: AuditLogFilters) => void;

    /** Called when a row is clicked (before detail expansion). */
    onRowClick?: (entry: AuditLogEntry) => void;
}
```

### 3.2 Class: AuditLogViewer

| Method | Description |
|--------|-------------|
| `constructor(options)` | Creates the viewer DOM tree. Does not attach to the page. |
| `show(containerId)` | Appends the viewer to the container element. |
| `hide()` | Removes from DOM without destroying state. |
| `destroy()` | Hides, removes all listeners, nulls references. |
| `getElement()` | Returns the root `div.auditlog` DOM element. |
| `setEntries(entries)` | Replaces all entry data. Resets to page 1. Recalculates filters. |
| `addEntry(entry)` | Prepends a single new entry (newest first). Updates pagination. |
| `getEntries()` | Returns the current array of all entries. |
| `setFilters(filters)` | Programmatically applies filter values. Updates filter bar inputs and chips. |
| `clearFilters()` | Removes all active filters and chips. Resets to unfiltered view. |
| `getFilters()` | Returns the current `AuditLogFilters` state. |
| `setPage(page)` | Navigates to the given page (1-based). |
| `getPage()` | Returns the current page number. |
| `getPageCount()` | Returns the total number of pages. |
| `exportCSV()` | Exports the current filtered view as a CSV download. |
| `exportJSON()` | Exports the current filtered view as a JSON download. |
| `refresh()` | Re-renders the viewer from current data and state. In server-side mode, re-fires `onLoadPage`. |
| `getSelectedEntry()` | Returns the currently expanded entry, or null. |
| `scrollToEntry(entryId)` | Scrolls the viewer to bring the entry into view. Expands the row if `showDetail` is true. |

### 3.3 Convenience Functions

| Function | Description |
|----------|-------------|
| `createAuditLogViewer(options)` | Creates and returns an AuditLogViewer instance. |

### 3.4 Global Exports

```
window.AuditLogViewer
window.createAuditLogViewer
```

---

## 4. Behaviour

### 4.1 Lifecycle

1. **Construction** -- Builds the complete DOM tree from `options`. Does not attach to the page. Initialises internal state: entry index map, filter state, pagination state.
2. **show(containerId)** -- Resolves the container element, appends the viewer root. Renders initial entries. If `serverSide` is true and `onLoadPage` is provided, fires the first page load.
3. **hide()** -- Removes from DOM. Preserves all internal state for re-show.
4. **destroy()** -- Calls hide, clears auto-refresh interval, removes all event listeners, clears maps, nulls internal references. Sets a `destroyed` flag; subsequent calls warn and no-op.

### 4.2 Sorting

Entries are always sorted by timestamp in descending order (newest first). There is no user-configurable sort. This is an intentional design constraint: audit logs are inherently chronological, and presenting them in a fixed order reduces confusion and aligns with compliance expectations.

### 4.3 Filtering

When `showFilters` is true, the filter bar renders above the table.

| Filter | Control | Behaviour |
|--------|---------|-----------|
| Date range | Two date inputs: From and To | Inclusive date range. Either field may be empty. Immediate on change. |
| Actor | Text input with placeholder "Actor..." | Case-insensitive substring match. Debounced 250ms. |
| Action | `<select>` dropdown with "All actions" default | Exact match. Options auto-populated from distinct `entry.action` values. Immediate on change. |
| Severity | Checkboxes: Info, Warning, Critical | Multi-select. Unchecking all is equivalent to showing all. Immediate on change. |
| Search | Text input with placeholder "Search..." | Case-insensitive substring match across all visible fields (actor, action, resource, IP). Debounced 250ms. |

**Filter chips:** Each active filter is displayed as a removable chip (`span.auditlog-chip`) below the filter bar. Clicking the chip's remove button clears that specific filter. Example chips: `Jan 1 - Feb 20`, `severity:critical`, `actor:admin`, `search:"backup"`.

**Client-side filtering** (`serverSide: false`): Filters are applied as a logical AND across all active filters. The filtered set is used for pagination and export.

**Server-side filtering** (`serverSide: true`): The viewer fires `onFilter(filters)` with the current filter state but does not filter entries internally. The consumer fetches filtered data and calls `setEntries()`.

### 4.4 Expandable Row Detail

When `showDetail` is true and an entry has a `detail` object:

1. Clicking a row toggles the detail panel open or closed.
2. The detail panel renders directly below the clicked row as a `div.auditlog-detail`.
3. Only one detail panel is open at a time. Clicking a different row closes the previous panel and opens the new one.
4. The detail panel displays the `detail` object as formatted JSON with syntax highlighting.
5. If `detail` contains `before` and `after` keys, they are rendered in a side-by-side or stacked diff-style layout:
   - **Before** section: labelled "Before" with the `detail.before` data.
   - **After** section: labelled "After" with the `detail.after` data.
6. The detail panel has a subtle background (`$gray-50`) and left border (`$gray-300`) to visually nest it under the parent row.
7. The row chevron (`bi-chevron-right`) rotates 90 degrees clockwise when the detail panel is expanded.

**JSON formatting:** The detail JSON is rendered via `JSON.stringify(value, null, 2)` and displayed in a `<pre>` element with `$font-family-monospace` font. All content is set via `textContent` (never `innerHTML`) to prevent XSS.

### 4.5 Pagination

When `pageSize > 0`, the pagination bar renders below the table body.

**Pagination bar elements:**
- **Row count label**: "Showing 1-50 of 2,847 entries".
- **Page buttons**: First (1), last (N), current, and up to 2 neighbours. Ellipsis (...) for gaps.
- **Previous/Next arrows**: `<` and `>` buttons. Disabled on first/last page.
- **Page size text**: "50 per page" (fixed, not a dropdown -- audit logs use a consistent page size).

**Client-side pagination** (`serverSide: false`): The viewer slices the filtered entry array by `(page - 1) * pageSize` to `page * pageSize`.

**Server-side pagination** (`serverSide: true`): The viewer fires `onLoadPage(page, filters)`. The consumer returns `{ entries, total }`. The viewer renders the returned entries and uses `total` for the "Showing X-Y of Z" calculation.

### 4.6 Export

When `showExport` is true, two export buttons render in the header bar.

**CSV export** (`exportCSV()`):
1. Build a header line: "Timestamp,Actor,Action,Resource,IP Address,Severity".
2. For each entry in the filtered set (all pages), format fields as CSV values.
3. Escape values per RFC 4180.
4. Create a `Blob` with `text/csv;charset=utf-8`, trigger download via temporary `<a>` element.
5. Fire `onExport("csv", filters)`.

**JSON export** (`exportJSON()`):
1. Serialize the filtered entry set (all pages) as a JSON array with `JSON.stringify(entries, null, 2)`.
2. Create a `Blob` with `application/json;charset=utf-8`, trigger download.
3. Fire `onExport("json", filters)`.

### 4.7 Severity Colour Coding

Each row displays a severity badge in the last column:

| Severity | Badge Class | Colour | Icon |
|----------|-------------|--------|------|
| `"info"` | `.auditlog-severity-info` | `$gray-500` text, `$gray-100` background | `bi-info-circle` |
| `"warning"` | `.auditlog-severity-warning` | `$warning` text, `rgba($warning, 0.1)` background | `bi-exclamation-triangle` |
| `"critical"` | `.auditlog-severity-critical` | `$danger` text, `rgba($danger, 0.1)` background | `bi-exclamation-octagon` |

Entries without a severity value default to `"info"`.

### 4.8 Auto-Refresh

When `autoRefresh > 0`:

1. A `setInterval` timer fires every `autoRefresh` milliseconds.
2. In server-side mode, it calls `onLoadPage(currentPage, currentFilters)` and replaces entries with the result.
3. In client-side mode, auto-refresh is a no-op (the consumer must call `addEntry()` or `setEntries()` manually from their own polling mechanism).
4. During auto-refresh, a subtle spinner or "Refreshing..." indicator appears briefly in the header.
5. The interval is cleared on `hide()` and `destroy()`.

### 4.9 Footer Summary

The footer displays below the pagination bar:

- **Row count**: "2,847 total entries" (or "2,847 entries matching filters" when filtered).
- **Date range**: "Date range: Jan 1, 2026 - Feb 20, 2026" computed from the oldest and newest entries in the current data set.

---

## 5. Styling

### 5.1 CSS Classes

| Class | Description |
|-------|-------------|
| `.auditlog` | Root container |
| `.auditlog-header` | Header bar with title and export buttons |
| `.auditlog-title` | Title text element |
| `.auditlog-export-btn` | Export button (CSV or JSON) |
| `.auditlog-filters` | Filter bar container |
| `.auditlog-filter-input` | Individual filter input element |
| `.auditlog-filter-select` | Select dropdown filter |
| `.auditlog-filter-checkbox` | Severity checkbox filter |
| `.auditlog-filter-date` | Date range input |
| `.auditlog-filter-search` | Free-text search input |
| `.auditlog-chips` | Active filter chips container |
| `.auditlog-chip` | Individual filter chip |
| `.auditlog-chip-remove` | Remove button within a chip |
| `.auditlog-table` | Table area container |
| `.auditlog-table-header` | Table header row |
| `.auditlog-table-header-cell` | Individual column header cell |
| `.auditlog-table-body` | Scrollable body area |
| `.auditlog-row` | Data row |
| `.auditlog-row-expanded` | Row with open detail panel |
| `.auditlog-row-info` | Row with info severity (default) |
| `.auditlog-row-warning` | Row with warning severity |
| `.auditlog-row-critical` | Row with critical severity |
| `.auditlog-cell` | Individual data cell |
| `.auditlog-cell-timestamp` | Timestamp cell |
| `.auditlog-cell-actor` | Actor cell |
| `.auditlog-cell-action` | Action cell |
| `.auditlog-cell-resource` | Resource cell |
| `.auditlog-cell-ip` | IP address cell |
| `.auditlog-cell-severity` | Severity cell |
| `.auditlog-severity-badge` | Severity indicator badge |
| `.auditlog-severity-info` | Info severity badge |
| `.auditlog-severity-warning` | Warning severity badge |
| `.auditlog-severity-critical` | Critical severity badge |
| `.auditlog-row-chevron` | Expand/collapse chevron icon |
| `.auditlog-detail` | Expandable detail panel |
| `.auditlog-detail-label` | "Before" or "After" label in detail panel |
| `.auditlog-detail-json` | `<pre>` element for JSON content |
| `.auditlog-pagination` | Pagination bar container |
| `.auditlog-pagination-info` | "Showing X-Y of Z" label |
| `.auditlog-pagination-pages` | Page button group |
| `.auditlog-pagination-btn` | Individual page button |
| `.auditlog-pagination-btn-active` | Current page button |
| `.auditlog-footer` | Footer summary bar |
| `.auditlog-empty` | Empty state message |
| `.auditlog-refreshing` | Auto-refresh indicator |

### 5.2 Theme Integration

| Property | Value | Rationale |
|----------|-------|-----------|
| Background | `$gray-50` | Clean, content-forward table background |
| Header background | `$gray-100` | Distinct from body rows |
| Header text | `$gray-900`, `$font-weight-semibold` | High contrast, clear hierarchy |
| Filter bar background | `$gray-50` | Subtle separation from header |
| Filter inputs | Bootstrap `form-control-sm` styling | Consistent with project form patterns |
| Chip background | `$gray-200` | Subtle filter indicator |
| Chip text | `$gray-700` | Readable on light chip background |
| Chip remove hover | `$danger` | Clear destructive affordance |
| Row background (default) | `$gray-50` | Base row colour |
| Row background (striped even) | `$gray-100` | Alternating stripe for readability |
| Row hover | `$gray-200` background | Subtle highlight |
| Row clickable cursor | `pointer` | Affordance for expandable detail |
| Cell text | `$gray-900`, `$font-size-sm` (0.8rem) | Readable at compact density |
| Cell border | `1px solid $gray-200` bottom | Light grid lines |
| Timestamp cell | `$font-family-monospace`, `$font-size-sm` | Fixed-width for alignment |
| IP address cell | `$font-family-monospace`, `$font-size-sm` | Fixed-width for alignment |
| Detail panel background | `$gray-50` | Subtle nesting |
| Detail panel border | `3px solid $gray-300` left border | Visual nesting indicator |
| Detail JSON | `$font-family-monospace`, `$font-size-sm` | Code-style formatting |
| Pagination background | `$gray-50` | Consistent with body |
| Pagination button | Bootstrap `.btn-outline-secondary.btn-sm` | Standard button styling |
| Pagination active | Bootstrap `.btn-primary.btn-sm` | Highlighted current page |
| Footer background | `$gray-100` | Distinct summary area |
| Footer text | `$gray-600`, `$font-size-sm` | Subdued summary information |
| Empty state | `$gray-500`, italic | Subtle placeholder |
| SCSS import | `@import '../../src/scss/variables'` | Access project variables |

### 5.3 Dimensions

| Property | Value |
|----------|-------|
| Row height | 32px |
| Header row height | 36px |
| Filter bar height | ~44px (single row of inputs) |
| Chip bar height | ~28px (when chips are present) |
| Detail panel min-height | 80px |
| Pagination bar height | 40px |
| Footer height | 28px |
| Cell padding | `4px 8px` |
| Timestamp column width | 100px |
| Actor column width | 120px |
| Action column width | 140px |
| Resource column width | 160px (flex-grow) |
| IP address column width | 120px |
| Severity column width | 80px |

### 5.4 Z-Index

The AuditLogViewer is a flow-positioned component. Internal z-index values are relative:

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Header (sticky) | 2 | Above body rows during scroll |
| Filter dropdown | 3 | Above header when open |
| Detail panel | 1 | Above subsequent rows in the flow |

---

## 6. Keyboard Interaction

| Key | Action |
|-----|--------|
| **Tab** | Moves focus into the viewer (to the filter bar, then table, then pagination). |
| **Shift+Tab** | Moves focus in reverse order. |
| **Down Arrow** | Moves focus to the next row in the table. |
| **Up Arrow** | Moves focus to the previous row in the table. |
| **Enter / Space** | Toggles the detail panel on the focused row. |
| **Escape** | Closes the currently open detail panel. |
| **Home** | Moves focus to the first row on the current page. |
| **End** | Moves focus to the last row on the current page. |
| **Page Down** | Navigates to the next page (if paginated). |
| **Page Up** | Navigates to the previous page (if paginated). |

### 6.1 Roving Tabindex

Within the table body, one row has `tabindex="0"` at a time (the currently focused row). All other rows have `tabindex="-1"`. Arrow keys move focus and update tabindex values. This ensures a single Tab stop for the table body.

---

## 7. Accessibility

The AuditLogViewer follows WAI-ARIA grid and table patterns for accessible data display.

### 7.1 ARIA Roles and Attributes

| Element | Attributes |
|---------|------------|
| Root container | `role="region"`, `aria-label="Audit Log"` |
| Table area | `role="grid"`, `aria-label="Audit log entries"`, `aria-rowcount` |
| Header row | `role="row"` |
| Header cell | `role="columnheader"` |
| Body row | `role="row"`, `aria-rowindex`, `aria-expanded="true" \| "false"` (when detail is available) |
| Body cell | `role="gridcell"` |
| Severity badge | `aria-label="Severity: info"` (or warning, critical) |
| Detail panel | `role="region"`, `aria-label="Event detail for [action]"` |
| Filter inputs | `aria-label="Filter by [field name]"` |
| Filter chips | `role="list"`, each chip is `role="listitem"` |
| Chip remove button | `aria-label="Remove filter: [filter description]"` |
| Pagination | `<nav role="navigation" aria-label="Pagination">` |
| Pagination button | `aria-label="Page N"` or `"Previous page"` / `"Next page"` |
| Pagination current | `aria-current="page"` |
| Export buttons | `aria-label="Export as CSV"` / `aria-label="Export as JSON"` |

### 7.2 Live Region Announcements

A visually hidden `div[aria-live="polite"]` announces state changes:

| Event | Announcement |
|-------|-------------|
| Filter applied | "[N] entries match filter" |
| Filter cleared | "Filters cleared, showing [N] entries" |
| Page change | "Page [N] of [M]" |
| Detail expanded | "Detail panel opened for [action] by [actor]" |
| Detail collapsed | "Detail panel closed" |
| Export completed | "[format] exported" |
| Auto-refresh | "[N] new entries loaded" |

### 7.3 Focus Management

- After filter change: focus remains in the filter input.
- After page change: focus moves to the first row on the new page.
- After detail toggle: focus remains on the row that was clicked.
- After chip removal: focus moves to the next chip, or to the filter bar if no chips remain.
- After export: focus remains on the export button.

---

## 8. Dependencies

- **Bootstrap 5 CSS** -- `$gray-*` variables, `.form-control-sm`, `.btn-*`, `.badge`, spacing utilities.
- **Bootstrap Icons** -- severity icons (`bi-info-circle`, `bi-exclamation-triangle`, `bi-exclamation-octagon`), chevrons, export icon (`bi-download`).
- No JavaScript framework dependencies.
- No external data or grid libraries.

---

## 9. Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Should the viewer support user-configurable column visibility (hide/show IP address, severity)? Currently controlled only via `showIPAddress` and `showSeverity` options at construction. | API scope. Recommend construction-time options for v1. |
| 2 | Should the action dropdown support grouped options (e.g., "User actions", "System actions")? | UI complexity. Recommend flat list for v1. |
| 3 | Should server-side mode support streaming (e.g., WebSocket or SSE) for live tail instead of polling via `autoRefresh`? | Architecture. Recommend polling for v1; streaming deferred. |
| 4 | Should the detail panel support custom renderers (consumer-provided DOM) in addition to the default JSON formatter? | API extensibility. Recommend JSON-only for v1. |
| 5 | Should the export include detail data or only the table-visible columns? | Data scope. Recommend table columns only for v1; detail available via JSON export of raw entries. |

---

## 10. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Empty entries array | Show empty state message. Filters, header, and pagination render normally. |
| All entries filtered out | Show "No entries match the current filters" message. |
| Entry without `detail` object | Row is not expandable. No chevron is shown. Click fires `onRowClick` but does not open a panel. |
| Entry without `severity` | Defaults to `"info"`. |
| Entry without `ipAddress` | Cell displays "--" placeholder. |
| Very long actor or resource name | Cell text truncated with ellipsis. Full text in `title` attribute. |
| Detail JSON with deeply nested objects | JSON is formatted with indentation up to reasonable depth. Very large objects are truncated at 10,000 characters with a "..." indicator. |
| Auto-refresh while detail panel is open | Panel remains open. If the expanded entry is still in the refreshed data, the panel content is updated. If the entry is no longer present, the panel closes. |
| Export with no entries | Downloads a file with header row only (CSV) or empty array (JSON). |
| Server-side `onLoadPage` rejects | Console warning logged with `LOG_PREFIX`. Previous data is preserved. |
| Destroy while auto-refresh interval is active | Interval is cleared. No further callbacks fire. |
| Multiple instances on same page | Each operates independently with its own data and filter state. |
| Container element not found | `show()` logs error and returns without rendering. |
| `setEntries()` while filters are active | Filters are re-applied to the new data. Page resets to 1. |
| `addEntry()` during server-side mode | Entry is added to the local display. It may be overwritten on the next `onLoadPage` response. |

---

## 11. Implementation Notes

### 11.1 Entry Index Map

Maintain a `Map<string, AuditLogEntry>` mapping entry IDs to entry objects. Built on `setEntries()` and constructor. Incrementally updated by `addEntry()`. Enables O(1) entry lookups by ID.

### 11.2 Filter Debounce

Text-based filters (actor, search) use a 250ms debounce timer. Each keystroke resets the timer. When the timer fires, the viewer re-applies all filters and re-renders. Date, select, and checkbox filters fire immediately on change.

### 11.3 CSV Export

```typescript
function escapeCSVValue(value: unknown): string
{
    const str = (value == null) ? "" : String(value);

    if (str.includes(",") || str.includes('"') || str.includes("\n"))
    {
        return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
}
```

### 11.4 JSON Formatting in Detail Panel

```typescript
function formatDetailJSON(detail: Record<string, unknown>): string
{
    const json = JSON.stringify(detail, null, 2);

    if (json.length > 10000)
    {
        return json.substring(0, 10000) + "\n... (truncated)";
    }

    return json;
}
```

All JSON content is rendered via `textContent` on a `<pre>` element. No `innerHTML` is used.

### 11.5 Date Formatting

```typescript
function formatTimestamp(date: Date, format: string): string
{
    if (format === "iso")
    {
        return date.toISOString();
    }

    return new Intl.DateTimeFormat(undefined,
    {
        dateStyle: "short",
        timeStyle: "medium"
    }).format(date);
}
```

### 11.6 Defensive Destroy

The `destroy()` method must:
1. Set an internal `destroyed` flag.
2. Clear the auto-refresh `setInterval` timer.
3. Cancel any pending filter debounce timers.
4. Close any open detail panel.
5. Remove all event listeners (click, keydown on table body, change on filter inputs).
6. Clear the entry map and filter state.
7. Remove all child DOM elements from the container.
8. Null internal references to prevent memory leaks.

### 11.7 Logging

All log statements use the pattern:

```typescript
const LOG_PREFIX = "[AuditLogViewer]";
```

| Level | When | Example |
|-------|------|---------|
| `console.log` | Component lifecycle events | `[AuditLogViewer] Initialised with 2,847 entries in container #audit-log` |
| `console.log` | Significant user actions | `[AuditLogViewer] Filter applied: severity=critical, 42 entries match` |
| `console.warn` | Recoverable issues | `[AuditLogViewer] Server-side page load failed: timeout` |
| `console.error` | Unrecoverable errors | `[AuditLogViewer] Container element #audit-log not found` |
| `console.debug` | Verbose diagnostics | `[AuditLogViewer] Auto-refresh: 3 new entries loaded` |

---

## 12. Files

| File | Purpose |
|------|---------|
| `specs/auditlogviewer.prd.md` | This specification |
| `components/auditlogviewer/auditlogviewer.ts` | TypeScript source |
| `components/auditlogviewer/auditlogviewer.scss` | Styles |
| `components/auditlogviewer/README.md` | Consumer documentation |

---

## 13. Future Considerations (Out of Scope for v1)

| Feature | Notes |
|---------|-------|
| **Streaming / WebSocket live tail** | Real-time event streaming via WebSocket or Server-Sent Events instead of polling. |
| **Column visibility toggle** | UI control for showing/hiding individual columns at runtime. |
| **Advanced search syntax** | Query DSL for complex filters (e.g., `actor:admin AND severity:critical AND action:role.*`). |
| **Timeline visualisation** | Visual timeline chart alongside the table showing event frequency over time. |
| **Custom detail renderers** | Consumer-provided DOM for the detail panel to render domain-specific change visualisations. |
| **Diff highlighting** | Side-by-side diff with colour-coded additions and removals in the before/after JSON. |
| **Bookmarkable filters** | Encode active filters in the URL query string for shareable audit views. |
| **Row-level actions** | Per-row action buttons (e.g., "Investigate", "Flag for review") for incident response workflows. |
