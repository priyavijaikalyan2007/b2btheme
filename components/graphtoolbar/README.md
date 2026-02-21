# GraphToolbar

Factory function that creates a preconfigured Toolbar instance for graph visualization applications. Assembles standard regions for graph editing (undo/redo/delete), layout algorithm selection, zoom controls, grid snap/minimap toggles, export, and node search.

GraphToolbar is **not** a new component class — it wraps the existing Toolbar component (ADR-030).

## Usage

```html
<link rel="stylesheet" href="components/toolbar/toolbar.css">
<link rel="stylesheet" href="components/graphtoolbar/graphtoolbar.css">
<script src="components/toolbar/toolbar.js"></script>
<script src="components/graphtoolbar/graphtoolbar.js"></script>
```

```javascript
const handle = createGraphToolbar({
    onUndo: () => graph.undo(),
    onRedo: () => graph.redo(),
    onDelete: () => graph.deleteSelected(),
    onApplyLayout: (id) => graph.applyLayout(id),
    onZoomIn: () => { graph.zoomIn(); handle.setZoomLabel(graph.getZoom()); },
    onZoomOut: () => { graph.zoomOut(); handle.setZoomLabel(graph.getZoom()); },
    onZoomToFit: () => { graph.fitToView(); handle.setZoomLabel(graph.getZoom()); },
    onGridSnapToggle: (on) => graph.setGridSnap(on),
    onMinimapToggle: (on) => graph.setMinimapVisible(on),
    onExport: (format) => graph.export(format),
    onSearch: (query) => graph.highlightMatches(query),
    onSearchSubmit: (query) => graph.selectFirstMatch(query)
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `layouts` | `GraphToolbarLayout[]` | 6 defaults | Layout algorithm choices |
| `defaultLayout` | `string` | `"hierarchical"` | Initially selected layout |
| `showUndo` | `boolean` | `true` | Show Undo button |
| `showRedo` | `boolean` | `true` | Show Redo button |
| `showDelete` | `boolean` | `true` | Show Delete button |
| `showLayoutSelector` | `boolean` | `true` | Show layout dropdown + Apply |
| `showZoomControls` | `boolean` | `true` | Show zoom in/out/fit/label |
| `showGridSnap` | `boolean` | `true` | Show grid snap toggle |
| `showMinimap` | `boolean` | `true` | Show minimap toggle |
| `showExport` | `boolean` | `true` | Show export dropdown |
| `showSearch` | `boolean` | `true` | Show search input |
| `exportFormats` | `string[]` | `["png","svg","json"]` | Export format options |
| `initialZoom` | `number` | `100` | Initial zoom percentage |
| `gridSnapEnabled` | `boolean` | `false` | Initial grid snap state |
| `minimapEnabled` | `boolean` | `false` | Initial minimap state |
| `enableKeyboardShortcuts` | `boolean` | `true` | Register document shortcuts |
| `toolbarOptions` | `object` | `{}` | Pass-through Toolbar options |

## Handle API

| Method | Description |
|--------|-------------|
| `setZoomLabel(zoom)` | Update zoom percentage display |
| `setGridSnapState(enabled)` | Set grid snap toggle state |
| `setMinimapState(enabled)` | Set minimap toggle state |
| `setUndoEnabled(enabled)` | Enable/disable Undo button |
| `setRedoEnabled(enabled)` | Enable/disable Redo button |
| `setDeleteEnabled(enabled)` | Enable/disable Delete button |
| `setLayout(layoutId)` | Select a layout in the dropdown |
| `destroy()` | Clean up toolbar and keyboard listeners |
| `toolbar` | The underlying Toolbar instance |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` | Delete selected |
| `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Zoom to fit |

Shortcuts are suppressed when focus is in an input field or a modal is open.
