# Migration Guide: DockLayout + Ribbon HTMLElement Support (ADR-118)

**Date:** 2026-04-14
**Priority:** High
**Breaking:** No — fully backward compatible

## What Changed

### DockLayout

`mountComponent()` now accepts plain `HTMLElement` as a third fallback after `show()` and `getRootElement()` checks. Previously, passing a raw div/nav/footer to `setToolbar()`, `setLeftSidebar()`, etc. was silently ignored — the element stayed on `document.body`, pushing the 100vh grid past the viewport and clipping the status bar.

### Ribbon

`show()`, `mountTo()`, and `createRibbon()` now accept `string | HTMLElement` instead of just `string`. A new private `resolveContainer()` helper centralizes the resolution logic (same pattern as TabbedPanel).

## Migration Steps

### If you passed plain HTMLElements to DockLayout

No changes needed — it just works now:

```javascript
// Before (broken): element stayed on document.body
dock.setToolbar(document.getElementById("my-toolbar"));

// After (fixed): element correctly appended to toolbar cell
dock.setToolbar(document.getElementById("my-toolbar"));
```

### If you used Ribbon with string IDs

No changes needed — string IDs still work:

```javascript
// Still works
ribbon.show("container-id");
createRibbon(options, "container-id");
```

### If you want to use HTMLElement with Ribbon

```javascript
// New: pass HTMLElement directly
const container = document.getElementById("toolbar-area");
ribbon.show(container);

// Or via factory
const ribbon = createRibbon(options, container);
```

## Workarounds to Remove

If your app dispatched synthetic resize events or manually appended the toolbar element after `setToolbar()`, those workarounds can be removed.
