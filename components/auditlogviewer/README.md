# AuditLogViewer

Read-only filterable audit log viewer with severity badges, expandable detail rows, filter chips, pagination, and CSV/JSON export.

## Usage

```html
<link rel="stylesheet" href="dist/components/auditlogviewer/auditlogviewer.css">
<script src="dist/components/auditlogviewer/auditlogviewer.js"></script>
```

```javascript
const viewer = createAuditLogViewer({
    entries: [
        {
            id: "1",
            timestamp: new Date(),
            actor: "admin",
            action: "user.login",
            resource: "Session #42",
            ipAddress: "10.0.1.5",
            severity: "info"
        }
    ],
    height: "500px",
    onRowClick: (entry) => console.log("Row clicked:", entry.id),
}, "my-container");
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entries` | `AuditLogEntry[]` | `[]` | Initial entries |
| `pageSize` | `number` | `50` | Entries per page |
| `serverSide` | `boolean` | `false` | Server-side pagination mode |
| `showFilters` | `boolean` | `true` | Show filter bar |
| `showExport` | `boolean` | `true` | Show export buttons |
| `showDetail` | `boolean` | `true` | Enable expandable detail rows |
| `showSeverity` | `boolean` | `true` | Show severity column |
| `showIPAddress` | `boolean` | `true` | Show IP address column |
| `autoRefresh` | `number` | `0` | Auto-refresh interval (ms) |
| `height` | `string` | `"500px"` | Container height |

## API

| Method | Description |
|--------|-------------|
| `show(containerId)` | Mount to container |
| `hide()` | Remove from DOM |
| `destroy()` | Full cleanup |
| `setEntries(entries)` | Replace all entries |
| `addEntry(entry)` | Prepend a new entry |
| `setFilters(filters)` | Apply filters |
| `clearFilters()` | Clear all filters |
| `setPage(page)` | Navigate to page |
| `exportCSV()` | Export as CSV |
| `exportJSON()` | Export as JSON |
| `refresh()` | Re-render |

## Severity Levels

| Level | Colour | Icon |
|-------|--------|------|
| `info` | Gray | bi-info-circle |
| `warning` | Yellow | bi-exclamation-triangle |
| `critical` | Red | bi-exclamation-octagon |
