# CDN Bug: DockLayout Does Not Observe Toolbar Height Changes

**Filed**: 2026-04-13
**Component**: CDN DockLayout (`static.knobby.io/components/docklayout/docklayout.js`)
**Severity**: High — causes status bar and bottom panels to disappear
**Status**: Open

## Description

When the CDN Ribbon collapses or expands (`collapsible: true`), the toolbar row height changes significantly (~128px expanded vs ~32px collapsed). The DockLayout does not detect this change and does not recalculate its CSS Grid `grid-template-rows`.

This causes:
1. **Status bar disappears** — the bottom `auto` row gets pushed off-screen or given zero height because the grid template is stale.
2. **Bottom panels disappear** — same issue; they reappear when the ribbon collapses back because the freed vertical space allows the grid to fit again.
3. **Ribbon clipping** — in some flows (e.g., navigating to/from the Explorer trash panel), the toolbar row retains a stale height and clips the ribbon.

## Root Cause

`DockLayout.updateGridTemplate()` is called from:
- Sidebar collapse/resize listeners
- Bottom panel collapse/resize listeners
- `show()` initialization

It is **not** called when the toolbar cell content changes height. There is no `ResizeObserver` on the `.dock-layout-toolbar` grid cell.

## Expected Behavior

The DockLayout should observe toolbar height changes (via `ResizeObserver` on the toolbar cell) and recalculate `grid-template-rows` automatically. This is consistent with how it already handles sidebar and bottom panel resize events.

## Current Workaround

Each app registers an `onCollapse` callback on the ribbon that dispatches a synthetic `window.resize` event:

```typescript
onCollapse: () => {
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
},
```

This triggers the DockLayout's window resize handler, which calls `updateGridTemplate()`.

## Recommended CDN Fix

Add a `ResizeObserver` on the toolbar container element (`.dock-layout-toolbar`) inside `DockLayout.show()`:

```javascript
this._toolbarObserver = new ResizeObserver(() => this.updateGridTemplate());
this._toolbarObserver.observe(this._toolbarEl);
```

Clean up in `destroy()`:
```javascript
this._toolbarObserver?.disconnect();
```

## Affected Apps

All 5 apps use `collapsible: true` on their ribbons:
- Explorer, Diagrams, Thinker, Checklists, Strukture
