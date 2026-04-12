# Migration Guide: Remove Toolbar Resize Workarounds

**Date**: 2026-04-13
**CDN Fix**: ADR-116 — DockLayout now observes toolbar cell height via `ResizeObserver`
**Affected Apps**: Explorer, Diagrams, Thinker, Checklists, Strukture

---

## What Changed

The CDN DockLayout component now includes a `ResizeObserver` on the `.dock-layout-toolbar`
grid cell. When the Ribbon collapses or expands, the DockLayout automatically recalculates
`grid-template-rows` and fires `onLayoutChange`. No app-side workaround is needed.

---

## What to Remove

Each app has a synthetic `window.resize` dispatch in the Ribbon's `onCollapse` callback.
This workaround is no longer necessary and should be removed.

### Pattern to Search For

```typescript
onCollapse: () => {
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
},
```

Or variations using `setTimeout` instead of `requestAnimationFrame`.

### Search Commands

```bash
# Find all onCollapse workarounds
grep -rn "window.dispatchEvent.*new Event.*resize" src/
grep -rn "onCollapse.*requestAnimationFrame" src/
```

---

## Per-App Checklist

### 1. Explorer
- [ ] Search for `onCollapse` + `resize` dispatch in Ribbon configuration
- [ ] Remove the synthetic `window.resize` dispatch
- [ ] Verify: collapse Ribbon → status bar stays visible
- [ ] Verify: expand Ribbon → bottom panel stays visible

### 2. Diagrams
- [ ] Search for `onCollapse` + `resize` dispatch in Ribbon configuration
- [ ] Remove the synthetic `window.resize` dispatch
- [ ] Verify: collapse Ribbon → status bar stays visible
- [ ] Verify: expand Ribbon → canvas and bottom panel stay visible

### 3. Thinker
- [ ] Search for `onCollapse` + `resize` dispatch in Ribbon configuration
- [ ] Remove the synthetic `window.resize` dispatch
- [ ] Verify: collapse Ribbon → status bar stays visible
- [ ] Verify: expand Ribbon → bottom panel stays visible

### 4. Checklists
- [ ] Search for `onCollapse` + `resize` dispatch in Ribbon configuration
- [ ] Remove the synthetic `window.resize` dispatch
- [ ] Verify: collapse Ribbon → status bar stays visible
- [ ] Verify: expand Ribbon → bottom panel stays visible

### 5. Strukture
- [ ] Search for `onCollapse` + `resize` dispatch in Ribbon configuration
- [ ] Remove the synthetic `window.resize` dispatch
- [ ] Verify: collapse Ribbon → status bar stays visible
- [ ] Verify: expand Ribbon → bottom panel stays visible

---

## Verification Steps

After removing each workaround:

1. Load the app with a Ribbon, bottom panel, and status bar
2. Collapse the Ribbon — confirm all zones remain visible and correctly sized
3. Expand the Ribbon — confirm the center content, bottom panel, and status bar adjust
4. Resize the browser window — confirm layout remains stable
5. Navigate to/from views that change toolbar content — confirm no clipping
